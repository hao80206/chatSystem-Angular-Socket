import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { Channel } from '../../models/channel.model';
import { ChannelService } from '../../services/channel.service';

@Component({
  selector: 'app-channel-list',
  imports: [FormsModule, CommonModule, Navbar],
  templateUrl: './channel-list.html',
  styleUrl: './channel-list.css'
})
export class ChannelList implements OnInit {

  groupId!: number;
  channels: Channel[] = [];

  constructor(private route: ActivatedRoute, private channelService:ChannelService) { }

  ngOnInit(): void {
    // Get groupId from route and convert to number
    this.groupId = Number(this.route.snapshot.paramMap.get('groupId'));
    console.log('GroupID: ', this.groupId);

    // Fetch channels from service
    this.channels = this.channelService.getChannelByGroup(this.groupId);
    console.log('Channels: ', this.channels);
  }

}
