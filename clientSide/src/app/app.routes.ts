import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { ChannelList } from './components/channel-list/channel-list';
import { ChannelChat } from './components/channel-chat/channel-chat';


export const routes: Routes = [
    {path: '', redirectTo:'/login', pathMatch:'full'},
    {path: 'login', component: Login},
    {path: 'dashboard', component: Dashboard},
    {path: 'group/:groupId/channels', component: ChannelList },
    {path: 'group/:groupId/channel/:channelId', component: ChannelChat }
];
