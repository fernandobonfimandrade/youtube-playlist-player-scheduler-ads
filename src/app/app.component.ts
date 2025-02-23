import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { YoutubePlayerComponent } from './components/youtube-player/youtube-player.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule, YoutubePlayerComponent],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  title = 'YouTube Playlist Player';
}
