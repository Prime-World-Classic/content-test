import { DOM } from "./dom.js";
import { Lang } from "./lang.js";
import { Division } from "./division.js";
import { App } from "./app.js";

export class CastleNAVBAR {
  static state = false;

  static mode = 0;

  static stateDefaultMode = 0;

  static init() {
    let items = [
      "castle-button-play-l1",
      "castle-button-play-4",
      "castle-button-play-5",
      "castle-button-play-6",
      "castle-button-play-7",
      "castle-button-play-3",
      "castle-button-play-mode",
      "castle-button-play-1",
      "castle-button-play-2",
      "castle-button-play-8",
      "castle-button-play-9",
      "castle-button-play-m1",
      "castle-button-play-m2",
      "castle-button-play-m3",
      "castle-button-play-m4",
      "castle-button-play-m5",
      "castle-button-play-m6",
      "castle-button-play-division",
      "castle-button-play-karma",
    ];

    CastleNAVBAR.body = DOM({ style: "castle-button-play" });

    for (let item of items) {
      CastleNAVBAR.body.append(DOM({ style: item }));
    }

    CastleNAVBAR.body.children[3].onclick = () => {};

    CastleNAVBAR.body.children[4].onclick = () => {};

    CastleNAVBAR.body.children[5].innerText =
      App.CURRENT_MM == "mmtest"
        ? Lang.text("fight") + " test"
        : Lang.text("fight");
    /*
        CastleNAVBAR.body.children[5].onclick = () => {
            
            if(CastleNAVBAR.state){
                
                CastleNAVBAR.cancel();
                
            }
            else{
                
                CastleNAVBAR.play();
                
            }
            
        }
        */
    CastleNAVBAR.body.children[9].onclick = () => {
      CastleNAVBAR.viewMode();
    };

    CastleNAVBAR.body.children[9].append(
      DOM({
        style: "castle-button-play-queue",
        title: "Очередь игроков матчмейкинга на данный режим игры",
      })
    );

    CastleNAVBAR.body.children[11].append(
      DOM({ style: "castle-button-play-queue-mode" })
    );

    CastleNAVBAR.body.children[11].onclick = () => {
      CastleNAVBAR.setMode(1);
    };

    CastleNAVBAR.body.children[12].append(
      DOM({ style: "castle-button-play-queue-mode" })
    );

    CastleNAVBAR.body.children[12].onclick = () => {
      CastleNAVBAR.setMode(2);
    };

    CastleNAVBAR.body.children[13].append(
      DOM({ style: "castle-button-play-queue-mode" })
    );

    CastleNAVBAR.body.children[13].onclick = () => {
      CastleNAVBAR.setMode(3);
    };

    CastleNAVBAR.body.children[14].append(
      DOM({ style: "castle-button-play-queue-mode" })
    );

    CastleNAVBAR.body.children[14].onclick = () => {
      CastleNAVBAR.setMode(4);
    };

    CastleNAVBAR.body.children[15].append(
      DOM({ style: "castle-button-play-queue-mode" })
    );

    CastleNAVBAR.body.children[15].onclick = () => {
      CastleNAVBAR.setMode(5);
    };

    CastleNAVBAR.body.children[16].append(
      DOM({ style: "castle-button-play-queue-mode" })
    );

    CastleNAVBAR.body.children[16].onclick = () => {
      CastleNAVBAR.setMode(6);
    };

    CastleNAVBAR.body.children[18].title =
      'Карма — поведение игрока и его "полезность" в бою.\n' +
      "Она может повышаться и понижаться, в зависимости от боёв.";
    CastleNAVBAR.body.children[18].style.pointerEvents = "auto";
    CastleNAVBAR.body.children[18].style.zIndex = "4";
    CastleNAVBAR.body.children[18].append(DOM({ tag: "div" }));

    return CastleNAVBAR.body.children[5];
  }

  static defaultMode(id) {
    if (!id) {
      if (CastleNAVBAR.stateDefaultMode) {
        CastleNAVBAR.stateDefaultMode = 0;
      }

      return;
    }

    if (CastleNAVBAR.stateDefaultMode && CastleNAVBAR.stateDefaultMode == id) {
      return;
    }

    if (CastleNAVBAR.state) {
      return;
    }

    CastleNAVBAR.setMode(id);

    CastleNAVBAR.stateDefaultMode = id;
  }

