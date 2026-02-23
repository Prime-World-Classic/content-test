import { DOM } from './dom.js';
import { App } from './app.js';
import { Castle } from './castle.js';
import { Sound } from './sound.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';

export class Timer {
  static intervalId = false;

  static sfxOptions = 
  {
    play: false, // whether to play the sound or not, set to true when the timer is started for the current user
    lastSecond: -1, // the last second when the sound was played
    playFromSecond: 7, // from which second to play the sound (inclusive) 
    sound: SOUNDS_LIBRARY.SINGLE_TIMER, // sound to play
    volumeModifier: 1, // volume modifier
  }

  static init() {
    Timer.sb = DOM(`${name} 00:00`);
    Timer.body = DOM({ style: 'mm-timer' }, Timer.sb);
  }

  static async start(id, name, callback) {
    Timer.stop();

    Timer.callback = callback;

    Timer.message = name;

    Timer.sfxOptions.play = false;
    Timer.sfxOptions.lastSecond = -1;

    Timer.timeFinish = await App.api.request(App.CURRENT_MM, 'getTimer', {
      id: id,
      time: Date.now(),
    });

    if (Timer.end()) {
      return;
    }

    Timer.intervalId = setInterval(() => Timer.update(), 250);

    Timer.update();
  }

  static update() {
    if (Timer.end()) {
      return;
    }

    let seconds = Math.round(Math.abs(Date.now() - Timer.timeFinish) / 1000);

    Timer.sb.innerText = `${Timer.message} 00:${seconds < 10 ? '0' : ''}${seconds}`;

    Timer.sfx(seconds);
  }

  static end() {
    if (Date.now() - Timer.timeFinish >= 0) {
      Timer.stop();

      Timer.callback();

      return true;
    }

    return false;
  }

  static stop() {
    if (Timer.intervalId) {
      clearInterval(Timer.intervalId);

      Timer.intervalId = false;
    }
  }

  static sfx(seconds) {
    if (!Timer.sfxOptions.play) return;
    if (seconds > Timer.sfxOptions.playFromSecond) return;
    if (seconds <= 0) return;
    if (seconds === Timer.sfxOptions.lastSecond) return;

    Sound.play(
      Timer.sfxOptions.sound, 
      { volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) * Timer.sfxOptions.volumeModifier, id: 'timer' },
    );

    Timer.sfxOptions.lastSecond = seconds;
  }

  static oneSecond = 1000;
  static oneMinute = this.oneSecond * 60;
  static oneHour = this.oneMinute * 60;
  static oneDay = this.oneHour * 24;

  static getFormattedTimeDays(timer) {
    return Math.floor(timer / this.oneDay);
  }

  static getFormattedTimeHours(timer) {
    return Math.floor((timer / this.oneHour) % 24);
  }

  static getFormattedTimeMinutes(timer) {
    return Math.floor((timer / this.oneMinute) % 60);
  }

  static getFormattedTimeSeconds(timer) {
    return Math.floor((timer / this.oneSecond) % 60);
  }

  static getFormattedTimer(timer) {
    const days = this.getFormattedTimeDays(timer);
    const hours = this.getFormattedTimeHours(timer);
    const minutes = this.getFormattedTimeMinutes(timer);
    const seconds = this.getFormattedTimeSeconds(timer);
    let formattedDate = '';
    if (days) {
      formattedDate += `${String(days).padStart(2, '0')}:`;
    }
    if (days || hours) {
      formattedDate += `${String(hours).padStart(2, '0')}:`;
    }
    if (days || hours || minutes) {
      formattedDate += `${String(minutes).padStart(2, '0')}:`;
    }
    if (days || hours || minutes || seconds) {
      formattedDate += `${String(seconds).padStart(2, '0')}`;
    }
    return formattedDate;
  }
}
