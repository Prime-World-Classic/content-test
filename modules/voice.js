import { DOM } from './dom.js';
import { App } from './app.js';
import { Settings } from './settings.js';
import { Sound } from './sound.js';
import { Castle } from './castle.js';
import { Lang } from './lang.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { normalizeKey } from './keybindings/keybindings.input.js';
import { MM } from './mm.js';
import { uiIcon } from './uiIcon.js';
import { NativeAPI } from './nativeApi.js';

export class Voice {
  static peerConnectionConfig = {
    // проверка stun https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
    iceServers: [
      { urls: ['stun:pw-classic-backup.ru:3478'] },
      {
        urls: ['turn:pw-classic-backup.ru:3478?transport=udp', 'turn:pw-classic-backup.ru:3478?transport=tcp'],
        credential: '2mOPlRXn4Y2BJSbGY0zN',
        username: 'pwvoice',
      },
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

  static localMediaPromise = null;

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

  static reconnectJobs = new Map();

  static mergeAutoAcceptUntil = new Map();
  
  static battleSuspendedPeers = new Map();

  static battleSuspendedAt = 0;

  static battleSuspendMaxMs = 3 * 60 * 1000;
  
  static mutedPeers = new Set();
  
  static mutedByPeers = new Set();
  
  static panelMeterStops = new Set();
  
  static peerSettingsStorageKey = 'voice-peer-settings-v1';
  
  static peerSettingsLoaded = false;
  
  static peerSettings = {};
  
  static playbackContext = null;

  static reconnectPlanMs = [2000, 5000, 10000, 15000, 20000];

  static reconnectMaxDurationMs = 15 * 60 * 1000;

  static reconnectDisconnectedGraceMs = 3000;

  static radioHotkeyListenersBound = false;

  static radioPressedByKeyboard = false;

  static radioPulseTimer = null;

  static logQueue = Promise.resolve();

  // Выбор игрока «микрофон включён» (Ctrl+Z) живёт до выхода из лаунчера: sessionStorage
  // переживает перезагрузку страницы после фонового обновления, но не перезапуск. Раньше микрофон
  // выключался сам, когда заканчивались звонки, при бое и при новом микрофоне — и каждый раз
  // приходилось снова жать Ctrl+Z.
  static micWantedStorageKey = 'voice-mic-wanted';

  static getMicWanted() {
    try {
      return sessionStorage.getItem(Voice.micWantedStorageKey) === '1';
    } catch {
      return false;
    }
  }

  static setMicWanted(wanted) {
    try {
      if (wanted) sessionStorage.setItem(Voice.micWantedStorageKey, '1');
      else sessionStorage.removeItem(Voice.micWantedStorageKey);
    } catch {}
  }

  // Журнал войса (voice.log рядом с лаунчером, с лимитом размера): звонки, входящие и решения
  // по ним, переподключения, бой. Нужен, чтобы разбирать сбои, которые воспроизводятся только
  // у живых игроков (восстановление после боя и т.п.).
  static log(event, data = {}) {
    let payload = '';
    try {
      payload = JSON.stringify(data);
    } catch {}
    const self = Number(App.storage?.data?.id || 0);
    const line = `[${new Date().toISOString()}] me=${self} ${event} ${payload}\n`;
    console.log('[voice]', event, data);
    if (!NativeAPI.status) return;
    Voice.logQueue = Voice.logQueue.then(() => NativeAPI.cappedAppend('voice.log', line)).catch(() => {});
  }

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

  static ensurePeerSettingsLoaded() {
    if (Voice.peerSettingsLoaded) return;
    Voice.peerSettingsLoaded = true;
    try {
      const raw = localStorage.getItem(Voice.peerSettingsStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      Voice.peerSettings = parsed && typeof parsed === 'object' ? parsed : {};
      for (const idText of Object.keys(Voice.peerSettings)) {
        const id = Number(idText);
        if (!Number.isFinite(id) || id <= 0) continue;
        if (Voice.peerSettings[idText]?.muted === true) {
          Voice.mutedPeers.add(id);
        }
      }
    } catch {
      Voice.peerSettings = {};
    }
  }

  static savePeerSettings() {
    try {
      localStorage.setItem(Voice.peerSettingsStorageKey, JSON.stringify(Voice.peerSettings));
    } catch {}
  }

  static getPeerSettings(id) {
    Voice.ensurePeerSettingsLoaded();
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) return null;
    const key = String(targetId);
    if (!Voice.peerSettings[key] || typeof Voice.peerSettings[key] !== 'object') {
      Voice.peerSettings[key] = {};
    }
    return Voice.peerSettings[key];
  }

  static getPeerVolumePercent(id) {
    const peerSettings = Voice.getPeerSettings(id);
    if (!peerSettings) return 50;
    if (Number.isFinite(Number(peerSettings.volumePercent))) {
      return Math.max(10, Math.min(100, Math.round(Number(peerSettings.volumePercent))));
    }
    return 50;
  }

  static setPeerVolumePercent(id, percent = 50) {
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) return;
    const value = Math.max(10, Math.min(100, Math.round(Number(percent) || 0)));
    const peerSettings = Voice.getPeerSettings(targetId);
    if (!peerSettings) return;
    peerSettings.volumePercent = value;
    Voice.savePeerSettings();
    Voice.applyPeerOutputVolume(targetId);
  }

  static peerPercentToGain(percent = 50) {
    // 50% is baseline (x1). 100% is boost (x2).
    return Math.max(0, Math.min(2, Number(percent || 0) / 50));
  }

  static ensurePlaybackContext() {
    if (Voice.playbackContext) {
      if (Voice.playbackContext.state === 'suspended') {
        Voice.playbackContext.resume().catch(() => {});
      }
      return Voice.playbackContext;
    }
    try {
      Voice.playbackContext = new AudioContext();
      if (Voice.playbackContext.state === 'suspended') {
        Voice.playbackContext.resume().catch(() => {});
      }
    } catch {
      Voice.playbackContext = null;
    }
    return Voice.playbackContext;
  }

  static applyPeerOutputVolume(id) {
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) return;
    const target = Voice.manager?.[targetId];
    if (!target) return;
    const peerGain = Voice.peerPercentToGain(Voice.getPeerVolumePercent(targetId));
    const globalGain = Math.max(0, Math.min(1, Number(Voice.volumeLevel) || 0));
    const gain = peerGain * globalGain;
    const effectiveGain = Voice.isPeerMuted(targetId) ? 0 : gain;
    if (target.playbackGain) {
      try {
        target.playbackGain.gain.value = effectiveGain;
      } catch {}
    }
    if (target.controller) {
      if (target.playbackGain) {
        target.controller.muted = true;
      } else {
        target.controller.muted = Voice.isPeerMuted(targetId);
        target.controller.volume = Math.max(0, Math.min(1, effectiveGain));
      }
    }
  }

