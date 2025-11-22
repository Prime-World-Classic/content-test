import { DomAudio } from "./domAudio.js";
import { Sound } from "./sound.js";
import { Castle } from "./castle.js";

export const domAudioPresets = {
  defaultButton: new DomAudio(
    function over() {},
    function down() {
      Sound.play("content/sounds/ui/Click.wav", {
        id: "ui-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    function up() {},
    function input() {},
  ),
  closeButton: new DomAudio(
    function over() {},
    function down() {
      Sound.play("content/sounds/ui/ClickClose.wav", {
        id: "ui-close",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    function up() {},
    function input() {},
  ),
  bigButton: new DomAudio(
    function over() {},
    function down() {
      Sound.play("content/sounds/ui/ClickOpenBig.wav", {
        id: "ui-big-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    function up() {},
    function input() {},
  ),
  deafultInput: new DomAudio(
    function over() {},
    function down() {
      Sound.play("content/sounds/ui/Click.wav", {
        id: "ui-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    function up() {},
    function input() {
      console.log("input");
      Sound.play("content/sounds/ui/chat.wav", {
        id: "ui-chat",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
        loop: false,
      });
    },
    function change() {},
  ),
  defaultSelect: new DomAudio(
    function over() {},
    function down() {
      Sound.play("content/sounds/ui/Click.wav", {
        id: "ui-click",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
    function up() {},
    function input() {},
    function change() {
      console.log("change");
      Sound.play("content/sounds/ui/ClickButtonPressSmall.wav", {
        id: "ui-select",
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    },
  ),
};
