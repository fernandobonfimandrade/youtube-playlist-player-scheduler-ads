import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class YoutubeService {
  private apiKey = 'AIzaSyAC2UaIbRnIjlDunLVuo_o1Kz4CPhV-TDw';
  private apiUrl =
    'https://www.googleapis.com/youtube/v3/playlistItems?part=id%2Csnippet&playlistId=';

  constructor(private http: HttpClient) {}

  // Busca os itens da playlist com base no ID fornecido
  getPlaylistVideos(playlistId: string): Observable<any> {
    const url = `${this.apiUrl}${playlistId}&key=${this.apiKey}&type=video&order=date&maxResults=20`;
    return this.http.get(url);
  }
}
