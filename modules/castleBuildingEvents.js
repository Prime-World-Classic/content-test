import { Window } from "./window.js";

export class CastleBuildingsEvents {
  static library() {
    Window.show("main", "inventory");
  }
  static talent_farm() {
    Window.show("main", "farm");
  }
  static fair() {
    Window.show("main", "shop");
  }
}
