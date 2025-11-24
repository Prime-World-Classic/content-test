import { Window } from "./window.js";
import { Sound } from "./sound.js";
import { SOUNDS_LIBRARY } from "./soundsLibrary.js";

/**
 * @class CastleBuildingsEvents
 * @description Events for castle buildings.
 */
export class CastleBuildingsEvents {
  /**
   * Opens the inventory window.
   * @param {number} [volume=0] - The volume at which to play the click sound,
   * usually passed from `Castle.GetVolume()`.
   */
  static library(volume = 0) {
    Sound.play(SOUNDS_LIBRARY.CLICK, {
      id: "ui-click",
      volume: volume,
    });
    Window.show("main", "inventory");
  }
  
  /**
   * Opens the inventory window.
   * @param {number} [volume=0] - The volume at which to play the click sound,
   * usually passed from `Castle.GetVolume()`.
   */
  static talent_farm(volume = 0) {
    Sound.play(SOUNDS_LIBRARY.CLICK, {
      id: "ui-click",
      volume: volume,
    });
    Window.show("main", "farm");
  }

  static fair() {
    Window.show("main", "shop");
  }
}
