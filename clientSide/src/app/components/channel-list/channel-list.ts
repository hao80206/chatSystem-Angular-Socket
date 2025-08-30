import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-channel-list',
  imports: [FormsModule, CommonModule, Navbar],
  templateUrl: './channel-list.html',
  styleUrl: './channel-list.css'
})
export class ChannelList implements OnInit {

  groupId!: string;
  channels: any[] = [];

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Get groupId from route
    this.groupId = this.route.snapshot.paramMap.get('groupId')!;
    console.log('GroupID: ', this.groupId)

    // Example channels for demo
    if (this.groupId === '1') {
      this.channels = [
        { id: 101, name: 'General' },
        { id: 102, name: 'News' },
        { id: 103, name: 'Trip' },
        { id: 104, name: 'Beauty' },
        { id: 105, name: 'Comedy' },
        { id: 106, name: 'Cooking' },
        { id: 107, name: 'Exercise' },
      ];
    } else if (this.groupId === '2') {
      this.channels = [
        { id: 201, name: 'News' },
        { id: 202, name: 'Games' },
        { id: 203, name: 'Trip' },
        { id: 204, name: 'Beauty' },
        { id: 205, name: 'Comedy' },
        { id: 206, name: 'Cooking' },
      ];
    } else if (this.groupId === '3') {
      this.channels = [
        { id: 301, name: 'News' },
        { id: 302, name: 'General' },
        { id: 303, name: 'Trip' },
        { id: 304, name: 'Beauty' },
        { id: 305, name: 'Games' },
      ];
    } else if (this.groupId === '4') {
      this.channels = [
        {id: 401, name: 'General'},
        {id: 402, name: 'WorldHeritage'},
        {id: 403, name: 'Cosmetics'},
        {id: 404, name: 'Vlog'},
        {id: 405, name: 'Mystery'},
      ];
    } else if (this.groupId === '5') {
      this.channels =[
        {id: 501, name: 'News'},
        {id: 502, name: 'Comedy' },
        {id: 503, name: 'Vlog' },
        {id: 504, name: 'Beauty' },
        {id: 505, name: 'Games' },
      ];
    } else if (this.groupId === '6') {
      this.channels = [
        {id: 601, name: 'News'},
        {id: 602, name: 'Comedy' },
        {id: 603, name: 'Vlog' },
        {id: 604, name: 'Beauty' },
        {id: 605, name: 'Cooking'},
      ];
    } else if (this.groupId === '7') {
      this.channels = [
        {id: 701, name: 'General'},
        {id: 702, name: 'Vlog' },
        {id: 703, name: 'WorldHeritage' },
        {id: 704, name: 'Trip' },
        {id: 705, name: 'Mystery'},
      ]
    }
  }

}
