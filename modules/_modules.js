import { ParentEvent } from './parentEvent.js';
import { Lang } from './lang.js';
import { View } from './view.js';
import { App } from './app.js';
import { PWGame } from './pwgame.js';
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

let testRadminConnection = async () => {
	let hasConnection = await PWGame.testServerConnection(PWGame.gameServerIps[PWGame.RADMIN_GAME_SERVER_IP]);
	if (hasConnection) {
		PWGame.radminHasConnection = true;
	}
}
let testMainConnection = async () => {
	let hasConnection = await PWGame.testServerConnection(PWGame.gameServerIps[PWGame.MAIN_GAME_SERVER_IP]);
	if (hasConnection) {
		PWGame.mainServerHasConnection = true;
	}
}
setTimeout(_ => {
	testRadminConnection();
	testMainConnection();
}, 3000);

Settings.init().then(() => {

	Lang.init().then(() => {

		App.findBestHostAndInit();

	})

});