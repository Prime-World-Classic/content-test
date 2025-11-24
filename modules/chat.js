import { DOM } from "./dom.js";
import { Lang } from "./lang.js";
import { App } from "./app.js";
import { NativeAPI } from "./nativeApi.js";
import { Splash } from "./splash.js";

export class Chat {
  static body;

  static hide = false;

  static to = 0;

  static initView() {
    let scrollBtn = DOM(
      {
        style: "scroll-btn",
        event: [
          "click",
          () => {
            Chat.scroll(true);
          },
        ],
        title: "Прокрутить чат вниз", // Добавляем описание при наведении
      },
      "▼",
    ); // Замените '▼' на нужный вам текст или символ для кнопки прокрутки

    let input = DOM({
      tag: "input",
      style: "chat-input",
      placeholder: Lang.text("enterTextAndPressEnter"),
    });

    Chat.input = DOM({ style: "chat-input-container" }, input, scrollBtn);

    Chat.body = DOM({ style: "chat" }, DOM({ style: "chat-body" }), Chat.input);

    const handleSend = async (event) => {
      if (
        event.key === "Enter" ||
        event.keyCode === 13 ||
        event.code === "Enter" ||
        event.code === "NumpadEnter"
      ) {
        event.preventDefault();
        await Chat.sendMessage();
      }
    };

    input.addEventListener("keyup", handleSend);
    input.addEventListener("keypress", handleSend);
    input.addEventListener("keydown", handleSend);

    input.addEventListener("input", () => {
      if (!Chat.input.firstChild.value) {
        Chat.to = 0;
      }
    });
  }

  static init() {
    Chat.initView();

    document.addEventListener("keydown", (event) => {
      if (event.code == "KeyM" && (event.ctrlKey || event.metaKey)) {
        changeChatVisibility();
      }
    });
  }

  static changeChatVisibility() {
    if (Chat.hide) {
      Chat.body.style.display = "block";

      Chat.hide = false;
    } else {
      Chat.body.style.display = "none";

      Chat.hide = true;
    }
  }

  static wrapLinksInATag(message) {
    const urlRegex = /(https:\/\/[^\s]+)/g;
    return message.replace(urlRegex, '<a href="$1">$1</a>');
  }

  static viewMessage(data) {
    let nickname = DOM({ tag: "div" }, data.nickname + ": ");

    let message = DOM({ tag: "div" });

    if (data.id == 1) {
      if (String(data.message).slice(0, 5) == "https") {
        message.append(DOM({ tag: "img", src: data.message }));
      } else {
        message.innerText = `${data.message}`;
      }
    } else {
      message.innerText = `${data.message}`;
    }

    if (App.isAdmin(data.id)) {
      if (
        String(data.message).includes("https") &&
        !String(data.message).includes(".gif")
      ) {
        message.innerHTML = this.wrapLinksInATag(message.innerHTML);
      }
      if (NativeAPI.status) {
        message.addEventListener("click", (e) => NativeAPI.linkHandler(e));
      }
    }

    if (data.to == -1) {
      message.style.color = "rgb(255,50,0)";

      message.style.fontWeight = 600;

      message.style.fontStyle = "italic";
    } else if (data.to == App.storage.data.id) {
      message.style.color = "rgba(51,255,0,0.9)";
    }

    if (data.id == 1) {
      nickname.style.color = "transparent";

      nickname.style.fontWeight = 600;

      nickname.classList.add("owner-text");
    } else if (data.id == -2) {
      nickname.style.color = "transparent";

      nickname.style.fontWeight = 600;

      nickname.classList.add("telegrambot-text");
    } else if (App.isAdmin(data.id)) {
      nickname.style.color = "transparent";

      nickname.style.fontWeight = 600;

      nickname.classList.add("administration-text");
    }

    let item = DOM(
      {
        style: "chat-body-item",
        event: [
          "click",
          () => {
            Chat.to = data.id;

            Chat.body.lastChild.firstChild.value = `@${data.nickname}, `;

            Chat.input.firstChild.focus();
          },
        ],
      },
      nickname,
      message,
    );

    item.addEventListener("contextmenu", () => {
      if (App.isAdmin()) {
        let body = document.createDocumentFragment();

        body.append(
          DOM(`Выдать мут чата ${data.nickname}?`),
          DOM(
            {
              style: "splash-content-button",
              event: [
                "click",
                async () => {
                  await App.api.request("user", "mute", { id: data.id });

                  Splash.hide();
                },
              ],
            },
            "Да",
          ),
          DOM(
            {
              style: "splash-content-button",
              event: ["click", async () => Splash.hide()],
            },
            "Нет",
          ),
        );

        Splash.show(body);
      }

      return false;
    });

    Chat.body.firstChild.prepend(item);

    Chat.scroll();
  }

  static async sendMessage() {
    if (Chat.input.firstChild.value.length > 128) {
      return;
    }

    await App.api.request("user", "chat", {
      message: Chat.input.firstChild.value,
      to: Chat.to,
    });

    Chat.to = 0;

    Chat.input.firstChild.value = "";
  }

  static scroll(forceScroll = false) {
    if (
      Chat.body.firstChild.children.length &&
      (forceScroll ||
        Chat.body.firstChild.firstChild.offsetTop ==
          Chat.body.firstChild.firstChild.offsetHeight)
    ) {
      Chat.body.firstChild.firstChild.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    }
  }
}
