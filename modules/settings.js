import { Lang } from './lang.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { Castle } from './castle.js';
import { Sound } from './sound.js';

export class Settings {
  static defaultSettings = {
    fullscreen: true,
    render: true,
    globalVolume: 0.5,
    musicVolume: 0.5,
    soundsVolume: 0.2,
    radminPriority: false,
    language: 'ru',
    novoice: false,
  };

  static settings = JSON.parse(JSON.stringify(this.defaultSettings));
  static pwcLauncherSettingsDir;
  static settingsFilePath;

  static async ensureSettingsFile() {
    const homeDir = NativeAPI.os.homedir();
    this.pwcLauncherSettingsDir = NativeAPI.path.join(homeDir, 'Prime World Classic');
    this.settingsFilePath = NativeAPI.path.join(this.pwcLauncherSettingsDir, 'launcher.cfg');

    try {
      await NativeAPI.fileSystem.promises.mkdir(this.pwcLauncherSettingsDir, {
        recursive: true,
      });
      await NativeAPI.fileSystem.promises.access(this.settingsFilePath);
      return true;
    } catch (e) {
      App.error(Lang.text('settingsFileAccessError') + e);
      await this.writeDefaultSettings();
      return false;
    }
  }

  static async writeDefaultSettings() {
    this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
    await this.WriteSettings();
  }

  static async ReadSettings() {
    if (!NativeAPI.status) {
      App.error(Lang.text('settingsNativeApiNotInitialized'));
      this.settings = { ...this.defaultSettings };
      return;
    }

    try {
      if (await this.ensureSettingsFile()) {
        const data = await NativeAPI.fileSystem.promises.readFile(this.settingsFilePath, 'utf-8');
        this.settings = { ...this.defaultSettings, ...JSON.parse(data) };
      }
    } catch (e) {
      App.error(Lang.text('settingsReadError') + e);
      this.settings = { ...this.defaultSettings };
    }
  }

  static async WriteSettings() {
    if (!this.settingsFilePath || !NativeAPI.status) {
      App.error(Lang.text('settingsSaveError'));
      return;
    }

    try {
      await NativeAPI.fileSystem.promises.writeFile(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (e) {
      App.error(Lang.text('settingsSaveFailed') + e);
    }
  }

  // Инициализация глобальных горячих клавиш
  static initGlobalHotkeys() {
    console.log('Initializing global hotkeys...');

    document.addEventListener('keydown', (e) => {
      // F11 - переключение полноэкранного режима
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleFullscreen();
      }
    });

    console.log('Global hotkeys initialized - F11 for fullscreen toggle');
  }

  // Метод для переключения полноэкранного режима
  static toggleFullscreen() {
    if (!this.settings) {
      console.warn('Settings not initialized');
      return;
    }

    this.settings.fullscreen = !this.settings.fullscreen;
    console.log(`Toggling fullscreen: ${this.settings.fullscreen ? 'ON' : 'OFF'}`);

    // Применяем настройки
    this.ApplySettings({ render: false, audio: false });

    // Синхронизируем UI если открыты настройки
    this.syncFullscreenUI();

    // Показываем уведомление пользователю
    this.showFullscreenNotification();
  }

  // Синхронизация UI чекбокса
  static syncFullscreenUI() {
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    if (fullscreenToggle) {
      fullscreenToggle.checked = !this.settings.fullscreen;
      console.log('Updated fullscreen toggle UI');
    }
  }

  // Показать уведомление о переключении режима
  static showFullscreenNotification() {
    if (typeof App !== 'undefined' && App.notify) {
      const message = this.settings.fullscreen
        ? Lang.text('fullscreenEnabled') || 'Fullscreen enabled'
        : Lang.text('fullscreenDisabled') || 'Window mode enabled';
      App.notify(message);
    }
  }

  static async ApplySettings(options = {}) {
    // Установка значений по умолчанию для options
    options = {
      render: true, // Применять настройки рендеринга по умолчанию
      audio: true, // Применять настройки звука по умолчанию
      window: true, // Применять настройки окна по умолчанию
      ...options, // Переопределение дефолтных значений
    };

    try {
      // 1. Применение настроек рендеринга (если не отключено в options)
      if (options.render !== false && typeof Castle !== 'undefined') {
        Castle.toggleRender(Castle.RENDER_LAYER_PLAYER, this.settings.render);
      }

      // 2. Применение настроек окна (если не отключено в options)
      if (options.window !== false && NativeAPI.status && NativeAPI.window) {
        const currentMode = await NativeAPI.window.isFullscreen;
        if (this.settings.fullscreen && !currentMode) {
          await NativeAPI.window.enterFullscreen();
        } else if (!this.settings.fullscreen && currentMode) {
          await NativeAPI.window.leaveFullscreen();
          NativeAPI.window.resizeTo(1280, 720);
          NativeAPI.window.setPosition('center');
        }
      }

      // 3. Применение настроек звука (если не отключено в options)
      if (options.audio !== false && typeof Sound !== 'undefined') {
        // Обновляем громкость для всех звуков
        for (const soundId in Sound.all) {
          const type = soundId === 'castle' ? Castle.AUDIO_MUSIC : Castle.AUDIO_SOUNDS;
          Sound.setVolume(soundId, Castle.GetVolume(type));
        }

        // Специальная обработка тестового звука (если используется)
        if (Castle.testSoundIsPlaying && Sound.all.sound_test) {
          Sound.setVolume('sound_test', Castle.GetVolume(Castle.AUDIO_SOUNDS));
        }
      }
      // 4. Применение настроек языка (если не отключено в options)
      if (options.language !== false && typeof Lang !== 'undefined') {
        // Обновляем текущий язык
        if (this.settings.language && this.settings.language in Lang.list) {
          Lang.target = this.settings.language;
        }
      }
    } catch (e) {
      App.error(Lang.text('settingsApplyError') + e);
    }
  }

  static async init() {
    await this.ReadSettings();
    await this.ApplySettings();

    // Инициализируем глобальные горячие клавиши
    this.initGlobalHotkeys();

    window.addEventListener('beforeunload', () => {
      this.WriteSettings();
    });
  }
}
