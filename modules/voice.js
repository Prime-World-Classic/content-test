import { DOM } from './dom.js';
import { App } from './app.js';
import { Settings } from './settings.js';
import { Sound } from './sound.js';
import { Castle } from './castle.js';
import { Lang } from './lang.js';

export class Voice {

	static peerConnectionConfig = {
		// проверка stun https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
		iceServers: [
			{ urls: ['turn:81.88.210.30:3478'], credential: 'pw', username: 'pw' }
			/*
			{url:'turn:192.158.29.39:3478?transport=udp',credential:'JZEOEt2V3Qb0y27GRntt2u2PAYA=',username:'28224511:1379330808'},
			{url:'turn:192.158.29.39:3478?transport=tcp',credential:'JZEOEt2V3Qb0y27GRntt2u2PAYA=',username:'28224511:1379330808'},
			{url:'turn:turn.bistri.com:80',credential:'homeo',username:'homeo'},
			{url:'turn:turn.anyfirewall.com:443?transport=tcp',credential:'webrtc',username:'webrtc'}
			*/
		]

	};

	static mediaAudioConfigManual = {
		echoCancellation: false,
		noiseSuppression: false,
		autoGainControl: false,
		channelCount: 1,
		sampleRate: 44100,
		sampleSize: 16
	};

	static mediaAudioConfigHighQality = {
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
		channelCount: 1,
		sampleRate: 32000,
		sampleSize: 16
	};

	static mediaAudioConfig = {
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
		channelCount: 1,
		sampleRate: 16000,
		sampleSize: 16
	};

	static mediaAudioConfigLowQality = {
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
		channelCount: 1,
		sampleRate: 8000,
		sampleSize: 16
	};

	static userMedia = null;

	static mic = null;

	static manager = new Object();

	static infoPanel = null;

	static cacheCandidate = new Object();

	static limit = 10;
	
	static volumeLevel = 1.0;
	
	static volumeLevelStep = 0.2;

	static init() {
		
		if (!Voice.infoPanel) {
			
			Voice.infoPanel = DOM({ style: ['voice-info-panel', 'left-offset-with-shift'] }, DOM({ style: 'voice-info-panel-body' }));
			
		}
		
		document.body.append(Voice.infoPanel);
		
		requestAnimationFrame(() => Voice.updatePanelPosition());
		
	}

	static async initLocalMedia() {

		if (Voice.userMedia) {
			
			return;
			
		}
		
		Voice.infoPanel.style.display = 'flex';
		
		try {
			
			Voice.userMedia = await navigator.mediaDevices.getUserMedia({ audio: ( App.isAdmin() ? ( ( App.storage.data.id == 1 ) ? Voice.mediaAudioConfigManual : Voice.mediaAudioConfigHighQality ) : Voice.mediaAudioConfig ), video: false });
			
		}
		catch (error) {
			
			return App.error(Lang.text('mediaDevicesError').replace('{error}', error));
			
		}
		
		let tracks = new Array();
		
		try {
			
			tracks = Voice.userMedia.getTracks();
			
		}
		catch (error) {
			
			return App.error(Lang.text('streamTracksError').replace('{error}', error));
			
		}
		
		if (!tracks.length) {
			
			return App.error(Lang.text('mediaTracksLack'));
			
		}
		
		if (tracks[0].kind != 'audio') {
			
			return App.error(Lang.text('cantDefaultMic'));
			
		}
		
		Voice.mic = tracks[0];
		
		Voice.mic.enabled = false;
		
	}

	static async toggleEnabledMic() {
		
		if (!Voice.userMedia) {
			
			await Voice.initLocalMedia();
			
			Voice.updateInfoPanel();
			
		}
		
		if (!Voice.mic) {
			
			return App.error(Lang.text('cantDefaultMic'));
			
		}
		
		Voice.mic.enabled = !Voice.mic.enabled;

		if (Voice.mic.enabled) {

			Sound.play('content/sounds/voice/enabled.mp3',{ id: 'Voice_enabled', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });

			Voice.infoPanel.firstChild.lastChild.style.opacity = 0;

		}
		else {

			Sound.play('content/sounds/voice/disabled.mp3',{ id: 'Voice_disabled', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });

			Voice.infoPanel.firstChild.lastChild.style.opacity = 1;

		}

	}

	static indication(source, callback) {

		let audioContext = new AudioContext();

		let mediaStreamSource = audioContext.createMediaStreamSource(source);

		let analyser = audioContext.createAnalyser();

		mediaStreamSource.connect(analyser);

		analyser.fftSize = 256;

		let bufferLength = analyser.frequencyBinCount;

		let dataArray = new Uint8Array(bufferLength);

		let checkVolume = () => {

			analyser.getByteFrequencyData(dataArray);

			let sum = 0;

			for (let i = 0; i < bufferLength; i++) {

				sum += dataArray[i];

			}

			let average = Math.round(sum / bufferLength);

			if (average > 100) {

				average = 100;

			}

			if (callback) {

				callback(average);

			}

			requestAnimationFrame(checkVolume);

		};

		checkVolume();

	}

