import { DOM } from "./dom.js";
import { News } from "./news.js";
import { Store } from "./store.js";
import { Api } from "./api.js";
import { View } from "./view.js";
import { Events } from "./events.js";
import { Voice } from "./voice.js";
import { Chat } from "./chat.js";
import { NativeAPI } from "./nativeApi.js";
import { MM } from "./mm.js";
import { Splash } from "./splash.js";
import { Window } from "./window.js";
import { Castle } from "./castle.js";
import { Lang } from "./lang.js";

export class App {
  static APP_VERSION = "0";

  static PW_VERSION = "2.11.1";

  static CURRENT_MM = "mmtest";

  static RIGA = "wss://pwclassic.isgood.host:443";
  static MOSCOW = "wss://api2.26rus-game.ru:8443";
  static CLOUDFLARE = "wss://api.26rus-game.ru:8443";
  static hostList = [this.RIGA, this.MOSCOW, this.CLOUDFLARE];
  static bestHost = -1;

  static async findBestHostAndInit() {
    const sockets = [];
    let resolved = false;

    const handleOpen = (index) => {
      return () => {
        if (!resolved) {
          resolved = true;
          this.bestHost = index;

          sockets.forEach((socket, i) => {
            //if (i !== index && socket) {
            socket.close();
            //}
          });

          this.init();
        }
      };
    };

    for (let i = 0; i < this.hostList.length; i++) {
      try {
        const socket = new WebSocket(this.hostList[i]);
        sockets[i] = socket;

        socket.onopen = handleOpen(i);

        socket.onerror = () => {
          socket.close();
        };
      } catch (error) {
        App.error(`Error creating WebSocket for ${this.hostList[i]}:`, error);
      }
    }

    setTimeout(() => {
      if (this.bestHost == -1) {
        App.error(Lang.text("apiConnectionError"));
      }
    }, 30000);
  }

