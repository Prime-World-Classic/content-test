export class Splash {
  static init() {
    Splash.body = document.createElement("div");

    Splash.body.style.display = "none";

    Splash.body.classList.add("splash");

    document.body.append(Splash.body);
  }

  static show(element, content = true) {
    if (Splash.body.firstChild) {
      while (Splash.body.firstChild) {
        Splash.body.firstChild.remove();
      }
    }

    if (content) {
      let body = document.createElement("div");

      body.classList.add("splash-content");

      body.append(element);

      Splash.body.append(body);
    } else {
      Splash.body.append(element);
    }

    Splash.body.style.display = "flex";
  }

  static hide() {
    Splash.body.style.display = "none";
  }
}
