import { App } from './app.js';
import { Voice } from './voice.js';
import { PWGame } from './pwgame.js';
import { Settings } from './settings.js';
import { Lang } from './lang.js';

export class NativeAPI {
  static status = false;
  static exitRequested = false;
  static voiceWindow = null;

  static platform;

  static title;
  static updated = false;
  static curLabel;
  static lastBranchV = null;

  static testbridgelog = new Array();

  static modules = {
    fileSystem: 'fs',
    childProcess: 'child_process',
    os: 'os',
    path: 'path',
    crypto: 'crypto',
    net: 'net',
    http: 'http',
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

    NativeAPI.app.clearCache();

    NativeAPI.window.reload();
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
    NativeAPI.fileSystem.promises.access(PWGame.PATH_TEST_HASHES);

    let spawn = NativeAPI.childProcess.spawn(PWGame.PATH_TEST_HASHES);

    spawn.on('close', (code) => {
      if (code == 0) {
        PWGame.isValidated = true;
        App.notify(Lang.text('updateCheckComplete'));
      } else {
        PWGame.isTestHashesFailed = true;
        App.error(Lang.text('fileCheckFailed') + code);
      }
    });
  }

  static updateLinux(data, callback) {
    let outputs = data.toString().split('\n'); // I have used space, you can use any thing.
    for (let o of outputs) {
      if (o == 'Updating game files') {
        this.title = Lang.text('gameUpdate');
        this.curLabel = 'game';
        continue;
      }
      if (o == 'Updating launcher') {
        this.title = Lang.text('launcherUpdate');
        this.curLabel = 'content';
        continue;
      }

      if (o.startsWith('* main')) {
        if (this.lastBranchV == null) {
          this.lastBranchV = o;
        } else {
          this.updated = this.lastBranchV != o;
        }
      }

      if (o.startsWith('Receiving objects:')) {
        let percent = parseInt(o.substring(19, o.indexOf('%')));

        callback({ update: true, title: this.title, total: percent });

        NativeAPI.progress(percent / 100);
      }
    }
  }

  static updateWindows(data, callback) {
    let progressDataElements = data.toString().substring(1).split('#');

    for (let progressDataElement of progressDataElements) {
      let json = JSON.parse(progressDataElement);

      if (json.type) {
        if (json.type == 'bar') {
          if (this.curLabel == 'content') {
            this.updated = true;
          }

          callback({
            update: true,
            title: this.title,
            total: Number(json.data),
          });

          NativeAPI.progress(Number(json.data) / 100);
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
    }
  }

  static async update(callback) {
    if (!NativeAPI.status) {
      return false;
    }

    const isLinuxUpdate = NativeAPI.platform == 'linux';

    const updaterPath = isLinuxUpdate ? PWGame.PATH_UPDATE_LINUX : PWGame.PATH_UPDATE;

    await NativeAPI.fileSystem.promises.access(updaterPath);

    let spawn = NativeAPI.childProcess.spawn(updaterPath);

    spawn.stdout.on('data', (data) => {
      if (isLinuxUpdate) {
        this.updateLinux(data, callback);
      } else {
        this.updateWindows(data, callback);
      }
    });

    spawn.on('close', async (code) => {
      callback({ update: false, title: '', total: 0 });

      NativeAPI.progress(-1);

      if (code == 0 || code == null) {
        PWGame.isUpToDate = true;
        try {
          NativeAPI.testHashes();
        } catch (e) {
          App.error(Lang.text('fileCheckCorrupted') + e);
        }
      } else {
        PWGame.isUpdateFailed = true;
        App.error(Lang.text('updateError') + code);
      }

      if (this.updated) {
        NativeAPI.reset();
      }
    });

    // А уведомление показываем с задержкой
    setTimeout(() => {
      App.notify(Lang.text('checkingUpdatesAndFiles'));
    }, 1000);
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
