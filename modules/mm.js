import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { CastleNAVBAR } from './castleNavBar.js';
import { View } from './view.js';
import { Winrate } from './winrate.js';
import { Rank } from './rank.js';
import { Build } from './build.js';
import { App } from './app.js';
import { Voice } from './voice.js';
import { PWGame } from './pwgame.js';
import { NativeAPI } from './nativeApi.js';
import { Castle } from './castle.js';
import { Settings } from './settings.js';
import { Sound } from './sound.js';
import { Timer } from './timer.js';
import { Splash } from './splash.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { loadKeybinds } from './keybindings/keybindings.io.js';

export class MM {
  static id = '';
  
  static pendingHeroEvents = new Map();
  
  static pendingHeroFlushTimer = 0;

  static hero = false;

  static targetBanHeroId = 0;

  static view = document.createElement('div');

  static button = DOM({ tag: 'div' }, DOM({ tag: 'div' }), DOM({ id: 'MMQueue' }, '0'));

  static renderBody = false;

  static active = false;

  static targetPlayerAnimate = false;

  static activeSelectHero = 0;
  
  static modeRules = {};

  static isInTambur = false;

  static gameRunEvent() {
    Castle.toggleRender(Castle.RENDER_LAYER_GAME, false);
    Castle.toggleMusic(Castle.MUSIC_LAYER_GAME, false);
    document.body.style.display = 'none';
    NativeAPI.window.hide();

    NativeAPI.app.unregisterGlobalHotKey(NativeAPI.altEnterShortcut);
  }

  static gameStopEvent() {
    Castle.toggleRender(Castle.RENDER_LAYER_GAME, true);
    Castle.toggleMusic(Castle.MUSIC_LAYER_GAME, true);
    document.body.style.display = 'block';

    if (NativeAPI.status) {
      try {
        Settings.ApplySettings();

        NativeAPI.window.show();
        NativeAPI.app.registerGlobalHotKey(NativeAPI.altEnterShortcut);
      } catch (e) {
        App.error(e);
      }
    }

    View.show('castle');
  }

  static initView() {
    MM.view.classList.add('mm');

    MM.view.style.display = 'none';

    document.body.append(MM.view);

    let button = CastleNAVBAR.init();

    button.onclick = async () => {
      await loadKeybinds();
      MM.start();
    };
  }

  static async init() {
    MM.initView();
    
    MM.loadModeRules();
    
    window.addEventListener('CastleModeChanged', () => {
      MM.loadModeRules();
    });

    // Linux test
    //let testRun = DOM({style:'castle-button-play-test'}, "Test");
    //CastleNAVBAR.body.append(testRun);

    //testRun.onclick = () => PWGame.start("Tester00Tester00Tester00Tester004c8fa55b5ee54d6ddbaab2373f8a6a74d7f9c5d739bdd79da12f3beda73c7115", MM.gameStopEvent);

    Timer.init();

    window.addEventListener('beforeunload', () => {
      if (NativeAPI.status) {
        // Stop MM search
        if (MM.active) {
          MM.start();
        }
      }
    });
  }

  static soundEvent() {
    Sound.play(SOUNDS_LIBRARY.MM_FOUND, {
      id: 'MM_found',
      volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
    });
  }
  
  static async loadModeRules() {
    try {
      const response = await App.api.request(App.CURRENT_MM, 'modes');
      MM.modeRules = response || {};
    } catch (error) {
      MM.modeRules = {};
    }
  }
  
