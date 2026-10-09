import { App } from './app.js';
import { Voice } from './voice.js';
import { PWGame } from './pwgame.js';
import { Settings } from './settings.js';
import { Lang } from './lang.js';
import { MM } from './mm.js';

export class NativeAPI {
  static status = false;
  static exitRequested = false;
  static voiceWindow = null;
  static isSteamClient = false;

  static platform;

  static title;
  static updated = false;
  static curLabel;
  static lastBranchV = null;
  static revBefore = null;
  static restartInProgress = false;

  // Фоновая проверка обновлений content, пока лаунчер запущен
  static CONTENT_WATCH_FIRST_MS = 2 * 60 * 1000;
  static CONTENT_WATCH_INTERVAL_MS = 5 * 60 * 1000;
  static CONTENT_WATCH_RESTART_DELAY_MS = 10 * 1000;
  static CONTENT_WATCH_GUARD_KEY = 'contentWatchRestartRev';
  static contentWatchTimer = 0;
  static contentWatchPendingRev = null;
  static updateInProgress = false;
  static updateCallback = null;
  static updateBackground = false;
  static restartPending = false;

  // Лог-файлы обновления: лимит 10 МБ, при превышении остаётся хвост ~5 МБ
  static LOG_MAX_BYTES = 10 * 1024 * 1024;
  static LOG_KEEP_BYTES = 5 * 1024 * 1024;

  static testbridgelog = new Array();

  static modules = {
    fileSystem: 'fs',
    childProcess: 'child_process',
    os: 'os',
    path: 'path',
    crypto: 'crypto',
    net: 'net',
    http: 'http',
    https: 'https',
    dgram: 'dgram',
  };

  static setDefaultWindow() {
    NativeAPI.window.width = 1280;

    NativeAPI.window.height = 720;

    NativeAPI.window.setMinimumSize(1280, 720);

    NativeAPI.window.setResizable(true);

    NativeAPI.window.setPosition('center');

    NativeAPI.window.enterFullscreen();
  }

  static init() {
    try {
      if (!nw) {
        return;
      }
    } catch (e) {
      return;
    }

    NativeAPI.status = true;

    NativeAPI.window = nw.Window.get();

    NativeAPI.setDefaultWindow();

    NativeAPI.app = nw.App;

    NativeAPI.altEnterShortcut = new nw.Shortcut({
      key: 'Alt+Enter',
      active: () => {
        Settings.settings.fullscreen = !Settings.settings.fullscreen;
        Settings.ApplySettings();
      },
    });

    NativeAPI.app.registerGlobalHotKey(NativeAPI.altEnterShortcut);
    NativeAPI.refreshVoiceHotkeys();

    NativeAPI.window.on('close', () => {
      NativeAPI.exit();
    });

    NativeAPI.loadModules();

    NativeAPI.platform = NativeAPI.os.platform();
    NativeAPI.isSteamClient = NativeAPI.detectSteamClientLaunch();

    window.addEventListener('error', (event) => {
      const msg = event?.error?.stack || event?.error?.toString?.() || String(event?.message || 'Unknown error');
      NativeAPI.write('error.txt', msg);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason;
      const msg = reason?.stack || (typeof reason === 'string' ? reason : JSON.stringify(reason)) || 'Unknown rejection';
      NativeAPI.write('unhandledrejection.txt', msg);
    });
  }

  static detectSteamClientLaunch() {
    if (!NativeAPI.status) {
      return false;
    }

    try {
      const steamEnvMarkers = ['SteamAppId', 'SteamGameId'];
      if (steamEnvMarkers.some((key) => String(process?.env?.[key] || '').trim().length > 0)) {
        return true;
      }

      const argvText = Array.isArray(process?.argv) ? process.argv.join(' ').toLowerCase() : '';
      if (argvText.includes('steam://') || argvText.includes(' -steam') || argvText.includes('--steam')) {
        return true;
      }

      // Steam-сборка может идти без локального апдейтера.
      if (NativeAPI.platform === 'win32' && NativeAPI.fileSystem?.existsSync && NativeAPI.path?.join) {
        const updaterPath = NativeAPI.path.join(process.cwd(), PWGame.PATH_UPDATE);
        if (!NativeAPI.fileSystem.existsSync(updaterPath)) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  static loadModules() {
    for (let module in NativeAPI.modules) {
      NativeAPI[module] = require(NativeAPI.modules[module]);
    }
  }

  static formatShortcutFromTokens(tokens, fallback = '') {
    if (!Array.isArray(tokens)) return fallback;
    const cleaned = tokens.map((x) => String(x || '').trim().toUpperCase()).filter(Boolean);
    if (!cleaned.length) return fallback;
    const modifiers = new Set(['CTRL', 'ALT', 'SHIFT', 'WIN']);
    // NW.js shortcut requires at least one non-modifier key.
    if (!cleaned.some((x) => !modifiers.has(x))) return fallback;
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
      BACKSPACE: 'Backspace',
      DELETE: 'Delete',
      INSERT: 'Insert',
      HOME: 'Home',
      END: 'End',
      PG_UP: 'PageUp',
      PG_DOWN: 'PageDown',
    };
    const formatted = cleaned.map((x) => (map[x] ? map[x] : x)).join('+');
    if (!formatted || formatted.includes('_')) return fallback;
    return formatted;
  }

  static unregisterVoiceHotkeys() {
    try {
      if (NativeAPI.voiceShortcut) NativeAPI.app.unregisterGlobalHotKey(NativeAPI.voiceShortcut);
    } catch {}
    try {
      if (NativeAPI.voiceDestroyShortcut) NativeAPI.app.unregisterGlobalHotKey(NativeAPI.voiceDestroyShortcut);
    } catch {}
    try {
      if (NativeAPI.voiceUpVolume) NativeAPI.app.unregisterGlobalHotKey(NativeAPI.voiceUpVolume);
    } catch {}
    try {
      if (NativeAPI.voiceDownVolume) NativeAPI.app.unregisterGlobalHotKey(NativeAPI.voiceDownVolume);
    } catch {}
    NativeAPI.voiceShortcut = null;
    NativeAPI.voiceDestroyShortcut = null;
    NativeAPI.voiceUpVolume = null;
    NativeAPI.voiceDownVolume = null;
  }

  static refreshVoiceHotkeys() {
    if (!NativeAPI.status || !NativeAPI.app) return;
    NativeAPI.unregisterVoiceHotkeys();

    const toggleKey = NativeAPI.formatShortcutFromTokens(Settings.settings?.voiceToggleHotkey, 'Ctrl+Z');
    if (toggleKey) {
      NativeAPI.voiceShortcut = new nw.Shortcut({
        key: toggleKey,
        active: () => {
          Voice.handleVoiceToggleHotkey?.();
        },
        failed: (error) => {
          console.log(error);
        },
      });
      NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceShortcut);
    }

    const dropKey = NativeAPI.formatShortcutFromTokens(Settings.settings?.voiceDropHotkey, 'Ctrl+K');
    if (dropKey) {
      NativeAPI.voiceDestroyShortcut = new nw.Shortcut({
        key: dropKey,
        active: () => {
          Voice.destroy(false, true);
        },
        failed: (error) => {
          console.log(error);
        },
      });
      NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceDestroyShortcut);
    }

    NativeAPI.voiceUpVolume = new nw.Shortcut({
      key: 'Ctrl+Up',
      active: () => {
        Voice.volumeControl(true);
      },
      failed: (error) => {
        console.log(error);
      },
    });
    NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceUpVolume);