  static isPeerMuted(id) {
    Voice.ensurePeerSettingsLoaded();
    const targetId = Number(id);
    return Number.isFinite(targetId) && targetId > 0 && Voice.mutedPeers.has(targetId);
  }

  static setPeerMuted(id, muted = true) {
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return;
    }
    if (muted) {
      Voice.mutedPeers.add(targetId);
    } else {
      Voice.mutedPeers.delete(targetId);
    }
    const peerSettings = Voice.getPeerSettings(targetId);
    if (peerSettings) {
      peerSettings.muted = Boolean(muted);
      Voice.savePeerSettings();
    }
    Voice.applyPeerOutputVolume(targetId);
  }

  static togglePeerMuted(id) {
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return;
    }
    const nextMuted = !Voice.isPeerMuted(targetId);
    Voice.setPeerMuted(targetId, nextMuted);
    App.api
      .ghost('user', 'callMuteState', {
        id: targetId,
        muted: nextMuted ? 1 : 0,
      })
      .catch(() => {});
    Voice.updateInfoPanel();
  }

  static isMutedByPeer(id) {
    const targetId = Number(id);
    return Number.isFinite(targetId) && targetId > 0 && Voice.mutedByPeers.has(targetId);
  }

  static setMutedByPeer(id, muted = true) {
    const targetId = Number(id);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return;
    }
    if (muted) {
      Voice.mutedByPeers.add(targetId);
    } else {
      Voice.mutedByPeers.delete(targetId);
    }
    Voice.updateInfoPanel();
  }

  static stopPanelMeters() {
    for (const stop of Voice.panelMeterStops) {
      try {
        stop?.();
      } catch {}
    }
    Voice.panelMeterStops.clear();
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
    Voice.log('reconnect-stop', { id: job.id, key: job.key, attempts: job.attempt });
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
    Voice.log('reconnect-start', { id: job.id, key: job.key, delay: Number(initialDelayMs) || 0 });
    const run = async () => {
      const current = Voice.reconnectJobs.get(token);
      if (!current) return;
      if (Date.now() - current.startedAt > Voice.reconnectMaxDurationMs) {
        Voice.log('reconnect-expired', { id: current.id });
        Voice.stopReconnectJob(current.id, current.key);
        return;
      }
      const existing = Voice.manager[current.id];
      if (existing && existing.peer && existing.peer.connectionState !== 'closed') {
        const delayBusy = Voice.reconnectPlanMs[Math.min(current.attempt, Voice.reconnectPlanMs.length - 1)];
        Voice.log('reconnect-busy', { id: current.id, state: existing.peer.connectionState, signaling: existing.peer.signalingState });
        current.timer = setTimeout(run, delayBusy);
        return;
      }
      let voice = null;
      try {
        current.activeCallAttempt = true;
        Voice.log('reconnect-attempt', { id: current.id, attempt: current.attempt + 1 });
        voice = new Voice(current.id, current.key, current.name, current.important);
        await voice.call({ reconnect: 1 });
      } catch (error) {
        Voice.log('reconnect-attempt-error', { id: current.id, error: String(error) });
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
    // Two calls started before getUserMedia resolves must share one mic; otherwise the second
    // overwrites Voice.mic and the first peer keeps a track that Ctrl+Z no longer controls.
    if (!Voice.localMediaPromise) {
      Voice.localMediaPromise = Voice.initLocalMediaOnce().finally(() => {
        Voice.localMediaPromise = null;
      });
    }
    return Voice.localMediaPromise;
  }

  static async initLocalMediaOnce() {
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
      // В режиме рации микрофон включается только удержанием клавиши.
      Voice.mic.enabled = !Settings.settings?.voiceRadioMode && Voice.getMicWanted();
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
    Voice.setMicWanted(Voice.mic.enabled);

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
    let audioContext = null;
    let mediaStreamSource = null;
    let analyser = null;
    let processor = null;
    let zeroGain = null;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (processor) {
        processor.onaudioprocess = null;
      }
      try {
        mediaStreamSource?.disconnect?.();
      } catch {}
      try {
        analyser?.disconnect?.();
      } catch {}
      try {
        processor?.disconnect?.();
      } catch {}
      try {
        zeroGain?.disconnect?.();
      } catch {}
      try {
        audioContext?.close?.();
      } catch {}
      mediaStreamSource = null;
      analyser = null;
      processor = null;
      zeroGain = null;
      audioContext = null;
    };

    try {
      audioContext = new AudioContext();
      mediaStreamSource = audioContext.createMediaStreamSource(source);
      analyser = audioContext.createAnalyser();
      processor = audioContext.createScriptProcessor(2048, 1, 1);
      zeroGain = audioContext.createGain();
      zeroGain.gain.value = 0;
      mediaStreamSource.connect(analyser);
      analyser.connect(processor);
      processor.connect(zeroGain);
      zeroGain.connect(audioContext.destination);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      processor.onaudioprocess = () => {
        if (stopped) return;
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
      };
    } catch (error) {
      console.log('Voice indication init failed:', error);
      stop();
    }

    return stop;
  }

  static updateInfoPanel() {
    if (Number.isFinite(Number(Settings.settings?.voiceVolume))) {
      Voice.setVolumeLevel(Number(Settings.settings.voiceVolume));
    }
    Voice.stopPanelMeters();
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
      const stopMeter = Voice.indication(Voice.userMedia, (percent) => {
        level.style.width = `${percent}%`;
      });
      Voice.panelMeterStops.add(stopMeter);
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
      const hintDivider = '<span class="voice-info-panel-hint-divider"></span>';
      if (Voice.mic.enabled) {
        tutorial.innerHTML =
          `<strong>${dropKey}</strong>${Lang.text('hotkeyDropCallsSuffix')}` +
          hintDivider +
          Lang.text('hotkeyVolumeControl') +
          hintDivider +
          Lang.text('voicePeerVolumeHint');
      } else {
        const micLabel = String(Voice.rawMic?.label || Voice.mic?.label || 'microphone');
        tutorial.innerHTML =
          `<strong>${dropKey}</strong>${Lang.text('hotkeyDropCallsSuffix')}` +
          hintDivider +
          Lang.text('hotkeyVolumeControl') +
          hintDivider +
          Lang.text('voicePeerVolumeHint') +
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

          case 'disconnected':
            status = Lang.text('voiceDisconnected');
            break;

          case 'failed':
            status = Lang.text('voiceFailed');
            break;

          case 'closed':
            status = Lang.text('voiceClosed');
            break;

          default:
            status = Voice.manager[id].peer.connectionState;
            break;
        }
      }

      return Voice.manager[id].peer.connectionState == 'connected' ? `${name}` : `${name} (${status})`;
    };

    let item = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        style: 'voice-info-panel-body-item-name',
        event: [
          'click',
          () => {
            if (
              Voice.infoPanel?.classList?.contains('voice-window-mode') ||
              MM.isInTambur ||
              MM.isInBattle
            ) {
              return;
            }
            Voice.drop(Number(id));
            item.remove();
          },
        ],
      },
      '',
    );
    
    let mute = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        style: ['voice-info-panel-body-item-name', 'voice-info-panel-body-item-mute'],
        event: ['click', () => Voice.togglePeerMuted(Number(id))],
      },
      '',
    );
    
    mute.style.marginRight = '0.5cqw';
    
    let mutedByIcon = DOM(
      {
        style: 'voice-info-panel-body-item-muted-by',
      },
      uiIcon('cross'),
    );
    
    const updateItemView = () => {
      const mutedMark = Voice.isPeerMuted(Number(id)) ? ' [MUTED]' : '';
      item.innerText = `${state()}${mutedMark}`;
      mute.replaceChildren(uiIcon(Voice.isPeerMuted(Number(id)) ? 'sound-off' : 'sound-on'));
      mutedByIcon.style.display = Voice.isMutedByPeer(Number(id)) ? '' : 'none';
    };
    
    updateItemView();

    let level = DOM({ style: 'voice-info-panel-body-item-bar-level' });

    let bar = DOM({ style: 'voice-info-panel-body-item-bar' }, level);
    let volumeText = DOM({ style: 'voice-info-panel-body-item-volume' }, '');
    const updatePeerVolumeView = () => {
      const percent = Voice.getPeerVolumePercent(Number(id));
      volumeText.innerText = `${percent}%`;
      Voice.applyPeerOutputVolume(Number(id));
    };
    updatePeerVolumeView();
    let currentStopMeter = null;

    let indication = () => {
      if (currentStopMeter) {
        currentStopMeter();
        Voice.panelMeterStops.delete(currentStopMeter);
        currentStopMeter = null;
      }
      if (Voice.manager[id].peer.connectionState == 'connected' && Voice.manager[id].stream) {
        const stopMeter = Voice.indication(Voice.manager[id].stream, (percent) => {
          level.style.width = `${percent}%`;
        });
        currentStopMeter = stopMeter;
        Voice.panelMeterStops.add(stopMeter);
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

    // Wrap the constructor's handler, not the current one: the panel is rebuilt on every
    // updateInfoPanel, and chaining wrappers would grow without bound (one meter per layer).
    const target = Voice.manager[id];
    const baseOnConnectionStateChange = target.baseOnConnectionStateChange;
    target.peer.onconnectionstatechange = (...args) => {
      try {
        baseOnConnectionStateChange?.(...args);
      } catch {}
      if (Voice.manager[id] !== target) return;
      updateItemView();

      indication();
    };

    const panelBody = Voice.getInfoPanelBody();
    if (!panelBody) return;
    const status = DOM({ style: 'voice-info-panel-body-item-status' }, bar, volumeText);
    status.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const step = event.deltaY < 0 ? 1 : -1;
        Voice.setPeerVolumePercent(Number(id), Voice.getPeerVolumePercent(Number(id)) + step);
        updatePeerVolumeView();
      },
      { passive: false },
    );
    panelBody.append(
      DOM(
        { style: 'voice-info-panel-body-item' },
        DOM({ style: 'voice-info-panel-body-item-controls' }, mute, mutedByIcon, item),
        status,
      ),
    );
  }

  static async ready(id, answer) {
    if (!(id in Voice.manager)) {
      Voice.log('ready-ignored', { id: Number(id) });
      return;
    }
    Voice.log('ready', { id: Number(id) });

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
        Voice.log('merge-skip-higher-id', { id });
        continue;
      }
      Voice.log('merge-call', { id });

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

  // Between the lobby closing and the game process starting neither MM.isInTambur nor
  // MM.isInBattle is set; friend calls must still be ignored then. Cleared on restore,
  // and expires on its own in case the game never started.
  static isBattleSuspendActive() {
    return Voice.battleSuspendedAt > 0 && Date.now() - Voice.battleSuspendedAt < Voice.battleSuspendMaxMs;
  }

  static suspendPeersForBattle(allyIds = []) {
    Voice.battleSuspendedAt = Date.now();
    const cleanIds = Array.from(new Set((allyIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
    const allySet = new Set(cleanIds);
    Voice.log('battle-suspend', { allies: cleanIds, peers: Object.keys(Voice.manager).map(Number), jobs: Array.from(Voice.reconnectJobs.values()).map((j) => j.id) });
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

    Voice.updateInfoPanel();
  }

  static restoreSuspendedBattlePeers() {
    Voice.battleSuspendedAt = 0;
    if (!Voice.battleSuspendedPeers.size) {
      return;
    }

    const list = Array.from(Voice.battleSuspendedPeers.values());
    Voice.battleSuspendedPeers.clear();
    Voice.log('battle-restore', { ids: list.map((x) => x.id) });

    // Через задачу переподключения, а не одним звонком: единственная попытка могла сорваться
    // (встречный звонок от VFriendMerge, гонка состояний, отказ сервера) — и друг не возвращался.
    // Задача повторяет звонок по reconnectPlanMs, останавливается при соединении или VDrop.
    let delayMs = 0;
    for (const item of list) {
      Voice.ensureReconnectJob(item.id, String(item.key || 'friend'), String(item.name || ''), Boolean(item.important), delayMs);
      delayMs += 250;
    }
  }

  static async remoteDrop(id) {
    Voice.log('remote-drop', { id: Number(id), hadEntry: Boolean(Voice.manager[id]) });
    // The peer hung up (or paused for battle): stop re-calling them even between attempts,
    // when there is no live entry to close. If we are in battle, don't restore them afterwards
    // either (e.g. they closed the launcher while our battle was going on).
    Voice.battleSuspendedPeers.delete(Number(id));
    for (const job of Array.from(Voice.reconnectJobs.values())) {
      if (job.id === Number(id)) {
        Voice.stopReconnectJob(job.id, job.key);
      }
    }
    const target = Voice.manager[id];
    if (!target) return;
    Voice.setMutedByPeer(id, false);
    await target.close();
  }

  static drop(id) {
    const target = Voice.manager[id];
    if (!target) return;
    App.api.ghost('user', 'callDrop', { id }).catch(() => {});
    target.close();
  }

  static destroy(full = false, say = false) {
    if (!full && Voice.infoPanel?.classList?.contains('voice-window-mode')) {
      return;
    }
    if (full) {
      Voice.stopAllReconnectJobs();
      Voice.battleSuspendedPeers.clear();
    } else {
      // Pending reconnects of non-friend calls (peer currently not in manager) must stop too.
      for (const job of Array.from(Voice.reconnectJobs.values())) {
        if (!job.important && job.key !== 'friend') {
          Voice.stopReconnectJob(job.id, job.key);
        }
      }
    }
    for (let id in Voice.manager) {
      // Ctrl+K drops everything except friends; auto-accepted friend calls (merge, battle
      // restore) are not flagged important, so check the friend scope as well.
      if (!full && (Voice.manager[id].important || Voice.isFriendScopedConnection(Voice.manager[id]))) {
        continue;
      }

      Voice.stopReconnectJob(Number(id), String(Voice.manager[id].key || ''));
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

        Voice.setMicWanted(false);
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

    Voice.updateInfoPanel();
  }

  static setVolumeLevel(level = 1.0) {
    const volumeLevel = Math.max(0, Math.min(1, Number(level) || 0));
    Voice.volumeLevel = volumeLevel;
    for (let id in Voice.manager) {
      Voice.applyPeerOutputVolume(Number(id));
    }
  }
  
  static volumeControl(increase = false) {
    const current = Number.isFinite(Number(Settings.settings?.voiceVolume))
      ? Number(Settings.settings.voiceVolume)
      : Voice.volumeLevel;
    const next = Math.max(0, Math.min(1, current + (increase ? 0.01 : -0.01)));
    if (Math.abs(next - current) < 0.00001) {
      return;
    }
    Settings.settings.voiceVolume = next;
    Voice.setVolumeLevel(next);
    const nextPercent = Math.round(next * 100);
    if (nextPercent % 20 === 0) {
      App.say(`${nextPercent}%`);
    }
    const slider = document.getElementById('voice-volume-slider');
    if (slider) {
      slider.value = String(nextPercent);
      const max = Number(slider.max || 100);
      const percentage = 2 + (nextPercent / Math.max(1, max)) * 98;
      slider.style.setProperty('--fill-percentage', `${percentage}%`);
    }
    const percent = document.getElementById('voice-volume-percentage');
    if (percent) {
      percent.textContent = `${nextPercent}%`;
    }
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

      // One rejected ally (left the match, server check failed) must not stop calls to the rest.
      let voice = null;
      try {
        voice = new Voice(user.id, key, user.name);

        await voice.call();
      } catch (error) {
        console.log('Voice.association call failed:', user.id, error);
        voice?.close();
      }
    }
  }

  constructor(id, key = '', name = '', important = false) {
    if (Number.isFinite(Number(Settings.settings?.voiceVolume))) {
      Voice.setVolumeLevel(Number(Settings.settings.voiceVolume));
    }
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
    
    this.playbackSource = null;
    
    this.playbackGain = null;

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

      const playbackContext = Voice.ensurePlaybackContext();
      if (playbackContext) {
        try {
          this.playbackSource = playbackContext.createMediaStreamSource(this.stream);
          this.playbackGain = playbackContext.createGain();
          this.playbackSource.connect(this.playbackGain);
          this.playbackGain.connect(playbackContext.destination);
        } catch {
          this.playbackSource = null;
          this.playbackGain = null;
        }
      }
      
      this.controller.muted = Voice.isPeerMuted(this.id);
      Voice.applyPeerOutputVolume(this.id);

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

    const clearDisconnectTimer = () => {
      if (this.disconnectTimer) {
        clearTimeout(this.disconnectTimer);
        this.disconnectTimer = null;
      }
    };

    const canScheduleReconnect = () => {
      return (
        this.allowAutoReconnect &&
        Voice.shouldAutoReconnectKey(this.key) &&
        this.isCaller &&
        !this.reconnectScheduled &&
        (this.key !== 'friend' || this.hasEverConnected)
      );
    };

    this.peer.onconnectionstatechange = () => {
      const state = String(this.peer?.connectionState || '');
      Voice.log('state', { id: Number(this.id), key: this.key, state, caller: this.isCaller });
      switch (state) {
        case 'connected':
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
          clearDisconnectTimer();
          this.disconnectTimer = setTimeout(() => {
            this.disconnectTimer = null;
            if (!this.peer || this.peer.connectionState === 'closed') {
              this.close();
              return;
            }
            if (this.peer.connectionState !== 'disconnected') {
              return;
            }
            if (canScheduleReconnect()) {
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
          if (canScheduleReconnect()) {
            this.reconnectScheduled = true;
            Voice.ensureReconnectJob(this.id, this.key, this.name, this.important, 0);
            this.close({ keepReconnect: true });
          } else {
            this.close();
          }
          break;

        case 'closed':
          clearDisconnectTimer();
          if (canScheduleReconnect()) {
            this.reconnectScheduled = true;
            Voice.ensureReconnectJob(this.id, this.key, this.name, this.important, Voice.reconnectDisconnectedGraceMs);
            this.close({ keepReconnect: true });
          } else {
            this.close();
          }
          break;
      }
    };
    this.baseOnConnectionStateChange = this.peer.onconnectionstatechange;

    this.peer.oniceconnectionstatechange = () => {
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
            if (canScheduleReconnect()) {
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
          if (canScheduleReconnect()) {
            this.reconnectScheduled = true;
            Voice.ensureReconnectJob(this.id, this.key, this.name, this.important, 0);
            this.close({ keepReconnect: true });
          } else {
            this.close();
          }
          break;

        case 'closed':
          clearDisconnectTimer();
          if (canScheduleReconnect()) {
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

      // Unanswered reconnect attempt: keep the job so it retries per reconnectPlanMs.
      Voice.log('call-timeout', { id: Number(this.id), job: Boolean(Voice.getReconnectJob(this.id, this.key)) });
      this.close({ keepReconnect: Boolean(Voice.getReconnectJob(this.id, this.key)) });
    }, 15000);

    Voice.log('call', { id: Number(this.id), key: this.key, reconnect: Number(options?.reconnect || 0) ? 1 : 0 });
    try {
      // API отклоняет второй user.call, пока не пришёл ответ на первый (REQUEST_ALREADY_PENDING).
      // При восстановлении после боя звонки нескольким друзьям идут почти одновременно — ждём
      // освобождения метода, а не теряем звонок.
      for (let wait = 0; ; wait++) {
        try {
          await App.api.request('user', 'call', {
            id: this.id,
            key: this.key,
            offer: offer,
            reconnect: Number(options?.reconnect || 0) ? 1 : 0,
          });
          break;
        } catch (error) {
          if (error?.code !== 'REQUEST_ALREADY_PENDING' || wait >= 40 || Voice.manager[this.id] !== this) throw error;
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }
    } catch (error) {
      Voice.log('call-error', { id: Number(this.id), error: String(error) });
      throw error;
    }

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

    Voice.log('accept', { id: Number(this.id), key: this.key });
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
    // A placeholder (constructor found the id busy or the limit hit) was never registered:
    // closing it must not evict the live entry for this id or stop its reconnect job.
    if (!this.peer) {
      return;
    }
    // A repeated close() of an already replaced object must not touch the newer entry for this id.
    const isLive = Voice.manager[this.id] === this;
    const keepReconnect = Boolean(options?.keepReconnect);
    if (!keepReconnect) {
      this.allowAutoReconnect = false;
    }
    if (!keepReconnect && isLive) {
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
    try {
      this.playbackSource?.disconnect?.();
    } catch {}
    try {
      this.playbackGain?.disconnect?.();
    } catch {}
    if (this.controller) {
      try {
        this.controller.pause();
        this.controller.srcObject = null;
        this.controller.remove();
      } catch {}
      this.controller = null;
    }

    if (!isLive) {
      return;
    }

    delete Voice.manager[this.id];
    
    Voice.mutedByPeers.delete(this.id);

    if (this.id in Voice.cacheCandidate) {
      delete Voice.cacheCandidate[this.id];
    }

    Voice.updateInfoPanel();
  }
}