	static updateInfoPanel() {

		while (Voice.infoPanel.firstChild.firstChild) {

			Voice.infoPanel.firstChild.firstChild.remove();

		}

		let level = DOM({ style: 'voice-info-panel-body-item-bar-level' });

		let bar = DOM({ style: 'voice-info-panel-body-item-bar' }, level);

		if (Voice.mic) {

			Voice.indication(Voice.userMedia, (percent) => {

				level.style.width = `${percent}%`;

			});

		}
		else {

			bar.classList.add('voice-info-panel-body-item-nostream');

		}

		Voice.infoPanel.firstChild.append(DOM({ style: 'voice-info-panel-body-item' }, DOM({ style: 'voice-info-panel-body-item-name', event: ['click', () => Voice.toggleEnabledMic()] }, App.storage.data.login), DOM({ style: 'voice-info-panel-body-item-status' }, bar)));

		for (let id in Voice.manager) {

			Voice.playerInfoPanel(id);

		}

		let tutorial = DOM({ style: 'voice-info-panel-body-tutorial' });

		if (Voice.mic) {
			
			tutorial.innerText = Lang.text('enableMic').replace('{Voice.mic.label}', Voice.mic.label);

			if (Voice.mic.enabled) {

				tutorial.style.opacity = 0;
				
			}
			
		}

		Voice.infoPanel.firstChild.append(tutorial);
		
	}

	static playerInfoPanel(id) {

		let name = (Voice.manager[id].name) ? Voice.manager[id].name : `id${id}`;

		let state = () => {

			let status = '';

			switch (Voice.manager[id].peer.connectionState) {

				case 'new': status = Lang.text('waitingResponse'); break;

				case 'connecting': status = Lang.text('voiceConnecting'); break;

				default: status = Voice.manager[id].peer.connectionState; break;

			}

			return (Voice.manager[id].peer.connectionState == 'connected') ? `${name} [Х]` : `${name} (${status})`;

		}

		let item = DOM({
			style: 'voice-info-panel-body-item-name', event: ['click', () => {

				Voice.manager[id].close();

				item.remove();

			}]
		}, state());

		let level = DOM({ style: 'voice-info-panel-body-item-bar-level' });

		let bar = DOM({ style: 'voice-info-panel-body-item-bar' }, level);

		let indication = () => {

			if ((Voice.manager[id].peer.connectionState == 'connected') && (Voice.manager[id].stream)) {

				Voice.indication(Voice.manager[id].stream, (percent) => {

					level.style.width = `${percent}%`;

				});

			}

			if (Voice.manager[id].stream) {

				if (bar.classList.contains('voice-info-panel-body-item-nostream')) {

					bar.classList.remove('voice-info-panel-body-item-nostream');

				}

			}
			else {

				if (!bar.classList.contains('voice-info-panel-body-item-nostream')) {

					bar.classList.add('voice-info-panel-body-item-nostream');

				}

			}

		}

		indication();

		Voice.manager[id].peer.onconnectionstatechange = () => {

			item.innerText = state();

			indication();

		}

		Voice.infoPanel.firstChild.append(DOM({ style: 'voice-info-panel-body-item' }, item, DOM({ style: 'voice-info-panel-body-item-status' }, bar)));

	}

	static async ready(id, answer) {

		if (!(id in Voice.manager)) {

			return;

		}

		if (Voice.manager[id].timer) {

			clearTimeout(Voice.manager[id].timer);

		}

		await Voice.manager[id].peer.setRemoteDescription(answer);

		if (id in Voice.cacheCandidate) {

			for (let candidate of Voice.cacheCandidate[id]) {

				console.log('ОТПРАВИЛИ ICE кандидат из кэша:', candidate);

				await App.api.ghost('user', 'callCandidate', { id: id, candidate: candidate });

			}

			delete Voice.cacheCandidate[id];

		}

	}

	static async candidate(id, candidate) {

		if (!(id in Voice.manager)) {

			return;

		}

		await Voice.manager[id].peer.addIceCandidate(candidate);

	}

	static destroy(full = false, say = false) {

		for (let id in Voice.manager) {

			if ((!full) && (Voice.manager[id].important)) {

				continue;

			}

			Voice.manager[id].close();

		}
		
		if(say){
			
			App.say(Lang.text('callsDropped'));
			
		}

		if (Voice.mic) {

			if (full) {

				Voice.mic.stop();

				Voice.mic = null;

				Voice.userMedia = null;

			}
			else {

				if (!Object.keys(Voice.manager).length) {

					if (Voice.mic) {

						Voice.mic.enabled = false;

					}

				}

			}

			Voice.updateInfoPanel();

		}

	}
	
