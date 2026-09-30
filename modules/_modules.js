import { Lang } from './lang.js';
import { TalentData } from './talentData.js';
import { ParentEvent } from './parentEvent.js';
import { View } from './view.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { Settings } from './settings.js';
import { Splash } from './splash.js';

window.addEventListener('message', (event) => {
  if (event.data == '') {
    return;
  }

  if (!('action' in event.data)) {
    return;
  }

  if (event.data.action in ParentEvent) {
    ParentEvent[event.data.action](event.data.body);
  }

  console.log('event.data', event.data);
});

Promise.all([Lang.init(), TalentData.init()]).then(() => {
  Splash.init();

  NativeAPI.init();

  NativeAPI.update((data) => {
    if (View.updateProgress) {
      Splash.hide();
    }

    if (data.update) {
      View.updateProgress = View.progress();

      View.updateProgress.firstChild.style.width = data.total + '%';

      View.updateProgress.lastChild.innerText = `${data.title} ${data.total}%...`;
    }
  }).catch((e) => NativeAPI.logUpdateError(e, 'update'));

  Settings.init().then(() => {
    App.connectAndInit();
  });
});
