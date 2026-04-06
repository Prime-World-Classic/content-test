import { DOM } from './dom.js';
import { App } from './app.js';
import { Settings } from './settings.js';
import { Sound } from './sound.js';
import { Castle } from './castle.js';
import { Lang } from './lang.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { normalizeKey } from './keybindings/keybindings.input.js';

export class Voice {
  static peerConnectionConfig = {
    // проверка stun https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
    iceServers: [
      { urls: ['turn:81.88.210.30:3478'], credential: 'pw', username: 'pw' },
      /*
			{url:'turn:192.158.29.39:3478?transport=udp',credential:'JZEOEt2V3Qb0y27GRntt2u2PAYA=',username:'28224511:1379330808'},
			{url:'turn:192.158.29.39:3478?transport=tcp',credential:'JZEOEt2V3Qb0y27GRntt2u2PAYA=',username:'28224511:1379330808'},
			{url:'turn:turn.bistri.com:80',credential:'homeo',username:'homeo'},
			{url:'turn:turn.anyfirewall.com:443?transport=tcp',credential:'webrtc',username:'webrtc'}
			*/
    ],
  };

  static mediaAudioConfigManual = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
    sampleRate: 44100,
    sampleSize: 16,
  };

  static mediaAudioConfigHighQality = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    channelCount: 1,
    sampleRate: 32000,
    sampleSize: 16,
  };

  static mediaAudioConfig = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    channelCount: 1,
    sampleRate: 16000,
    sampleSize: 16,
  };

  static mediaAudioConfigLowQality = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    channelCount: 1,
    sampleRate: 8000,
    sampleSize: 16,
  };

  static userMedia = null;

  static rawMic = null;

  static mic = null;

  static processingContext = null;

  static processingInput = null;

  static processingGain = null;

  static processingCompressor = null;

  static processingDestination = null;

  static manager = new Object();

  static infoPanel = null;

  static infoPanelHiddenByUser = false;

  static cacheCandidate = new Object();

  static limit = 10;

  static volumeLevel = 1.0;

  static volumeLevelStep = 0.2;

  static reconnectJobs = new Map();

  static mergeAutoAcceptUntil = new Map();
  
  static battleSuspendedPeers = new Map();

  static reconnectPlanMs = [2000, 5000, 10000, 15000, 20000];

  static reconnectMaxDurationMs = 15 * 60 * 1000;

  static reconnectDisconnectedGraceMs = 3000;

  static radioHotkeyListenersBound = false;

  static radioPressedByKeyboard = false;

  static radioPulseTimer = null;

  static getReconnectToken(id, key) {
    return `${String(key || '')}:${Number(id) || 0}`;
  }

  static markMergeAutoAccept(id, ttlMs = 20000) {
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) return;
    Voice.mergeAutoAcceptUntil.set(targetId, Date.now() + Math.max(1000, Number(ttlMs) || 20000));
  }

  static consumeMergeAutoAccept(id) {
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) return false;
    const until = Voice.mergeAutoAcceptUntil.get(targetId);
    if (!until) return false;
    Voice.mergeAutoAcceptUntil.delete(targetId);
    return until >= Date.now();
  }

  static shouldAutoReconnectKey(key) {
    return !!key;
  }

  static isFriendScopedConnection(target) {
    const key = String(target?.key || '');
    if (key === 'friend') {
      return true;
    }
    // Backward compatibility: old friend calls could arrive without key.
    return !key && Boolean(target?.important);
  }

  static stopReconnectJob(id, key) {
    const token = Voice.getReconnectToken(id, key);
    const job = Voice.reconnectJobs.get(token);
    if (!job) return;
    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = null;
    }
    Voice.reconnectJobs.delete(token);
  }

  static getReconnectJob(id, key) {
    const token = Voice.getReconnectToken(id, key);
    return Voice.reconnectJobs.get(token) || null;
  }

  static getInfoPanelBody() {
    return Voice.infoPanel?.querySelector?.('.voice-info-panel-body') || null;
  }

  static showInfoPanel(force = false) {
    if (!Voice.infoPanel) return;
    if (!force && Voice.infoPanelHiddenByUser) return;
    Voice.infoPanel.style.display = 'flex';
  }

  static stopAllReconnectJobs() {
    for (const job of Voice.reconnectJobs.values()) {
      if (job.timer) {
        clearTimeout(job.timer);
        job.timer = null;
      }
    }
    Voice.reconnectJobs.clear();
  }

  static ensureReconnectJob(id, key, name = '', important = false, initialDelayMs = 0) {
    if (!Voice.shouldAutoReconnectKey(key)) return;
    const token = Voice.getReconnectToken(id, key);
    if (Voice.reconnectJobs.has(token)) return;
    const job = {
      id: Number(id),
      key: String(key || ''),
      name: String(name || ''),
      important: Boolean(important),
      attempt: 0,
      startedAt: Date.now(),
      timer: null,
      activeCallAttempt: false,
    };
    Voice.reconnectJobs.set(token, job);
    const run = async () => {
      const current = Voice.reconnectJobs.get(token);
      if (!current) return;
      if (Date.now() - current.startedAt > Voice.reconnectMaxDurationMs) {
        Voice.stopReconnectJob(current.id, current.key);
        return;
      }
      const existing = Voice.manager[current.id];
      if (existing && existing.peer && existing.peer.connectionState !== 'closed') {
        const delayBusy = Voice.reconnectPlanMs[Math.min(current.attempt, Voice.reconnectPlanMs.length - 1)];
        current.timer = setTimeout(run, delayBusy);
        return;
      }
      let voice = null;
      try {
        current.activeCallAttempt = true;
        voice = new Voice(current.id, current.key, current.name, current.important);
        await voice.call({ reconnect: 1 });
      } catch (error) {
        console.log('Voice reconnect attempt failed:', error);
        try {
          voice?.close({ keepReconnect: true });
        } catch {}
      } finally {
        current.activeCallAttempt = false;
      }
      current.attempt += 1;
      const delay = Voice.reconnectPlanMs[Math.min(current.attempt, Voice.reconnectPlanMs.length - 1)];
      current.timer = setTimeout(run, delay);
    };
    job.timer = setTimeout(run, Math.max(0, Number(initialDelayMs) || 0));
  }

  static init() {
    if (!Voice.infoPanel) {
      const closeButton = DOM(
        {
          tag: 'div',
          style: ['close-button', 'voice-info-panel-close'],
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            () => {
              Voice.infoPanelHiddenByUser = true;
              if (Voice.infoPanel) Voice.infoPanel.style.display = 'none';
            },
          ],
        },
      );
      closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
      Voice.infoPanel = DOM({ style: ['voice-info-panel', 'left-offset-with-shift'] }, closeButton, DOM({ style: 'voice-info-panel-body' }));
    }

    document.body.append(Voice.infoPanel);

    Voice.ensureRadioHotkeyListeners();

    requestAnimationFrame(() => Voice.updatePanelPosition());
  }

  static getVoiceToggleTokens() {
    const fallback = ['CTRL', 'Z'];
    const tokens = Array.isArray(Settings.settings?.voiceToggleHotkey) ? Settings.settings.voiceToggleHotkey : fallback;
    const cleaned = tokens.map((x) => String(x || '').trim().toUpperCase()).filter(Boolean);
    return cleaned.length ? cleaned : fallback;
  }

  static tokensEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (String(a[i]) !== String(b[i])) return false;
    }
    return true;
  }

  static eventMatchesVoiceToggleHotkey(event) {
    const expected = Voice.getVoiceToggleTokens();
    if (!expected.length) return false;
    const actual = normalizeKey(event);
    return Voice.tokensEqual(expected, Array.isArray(actual) ? actual : []);
  }

  static async setMicEnabled(enabled) {
    if (Settings.settings.novoice) return;
    if (!Voice.userMedia || !Voice.mic) {
      await Voice.initLocalMedia();
    }
    if (!Voice.mic) return;
    if (Voice.mic.enabled === Boolean(enabled)) return;
    Voice.mic.enabled = Boolean(enabled);
    Voice.updateInfoPanel();
  }

  static async setRadioPressed(pressed) {
    if (!Settings.settings?.voiceRadioMode) return;
    const next = Boolean(pressed);
    if (Voice.radioPressedByKeyboard === next) return;
    Voice.radioPressedByKeyboard = next;
    await Voice.setMicEnabled(next);
  }

  static clearRadioPulseTimer() {
    if (!Voice.radioPulseTimer) return;
    clearTimeout(Voice.radioPulseTimer);
    Voice.radioPulseTimer = null;
  }

  static async pulseRadioTalk(durationMs = 700) {
    if (!Settings.settings?.voiceRadioMode) return;
    if (Voice.radioPressedByKeyboard) return;
    await Voice.setMicEnabled(true);
    Voice.clearRadioPulseTimer();
    Voice.radioPulseTimer = setTimeout(async () => {
      Voice.radioPulseTimer = null;
      if (Voice.radioPressedByKeyboard) return;
      await Voice.setMicEnabled(false);
    }, Math.max(120, Number(durationMs) || 700));
  }

  static ensureRadioHotkeyListeners() {
    if (Voice.radioHotkeyListenersBound) return;
    Voice.radioHotkeyListenersBound = true;

    document.addEventListener('keydown', async (event) => {
      if (!Settings.settings?.voiceRadioMode) return;
      if (event.repeat) return;
      if (!Voice.eventMatchesVoiceToggleHotkey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      Voice.clearRadioPulseTimer();
      await Voice.setRadioPressed(true);
    });

    document.addEventListener('keyup', async (event) => {
      if (!Settings.settings?.voiceRadioMode) return;
      if (!Voice.radioPressedByKeyboard) return;
      const keyUpper = String(event.key || '').trim().toUpperCase();
      const isModifierRelease = keyUpper === 'CONTROL' || keyUpper === 'ALT' || keyUpper === 'SHIFT' || keyUpper === 'META';
      const isMainRelease = Voice.eventMatchesVoiceToggleHotkey(event);
      if (!isModifierRelease && !isMainRelease) return;
      Voice.clearRadioPulseTimer();
      await Voice.setRadioPressed(false);
    });

    window.addEventListener('blur', async () => {
      Voice.clearRadioPulseTimer();
      Voice.radioPressedByKeyboard = false;
      if (Settings.settings?.voiceRadioMode) {
        await Voice.setMicEnabled(false);
      }
    });
  }

  static async handleVoiceToggleHotkey() {
    if (Settings.settings?.voiceRadioMode) {
      await Voice.pulseRadioTalk(700);
      return;
    }
    await Voice.toggleEnabledMic();
  }

  static async initLocalMedia() {
    if (Voice.userMedia) {
      return;
    }

    Voice.showInfoPanel();

    try {
      Voice.userMedia = await navigator.mediaDevices.getUserMedia({
        audio: App.isAdmin()
          ? App.storage.data.id == 1
            ? Voice.mediaAudioConfigManual
            : Voice.mediaAudioConfigHighQality
          : Voice.mediaAudioConfig,
        video: false,
      });
    } catch (error) {
      return App.error(Lang.text('mediaDevicesError').replace('{error}', error));
    }

    let tracks = new Array();

    try {
      tracks = Voice.userMedia.getTracks();
    } catch (error) {
      return App.error(Lang.text('streamTracksError').replace('{error}', error));
    }

    if (!tracks.length) {
      return App.error(Lang.text('mediaTracksLack'));
    }

    if (tracks[0].kind != 'audio') {
      return App.error(Lang.text('cantDefaultMic'));
    }

    Voice.rawMic = tracks[0];

    try {
      Voice.processingContext = new AudioContext();
      Voice.processingInput = Voice.processingContext.createMediaStreamSource(new MediaStream([Voice.rawMic]));
      Voice.processingGain = Voice.processingContext.createGain();
      Voice.processingGain.gain.value = 2.1;
      Voice.processingCompressor = Voice.processingContext.createDynamicsCompressor();
      Voice.processingCompressor.threshold.value = -30;
      Voice.processingCompressor.knee.value = 20;
      Voice.processingCompressor.ratio.value = 3.5;
      Voice.processingCompressor.attack.value = 0.01;
      Voice.processingCompressor.release.value = 0.22;
      Voice.processingDestination = Voice.processingContext.createMediaStreamDestination();

      Voice.processingInput.connect(Voice.processingGain);
      Voice.processingGain.connect(Voice.processingCompressor);
      Voice.processingCompressor.connect(Voice.processingDestination);

      const processedTrack = Voice.processingDestination.stream.getAudioTracks()[0];
      Voice.mic = processedTrack || Voice.rawMic;
    } catch (error) {
      console.log('Voice DSP init failed, fallback to raw mic:', error);
      Voice.mic = Voice.rawMic;
    }

    if (Voice.mic) {
      Voice.mic.enabled = false;
    }
  }

  static resetMicProcessing() {
    try {
      Voice.processingInput?.disconnect?.();
    } catch {}
    try {
      Voice.processingGain?.disconnect?.();
    } catch {}
    try {
      Voice.processingCompressor?.disconnect?.();
    } catch {}
    try {
      Voice.processingDestination?.disconnect?.();
    } catch {}
    try {
      Voice.processingContext?.close?.();
    } catch {}
    Voice.processingContext = null;
    Voice.processingInput = null;
    Voice.processingGain = null;
    Voice.processingCompressor = null;
    Voice.processingDestination = null;
  }

  static async toggleEnabledMic() {
    Voice.infoPanelHiddenByUser = false;
    Voice.showInfoPanel(true);
    if (!Voice.userMedia) {
      await Voice.initLocalMedia();

      Voice.updateInfoPanel();
    }

    if (!Voice.mic) {
      return App.error(Lang.text('cantDefaultMic'));
    }

    Voice.mic.enabled = !Voice.mic.enabled;

    if (Voice.mic.enabled) {
      Sound.play(SOUNDS_LIBRARY.VC_ENABALED, {
        id: 'Voice_enabled',
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });

      //Voice.infoPanel.firstChild.lastChild.style.opacity = 0;
    } else {
      Sound.play(SOUNDS_LIBRARY.VC_DISABLED, {
        id: 'Voice_disabled',
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });

      //Voice.infoPanel.firstChild.lastChild.style.opacity = 1;
    }

    Voice.updateInfoPanel();
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
    const panelBody = Voice.getInfoPanelBody();
    if (!panelBody) return;
    while (panelBody.firstChild) {
      panelBody.firstChild.remove();
    }

    let level = DOM({ style: 'voice-info-panel-body-item-bar-level' });

    let bar = DOM({ style: 'voice-info-panel-body-item-bar' }, level);

    if (!Voice.mic) {
      level.style.width = '0%';
      level.classList.remove('voice-info-panel-body-item-bar-level-muted');
      bar.classList.add('voice-info-panel-body-item-nostream');
    } else if (Voice.mic.enabled) {
      level.classList.remove('voice-info-panel-body-item-bar-level-muted');
      bar.classList.remove('voice-info-panel-body-item-nostream');
      Voice.indication(Voice.userMedia, (percent) => {
        level.style.width = `${percent}%`;
      });
    } else {
      level.style.width = '0%';
      bar.classList.remove('voice-info-panel-body-item-nostream');
      level.classList.add('voice-info-panel-body-item-bar-level-muted');
    }

    panelBody.append(
      DOM(
        { style: 'voice-info-panel-body-item' },
        DOM(
          {
            domaudio: domAudioPresets.defaultButton,
            style: 'voice-info-panel-body-item-name',
            event: ['click', () => Voice.toggleEnabledMic()],
          },
          App.storage.data.login,
        ),
        DOM({ style: 'voice-info-panel-body-item-status' }, bar),
      ),
    );

    for (let id in Voice.manager) {
      Voice.playerInfoPanel(id);
    }

    let tutorial = DOM({ style: 'voice-info-panel-body-tutorial' });

    if (Voice.mic) {
      const formatHotkey = (tokens, fallback) => {
        if (!Array.isArray(tokens)) return fallback;
        const cleaned = tokens.map((x) => String(x || '').trim().toUpperCase()).filter(Boolean);
        if (!cleaned.length) return fallback;
        const map = {
          CTRL: 'Ctrl',
          ALT: 'Alt',
          SHIFT: 'Shift',
          WIN: 'Win',
          UP: 'Up',
          DOWN: 'Down',
          LEFT: 'Left',
          RIGHT: 'Right',
          SPACE: 'Space',
          ENTER: 'Enter',
          ESC: 'Esc',
          TAB: 'Tab',
        };
        return cleaned.map((x) => (map[x] ? map[x] : x)).join('+');
      };
      const dropKey = formatHotkey(Settings.settings?.voiceDropHotkey, 'Ctrl+K');
      const toggleKey = formatHotkey(Settings.settings?.voiceToggleHotkey, 'Ctrl+Z');
      if (Voice.mic.enabled) {
        tutorial.innerHTML = `<strong>${dropKey}</strong>${Lang.text('hotkeyDropCallsSuffix')}<br>${Lang.text('hotkeyVolumeControl')}`;
      } else {
        const micLabel = String(Voice.rawMic?.label || Voice.mic?.label || 'microphone');
        tutorial.innerHTML =
          `<strong>${dropKey}</strong>${Lang.text('hotkeyDropCallsSuffix')}` +
          '<br>' +
          Lang.text('hotkeyVolumeControl') +
          '<br>────────────<br>' +
          `<strong>${toggleKey}</strong>${Lang.text('enableMicSuffix').replace('{Voice.mic.label}', micLabel)}`;
      }
    }

    panelBody.append(tutorial);
  }

  static playerInfoPanel(id) {
    let name = Voice.manager[id].name ? Voice.manager[id].name : `id${id}`;

    let state = () => {
      let status = '';
      const reconnectJob = Voice.getReconnectJob(id, Voice.manager[id].key);

      if (reconnectJob && Voice.manager[id].peer.connectionState !== 'connected') {
        status = Lang.text('voiceReconnectingAttempt').replace('{attempt}', String((reconnectJob.attempt || 0) + 1));
      } else {
        switch (Voice.manager[id].peer.connectionState) {
          case 'new':
            status = Lang.text('waitingResponse');
            break;

          case 'connecting':
            status = Lang.text('voiceConnecting');
            break;

          default:
            status = Voice.manager[id].peer.connectionState;
            break;
        }
      }

      return Voice.manager[id].peer.connectionState == 'connected' ? `${name} [Х]` : `${name} (${status})`;
    };

    let item = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        style: 'voice-info-panel-body-item-name',
        event: [
          'click',
          () => {
            Voice.drop(Number(id));

            item.remove();
          },
        ],
      },
      state(),
    );

    let level = DOM({ style: 'voice-info-panel-body-item-bar-level' });

    let bar = DOM({ style: 'voice-info-panel-body-item-bar' }, level);

    let indication = () => {
      if (Voice.manager[id].peer.connectionState == 'connected' && Voice.manager[id].stream) {
        Voice.indication(Voice.manager[id].stream, (percent) => {
          level.style.width = `${percent}%`;
        });
      }

      if (Voice.manager[id].stream) {
        if (bar.classList.contains('voice-info-panel-body-item-nostream')) {
          bar.classList.remove('voice-info-panel-body-item-nostream');
        }
      } else {
        if (!bar.classList.contains('voice-info-panel-body-item-nostream')) {
          bar.classList.add('voice-info-panel-body-item-nostream');
        }
      }
    };

    indication();

    Voice.manager[id].peer.onconnectionstatechange = () => {
      item.innerText = state();

      indication();
    };

    const panelBody = Voice.getInfoPanelBody();
    if (!panelBody) return;
    panelBody.append(
      DOM({ style: 'voice-info-panel-body-item' }, item, DOM({ style: 'voice-info-panel-body-item-status' }, bar)),
    );
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

        await App.api.ghost('user', 'callCandidate', {
          id: id,
          candidate: candidate,
        });
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

  static async mergeFriendCalls(users) {
    if (!Array.isArray(users) || !users.length) {
      return;
    }
    const selfId = Number(App.storage?.data?.id || 0);

    for (const item of users) {
      const id = Number(item?.id);
      if (!Number.isFinite(id) || id <= 0) {
        continue;
      }
      if (id === selfId) {
        continue;
      }
      if (id in Voice.manager) {
        continue;
      }
      // Deterministic initiator to avoid both sides calling simultaneously.
      if (Number.isFinite(selfId) && selfId > 0 && selfId > id) {
        continue;
      }

      try {
        Voice.markMergeAutoAccept(id);
        const voice = new Voice(id, 'friend', String(item?.name || ''), true);
        await voice.call({ reconnect: 1 });
      } catch (error) {
        console.log('Voice friend merge failed:', error);
        const msg = String(error || '').toLowerCase();
        if (msg.includes('request') && msg.includes('pending')) {
          setTimeout(async () => {
            if (id in Voice.manager) return;
            try {
              Voice.markMergeAutoAccept(id);
              const retryVoice = new Voice(id, 'friend', String(item?.name || ''), true);
              await retryVoice.call({ reconnect: 1 });
            } catch (retryError) {
              console.log('Voice friend merge retry failed:', retryError);
            }
          }, 700);
        }
      }
    }
  }

  static getConnectedPeerIds(excludeId = 0) {
    const skipId = Number(excludeId) || 0;
    const result = [];
    for (const key of Object.keys(Voice.manager)) {
      const id = Number(key);
      if (!Number.isFinite(id) || id <= 0 || id === skipId) continue;
      const item = Voice.manager[key];
      const state = String(item?.peer?.connectionState || '');
      if (state === 'connected' || state === 'connecting') {
        result.push(id);
      }
    }
    return Array.from(new Set(result));
  }

  static suspendPeersForBattle(allyIds = []) {
    const cleanIds = Array.from(new Set((allyIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
    const allySet = new Set(cleanIds);
    for (const idText of Object.keys(Voice.manager)) {
      const id = Number(idText);
      if (allySet.has(id)) {
        continue;
      }
      const target = Voice.manager[idText];
      if (!target) {
        continue;
      }

      const key = String(target.key || '');
      Voice.stopReconnectJob(id, key);

      if (Voice.isFriendScopedConnection(target)) {
        if (!Voice.battleSuspendedPeers.has(id)) {
          Voice.battleSuspendedPeers.set(id, {
            id,
            key: key || 'friend',
            name: String(target.name || ''),
            important: Boolean(target.important),
          });
        }
        App.api.ghost('user', 'callPause', { id }).catch(() => {
          App.api.ghost('user', 'callDrop', { id }).catch(() => {});
        });
      } else {
        App.api.ghost('user', 'callDrop', { id }).catch(() => {});
      }

      target.close();
    }

    if (Voice.mic && !Object.keys(Voice.manager).length) {
      Voice.mic.enabled = false;
      Voice.updateInfoPanel();
    }
  }

  static restoreSuspendedBattlePeers() {
    if (!Voice.battleSuspendedPeers.size) {
      return;
    }

    const list = Array.from(Voice.battleSuspendedPeers.values());
    Voice.battleSuspendedPeers.clear();

    let delayMs = 0;
    for (const item of list) {
      setTimeout(async () => {
        if (item.id in Voice.manager) {
          return;
        }
        try {
          const voice = new Voice(item.id, String(item.key || 'friend'), String(item.name || ''), Boolean(item.important));
          await voice.call({ reconnect: 1 });
        } catch (error) {
          console.log('Voice battle restore failed:', error);
        }
      }, delayMs);
      delayMs += 250;
    }
  }

  static async remoteDrop(id) {
    const target = Voice.manager[id];
    if (!target) return;
    await target.close();
  }

  static drop(id) {
    const target = Voice.manager[id];
    if (!target) return;
    App.api.ghost('user', 'callDrop', { id }).catch(() => {});
    target.close();
  }

  static destroy(full = false, say = false) {
    Voice.stopAllReconnectJobs();
    Voice.battleSuspendedPeers.clear();
    for (let id in Voice.manager) {
      if (!full && Voice.manager[id].important) {
        continue;
      }

      if (Number(id) > 0) {
        App.api.ghost('user', 'callDrop', { id: Number(id) }).catch(() => {});
      }
      Voice.manager[id].close();
    }

    if (say) {
      App.say(Lang.text('callsDropped'));
    }

    if (Voice.mic) {
      if (full) {
        try {
          Voice.mic?.stop?.();
        } catch {}
        try {
          Voice.rawMic?.stop?.();
        } catch {}
        Voice.resetMicProcessing();

        Voice.mic = null;
        
        Voice.rawMic = null;

        Voice.userMedia = null;
      } else {
        if (!Object.keys(Voice.manager).length) {
          if (Voice.mic) {
            Voice.mic.enabled = false;
          }
        }
      }

      Voice.updateInfoPanel();
    }
  }

  static destroyTamburCallsOnly() {
    for (let id in Voice.manager) {
      const target = Voice.manager[id];
      if (!target) continue;
      const key = String(target.key || '');
      // Preserve friend/friend-of-friend calls; drop only MM/tambur scoped calls.
      if (Voice.isFriendScopedConnection(target)) {
        continue;
      }
      Voice.stopReconnectJob(Number(id), key);
      if (Number(id) > 0) {
        App.api.ghost('user', 'callDrop', { id: Number(id) }).catch(() => {});
      }
      target.close();
    }

    if (Voice.mic && !Object.keys(Voice.manager).length) {
      Voice.mic.enabled = false;
      Voice.updateInfoPanel();
    }
  }

  static volumeControl(increase = false) {
    let volumeLevel = 0.0;

    if (increase) {
      volumeLevel = Voice.volumeLevel + Voice.volumeLevelStep;

      if (volumeLevel > 1.0) {
        return;
      }

      App.say(`${Math.round(volumeLevel * 100)}%`);
    } else {
      volumeLevel = Voice.volumeLevel - Voice.volumeLevelStep;

      if (volumeLevel < 0.0) {
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

    Voice.infoPanelHiddenByUser = false;
    Voice.showInfoPanel(true);

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

    this.reconnectScheduled = false;
    
    this.hasEverConnected = false;
    
    this.disconnectTimer = null;

    this.allowAutoReconnect = true;

    this.stream = null;

    this.controller = null;

    if (this.id in Voice.manager || Object.keys(Voice.manager).length + 1 > Voice.limit) {
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
    };

    this.peer.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('Сгенерирован ICE кандидат:', event.candidate);

        if (this.peer.remoteDescription) {
          console.log('ОТПРАВИЛИ ICE кандидат:', event.candidate);

          await App.api.ghost('user', 'callCandidate', {
            id: this.id,
            candidate: event.candidate,
          });
        } else {
          if (!(this.id in Voice.cacheCandidate)) {
            Voice.cacheCandidate[this.id] = new Array();
          }

          Voice.cacheCandidate[this.id].push(event.candidate);
        }
      } else {
        console.log('Все ICE кандидаты собраны');
      }
    };

    this.peer.oniceconnectionstatechange = () => {
      const clearDisconnectTimer = () => {
        if (this.disconnectTimer) {
          clearTimeout(this.disconnectTimer);
          this.disconnectTimer = null;
        }
      };

      switch (this.peer.iceConnectionState) {
        case 'connected':
          console.log('Соединение успешно установлено');
          this.hasEverConnected = true;
          if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
          }
          clearDisconnectTimer();
          Voice.stopReconnectJob(this.id, this.key);
          this.reconnectScheduled = false;
          break;

        case 'disconnected':
          // WebRTC may report transient "disconnected" during glare/rechecks.
          // Do not drop UI entry immediately; wait and close only if it persists.
          clearDisconnectTimer();
          this.disconnectTimer = setTimeout(() => {
            this.disconnectTimer = null;
            if (!this.peer || this.peer.connectionState === 'closed') {
              this.close();
              return;
            }
            if (this.peer.iceConnectionState !== 'disconnected') {
              return;
            }
            if (
              this.allowAutoReconnect &&
              Voice.shouldAutoReconnectKey(this.key) &&
              this.isCaller &&
              !this.reconnectScheduled &&
              (this.key !== 'friend' || this.hasEverConnected)
            ) {
              this.reconnectScheduled = true;
              Voice.ensureReconnectJob(this.id, this.key, this.name, this.important, Voice.reconnectDisconnectedGraceMs);
              this.close({ keepReconnect: true });
            } else {
              this.close();
            }
          }, Voice.reconnectDisconnectedGraceMs);
          break;

        case 'failed':
          clearDisconnectTimer();
          if (
            this.allowAutoReconnect &&
            Voice.shouldAutoReconnectKey(this.key) &&
            this.isCaller &&
            !this.reconnectScheduled &&
            (this.key !== 'friend' || this.hasEverConnected)
          ) {
            this.reconnectScheduled = true;
            Voice.ensureReconnectJob(this.id, this.key, this.name, this.important, 0);
            this.close({ keepReconnect: true });
          } else {
            this.close();
          }
          break;

        case 'closed':
          clearDisconnectTimer();
          if (
            this.allowAutoReconnect &&
            Voice.shouldAutoReconnectKey(this.key) &&
            this.isCaller &&
            !this.reconnectScheduled &&
            (this.key !== 'friend' || this.hasEverConnected)
          ) {
            this.reconnectScheduled = true;
            Voice.ensureReconnectJob(this.id, this.key, this.name, this.important, Voice.reconnectDisconnectedGraceMs);
            this.close({ keepReconnect: true });
          } else {
            this.close();
          }
          break;
      }

      console.log(`Состояние соединения: ${this.peer.iceConnectionState}`);
    };
  }

  async call(options = {}) {
    if (Settings.settings.novoice) {
      throw Lang.text('voiceDisabled');
    }

    Voice.infoPanelHiddenByUser = false;
    Voice.showInfoPanel(true);

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

    let offer = await this.peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await this.peer.setLocalDescription(offer);

    this.timer = setTimeout(() => {
      this.timer = null;

      this.close();
    }, 15000);

    await App.api.request('user', 'call', {
      id: this.id,
      key: this.key,
      offer: offer,
      reconnect: Number(options?.reconnect || 0) ? 1 : 0,
    });

    this.isCaller = true;

    Voice.updateInfoPanel();
  }

  async accept(offer) {
    if (Settings.settings.novoice) {
      throw Lang.text('voiceDisabled');
    }

    Voice.infoPanelHiddenByUser = false;
    Voice.showInfoPanel(true);

    if (!this.peer) {
      return;
    }

    await Voice.initLocalMedia();

    if (Voice.mic) {
      this.peer.addTrack(Voice.mic);
    }

    await this.peer.setRemoteDescription(offer);

    let answer = await this.peer.createAnswer();

    await App.api.ghost('user', 'callAccept', {
      id: this.id,
      answer: answer,
      mergePeers: Voice.getConnectedPeerIds(this.id),
    });

    await this.peer.setLocalDescription(answer);

    Voice.updateInfoPanel();
  }

  async reconnect() {
    if (!Voice.shouldAutoReconnectKey(this.key) || !this.isCaller) return;
    Voice.ensureReconnectJob(this.id, this.key, this.name, this.important, 0);
    this.close({ keepReconnect: true });
  }

  async close(options = {}) {
    const keepReconnect = Boolean(options?.keepReconnect);
    if (!keepReconnect) {
      this.allowAutoReconnect = false;
    }
    if (!keepReconnect) {
      Voice.stopReconnectJob(this.id, this.key);
    }
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    try {
      this.peer?.close?.();
    } catch {}

    delete Voice.manager[this.id];

    if (this.id in Voice.cacheCandidate) {
      delete Voice.cacheCandidate[this.id];
    }

    Voice.updateInfoPanel();
  }
}
