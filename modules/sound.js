export class Sound {
  static all = new Object();

  static play(source, object = new Object(), callback) {
    if ('id' in object && object.id) {
      if (object.id in Sound.all) {
        Sound.stop(object.id);
      }
    }

    let audio = new Audio();

    if ('loop' in object) {
      audio.loop = object.loop ? true : false;
    }

    audio.preload = 'auto';
    audio.load();
    audio.src = source;

    audio.addEventListener('canplaythrough', () => {
      audio.play();
    });

    if (callback) {
      audio.addEventListener('ended', (event) => {
        callback();
      });
    }

    if ('id' in object && object.id) {
      if (!(object.id in Sound.all)) {
        Sound.all[object.id] = audio;
      }

      if ('volume' in object) {
        Sound.setVolume(object.id, object.volume);
      }
    }
  }

  static stop(id) {
    if (id in Sound.all) {
      Sound.all[id].pause();

      delete Sound.all[id];
    }
  }

  static setVolume(id, volume) {
    if (id in Sound.all) {
      Sound.all[id].volume = volume;
    }
  }

  static pause(id) {
    if (id in Sound.all) {
      Sound.all[id].pause();
    }
  }
  static unpause(id) {
    if (id in Sound.all) {
      Sound.all[id].play();
    }
  }
}
