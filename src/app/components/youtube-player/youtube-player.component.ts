import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { YoutubeService } from '../../services/youtube.service';
import { YouTubePlayer } from '@angular/youtube-player';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  imports: [CommonModule, YouTubePlayer],
  selector: 'app-youtube-player',
  templateUrl: './youtube-player.component.html',
  styleUrls: ['./youtube-player.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
})
export class YoutubePlayerComponent implements OnInit, OnDestroy {
  // IDs das playlists que serão reproduzidas em sequência
  scheduledSub: Subscription = new Subscription();
  YTPSub: Subscription = new Subscription();

  // Armazena o estado atual da playlist para que ele seja retomado após o vídeo agendado
  savedPlaylistIndex: number = 0;
  savedVideoIndex: number = 0;

  playlists: string[] = ['PLfKvtXXEgOvCAWcpT_PU4KIwLRtjKUqv5'];
  currentPlaylistIndex = 0;
  currentPlaylistVideos: any[] = [];
  currentVideoIndex = 0;
  currentVideoId = '';
  playADSCountPerHour = 60;

  // Para identificar se um vídeo agendado está em execução
  isScheduledPlaying = false;

  // IDs dos vídeos que precisam ser reproduzidos em intervalos definidos (ex: N vezes por hora)
  scheduledADSVideoIds: string[] = ['a3ICNMQW7Ok','U6fC4Ij608A'];
  scheduledADSInterval = 60 * 60 * 1000 / (this.scheduledADSVideoIds.length * this.playADSCountPerHour); // Exemplo: a cada 30 minutos (2 vezes por hora)
  scheduledADSIndex = 0;
  constructor(private youtubeService: YoutubeService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    const tag = document.createElement('script');

    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    this.loadCurrentPlaylist();
    this.startScheduledTimer();
  }

  ngOnDestroy(): void {
    if (this.scheduledSub) {
      this.scheduledSub.unsubscribe();
    }
    if (this.YTPSub) {
      this.YTPSub.unsubscribe();
    }
  }

  // Carrega os vídeos da playlist atual via YoutubeService
  loadCurrentPlaylist(): void {
    if (this.playlists.length === 0) {
      console.error('Nenhuma playlist configurada.');
      return;
    }
    const playlistId = this.playlists[this.currentPlaylistIndex];
    this.YTPSub = this.youtubeService.getPlaylistVideos(playlistId).subscribe(
      (response: any) => {
        this.currentPlaylistVideos = response.items;
        this.currentVideoIndex = 0;
        this.playCurrentVideo();
      },
      (error) => {
        console.error('Erro ao carregar playlist:', error);
      }
    );
  }

  // Define o vídeo atual com base no índice da playlist
  playCurrentVideo(): void {
    if (
      this.currentPlaylistVideos.length > 0 &&
      this.currentVideoIndex < this.currentPlaylistVideos.length
    ) {
      this.currentVideoId =
        this.currentPlaylistVideos[
          this.currentVideoIndex
        ].snippet.resourceId.videoId;
    } else {
      this.goToNextPlaylist();
    }
  }

  getEmbededUrl(videoId: string): SafeResourceUrl{
    return this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/' + videoId + '?modestbranding=1&showinfo=0&autoplay=1');
  }

  // Método disparado a partir do evento onStateChange do player
  onPlayerStateChange(event: any): void {
    // Se o vídeo terminou (estado "ended")
    if (event.data === 0) {
      if (this.isScheduledPlaying) {
        // Finalizou vídeo agendado: retoma a sequência da playlist
        this.isScheduledPlaying = false;
        this.resumePlaylist();
      } else {
        this.nextVideo();
      }
    }
  }

  // Reproduz o próximo vídeo da playlist ou muda para a próxima playlist se necessário
  nextVideo(): void {
    console.info('Loading next video');
    this.currentVideoIndex++;
    if (this.currentVideoIndex >= this.currentPlaylistVideos.length) {
      this.goToNextPlaylist();
    } else {
      this.playCurrentVideo();
    }
  }

  // Alterna para a próxima playlist, voltando ao início se necessário
  goToNextPlaylist(): void {
    this.currentPlaylistIndex =
      (this.currentPlaylistIndex + 1) % this.playlists.length;
    this.loadCurrentPlaylist();
  }

  // Inicia o timer que dispara a reprodução dos vídeos específicos em intervalos regulares
  startScheduledTimer(): void {
    this.scheduledSub = interval(this.scheduledADSInterval).subscribe(() => {
      // Salva o estado da playlist apenas se não estiver executando um vídeo agendado no momento
      if (!this.isScheduledPlaying) {
        console.info('Loading and play Ads video');
        this.savedPlaylistIndex = this.currentPlaylistIndex;
        this.savedVideoIndex = this.currentVideoIndex;
        this.playScheduledVideo();
      }
    });
  }

  // Reproduz um vídeo agendado (utilizando uma lógica round-robin se houver vários)
  playScheduledVideo(): void {
    this.isScheduledPlaying = true;
    const videoId = this.scheduledADSVideoIds[this.scheduledADSIndex];
    this.scheduledADSIndex =
      (this.scheduledADSIndex + 1) % this.scheduledADSVideoIds.length;
    this.currentVideoId = videoId;
  }

  // Retoma a reprodução da playlist a partir do ponto salvo
  resumePlaylist(): void {
    this.currentPlaylistIndex = this.savedPlaylistIndex;
    this.currentVideoIndex = this.savedVideoIndex;
    this.playCurrentVideo();
  }
  onPlayerReady(e: any) {
    console.info('Play video');
    e.target.playVideo();
  }
}