  static async init() {
    // wss://api2.26rus-game.ru:8443 - Москва (основа)
    // wss://relay.26rus-game.ru:8443 - Рига (Прокси)
    // wss://api.26rus-game.ru:8443 - США (прокси)
    App.api = new Api(this.hostList, this.bestHost, Events);

    await News.init();

    await Store.init();

    App.storage = new Store("u3");

    await App.storage.init({ id: 0, token: "", login: "" });

    await MM.init();
    /*
        setTimeout(() => {
            
            let obj = {id:1, users:{
                10:{nickname:'Nesh',hero:15,ready:1,rating:1300,select:false,team:1,banhero:59},
                1858:{nickname:'DOK',hero:6,ready:1,rating:1100,select:false,team:1,banhero:14},
                2:{nickname:'Коао',hero:12,ready:1,rating:1100,select:false,team:1,banhero:62},
                4:{nickname:'Lantarm',hero:24,ready:1,rating:1100,select:false,team:1,banhero:9},
                5:{nickname:'123',hero:8,ready:1,rating:1100,select:false,team:2,banhero:20},
                6:{nickname:'123',hero:2,ready:1,rating:1100,select:false,team:2,banhero:21},
                7:{nickname:'Farfania',hero:9,ready:1,rating:1100,select:false,team:2,banhero:22},
                8:{nickname:'Rekongstor',hero:25,ready:1,rating:1100,select:false,team:2,banhero:23},
                9:{nickname:'Hatem',hero:0,ready:1,rating:2200,select:false,team:2,banhero:26}
            },target:7,map:[4,2,App.storage.data.id,5,6,7,8,9,10,1858],mode:0};

            obj.users[App.storage.data.id] = {winrate:51,nickname:App.storage.data.login,hero:20,ready:0,rating:1284,select:true,team:1,mode:0,commander:true,banhero:16};
            
            MM.lobby(obj);
            
        },1000);
        
        setTimeout(() => {
            
            MM.chat({id:0,message:'тестовое сообщение'});
            MM.chat({id:2,message:'тестовое сообщение'});
            MM.chat({id:7,message:'тестовое сообщение'});
            
        },2000);
        */
    /*
        setTimeout(() => {
            
            ARAM.briefing(6,1,() => alert(1));
            
        },3000);
        */
    /*
        setTimeout(() => {
            
            Splash.show(DOM({style:'iframe-stats'},DOM({style:'iframe-stats-navbar',event:['click',() => Splash.hide()]},'X'),DOM({tag:'iframe',src:'https://stat.26rus-game.ru'})),false);
            
        },3000);
        */
    Chat.init();

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        requestAnimationFrame(() => Voice.updatePanelPosition());
        e.preventDefault();
        e.stopPropagation();

        // 1. Сначала закрываем Splash если открыт
        if (
          typeof Splash !== "undefined" &&
          Splash.body &&
          Splash.body.style.display === "flex"
        ) {
          Splash.hide();
          return;
        }

        // 2. Затем закрываем окна по одному в обратном порядке
        if (
          typeof Window !== "undefined" &&
          Window.anyOpen &&
          Window.anyOpen()
        ) {
          Window.closeLast(); // Закрываем только последнее окно
        }
        // 3. Если окон нет - открываем настройки
        else {
          if (typeof Window !== "undefined" && Window.show) {
            Window.show("main", "menu");
          }
        }
      }
    });

    try {
      await App.api.init();
    } catch (error) {}

    //App.ShowCurrentView();

    // App.backgroundAnimate = document.body.animate({backgroundSize:['150%','100%','150%']},{duration:30000,iterations:Infinity,easing:'ease-out'});

    if (App.isAdmin()) {
      document.body.append(DOM({ id: "ADMStat" }));
    }

    Voice.init();
  }

  static say(text) {
    if (!("speechSynthesis" in window)) {
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    let synthesis = new SpeechSynthesisUtterance(text);

    synthesis.rate = 1.0;

    synthesis.pitch = 1.0;

    synthesis.volume = Castle.GetVolume(Castle.AUDIO_SOUNDS);

    synthesis.lang = Lang.text("synthesisLang");

    window.speechSynthesis.speak(synthesis);
  }

  static ShowCurrentView() {
    console.log("ShowCurrentView");
    if (App.storage.data.login) {
      View.show("castle");
    } else {
      View.show("authorization");
    }
  }

  static async ShowCurrentViewAsync() {
    if (App.storage.data.login) {
      await View.show("castle");
    } else {
      await View.show("authorization");
    }
  }

  static OpenExternalLink(url) {
    if (NativeAPI.status) {
      nw.Shell.openExternal(url);
    } else {
      window.open(url, url, "popup");
    }
  }

  static async authorization(login, password) {
    if (!login.value) {
      login.setAttribute("style", "background:rgba(255,0,0,0.3)");

      return App.error(Lang.text("loginRequiredError"));
    }

    if (!password.value) {
      password.setAttribute("style", "background:rgba(255,0,0,0.3)");

      return App.error(Lang.text("passwordRequiredError"));
    }

    let request, analysis;

    try {
      analysis = NativeAPI.analysis();
    } catch (e) {}

    try {
      request = await App.api.request("user", "authorization", {
        login: login.value.trim(),
        password: password.value.trim(),
        analysis: analysis,
      });
    } catch (error) {
      return App.error(error);
    }

    await App.storage.set({
      id: request.id,
      token: request.token,
      login: login.value,
      fraction: request.fraction,
    });

    View.show("castle");
  }

  static setNickname() {
    const close = DOM({
      tag: "div",
      style: "close-button",
      event: ["click", () => Splash.hide()],
    });

    close.style.backgroundImage = "url(content/icons/close-cropped.svg)";

    let template = document.createDocumentFragment();

    let title = DOM(
      { tag: "div", style: "castle-menu-text" },
      Lang.text("nicknameChangeCooldown")
    );

    let name = DOM({
      tag: "input",
      placeholder: Lang.text("nicknamePlaceholder"),
      value: App.storage.data.login,
    });

    let button = DOM(
      {
        style: "splash-content-button",
        event: [
          "click",
          async () => {
            if (!name.value) {
              Splash.hide();

              return;
            }

            if (App.storage.data.login == name.value) {
              Splash.hide();

              return;
            }

            try {
              await App.api.request("user", "set", { nickname: name.value });
            } catch (error) {
              return App.error(error);
            }

            await App.storage.set({ login: name.value });

            View.show("castle");

            Splash.hide();
          },
        ],
      },
      Lang.text("apply")
    );

    template.append(title, name, button, close);

    Splash.show(template);
  }

  static setFraction() {
    const close = DOM({
      tag: "div",
      style: "close-button",
      event: ["click", () => Splash.hide()],
    });
    close.style.backgroundImage = "url(content/icons/close-cropped.svg)";

    let template = document.createDocumentFragment();

    const title = DOM(
      { tag: "h2", style: "faction-title" },
      Lang.text("select_faction")
    );
    Object.assign(title.style, {
      textAlign: "center",
      color: "#fff",
      textShadow: "0 0 5px rgba(0,0,0,0.5)",
      marginBottom: "30px",
      fontSize: "24px",
    });

    const factionsContainer = DOM({ tag: "div", style: "factions-container" });
    Object.assign(factionsContainer.style, {
      display: "flex",
      gap: "5%",
      justifyContent: "center",
      marginBottom: "30px",
      flexWrap: "wrap",
      width: "90%",
      maxWidth: "600px",
      margin: "0 auto",
    });

    const factions = [
      { id: 1, name: Lang.text("adorians"), icon: "Elf_logo_over.webp" },
      { id: 2, name: Lang.text("dokts"), icon: "Human_logo_over2.webp" },
    ];

    const calculateIconSize = () => {
      const windowWidth = window.innerWidth;
      if (windowWidth < 500) return "20vw";
      if (windowWidth < 768) return "15vw";
      return "120px";
    };

    let selectedFaction = App.storage.data.fraction;

    factions.forEach((faction) => {
      const factionElement = DOM({
        tag: "div",
        style: "faction-item",
        event: [
          "click",
          () => {
            selectedFaction = faction.id;

            factionsContainer
              .querySelectorAll(".faction-item")
              .forEach((item) => {
                item.style.transform = "scale(1)";
                item.style.filter = "brightness(0.7)";
                item.style.boxShadow = "none";
              });

            factionElement.style.transform = "scale(1.05)";
            factionElement.style.filter = "brightness(1)";
            factionElement.style.boxShadow = "0 0 15px rgba(255,215,0,0.7)";
          },
        ],
      });

      const iconSize = calculateIconSize();
      Object.assign(factionElement.style, {
        width: iconSize,
        height: iconSize,
        minWidth: "80px",
        minHeight: "80px",
        maxWidth: "150px",
        maxHeight: "150px",
        backgroundImage: `url(content/icons/${faction.icon})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: selectedFaction === faction.id ? "scale(1.05)" : "scale(1)",
        filter:
          selectedFaction === faction.id ? "brightness(1)" : "brightness(0.7)",
        boxShadow:
          selectedFaction === faction.id
            ? "0 0 15px rgba(255,215,0,0.7)"
            : "none",
        borderRadius: "10px",
      });

      const nameLabel = DOM(
        { tag: "div", style: "faction-name" },
        faction.name
      );
      Object.assign(nameLabel.style, {
        textAlign: "center",
        color: "#fff",
        marginTop: "10px",
        textShadow: "0 0 3px #000",
        fontSize: "16px",
      });

      const wrapper = DOM({ tag: "div", style: "faction-wrapper" });
      Object.assign(wrapper.style, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "10px",
      });

      wrapper.append(factionElement, nameLabel);
      factionsContainer.append(wrapper);
    });

    const button = DOM(
      {
        style: "splash-content-button",
        event: [
          "click",
          async () => {
            if (!selectedFaction) {
              Splash.hide();
              return;
            }

            try {
              await App.api.request("user", "set", {
                fraction: selectedFaction,
              });
            } catch (error) {
              return App.error(error);
            }

            await App.storage.set({ fraction: selectedFaction });
            View.show("castle");
            Splash.hide();
          },
        ],
      },
      Lang.text("apply")
    );

    const resizeHandler = () => {
      const iconSize = calculateIconSize();
      factionsContainer.querySelectorAll(".faction-item").forEach((icon) => {
        icon.style.width = iconSize;
        icon.style.height = iconSize;
      });
    };

    window.addEventListener("resize", resizeHandler);

    close.addEventListener("click", () => {
      window.removeEventListener("resize", resizeHandler);
    });

    template.append(title, factionsContainer, button, close);
    Splash.show(template);
  }

  static async registration(fraction, invite, login, password, password2) {
    if (
      !fraction.value ||
      !invite.value ||
      !login.value ||
      !password.value ||
      !password2.value
    ) {
      return App.error(Lang.text("missingValuesError"));
    }

    if (password.value != password2.value) {
      password.setAttribute("style", "background:rgba(255,0,0,0.3)");

      password2.setAttribute("style", "background:rgba(255,0,0,0.3)");

      return App.error(Lang.text("passwordsMismatchError"));
    }

    let request, analysis;

    try {
      analysis = NativeAPI.analysis();
    } catch (e) {}

    try {
      request = await App.api.request("user", "registration", {
        fraction: fraction.value,
        invite: invite.value.trim(),
        login: login.value.trim(),
        password: password.value.trim(),
        analysis: analysis,
        mac: NativeAPI.getMACAdress(),
      });
    } catch (error) {
      return App.error(error);
    }

    await App.storage.set({
      id: request.id,
      token: request.token,
      login: login.value,
      fraction: fraction.value,
    });

    View.show("castle");
  }

  static async exit() {
    await App.storage.set({ id: 0, token: "", login: "" });

    View.show("authorization");
  }

  static input(callback, object = new Object()) {
    if (!("tag" in object)) {
      object.tag = "input";
    }

    if (!("value" in object)) {
      object.value = "";
    }

    let body = DOM(object);

    body.addEventListener("blur", async () => {
      if (body.value == object.value) {
        return;
      }

      if (callback) {
        try {
          await callback(body.value);
        } catch (e) {
          return;
        }
      }

      object.value = body.value;
    });

    return body;
  }

  static getRandomInt(min, max) {
    min = Math.ceil(min);

    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static error(message, timeout = 3000) {
    let previousErrors = document.getElementsByClassName("error-message");
    let body;
    if (previousErrors.length == 0) {
      body = DOM({ style: "error-message" });
      document.body.append(body);
    } else {
      body = previousErrors[0];
    }

    let msg = DOM({ tag: "div" }, `${message}`);

    setTimeout(() => {
      msg.remove();
    }, timeout);

    body.append(msg);
    console.error(message);
    console.trace("Current call stack:");
  }

  static notify(message, delay = 0) {
    setTimeout(() => {
      let body = DOM(
        { style: "notify-message" },
        DOM({ tag: "div" }, `${message}`)
      );

      setTimeout(() => {
        body.remove();
      }, 3000);

      document.body.append(body);
    }, delay);
  }

  static isAdmin(id = 0) {
    return [1, 2, 24, 134, 865, 2220, 292, 1853, 12781].includes(
      Number(id ? id : App.storage.data.id)
    );
  }

  static href(url) {
    let a = DOM({ tag: "a", href: url });

    a.click();
  }
}
