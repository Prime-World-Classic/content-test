import { DOM } from "./dom.js";
import { Lang } from "./lang.js";
import { CastleNAVBAR } from "./castleNavBar.js";
import { View } from "./view.js";
import { Rank } from "./rank.js";
import { App } from "./app.js";
import { Voice } from "./voice.js";
import { Chat } from "./chat.js";
import { NativeAPI } from "./nativeApi.js";
import { MM } from "./mm.js";
import { Splash } from "./splash.js";

export class Events {
  static Message(data) {
    let body = document.createDocumentFragment();

    body.append(DOM(`${data.message}`));

    Splash.show(body);

    setTimeout(() => Splash.hide(), 3000);
  }

  static MMReady(data) {
    if (!NativeAPI.status) {
      return;
    }

    // NativeAPI.attention();

    MM.ready(data);
  }

  static MMReadyCount(data) {
    if (!NativeAPI.status) {
      return;
    }

    let find = document.getElementById("MMReady");

    if (find) {
      find.innerText = `${data.count}/${data.limit}`;
    }
  }

  static MMStart(data) {
    if (!NativeAPI.status) {
      return;
    }

    // NativeAPI.attention();

    MM.lobby(data);
  }

  static MMChangeHero(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.eventChangeHero(data);
  }

  static MMBanHero(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.eventBanHero(data);
  }

  static MMChat(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.chat(data);
  }

  static MMPosition(data) {
    if (!NativeAPI.status) {
      return;
    }

    if (MM.renderBody) {
      for (let item of MM.renderBody.children) {
        if (item.dataset.player == data.id) {
          item.dataset.player = 0;

          item.style.backgroundImage = "none";

          item.style.transform = "scale(1)";
        }

        if (data.position != 0) {
          if (item.dataset.position == data.position) {
            let findPlayer = document.getElementById(`PLAYER${data.id}`);

            if (findPlayer) {
              item.dataset.player = data.id;

              item.style.backgroundImage =
                findPlayer.dataset.hero != 0
                  ? `url(content/hero/${findPlayer.dataset.hero}/${findPlayer.dataset.skin}.webp)`
                  : `url(content/hero/empty.webp)`;

              item.style.transform = "scale(1.5)";
            }
          }
        }
      }
    }
  }

  static MMHero(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.select(data);
  }

  static MMEnd(data) {
    if (!NativeAPI.status) {
      return;
    }

    MM.finish(data);
  }

  static PInvite(data) {
    let body = document.createDocumentFragment();

    let b1 = DOM(
      {
        style: "splash-content-button",
        event: [
          "click",
          async () => {
            await App.api.request(App.CURRENT_MM, "joinParty", {
              code: data.code,
              version: App.PW_VERSION,
            });

            Splash.hide();
          },
        ],
      },
      Lang.text("friendAccept")
    );

    let b2 = DOM(
      { style: "splash-content-button", event: ["click", () => Splash.hide()] },
      Lang.text("friendCancle")
    );

    body.append(
      DOM(
        Lang.text("friendInvitesToLobby").replace("{nickname}", data.nickname)
      ),
      b1,
      b2
    );

    Splash.show(body);
  }

  static PUpdate(data) {
    View.show("castle", data);
  }

  static PHero(data) {
    let find = document.getElementById(`PP${data.id}`);

    if (find) {
      find.children[1].style.backgroundImage = data.hero
        ? `url(content/hero/${data.hero}/${data.skin ? data.skin : 1}.webp)`
        : `url(content/hero/empty.webp)`;

      find.children[1].firstChild.firstChild.innerText = data.rating;

      find.children[1].firstChild.firstChild.style.backgroundImage = `url(content/ranks/${Rank.icon(
        data.rating
      )}.webp)`;
    }
  }

  static PExit() {
    View.show("castle");
  }

  static PReady(data) {
    let find = document.getElementById(`PP${data.id}`);

    if (find) {
      find.children[2].firstChild.innerText = Lang.text("ready");

      find.children[2].classList.replace(
        "party-middle-item-not-ready",
        "party-middle-item-ready"
      );

      find.children[2].classList.replace(
        "castle-party-middle-item-not-ready",
        "castle-party-middle-item-ready"
      );
    }
  }

  static PMMActive(data) {
    CastleNAVBAR.setMode(data.mode + 1);

    MM.searchActive(data.status);
  }

  static MMQueue(value) {
    let find = document.getElementById("MMQueue");

    if (find) {
      find.innerText = value;
    }
  }

  static MMQueueV2(data) {
    View.mmQueueMap = data;
    document.querySelectorAll(".banner-count").forEach((el, idx) => {
      const keys = [
        "pvp",
        "anderkrug",
        "cte",
        "m4",
        "pve-ep2-red",
        "custom-battle",
      ];
      const cssKey = keys[idx];
      if (cssKey) {
        const val = View.getQueue(cssKey);
        el.textContent = val;
      }
    });
  }

  static ADMStat(data) {
    document.getElementById("ADMStat").innerText = `${data.online}`;
  }

  static MMKick(data) {
    setTimeout(() => {
      MM.searchActive(false);
    }, 1000);

    let body = document.createDocumentFragment();

    let button = DOM(
      {
        style: "splash-content-button",
        event: ["click", async () => Splash.hide()],
      },
      Lang.text("titleafk")
    );

    body.append(
      DOM(`${data.party ? Lang.text("titleafk1") : Lang.text("titleafk2")}`),
      button
    );

    Splash.show(body);
  }

  static UChat(data) {
    Chat.viewMessage(data);
  }

  static async VCall(data) {
    if (data.isCaller) {
      let body = document.createDocumentFragment();

      body.append(
        DOM(Lang.text("friendCallFrom").replace("{name}", data.name)),
        DOM(
          {
            style: "splash-content-button",
            event: [
              "click",
              async () => {
                try {
                  let voice = new Voice(data.id, "", data.name, true);

                  await voice.accept(data.offer);

                  Splash.hide();
                } catch (error) {
                  App.error(error);
                }
              },
            ],
          },
          Lang.text("friendAccept")
        ),
        DOM(
          {
            style: "splash-content-button",
            event: ["click", async () => Splash.hide()],
          },
          Lang.text("friendDropCall")
        )
      );

      Splash.show(body);
    } else {
      let voice = new Voice(data.id, "", data.name);

      await voice.accept(data.offer);
    }
  }

  static async VReady(data) {
    await Voice.ready(data.id, data.answer);
  }

  static async VCandidate(data) {
    await Voice.candidate(data.id, data.candidate);
  }

  static VKick() {
    Voice.destroy(true);
  }
}
