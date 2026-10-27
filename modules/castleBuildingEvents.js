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
  static easel() {
    return App.openEasel();
  }
}
