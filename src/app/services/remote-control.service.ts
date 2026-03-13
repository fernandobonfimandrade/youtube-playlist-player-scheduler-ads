import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RemoteControlService {
  private keyEvents = new Subject<KeyboardEvent>();
  public keyEvents$ = this.keyEvents.asObservable();

  constructor(private ngZone: NgZone) {
    this.initKeyboardListener();
  }

  private initKeyboardListener(): void {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.ngZone.run(() => {
        this.keyEvents.next(event);
      });
    });
  }

  // Mapeamento de teclas comuns em Smart TVs
  public static readonly KEYS = {
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    ENTER: 13,
    BACK_TIZEN: 10009,
    BACK_WEBOS: 461,
    BACK_BROWSER: 8, // Backspace
    BACK_ESC: 27,   // Escape
    PLAY: 415,
    PAUSE: 19,
    PLAY_PAUSE: 10252,
  };

  public isBackKey(keyCode: number): boolean {
    return [
      RemoteControlService.KEYS.BACK_TIZEN,
      RemoteControlService.KEYS.BACK_WEBOS,
      RemoteControlService.KEYS.BACK_BROWSER,
      RemoteControlService.KEYS.BACK_ESC
    ].includes(keyCode);
  }

  public isEnterKey(keyCode: number): boolean {
    return keyCode === RemoteControlService.KEYS.ENTER;
  }
}