    NativeAPI.voiceDownVolume = new nw.Shortcut({
      key: 'Ctrl+Down',
      active: () => {
        Voice.volumeControl(false);
      },
      failed: (error) => {
        console.log(error);
      },
    });
    NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceDownVolume);
  }
  
  static isLegacyWindowsForVoiceWindow() {
    if (NativeAPI.platform !== 'win32') {
      return false;
    }
    let release = '';
    try {
      release = String(NativeAPI.os?.release?.() || '');
    } catch {}
    if (!release) {
      return false;
    }
    const parts = release.split('.');
    const major = Number(parts[0] || 0);
    if (!Number.isFinite(major)) {
      return false;
    }
    // Windows 10+ kernel is 10.0+.
    return major < 10;
  }
  
  static isLegacyNwjsForVoiceWindow() {
    let nwVersion = '';
    try {
      nwVersion = String(process?.versions?.nw || '');
    } catch {}
    if (!nwVersion) {
      return false;
    }
    const parts = nwVersion.split('.').map((x) => Number(String(x || '').replace(/[^\d]/g, '')));
    let major = Number(parts[0] || 0);
    let minor = Number(parts[1] || 0);
    // Some builds report NW.js as "0.100.1".
    // Normalize to major=100, minor=1 for threshold checks.
    if (major === 0 && Number.isFinite(parts[1]) && parts[1] > 0) {
      major = Number(parts[1] || 0);
      minor = Number(parts[2] || 0);
    }
    if (!Number.isFinite(major) || !Number.isFinite(minor)) {
      return false;
    }
    return major < 100 || (major === 100 && minor < 1);
  }

  static restoreVoicePanelToMainWindow() {
    if (!Voice.infoPanel) return;
    if (Voice.infoPanel.parentElement) {
      Voice.infoPanel.parentElement.removeChild(Voice.infoPanel);
    }
    Voice.infoPanel.classList.remove('voice-window-mode');
    Voice.infoPanel.classList.remove('left-offset-with-shift');
    Voice.infoPanel.classList.remove('left-offset-no-shift');
    Voice.infoPanel.style.position = '';
    Voice.infoPanel.style.left = '';
    Voice.infoPanel.style.top = '';
    Voice.infoPanel.style.right = '';
    Voice.infoPanel.style.bottom = '';
    Voice.infoPanel.style.width = '';
    Voice.infoPanel.style.height = '';
    Voice.infoPanel.style.maxWidth = '';
    Voice.infoPanel.style.maxHeight = '';
    Voice.infoPanel.style.transform = '';
    Voice.infoPanel.style.zIndex = '';
    Voice.infoPanel.style.boxSizing = '';
    Voice.infoPanel.style.padding = '';
    Voice.infoPanel.style.margin = '';
    Voice.infoPanel.style.gap = '';
    Voice.infoPanel.style.removeProperty('--voice-monitor-scale');
    Voice.infoPanel.style.removeProperty('--voice-monitor-width');
    Voice.infoPanel.style.removeProperty('--voice-monitor-height');
    document.body.append(Voice.infoPanel);
    requestAnimationFrame(() => Voice.updatePanelPosition());
  }

  static openVoiceWindow() {
    if (Settings.settings?.novoice) {
      return;
    }
    if (Settings.settings?.voiceInWindow === false) {
      return;
    }
    if (NativeAPI.isLegacyWindowsForVoiceWindow()) {
      return;
    }
    if (NativeAPI.isLegacyNwjsForVoiceWindow()) {
      return;
    }
    if (!NativeAPI.status || !NativeAPI.app || NativeAPI.voiceWindow) {
      return;
    }

    if (!Voice.infoPanel) {
      Voice.init();
    }

    const panel = Voice.infoPanel;
    if (!panel) {
      return;
    }

    const monitorWidth = Number(window.screen?.availWidth || window.screen?.width || 1920);
    const monitorHeight = Number(window.screen?.availHeight || window.screen?.height || 1080);
    const monitorScale = Math.max(0.85, Math.min(1.6, Math.min(monitorWidth / 1920, monitorHeight / 1080)));
    const baseWidth = Math.min(
      Math.round(monitorWidth * 0.5),
      Math.max(520, Math.round(560 * monitorScale)),
    );
    const width = Math.max(360, Math.round(baseWidth * 0.7));
    const height = Math.min(
      Math.round(monitorHeight * 0.85),
      Math.max(560, Math.round(760 * monitorScale)),
    );
    const popupCssHref = new URL('content/main.css', window.location.href).href;

    nw.Window.open(
      'about:blank',
      {
        frame: false,
        show: true,
        focus: false,
        show_in_taskbar: true,
        always_on_top: false,
        transparent: true,
        resizable: false,
        width,
        height,
        position: 'center',
      },
      (win) => {
        NativeAPI.voiceWindow = win;

        const mountPanel = () => {
          const doc = win.window.document;
          doc.title = 'Voice';
          doc.documentElement.style.margin = '0';
          doc.documentElement.style.background = 'transparent';
          doc.documentElement.style.overflow = 'hidden';
          doc.body.style.margin = '0';
          doc.body.style.background = 'transparent';
          doc.body.style.overflow = 'hidden';

          const css = doc.createElement('link');
          css.rel = 'stylesheet';
          css.href = popupCssHref;
          doc.head.append(css);

          if (panel.parentElement) {
            panel.parentElement.removeChild(panel);
          }
          panel.classList.remove('left-offset-with-shift');
          panel.classList.remove('left-offset-no-shift');
          panel.classList.add('voice-window-mode');
          panel.style.setProperty('--voice-monitor-scale', String(monitorScale));
          panel.style.setProperty('--voice-monitor-width', `${monitorWidth}px`);
          panel.style.setProperty('--voice-monitor-height', `${monitorHeight}px`);
          doc.body.append(panel);

          Voice.showInfoPanel(true);
          Voice.updateInfoPanel();

          // Allow moving frameless popup by dragging any non-interactive area.
          const interactiveSelector = [
            'button',
            'a',
            'input',
            'textarea',
            'select',
            '[role="button"]',
            '.voice-info-panel-body-item-name',
            '.voice-info-panel-close',
          ].join(',');

          let dragState = null;

          const onMouseMove = (event) => {
            if (!dragState) return;
            const nextX = dragState.winX + (event.screenX - dragState.mouseX);
            const nextY = dragState.winY + (event.screenY - dragState.mouseY);
            try {
              win.moveTo(Math.round(nextX), Math.round(nextY));
            } catch {}
          };

          const stopDrag = () => {
            if (!dragState) return;
            dragState = null;
            doc.removeEventListener('mousemove', onMouseMove, true);
            doc.removeEventListener('mouseup', stopDrag, true);
            doc.removeEventListener('mouseleave', stopDrag, true);
          };

          doc.addEventListener(
            'mousedown',
            (event) => {
              if (event.button !== 0) return;
              const target = event.target;
              if (target?.closest?.(interactiveSelector)) {
                return;
              }
              dragState = {
                mouseX: event.screenX,
                mouseY: event.screenY,
                winX: Number(win.x || 0),
                winY: Number(win.y || 0),
              };
              doc.addEventListener('mousemove', onMouseMove, true);
              doc.addEventListener('mouseup', stopDrag, true);
              doc.addEventListener('mouseleave', stopDrag, true);
            },
            true,
          );
        };

        if (win.window.document.readyState === 'complete') {
          mountPanel();
        } else {
          win.on('loaded', mountPanel);
        }

        win.on('close', () => {
          NativeAPI.restoreVoicePanelToMainWindow();
          const current = NativeAPI.voiceWindow;
          NativeAPI.voiceWindow = null;
          try {
            current?.close(true);
          } catch {}
        });
      },
    );
  }

  static closeVoiceWindow() {
    const win = NativeAPI.voiceWindow;
    if (!win) {
      return;
    }
    NativeAPI.restoreVoicePanelToMainWindow();
    NativeAPI.voiceWindow = null;
    try {
      win.close(true);
    } catch {}
  }

  static async exec(exeFile, workingDir, args, callback, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      if (!NativeAPI.status) {
        reject();
      }

      let workingDirPath = NativeAPI.path.join(cwd, workingDir);
      let executablePath = NativeAPI.path.join(cwd, exeFile);
      NativeAPI.childProcess.execFile(executablePath, args, { cwd: workingDirPath }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }

        resolve(stdout);

        if (callback) {
          callback();
        }
      });
    });
  }

  static reset() {
    if (!NativeAPI.status) {
      return;
    }

    nw.Window.get().reloadIgnoringCache();
  }

  // Перезагрузка после обновления content: апдейтер мог закрыться раньше,
  // чем файлы реально стали доступны (антивирус/индексатор держат их на
  // Windows) — тогда reload показывает страницу ошибки Chromium. Ждём паузу
  // и проверяем, что ключевые файлы читаются, только потом перезагружаем.
  static CONTENT_RELOAD_FILES = ['content/app.js', 'content/modules/_modules.js', 'content/modules/app.js'];

  // Перезагрузка сразу после успешного обновления: апдейтер только что
  // отработал, а повторный запуск на старте (_modules.js → update) в эту же
  // секунду ловил сетевой сбой/заблокированные NW файлы content — NanoUpdater
  // на любой ошибке удаляет .git и клонирует content целиком заново.
  // Поэтому перед reload запоминаем ревизию, и на старте, если она не
  // изменилась, апдейтер не запускаем (следующую проверку сделает content-watch).
  static RELOAD_AFTER_UPDATE_KEY = 'pwUpdateReloadRev';
  static RELOAD_AFTER_UPDATE_TTL_MS = 10 * 60 * 1000;

  static async markReloadAfterUpdate() {
    try {
      const rev = await NativeAPI.readContentRevision();
      if (!rev) return;
      sessionStorage.setItem(NativeAPI.RELOAD_AFTER_UPDATE_KEY, JSON.stringify({ rev, at: Date.now() }));
    } catch {}
  }

  static async takeReloadAfterUpdate() {
    let mark = null;
    try {
      mark = JSON.parse(sessionStorage.getItem(NativeAPI.RELOAD_AFTER_UPDATE_KEY) || 'null');
      sessionStorage.removeItem(NativeAPI.RELOAD_AFTER_UPDATE_KEY);
    } catch {}
    if (!mark || !mark.rev || !(Date.now() - mark.at < NativeAPI.RELOAD_AFTER_UPDATE_TTL_MS)) return false;
    const rev = await NativeAPI.readContentRevision();
    return rev !== null && rev === mark.rev;
  }

  static async resetWhenContentReady() {
    if (!NativeAPI.status) return;
    const fs = NativeAPI.fileSystem;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await NativeAPI.markReloadAfterUpdate();
    await sleep(1500);
    for (let attempt = 1; attempt <= 20; attempt++) {
      let missing = '';
      for (const file of NativeAPI.CONTENT_RELOAD_FILES) {
        try {
          const handle = await fs.promises.open(file, 'r');
          const stat = await handle.stat();
          await handle.close();
          if (!stat.size) missing = file;
        } catch {
          missing = file;
        }
        if (missing) break;
      }
      if (!missing) {
        NativeAPI.logUpdate('reload', `attempt=${attempt}`);
        NativeAPI.reset();
        return;
      }
      NativeAPI.logUpdate('reload-wait', `attempt=${attempt} file=${missing}`);
      await sleep(1000);
    }
    NativeAPI.logUpdate('reload', 'files-not-ready, reload anyway');
    NativeAPI.reset();
  }

  // Append-запись в лог-файл с лимитом размера (лимит → остаётся хвост).
  // Файлы: update.log (stages) и update-errors.log (исключения целиком).
  static async cappedAppend(file, line) {
    const fs = NativeAPI.fileSystem;
    let size = 0;
    try {
      size = (await fs.promises.stat(file)).size;
    } catch {}
    if (size >= NativeAPI.LOG_MAX_BYTES) {
      try {
        const tail = Buffer.alloc(NativeAPI.LOG_KEEP_BYTES);
        const fd = await fs.open(file, 'r');
        try {
          await fd.read(tail, 0, NativeAPI.LOG_KEEP_BYTES, size - NativeAPI.LOG_KEEP_BYTES);
        } finally {
          await fd.close();
        }
        await fs.promises.writeFile(file, tail);
      } catch {
        try {
          await fs.promises.writeFile(file, '');
        } catch {}
      }
    }
    await fs.promises.appendFile(file, line);
  }

  // Лог обновления (stage), с timestamp, лимит 10 МБ
  static logUpdate(stage, extra = '') {
    const line = `[${new Date().toISOString()}] ${stage}${extra ? ` ${extra}` : ''}\n`;
    NativeAPI.cappedAppend('update.log', line).catch(() => {});
  }

  // Любое исключение в цепочке обновления: App.error + stack целиком в файл, с timestamp
  static logUpdateError(error, stage = '') {
    const msg =
      error instanceof Error
        ? error.stack || `${error.name}: ${error.message}`
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    const stamp = new Date().toISOString();
    NativeAPI.cappedAppend('update-errors.log', `[${stamp}] ${stage ? `${stage}: ` : ''}${msg}\n`).catch(() => {});
    NativeAPI.logUpdate(`ERROR ${stage}`.trim(), String(msg).split('\n')[0]);
    try {
      App.error(String(msg).split('\n')[0]);
    } catch {}
  }

  // Ревизия content БЕЗ git (в NW.js git-модуля нет и не будет — только чтение файлов):
  // content/.git/HEAD → «ref: <path>» → .git/<path>, fallback — packed-refs;
  // если HEAD сам по себе hash — он и есть ревизия. Не удалось прочитать — null.
  static async readContentRevision() {
    const fs = NativeAPI.fileSystem;
    const join = NativeAPI.path.join;
    let head = '';
    try {
      head = (await fs.promises.readFile(join('content', '.git', 'HEAD'), 'utf-8')).trim();
    } catch {
      return null;
    }
    if (/^[0-9a-fA-F]{40}$/.test(head)) {
      return head.toLowerCase();
    }
    const m = head.match(/^ref:\s*(.+)$/);
    if (!m) return null;
    const ref = m[1].trim();
    try {
      return (await fs.promises.readFile(join('content', '.git', ref), 'utf-8')).trim().toLowerCase();
    } catch {}
    try {
      const packed = await fs.promises.readFile(join('content', '.git', 'packed-refs'), 'utf-8');
      for (const line of packed.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#') || t.startsWith('^')) continue;
        const parts = t.split(/\s+/);
        if (parts.length >= 2 && parts[1] === ref && /^[0-9a-fA-F]{40}$/.test(parts[0])) {
          return parts[0].toLowerCase();
        }
      }
    } catch {}
    return null;
  }

  static shellEscape(s) {
    return `'${String(s).replace(/'/g, "'\\''")}'`;
  }

  // Настоящий перезапуск процесса (вместо window.reload): detached-relauncher
  // ждёт, пока старый процесс полностью закончится (сброс profile-lock),
  // и запускает новый инстанс. Новый инстанс прогоняет update-проход;
  // content актуален → рестарта нет (лупы нет).
  static restart() {
    if (NativeAPI.restartInProgress) return;
    NativeAPI.restartInProgress = true;

    try {
      const execPath = process.execPath;
      const appDir = process.cwd();
      let cmd;
      let args;
      if (NativeAPI.platform === 'win32') {
        // ping не требует консоли (timeout в GUI-процессе может не работать)
        cmd = process.env.comspec || 'cmd.exe';
        args = ['/c', `ping -n 6 127.0.0.1 >nul && start "" "${execPath}"`];
      } else {
        cmd = 'sh';
        args = ['-c', `sleep 5 && exec ${NativeAPI.shellEscape(execPath)} ${NativeAPI.shellEscape(appDir)}`];
      }
      const relauncher = NativeAPI.childProcess.spawn(cmd, args, {
        cwd: appDir,
        detached: true,
        stdio: 'ignore',
      });
      relauncher.on('error', (e) => NativeAPI.logUpdateError(e, 'relauncher'));
      relauncher.unref();
      NativeAPI.logUpdate('restart-spawned', `pid=${relauncher.pid}`);
    } catch (e) {
      NativeAPI.logUpdateError(e, 'restart');
    }

    NativeAPI.exit();
  }

  static progress(value = 0.0) {
    if (!NativeAPI.status) {
      return;
    }

    NativeAPI.window.setProgressBar(value);
  }

  static attention() {
    if (!NativeAPI.status) {
      return;
    }

    NativeAPI.window.focus();

    NativeAPI.window.requestAttention(true);
  }

  static exit() {
    if (!NativeAPI.status) {
      return false;
    }
    if (NativeAPI.exitRequested) {
      return true;
    }
    NativeAPI.exitRequested = true;

    try {
      Voice.destroy(true);
    } catch {}

    try {
      NativeAPI.closeVoiceWindow();
    } catch {}

    setTimeout(() => {
      try {
        NativeAPI.app.quit();
      } catch {}
    }, 150);

    return true;
  }

  static testHashes() {
    if (NativeAPI.platform == 'linux') {
      PWGame.isValidated = true;
      return; // No hash check for linux
    }
    (async () => {
      try {
        try {
          await NativeAPI.fileSystem.promises.access(PWGame.PATH_TEST_HASHES);
        } catch {
          // Бинарника hash-теста нет — проверку пропускаем (это не ошибка обновления)
          PWGame.isValidated = true;
          NativeAPI.logUpdate('hash-test-missing', PWGame.PATH_TEST_HASHES);
          return;
        }

        const spawn = NativeAPI.childProcess.spawn(PWGame.PATH_TEST_HASHES);

        spawn.on('error', (e) => {
          NativeAPI.logUpdateError(e, 'hash-test-spawn');
          PWGame.isTestHashesFailed = true;
          App.error(Lang.text('fileCheckFailed') + ' ' + (e.message || e));
        });

        spawn.on('close', (code) => {
          if (code == 0) {
            PWGame.isValidated = true;
            App.notify(Lang.text('updateCheckComplete'));
          } else {
            PWGame.isTestHashesFailed = true;
            App.error(Lang.text('fileCheckFailed') + code);
          }
        });
      } catch (e) {
        NativeAPI.logUpdateError(e, 'hash-test');
        PWGame.isValidated = true;
      }
    })();
  }

  // Одна СТРОКА вывода Linux-апдейтера (update.sh). Парсим только полные строки:
  // чанк stdout может резать строку посередине.
  static parseUpdateLineLinux(line, callback) {
    const o = line;
    if (o == 'Updating game files') {
      this.title = Lang.text('gameUpdate');
      this.curLabel = 'game';
      return;
    }
    if (o == 'Updating launcher') {
      this.title = Lang.text('launcherUpdate');
      this.curLabel = 'content';
      return;
    }

    if (o.startsWith('* main')) {
      if (this.lastBranchV == null) {
        this.lastBranchV = o;
      } else {
        this.updated = this.lastBranchV != o;
      }
      return;
    }

    if (o.startsWith('Receiving objects:')) {
      const percent = parseInt(o.substring(19, o.indexOf('%')), 10);
      if (Number.isFinite(percent)) {
        callback({ update: true, title: this.title, total: percent });
        NativeAPI.progress(percent / 100);
      }
    }
  }

  // Одна СТРОКА протокола Windows-апдейтера (NanoUpdater):
  // #{"type":"label"|"bar","data":"..."}. Битая/неполная строка — пропускается.
  static parseUpdateLineWindows(line, callback) {
    let s = line.trim();
    if (s.startsWith('#')) s = s.slice(1);
    if (!s) return;

    let json;
    try {
      json = JSON.parse(s);
    } catch {
      return;
    }
    if (!json || !json.type) return;

    if (json.type == 'bar') {
      if (this.curLabel == 'content') {
        this.updated = true;
      }

      const total = Number(json.data);
      callback({ update: true, title: this.title, total: Number.isFinite(total) ? total : 0 });

      if (Number.isFinite(total)) {
        NativeAPI.progress(total / 100);
      }
    } else if (json.type == 'label') {
      switch (json.data) {
        case 'game':
          this.title = Lang.text('gameUpdate');
          this.curLabel = json.data;
          break;

        case 'content':
          this.title = Lang.text('launcherUpdate');
          this.curLabel = json.data;
          break;

        case 'game_data0':
          this.title = Lang.text('downloadingArchives1');
          this.curLabel = json.data;
          break;
        case 'game_data1':
          this.title = Lang.text('downloadingArchives2');
          this.curLabel = json.data;
          break;
        case 'game_data2':
          this.title = Lang.text('downloadingArchives3');
          this.curLabel = json.data;
          break;
        case 'game_data3':
          this.title = Lang.text('downloadingArchives4');
          this.curLabel = json.data;
          break;
        case 'game_data4':
          this.title = Lang.text('downloadingArchives5');
          this.curLabel = json.data;
          break;
        case 'game_data5':
          this.title = Lang.text('downloadingArchives6');
          this.curLabel = json.data;
          break;
        case 'game_data6':
          this.title = Lang.text('downloadingArchives7');
          this.curLabel = json.data;
          break;
        case 'game_data7':
          this.title = Lang.text('downloadingArchives8');
          this.curLabel = json.data;
          break;

        default:
          this.title = Lang.text('downloadingGameArchives');
          this.curLabel = json.data;
          break;
      }
    }
  }

  // background=true — фоновое обновление из content-watch: после загрузки не
  // перезагружаем окно сами, а показываем кнопку «Перезапустить» (App).
  // При старте (background=false) перезагрузка автоматическая, без подтверждения.
  static async update(callback, { background = false } = {}) {
    if (!NativeAPI.status) {
      return false;
    }
    if (NativeAPI.updateInProgress) {
      return true;
    }
    NativeAPI.updateBackground = Boolean(background);
    if (callback) NativeAPI.updateCallback = callback;
    callback = NativeAPI.updateCallback || (() => {});

    try {
      const isLinux = NativeAPI.platform == 'linux';
      const updaterPath = isLinux ? PWGame.PATH_UPDATE_LINUX : PWGame.PATH_UPDATE;

      // Апдейтера нет (Steam-сборка, dev): обновления нет, рестарта быть
      // не должно, ошибки не показываем — лончер просто стартует.
      let hasUpdater = false;
      try {
        await NativeAPI.fileSystem.promises.access(updaterPath);
        hasUpdater = true;
      } catch {}
      if (!hasUpdater) {
        PWGame.isUpToDate = true;
        PWGame.isValidated = true;
        NativeAPI.logUpdate('updater-missing', updaterPath);
        return true;
      }

      // Окно только что перезагружено после обновления — content уже свежий,
      // повторный прогон апдейтера не нужен (и опасен, см. markReloadAfterUpdate).
      if (!background && (await NativeAPI.takeReloadAfterUpdate())) {
        PWGame.isUpToDate = true;
        PWGame.isValidated = true;
        NativeAPI.logUpdate('skip-after-reload', `rev=${await NativeAPI.readContentRevision()}`);
        NativeAPI.startContentWatch();
        return true;
      }

      NativeAPI.updated = false;
      NativeAPI.curLabel = null;
      NativeAPI.title = null;
      NativeAPI.lastBranchV = null;
      NativeAPI.revBefore = await NativeAPI.readContentRevision();
      NativeAPI.logUpdate('start', `updater=${updaterPath} rev=${NativeAPI.revBefore || 'n/a'}`);

      NativeAPI.updateInProgress = true;
      const child = NativeAPI.childProcess.spawn(updaterPath);

      let buffer = '';
      child.stdout.on('data', (data) => {
        try {
          buffer += data.toString();
          let idx;
          // Разбираем только полные строки — чанк может резать строку посередине
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (isLinux) {
              NativeAPI.parseUpdateLineLinux(line, callback);
            } else {
              NativeAPI.parseUpdateLineWindows(line, callback);
            }
          }
        } catch (e) {
          NativeAPI.logUpdateError(e, 'stdout');
        }
      });

      child.on('error', (e) => {
        NativeAPI.updateInProgress = false;
        NativeAPI.logUpdateError(e, 'updater-spawn');
        PWGame.isUpdateFailed = true;
        App.error(Lang.text('updateError') + ' ' + (e.message || e));
      });

      child.on('close', async (code) => {
        NativeAPI.updateInProgress = false;
        try {
          callback({ update: false, title: '', total: 0 });

          NativeAPI.progress(-1);

          const ok = code == 0 || code == null;

          if (ok) {
            PWGame.isUpToDate = true;
            NativeAPI.testHashes();
          } else {
            PWGame.isUpdateFailed = true;
            App.error(Lang.text('updateError') + code);
          }
          NativeAPI.logUpdate('updater-close', `code=${code} bar=${NativeAPI.updated}`);

          // Рестарт (reset: window.reloadIgnoringCache)
          // только если ревизия content реально изменилась (без git — чтение
          // .git/HEAD до и после; .git не читается — bar-флаг: NanoUpdater
          // шлёт bar по content, только если fetch что-то скачал).
          // При ошибке апдейтера (code != 0) — без рестарта: повторим на следующем старте.
          const revAfter = await NativeAPI.readContentRevision();
          NativeAPI.logUpdate('revision', `before=${NativeAPI.revBefore || 'n/a'} after=${revAfter || 'n/a'}`);

          let changed;
          if (NativeAPI.revBefore !== null && revAfter !== null) {
            changed = NativeAPI.revBefore !== revAfter;
          } else if (NativeAPI.revBefore === null && revAfter !== null) {
            changed = true; // .git появился (свежая инициализация) — content точно обновлён
          } else if (NativeAPI.revBefore !== null && revAfter === null) {
            changed = false; // .git пропал — content скорее всего битый, не рестартим
          } else {
            changed = NativeAPI.updated; // .git не читается — bar-флаг
          }

          if (ok && changed && NativeAPI.updateBackground) {
            NativeAPI.restartPending = true;
            NativeAPI.logUpdate('restart-pending', `rev=${revAfter || 'n/a'}`);
            try {
              App.showLauncherRestartButton(true);
            } catch (e) {
              NativeAPI.logUpdateError(e, 'restart-button');
            }
            NativeAPI.startContentWatch();
          } else if (ok && changed) {
            await NativeAPI.resetWhenContentReady();
          } else if (ok) {
            NativeAPI.startContentWatch();
          }
        } catch (e) {
          NativeAPI.logUpdateError(e, 'close');
        }
      });

      // А уведомление показываем с задержкой (в фоне — молча)
      if (!NativeAPI.updateBackground) {
        setTimeout(() => {
          App.notify(Lang.text('checkingUpdatesAndFiles'));
        }, 1000);
      }
    } catch (e) {
      NativeAPI.logUpdateError(e, 'update');
    }

    return true;
  }

  // ---- Фоновая проверка обновлений content ----
  // Пока лаунчер открыт, раз в CONTENT_WATCH_INTERVAL_MS сверяем ревизию
  // content/.git с веткой на удалённом репозитории (smart-HTTP info/refs, git
  // не нужен). Если вышла новая — ждём, пока игрок не в поиске/лобби/бою, и
  // запускаем тот же апдейтер, что и при старте (NativeAPI.update): он скачает
  // content, а при смене ревизии появится кнопка «Перезапустить» под быстрыми
  // кнопками справа (перезагрузка окна — только по клику игрока).
  // Процесс НЕ перезапускаем: detached-relauncher + exit (restart()) на Windows
  // просто закрывал лаунчер — дочерний процесс погибает вместе с NW.
  // Защита от петли: ради одной и той же ревизии апдейтер запускаем один раз.
  static startContentWatch() {
    if (!NativeAPI.status || NativeAPI.contentWatchTimer) return;
    const tick = async () => {
      try {
        await NativeAPI.checkContentUpdate();
      } catch (e) {
        NativeAPI.logUpdateError(e, 'content-watch');
      }
      NativeAPI.contentWatchTimer = setTimeout(tick, NativeAPI.CONTENT_WATCH_INTERVAL_MS);
    };
    NativeAPI.contentWatchTimer = setTimeout(tick, NativeAPI.CONTENT_WATCH_FIRST_MS);
  }

  static async readContentRemote() {
    const fs = NativeAPI.fileSystem;
    const join = NativeAPI.path.join;
    let head = '';
    let config = '';
    try {
      head = (await fs.promises.readFile(join('content', '.git', 'HEAD'), 'utf-8')).trim();
      config = await fs.promises.readFile(join('content', '.git', 'config'), 'utf-8');
    } catch {
      return null;
    }
    const refMatch = head.match(/^ref:\s*(refs\/heads\/.+)$/);
    if (!refMatch) return null;
    const ref = refMatch[1].trim();
    const branch = ref.slice('refs/heads/'.length);

    // remote ветки (branch.<name>.remote), по умолчанию origin
    let remoteName = 'origin';
    let section = '';
    const urls = {};
    for (const raw of config.split(/\r?\n/)) {
      const line = raw.trim();
      const sec = line.match(/^\[(.+)\]$/);
      if (sec) {
        section = sec[1];
        continue;
      }
      const kv = line.match(/^([A-Za-z]+)\s*=\s*(.+)$/);
      if (!kv) continue;
      const key = kv[1].toLowerCase();
      const value = kv[2].trim().replace(/^"(.*)"$/, '$1');
      const remoteSec = section.match(/^remote\s+"(.+)"$/);
      if (remoteSec && key === 'url' && !urls[remoteSec[1]]) urls[remoteSec[1]] = value;
      if (section === `branch "${branch}"` && key === 'remote') remoteName = value;
    }
    const url = urls[remoteName];
    if (!url || !/^https?:\/\//i.test(url)) return null;
    return { url, ref };
  }

  static fetchText(url, redirects = 3) {
    return new Promise((resolve, reject) => {
      const lib = url.startsWith('https:') ? NativeAPI.https : NativeAPI.http;
      const req = lib.get(url, { headers: { 'User-Agent': 'git/2.40.0 pw-launcher' }, timeout: 15000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume();
          resolve(NativeAPI.fetchText(new URL(res.headers.location, url).toString(), redirects - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve(body));
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
    });
  }

  static async readRemoteRevision(url, ref) {
    const base = url.replace(/\/+$/, '');
    const body = await NativeAPI.fetchText(`${base}/info/refs?service=git-upload-pack`);
    // pkt-line: "<4 hex len><sha> <ref>[\0caps]\n"
    const re = /([0-9a-f]{40}) ([^\0\n]+)/g;
    let m;
    while ((m = re.exec(body))) {
      if (m[2] === ref) return m[1];
    }
    return null;
  }

  static isSafeToRestart() {
    return !MM.active && !MM.isInTambur && !MM.isInBattle && !NativeAPI.exitRequested;
  }

  static async checkContentUpdate() {
    if (NativeAPI.restartInProgress || NativeAPI.updateInProgress) return;
    // Без апдейтера (Steam/dev) рестарт ничего не обновит — не проверяем
    const updaterPath = NativeAPI.platform == 'linux' ? PWGame.PATH_UPDATE_LINUX : PWGame.PATH_UPDATE;
    try {
      await NativeAPI.fileSystem.promises.access(updaterPath);
    } catch {
      return;
    }

    const localRev = await NativeAPI.readContentRevision();
    const remote = await NativeAPI.readContentRemote();
    if (!localRev || !remote) return;

    let remoteRev = NativeAPI.contentWatchPendingRev;
    if (!remoteRev) {
      remoteRev = await NativeAPI.readRemoteRevision(remote.url, remote.ref);
      if (!remoteRev || remoteRev === localRev) return;

      let guard = null;
      try {
        guard = localStorage.getItem(NativeAPI.CONTENT_WATCH_GUARD_KEY);
      } catch {}
      if (guard === remoteRev) return; // уже обновлялись ради неё — не помогло
      NativeAPI.contentWatchPendingRev = remoteRev;
      NativeAPI.logUpdate('content-watch-found', `local=${localRev} remote=${remoteRev}`);
    }

    // Игрок в поиске/лобби/бою — дождёмся следующей проверки
    if (!NativeAPI.isSafeToRestart()) return;

    try {
      localStorage.setItem(NativeAPI.CONTENT_WATCH_GUARD_KEY, remoteRev);
    } catch {}
    NativeAPI.contentWatchPendingRev = null;
    NativeAPI.logUpdate('content-watch-update', `remote=${remoteRev}`);
    // Качаем в фоне; окно не перезагружаем — по готовности появится кнопка «Перезапустить».
    await NativeAPI.update(null, { background: true });
  }

  static analysis() {
    if (!NativeAPI.status) {
      return false;
    }

    let username = '',
      cpus = NativeAPI.os.cpus();

    try {
      let userInfo = NativeAPI.os.userInfo();

      username = userInfo.username;
    } catch (error) {}

    return {
      hostname: NativeAPI.os.hostname(),
      core: { model: cpus.length ? cpus[0].model : '', total: cpus.length },
      memory: Math.round(NativeAPI.os.totalmem() / 1024 / 1024),
      version: NativeAPI.os.version(),
      release: NativeAPI.os.release(),
      username: username,
    };
  }

  static getMACAdress() {
    let result = new Array();

    if (!NativeAPI.status) {
      return result;
    }

    try {
      let networkInterfaces = NativeAPI.os.networkInterfaces();

      for (let key in networkInterfaces) {
        if (['Radmin VPN'].includes(`${key}`)) {
          continue;
        }

        for (let networkInterface of networkInterfaces[key]) {
          if (networkInterface.internal) {
            continue;
          }

          if (!('mac' in networkInterface) || !networkInterface.mac || networkInterface.mac == '00:00:00:00:00:00') {
            continue;
          }

          if (!result.includes(`${networkInterface.mac}`)) {
            result.push(`${networkInterface.mac}`);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }

    return result;
  }

  static getLocale() {
    let result = '';

    if (!NativeAPI.status) {
      return result;
    }

    try {
      result = Intl.DateTimeFormat().resolvedOptions().locale;
    } catch (error) {}

    return result;
  }

  static async ping(hostname, port = 80, timeout = 3000) {
    return new Promise((resolve) => {
      const start = performance.now();

      const socket = NativeAPI.net.createConnection(port, hostname);

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const end = performance.now();

        socket.end();

        resolve(end - start);
      });

      function handleError() {
        socket.destroy();

        resolve(-1);
      }

      socket.on('timeout', handleError);

      socket.on('error', handleError);
    });
  }

  static async write(file, body, append = false) {
    body = body === undefined ? '' : String(body);
    if (append) {
      await NativeAPI.fileSystem.promises.appendFile(file, body);
    } else {
      await NativeAPI.fileSystem.promises.writeFile(file, body);
    }
  }

  static linkHandler(evt) {
    if (NativeAPI.status) {
      evt.preventDefault();
      let url = evt.target.href;
      if (evt.currentTarget.href) {
        url = evt.currentTarget.href;
      }
      App.OpenExternalLink(url);
    }
  }

  static async bridge(data) {
    NativeAPI.testbridgelog.push(`${data} | ${new Date().toLocaleString()}`);

    await NativeAPI.fileSystem.promises.writeFile(PWGame.PATH_LUA_BRIDGE, data);

    await NativeAPI.fileSystem.promises.writeFile('../Game/Bin/bridgelog', NativeAPI.testbridgelog.join('\n'));
  }

  static getDocumentsDir() {
    if (!NativeAPI.status) return;

    switch (NativeAPI.platform) {
      case 'win32': {
        const regPaths = [
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders',
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders',
        ];
        for (const regPath of regPaths) {
          try {
            const out = NativeAPI.childProcess.execFileSync('reg', ['query', regPath, '/v', 'Personal'], {
              encoding: 'utf8',
            });
            const line = out
              .split(/\r?\n/)
              .map((x) => x.trim())
              .find((x) => /^Personal\s+REG_\w+\s+.+$/i.test(x));
            if (!line) continue;
            const m = line.match(/^Personal\s+REG_\w+\s+(.+)$/i);
            if (!m || !m[1]) continue;
            const expanded = m[1].trim().replace(/%([^%]+)%/g, (full, name) => {
              const v = process.env[name] || process.env[String(name).toUpperCase()];
              return v || full;
            });
            if (expanded && !/%[^%]+%/.test(expanded)) {
              return expanded;
            }
          } catch {}
        }

        const home = NativeAPI.os.homedir();
        if (home) {
          return NativeAPI.path.join(home, 'Documents');
        }
        const profile = process.env.USERPROFILE;
        if (profile) {
          return NativeAPI.path.join(profile, 'Documents');
        }
        const sysRoot = process.env.SystemRoot || 'C:\\Windows';
        const ps = NativeAPI.path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
        try {
          return NativeAPI.childProcess
            .execFileSync(ps, ['-NoProfile', '-NoLogo', '-Command', '[Environment]::GetFolderPath([Environment+SpecialFolder]::MyDocuments)'], {
              encoding: 'utf8',
            })
            .trim();
        } catch {
          return undefined;
        }
      }

      case 'linux':
        try {
          return NativeAPI.childProcess.execSync('xdg-user-dir DOCUMENTS', { encoding: 'utf-8' }).trim();
        } catch {}

      default:
        return NativeAPI.path.join(NativeAPI.os.homedir(), 'Documents');
    }
  }
}