  static getBannedHeroesForCurrentMode() {
    const modeId = Number(CastleNAVBAR.mode);
    const modeRule = MM.modeRules && MM.modeRules[`${modeId}`] ? MM.modeRules[`${modeId}`] : MM.modeRules?.[modeId];
    const list = modeRule?.bannedHeroes;
    if (!Array.isArray(list)) {
      return new Set();
    }
    return new Set(list.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0));
  }

  static play() {
    return MM.button;
  }

  static show(content) {
    if (MM.view.firstChild) {
      while (MM.view.firstChild) {
        MM.view.firstChild.remove();
      }
    }

    MM.view.append(content);

    MM.view.style.display = 'flex';
  }

  static close() {
    Sound.stop('tambur');

    Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, true);

    MM.isInTambur = false;
    
    MM.pendingHeroEvents.clear();
    
    if (MM.pendingHeroFlushTimer) {
      clearTimeout(MM.pendingHeroFlushTimer);
      MM.pendingHeroFlushTimer = 0;
    }

    MM.view.style.display = 'none';

    Voice.infoPanel.classList.remove('left-offset-no-shift');
    Voice.infoPanel.classList.add('left-offset-with-shift');

    View.castleQuestBody.classList.remove('left-offset-with-shift');
    View.castleQuestBody.classList.add('left-offset-no-shift');
  }

  static searchActive(status = true) {
    if (status && !MM.active) {
      MM.active = true;

      //MM.buttonAnimate = MM.button.animate({opacity:[1,0.5,1]},{duration:1000,iterations:Infinity,easing:'ease-out'});

      //MM.button.firstChild.innerText = 'Поиск боя';

      CastleNAVBAR.play();
    }

    if (!status && MM.active) {
      MM.active = false;

      CastleNAVBAR.cancel();

      /*
            if(MM.buttonAnimate){
                
                MM.buttonAnimate.cancel();
                
            }
            
            MM.button.firstChild.innerText = Lang.text('fight');
            */
    }
  }

  static async gameStartCheck() {
    if (PWGame.gameConnectionTestIsActive) {
      return;
    }

    if (!PWGame.gameServerHasConnection || !PWGame.isUpToDate || !PWGame.isValidated) {
      MM.button.firstChild.innerText = Lang.text('mmCheck');
    }

    try {
      if (!MM.active) {
        PWGame.gameConnectionTestIsActive = true;

        await PWGame.check();

        await PWGame.testGameServerConnection();

        await PWGame.checkUpdates();

        PWGame.gameConnectionTestIsActive = false;
      }
    } catch (error) {
      PWGame.gameConnectionTestIsActive = false;

      if (!PWGame.gameServerHasConnection || !PWGame.isUpToDate || !PWGame.isValidated) {
        // Неудача

        MM.button.firstChild.innerText = Lang.text('fight');
      }

      return App.error(error);
    }
  }

  static async start() {
    if (NativeAPI.status) {
      await MM.gameStartCheck();
    } else {
      const downloadMessage = DOM({
        tag: 'p',
        innerHTML: Lang.text('mmLauncherDownload'),
      });

      const splashContent = DOM({
        style: 'splash-content-window',
      });

      const heading = DOM({ tag: 'h1' }, Lang.text('mmWindowsLauncherRequired'));
      const paragraph1 = DOM({ tag: 'p' }, Lang.text('mmBrowserSupportDiscontinued'));
      const paragraph2 = DOM({ tag: 'p' }, Lang.text('mmLauncherMigratedToWindows'));

      // Создаем кнопку закрытия
      const closeButton = DOM({
        tag: 'div',
        domaudio: domAudioPresets.closeButton,
        style: 'close-button',
        event: ['click', () => Splash.hide()],
      });
      closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';

      splashContent.append(closeButton, heading, paragraph1, paragraph2, downloadMessage);

      // Добавляем стили для ссылки
      const style = DOM({
        tag: 'style',
        innerHTML: `
                    .launcher-link {
                        color: #ff0000;
                        text-decoration: none;
                        transition: color 0.3s ease;
                    }
                    .launcher-link:hover {
                        color: #ff6666;
                        text-decoration: underline;
                    }
                `,
      });
      document.head.append(style);

      Splash.show(splashContent, false);
      return;
    }

    if (!MM.hero) {
      MM.hero = await App.api.request('build', 'heroAll');
    }

    if (MM.active) {
      try {
        await App.api.request(App.CURRENT_MM, 'cancel');
      } catch (error) {
        return App.error(error);
      }

      MM.searchActive(false);
    } else {
      MM.searchActive(true);

      try {
        let request = await App.api.request(App.CURRENT_MM, 'start', {
          hero: MM.activeSelectHero,
          version: App.PW_VERSION,
          mode: CastleNAVBAR.mode,
          mac: NativeAPI.getMACAdress(),
        });

        CastleNAVBAR.division(request.division);

        CastleNAVBAR.karma(request.karma);

        if (request.type == 'reconnect') {
          MM.searchActive(false);

          MM.gameRunEvent();

          PWGame.reconnect(request.id, MM.gameStopEvent);

          return;
        }
      } catch (error) {
        MM.searchActive(false);

        return App.error(error);
      }
    }
  }

  static async ready(data) {
    MM.id = data.id;

    let initialCount = ('count' in data) ? data.count : 0;
    
    let body = DOM({ style: 'mm-ready' }, Timer.body, DOM({ id: `MMReady`, style: 'mm-ready-count' }, `${initialCount}/${data.limit}`));
    
    let canConfirm = !('canConfirm' in data) || data.canConfirm;

    await Timer.start(data.id, Lang.text('mmMatchFound'), () => {
      MM.close();

      MM.searchActive(true);
    });

    MM.searchActive(false);

    MM.soundEvent();

    if (canConfirm) {
      let button = DOM(
        {
          style: 'mm-ready-button',
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            async () => {
              try {
                Voice.destroyTamburCallsOnly();
              } catch (error) {
                console.log(error);
              }
  
              try {
                await App.api.request(App.CURRENT_MM, 'ready', { id: data.id });
              } catch (error) {
                Timer.stop();
  
                MM.close();
  
                MM.searchActive(false);
  
                return;
              }
  
              button.style.opacity = 0;
            },
          ],
        },
        Lang.text('ready'),
      );
  
      button.style.fontSize = '2cqw';
  
      button.animate(
        { transform: ['scale(1)', 'scale(0.98)', 'scale(1.02)', 'scale(1)'] },
        { duration: 500, iterations: Infinity, easing: 'ease-in-out' },
      );
  
      body.append(button);
    }

    MM.show(body);
  }

  static async lobbyBuildView(heroId) {
    if (MM.lobbyBuildField.firstChild) {
      MM.lobbyBuildField.firstChild.remove();
    }

    while (MM.lobbyBuildTab.firstChild) {
      MM.lobbyBuildTab.firstChild.remove();
    }

    let builds = await App.api.request('build', 'my', { hero: heroId });

    let target = 0;

    for (let build of builds) {
      let tab = DOM(
        {
          domaudio: domAudioPresets.bigButton,
          event: [
            'click',
            async () => {
              await App.api.request('build', 'target', { id: build.id });

              target = build.id;

              for (let child of MM.lobbyBuildTab.children) {
                child.style.background = 'rgba(255,255,255,0)';
              }

              tab.style.background = 'rgba(255,255,255,0.3)';

              if (MM.lobbyBuildField.firstChild) {
                MM.lobbyBuildField.firstChild.remove();
              }

              MM.lobbyBuildField.append(Build.viewModel(build.body, false, false));
            },
          ],
        },
        build.name,
      );

      if (build.target) {
        target = build.id;

        tab.style.background = 'rgba(255,255,255,0.3)';

        if (MM.lobbyBuildField.firstChild) {
          MM.lobbyBuildField.firstChild.remove();
        }

        MM.lobbyBuildField.append(Build.viewModel(build.body, false, false));
      }

      MM.lobbyBuildTab.append(tab);
    }

    let notify = true,
      random = DOM(
        {
          style: 'ready-button',
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            async () => {
              if (notify) {
                random.innerText = Lang.text('mmOverwriteBuild');

                notify = false;

                return;
              }

              random.innerText = Lang.text('mmGenerating');

              let build = await App.api.request('build', 'rebuild', {
                id: target,
              });

              if (MM.lobbyBuildField.firstChild) {
                MM.lobbyBuildField.firstChild.remove();
              }

              MM.lobbyBuildField.append(Build.viewModel(build.body, false, false));

              notify = true;

              for (let item of builds) {
                if (item.id == target) {
                  item.body = build.body;
                }
              }

              random.innerText = Lang.text('mmRandomBuild');
            },
          ],
        },
        Lang.text('mmRandomBuild'),
      );

    random.style.width = 'auto';

    MM.lobbyBuildTab.append(random);
  }

  static async lobby(data) {
    MM.isInTambur = true;

    MM.targetBanHeroId = 0;

    if (!MM.hero) {
      MM.hero = await App.api.request('build', 'heroAll');
    }

    if (!MM.id) {
      MM.id = data.id;
    }

    MM.searchActive(false);

    Voice.infoPanel.classList.remove('left-offset-with-shift');
    Voice.infoPanel.classList.add('left-offset-no-shift');

    View.castleQuestBody.classList.remove('left-offset-no-shift');
    View.castleQuestBody.classList.add('left-offset-with-shift');

    MM.lobbyUsers = data.users;

    MM.targetHeroId = data.users[App.storage.data.id].hero;

    let lobbyBuild = DOM({ style: 'mm-lobby-middle-build' });

    MM.lobbyBuildField = DOM();

    MM.lobbyBuildField.style.margin = '0.5cqw 0';

    MM.lobbyBuildField.style.width = '28cqw';

    MM.lobbyBuildField.style.height = '28cqw';

    MM.lobbyBuildTab = DOM({ style: 'lobby-build-tab' });

    MM.lobbyConfirm = DOM(
      {
        style: 'mm-ready-button',
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          async () => {
            try {
              await App.api.request(App.CURRENT_MM, 'hero', {
                id: data.id,
                heroId: MM.targetHeroId,
                banHeroId: MM.targetBanHeroId,
              });
            } catch (error) {
              MM.lobbyConfirm.innerText = error;

              setTimeout(() => {
                MM.lobbyConfirm.innerText = Lang.text('mmConfirm');
              }, 1500);
            }
          },
        ],
      },
      Lang.text('ready2'),
    );

    MM.lobbyConfirm.style.opacity = 0;

    MM.lobbyConfirm.style.width = '60%';

    MM.lobbyConfirm.animate(
      { transform: ['scale(1)', 'scale(0.98)', 'scale(1.02)', 'scale(1)'] },
      { duration: 2000, iterations: Infinity, easing: 'ease-in-out' },
    );

    lobbyBuild.append(MM.lobbyConfirm, MM.lobbyBuildField, MM.lobbyBuildTab);

    if (MM.targetHeroId) {
      MM.lobbyBuildView(MM.targetHeroId);
    }

    let leftTeam = DOM({ style: 'mm-lobby-header-team' });

    let rightTeam = DOM({ style: 'mm-lobby-header-team' });

    for (let key of data.map) {
      let player = DOM({
        id: `PLAYER${key}`,
        style: 'mm-lobby-header-team-player',
      });

      player.dataset.hero = data.users[key].hero;

      player.dataset.skin = 1;

      let hero = DOM({ style: 'mm-lobby-header-team-player-hero' });

      let name = DOM({ style: 'mm-lobby-header-team-player-name' }, `${data.users[key].nickname}`);

      let rank = Rank.createRankNode(data.users[key].rating);

      hero.append(rank, DOM({ style: 'mm-frame' }));

      if ('commander' in data.users[key]) {
        name.setAttribute('style', 'color:rgba(255,215,0,0.9)');
      }

      let banhero = DOM({ style: 'mm-player-ban' });

      if (data.users[key].banhero) {
        banhero.style.backgroundImage = `url(content/hero/${data.users[key].banhero}/1.webp)`;

        banhero.style.display = 'block';
      }

      hero.append(banhero);

      hero.style.backgroundImage = data.users[key].hero
        ? `url(content/hero/${data.users[key].hero}/1.webp)`
        : `url(content/hero/empty.webp)`;

      player.append(hero, name);

      if (key == data.target) {
        MM.lobbyPlayerAnimate = player.animate(
          { transform: ['scale(1)', 'scale(0.8)', 'scale(1.1)', 'scale(1)'] },
          { duration: 2000, iterations: Infinity, easing: 'ease-in-out' },
        );
      }

      if (data.users[App.storage.data.id].team == data.users[key].team) {
        leftTeam.append(player);

        player.onclick = () => {
          if (player.dataset.hero) {
            Build.view(key, player.dataset.hero, data.users[key].nickname, false);
          }
        };
      } else {
        name.innerText = 'ifst';

        name.style.opacity = 0;

        rank.firstChild.innerText = 1100;

        rank.firstChild.style.opacity = 0;

        rightTeam.append(player);
      }
    }

    MM.lobbyHeroes = DOM({ style: 'mm-lobby-middle-hero' });

    if (data.banhero) {
      MM.lobbyHeroes.append(DOM({ style: 'mm-lobby-middle-hero-prompt' }, Lang.text('mmMouseControls')));
    }

    //let preload = new PreloadImages(MM.lobbyHeroes);
    
    View.loadCastleHeroSelectedList();
    View.loadCastleHeroListNames();
    const selectedHeroListId = Number(View.castleHeroSelectedList) || 0;
    const selectedHeroListMask = selectedHeroListId > 0 ? 1 << (selectedHeroListId - 1) : 0;

    let filteredHeroes = [];
    for (let item of MM.hero) {
      if (!item.id) {
        continue;
      }

      if ('hero' in data && data.hero.length) {
        if (!data.hero.includes(`${item.id}`)) {
          continue;
        }
      }
      filteredHeroes.push(item);
    }
    
    const appendHeroCard = (item) => {
      let hero = DOM({
        id: `HERO${item.id}`,
        data: { ban: 0 },
        style: 'mm-lobby-middle-hero-item',
      });

      hero.style.backgroundImage = `url("content/hero/${item.id}/1.webp")`; // ${( item.skin ? item.skin : 1)}

      hero.onclick = async () => {
        MM.targetHeroId = item.id;

        await App.api.request(App.CURRENT_MM, 'eventChangeHero', {
          id: MM.id,
          heroId: item.id,
        });

        MM.lobbyBuildView(MM.targetHeroId);
      };

      hero.oncontextmenu = async () => {
        await App.api.request(App.CURRENT_MM, 'eventBanHero', {
          id: MM.id,
          heroId: item.id,
        });

        MM.targetBanHeroId = item.id;
      };

      let rank = Rank.createRankNode(item.rating, { withIcon: false });

      hero.append(rank);

      MM.lobbyHeroes.append(hero);

      //preload.add(hero);
    };

    let favouriteHeroes = [];
    let otherHeroes = filteredHeroes;

    if (selectedHeroListMask > 0) {
      favouriteHeroes = filteredHeroes
        .filter((item) => (Number(item?.favourite || 0) & selectedHeroListMask) !== 0)
        .sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0));

      otherHeroes = filteredHeroes.filter((item) => (Number(item?.favourite || 0) & selectedHeroListMask) === 0);

      if (favouriteHeroes.length) {
        const emptyIconLeft = DOM({ style: 'mm-lobby-middle-hero-line-icon' });
        emptyIconLeft.style.backgroundImage = 'url(content/icons/favouriteHero.png)';
        emptyIconLeft.style.opacity = 1;
        const emptyIconRight = DOM({ style: 'mm-lobby-middle-hero-line-icon' });
        emptyIconRight.style.backgroundImage = 'url(content/icons/favouriteHero.png)';
        emptyIconRight.style.opacity = 1;
        MM.lobbyHeroes.append(
          DOM(
            { style: 'mm-lobby-middle-hero-line' },
            emptyIconLeft,
            DOM({ style: 'mm-lobby-middle-hero-line-name' }, View.getCastleHeroListName(selectedHeroListId)),
            emptyIconRight,
          ),
        );
        for (let item of favouriteHeroes) {
          appendHeroCard(item);
        }
      }
    }

    let activeRankName = '';
    for (let item of otherHeroes) {
      let getRankName = Rank.getName(item.rating);

      if (getRankName != activeRankName) {
        let rankIcon = DOM({ style: 'mm-lobby-middle-hero-line-icon' });
        rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

        let rankIcon2 = DOM({ style: 'mm-lobby-middle-hero-line-icon' });
        rankIcon2.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

        MM.lobbyHeroes.append(
          DOM({ style: 'mm-lobby-middle-hero-line' }, rankIcon, DOM({ style: 'mm-lobby-middle-hero-line-name' }, getRankName), rankIcon2),
        );

        activeRankName = getRankName;
      }

      appendHeroCard(item);
    }

    if (App.storage.data.id == data.target) {
      MM.lobbyConfirm.style.opacity = 1;
    }

    let info = DOM({ style: 'lobby-timer' });

    await Timer.start(data.id, '', () => {
      MM.close();

      MM.searchActive(true);
    });

    Timer.sfxOptions.play = App.storage.data.id == data.target;

    info.append(Timer.body);

    MM.chatBody = DOM({ style: 'mm-lobby-middle-chat-body' });

    let chatInput = DOM({
      tag: 'input',
      style: 'mm-lobby-middle-chat-button',
      placeholder: Lang.text('enterTextAndPressEnter'),
    });

    chatInput.addEventListener('keyup', async (event) => {
      if (!App.isEnterKey(event)) return;

      if (chatInput.value.length < 2) {
        throw 'Количество символов < 2';
      }

      if (chatInput.value.length > 256) {
        throw 'Количество символов > 256';
      }

      await App.api.request(App.CURRENT_MM, 'chat', {
        id: MM.id,
        message: chatInput.value,
      });

      chatInput.value = '';
    });

    let body = DOM(
      { style: 'mm-lobby' },
      DOM({ style: 'mm-lobby-header' }, leftTeam, info, rightTeam),
      DOM(
        { style: 'mm-lobby-middle' },
        DOM(
          { style: 'mm-lobby-middle-chat' },
          DOM({ style: 'mm-lobby-middle-chat-map' }, data.mode == 0 ? MM.renderMap(data.users[App.storage.data.id].team) : DOM()),
          MM.chatBody,
          chatInput,
        ),
        lobbyBuild,
        MM.lobbyHeroes,
      ),
    );

    Sound.play(SOUNDS_LIBRARY.TAMBUR, {
      id: 'tambur',
      volume: Castle.GetVolume(Castle.AUDIO_MUSIC),
      loop: true,
    });

    Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, false);

    MM.show(body);
    
    MM.flushPendingHeroEvents(data.id);
    
    setTimeout(() => MM.flushPendingHeroEvents(data.id), 300);
    
    setTimeout(() => MM.flushPendingHeroEvents(data.id), 1200);

    for (let key in data.users) {
      if (!data.users[key].hero) {
        continue;
      }

      let findHero = document.getElementById(`HERO${data.users[key].hero}`);

      if (findHero) {
        findHero.style.filter = 'grayscale(100%)';

        findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';

        findHero.dataset.ban = key;
      }

      if (data.users[key].banhero) {
        let findHero = document.getElementById(`HERO${data.users[key].banhero}`);

        if (findHero) {
          findHero.style.filter = 'grayscale(100%)';

          findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        }
      }
    }

    try {
      let list = new Array();

      for (let key of data.map) {
        if (data.users[App.storage.data.id].team == data.users[key].team) {
          list.push({ id: key, name: data.users[key].nickname });
        }
      }

      Voice.association(App.storage.data.id, list, data.id);
    } catch (error) {
      console.log('Voice.association', error);
    }
  }

  static renderMap(team) {
    MM.renderBody = DOM({ style: team == 1 ? 'map' : 'map-reverse' });

    let container = DOM({ tag: 'div' }, MM.renderBody);

    container.setAttribute('style', 'width:37cqh;height:37cqh');

    for (let number of [1, 2, 3, 4, 5, 6]) {
      let item = DOM({
        domaudio: domAudioPresets.smallButton,
        style: `map-item-${number}`,
        data: { player: 0, position: number },
        event: [
          'click',
          async () => {
            await App.api.request(App.CURRENT_MM, 'position', {
              id: MM.id,
              position: item.dataset.player == App.storage.data.id ? 0 : item.dataset.position,
            });
          },
        ],
      });

      MM.renderBody.append(item);
    }

    return container;
  }

  static async select(data) {
    let findOldPlayer = document.getElementById(`PLAYER${data.userId}`);
    
    if (!findOldPlayer || !MM.lobbyHeroes) {
      MM.pendingHeroEvents.set(`${data.id}:${data.userId}`, data);
      
      MM.schedulePendingHeroFlush(data.id);
      return;
    }
    
    if (!data.silent) {
      Sound.play(SOUNDS_LIBRARY[`HERO_${data.heroId}_revive_${data.sound}`], {
        id: `heroSound_${data.heroId}_${data.sound}`,
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
    }

    if (!data.noAnimate && MM.lobbyPlayerAnimate) {
      MM.lobbyPlayerAnimate.cancel();
    }

    if (!data.noTimer) {
      await Timer.start(data.id, '', () => {
        MM.close();
  
        MM.searchActive(true);
      });
  
      Timer.sfxOptions.play = App.storage.data.id == data.target;
    }

    let skinId = 1;

    if (findOldPlayer) {
      findOldPlayer.dataset.hero = data.heroId;

      if ('skin' in data && data.skin) {
        skinId = data.skin;
      }

      findOldPlayer.dataset.skin = skinId;

      if ('frameId' in data) {
        findOldPlayer.firstChild.children[1].style.backgroundImage = `url(content/frames/${data.frameId}.png)`;
      }

      findOldPlayer.firstChild.style.backgroundImage = `url(content/hero/${data.heroId}/${skinId}.webp)`;

      const rankContainer = findOldPlayer.firstChild.querySelector('.rank');
      Rank.setRankReady(rankContainer);

      if (data.banHeroId) {
        findOldPlayer.firstChild.lastChild.style.backgroundImage = `url(content/hero/${data.banHeroId}/1.webp)`;

        findOldPlayer.firstChild.lastChild.style.display = 'block';
      } else {
        findOldPlayer.firstChild.lastChild.style.display = 'none';
      }
    }

    if (!data.noAnimate && data.target != 0) {
      let findPlayer = document.getElementById(`PLAYER${data.target}`);

      if (findPlayer) {
        MM.lobbyPlayerAnimate = findPlayer.animate(
          { transform: ['scale(1)', 'scale(0.8)', 'scale(1.2)', 'scale(1)'] },
          { duration: 500, iterations: Infinity, easing: 'ease-in-out' },
        );
      }
    }

    for (let child of MM.lobbyHeroes.children) {
      if (child.dataset.ban == data.userId) {
        child.dataset.ban = 0;

        child.style.filter = 'none';

        child.style.backgroundColor = 'rgba(255, 255, 255, 0)';

        break;
      }
    }

    let findHero = document.getElementById(`HERO${data.heroId}`);

    if (findHero) {
      findHero.style.filter = 'grayscale(100%)';

      findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';

      findHero.onclick = false;

      findHero.oncontextmenu = false;
    }

    if (data.banHeroId) {
      let findHero = document.getElementById(`HERO${data.banHeroId}`);

      if (findHero) {
        findHero.style.filter = 'grayscale(100%)';

        findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';

        findHero.onclick = false;

        findHero.oncontextmenu = false;
      }
    }

    if (App.storage.data.id == data.target) {
      MM.lobbyConfirm.style.opacity = 1;
    } else {
      MM.lobbyConfirm.style.opacity = 0;
    }
  }
  
  static syncHeroes(data) {
    if (!data || `${data.id}` != `${MM.id}`) {
      return;
    }
    
    if (!MM.lobbyHeroes || !document.getElementById(`PLAYER${App.storage.data.id}`)) {
      let retry = data._retry || 0;
      
      if (retry < 20) {
        setTimeout(() => MM.syncHeroes({ ...data, _retry: retry + 1 }), 150);
      }
      
      return;
    }
    
    if (!Array.isArray(data.selected)) {
      data.selected = new Array();
    }
    
    for (let item of data.selected) {
      MM.select({
        ...item,
        id: data.id,
        target: data.target,
        sound: 1,
        silent: true,
        noTimer: true,
        noAnimate: true,
      });
    }
    
    if (App.storage.data.id == data.target) {
      MM.lobbyConfirm.style.opacity = 1;
    } else {
      MM.lobbyConfirm.style.opacity = 0;
    }
  }
  
  static flushPendingHeroEvents(lobbyId = MM.id) {
    for (let [key, payload] of MM.pendingHeroEvents) {
      if (`${payload.id}` != `${lobbyId}`) {
        continue;
      }
      
      MM.pendingHeroEvents.delete(key);
      MM.select(payload);
    }
  }
  
  static schedulePendingHeroFlush(lobbyId = MM.id) {
    if (MM.pendingHeroFlushTimer) {
      return;
    }
    
    MM.pendingHeroFlushTimer = setTimeout(() => {
      MM.pendingHeroFlushTimer = 0;
      MM.flushPendingHeroEvents(lobbyId);
      
      if (MM.pendingHeroEvents.size) {
        MM.schedulePendingHeroFlush(lobbyId);
      }
    }, 200);
  }

  static finish(data) {
    Timer.stop();
    MM.close();

    MM.isInTambur = false;

    try {
      Settings.ApplySettings();
    } catch (e) {
      App.error(e);
    }
    /*
        if (data.mode == 3) {
            ARAM.briefing(data.hero, data.role, () => {
                MM.gameRunEvent();
                PWGame.start(data.key, MM.gameStopEvent);
            });
        } else {
            MM.gameRunEvent();
            PWGame.start(data.key, MM.gameStopEvent);
        }
        */

    MM.gameRunEvent();

    PWGame.start(data.key, MM.gameStopEvent);
  }

  static eventChangeHero(data) {
    let findPlayer = document.getElementById(`PLAYER${data.id}`),
      skinId = 1;

    if ('skin' in data && data.skin) {
      skinId = data.skin;
    }

    let url = `url(content/hero/${data.heroId}/${skinId}.webp)`;

    if (findPlayer) {
      if ('frameId' in data) {
        findPlayer.firstChild.children[1].style.backgroundImage = `url(content/frames/${data.frameId}.png)`;
      }

      findPlayer.dataset.hero = data.heroId;

      findPlayer.dataset.skin = skinId;

      findPlayer.firstChild.style.backgroundImage = url;

      const rankContainer = findPlayer.firstChild.querySelector('.rank');
      Rank.updateRankContainer(rankContainer, data.rating);
    }

    if (MM.renderBody) {
      for (let item of MM.renderBody.children) {
        if (item.dataset.player == data.id) {
          item.style.backgroundImage = url;

          break;
        }
      }
    }
  }

  static eventBanHero(data) {
    let findPlayer = document.getElementById(`PLAYER${data.id}`);

    if (findPlayer) {
      findPlayer.firstChild.lastChild.style.backgroundImage = `url(content/hero/${data.heroId}/1.webp)`;

      findPlayer.firstChild.lastChild.style.display = 'block';
    }
  }

  static chat(data) {
    let message = DOM(`${data.message}`);

    if (App.isAdmin(data.id)) {
      message.style.color = 'rgba(255, 103, 90, 0.9)';
    } else if (data.id && 'commander' in MM.lobbyUsers[data.id]) {
      message.style.color = 'rgba(255,215,0,0.9)';
    }

    let item = DOM({ style: 'mm-lobby-middle-chat-body-item' });

    if (data.id) {
      item.append(DOM({ tag: 'div' }, `${MM.lobbyUsers[data.id].nickname}:`));
    }

    item.append(message);

    MM.chatBody.append(item);

    item.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
}