  static play() {
    if (CastleNAVBAR.state) {
      return;
    }

    CastleNAVBAR.state = true;

    CastleNAVBAR.body.children[0].style.display = "block";

    CastleNAVBAR.body.children[5].innerText = Lang.text("cancel");

    //CastleNAVBAR.body.children[5].style.fontSize = '1.1vw';

    CastleNAVBAR.body.children[1].style.filter = "grayscale(80%)";

    CastleNAVBAR.body.children[2].style.filter = "grayscale(80%)";

    CastleNAVBAR.body.children[3].style.filter = "grayscale(70%)";

    CastleNAVBAR.body.children[4].style.filter = "grayscale(70%)";
  }

  static karma(id) {
    let karma = 0;

    if (id >= 75) {
      karma = 75;
    } else if (id >= 50) {
      karma = 50;
    }

    if (karma) {
      const el = CastleNAVBAR.body.children[18];
      el.style.display = "flex";
      el.firstChild.innerText = `>${karma}`;

      el.title =
        'Карма — поведение игрока и его "полезность" в бою.\n' +
        "Она может повышаться и понижаться, в зависимости от боёв.\n" +
        `Текущий порог: >${karma}`;
    }
  }

  static division(id) {
    let division = Division.get(id);

    CastleNAVBAR.body.children[17].style.backgroundImage = `url(content/ranks/${division.icon}.webp)`;

    CastleNAVBAR.body.children[17].title =
      "Дивизия — группа игроков под одним званием,\nкоторая играет примерно на равном винрейте матчмейкинга.";

    CastleNAVBAR.body.children[17].style.display = "block";
  }

  static cancel() {
    if (!CastleNAVBAR.state) {
      return;
    }

    CastleNAVBAR.state = false;

    CastleNAVBAR.body.children[0].style.display = "none";

    CastleNAVBAR.body.children[5].innerText =
      App.CURRENT_MM == "mmtest"
        ? Lang.text("fight") + " test"
        : Lang.text("fight");

    //CastleNAVBAR.body.children[5].style.fontSize = '1.4vw';

    CastleNAVBAR.body.children[1].style.filter = "grayscale(0)";

    CastleNAVBAR.body.children[2].style.filter = "grayscale(0)";

    CastleNAVBAR.body.children[3].style.filter = "grayscale(0)";

    CastleNAVBAR.body.children[4].style.filter = "grayscale(0)";

    CastleNAVBAR.body.children[17].style.display = "none";

    CastleNAVBAR.body.children[18].style.display = "none";
  }

  static viewMode() {
    CastleNAVBAR.body.children[5].style.display = "none";

    CastleNAVBAR.body.children[10].style.display = "block";

    CastleNAVBAR.body.children[11].style.display = "block";

    CastleNAVBAR.body.children[12].style.display = "block";

    CastleNAVBAR.body.children[13].style.display = "block";

    CastleNAVBAR.body.children[14].style.display = "block";

    CastleNAVBAR.body.children[15].style.display = "block";

    CastleNAVBAR.body.children[16].style.display = "block";
  }

  static setMode(type) {
    let modeSelect = type - 1;

    if (CastleNAVBAR.mode != modeSelect) {
      CastleNAVBAR.body.children[9].firstChild.innerText = "";
    }

    CastleNAVBAR.mode = modeSelect;

    CastleNAVBAR.body.children[5].style.display = "flex"; //починил кнопку

    let background = window
      .getComputedStyle(CastleNAVBAR.body.children[`1${type}`], null)
      .getPropertyValue("background-image");

    CastleNAVBAR.body.children[6].style.backgroundImage = background;

    CastleNAVBAR.body.children[10].style.display = "none";

    CastleNAVBAR.body.children[11].style.display = "none";

    CastleNAVBAR.body.children[12].style.display = "none";

    CastleNAVBAR.body.children[13].style.display = "none";

    CastleNAVBAR.body.children[14].style.display = "none";

    CastleNAVBAR.body.children[15].style.display = "none";

    CastleNAVBAR.body.children[16].style.display = "none";
  }

  static queue(data) {
    let queue = 0;

    if (CastleNAVBAR.mode in data.mode) {
      if (data.mode[CastleNAVBAR.mode]) {
        queue = data.mode[CastleNAVBAR.mode];
      }
    }

    CastleNAVBAR.body.children[9].firstChild.innerText = queue ? queue : "";

    for (let item of [
      { child: 11, mode: 0 },
      { child: 12, mode: 1 },
      { child: 13, mode: 2 },
      { child: 14, mode: 3 },
      { child: 15, mode: 4 },
      { child: 16, mode: 5 },
    ]) {
      CastleNAVBAR.body.children[item.child].firstChild.innerText =
        item.mode in data.mode && data.mode[item.mode]
          ? data.mode[item.mode]
          : "";
    }
  }
}
