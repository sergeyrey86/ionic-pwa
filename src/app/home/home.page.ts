import { Component, OnInit, OnDestroy, ApplicationRef } from '@angular/core';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { Subscription, interval, concat } from 'rxjs';
import { Network } from '@ngx-pwa/offline';
import { first } from 'rxjs/operators';
import { SwUpdate, UpdateActivatedEvent, UpdateAvailableEvent } from '@angular/service-worker';

import { EventsService } from './../events.service';
import { EventResponse } from './../interfaces';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {
  events: EventResponse[] = [];
  sub: Subscription;
  online$ = this.network.onlineChanges;

  constructor(
    private eventsService: EventsService,
    private appRef: ApplicationRef,
    private nav: NavController,
    private network: Network,
    private updater: SwUpdate,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.sub = this.eventsService.getAll().subscribe(e => this.events.push(e));

    this.initUpdater();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  getEvents(): EventResponse[] {
    return this.events.sort((a, b) =>
      a.event.created > b.event.created ? -1 : 1
    );
  }

  details(response: EventResponse) {
    this.nav.navigateForward(`/details/${response.event.id}`);
  }

  initUpdater() {
    // Allow the app to stabilize first, before starting polling for updates with `interval()`.
    // See https://angular.io/guide/service-worker-communications
    const updateInterval$ = interval(1000 * 60 * 1); // 1 minute - I don't recommend this!
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const appStableInterval$ = concat(appIsStable$, updateInterval$);

    // Warning! Make sure you use arrow functions here or suffer the wrath of `this`!
    if (this.updater.isEnabled) {
      console.log('Subscribing to updates...');
      this.sub.add(appStableInterval$.subscribe(() => this.checkForUpdate()));
      this.sub.add(this.updater.available.subscribe(e => this.onUpdateAvailable(e)));
      this.sub.add(this.updater.activated.subscribe(() => this.onUpdateActivated()));
    }
  }

  async checkForUpdate() {
    if (this.updater.isEnabled) {
      console.log('Checking for updates...');
      await this.updater.checkForUpdate();
    }
  }

  async onUpdateActivated() {
    await this.showToastMessage('Application Updating');
  }

  async onUpdateAvailable(event: UpdateAvailableEvent) {
    // tslint:disable-next-line: no-string-literal
    const updateMessage = event.available.appData['updateMessage'];
    console.log('A new version is available: ', updateMessage);

    const alert = await this.alertController.create({
      header: 'Update Available!',
      message:
        'A new version of the application is available. ' +
        `(Details: ${updateMessage}) ` +
        'Click OK to update now.',
      buttons: [
        {
          text: 'Not Now',
          role: 'cancel',
          cssClass: 'secondary',
          handler: async () => {
            await this.showToastMessage('Update deferred');
          }
        },
        {
          text: 'OK',
          handler: async () => {
            await this.updater.activateUpdate();
            window.location.reload();
          }
        }
      ]
    });
    await alert.present();
  }

  async showToastMessage(msg: string) {
    console.log(msg);
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      showCloseButton: true,
      position: 'top',
      closeButtonText: 'OK'
    });
    toast.present();
  }

  async doRefresh(event) {
    try {
      const maxEvent = this.events
        .reduce((prev, current) => (prev.event.id > current.event.id) ? prev : current);
      const maxEventId = +maxEvent.event.id + 1;

      const response = await this.eventsService.getById(maxEventId).toPromise();
      this.events.push(response);
    } catch (err) {
      console.error(err);
    } finally {
      event.target.complete();
    }
  }

}
