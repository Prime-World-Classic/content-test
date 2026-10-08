import { App } from './app.js';
import { Lang } from './lang.js';
import { Window } from './window.js';

export class CastleBuildingsEvents {
  static library() {
    Window.show('main', 'inventory');
  }
  static talent_farm() {
    Window.show('main', 'farm');
  }
  static fair() {
    Window.show('main', 'shop');
  }
  // «Мастерская свитков»: мини-игра Easel (модуль грузится по требованию)
  static async easel() {
    try {
      const [{ Easel }, { Castle }] = await Promise.all([import('./easel/easel.js'), import('./castle.js')]);
      await Easel.open(Castle.currentSceneName);
    } catch (e) {
      console.error(e);
      App.notify(Lang.text('easelComingSoon'));
    }
  }
}
