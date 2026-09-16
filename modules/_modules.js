import { Lang } from './lang.js';
import { ParentEvent } from './parentEvent.js';
import { View } from './view.js';
import { App } from './app.js';
import { PWGame } from './pwgame.js';
import { NativeAPI } from './nativeApi.js';
import { Settings } from './settings.js';
import { Splash } from './splash.js';
import { RadminGuide } from './radminGuide.js?v=20260803-radmin-auto';

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

Lang.init().then(async () => {
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
  });

  let testMainConnection = async () => {
    let hasConnection = await PWGame.testServerConnection(PWGame.gameServerIps[PWGame.MAIN_GAME_SERVER_IP]);
    if (hasConnection) {
      PWGame.mainServerHasConnection = true;
    }
  };

  await RadminGuide.waitForConnection(App.hostList);
  testMainConnection();

  Settings.init().then(() => {
    App.findBestHostAndInit();
  });
});
