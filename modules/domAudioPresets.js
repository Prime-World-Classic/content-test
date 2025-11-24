import { DomAudio } from "./domAudio.js";
import { Sound } from "./sound.js";
import { Castle } from "./castle.js";
import { SOUNDS_LIBRARY } from "./soundsLibrary.js";

/**
 * @namespace domAudioPresets
 * @description Presets for domAudio
 */

/**
 * @memberof domAudioPresets
 * @description Default preset for buttons
 * @property {DomAudio} defaultButton - Default preset for buttons
 */
export const domAudioPresets = {
  defaultButton: new DomAudio(
    /**
     * @memberof domAudioPresets.defaultButton
     * @description Mouse over event
     * @function over
     */
    function over() {},
    /**
     * @memberof domAudioPresets.defaultButton
     * @description Mouse down event
     * @function down
     */
    function down() {
      Sound.play(SOUNDS_LIBRARY.CLICK, {
        id: "ui-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    /**
     * @memberof domAudioPresets.defaultButton
     * @description Mouse up event
     * @function up
     */
    function up() {},
    /**
     * @memberof domAudioPresets.defaultButton
     * @description Input event
     * @function input
     */
    function input() {}
  ),
  /**
   * @memberof domAudioPresets
   * @description Preset for close button
   * @property {DomAudio} closeButton - Preset for close button
   */
  closeButton: new DomAudio(
    /**
     * @memberof domAudioPresets.closeButton
     * @description Mouse over event
     * @function over
     */
    function over() {},
    /**
     * @memberof domAudioPresets.closeButton
     * @description Mouse down event
     * @function down
     */
    function down() {
      Sound.play(SOUNDS_LIBRARY.CLICK_CLOSE, {
        id: "ui-close",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    /**
     * @memberof domAudioPresets.closeButton
     * @description Mouse up event
     * @function up
     */
    function up() {},
    /**
     * @memberof domAudioPresets.closeButton
     * @description Input event
     * @function input
     */
    function input() {}
  ),
  /**
   * @memberof domAudioPresets
   * @description Preset for big button
   * @property {DomAudio} bigButton - Preset for big button
   */
  bigButton: new DomAudio(
    /**
     * @memberof domAudioPresets.bigButton
     * @description Mouse over event
     * @function over
     */
    function over() {},
    /**
     * @memberof domAudioPresets.bigButton
     * @description Mouse down event
     * @function down
     */
    function down() {
      Sound.play(SOUNDS_LIBRARY.CLICK_OPEN_BIG, {
        id: "ui-big-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    /**
     * @memberof domAudioPresets.bigButton
     * @description Mouse up event
     * @function up
     */
    function up() {},
    /**
     * @memberof domAudioPresets.bigButton
     * @description Input event
     * @function input
     */
    function input() {}
  ),
  /**
   * @memberof domAudioPresets
   * @description Preset for small button
   * @property {DomAudio} smallButton - Preset for small button
   */
  smallButton: new DomAudio(
    /**
     * @memberof domAudioPresets.smallButton
     * @description Mouse over event
     * @function over
     */
    function over() {},
    /**
     * @memberof domAudioPresets.smallButton
     * @description Mouse down event
     * @function down
     */
    function down() {
      Sound.play(SOUNDS_LIBRARY.CLICK_BUTTON_PRESS_SMALL, {
        id: "ui-small-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    /**
     * @memberof domAudioPresets.smallButton
     * @description Mouse up event
     * @function up
     */
    function up() {},
    /**
     * @memberof domAudioPresets.smallButton
     * @description Input event
     * @function input
     */
    function input() {}
  ),
  /**
   * @memberof domAudioPresets
   * @description Preset for default input
   * @property {DomAudio} deafultInput - Preset for default input
   */
  defaultInput: new DomAudio(
    /**
     * @memberof domAudioPresets.deafaultInput
     * @description Mouse over event
     * @function over
     */
    function over() {},
    /**
     * @memberof domAudioPresets.deafaultInput
     * @description Mouse down event
     * @function down
     */
    function down() {
      Sound.play(SOUNDS_LIBRARY.CLICK, {
        id: "ui-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    /**
     * @memberof domAudioPresets.deafaultInput
     * @description Mouse up event
     * @function up
     */
    function up() {},
    /**
     * @memberof domAudioPresets.deafaultInput
     * @description Input event
     * @function input
     */
    function input() {
      Sound.play(SOUNDS_LIBRARY.CHAT, {
        id: "ui-chat",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
        loop: false,
      });
    },
    /**
     * @memberof domAudioPresets.deafaultInput
     * @description Change event
     * @function change
     */
    function change() {}
  ),
  /**
   * @memberof domAudioPresets
   * @description Preset for default select
   * @property {DomAudio} defaultSelect - Preset for default select
   */
  defaultSelect: new DomAudio(
    /**
     * @memberof domAudioPresets.defaultSelect
     * @description Mouse over event
     * @function over
     */
    function over() {},
    /**
     * @memberof domAudioPresets.defaultSelect
     * @description Mouse down event
     * @function down
     */
    function down() {
      Sound.play(SOUNDS_LIBRARY.CLICK, {
        id: "ui-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    /**
     * @memberof domAudioPresets.defaultSelect
     * @description Mouse up event
     * @function up
     */
    function up() {},
    /**
     * @memberof domAudioPresets.defaultSelect
     * @description Input event
     * @function input
     */
    function input() {},
    /**
     * @memberof domAudioPresets.defaultSelect
     * @description Change event
     * @function change
     */
    function change() {
      console.log("change");
      Sound.play(SOUNDS_LIBRARY.CLICK_BUTTON_PRESS_SMALL, {
        id: "ui-select",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    }
  ),
};
