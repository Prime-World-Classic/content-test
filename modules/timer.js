import { DOM } from './dom.js';
import { App } from './app.js';

export class Timer {

	static intervalId = false;

	static init() {

		Timer.sb = DOM(`${name} 00:00`);

		Timer.body = DOM({ style: 'mm-timer' }, Timer.sb);

	}

	static async start(id, name, callback) {

		Timer.stop();

		Timer.callback = callback;

		Timer.message = name;

		Timer.timeFinish = await App.api.request(App.CURRENT_MM, 'getTimer', { id: id, time: Date.now() });

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

		Timer.sb.innerText = `${Timer.message} 00:${(seconds < 10 ? '0' : '')}${seconds}`;

	}

	static end() {

		if ((Date.now() - Timer.timeFinish) >= 0) {

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

}