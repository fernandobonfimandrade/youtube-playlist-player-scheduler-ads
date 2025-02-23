import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { combineLatest, interval, Subscription } from 'rxjs';
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
  @ViewChild('playerCommonVideos', {static: false}) player: YouTubePlayer | undefined;
  // IDs das playlists que serão reproduzidas em sequência
  scheduledSub: Subscription = new Subscription();
  YTPSub: Subscription = new Subscription();
  tempSub: Subscription = new Subscription();

  // Armazena o estado atual da playlist para que ele seja retomado após o vídeo agendado
  savedPlaylistIndex: number = 0;
  savedVideoIndex: number = 0;

  playlists: string[] = ['PLfKvtXXEgOvCAWcpT_PU4KIwLRtjKUqv5'];
  adsPlaylists: string = 'PLfKvtXXEgOvAaRGUchlMexLdnErwaCZgG';
  currentPlaylistIndex = 0;
  currentPlaylistVideos: any[] = [];
  currentScheduledPlaylistVideos: any[] = [];
  currentVideoIndex = 0;
  currentVideoId = '';
  currentAdsVideoId = '';
  playADSCountPerHour = 20;
  scheduleTime = 0;
  adsStartTime: number = 0;
  adsTimeProgress: number = 0;

  // Para identificar se um vídeo agendado está em execução
  isScheduledPlaying = false;

  // IDs dos vídeos que precisam ser reproduzidos em intervalos definidos (ex: N vezes por hora)
  scheduledADSVideoIds: string[] = [];
  scheduledADSIndex = 0;
  constructor(private youtubeService: YoutubeService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.loadInitialPlaylists();
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
  loadInitialPlaylists(): void {
    if (this.playlists.length === 0) {
      console.error('Nenhuma playlist configurada.');
      return;
    }
    const playlistId = this.playlists[this.currentPlaylistIndex];
    this.YTPSub = combineLatest([
      this.youtubeService.getPlaylistVideos(playlistId),
      this.youtubeService.getPlaylistVideos(this.adsPlaylists),
    ]).subscribe(([commonVideos, adsVideos]) => {
        this.currentPlaylistVideos = commonVideos.items;
        this.scheduledADSVideoIds = adsVideos.items.map((e: any) => e.snippet.resourceId.videoId);
        this.currentVideoIndex = 0;
        this.playCurrentVideo();
        this.startScheduledAdsTimer();
      },
      (error) => {
        console.error('Erro ao carregar playlist:', error);
      }
    );
  }

  loadNextPlaylistStandalone(){
    console.info('Load next playlist')
    const playlistId = this.playlists[this.currentPlaylistIndex];
    this.tempSub = this.youtubeService.getPlaylistVideos(playlistId).subscribe(playlist => {
      this.currentPlaylistVideos = playlist.items;
      this.currentVideoIndex = 0;
      this.playCurrentVideo();
      this.tempSub.unsubscribe();
    });
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
  // Método disparado a partir do evento onStateChange do player
  onPlayerStateChange(event: any): void {
    // Se o vídeo terminou (estado "ended")
    if (event.data === 0) {
      this.nextVideo();
    }
  }
  // Método disparado a partir do evento onStateChange do player
  onPlayerAdsStateChange(event: any): void {
    // Se o vídeo terminou (estado "ended")
    if (event.data === 0) {
      if (this.isScheduledPlaying) {
        // Finalizou vídeo agendado: retoma a sequência da playlist
        this.isScheduledPlaying = false;
        this.resumePlaylist();
      }
    }
  }

  // Reproduz o próximo vídeo da playlist ou muda para a próxima playlist se necessário
  nextVideo(): void {
    console.info('Loading next video');
    this.currentVideoIndex++;
    if (this.currentVideoIndex >= this.currentPlaylistVideos.length) {
      if(this.playlists.length === 1){
        console.info('Restar currentVideoIndex')
        this.currentVideoIndex = 0;
        this.playCurrentVideo();
      } else {
        this.goToNextPlaylist();
      }
    } else {
      this.playCurrentVideo();
    }
  }

  // Alterna para a próxima playlist, voltando ao início se necessário
  goToNextPlaylist(): void {
    this.currentPlaylistIndex =
      (this.currentPlaylistIndex + 1) % this.playlists.length;
    this.loadNextPlaylistStandalone();
  }

  // Inicia o timer que dispara a reprodução dos vídeos específicos em intervalos regulares
  startScheduledAdsTimer(): void {
    this.scheduleTime = 60 * 60 * 1000 / (this.scheduledADSVideoIds.length * this.playADSCountPerHour);
    console.log(`Each Ads video need to be played ${this.playADSCountPerHour} times per hour`);
    console.log(`We have ${this.scheduledADSVideoIds.length} items, Ads video will play in each ${(this.scheduleTime/ 60000).toFixed(2)} minutes`);
    this.startAdsProgress();
    this.scheduledSub = interval(this.scheduleTime).subscribe(() => {
      // Salva o estado da playlist apenas se não estiver executando um vídeo agendado no momento
      if (!this.isScheduledPlaying) {
        this.pauseVideo();
        this.startAdsProgress();
        console.info('Loading and play Ads video');
        // this.savedPlaylistIndex = this.currentPlaylistIndex;
        // this.savedVideoIndex = this.currentVideoIndex;
        this.playScheduledAdsVideo();
      }
    });
  }

  // Reproduz um vídeo agendado (utilizando uma lógica round-robin se houver vários)
  playScheduledAdsVideo(): void {
    this.isScheduledPlaying = true;
    const videoId = this.scheduledADSVideoIds[this.scheduledADSIndex];
    this.scheduledADSIndex =
      (this.scheduledADSIndex + 1) % this.scheduledADSVideoIds.length;
    this.currentAdsVideoId = videoId;
  }

  // Retoma a reprodução da playlist a partir do ponto salvo
  resumePlaylist(): void {
    // this.currentPlaylistIndex = this.savedPlaylistIndex;
    // this.currentVideoIndex = this.savedVideoIndex;
    // this.playCurrentVideo();
    this.player?.playVideo();
  }
  onPlayerReady(e: any) {
    console.info('Play video');
    e.target.playVideo();
  }
  onPlayerAdsReady(e: any) {
    console.info('Play video');
    e.target.playVideo();
  }

  startAdsProgress(){
    this.adsStartTime = Date.now();
    const updateProgress = () => {
      const elapsedTime = Date.now() - this.adsStartTime;
      this.adsTimeProgress = Math.min((elapsedTime / this.scheduleTime) * 100, 100);
      if (this.adsTimeProgress < 100) {
        requestAnimationFrame(updateProgress);
      }
    }
    updateProgress();
  }

  pauseVideo() {
    if (this.player) {
      this.player.pauseVideo();
    }
  }
}