	static volumeControl(increase = false) {
		
		let volumeLevel = 0.0;
		
		if(increase){
			
			volumeLevel = ( Voice.volumeLevel + Voice.volumeLevelStep );
			
			if( volumeLevel > 1.0 ){
				
				return;
				
			}
			
			App.say(`${Math.round(volumeLevel * 100)}%`);
			
		}
		else{
			
			volumeLevel = ( Voice.volumeLevel - Voice.volumeLevelStep );
			
			if( volumeLevel < 0.0 ){
				
				return;
				
			}
			
			App.say(`${Math.round(volumeLevel * 100)}%`);
			
		}
		
		for (let id in Voice.manager) {
			
			Voice.manager[id].controller.volume = volumeLevel;
			
		}
		
		Voice.volumeLevel = volumeLevel;
		
	}
	
	static updatePanelPosition() {
		
		if (!Voice.infoPanel) return;
		
		const isBuildWindowOpen = document.getElementById('wbuild') !== null;
		
		if (isBuildWindowOpen) {
			
			Voice.infoPanel.classList.remove('left-offset-with-shift');
			
		} else {
			
			Voice.infoPanel.classList.add('left-offset-with-shift');
			
		}
		
	}

	static async association(i, users, key) {

		if (Settings.settings.novoice) {

			throw Lang.text('voiceDisabled');

		}

		let start = false;

		for (let user of users) {

			if (user.id == i) {

				start = true;

				continue;

			}

			if (!start) {

				continue;

			}

			let voice = new Voice(user.id, key, user.name);

			await voice.call();

		}

	}

	constructor(id, key = '', name = '', important = false) {

		this.id = id;

		this.key = key;

		this.name = name;

		this.important = important;

		this.isCaller = false;

		this.stream = null;

		this.controller = null;

		if ((this.id in Voice.manager) || ((Object.keys(Voice.manager).length + 1) > Voice.limit)) {

			this.peer = null;

			return this;

		}

		this.peer = new RTCPeerConnection(Voice.peerConnectionConfig);

		Voice.manager[this.id] = this;

		this.peer.ontrack = (event) => {

			console.log('Получен удаленный медиапоток', event);

			this.stream = new MediaStream([event.track]);

			this.controller = new Audio();

			this.controller.srcObject = this.stream;

			this.controller.autoplay = true;

			this.controller.controls = true;

			this.controller.volume = Voice.volumeLevel;

			this.controller.play();

			document.body.prepend(this.controller);

			this.controller.style.display = 'none';

		}

		this.peer.onicecandidate = async (event) => {

			if (event.candidate) {

				console.log('Сгенерирован ICE кандидат:', event.candidate);

				if (this.peer.remoteDescription) {

					console.log('ОТПРАВИЛИ ICE кандидат:', event.candidate);

					await App.api.ghost('user', 'callCandidate', { id: this.id, candidate: event.candidate });

				}
				else {

					if (!(this.id in Voice.cacheCandidate)) {

						Voice.cacheCandidate[this.id] = new Array();

					}

					Voice.cacheCandidate[this.id].push(event.candidate);

				}

			}
			else {

				console.log('Все ICE кандидаты собраны');

			}

		}

		this.peer.oniceconnectionstatechange = () => {

			switch (this.peer.iceConnectionState) {

				case 'connected': console.log('Соединение успешно установлено'); break;

				case 'disconnected': this.close(); break; // reconnect

				case 'failed': this.close(); break; // reconnect

				case 'closed': this.close(); break;

			}

			console.log(`Состояние соединения: ${this.peer.iceConnectionState}`);

		};

	}

	async call() {

		if (Settings.settings.novoice) {

			throw Lang.text('voiceDisabled');

		}

		if (!this.peer) {

			return;

		}

		if (this.isCaller) {

			return;

		}

		await Voice.initLocalMedia();

		if (Voice.mic) {

			this.peer.addTrack(Voice.mic);

		}

		let offer = await this.peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });

		await this.peer.setLocalDescription(offer);

		this.timer = setTimeout(() => {

			this.timer = null;

			this.close();

		}, 15000);

		await App.api.request('user', 'call', { id: this.id, key: this.key, offer: offer });

		this.isCaller = true;

		Voice.updateInfoPanel();

	}

	async accept(offer) {

		if (Settings.settings.novoice) {

			throw Lang.text('voiceDisabled');

		}

		if (!this.peer) {

			return;

		}

		await Voice.initLocalMedia();

		if (Voice.mic) {

			this.peer.addTrack(Voice.mic);

		}

		await this.peer.setRemoteDescription(offer);

		let answer = await this.peer.createAnswer();

		await App.api.ghost('user', 'callAccept', { id: this.id, answer: answer });

		await this.peer.setLocalDescription(answer);

		Voice.updateInfoPanel();

	}

	async reconnect() {
		console.log('Реконнект...');
		this.close();

		if (!this.isCaller) {

			return;

		}

		let voice = new Voice(this.id, this.key);

		try {

			voice.call();

		}
		catch (error) {

			console.log(error);

		}

	}

	async close() {

		this.peer.close();

		delete Voice.manager[this.id];

		if (this.id in Voice.cacheCandidate) {

			delete Voice.cacheCandidate[this.id];

		}

		Voice.updateInfoPanel();

	}

}