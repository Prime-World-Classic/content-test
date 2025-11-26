export class Sound {
  static all = new Object();
  static cache = new Object();

  /**
   * Preload a sound with the given name and src.
   * @param {string} name - The name of the sound to preload.
   * @param {string} src - The src of the sound to preload.
   * @returns {Promise} A promise that resolves when the sound is preloaded.
   */
  static preload(name, src) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = src;
      audio.preload = "auto";

      audio.addEventListener("canplaythrough", () => {
        Sound.cache[name] = audio;
        resolve();
      });

      audio.load();
    });
  }

  static play(source, object = {}, callback) {
    let baseAudio = null;

    for (const name in Sound.cache) {
      if (Sound.cache[name].src.includes(source)) {
        baseAudio = Sound.cache[name];
        break;
      }
    }

    if (!baseAudio) {
      console.error("Sound not preloaded:", source);
      return;
    }

    const audio = baseAudio.cloneNode(true);

    if ("loop" in object) {
      audio.loop = object.loop ? true : false;
    }

    if ("id" in object && object.id) {
      if (object.id in Sound.all) {
        Sound.stop(object.id);
      }

      Sound.all[object.id] = audio;

      if ("volume" in object) {
        Sound.all[object.id].volume = object.volume;
      }
    }

    if (callback) {
      audio.addEventListener("ended", callback);
    }

    audio.play();
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
