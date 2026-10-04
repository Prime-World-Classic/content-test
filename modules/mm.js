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
  
  static partyMembersCount = 1;

  static isInTambur = false;

  static preview = false;

  static lobbySkinRequestId = 0;

  static lobbyVoiceResizeObserver = null;

  static lobbyVoiceResizeHandler = null;

  static lobbyPositionCooldownMs = 4000;
  
  static isInBattle = false;
  
  static skipVoiceRestoreOnClose = false;

  static gameRunEvent() {
    if (Settings.settings?.voiceInWindow && !Settings.settings?.novoice) {
      Settings.setVoiceWindowCrashGuard(true);
    }
    MM.isInBattle = true;
    Castle.toggleRender(Castle.RENDER_LAYER_GAME, false);
    Castle.toggleMusic(Castle.MUSIC_LAYER_GAME, false);
    document.body.style.display = 'none';
    NativeAPI.openVoiceWindow();
    NativeAPI.window.hide();

    NativeAPI.app.unregisterGlobalHotKey(NativeAPI.altEnterShortcut);
  }

  static gameStopEvent() {
    Settings.setVoiceWindowCrashGuard(false);
    MM.isInBattle = false;
    Castle.toggleRender(Castle.RENDER_LAYER_GAME, true);
    Castle.toggleMusic(Castle.MUSIC_LAYER_GAME, true);
    document.body.style.display = 'block';

    if (NativeAPI.status) {
      try {
        Settings.ApplySettings();

        NativeAPI.closeVoiceWindow();
        NativeAPI.window.show();
        NativeAPI.app.registerGlobalHotKey(NativeAPI.altEnterShortcut);
      } catch (e) {
        App.error(e);
      }
    }

    View.show('castle', { preserveMode: true });

    Voice.restoreSuspendedBattlePeers();
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
    MM.lobbySkinRequestId++;
    MM.lobbyVoiceResizeObserver?.disconnect();
    MM.lobbyVoiceResizeObserver = null;
    if (MM.lobbyVoiceResizeHandler) {
      window.removeEventListener('resize', MM.lobbyVoiceResizeHandler);
      MM.lobbyVoiceResizeHandler = null;
    }
    clearInterval(MM.lobbyPreviewInterval);
    MM.lobbyPreviewInterval = null;
    if (MM.preview) {
      Timer.stop();
      MM.id = '';
      MM.preview = false;
    }
    MM.lobbyTabObserver?.disconnect();
    MM.lobbyTabObserver = null;
    MM.lobbyNameObserver?.disconnect();
    MM.lobbyNameObserver = null;
    MM.lobbyScrollObserver?.disconnect();
    MM.lobbyScrollObserver = null;
    Sound.stop('tambur');

    Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, true);

    MM.isInTambur = false;
    
    MM.pendingHeroEvents.clear();
    
    if (MM.pendingHeroFlushTimer) {
      clearTimeout(MM.pendingHeroFlushTimer);
      MM.pendingHeroFlushTimer = 0;
    }
    
    if (!MM.skipVoiceRestoreOnClose) {
      Voice.restoreSuspendedBattlePeers();
    }
    
    MM.skipVoiceRestoreOnClose = false;

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

    if (!PWGame.isUpToDate || !PWGame.isValidated) {
      MM.button.firstChild.innerText = Lang.text('mmCheck');
    }

    try {
      if (!MM.active) {
        PWGame.gameConnectionTestIsActive = true;

        await PWGame.check();

        await PWGame.checkUpdates();

        PWGame.gameConnectionTestIsActive = false;
      }
    } catch (error) {
      PWGame.gameConnectionTestIsActive = false;

      if (!PWGame.isUpToDate || !PWGame.isValidated) {
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
          
          MM.id = request.id;

          MM.gameRunEvent();

          PWGame.reconnect(request.id, MM.gameStopEvent, request.ips, request.port);

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
    
    try {
      Voice.destroyTamburCallsOnly();
    } catch (error) {
      console.log(error);
    }

    if (canConfirm) {
      let button = DOM(
        {
          style: 'mm-ready-button',
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            async () => {
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
    MM.lobbySkinView(heroId);
    MM.lobbyTabObserver?.disconnect();
    MM.lobbyTabObserver = null;
    if (MM.lobbyBuildField.firstChild) {
      MM.lobbyBuildField.firstChild.remove();
    }

    while (MM.lobbyBuildTab.firstChild) {
      MM.lobbyBuildTab.firstChild.remove();
    }

    if (MM.preview) {
      const renderPreviewBuild = (offset) => {
        const previewBuild = Array.from({ length: 36 }, (_, index) => (index + offset) % 36 + 1);
        MM.lobbyBuildField.replaceChildren(Build.viewModel(previewBuild, false, false));
      };
      renderPreviewBuild(0);
      const nameKeys = ['mmPreviewBuildMain', 'mmPreviewBuildLong', 'mmPreviewBuildTeam', 'mmPreviewBuildAttack', 'mmRandomBuild'];
      nameKeys.forEach((key, index) => {
        const isRandom = key === 'mmRandomBuild';
        const tab = DOM({
          tag: 'button',
          type: 'button',
          style: isRandom ? 'lobby-build-tab-random' : 'lobby-build-tab-choice',
          ariaPressed: index === 0 ? 'true' : 'false',
          event: ['click', () => {
            for (const child of MM.lobbyBuildTab.children) {
              child.classList.toggle('lobby-build-tab--active', child === tab);
              child.setAttribute('aria-pressed', child === tab ? 'true' : 'false');
            }
            renderPreviewBuild(isRandom ? Math.floor(Math.random() * 36) : index * 3);
          }],
        }, DOM({ tag: 'span' }, Lang.text(key)));
        tab.classList.toggle('lobby-build-tab--active', index === 0);
        MM.lobbyBuildTab.append(tab);
      });
      MM.watchLobbyBuildTabs();
      return;
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
        DOM({ tag: 'span' }, build.name),
      );
      tab.title = build.name;

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

    const randomLabel = DOM({ tag: 'span' }, Lang.text('mmRandomBuild'));
    let notify = true,
      random = DOM(
        {
          tag: 'button',
          type: 'button',
          style: 'lobby-build-tab-random',
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            async () => {
              if (notify) {
                randomLabel.textContent = Lang.text('mmOverwriteBuild');

                notify = false;

                return;
              }

              randomLabel.textContent = Lang.text('mmGenerating');

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

              randomLabel.textContent = Lang.text('mmRandomBuild');
            },
          ],
        },
        randomLabel,
      );
    MM.lobbyBuildTab.append(random);
    MM.watchLobbyBuildTabs();
  }

  static setLobbySkinAvatar(heroId, skinId) {
    const player = document.getElementById(`PLAYER${MM.lobbyUserId}`);
    if (!player || (!MM.preview && Number(player.dataset.hero) !== Number(heroId))) return;
    player.dataset.hero = heroId;
    player.dataset.skin = skinId;
    player.firstChild.style.backgroundImage = `url(content/hero/${heroId}/${skinId}.webp)`;
    player.querySelector('.mm-lobby-hero-tooltip').textContent = Lang.heroName(heroId, skinId);
    if (MM.preview) {
      MM.lobbyUsers[MM.lobbyUserId].hero = heroId;
      for (const point of MM.renderBody?.children || []) {
        if (Number(point.dataset.player) === MM.lobbyUserId) {
          point.style.backgroundImage = player.firstChild.style.backgroundImage;
        }
      }
    }
  }

  static showLobbyChoiceTooltip(tooltip, choice, scroller, name) {
    tooltip.textContent = name;
    tooltip.hidden = false;
    const bounds = scroller.getBoundingClientRect();
    const rect = choice.getBoundingClientRect();
    const column = tooltip.parentElement.getBoundingClientRect();
    const width = tooltip.getBoundingClientRect().width;
    const center = Math.max(bounds.left + width / 2 + 2,
      Math.min(rect.left + rect.width / 2, bounds.right - width / 2 - 2));
    tooltip.style.left = `${center - column.left}px`;
    tooltip.style.top = `${Math.min(rect.bottom, bounds.bottom) - column.top + 4}px`;
  }

  static async lobbySkinView(heroId) {
    const body = MM.lobbySkinBody;
    if (!body) return;
    const tooltip = MM.lobbySkinTooltip;
    tooltip.hidden = true;
    const requestId = ++MM.lobbySkinRequestId;
    const isCurrent = () => requestId === MM.lobbySkinRequestId && MM.lobbySkinBody === body &&
      Number(MM.targetHeroId) === Number(heroId) && MM.isInTambur;
    const status = DOM({ style: 'mm-lobby-skin-status', role: 'status' }, Lang.text('mmSkinsLoading'));
    body.replaceChildren(status);
    body.setAttribute('aria-busy', 'true');
    try {
      const hero = MM.lobbyHeroesData.find((item) => Number(item.id) === Number(heroId));
      const skin = MM.preview ? { list: hero?.previewSkins || [1], target: hero?.skin || 1 } :
        (await App.api.request('build', 'data', { heroId, target: 0 })).hero.skin;
      if (!isCurrent()) return;
      const skins = [...new Set(skin.list.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
      body.replaceChildren();
      body.setAttribute('aria-busy', 'false');
      if (!skins.length) {
        body.append(DOM({ style: 'mm-lobby-skin-status', role: 'status' }, Lang.text('mmSkinsEmpty')));
        return;
      }
      let selectedSkin = skins.includes(Number(skin.target)) ? Number(skin.target) : skins[0];
      const renderSelection = () => {
        for (const button of body.querySelectorAll('.mm-lobby-skin-choice')) {
          button.setAttribute('aria-pressed', Number(button.dataset.skin) === selectedSkin ? 'true' : 'false');
        }
      };
      for (const skinId of skins) {
        const name = Lang.heroName(heroId, skinId);
        const button = DOM({
          tag: 'button', type: 'button', style: 'mm-lobby-skin-choice',
          data: { skin: skinId }, ariaLabel: name,
          domaudio: domAudioPresets.smallButton,
          event: ['click', async () => {
            if (skinId === selectedSkin) return;
            const buttons = [...body.querySelectorAll('.mm-lobby-skin-choice')];
            for (const item of buttons) item.disabled = true;
            body.setAttribute('aria-busy', 'true');
            try {
              if (MM.preview) hero.skin = skinId;
              else await Build.changeSkinForHero(heroId, skinId);
              if (!isCurrent()) return;
              selectedSkin = skinId;
              renderSelection();
              MM.setLobbySkinAvatar(heroId, skinId);
              status.remove();
            } catch (error) {
              if (!isCurrent()) return;
              status.textContent = Lang.text('mmSkinSaveError');
              body.append(status);
              App.error(error);
            } finally {
              if (isCurrent()) {
                for (const item of buttons) item.disabled = false;
                body.setAttribute('aria-busy', 'false');
                MM.updateLobbyScrollbars();
              }
            }
          }],
        });
        button.setAttribute('aria-describedby', tooltip.id);
        const showTooltip = () => MM.showLobbyChoiceTooltip(tooltip, button, body, name);
        button.addEventListener('mouseenter', showTooltip);
        button.addEventListener('focus', showTooltip);
        button.addEventListener('mouseleave', () => { tooltip.hidden = true; });
        button.addEventListener('blur', () => { tooltip.hidden = true; });
        button.style.backgroundImage = `url(content/hero/${heroId}/${skinId}.webp)`;
        body.append(button);
      }
      renderSelection();
      MM.setLobbySkinAvatar(heroId, selectedSkin);
      MM.updateLobbyScrollbars();
    } catch (error) {
      if (!isCurrent()) return;
      body.setAttribute('aria-busy', 'false');
      status.textContent = Lang.text('mmSkinsLoadError');
      body.append(DOM({
        tag: 'button', type: 'button', style: 'mm-lobby-skin-retry',
        event: ['click', () => MM.lobbySkinView(heroId)],
      }, Lang.text('mmSkinsRetry')));
      MM.updateLobbyScrollbars();
      App.error(error);
    }
  }

  static filterLobbyHeroes(query) {
    const variants = View.getLayoutAwareSearchVariants(query);
    let groupVisible = false;
    let visibleCount = 0;
    // Walk backwards so each heading follows the visibility of its own hero group.
    for (const child of [...MM.lobbyHeroes.children].reverse()) {
      if (child.classList.contains('mm-lobby-middle-hero-item')) {
        const name = child.dataset.searchName;
        const words = View.splitSearchWords(name);
        child.hidden = variants.length > 0 && !variants.some((variant) => View.isFuzzySearchVariantMatch(name, words, variant));
        if (!child.hidden) {
          groupVisible = true;
          visibleCount++;
        }
      } else if (child.classList.contains('mm-lobby-middle-hero-line')) {
        child.hidden = !groupVisible;
        groupVisible = false;
      }
    }
    MM.lobbyHeroes.querySelector('.mm-lobby-hero-empty').hidden = visibleCount > 0;
    MM.updateLobbyScrollbars();
  }

  static updateLobbyScrollbars() {
    for (const body of [MM.chatBody, MM.lobbySkinBody, MM.lobbyHeroScroll]) {
      if (body?.clientHeight) {
        body.classList.toggle('mm-lobby-scroll--fits', body.scrollHeight <= body.clientHeight + 1);
      }
    }
  }

  static setLobbyHeroAvailability(hero, ownerId = 0, banned = false) {
    const taken = Number(ownerId) > 0 || banned;
    const unavailable = banned || (taken && Number(ownerId) !== Number(MM.lobbyUserId));
    hero.dataset.ban = ownerId;
    hero.classList.toggle('mm-lobby-middle-hero-item--taken', taken);
    hero.classList.toggle('mm-lobby-middle-hero-item--unavailable', unavailable);
    hero.setAttribute('aria-disabled', String(unavailable));
  }

  static watchLobbyBuildTabs() {
    const update = (tab) => {
      const label = tab.querySelector('span');
      if (!label) return;
      const style = getComputedStyle(tab);
      const available = tab.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const overflow = Math.max(0, label.scrollWidth - available);
      tab.style.setProperty('--tab-scroll-distance', `${overflow}px`);
      tab.classList.toggle('lobby-build-tab--overflowing', overflow > 1);
      tab.title = label.textContent;
    };
    for (const tab of MM.lobbyBuildTab.children) {
      update(tab);
      if (typeof ResizeObserver !== 'undefined') {
        MM.lobbyTabObserver ??= new ResizeObserver((entries) => {
          for (const entry of entries) update(entry.target);
        });
        MM.lobbyTabObserver.observe(tab);
      }
    }
  }

  static watchLobbyNames() {
    MM.lobbyNameObserver?.disconnect();
    const update = (name) => {
      const label = name.firstElementChild;
      if (!label) return;
      const overflow = Math.max(0, label.scrollWidth - name.clientWidth);
      name.style.setProperty('--nickname-scroll-distance', `${overflow}px`);
      name.classList.toggle('mm-lobby-header-team-player-name--overflowing', overflow > 1);
    };
    const names = MM.view.querySelectorAll('.mm-lobby-header-team-player-name');
    for (const name of names) update(name);
    if (typeof ResizeObserver !== 'undefined') {
      MM.lobbyNameObserver = new ResizeObserver((entries) => {
        for (const entry of entries) update(entry.target);
      });
      for (const name of names) MM.lobbyNameObserver.observe(name);
    }
  }

  static setLobbySelection(target) {
    MM.view.querySelectorAll('.mm-lobby-header-team-player--active').forEach((player) =>
      player.classList.remove('mm-lobby-header-team-player--active'));
    document.getElementById(`PLAYER${target}`)?.classList.add('mm-lobby-header-team-player--active');
    MM.lobbyConfirm.disabled = App.storage.data.id != target;
  }

  static async lobby(data, { preview = false } = {}) {
    MM.lobbyVoiceResizeObserver?.disconnect();
    MM.lobbyVoiceResizeObserver = null;
    if (MM.lobbyVoiceResizeHandler) {
      window.removeEventListener('resize', MM.lobbyVoiceResizeHandler);
      MM.lobbyVoiceResizeHandler = null;
    }
    clearInterval(MM.lobbyPreviewInterval);
    MM.lobbyPreviewInterval = null;
    MM.preview = preview;
    MM.lobbyLaneNoticeNextAt = 0;
    MM.renderBody = false;
    MM.isInTambur = true;
    Rank._names = null;

    MM.targetBanHeroId = 0;

    if (!preview && !MM.hero) {
      MM.hero = await App.api.request('build', 'heroAll');
    }

    const heroes = preview ? data.previewHeroes : MM.hero;
    const currentUserId = preview ? data.previewUserId : App.storage.data.id;
    MM.lobbyUserId = currentUserId;
    MM.lobbyHeroesData = heroes;

    // Enemy identities must not reach the lobby DOM or its retained user state.
    const ownTeam = data.users[currentUserId].team;
    data = { ...data, users: Object.fromEntries(Object.entries(data.users).map(([id, user]) =>
      [id, user.team == ownTeam ? user : { ...user, nickname: '' }])) };

    if (!MM.id) {
      MM.id = data.id;
    }

    if (!preview) MM.searchActive(false);

    Voice.infoPanel.classList.remove('left-offset-with-shift');
    Voice.infoPanel.classList.add('left-offset-no-shift');

    View.castleQuestBody.classList.remove('left-offset-no-shift');
    View.castleQuestBody.classList.add('left-offset-with-shift');

    MM.lobbyUsers = data.users;

    MM.targetHeroId = data.users[currentUserId].hero;

    let lobbyBuild = DOM({ style: 'mm-lobby-middle-build' });

    MM.lobbyBuildField = DOM({ style: 'mm-lobby-build-field' });

    MM.lobbyBuildTab = DOM({ style: 'lobby-build-tab' });
    MM.lobbySkinBody = DOM({ style: ['mm-lobby-skins', 'mm-lobby-scroll'], role: 'group', ariaLabel: Lang.text('mmSelectSkin') });
    const skinTooltip = DOM({ id: 'mm-lobby-skin-tooltip', style: 'mm-lobby-choice-tooltip', role: 'tooltip', hidden: true });
    MM.lobbySkinTooltip = skinTooltip;
    MM.lobbySkinBody.addEventListener('scroll', () => { skinTooltip.hidden = true; });

    MM.lobbyConfirm = DOM(
      {
        tag: 'button',
        type: 'button',
        style: 'mm-lobby-confirm',
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          async () => {
            if (MM.preview) return;
            try {
              await App.api.request(App.CURRENT_MM, 'hero', {
                id: data.id,
                heroId: MM.targetHeroId,
                banHeroId: MM.targetBanHeroId,
              });
            } catch (error) {
              MM.lobbyConfirm.innerText = error;

              setTimeout(() => {
                MM.lobbyConfirm.innerText = Lang.text('mmConfirmChoice');
              }, 1500);
            }
          },
        ],
      },
      Lang.text('mmConfirmChoice'),
    );

    MM.lobbyConfirm.disabled = currentUserId != data.target;

    lobbyBuild.append(
      DOM({ style: 'mm-lobby-skin-title' }, Lang.text('mmSelectSkin')),
      MM.lobbySkinBody,
      DOM({ style: 'mm-lobby-section-title' }, Lang.text('mmHeroBuild')),
      MM.lobbyBuildField,
      MM.lobbyBuildTab,
      skinTooltip,
    );

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

      const isAlly = data.users[key].team == ownTeam;
      let name = isAlly
        ? DOM({ style: 'mm-lobby-header-team-player-name', title: data.users[key].nickname },
          DOM({ tag: 'span' }, `${data.users[key].nickname}`))
        : DOM({ style: 'mm-lobby-header-team-player-name', ariaHidden: 'true' });

      let rank = Rank.createRankNode(data.users[key].rating);

      hero.append(rank, DOM({ style: 'mm-frame' }));
      hero.append(
        DOM({ style: 'mm-lobby-selection-comet' }),
        DOM({ tag: 'span', style: 'mm-lobby-hero-tooltip' },
          data.users[key].hero ? Lang.heroName(data.users[key].hero, 1) : ''),
      );

      let banhero = DOM({ style: 'mm-player-ban' });

      if (data.banhero && data.users[key].banhero) {
        banhero.style.backgroundImage = `url(content/hero/${data.users[key].banhero}/1.webp)`;

        banhero.style.display = 'block';
      }

      hero.append(banhero);

      hero.style.backgroundImage = data.users[key].hero
        ? `url(content/hero/${data.users[key].hero}/1.webp)`
        : `url(content/hero/empty.webp)`;

      player.append(hero, name);

      if (key == data.target) {
        player.classList.add('mm-lobby-header-team-player--active');
      }

      if (isAlly) {
        leftTeam.append(player);

        player.onclick = () => {
          if (MM.preview) return;
          if (player.dataset.hero) {
            Build.view(key, player.dataset.hero, data.users[key].nickname, false);
          }
        };
      } else {
        rank.firstChild.innerText = 1100;

        rank.firstChild.style.opacity = 0;

        rightTeam.append(player);
      }
    }

    MM.lobbyHeroes = DOM({ style: 'mm-lobby-middle-hero' });
    MM.lobbyHeroScroll = DOM({ style: ['mm-lobby-hero-scroll', 'mm-lobby-scroll'] }, MM.lobbyHeroes);
    const heroTooltip = DOM({ id: 'mm-lobby-choice-tooltip', style: 'mm-lobby-choice-tooltip', role: 'tooltip', hidden: true });
    MM.lobbyHeroScroll.addEventListener('scroll', () => { heroTooltip.hidden = true; });
    const heroSearch = DOM({
      tag: 'input',
      type: 'search',
      style: 'mm-lobby-hero-search',
      placeholder: Lang.text('mmHeroSearch'),
      ariaLabel: Lang.text('mmHeroSearch'),
      event: ['input', () => {
        heroTooltip.hidden = true;
        MM.filterLobbyHeroes(heroSearch.value);
      }],
    });
    heroSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && heroSearch.value) {
        event.stopPropagation();
        heroSearch.value = '';
        MM.filterLobbyHeroes('');
      }
    });

    if (data.banhero) {
      MM.lobbyHeroes.append(DOM({ style: 'mm-lobby-middle-hero-prompt' }, Lang.text('mmMouseControls')));
    }

    //let preload = new PreloadImages(MM.lobbyHeroes);
    
    View.loadCastleHeroSelectedList();
    View.loadCastleHeroListNames();
    const selectedHeroListId = preview ? data.previewHeroList.id : View.getCastleHeroTamburListId(heroes);
    const selectedHeroListMask = selectedHeroListId > 0 ? 1 << (selectedHeroListId - 1) : 0;

    let filteredHeroes = [];
    const allowedHeroes = Array.isArray(data.hero) && data.hero.length ? new Set(data.hero.map(String)) : null;
    for (let item of heroes) {
      if (!item.id) {
        continue;
      }

      if (allowedHeroes && !allowedHeroes.has(String(item.id))) continue;
      filteredHeroes.push(item);
    }
    filteredHeroes.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    
    const appendHeroCard = (item) => {
      const heroName = Lang.heroName(item.id);
      let hero = DOM({
        id: `HERO${item.id}`,
        data: { ban: 0, searchName: `${heroName} ${item.name || ''}`.toLowerCase() },
        style: 'mm-lobby-middle-hero-item',
        role: 'button',
        tabIndex: 0,
        ariaLabel: heroName,
      });

      hero.style.backgroundImage = `url("content/hero/${item.id}/1.webp")`; // ${( item.skin ? item.skin : 1)}

      hero.onclick = async () => {
        if (hero.classList.contains('mm-lobby-middle-hero-item--unavailable')) return;
        if (MM.preview) {
          const previousHero = MM.lobbyHeroes.querySelector('.mm-lobby-middle-hero-item--selected');
          if (previousHero && Number(previousHero.dataset.ban) === Number(MM.lobbyUserId)) {
            MM.setLobbyHeroAvailability(previousHero);
          }
          MM.setLobbyHeroAvailability(hero, MM.lobbyUserId);
        }
        MM.targetHeroId = item.id;
        MM.lobbyHeroes.querySelector('.mm-lobby-middle-hero-item--selected')?.classList.remove('mm-lobby-middle-hero-item--selected');
        hero.classList.add('mm-lobby-middle-hero-item--selected');

        if (MM.preview) {
          MM.setLobbySkinAvatar(item.id, item.skin || 1);
          MM.lobbyBuildView(item.id);
          return;
        }

        await App.api.request(App.CURRENT_MM, 'eventChangeHero', {
          id: MM.id,
          heroId: item.id,
        });

        MM.lobbyBuildView(MM.targetHeroId);
      };

      hero.oncontextmenu = async () => {
        if (MM.preview || !data.banhero || hero.classList.contains('mm-lobby-middle-hero-item--unavailable')) return;
        await App.api.request(App.CURRENT_MM, 'eventBanHero', {
          id: MM.id,
          heroId: item.id,
        });

        MM.targetBanHeroId = item.id;
      };

      let rank = Rank.createRankNode(item.rating, { withIcon: false });

      hero.append(rank);
      hero.setAttribute('aria-describedby', heroTooltip.id);
      const positionTooltip = () => {
        MM.showLobbyChoiceTooltip(heroTooltip, hero, MM.lobbyHeroScroll, heroName);
      };
      hero.addEventListener('mouseenter', positionTooltip);
      hero.addEventListener('focus', positionTooltip);
      hero.addEventListener('mouseleave', () => { heroTooltip.hidden = true; });
      hero.addEventListener('blur', () => { heroTooltip.hidden = true; });
      hero.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          hero.click();
        }
      });
      hero.classList.toggle('mm-lobby-middle-hero-item--selected', item.id === MM.targetHeroId);

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
        const emptyIconLeft = DOM({ style: ['mm-lobby-middle-hero-line-icon', 'mm-lobby-middle-hero-line-icon--list'] });
        emptyIconLeft.style.backgroundImage = 'url(content/icons/favouriteHero.png)';
        emptyIconLeft.style.opacity = 1;
        const emptyIconRight = DOM({ style: ['mm-lobby-middle-hero-line-icon', 'mm-lobby-middle-hero-line-icon--list'] });
        emptyIconRight.style.backgroundImage = 'url(content/icons/favouriteHero.png)';
        emptyIconRight.style.opacity = 1;
        MM.lobbyHeroes.append(
          DOM(
            { style: 'mm-lobby-middle-hero-line' },
            emptyIconLeft,
            DOM({ style: 'mm-lobby-middle-hero-line-name' }, preview ? data.previewHeroList.name : View.getCastleHeroListName(selectedHeroListId)),
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
    MM.lobbyHeroes.append(DOM({ style: 'mm-lobby-hero-empty', hidden: true }, Lang.text('mmHeroNoResults')));
    MM.filterLobbyHeroes('');

    let info = DOM({ style: 'lobby-timer' });

    if (preview) {
      Timer.stop();
      let seconds = 30;
      Timer.message = '';
      Timer.sfxOptions.play = currentUserId == data.target;
      Timer.render(seconds);
      MM.lobbyPreviewInterval = setInterval(() => {
        seconds = seconds > 0 ? seconds - 1 : 30;
        if (seconds === 30) Timer.sfxOptions.lastSecond = -1;
        Timer.render(seconds);
        Timer.sfx(seconds);
      }, 1000);
    } else {
      await Timer.start(data.id, '', () => {
        MM.close();
        MM.searchActive(true);
      });
      Timer.sfxOptions.play = currentUserId == data.target;
    }

    info.append(
      DOM({ style: 'mm-lobby-timer-ornament', ariaHidden: 'true' },
        DOM({ style: 'mm-lobby-timer-ornament-wing' }),
        DOM({ style: 'mm-lobby-timer-ornament-wing' })),
      Timer.body, MM.lobbyConfirm,
    );

    MM.chatBody = DOM({ style: ['mm-lobby-middle-chat-body', 'mm-lobby-scroll'] });

    const factionOutline = (side) => {
      const label = Lang.text(side === 'docts' ? 'mmSideDocts' : 'mmSideAdornia');
      return DOM({
        style: ['mm-lobby-faction-outline', `mm-lobby-faction-outline--${side}`],
        tabIndex: 0,
        ariaLabel: label,
      },
      DOM({ style: 'mm-lobby-faction-detail', ariaHidden: 'true' },
        ...Array.from({ length: side === 'docts' ? 8 : 5 }, (_, index) => {
          const detail = DOM({ style: 'mm-lobby-faction-petal' });
          detail.style.setProperty('--petal-index', index);
          return detail;
        })),
      DOM({ style: 'mm-lobby-map-tooltip' }, label));
    };

    let chatInput = DOM({
      tag: 'input',
      style: 'mm-lobby-middle-chat-button',
      placeholder: Lang.text('mmChatPlaceholder'),
    });

    chatInput.addEventListener('keyup', async (event) => {
      if (!App.isEnterKey(event)) return;

      if (MM.preview) {
        chatInput.value = '';
        return;
      }

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
          DOM({ style: 'mm-lobby-section-title' }, Lang.text(data.mode == 0 ? 'mmSelectPositions' : 'mmLobbyChat')),
          DOM({ style: 'mm-lobby-middle-chat-map' },
            ...(data.mode == 0 ? [
              factionOutline('docts'),
              MM.renderMap(data.users[currentUserId].team),
              factionOutline('adornia'),
            ] : [])),
          ...(data.mode == 0 ? [DOM({ style: 'mm-lobby-map-caption' }, Lang.text('mmMapPositionHint'))] : []),
          MM.chatBody,
          chatInput,
        ),
        lobbyBuild,
        DOM({ style: 'mm-lobby-middle-hero-column' },
          DOM({ style: ['mm-lobby-section-title', 'mm-lobby-hero-toolbar'] },
            DOM({ tag: 'span' }, Lang.text('mmSelectHero')),
            DOM({ style: 'mm-lobby-hero-search-wrap' }, heroSearch)),
          MM.lobbyHeroScroll,
          heroTooltip),
      ),
    );
    body.classList.toggle('mm-lobby--bans-hidden', !data.banhero);
    body.classList.toggle('mm-lobby--aram', Number(data.mode) === 3);

    if (preview) {
      // A visual fixture only: never create peers or request microphone access.
      const voiceBody = DOM({ style: 'voice-info-panel-body' });
      for (const key of data.map.filter((key) => data.users[key].team === ownTeam)) {
        voiceBody.append(DOM({ style: 'voice-info-panel-body-item' },
          DOM({ style: 'voice-info-panel-body-item-name' }, data.users[key].nickname),
          DOM({ style: 'voice-info-panel-body-item-status' },
            DOM({ style: 'voice-info-panel-body-item-bar' },
              DOM({ style: 'voice-info-panel-body-item-bar-level' }))),
        ));
      }
      const voicePanel = DOM({ style: ['voice-info-panel', 'mm-lobby-voice-preview'] }, voiceBody);
      voicePanel.append(DOM({
        tag: 'button', type: 'button',
        style: ['close-button', 'voice-info-panel-close'],
        ariaLabel: Lang.text('titleClose'),
        title: Lang.text('titleClose'),
        event: ['click', () => { voicePanel.hidden = true; }],
      }));
      body.querySelector('.mm-lobby-middle-chat-map').append(voicePanel);
    }

    if (!preview) {
      Sound.play(SOUNDS_LIBRARY.TAMBUR, {
        id: 'tambur',
        volume: Castle.GetVolume(Castle.AUDIO_MUSIC),
        loop: true,
      });
      Castle.toggleMusic(Castle.MUSIC_LAYER_TAMBUR, false);
    }

    MM.show(body);
    if (Number(data.mode) === 3) {
      const chatMap = body.querySelector('.mm-lobby-middle-chat-map');
      const voicePanel = preview ? body.querySelector('.mm-lobby-voice-preview') : Voice.infoPanel;
      const fitChatToVoice = () => {
        if (!chatMap.isConnected || !voicePanel?.isConnected) return;
        const voiceVisible = getComputedStyle(voicePanel).display !== 'none';
        const gap = Math.max(4, body.getBoundingClientRect().height * 0.005);
        const height = voiceVisible
          ? Math.max(0, voicePanel.getBoundingClientRect().bottom - chatMap.getBoundingClientRect().top + gap)
          : 0;
        chatMap.style.flexBasis = `${Math.ceil(height)}px`;
      };
      MM.lobbyVoiceResizeHandler = fitChatToVoice;
      window.addEventListener('resize', fitChatToVoice);
      if (typeof ResizeObserver !== 'undefined' && voicePanel) {
        MM.lobbyVoiceResizeObserver = new ResizeObserver(fitChatToVoice);
        MM.lobbyVoiceResizeObserver.observe(voicePanel);
      }
      requestAnimationFrame(fitChatToVoice);
    }
    const selectedSkin = MM.lobbySkinBody.querySelector('[aria-pressed="true"]');
    if (selectedSkin) MM.setLobbySkinAvatar(MM.targetHeroId, selectedSkin.dataset.skin);
    MM.lobbyScrollObserver?.disconnect();
    if (typeof ResizeObserver !== 'undefined') {
      MM.lobbyScrollObserver = new ResizeObserver(() => MM.updateLobbyScrollbars());
      for (const body of [MM.chatBody, MM.lobbySkinBody, MM.lobbyHeroScroll, MM.lobbyHeroes]) {
        MM.lobbyScrollObserver.observe(body);
      }
    }
    MM.updateLobbyScrollbars();
    MM.watchLobbyNames();

    if (preview) {
      MM.chat({ id: 0, message: Lang.text('mmPreviewMatchInfo') });
      MM.chat({ id: 0, message: Lang.text(data.mode == 0 ? 'mmPreviewSelectionInfo' : 'mmPreviewAramSelectionInfo') });
      MM.chat({ id: 0, type: 'quest', message: Lang.text('mmPreviewQuestInfo') });
      MM.chat({ id: currentUserId, message: Lang.text('mmPreviewPlayerMessage') });
    }
    
    if (!preview) {
      MM.flushPendingHeroEvents(data.id);
      setTimeout(() => MM.flushPendingHeroEvents(data.id), 300);
      setTimeout(() => MM.flushPendingHeroEvents(data.id), 1200);
    }

    for (let key in data.users) {
      let findHero = document.getElementById(`HERO${data.users[key].hero}`);

      if (findHero) {
        MM.setLobbyHeroAvailability(findHero, key);
      }

      if (data.banhero && data.users[key].banhero) {
        let findHero = document.getElementById(`HERO${data.users[key].banhero}`);

        if (findHero) {
          MM.setLobbyHeroAvailability(findHero, 0, true);
        }
      }
    }

    if (preview) return;

    try {
      const myId = Number(App.storage?.data?.id || 0);
      const myTeam = data?.users?.[myId]?.team;
      const allyIds = new Array();
      let list = new Array();

      for (let key of data.map) {
        const peerId = Number(key);
        if (!Number.isFinite(peerId) || peerId <= 0) {
          continue;
        }
        if (myTeam && data.users[key].team == myTeam) {
          allyIds.push(peerId);
          list.push({ id: peerId, name: data.users[key].nickname });
        }
      }
      
      Voice.suspendPeersForBattle(allyIds);

      Voice.association(App.storage.data.id, list, data.id);
    } catch (error) {
      console.log('Voice.association', error);
    }
  }

  static renderMap(team) {
    MM.renderBody = DOM({ style: team == 1 ? 'map' : 'map-reverse' });
    const map = MM.renderBody;
    let nextPositionAt = 0;
    let positionPending = false;

    let container = DOM({ style: 'mm-lobby-map-frame' }, MM.renderBody);

    const positionKeys = ['mmPositionTop', 'mmPositionMiddle', 'mmPositionBottom', 'mmPositionJungle', 'mmPositionJungle', 'mmPositionSupport'];
    for (let number of [1, 2, 3, 4, 5, 6]) {
      const label = Lang.text(positionKeys[number - 1]);
      let item = DOM({
        domaudio: domAudioPresets.smallButton,
        style: `map-item-${number}`,
        data: { player: 0, position: number },
        role: 'button',
        tabIndex: 0,
        ariaLabel: label,
        event: [
          'click',
          async () => {
            if (positionPending || Date.now() < nextPositionAt) return;
            nextPositionAt = Date.now() + MM.lobbyPositionCooldownMs;
            if (MM.preview) {
              const player = document.getElementById(`PLAYER${MM.lobbyUserId}`);
              if (!player) return;
              const selected = Number(item.dataset.player) === MM.lobbyUserId;
              for (const point of map.children) {
                if (Number(point.dataset.player) !== MM.lobbyUserId) continue;
                point.dataset.player = 0;
                point.style.backgroundImage = 'none';
                point.style.transform = 'scale(1)';
                point.setAttribute('aria-pressed', 'false');
              }
              if (!selected) {
                item.dataset.player = MM.lobbyUserId;
                item.style.backgroundImage = player.firstChild.style.backgroundImage;
                item.style.transform = 'scale(1)';
                item.setAttribute('aria-pressed', 'true');
              }
              return;
            }
            positionPending = true;
            map.setAttribute('aria-busy', 'true');
            try {
              await App.api.request(App.CURRENT_MM, 'position', {
                id: MM.id,
                position: item.dataset.player == App.storage.data.id ? 0 : item.dataset.position,
              });
            } catch (error) {
              nextPositionAt = 0;
              App.error(error);
            } finally {
              positionPending = false;
              map.setAttribute('aria-busy', 'false');
            }
          },
        ],
      });

      item.append(DOM({ style: 'mm-lobby-map-tooltip' }, label));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          item.click();
        }
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

    MM.lobbyPlayerAnimate?.cancel();
    MM.lobbyPlayerAnimate = null;
    MM.setLobbySelection(data.target);

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
      findOldPlayer.querySelector('.mm-lobby-hero-tooltip').textContent = Lang.heroName(data.heroId, skinId) || '';

      const rankContainer = findOldPlayer.firstChild.querySelector('.rank');
      Rank.setRankReady(rankContainer);

      if (data.banHeroId) {
        findOldPlayer.firstChild.lastChild.style.backgroundImage = `url(content/hero/${data.banHeroId}/1.webp)`;

        findOldPlayer.firstChild.lastChild.style.display = 'block';
      } else {
        findOldPlayer.firstChild.lastChild.style.display = 'none';
      }
    }

    for (let child of MM.lobbyHeroes.children) {
      if (child.dataset.ban == data.userId) {
        MM.setLobbyHeroAvailability(child);

        break;
      }
    }

    let findHero = document.getElementById(`HERO${data.heroId}`);

    if (findHero) {
      MM.setLobbyHeroAvailability(findHero, data.userId);

      findHero.onclick = false;

      findHero.oncontextmenu = false;
    }

    if (data.banHeroId) {
      let findHero = document.getElementById(`HERO${data.banHeroId}`);

      if (findHero) {
        MM.setLobbyHeroAvailability(findHero, 0, true);

        findHero.onclick = false;

        findHero.oncontextmenu = false;
      }
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
    
    MM.setLobbySelection(data.target);
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
    MM.skipVoiceRestoreOnClose = true;
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
                PWGame.start(data.key, MM.gameStopEvent, data.ips);
            });
        } else {
            MM.gameRunEvent();
            PWGame.start(data.key, MM.gameStopEvent, data.ips);
        }
        */

    MM.gameRunEvent();

    PWGame.start(data.key, MM.gameStopEvent, data.ips, data.port);
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
      findPlayer.querySelector('.mm-lobby-hero-tooltip').textContent = Lang.heroName(data.heroId, skinId) || '';

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

  static getLobbyMessageKind(data) {
    if (Number(data.id)) return 'player';
    if (data.type === 'yieldLane' || /(?:уступ(?:и(?:те)?|ить)\s+(?:линию|позицию)|yield\s+(?:the\s+)?(?:lane|position))/iu.test(data.message)) return 'yieldLane';
    if (data.type === 'quest' || /(?:квест|задани|убей|убить|цель|quest|kill|target)/iu.test(data.message)) return 'quest';
    return 'system';
  }

  static chat(data) {
    const kind = MM.getLobbyMessageKind(data);
    const isSystem = kind !== 'player';
    if (kind === 'yieldLane') {
      const now = Date.now();
      if (now < MM.lobbyLaneNoticeNextAt) return;
      MM.lobbyLaneNoticeNextAt = now + MM.lobbyPositionCooldownMs;
    }
    let text = `${data.message}`;
    if (isSystem) {
      text = text.replace(/^Матч найден\.\s*Подготовьтесь к бою\.$/u, Lang.text('mmPreviewMatchInfo'));
      text = text.replace(/^Уступи(?:те)? линию[.!]?$/u, Lang.text('mmYieldLane'));
    }
    if (kind === 'quest') {
      text = text.replace(/^\s*(?:Квест|Задание|Quest|Task|Заданне)\s*:\s*/iu, '');
      text = text.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase());
    }
    let message = DOM(text);

    let item = DOM({ style: 'mm-lobby-middle-chat-body-item' });
    item.classList.toggle('mm-lobby-chat-message--system', isSystem);
    item.classList.toggle('mm-lobby-chat-message--quest', kind === 'quest');

    if (isSystem) {
      item.append(DOM({ tag: 'div' }, `${Lang.text(kind === 'quest' ? 'mmChatQuest' : 'mmChatSystem')}:`));
    } else if (MM.lobbyUsers[data.id]?.nickname) {
      item.append(DOM({ tag: 'div' }, `${MM.lobbyUsers[data.id].nickname}:`));
    }

    item.append(message);

    MM.chatBody.append(item);
    MM.updateLobbyScrollbars();

    item.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
}
