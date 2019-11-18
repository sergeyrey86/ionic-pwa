import { EventsService } from './../events.service';
import { Acknowledgement } from './../interfaces';
import { Component, OnInit } from '@angular/core';
import { Network } from '@ngx-pwa/offline';

import { EventResponse, EmergencyEvent } from '../interfaces';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
})
export class DetailsPage implements OnInit {
  eventId: number;
  eventResponse: EventResponse;
  event: EmergencyEvent;
  acknowledgements: Acknowledgement[] = [];
  newNote = '';
  online$ = this.network.onlineChanges;

  constructor(private route: ActivatedRoute,
              private eventsService: EventsService,
              private network: Network) { }

  async ngOnInit() {
    // tslint:disable-next-line: no-string-literal
    this.eventId = +this.route.snapshot.params['eventId'];
    this.eventResponse = await this.eventsService.getById(this.eventId).toPromise();
    this.event = this.eventResponse.event;
    this.acknowledgements = await this.eventsService.getAcknowledgements(this.eventResponse).toPromise();
  }

}
