import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { CastleNAVBAR } from './castleNavBar.js';
import { Window } from './window.js';
import { Rank } from './rank.js';
import { Division } from './division.js';
import { Build } from './build.js';
import { App } from './app.js';
import { Voice } from './voice.js';
import { Chat } from './chat.js';
import { PWGame } from './pwgame.js';
import { NativeAPI } from './nativeApi.js';
import { Castle } from './castle.js';
import { Settings } from './settings.js';
import { MM } from './mm.js';
import { PreloadImages } from './preloadImages.js';
import { Game } from './game.js';
import { Splash } from './splash.js';
import { Timer } from './timer.js';
import { HelpSplash } from './helpSpalsh.js';
import { Shop } from './shop.js';
import { DomAudio } from './domAudio.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { Sound } from './sound.js';
import { ensureActionBarSlotsInNativeCfg, loadKeybinds } from './keybindings/keybindings.io.js';
import { getHeroSearchAliases } from './heroSearchAliases.js';

const KEYBOARD_LAYOUT_EN_TO_RU = {
  q: 'й',
  w: 'ц',
  e: 'у',
  r: 'к',
  t: 'е',
  y: 'н',
  u: 'г',
  i: 'ш',
  o: 'щ',
  p: 'з',
  '[': 'х',
  ']': 'ъ',
  a: 'ф',
  s: 'ы',
  d: 'в',
  f: 'а',
  g: 'п',
  h: 'р',
  j: 'о',
  k: 'л',
  l: 'д',
  ';': 'ж',
  "'": 'э',
  z: 'я',
  x: 'ч',
  c: 'с',
  v: 'м',
  b: 'и',
  n: 'т',
  m: 'ь',
  ',': 'б',
  '.': 'ю',
  '/': '.',
  '`': 'ё',
};
const KEYBOARD_LAYOUT_RU_TO_EN = Object.fromEntries(Object.entries(KEYBOARD_LAYOUT_EN_TO_RU).map(([enChar, ruChar]) => [ruChar, enChar]));
const KEYBOARD_LAYOUT_GRID_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];
const KEYBOARD_LAYOUT_POSITIONS = (() => {
  const positions = new Map();
  for (let rowIndex = 0; rowIndex < KEYBOARD_LAYOUT_GRID_ROWS.length; rowIndex++) {
    const row = KEYBOARD_LAYOUT_GRID_ROWS[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const enChar = row[colIndex];
      positions.set(enChar, [rowIndex, colIndex]);
      const ruChar = KEYBOARD_LAYOUT_EN_TO_RU[enChar];
      if (ruChar) positions.set(ruChar, [rowIndex, colIndex]);
    }
  }
  return positions;
})();

export class View {
  static mmQueueMap = {};
  static _actionBarCfgEnsured = false;
  static friendsMenuItem = null;
  static hasFriendIncomingRequest = false;
  static castleActiveTab = 'heroes';
  static castleOpenedBuildHeroId = 0;
  static CASTLE_HERO_LISTS_MAX = 8;
  static CASTLE_HERO_LIST_STORAGE_KEY = 'castleHeroSelectedList';
  static CASTLE_HERO_LIST_NAMES_STORAGE_KEY = 'castleHeroListNames';
  static CASTLE_FRIEND_LISTS_MAX = 1;
  static CASTLE_FRIEND_LIST_STORAGE_KEY = 'castleFriendSelectedList';
  static castleHeroAll = [];
  static castleHeroSelectedList = 0;
  static castleHeroSearch = '';
  static castleHeroPhantomList = 0;
  static castleHeroListEditMode = '';
  static castleHeroEditSelection = new Set();
  static castleHeroListNames = {};
  static castleHeroDeleteConfirmListId = 0;
  static castleHeroPrevSelectedList = 0;
  static castleHeroListsBar = null;
  static castleHeroPinnedEditor = null;
  static castleFriendAll = [];
  static castleFriendSelectedList = 0;
  static castleFriendSearch = '';
  static castleFriendListEditMode = '';
  static castleFriendEditSelection = new Set();
  static castleFriendClearConfirm = false;
  static castleModeHeroAutoOpenHandler = null;
  static castleHeroAutoOpenModes = new Set([1, 2, 5]);
  static castleAramMode = 3;
  static castlePartyHeroRequestInFlight = false;

  static getQueue(cssKey) {
    const map = {
      pvp: 0,
      anderkrug: 1,
      cte: 2,
      m4: 3,
      'pve-ep2-red': 4,
      'custom-battle': 5,
    };
    const index = map[cssKey];
    return (View.mmQueueMap.mode && View.mmQueueMap.mode[index]) || '-';
  }

  static setFriendIncomingStatus(value) {
    View.hasFriendIncomingRequest = Boolean(value);
    View.updateFriendsMenuIncomingState();
  }

  static updateFriendsMenuIncomingState() {
    if (!View.friendsMenuItem) {
      return;
    }

    View.friendsMenuItem.classList.toggle('friends-menu-item-incoming', View.hasFriendIncomingRequest);
  }

  static isCastleModeRequireHeroSelection(mode) {
    return View.castleHeroAutoOpenModes.has(Number(mode));
  }

  static async setCastlePartyHero(playerCard, heroId, fallbackRating = 1100) {
    if (!playerCard || Number(playerCard?.dataset?.id) !== Number(App.storage?.data?.id)) {
      return false;
    }

    if (View.castlePartyHeroRequestInFlight) {
      return false;
    }

    View.castlePartyHeroRequestInFlight = true;
    try {
      await App.api.request(App.CURRENT_MM, 'heroParty', {
        id: MM.partyId,
        hero: heroId,
      });
    } catch (error) {
      App.error(error);
      return false;
    } finally {
      View.castlePartyHeroRequestInFlight = false;
    }

    const numericHeroId = Number(heroId) || 0;
    let heroSkin = 1;
    let heroRating = fallbackRating || 1100;

    if (numericHeroId > 0) {
      let heroes = MM.hero;
      if (!Array.isArray(heroes) || !heroes.length) {
        heroes = await App.api.request('build', 'heroAll');
        MM.hero = heroes;
      }

      const selectedHero = Array.isArray(heroes) ? heroes.find((item) => Number(item?.id) === numericHeroId) : null;
      if (selectedHero) {
        heroSkin = Number(selectedHero.skin) > 0 ? Number(selectedHero.skin) : 1;
        heroRating = Number(selectedHero.rating) || heroRating;
      }
    }

    const newHeroImg = numericHeroId ? `url(content/hero/${numericHeroId}/${heroSkin}.webp)` : `url(content/hero/empty.webp)`;
    playerCard.style.backgroundImage = `${newHeroImg}, url(content/hero/background.png)`;
    playerCard.style.backgroundRepeat = 'no-repeat, no-repeat';
    playerCard.style.backgroundPosition = 'center, center';
    playerCard.style.backgroundSize = 'contain, contain';

    const rankContainer = playerCard.querySelector('.rank');
    Rank.updateRankContainer(rankContainer, parseInt(heroRating, 10));

    MM.activeSelectHero = numericHeroId;
    return true;
  }

  static async openCastlePartyHeroPicker(playerCard, fallbackRating = 1100, options = {}) {
    const { notifyOnActiveSearch = true } = options;
    if (!playerCard || Number(playerCard?.dataset?.id) !== Number(App.storage?.data?.id)) {
      return;
    }
    if (MM.active) {
      if (notifyOnActiveSearch) {
        App.notify(Lang.text('youSearchFight'));
      }
      return;
    }

    let request = await App.api.request('build', 'heroAll');
    MM.hero = request;

    let bannedHeroesResponse = new Array();
    try {
      bannedHeroesResponse = await App.api.request(App.CURRENT_MM, 'bannedHeroes', { mode: CastleNAVBAR.mode });
    } catch (error) {
      bannedHeroesResponse = new Array();
    }

    const bannedHeroes = new Set(
      (Array.isArray(bannedHeroesResponse) ? bannedHeroesResponse : new Array())
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    );

    const heroList = [...request, { id: 0 }];
    let bodyHero = DOM({ style: 'party-hero' });
    let preload = new PreloadImages(bodyHero);

    for (let heroData of heroList) {
      let hero = DOM({ domaudio: domAudioPresets.smallButton });
      const isBannedInMode = heroData.id && bannedHeroes.has(Number(heroData.id));
      if (isBannedInMode) {
        hero.style.filter = 'grayscale(100%)';
        hero.style.opacity = '0.6';
        hero.title = Lang.text('thisHeroIsUnavailableInCurrentGameMode');
      }

      hero.addEventListener('click', async () => {
        if (isBannedInMode) {
          App.error(Lang.text('thisHeroIsUnavailableInCurrentGameMode'));
          return;
        }

        const selected = await View.setCastlePartyHero(playerCard, heroData.id, heroData.rating || fallbackRating || 1100);
        if (selected) {
          Splash.hide();
        }
      });

      hero.dataset.url = heroData.id ? `content/hero/${heroData.id}/${heroData.skin ? heroData.skin : 1}.webp` : `content/hero/empty.webp`;
      preload.add(hero);
    }

    Splash.show(bodyHero, false);
  }

  static bindCastleModeHeroAutoOpen() {
    if (View.castleModeHeroAutoOpenHandler) {
      window.removeEventListener('CastleModeChanged', View.castleModeHeroAutoOpenHandler);
    }

    View.castleModeHeroAutoOpenHandler = async (event) => {
      const mode = Number(event?.detail?.mode);
      const myCard = document.querySelector(`.castle-play-lobby-player[data-id="${App.storage.data.id}"]`);
      if (!myCard) {
        return;
      }

      if (mode === View.castleAramMode) {
        if (Number(MM.activeSelectHero) !== 0) {
          const selected = await View.setCastlePartyHero(myCard, 0, 1100);
          if (selected && Splash.body && Splash.body.style.display == 'flex' && Splash.body.querySelector('.party-hero')) {
            Splash.hide();
          }
        }
        return;
      }

      if (!View.isCastleModeRequireHeroSelection(mode) || Number(MM.activeSelectHero) > 0) {
        return;
      }
      if (Splash.body && Splash.body.style.display == 'flex' && Splash.body.querySelector('.party-hero')) {
        return;
      }

      await View.openCastlePartyHeroPicker(myCard, 1100, { notifyOnActiveSearch: false });
    };

    window.addEventListener('CastleModeChanged', View.castleModeHeroAutoOpenHandler);
  }

  static remapQueryByKeyboardLayout(value, layoutMap) {
    return String(value || '')
      .split('')
      .map((char) => layoutMap[char] || char)
      .join('');
  }

  static getLayoutAwareSearchVariants(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (!normalized) return [];
    const variants = new Set([normalized]);
    variants.add(View.remapQueryByKeyboardLayout(normalized, KEYBOARD_LAYOUT_EN_TO_RU));
    variants.add(View.remapQueryByKeyboardLayout(normalized, KEYBOARD_LAYOUT_RU_TO_EN));
    return [...variants].filter(Boolean);
  }

  static splitSearchWords(value) {
    return String(value || '')
      .toLowerCase()
      .split(/[^a-zа-яё0-9]+/i)
      .filter(Boolean);
  }

  static hasSingleAdjacentTransposition(left, right) {
    if (left.length !== right.length || left === right) return false;
    let firstDiff = -1;
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) {
        firstDiff = i;
        break;
      }
    }
    if (firstDiff < 0 || firstDiff >= left.length - 1) return false;
    if (!(left[firstDiff] === right[firstDiff + 1] && left[firstDiff + 1] === right[firstDiff])) return false;
    for (let i = firstDiff + 2; i < left.length; i++) {
      if (left[i] !== right[i]) return false;
    }
    return true;
  }

  static hasEditDistanceAtMostOne(left, right) {
    if (left === right) return true;
    const lenDiff = Math.abs(left.length - right.length);
    if (lenDiff > 1) return false;
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < left.length && j < right.length) {
      if (left[i] === right[j]) {
        i++;
        j++;
        continue;
      }
      edits++;
      if (edits > 1) return false;
      if (left.length > right.length) {
        i++;
      } else if (left.length < right.length) {
        j++;
      } else {
        if (!View.isKeyboardNeighbor(left[i], right[j])) return false;
        i++;
        j++;
      }
    }
    if (i < left.length || j < right.length) edits++;
    return edits <= 1;
  }

  static toKeyboardLayoutKey(char) {
    const normalizedChar = String(char || '').toLowerCase();
    return KEYBOARD_LAYOUT_RU_TO_EN[normalizedChar] || normalizedChar;
  }

  static toKeyboardLayoutString(value) {
    return String(value || '')
      .split('')
      .map((char) => View.toKeyboardLayoutKey(char))
      .join('');
  }

  static isKeyboardNeighbor(leftChar, rightChar) {
    if (leftChar === rightChar) return true;
    const leftPosition = KEYBOARD_LAYOUT_POSITIONS.get(View.toKeyboardLayoutKey(leftChar));
    const rightPosition = KEYBOARD_LAYOUT_POSITIONS.get(View.toKeyboardLayoutKey(rightChar));
    if (!leftPosition || !rightPosition) return true;
    return Math.abs(leftPosition[0] - rightPosition[0]) <= 1 && Math.abs(leftPosition[1] - rightPosition[1]) <= 1;
  }

  static isFuzzySearchVariantMatch(filterHaystack, filterWords, variant) {
    if (!variant) return false;
    if (filterHaystack.includes(variant)) return true;
    const variantKey = View.toKeyboardLayoutString(variant);
    if (variantKey && filterWords.some((word) => View.toKeyboardLayoutString(word).includes(variantKey))) return true;
    if (variant.length < 3) return false;
    for (const word of filterWords) {
      if (word.includes(variant)) return true;
      const prefix = word.slice(0, variant.length);
      if (prefix && prefix !== word) {
        if (View.hasSingleAdjacentTransposition(prefix, variant)) return true;
        if (View.hasEditDistanceAtMostOne(prefix, variant)) return true;
      }
      if (Math.abs(word.length - variant.length) > 1) continue;
      if (View.hasSingleAdjacentTransposition(word, variant)) return true;
      if (View.hasEditDistanceAtMostOne(word, variant)) return true;

      const wordKey = View.toKeyboardLayoutString(word);
      const keyPrefix = wordKey.slice(0, variantKey.length);
      if (keyPrefix && keyPrefix !== wordKey) {
        if (View.hasSingleAdjacentTransposition(keyPrefix, variantKey)) return true;
        if (View.hasEditDistanceAtMostOne(keyPrefix, variantKey)) return true;
      }
      if (Math.abs(wordKey.length - variantKey.length) <= 1) {
        if (View.hasSingleAdjacentTransposition(wordKey, variantKey)) return true;
        if (View.hasEditDistanceAtMostOne(wordKey, variantKey)) return true;
      }
    }
    return false;
  }

  static setCastleOpenedBuildHero(heroId = 0) {
    const id = Number(heroId);
    View.castleOpenedBuildHeroId = Number.isFinite(id) && id > 0 ? id : 0;
    View.syncCastleOpenedBuildHeroGlow();
  }

  static syncCastleOpenedBuildHeroGlow() {
    try {
      const container = View.castleBottom;
      if (!container) return;
      const isBuildOpen = Window.windows?.main?.id === 'wbuild';
      const targetId = Number(View.castleOpenedBuildHeroId);
      container.querySelectorAll('.castle-hero-item').forEach((el) => {
        const heroId = Number(el.dataset.heroId);
        const isActive = isBuildOpen && Number.isFinite(targetId) && targetId > 0 && heroId === targetId;
        el.classList.toggle('castle-hero-item-build-open', isActive);
      });
    } catch {}
  }
  static activeTemplate = false;

  static activeAnimation = false;

  static animationIsEnabled = false;

  static defaultAnimation = {
    transform: ['scale(1.1)', 'scale(1)'],
    opacity: [0, 1],
    backdropFilter: ['blur(0)', 'blur(1cqh)'],
  };

  static defaultOptionAnimation = {
    duration: 150,
    fill: 'both',
    easing: 'ease-out',
  };

  static updateProgress = false;

  static castleQuestBody = DOM({ style: ['quest', 'left-offset-no-shift'] });

  static castleTotalCrystal = DOM({ tag: 'div', style: ['question-icon'] }, DOM({ style: 'quest-counter' }, ''));

  static setCss(name = 'content/style.css') {
    let css = DOM({ tag: 'link', rel: 'stylesheet', href: name });

    document.head.appendChild(css);
  }

  static async show(method, value, value2, value3) {
    if (!(method in View)) {
      return;
    }

    Window.close('main');

    Castle.toggleRender(Castle.RENDER_LAYER_LAUNCHER, method == 'castle');

    try {
      var template = await View[method](value, value2, value3);
    } catch (error) {
      App.error(error);

      return;
    }

    // Ensure action bar slots exist in native input_new.cfg once per app session.
    if (method === 'castle' && !View._actionBarCfgEnsured) {
      try {
        const { changed } = await ensureActionBarSlotsInNativeCfg();
        if (changed) await loadKeybinds();
      } catch {}
      View._actionBarCfgEnsured = true;
    }

    if (View.active) {
      if (View.animationIsEnabled) {
        View.activeAnimation.reverse();

        View.activeAnimation.addEventListener('finish', () => {
          View.active.remove();

          View.active = template;

          View.activeAnimation = template.animate(View.defaultAnimation, View.defaultOptionAnimation);

          document.body.append(template);
        });
      } else {
        View.active.remove();

        View.active = template;

        document.body.append(template);
      }
    } else {
      if (View.animationIsEnabled) {
        View.active = template;

        View.activeAnimation = template.animate(View.defaultAnimation, View.defaultOptionAnimation);

        document.body.append(template);
      } else {
        View.active = template;

        document.body.append(template);
      }
    }
  }

  static authorization() {
    let numEnterEvent = [
      'keyup',
      async (event) => {
        if (!App.isEnterKey(event)) return;
        App.authorization(login, password);
      },
    ];

    let login = DOM({
        tag: 'input',
        domaudio: domAudioPresets.defaultInput,
        placeholder: Lang.text('nickname'),
        event: numEnterEvent,
      }),
      password = DOM({
        tag: 'input',
        domaudio: domAudioPresets.defaultInput,
        placeholder: Lang.text('password'),
        type: 'password',
        event: numEnterEvent,
      });
    // Создаем выпадающий список языков
    const languageSelect = DOM({
      tag: 'select',
      domaudio: domAudioPresets.defaultSelect,
      id: 'lang_select',
      style: 'language-select',
      event: [
        'change',
        async (e) => {
          const newLanguage = e.target.value;
          Lang.target = newLanguage;
          Settings.settings.language = newLanguage;
          App.error(`${Lang.text('LangTarg')}: ${Lang.list[newLanguage].name}`);
          // Перезагружаем страницу для применения языка
          await Lang.reinitViews();
        },
      ],
    });

    // Заполняем выпадающий список языками
    Object.entries(Lang.list).forEach(([code, langData]) => {
      languageSelect.appendChild(
        DOM({
          tag: 'option',
          value: code,
          selected: code === Lang.target,
          text: langData.name,
        }),
      );
    });

    let authorizationForm = DOM(
      { style: 'login_box' },
      DOM(
        { style: 'login-box-forma' },
        DOM(
          { tag: 'div' },
          DOM({
            tag: 'img',
            style: 'login-box-forma-logo',
            src: 'content/img/logo_classic.webp',
          }),
        ),

        DOM({ style: 'language-select-container' }, languageSelect),
        DOM(
          { style: 'login-box-forma-inputs' },
          login,
          password,
          DOM(
            { style: 'login-box-forma-buttons' },
            DOM(
              {
                domaudio: domAudioPresets.defaultButton,
                style: 'login-box-forma-button',
                event: ['click', () => App.authorization(login, password)],
              },
              Lang.text('login'),
            ),
            DOM(
              {
                domaudio: domAudioPresets.defaultButton,
                style: 'login-box-forma-button',
                event: ['click', () => View.show('registration')],
              },
              Lang.text('registration'),
            ),
          ),
          DOM(
            { style: 'login-box-forma-buttons' },
            DOM(
              {
                domaudio: domAudioPresets.bigButton,
                style: ['login-box-forma-button', 'steamauth'],
                event: ['click', () => Window.show('main', 'steamauth')],
              },
              Lang.text('authorizationSteam'),
            ),
          ),
        ),
      ),
      DOM({ style: 'author' }, `Prime World: Classic v.${App.PW_VERSION}.${App.APP_VERSION}`),
    );

    return authorizationForm;
  }

  static registration() {
    let numEnterEvent = [
      'keyup',
      async (event) => {
        if (!App.isEnterKey(event)) return;
        App.registration(fraction, invite, login, password, password2);
      },
    ];

    let fraction = DOM(
      { domaudio: domAudioPresets.defaultSelect, tag: 'select' },
      DOM({ tag: 'option', value: 0, disabled: true, selected: true }, Lang.text('fraction')),
      DOM({ tag: 'option', value: 1 }, Lang.text('adornia')),
      DOM({ tag: 'option', value: 2 }, Lang.text('docts')),
    );

    let tgBotUrl = 'https://t.me/primeworldclassic_bot';

    let telegramBotLink = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: 'telegram-bot',
      tag: 'a',
      target: '_blank',
      href: tgBotUrl,
      event: ['click', (e) => NativeAPI.linkHandler(e)],
    });

    let invite = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultInput,
      placeholder: Lang.text('code'),
      event: numEnterEvent,
    });

    let inviteContainer = DOM({ style: 'invite-input' }, invite, telegramBotLink);

    let login = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultInput,
      placeholder: Lang.text('nickname'),
      event: numEnterEvent,
    });

    let password = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultInput,
      placeholder: Lang.text('password'),
      type: 'password',
      event: numEnterEvent,
    });

    let password2 = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultInput,
      placeholder: Lang.text('passwordAgain'),
      type: 'password',
      event: numEnterEvent,
    });

    return DOM(
      { style: 'login_box' },
      DOM(
        { style: 'login-box-forma' },

        DOM(
          { style: 'login-box-forma-inputs' },
          fraction,
          inviteContainer,
          login,
          password,
          password2,
          DOM(
            { style: 'login-box-forma-buttons' },
            DOM(
              {
                domaudio: domAudioPresets.defaultButton,
                style: 'login-box-forma-button',
                event: ['click', () => App.registration(fraction, invite, login, password, password2)],
              },
              Lang.text('registration1'),
            ),
            DOM(
              {
                domaudio: domAudioPresets.defaultButton,
                style: 'login-box-forma-button',
                event: ['click', () => View.show('authorization')],
              },
              Lang.text('back'),
            ),
          ),
        ),
        DOM(
          { style: 'login-box-forma-right' },
          DOM({
            tag: 'img',
            style: 'login-box-forma-logo',
            src: 'content/img/logo_classic.webp',
          }),
          DOM({ style: 'login-box-form-invite-text' }, `Получить инвайт-код через QR-код`),
          DOM({
            tag: 'img',
            style: 'login-box-forma-logo',
            src: 'content/img/pwclassicbot.png',
          }),
        ),
      ),
      DOM({ style: 'author' }, `Prime World: Classic v.${App.PW_VERSION}.${App.APP_VERSION}`),
    );
  }

  static progress() {
    let body = DOM({ style: 'progress' }, DOM({ style: 'animation1' }), DOM());

    Splash.show(body, false);

    return body;
  }

  static async castle() {
    document.body.classList.add('noselect');

    Shop.retrieveLastUpdate();

    View.setCss('content/castle.css');

    let body = DOM({ tag: 'div', id: 'castle-body' });
    let backgroundImage = DOM({ tag: 'div', id: 'castle-background-img' });

    if (!Castle.canvas) {
      Castle.canvas = DOM({ tag: 'canvas', id: 'castle-game-surface' });
      Castle.buildingBubbles = DOM({ style: 'castle-buildings-bubbles' });
    }

    try {
      if (!Castle.gl) {
        await Castle.initDemo(App.storage.data.fraction == 1 ? 'ad' : 'doct', Castle.canvas);
      }
    } catch (error) {
      // если замок не работает на устройстве, тогда рендерим старую версию главной страницы

      App.error(error);
    }

    body.append(backgroundImage, Castle.canvas, Castle.buildingBubbles, View.castleQuestBody);

    try {
      await View.castleQuestUpdate();
    } catch (error) {
      App.error(error);
    }

    try {
      let castlePlay = await View.castlePlay();

      body.append(castlePlay);
    } catch (error) {
      if (String(error).search(new RegExp(`session is not valid`, 'i')) != -1) {
        const pulse = await App.syncAuthPulse();
        if (App.isAuthPulseActive(pulse)) {
          await View.show('authorization');
        } else {
          await App.exit();
        }

        NativeAPI.reset();

        return;
      }

      App.error(error);
    }

    body.append(View.castleChat());

    try {
      let castleHeroes = await View.castleHeroes();

      body.append(castleHeroes);
    } catch (e) {
      App.error(e);
    }

    body.append(View.castleSettings());

    setTimeout(() => {
      Chat.scroll();
    }, 1500);

    return body;
  }

  static async castlePlay() {
    const DEMO_PARTY_SIZE = 0;
    let body = DOM({ style: 'castle-play' });

    let play = MM.play();

    play.classList.remove('main-header-item');

    play.classList.remove('button-play');

    play.classList.add('castle-button-play');
    /*
        if(!play.children.length){
            
            play.append(DOM({id:'MMQueue'},'0'));
            
        }
        */
    let lobby = DOM({ style: 'castle-play-lobby' });

    let data = await App.api.request(App.CURRENT_MM, 'loadParty'),
      players = new Array();

    MM.partyId = data.id;
    MM.partyMembersCount = Object.keys(data?.users || {}).length || 1;
    if (data && ('mode' in data)) {
      CastleNAVBAR.setMode(Number(data.mode) + 1, { syncParty: false });
    }

    MM.activeSelectHero = data.users[App.storage.data.id].hero;

    MM.searchActive(data.users[MM.partyId].ready);

    try {
      MM.hero = await App.api.request('build', 'heroAll');
      console.log('DEBUG: Preloaded MM.hero for ratings:', MM.hero);
    } catch (e) {
      console.warn('Could not preload heroes:', e);
      MM.hero = [];
    }

    for (let key in data.users) {
      let userRating = data.users[key].heroRating || 1100;

      if (key == App.storage.data.id && data.users[key].hero && MM.hero.length > 0) {
        const userHero = MM.hero.find((h) => h.id === data.users[key].hero);
        if (userHero && userHero.rating) {
          userRating = userHero.rating;
          console.log('DEBUG: Found hero rating in MM.hero:', userRating);
        }
      }

      players.push({
        id: key,
        hero: data.users[key].hero,
        nickname: data.users[key].nickname,
        ready: data.users[key].ready,
        rating: userRating,
        skin: data.users[key].skin,
        demo: false,
      });
    }

    if (players.length < DEMO_PARTY_SIZE) {
      const heroPool = Array.isArray(MM.hero) ? MM.hero.filter((h) => Number(h?.id) > 0) : [];
      const usedHeroIds = new Set(players.map((p) => Number(p.hero)).filter((id) => Number.isFinite(id) && id > 0));
      const pickDemoHero = (seed) => {
        if (!heroPool.length) return { hero: 0, skin: 1, rating: 1100 };
        let idx = Math.abs(Number(seed) || 0) % heroPool.length;
        for (let tries = 0; tries < heroPool.length; tries++) {
          const cand = heroPool[(idx + tries) % heroPool.length];
          const cid = Number(cand?.id);
          if (!Number.isFinite(cid) || cid <= 0) continue;
          if (!usedHeroIds.has(cid)) {
            usedHeroIds.add(cid);
            return {
              hero: cid,
              skin: Number(cand?.skin) > 0 ? Number(cand.skin) : 1,
              rating: Number(cand?.rating) || 1100,
            };
          }
        }
        const fallback = heroPool[idx];
        return {
          hero: Number(fallback?.id) || 0,
          skin: Number(fallback?.skin) > 0 ? Number(fallback.skin) : 1,
          rating: Number(fallback?.rating) || 1100,
        };
      };

      const need = DEMO_PARTY_SIZE - players.length;
      for (let i = 0; i < need; i++) {
        const demoId = `demo-${i + 1}`;
        const demoHero = pickDemoHero(i + 37);
        players.push({
          id: demoId,
          hero: demoHero.hero,
          nickname: `Teammate ${i + 1}`,
          ready: i % 3 !== 0 ? 1 : 0,
          rating: demoHero.rating,
          skin: demoHero.skin,
          demo: true,
        });
      }
    }

    const partySize = Math.max(1, players.length);
    const maxInRow = partySize <= 4 ? partySize : Math.max(1, Math.ceil(partySize / 2));
    lobby.style.setProperty('--castle-play-lobby-max-in-row', String(maxInRow));
    const rowCount = Math.max(1, Math.ceil(partySize / maxInRow));
    lobby.dataset.rows = String(rowCount);
    /*
        if(players.length < 5){
            
            while(players.length < 5){
                
                players.push({id:0,hero:0,nickname:'',ready:0});
                
            }
            
        }
        */
    for (let p in players) {
      let player = players[p];

      let item = DOM({
        domaudio: domAudioPresets.bigButton,
        style: 'castle-play-lobby-player',
        data: { id: player.id },
      });

      let rank = Rank.createRankNode(player.rating);

      item.append(rank);

      if (!player.rating || player.rating === 0) {
        rank.style.display = 'none';
      } else {
        rank.style.display = 'flex';
      }

      let status = DOM(
        {
          style: ['castle-party-middle-item-ready-notready', 'castle-party-middle-item-not-ready'],
        },
        DOM({}, 'Не готов'),
      );

      if (player.id) {
        if (player.ready) {
          status.firstChild.innerText = Lang.text('ready');

          status.classList.replace('castle-party-middle-item-not-ready', 'castle-party-middle-item-ready');
        } else if (MM.partyId == player.id) {
          status.firstChild.innerText = Lang.text('ready');

          status.classList.replace('castle-party-middle-item-not-ready', 'castle-party-middle-item-ready');
        } else if (player.id == App.storage.data.id) {
          status.onclick = async () => {
            if (NativeAPI.status) {
              if (PWGame.gameConnectionTestIsActive) {
                return;
              }

              PWGame.gameConnectionTestIsActive = true;

              try {
                await PWGame.check();

                await PWGame.testGameServerConnection();

                await PWGame.checkUpdates();
              } catch (e) {
                PWGame.gameConnectionTestIsActive = false;
                throw e;
              }

              PWGame.gameConnectionTestIsActive = false;
            }

            await App.api.request(App.CURRENT_MM, 'readyParty', {
              id: MM.partyId,
            });

            status.onclick = false;
          };

          status.firstChild.innerText = Lang.text('confirm');
        }

        const heroImg = player.hero
          ? `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`
          : `url(content/hero/empty.webp)`;

        item.style.backgroundImage = `${heroImg}, url(content/hero/background.png)`;
        item.style.backgroundRepeat = 'no-repeat, no-repeat';
        item.style.backgroundPosition = 'center, center';
        item.style.backgroundSize = 'contain, contain';
      } else {
        item.innerHTML = '<div class="castle-play-lobby-empty"><div>+</div></div>';

        status.style.opacity = 0;

        // lvl.style.opacity = 0;

        //rank.style.opacity = 0;
      }

      let removeButton = DOM({ style: 'castle-party-remove' });

      removeButton.style.backgroundImage = `url(content/icons/close-cropped.svg)`;

      let nicknameText = DOM({}, `${player.nickname ? player.nickname : 'Добавить'}`);

      let nicknameHideOverflowContainer = DOM({ style: 'castle-party-middle-item-nickname-hidden-overflow' }, nicknameText);

      let nickname = DOM({ style: 'castle-party-middle-item-nickname' }, nicknameHideOverflowContainer);

      let playerX = DOM(
        {
          id: `PP${player.id}`,
          style: 'castle-party-middle-item',
          title: Lang.text('choosingHero'),
        },
        nickname,
        item,
        status,
      );

      if (p > 0 && !players[p - 1].id) {
        playerX.style.display = 'none';
      }

      if (player.nickname.length > 20) {
        nickname.firstChild.firstChild.classList.add('castle-name-autoscroll');
      }

      playerX.dataset.id = player.id;

      nickname.firstChild.firstChild.classList.add('castle-player-nickname');

      if (MM.partyId == App.storage.data.id && !player.demo && playerX.dataset.id != App.storage.data.id && playerX.dataset.id != 0) {
        removeButton.addEventListener('click', async () => {
          await App.api.request(App.CURRENT_MM, 'leaderKickParty', {
            id: playerX.dataset.id,
          });
        });

        if (player.nickname.length > 15) {
          nickname.firstChild.firstChild.classList.add('castle-name-autoscroll');
        }

        nickname.append(removeButton);
      }

      if (MM.partyId != App.storage.data.id && playerX.dataset.id == App.storage.data.id) {
        removeButton.addEventListener('click', async () => {
          await App.api.request(App.CURRENT_MM, 'leaveParty', {
            id: MM.partyId,
          });

          View.show('castle');
        });

        if (player.nickname.length > 15) {
          nickname.firstChild.firstChild.classList.add('castle-name-autoscroll');
        }

        nickname.append(removeButton);
      }

      item.addEventListener('click', async () => {
        if (item.dataset.id == App.storage.data.id) {
          await View.openCastlePartyHeroPicker(item, player.rating);
        }
        /*
                if( ( (item.dataset.id == 0) && ( (!MM.partyId ) || (MM.partyId == App.storage.data.id) ) ) ){
                    
                    let input = DOM({tag:'input',style:'search-input'});
                    
                    let body = DOM({style:'search-body'});
                    
                    let search = DOM({style:'search'},input,body,DOM({style:'search-bottom',event:['click',() => {
                        
                        Splash.hide();
                        
                    }]},`[Назад]`));
                    
                    input.addEventListener('input', async () => {
                        
                        let request = await App.api.request(App.CURRENT_MM,'findUser',{name:input.value});
                        
                        if(body.firstChild){
                            
                            while(body.firstChild){
                                
                                body.firstChild.remove();
                                
                            }
                            
                        }
                        
                        for(let item of request){
                            
                            body.append(DOM({event:['click', async () => {
                                
                                await App.api.request(App.CURRENT_MM,'inviteParty',{id:item.id});
                                
                                App.notify(`Приглашение отправлено игроку ${item.nickname}`,1000);
                                
                                // Splash.hide();
                                
                            }]},item.nickname));
                            
                        }
                        
                    });
                    
                    Splash.show(search,false);
                    
                    input.focus();
                    
                }
                */
      });

      lobby.append(playerX);
    }

    body.append(CastleNAVBAR.body, lobby);
    View.bindCastleModeHeroAutoOpen();

    return body;
  }

  static castleBannerOnline() {
    const getDivisionId = () =>
      (window.User && (User.divisionId || User.rank || User.rating)) ||
      (window.Settings && Settings.user && (Settings.user.divisionId || Settings.user.rank)) ||
      10;

    const isFiniteNumber = (v) => Number.isFinite(v) && !Number.isNaN(v);

    const safeQueueCounts = (cssKey) => {
      let party = 0,
        players = 0;

      try {
        if (typeof View?.getQueue === 'function') {
          const v = Number(View.getQueue(cssKey));
          if (isFiniteNumber(v)) party = v;
        }
      } catch (_) {}

      try {
        if (typeof View?.getTotalQueue === 'function') {
          const t = Number(View.getTotalQueue(cssKey));
          if (isFiniteNumber(t)) players = t;
        }
      } catch (_) {}

      return { players, party };
    };

    // карта режимов
    const modeMap = {
      pvp: 0,
      anderkrug: 1,
      cte: 2,
      m4: 3,
      'custom-battle': 4,
      'pve-ep2-red': 5,
    };

    // тип медалей (Испытание / Дуэль — без зала славы в лаунчере)
    const medalMap = {
      pvp: 'gold',
      anderkrug: 'gold',
      cte: 'gold',
      m4: 'gold',
      'pve-ep2-red': 'silver',
      'custom-battle': 'silver',
    };

    const bannerItems = Object.entries(modeMap).map(([cssKey]) => ({
      cssKey,
      label: () => (typeof View?.getQueue === 'function' ? View.getQueue(cssKey) : 0),
    }));

    const banner = DOM({ style: ['castle-banner-online'] });
    banner.append(DOM({ style: ['banner-ornament'] }));

    // --- элементы по режимам ---
    bannerItems.forEach((item, idx) => {
      const wrap = DOM({ style: ['banner-item'] });

      // иконка режима
      const icon = DOM({
        style: ['banner-icon', `banner-icon--${item.cssKey}`],
      });
      wrap.append(icon);

      // счётчик: всегда стартует с "0/0"
      const lbl = DOM({ tag: 'div', style: ['banner-count', 'is-loading'] });
      lbl.textContent = '0/0';
      lbl.title = 'Отображение очереди по режимам:\n' + 'слева — игроков в поиске,\n' + 'справа — количество групп (пати).';
      wrap.append(lbl);

      const onQueuesUpdated = () => {
        const { players, party } = safeQueueCounts(item.cssKey);
        lbl.textContent = `${players}/${party}`;
        if (players || party) lbl.classList.remove('is-loading');
      };
      window.addEventListener?.('queues:updated', onQueuesUpdated);

      let ticks = 0;
      const iv = setInterval(() => {
        ticks++;
        const { players, party } = safeQueueCounts(item.cssKey);
        const current = lbl.textContent;
        const next = `${players}/${party}`;
        if (current !== next) {
          lbl.textContent = next;
        }
        if (players || party) {
          lbl.classList.remove('is-loading');
        }
        if (players || party || ticks >= 30) {
          clearInterval(iv);
        }
      }, 500);

      // медаль/кнопка
      const type = medalMap[item.cssKey] || 'gold';
      const disabled = type === 'silver';

      const medal = DOM({
        domaudio: domAudioPresets.bigButton,
        tag: 'span',
        style: ['banner-medal', `banner-medal--${type}`, disabled ? 'is-disabled' : null].filter(Boolean),
      });

      if (disabled) {
        medal.title = Lang.text('titlestatisticmodeUnavailable');
      } else {
        medal.title = Lang.text('titlestatisticmode');
        medal.setAttribute('role', 'button');
        medal.tabIndex = 0;
        const openStats = () => {
          Window.show('main', 'top', 0, idx);
        };
        medal.addEventListener('click', openStats);
        medal.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openStats();
          }
        });
      }

      wrap.append(medal);
      banner.append(wrap);

      if (idx < bannerItems.length - 1) {
        banner.append(DOM({ tag: 'div', style: ['banner-separator'] }));
      }
    });

    // --- блок статистики/кнопка Stat ---
    const statWrapper = DOM({ style: ['banner-stat-wrapper'] });
    const statRect = DOM({ style: ['banner-stat-rect'] });
    const statCircle = DOM({ style: ['banner-stat-circle'] });

    const statsBtn = DOM({
      domaudio: domAudioPresets.bigButton,
      style: ['banner-icon', 'banner-icon--stat', 'button-outline'],
      title: Lang.text('titlestatistic'),
      event: [
        'click',
        () => {
          App.openStatsProfile();
        },
      ],
    });

    // бейдж дивизии под кнопкой Stat
    const divId = getDivisionId();
    const divInfo = typeof Division?.get === 'function' ? Division.get(divId) : { name: 'Дивизион', icon: 1 };

    const divisionBadgeUnderStat = DOM({
      style: ['banner-division-badge', 'banner-division-badge--stat'],
    });
    divisionBadgeUnderStat.style.backgroundImage = `url(content/ranks/${divInfo.icon}.webp)`;
    divisionBadgeUnderStat.title = Lang.text('titlehint2');

    statCircle.append(statsBtn, divisionBadgeUnderStat);
    statWrapper.append(statRect, statCircle);

    // подсказка слева
    const tooltipWrap = DOM({ tag: 'div', style: ['tooltip-wrap-left'] });
    const tooltipBubble = DOM({ tag: 'div', style: ['tooltip-bubble-img'] });
    const tooltipText = DOM({ tag: 'div', style: ['tooltip-text'] });
    tooltipText.textContent = Lang.text('titlehint');
    tooltipBubble.append(tooltipText);
    tooltipWrap.append(tooltipBubble);

    View.castleCrystalContainer = DOM(
      {
        domaudio: domAudioPresets.bigButton,
        style: ['crystal-container', Shop.requireAnimation ? 'crystal-container-anim' : '_dummy_'],
        event: [
          'click',
          () => {
            Window.show('main', 'shop');
          },
        ],
      },
      View.castleTotalCrystal,
    );

    banner.append(statWrapper, View.castleCrystalContainer);

    return DOM({ style: 'castle-banner-online-wrapper' }, banner);
  }

  static castleSettings() {
    let builds = DOM({
      domaudio: domAudioPresets.bigButton,
      style: ['castle-builds', 'button-outline'],
      title: 'Рейтинг',
      event: ['click', () => View.show('top')],
    });

    let settings = DOM({
      domaudio: domAudioPresets.bigButton,
      style: ['castle-settings-btn', 'button-outline'],
      title: 'Вкл/Выкл графики замка',
      event: [
        'click',
        () => {
          let wrapper = DOM({ style: ['castle-settings-window'] });
          settings.append(wrapper);
        },
      ],
    });

    let clan = DOM({
      domaudio: domAudioPresets.bigButton,
      style: ['castle-clans', 'button-outline'],
      title: 'Кланы',
      event: ['click', () => Frame.open('clan')],
    });

    let farm = DOM({
      domaudio: domAudioPresets.bigButton,
      style: ['castle-farm', 'button-outline'],
      title: 'Фарм',
      event: ['click', () => Window.show('main', 'farm')],
    });

    let input = DOM({ style: 'castle-input', tag: 'input' });

    input.type = 'range';

    input.min = '0';
    input.max = '1';
    input.step = '0.01';

    let body = DOM({ style: ['castle-settings'] });
    let container = DOM({ style: ['castle-settings-container'] }, View.castleBannerOnline(), body);
    return container;
  }

  static castleChat() {
    let body = DOM({ style: 'castle-chat' }, Chat.body);

    return body;
  }

  static async castleHeroes() {
    let tab = 1;
    const SCROLL_MODIFIER = 1;
    let body = DOM({ style: 'castle-bottom' });

    View.castleBottom = DOM({ style: 'castle-bottom-content' });

    View.castleBottom.addEventListener(
      'wheel',
      function (event) {
        if (event.deltaY != 0) {
          let deltaPx = 0;
          if (event.deltaMode == event.DOM_DELTA_PIXEL) {
            deltaPx = event.deltaY * SCROLL_MODIFIER;
          } else if (event.deltaMode == event.DOM_DELTA_LINE) {
            deltaPx = event.deltaY * 18 * SCROLL_MODIFIER;
          } else if (event.deltaMode == event.DOM_DELTA_PAGE) {
            deltaPx = this.clientWidth;
          }
          if (deltaPx !== 0) {
            event.preventDefault();
            View.applyCastleBottomScrollDelta(deltaPx);
          }
        }
      },
      { passive: false },
    );
    View.castleBottom.addEventListener(
      'scroll',
      () => {
        View.currentFloatScroll = Number(View.castleBottom?.scrollLeft) || 0;
        if (!View.castleBottomScrollRaf) {
          View.castleBottomTargetScroll = View.currentFloatScroll;
        }
        View.updateArrows();
      },
      { passive: true },
    );

    let nicknameValue = String(App?.storage?.data?.login || '').trim();
    let nicknameMenuItem = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        style: 'nickname-menu-item',
        event: [
          'click',
          () => {
            App.setNickname();
          },
        ],
        title: Lang.text('titleNicknameСhange'),
      },
      DOM({}, nicknameValue),
    );
    if (nicknameValue.length > 10) {
      nicknameMenuItem.firstChild.classList.add('castle-name-autoscroll');
    }

    let flagMenuItem = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: 'flag-menu-item',
      event: [
        'click',
        () => {
          App.setFraction();
        },
      ],
      title: Lang.text('titleflag'),
    });

    const partyData = await App.api.request(App.CURRENT_MM, 'loadParty', {});
    const dbNickname = String(partyData?.users?.[App.storage.data.id]?.nickname || '').trim();
    if (dbNickname) {
      nicknameMenuItem.firstChild.textContent = dbNickname;
      nicknameMenuItem.firstChild.classList.toggle('castle-name-autoscroll', dbNickname.length > 10);
      if (App?.storage?.data?.login !== dbNickname) {
        App.storage.data.login = dbNickname;
      }
    }
    const playerRatingVisual = partyData.users[App.storage.data.id]?.playerRatingVisual || 0;
    let accountRatingItem = DOM(
      {
        style: 'account-rating-menu-item',
      },
      Lang.text('accountRating').replace('{rating}', playerRatingVisual),
    );

    accountRatingItem.style.setProperty('--filter-text-hover', `'${Lang.text('accountRatingTooltip')}'`);

    let settingsMenuItem = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: 'settings-menu-item',
      event: [
        'click',
        () => {
          Window.show('main', 'menu');
        },
      ],
      title: Lang.text('titlesettings'),
    });
    let chatMenuItem = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: 'chat-menu-item',
      event: [
        'click',
        () => {
          Chat.changeChatVisibility();
        },
      ],
      title: Lang.text('titlechat'),
    });
    let heroesMenuItem = DOM({
      domaudio: domAudioPresets.bigButton,
      style: 'heroes-menu-item',
      event: [
        'click',
        () => {
          View.bodyCastleHeroes();
          View.resetCastleBottomScroll(0);
          Castle.buildMode = false;
        },
      ],
      title: Lang.text('titleheroes'),
    });
    let friendsMenuItem = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: 'friends-menu-item',
      event: [
        'click',
        () => {
          View.bodyCastleFriends();
          View.resetCastleBottomScroll(0);
          Castle.buildMode = false;
        },
      ],
      title: Lang.text('titlefriends'),
    });
    View.friendsMenuItem = friendsMenuItem;
    View.updateFriendsMenuIncomingState();
    let buildingsMenuItem = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: 'buildings-menu-item',
      event: [
        'click',
        () => {
          View.bodyCastleBuildings();
          View.resetCastleBottomScroll(0);
          Castle.buildMode = true;
        },
      ],
      title: Lang.text('titleconstruction'),
    });

    flagMenuItem.style.backgroundImage =
      Castle.currentSceneName == 'doct' ? `url(content/icons/Human_logo_over.webp)` : `url(content/icons/Elf_logo_over.webp)`;

    View.arrows = new Object();
    View.arrows.ls = DOM({
      domaudio: domAudioPresets.smallButton,
      style: 'castle-bottom-left-scroll-single',
      event: ['click', () => View.scrollHero(-1)],
    });
    View.arrows.ld = DOM({
      domaudio: domAudioPresets.smallButton,
      style: 'castle-bottom-left-scroll-double',
      event: ['click', () => View.scrollHeroLine(-1)],
    });
    View.arrows.rs = DOM({
      domaudio: domAudioPresets.smallButton,
      style: 'castle-bottom-right-scroll-single',
      event: ['click', () => View.scrollHero(1)],
    });
    View.arrows.rd = DOM({
      domaudio: domAudioPresets.smallButton,
      style: 'castle-bottom-right-scroll-double',
      event: ['click', () => View.scrollHeroLine(1)],
    });
    View.castleHeroListsBar = DOM({ style: 'castle-hero-lists-bar' });
    View.castleHeroPinnedEditor = DOM({ style: 'castle-hero-pinned-editor' });
    body.append(
      DOM(
        { style: 'castle-bottom-menu' },
        nicknameMenuItem,
        flagMenuItem,
        accountRatingItem,
        settingsMenuItem,
        heroesMenuItem,
        friendsMenuItem,
        buildingsMenuItem,
        chatMenuItem,
      ),
      DOM(
        { style: 'castle-bottom-content-container' },
        View.castleHeroListsBar,
        View.castleHeroPinnedEditor,
        View.castleBottom,
        DOM({ style: 'castle-bottom-content-left-scroll' }, View.arrows.ls, View.arrows.ld),
        DOM({ style: 'castle-bottom-content-right-scroll' }, View.arrows.rs, View.arrows.rd),
      ),
    );

    // Инициализируем вкладку героев после создания toolbar-контейнера,
    // чтобы кнопки списков появились сразу при входе в замок.
    View.bodyCastleHeroes();

    View.resetCastleBottomScroll(Number(View.castleBottom?.scrollLeft) || 0);

    return body;
  }

  static currentFloatScroll = 0.0;
  static castleBottomTargetScroll = 0.0;
  static castleBottomScrollRaf = 0;

  static getCastleBottomMaxScrollLeft() {
    if (!View.castleBottom) return 0;
    return Math.max(0, View.castleBottom.scrollWidth - View.castleBottom.clientWidth);
  }

  static stopCastleBottomScrollAnimation() {
    if (!View.castleBottomScrollRaf) return;
    cancelAnimationFrame(View.castleBottomScrollRaf);
    View.castleBottomScrollRaf = 0;
  }

  static animateCastleBottomScroll() {
    if (!View.castleBottom) {
      View.castleBottomScrollRaf = 0;
      return;
    }
    const max = View.getCastleBottomMaxScrollLeft();
    View.castleBottomTargetScroll = Castle.clamp(View.castleBottomTargetScroll, 0, max);
    const current = Number(View.castleBottom.scrollLeft) || 0;
    const target = Number(View.castleBottomTargetScroll) || 0;
    const diff = target - current;
    if (Math.abs(diff) <= 0.35) {
      View.castleBottom.scrollLeft = target;
      View.currentFloatScroll = target;
      View.castleBottomScrollRaf = 0;
      View.updateArrows();
      return;
    }

    const next = current + diff * 0.22;
    View.castleBottom.scrollLeft = next;
    View.currentFloatScroll = next;
    View.castleBottomScrollRaf = requestAnimationFrame(() => View.animateCastleBottomScroll());
  }

  static applyCastleBottomScrollDelta(deltaPx) {
    if (!View.castleBottom) return;
    const max = View.getCastleBottomMaxScrollLeft();
    if (!Number.isFinite(View.castleBottomTargetScroll)) {
      View.castleBottomTargetScroll = Number(View.castleBottom.scrollLeft) || 0;
    }
    View.castleBottomTargetScroll = Castle.clamp(View.castleBottomTargetScroll + deltaPx, 0, max);
    if (!View.castleBottomScrollRaf) {
      View.castleBottomScrollRaf = requestAnimationFrame(() => View.animateCastleBottomScroll());
    }
  }

  static resetCastleBottomScroll(value = 0) {
    if (!View.castleBottom) return;
    View.stopCastleBottomScrollAnimation();
    const max = View.getCastleBottomMaxScrollLeft();
    const v = Castle.clamp(Number(value) || 0, 0, max);
    View.castleBottomTargetScroll = v;
    View.currentFloatScroll = v;
    View.castleBottom.scrollLeft = v;
    View.updateArrows();
  }

  static scrollCastleBottomToHero(heroId, { center = false } = {}) {
    const targetHeroId = Number(heroId);
    if (!View.castleBottom || !Number.isFinite(targetHeroId) || targetHeroId <= 0) return;
    const item = View.castleBottom.querySelector(`.castle-hero-item[data-hero-id="${targetHeroId}"]`);
    if (!item) return;

    const max = View.getCastleBottomMaxScrollLeft();
    let target = Number(item.offsetLeft) || 0;
    if (center) {
      target = target - (View.castleBottom.clientWidth - item.clientWidth) / 2;
    } else {
      // Scroll only when selected hero starts touching/leaving edges.
      const current = Number(View.castleBottom.scrollLeft) || 0;
      const edgePad = Math.max(12, Math.round(item.clientWidth * 1.5));
      const itemLeft = Number(item.offsetLeft) || 0;
      const itemRight = itemLeft + (Number(item.offsetWidth) || 0);
      const safeLeft = current + edgePad;
      const safeRight = current + View.castleBottom.clientWidth - edgePad;

      if (itemLeft < safeLeft) {
        target = itemLeft - edgePad;
      } else if (itemRight > safeRight) {
        target = itemRight - View.castleBottom.clientWidth + edgePad;
      } else {
        return;
      }
    }
    View.castleBottomTargetScroll = Castle.clamp(target, 0, max);
    if (!View.castleBottomScrollRaf) {
      View.castleBottomScrollRaf = requestAnimationFrame(() => View.animateCastleBottomScroll());
    }
  }

  static scrollHero(delta) {
    if (!View.castleBottom?.firstChild) return;
    const style = getComputedStyle(View.castleBottom.firstChild);
    const itemWidth = parseFloat(style.width) || View.castleBottom.clientHeight;
    const itemBorder = parseFloat(style.borderRightWidth) || 0;
    const modifier = itemWidth + itemBorder;
    View.applyCastleBottomScrollDelta(modifier * delta);
  }

  static scrollHeroLine(delta) {
    const width = parseFloat(getComputedStyle(View.castleBottom).width) || View.castleBottom.clientWidth;
    View.applyCastleBottomScrollDelta(width * delta);
  }

  static updateArrows() {
    let maxScrollLeft = View.castleBottom.scrollWidth - View.castleBottom.clientWidth;
    if (View.castleBottom.scrollLeft == 0) {
      View.arrows.ls.classList.add('castle-bottom-content-btn-disable');
      View.arrows.ld.classList.add('castle-bottom-content-btn-disable');
    } else {
      View.arrows.ls.classList.remove('castle-bottom-content-btn-disable');
      View.arrows.ld.classList.remove('castle-bottom-content-btn-disable');
    }

    if (maxScrollLeft && View.castleBottom.scrollLeft == maxScrollLeft) {
      View.arrows.rs.classList.add('castle-bottom-content-btn-disable');
      View.arrows.rd.classList.add('castle-bottom-content-btn-disable');
    } else {
      View.arrows.rs.classList.remove('castle-bottom-content-btn-disable');
      View.arrows.rd.classList.remove('castle-bottom-content-btn-disable');
    }
  }

  static async castleQuestUpdate() {
    let request;

    try {
      request = await App.api.request('quest', 'list');

      if (!('crystal' in request)) {
        alert(request);
        return App.error(`Неизвестное число кристаллов: ${JSON.stringify(request)}`);
      }

      View.castleTotalCrystal.firstChild.innerText = request.crystal;
    } catch (error) {
      return App.error(error);
    }

    while (View.castleQuestBody.firstChild) {
      View.castleQuestBody.firstChild.remove();
    }

    const list = DOM({ style: 'quest-list' });
    const PAGE = 4;
    let start = 0;
    const items = [];

    const btnUp = DOM({
      domaudio: domAudioPresets.smallButton,
      style: ['quest-arrow', 'quest-arrow-up'],
      event: [
        'click',
        () => {
          if (start > 0) {
            start--;
            render();
          }
        },
      ],
    });

    const btnDown = DOM({
      domaudio: domAudioPresets.smallButton,
      style: ['quest-arrow', 'quest-arrow-down'],
      event: [
        'click',
        () => {
          if (start < Math.max(0, items.length - PAGE)) {
            start++;
            render();
          }
        },
      ],
    });

    if (request.quests.length > PAGE) {
      View.castleQuestBody.append(btnUp, list, btnDown); // порядок: ▲ список ▼
    } else {
      View.castleQuestBody.append(list); // порядок: ▲ список ▼
    }

    for (let item of request.quests) {
      let hero = DOM({ style: 'quest-item-hero' }, DOM({ style: 'quest-item-portrait-glass' }));
      hero.style.backgroundImage = `url(content/hero/${item.heroId}/1.webp)`;

      let timer = DOM({ style: 'quest-item-timer' });
      const tick = () => {
        item.timer = item.timer - 1000;
        timer.textContent = Timer.getFormattedTimer(item.timer);
      };
      tick();
      setInterval(tick, 1000);

      let quest = DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'quest-item',
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            () => {
              // Удаляем возможные предыдущие окна и не передаём превью-ноду
              document.querySelectorAll('#wquest').forEach((n) => n.remove());
              Window.show('main', 'quest', item);
            },
          ],
        },
        DOM(
          { style: 'quest-item-portrait-background' },
          hero,
          item.status == 1
            ? ''
            : DOM({
                style: item.status == 0 ? 'quest-item-exclamation' : 'quest-item-completed',
              }),
        ),
        item.status == 1 ? timer : '',
      );

      items.push(quest);
      if (items.length <= PAGE) list.append(quest);
    }

    function render() {
      list.innerHTML = '';
      const end = Math.min(start + PAGE, items.length);
      for (let i = start; i < end; i++) list.append(items[i]);
      const maxStart = Math.max(0, items.length - PAGE);
      const noScroll = items.length <= PAGE;
      btnUp.classList.toggle('disabled', noScroll || start === 0);
      btnDown.classList.toggle('disabled', noScroll || start >= maxStart);
    }

    list.addEventListener(
      'wheel',
      (event) => {
        if (items.length <= PAGE) return;
        if (!event.deltaY) return;
        event.preventDefault();
        const maxStart = Math.max(0, items.length - PAGE);
        if (event.deltaY > 0) {
          if (start < maxStart) {
            start++;
            render();
          }
        } else if (start > 0) {
          start--;
          render();
        }
      },
      { passive: false },
    );

    render();
  }

  static bodyCastleBuildings() {
    View.castleActiveTab = 'buildings';
    View.castleHeroDeleteConfirmListId = 0;
    View.castleFriendClearConfirm = false;
    View.cleanupCastleHeroPhantomList();
    View.castleHeroListsBar?.classList?.add('castle-hero-lists-bar-hidden');
    View.castleHeroListsBar?.replaceChildren?.();
    View.castleHeroPinnedEditor?.replaceChildren?.();
    View.castleBottom?.classList?.remove('castle-bottom-content-with-editor');
    while (View.castleBottom.firstChild) {
      View.castleBottom.firstChild.remove();
    }

    let selectedFaction = -1;
    if (Castle.currentSceneName == 'ad') {
      selectedFaction = 0;
    }
    if (Castle.currentSceneName == 'doct') {
      selectedFaction = 1;
    }
    if (selectedFaction == -1) {
      return;
    }

    let preload = new PreloadImages(View.castleBottom);

    for (let i = 1; i < Castle.buildings.length; ++i) {
      let item = Castle.buildings[i];
      let itemName = Lang.text(Castle.buildingsNames[i][selectedFaction]);

      let buildingName = DOM({ style: 'castle-hero-name' }, DOM({}, itemName));

      if (itemName.length > 10) {
        buildingName.firstChild.classList.add('castle-name-autoscroll');
      }

      let buildingNameBase = DOM({ style: 'castle-item-hero-name' }, buildingName);
      let buildingIcon = DOM({ style: 'buildingIcon', src: 'content/img/buildings/hammerIcon.png', tag: 'img' });
      let buildingIconBox = DOM({ style: 'buildingIconBox' }, buildingIcon);

      let building = DOM(
        { style: 'castle-building-item' },
        DOM({ style: ['castle-item-ornament', 'hover-brightness'] }),
        buildingNameBase,
        buildingIconBox,
      );

      building.dataset.url = `content/img/buildings/${Castle.currentSceneName}/${item}.png`;

      building.dataset.buildingId = i;

      building.addEventListener('click', async () => {
        // Сначала удаляем класс selectedBuild со всех зданий
        document.querySelectorAll('.castle-building-item').forEach((item) => {
          item.classList.remove('selectedBuild');
        });

        // Затем устанавливаем ID выбранного здания и добавляем класс
        Castle.phantomBuilding.id = building.dataset.buildingId;
        building.classList.add('selectedBuild');
      });

      preload.add(building);
    }
  }

  static getCastleHeroFavouriteMask(hero) {
    const raw = Number(hero?.favourite);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(255, raw | 0));
  }

  static isCastleHeroInList(hero, listId) {
    if (!Number.isFinite(listId) || listId < 1 || listId > View.CASTLE_HERO_LISTS_MAX) return false;
    const mask = View.getCastleHeroFavouriteMask(hero);
    return (mask & (1 << (listId - 1))) !== 0;
  }

  static getCastleCreatedHeroListCount() {
    let maxList = 0;
    for (const hero of View.castleHeroAll || []) {
      const mask = View.getCastleHeroFavouriteMask(hero);
      for (let bit = 0; bit < View.CASTLE_HERO_LISTS_MAX; bit++) {
        if (mask & (1 << bit)) {
          maxList = Math.max(maxList, bit + 1);
        }
      }
    }
    return maxList;
  }

  static persistCastleHeroSelectedList() {
    try {
      localStorage.setItem(View.CASTLE_HERO_LIST_STORAGE_KEY, String(View.castleHeroSelectedList || 0));
    } catch {}
  }

  static loadCastleHeroSelectedList() {
    try {
      const value = Number(localStorage.getItem(View.CASTLE_HERO_LIST_STORAGE_KEY));
      if (Number.isFinite(value) && value >= 0 && value <= View.CASTLE_HERO_LISTS_MAX) {
        View.castleHeroSelectedList = value;
      }
    } catch {}
  }

  static cleanupCastleHeroPhantomList() {
    if (!View.castleHeroPhantomList) return;
    const hasHeroes = (View.castleHeroAll || []).some((hero) => View.isCastleHeroInList(hero, View.castleHeroPhantomList));
    if (hasHeroes) {
      View.castleHeroPhantomList = 0;
      return;
    }
    if (View.castleHeroSelectedList === View.castleHeroPhantomList) {
      View.castleHeroSelectedList = 0;
    }
    View.castleHeroPhantomList = 0;
    View.castleHeroListEditMode = '';
    View.castleHeroEditSelection = new Set();
  }

  static async updateCastleHeroListBackend(action, listId, heroIds = []) {
    try {
      await App.api.request('build', 'favouriteSet', {
        action,
        list: listId,
        heroes: heroIds,
      });
    } catch (error) {
      App.error(error);
    }
  }

  static patchCastleHeroListLocal(action, listId, heroIds = []) {
    const bit = 1 << (listId - 1);
    const heroIdSet = new Set((heroIds || []).map((id) => Number(id)));
    for (const hero of View.castleHeroAll || []) {
      const heroId = Number(hero?.id);
      if (action === 'clear' || heroIdSet.has(heroId)) {
        let mask = View.getCastleHeroFavouriteMask(hero);
        if (action === 'add') mask = mask | bit;
        else mask = mask & (255 ^ bit);
        hero.favourite = mask;
      }
    }
  }

  static getCastleListButtonLabel(listId) {
    return listId === 0 ? '' : String(listId);
  }

  static loadCastleHeroListNames() {
    try {
      const raw = localStorage.getItem(View.CASTLE_HERO_LIST_NAMES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const names = {};
      for (let i = 1; i <= View.CASTLE_HERO_LISTS_MAX; i++) {
        const value = String(parsed?.[i] || '').trim();
        if (value) names[i] = value;
      }
      View.castleHeroListNames = names;
    } catch {
      View.castleHeroListNames = {};
    }
  }

  static persistCastleHeroListNames() {
    try {
      localStorage.setItem(View.CASTLE_HERO_LIST_NAMES_STORAGE_KEY, JSON.stringify(View.castleHeroListNames || {}));
    } catch {}
  }

  static getCastleHeroListName(listId) {
    const id = Number(listId) || 0;
    const custom = String(View.castleHeroListNames?.[id] || '').trim();
    return custom || `Список ${id}`;
  }

  static setCastleHeroListName(listId, value) {
    const id = Number(listId) || 0;
    if (id < 1 || id > View.CASTLE_HERO_LISTS_MAX) return;
    const name = String(value || '')
      .trim()
      .slice(0, 32);
    if (name) View.castleHeroListNames[id] = name;
    else delete View.castleHeroListNames[id];
    View.persistCastleHeroListNames();
  }

  static openCastleHeroListRenameDialog(listId) {
    const id = Number(listId) || 0;
    if (id < 1 || id > View.CASTLE_HERO_LISTS_MAX) return;
    const close = DOM({
      tag: 'div',
      domaudio: domAudioPresets.closeButton,
      style: 'close-button',
      event: ['click', () => Splash.hide()],
    });
    close.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
    const template = document.createDocumentFragment();
    const modal = DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('assembly')));
    const name = DOM({
      id: 'build-create-input',
      domaudio: domAudioPresets.defaultInput,
      tag: 'input',
      placeholder: Lang.text('buildNamePlaceholder'),
      value: String(View.castleHeroListNames?.[id] || ''),
    });
    const button = DOM(
      {
        style: 'splash-content-button-modal',
        domaudio: domAudioPresets.bigButton,
        event: [
          'click',
          () => {
            View.setCastleHeroListName(id, name.value);
            Splash.hide();
            View.renderCastleHeroesFromCache();
          },
        ],
      },
      Lang.text('renameBuild'),
    );
    template.append(modal, name, button, close);
    Splash.show(template);
    setTimeout(() => name.focus(), 0);
  }

  static renderCastleHeroListsToolbar() {
    const bar = View.castleHeroListsBar;
    if (!bar) return;
    bar.classList.remove('castle-friend-lists-bar');
    bar.replaceChildren();

    const createdCount = View.getCastleCreatedHeroListCount();
    const visibleCount = Math.max(createdCount, View.castleHeroPhantomList || 0);

    const allBtn = DOM(
      {
        style: [
          'castle-hero-list-btn',
          'castle-hero-list-btn-all',
          View.castleHeroSelectedList === 0 ? 'castle-hero-list-btn-active' : null,
        ].filter(Boolean),
        domaudio: domAudioPresets.defaultButton,
        title: Lang.text('titleheroes'),
        event: [
          'click',
          () => {
            View.castleHeroSelectedList = 0;
            View.castleHeroListEditMode = '';
            View.castleHeroEditSelection = new Set();
            View.castleHeroDeleteConfirmListId = 0;
            View.cleanupCastleHeroPhantomList();
            View.persistCastleHeroSelectedList();
            View.renderCastleHeroesFromCache();
          },
        ],
      },
      View.getCastleListButtonLabel(0),
    );
    bar.append(allBtn);

    for (let i = 1; i <= View.CASTLE_HERO_LISTS_MAX; i++) {
      if (i > visibleCount) continue;
      const isActive = View.castleHeroSelectedList === i;
      const isPhantom = View.castleHeroPhantomList === i;
      const btn = DOM(
        {
          style: [
            'castle-hero-list-btn',
            isActive ? 'castle-hero-list-btn-active' : null,
            isPhantom ? 'castle-hero-list-btn-phantom' : null,
          ].filter(Boolean),
          domaudio: domAudioPresets.defaultButton,
          title: View.getCastleHeroListName(i),
          event: [
            'click',
            () => {
              if (!isPhantom) {
                View.cleanupCastleHeroPhantomList();
              }
              View.castleHeroSelectedList = i;
              if (isPhantom && !View.castleHeroListEditMode) View.castleHeroListEditMode = 'add';
              View.castleHeroEditSelection = new Set();
              View.castleHeroDeleteConfirmListId = 0;
              View.persistCastleHeroSelectedList();
              View.renderCastleHeroesFromCache();
            },
          ],
        },
        View.getCastleListButtonLabel(i),
      );
      bar.append(btn);
    }

    if (visibleCount < View.CASTLE_HERO_LISTS_MAX) {
      const addBtn = DOM(
        {
          style: ['castle-hero-list-btn', 'castle-hero-list-btn-add'],
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            () => {
              if (View.castleHeroPhantomList) {
                View.castleHeroSelectedList = View.castleHeroPhantomList;
              } else {
                View.castleHeroPhantomList = visibleCount + 1;
                View.castleHeroSelectedList = View.castleHeroPhantomList;
              }
              View.castleHeroListEditMode = 'add';
              View.castleHeroEditSelection = new Set();
              View.castleHeroDeleteConfirmListId = 0;
              View.persistCastleHeroSelectedList();
              View.renderCastleHeroesFromCache();
            },
          ],
        },
        '',
      );
      bar.append(addBtn);
    }

    const searchWrap = DOM({
      style: ['castle-hero-list-search-wrap', View.castleHeroSearch ? 'castle-hero-list-search-wrap-has-value' : null].filter(Boolean),
    });

    const search = DOM({
      tag: 'input',
      style: 'castle-hero-list-search',
      placeholder: Lang.text('castleHeroFilterPlaceholder'),
      value: View.castleHeroSearch || '',
      event: [
        'input',
        (event) => {
          View.castleHeroSearch = String(event?.target?.value || '');
          if (View.castleHeroSearch) {
            searchWrap.classList.add('castle-hero-list-search-wrap-has-value');
          } else {
            searchWrap.classList.remove('castle-hero-list-search-wrap-has-value');
          }
          /* Не пересобирать toolbar: replaceChildren() снимает фокус с input */
          View.renderCastleHeroesFromCache({ refreshToolbar: false });
        },
      ],
    });
    const clearSearchBtn = DOM(
      {
        tag: 'button',
        type: 'button',
        style: 'castle-hero-list-search-clear',
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            if (!search.value) return;
            search.value = '';
            View.castleHeroSearch = '';
            searchWrap.classList.remove('castle-hero-list-search-wrap-has-value');
            search.focus();
            View.renderCastleHeroesFromCache({ refreshToolbar: false });
          },
        ],
      },
      '×',
    );
    searchWrap.append(search, clearSearchBtn);
    bar.append(searchWrap);
  }

  static buildCastleHeroListEditorCard(listId) {
    const mode = View.castleHeroListEditMode || '';
    const listName = View.getCastleHeroListName(listId);
    const modeClass =
      mode === 'add'
        ? 'castle-hero-list-editor-mode-add'
        : mode === 'remove'
          ? 'castle-hero-list-editor-mode-remove'
          : 'castle-hero-list-editor-mode-idle';
    const titleText =
      mode === 'add' ? `Добавить выбранных героев в ${listName}` : mode === 'remove' ? `Удалить выбранных героев из ${listName}` : listName;
    const totalHeroes = (View.castleHeroAll || []).length;
    let heroesInList = 0;
    for (const hero of View.castleHeroAll || []) {
      if (View.isCastleHeroInList(hero, listId)) heroesInList++;
    }
    const canAddToList = totalHeroes > 0 && heroesInList < totalHeroes;
    const canRemoveFromList = heroesInList > 0;

    const topPlus = DOM(
      {
        style: [
          'castle-hero-list-editor-sign',
          'castle-hero-list-editor-sign-add',
          canAddToList ? null : 'castle-hero-list-editor-sign-disabled',
        ].filter(Boolean),
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            if (!canAddToList) return;
            View.castleHeroListEditMode = 'add';
            View.castleHeroEditSelection = new Set();
            View.castleHeroDeleteConfirmListId = 0;
            View.renderCastleHeroesFromCache();
          },
        ],
      },
      '',
    );
    const bottomMinus = DOM(
      {
        style: [
          'castle-hero-list-editor-sign',
          'castle-hero-list-editor-sign-remove',
          canRemoveFromList ? null : 'castle-hero-list-editor-sign-disabled',
        ].filter(Boolean),
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            if (!canRemoveFromList) return;
            View.castleHeroListEditMode = 'remove';
            View.castleHeroEditSelection = new Set();
            View.castleHeroDeleteConfirmListId = 0;
            View.renderCastleHeroesFromCache();
          },
        ],
      },
      '',
    );

    const confirm = DOM(
      {
        style: ['castle-hero-list-editor-confirm', 'castle-hero-list-editor-confirm-action'],
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          async () => {
            const selectedCount = View.castleHeroEditSelection?.size || 0;
            if (!selectedCount) return;
            const currentMode = View.castleHeroListEditMode || '';
            const action = currentMode === 'add' ? 'add' : 'remove';
            const heroIds = Array.from(View.castleHeroEditSelection || []);
            await View.updateCastleHeroListBackend(action, listId, heroIds);
            View.patchCastleHeroListLocal(action, listId, heroIds);
            View.castleHeroEditSelection = new Set();
            View.castleHeroListEditMode = '';
            View.castleHeroDeleteConfirmListId = 0;
            View.cleanupCastleHeroPhantomList();
            View.renderCastleHeroesFromCache();
          },
        ],
      },
      'Подтвердить',
    );
    const clear = DOM(
      {
        style: ['castle-hero-list-editor-confirm', 'castle-hero-list-editor-delete-action'],
        domaudio: domAudioPresets.defaultButton,
        title: `Удалить список ${listId}`,
        event: [
          'click',
          async () => {
            if (View.castleHeroDeleteConfirmListId !== listId) {
              View.castleHeroDeleteConfirmListId = listId;
              View.renderCastleHeroesFromCache({ refreshToolbar: false });
              return;
            }
            await View.updateCastleHeroListBackend('clear', listId, []);
            View.patchCastleHeroListLocal('clear', listId, []);
            View.setCastleHeroListName(listId, '');
            View.castleHeroEditSelection = new Set();
            View.castleHeroListEditMode = '';
            View.castleHeroDeleteConfirmListId = 0;
            View.cleanupCastleHeroPhantomList();
            View.renderCastleHeroesFromCache();
          },
        ],
      },
      View.castleHeroDeleteConfirmListId === listId ? Lang.text('confirmAction') : 'Удалить список',
    );

    const middle = DOM(
      {
        style: 'castle-hero-list-editor-middle',
        event: [
          'click',
          (event) => {
            event.preventDefault();
            View.openCastleHeroListRenameDialog(listId);
          },
        ],
      },
      DOM({}, titleText),
    );
    middle.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      View.openCastleHeroListRenameDialog(listId);
      return false;
    });

    return DOM(
      { style: ['castle-hero-item', 'castle-hero-list-editor-item', modeClass] },
      DOM({ style: 'castle-item-background' }),
      DOM({ style: 'castle-item-ornament' }),
      DOM({ style: 'castle-hero-list-editor-top' }, topPlus, bottomMinus),
      middle,
      DOM({ style: 'castle-hero-list-editor-bottom' }, confirm, clear),
    );
  }

  static renderCastleHeroesFromCache(options = {}) {
    if (!View.castleBottom) return;
    if (options.refreshToolbar !== false) {
      View.renderCastleHeroListsToolbar();
    }

    const selectedList = Number(View.castleHeroSelectedList) || 0;
    if (View.castleHeroPrevSelectedList !== selectedList) {
      View.castleHeroEditSelection = new Set();
      View.castleHeroDeleteConfirmListId = 0;
      View.castleHeroPrevSelectedList = selectedList;
    }
    const editMode = selectedList > 0 ? View.castleHeroListEditMode : '';
    const searchVariants = View.getLayoutAwareSearchVariants(View.castleHeroSearch);
    const hasSearch = searchVariants.length > 0;
    const preload = new PreloadImages(View.castleBottom);
    const pinnedEditorRoot = View.castleHeroPinnedEditor;
    let renderedHeroCount = 0;

    View.castleBottom.replaceChildren();
    pinnedEditorRoot?.replaceChildren?.();
    View.castleBottom.classList.toggle('castle-bottom-content-with-editor', selectedList > 0);

    if (selectedList > 0) {
      pinnedEditorRoot?.append(View.buildCastleHeroListEditorCard(selectedList));
    }

    for (let item of View.castleHeroAll || []) {
      const localizedNameRaw = String(Lang.heroName(item.id, item.skin) || item.name || `Hero ${item.id}`);
      const localizedName = localizedNameRaw.replace(/<[^>]*>/g, '').trim();
      const fallbackName = String(item?.name || '')
        .replace(/<[^>]*>/g, '')
        .trim();
      const customNames = getHeroSearchAliases(item.id)
        .map((name) =>
          String(name)
            .replace(/<[^>]*>/g, '')
            .trim(),
        )
        .filter(Boolean)
        .join(' ');
      const filterHaystack = `${localizedName} ${fallbackName} ${customNames}`.toLowerCase();
      const filterWords = View.splitSearchWords(filterHaystack);
      if (hasSearch && !searchVariants.some((variant) => View.isFuzzySearchVariantMatch(filterHaystack, filterWords, variant))) {
        continue;
      }

      if (selectedList > 0) {
        const inList = View.isCastleHeroInList(item, selectedList);
        if (!editMode && !inList) continue;
        if (editMode === 'add' && inList) continue;
        if (editMode === 'remove' && !inList) continue;
      }

      const heroName = DOM({ style: 'castle-hero-name' }, DOM({}, localizedName));
      if (localizedName.length > 10) {
        heroName.firstChild.classList.add('castle-name-autoscroll');
      }
      let heroNameBase = DOM({ style: ['castle-item-hero-name', 'hover-brightness'] }, heroName);
      let rank = Rank.createRankNode(item.rating, { stylePrefix: 'castle-hero-' });
      const hero = DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          id: `id${item.id}`,
          style: ['castle-hero-item', 'hover-brightness'],
        },
        DOM({ style: ['castle-item-background', 'hover-brightness'] }),
        DOM({ style: ['castle-hero-item-bg', 'hover-brightness'] }),
        DOM({ style: ['castle-hero-item-img', 'no-hover-brightness'] }),
        DOM({ style: ['castle-item-ornament', 'hover-brightness'] }),
        rank,
        heroNameBase,
      );

      hero.dataset.heroId = String(item.id);
      hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;

      if (editMode) {
        const selected = View.castleHeroEditSelection.has(Number(item.id));
        const pick = DOM({ style: ['castle-hero-list-pick', selected ? 'castle-hero-list-pick-active' : null].filter(Boolean) }, '');
        hero.append(pick);
        hero.addEventListener('click', () => {
          const heroId = Number(item.id);
          const isSelected = View.castleHeroEditSelection.has(heroId);
          if (isSelected) View.castleHeroEditSelection.delete(heroId);
          else View.castleHeroEditSelection.add(heroId);
          pick.classList.toggle('castle-hero-list-pick-active', !isSelected);
        });
      } else {
        hero.addEventListener('click', async () => {
          View.setCastleOpenedBuildHero(item.id);
          await Window.show('main', 'build', item.id, 0, true);
          View.syncCastleOpenedBuildHeroGlow();
        });
      }

      preload.add(hero);
      renderedHeroCount++;
    }

    if (renderedHeroCount === 0) {
      const emptyText = hasSearch ? 'Ничего не найдено' : 'Список пуст';
      View.castleBottom.append(
        DOM(
          { style: ['castle-hero-item', 'castle-hero-list-empty-item'] },
          DOM({ style: 'castle-item-background' }),
          DOM({ style: 'castle-item-ornament' }),
          DOM({ style: 'castle-hero-list-empty-label' }, emptyText),
        ),
      );
    }

    View.syncCastleOpenedBuildHeroGlow();
    View.updateArrows();
  }

  static loadCastleFriendSelectedList() {
    try {
      const value = Number(localStorage.getItem(View.CASTLE_FRIEND_LIST_STORAGE_KEY));
      if (Number.isFinite(value) && value >= 0 && value <= View.CASTLE_FRIEND_LISTS_MAX) {
        View.castleFriendSelectedList = value;
      }
    } catch {}
  }

  static persistCastleFriendSelectedList() {
    try {
      localStorage.setItem(View.CASTLE_FRIEND_LIST_STORAGE_KEY, String(View.castleFriendSelectedList || 0));
    } catch {}
  }

  static isCastleFriendInList(item, listId) {
    if (!Number.isFinite(listId) || listId < 1 || listId > 8) return false;
    const mask = Number(item?.favourite) || 0;
    return (mask & (1 << (listId - 1))) !== 0;
  }

  static patchCastleFriendListLocal(action, listId, friendIds = []) {
    const bit = 1 << (listId - 1);
    const ids = new Set((friendIds || []).map((id) => Number(id)));
    for (const item of View.castleFriendAll || []) {
      const id = Number(item?.id);
      if (action === 'clear' || ids.has(id)) {
        let mask = Number(item?.favourite) || 0;
        if (action === 'add') mask = mask | bit;
        else mask = mask & (255 ^ bit);
        item.favourite = mask;
      }
    }
  }

  static async updateCastleFriendListBackend(action, listId, friendIds = []) {
    try {
      await App.api.request('friend', 'favouriteSet', {
        action,
        list: listId,
        friends: friendIds,
      });
    } catch (error) {
      App.error(error);
    }
  }

  static renderCastleFriendListsToolbar() {
    const bar = View.castleHeroListsBar;
    if (!bar) return;
    bar.replaceChildren();
    bar.classList.remove('castle-hero-lists-bar-hidden');
    bar.classList.add('castle-friend-lists-bar');

    const allBtn = DOM(
      {
        style: [
          'castle-hero-list-btn',
          'castle-hero-list-btn-all',
          'castle-friend-list-btn-all',
          View.castleFriendSelectedList === 0 ? 'castle-hero-list-btn-active' : null,
        ].filter(Boolean),
        domaudio: domAudioPresets.defaultButton,
        title: Lang.text('titlefriends'),
        event: [
          'click',
          () => {
            View.castleFriendSelectedList = 0;
            View.castleFriendListEditMode = '';
            View.castleFriendEditSelection = new Set();
            View.castleFriendClearConfirm = false;
            View.persistCastleFriendSelectedList();
            View.renderCastleFriendsFromCache();
          },
        ],
      },
      '',
    );
    bar.append(allBtn);

    const favBtn = DOM(
      {
        style: [
          'castle-hero-list-btn',
          'castle-friend-list-btn-fav',
          View.castleFriendSelectedList === 1 ? 'castle-hero-list-btn-active' : null,
        ].filter(Boolean),
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            View.castleFriendSelectedList = 1;
            View.castleFriendEditSelection = new Set();
            View.castleFriendClearConfirm = false;
            View.persistCastleFriendSelectedList();
            View.renderCastleFriendsFromCache();
          },
        ],
      },
      '',
    );
    bar.append(favBtn);

    const searchWrap = DOM({
      style: ['castle-hero-list-search-wrap', View.castleFriendSearch ? 'castle-hero-list-search-wrap-has-value' : null].filter(Boolean),
    });

    const search = DOM({
      tag: 'input',
      style: 'castle-hero-list-search',
      placeholder: Lang.text('friendNicknamePlaceholder'),
      value: View.castleFriendSearch || '',
      event: [
        'input',
        (event) => {
          View.castleFriendSearch = String(event?.target?.value || '');
          if (View.castleFriendSearch) {
            searchWrap.classList.add('castle-hero-list-search-wrap-has-value');
          } else {
            searchWrap.classList.remove('castle-hero-list-search-wrap-has-value');
          }
          View.renderCastleFriendsFromCache({ refreshToolbar: false });
        },
      ],
    });
    const clearSearchBtn = DOM(
      {
        tag: 'button',
        type: 'button',
        style: 'castle-hero-list-search-clear',
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            if (!search.value) return;
            search.value = '';
            View.castleFriendSearch = '';
            searchWrap.classList.remove('castle-hero-list-search-wrap-has-value');
            search.focus();
            View.renderCastleFriendsFromCache({ refreshToolbar: false });
          },
        ],
      },
      '×',
    );
    searchWrap.append(search, clearSearchBtn);
    bar.append(searchWrap);
  }

  static buildCastleFriendListEditorCard() {
    const mode = View.castleFriendListEditMode || '';
    let friendsInList = 0;
    for (const f of View.castleFriendAll || []) {
      if (Number(f?.status) === 1 && View.isCastleFriendInList(f, 1)) friendsInList++;
    }
    const totalFriends = (View.castleFriendAll || []).filter((f) => Number(f?.status) === 1).length;
    const canAdd = totalFriends > 0 && friendsInList < totalFriends;
    const canRemove = friendsInList > 0;

    const topPlus = DOM(
      {
        style: [
          'castle-hero-list-editor-sign',
          'castle-hero-list-editor-sign-add',
          canAdd ? null : 'castle-hero-list-editor-sign-disabled',
        ].filter(Boolean),
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            if (!canAdd) return;
            View.castleFriendListEditMode = 'add';
            View.castleFriendEditSelection = new Set();
            View.castleFriendClearConfirm = false;
            View.renderCastleFriendsFromCache({ refreshToolbar: false });
          },
        ],
      },
      '',
    );
    const bottomMinus = DOM(
      {
        style: [
          'castle-hero-list-editor-sign',
          'castle-hero-list-editor-sign-remove',
          canRemove ? null : 'castle-hero-list-editor-sign-disabled',
        ].filter(Boolean),
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            if (!canRemove) return;
            View.castleFriendListEditMode = 'remove';
            View.castleFriendEditSelection = new Set();
            View.castleFriendClearConfirm = false;
            View.renderCastleFriendsFromCache({ refreshToolbar: false });
          },
        ],
      },
      '',
    );

    const confirm = DOM(
      {
        style: ['castle-hero-list-editor-confirm', 'castle-hero-list-editor-confirm-action'],
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          async () => {
            const selectedCount = View.castleFriendEditSelection?.size || 0;
            if (!selectedCount) return;
            const ids = Array.from(View.castleFriendEditSelection || []);
            const currentMode = View.castleFriendListEditMode || '';
            if (currentMode === 'add') {
              await View.updateCastleFriendListBackend('add', 1, ids);
              View.patchCastleFriendListLocal('add', 1, ids);
            } else {
              await View.updateCastleFriendListBackend('remove', 1, ids);
              View.patchCastleFriendListLocal('remove', 1, ids);
            }
            View.castleFriendEditSelection = new Set();
            View.castleFriendListEditMode = '';
            View.castleFriendClearConfirm = false;
            View.renderCastleFriendsFromCache({ refreshToolbar: false });
          },
        ],
      },
      'Подтвердить',
    );

    const clear = DOM(
      {
        style: ['castle-hero-list-editor-confirm', 'castle-hero-list-editor-delete-action'],
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          async () => {
            if (!View.castleFriendClearConfirm) {
              View.castleFriendClearConfirm = true;
              View.renderCastleFriendsFromCache({ refreshToolbar: false });
              return;
            }
            await View.updateCastleFriendListBackend('clear', 1, []);
            View.patchCastleFriendListLocal('clear', 1, []);
            View.castleFriendEditSelection = new Set();
            View.castleFriendListEditMode = '';
            View.castleFriendClearConfirm = false;
            View.castleFriendSelectedList = 0;
            View.persistCastleFriendSelectedList();
            View.renderCastleFriendsFromCache({ refreshToolbar: false });
          },
        ],
      },
      View.castleFriendClearConfirm ? Lang.text('confirmAction') : Lang.text('friendListClear'),
    );

    const modeClass =
      mode === 'add'
        ? 'castle-hero-list-editor-mode-add'
        : mode === 'remove'
          ? 'castle-hero-list-editor-mode-remove'
          : 'castle-hero-list-editor-mode-idle';
    const titleText = mode === 'add' ? 'Добавить друзей в список' : mode === 'remove' ? 'Удалить друзей из списка' : 'Избранные друзья';

    return DOM(
      { style: ['castle-hero-item', 'castle-hero-list-editor-item', modeClass] },
      DOM({ style: 'castle-item-background' }),
      DOM({ style: 'castle-item-ornament' }),
      DOM({ style: 'castle-hero-list-editor-top' }, topPlus, bottomMinus),
      DOM({ style: 'castle-hero-list-editor-middle' }, DOM({}, titleText)),
      DOM({ style: 'castle-hero-list-editor-bottom' }, confirm, clear),
    );
  }

  static renderCastleFriendsFromCache(options = {}) {
    if (!View.castleBottom) return;
    if (options.refreshToolbar !== false) {
      View.renderCastleFriendListsToolbar();
    }

    const selectedList = Number(View.castleFriendSelectedList) || 0;
    const editMode = selectedList > 0 ? View.castleFriendListEditMode : '';
    const searchVariants = View.getLayoutAwareSearchVariants(View.castleFriendSearch);
    const hasSearch = searchVariants.length > 0;
    const pinnedEditorRoot = View.castleHeroPinnedEditor;
    const preload = new PreloadImages(View.castleBottom);

    View.castleBottom.replaceChildren();
    pinnedEditorRoot?.replaceChildren?.();
    View.castleBottom.classList.toggle('castle-bottom-content-with-editor', selectedList > 0);
    if (selectedList > 0) {
      pinnedEditorRoot?.append(View.buildCastleFriendListEditorCard());
    }

    const modal = DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('searchForFriends')));
    const buttonAdd = DOM(
      {
        style: 'castle-friend-item',
        onclick: () => {
          let input = DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultInput,
            style: 'search-input',
            id: 'search-friend-window-input',
            placeholder: Lang.text('friendNicknamePlaceholder'),
          });
          let body = DOM({ style: 'search-body' });
          let closeButton = DOM({
            tag: 'div',
            domaudio: domAudioPresets.closeButton,
            style: 'close-button',
            event: ['click', () => Splash.hide()],
          });
          closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
          let search = DOM({ style: 'search' }, modal, input, body, closeButton);
          const inviteFromFavList = (Number(View.castleFriendSelectedList) || 0) === 1;
          input.addEventListener('input', async () => {
            const request = await App.api.request('user', 'find', { nickname: input.value });
            while (body.firstChild) body.firstChild.remove();
            for (const found of request || []) {
              const openAdminFoundUserModal = () => {
                let adminBody = document.createDocumentFragment();
                adminBody.append(
                  DOM({}, found.nickname),
                  DOM(
                    {
                      domaudio: domAudioPresets.bigButton,
                      style: 'splash-content-button',
                      event: [
                        'click',
                        async () => {
                          await App.api.request('user', 'blocked', { id: found.id });
                          Splash.hide();
                        },
                      ],
                    },
                    found.blocked ? 'Разблокировать' : 'Заблокировать',
                  ),
                  DOM(
                    {
                      domaudio: domAudioPresets.bigButton,
                      style: 'splash-content-button',
                      event: [
                        'click',
                        async () => {
                          await App.api.request('user', 'mute', { id: found.id });
                          Splash.hide();
                        },
                      ],
                    },
                    found.mute ? 'Убрать мут' : 'Мут чата',
                  ),
                  DOM(
                    {
                      domaudio: domAudioPresets.bigButton,
                      style: 'splash-content-button',
                      event: [
                        'click',
                        async () => {
                          let password = await App.api.request('user', 'restore', { id: found.id });
                          App.notify(`Скопировано в буфер обмена! Пароль: ${password}`);
                          navigator.clipboard.writeText(password);
                        },
                      ],
                    },
                    'Сброс пароля',
                  ),
                  DOM(
                    {
                      domaudio: domAudioPresets.closeButton,
                      style: 'splash-content-button',
                      event: ['click', () => Splash.hide()],
                    },
                    Lang.text('cancel'),
                  ),
                );
                Splash.show(adminBody);
              };

              const template = DOM(
                {
                  domaudio: domAudioPresets.defaultButton,
                  event: [
                    'click',
                    async () => {
                      await App.api.request('friend', 'request', { id: found.id, fromFav: inviteFromFavList ? 1 : 0 });
                      if (inviteFromFavList) {
                        View.patchCastleFriendListLocal('add', 1, [found.id]);
                        await View.updateCastleFriendListBackend('add', 1, [found.id]);
                      }
                      App.notify(`Заявка в друзья ${found.nickname} отправлена`, 1000);
                      Splash.hide();
                      View.bodyCastleFriends();
                    },
                  ],
                },
                found.nickname,
              );

              if (App.isAdmin() && 'blocked' in found) {
                template.addEventListener('contextmenu', (event) => {
                  event.preventDefault();
                  openAdminFoundUserModal();
                  return false;
                });
                if (found.mute) template.style.color = 'yellow';
                if (found.blocked) template.style.color = 'red';
              }

              body.append(template);
            }
          });
          Splash.show(search, false);
          input.focus();
        },
      },
      DOM(
        { style: 'castle-friend-item-middle' },
        DOM(
          { style: 'castle-item-hero-name' },
          DOM({ style: ['castle-hero-name', 'add-to-friend-text'] }, DOM({ tag: 'span' }, Lang.text('addFriend'))),
        ),
        DOM({ src: 'content/hero/addFriend.png', style: 'addToFriendIcon', tag: 'img' }),
        DOM({ style: ['castle-item-ornament', 'hover-brightness'] }),
        DOM(
          { style: 'castle-friend-item-bottom' },
          DOM({ style: ['castle-friend-add-group', 'add-to-friend-button'] }, Lang.text('inviteToAFriend')),
        ),
      ),
    );
    buttonAdd.dataset.url = `content/hero/empty.png`;
    preload.add(buttonAdd);
    View.castleBottom.append(buttonAdd);

    for (let item of View.castleFriendAll || []) {
      const status = Number(item?.status);
      const nickname = String(item?.nickname || '');
      const nicknameLower = nickname.toLowerCase();
      const nicknameWords = View.splitSearchWords(nicknameLower);
      if (hasSearch && !searchVariants.some((variant) => View.isFuzzySearchVariantMatch(nicknameLower, nicknameWords, variant))) continue;
      const inList = status === 1 && View.isCastleFriendInList(item, 1);
      if (selectedList > 0) {
        const inFavList = View.isCastleFriendInList(item, 1);
        if (editMode) {
          if (status !== 1) continue;
          if (editMode === 'add' && inFavList) continue;
          if (editMode === 'remove' && !inFavList) continue;
        } else {
          if (!inFavList) continue;
        }
      }

      const heroName = DOM({ style: 'castle-hero-name' }, DOM({ tag: 'span' }, nickname));
      if (nickname.length > 10) heroName.firstChild.classList.add('castle-name-autoscroll');
      let heroNameBase = DOM({ style: 'castle-item-hero-name' }, heroName);
      let bottom = DOM({ style: 'castle-friend-item-bottom' });
      let friend = DOM({ style: 'castle-friend-item' }, DOM({ style: ['castle-item-ornament', 'hover-brightness'] }), heroNameBase, bottom);

      if (editMode && status === 1) {
        const selected = View.castleFriendEditSelection.has(Number(item.id));
        const pick = DOM({ style: ['castle-hero-list-pick', selected ? 'castle-hero-list-pick-active' : null].filter(Boolean) });
        friend.append(pick);
        friend.addEventListener('click', () => {
          const id = Number(item.id);
          const isSelected = View.castleFriendEditSelection.has(id);
          if (isSelected) View.castleFriendEditSelection.delete(id);
          else View.castleFriendEditSelection.add(id);
          pick.classList.toggle('castle-hero-list-pick-active', !isSelected);
        });
      } else {
        // Keep existing friend actions in non-edit mode (copied minimal core behavior).
        if (status == 1) {
          let group = DOM({ style: 'castle-friend-add-group' }, item.online ? Lang.text('inviteToAGroup') : Lang.text('friendIsOffline'));
          let call = DOM({ style: 'castle-friend-add-group' }, Lang.text('callAFriend'));
          if (!item.online) {
            group.style.filter = 'grayscale(0.8)';
            call.style.filter = 'grayscale(.8)';
          } else {
            group.onclick = async () => {
              await App.api.request(App.CURRENT_MM, 'inviteParty', { id: item.id });
              App.notify(Lang.text('friendAcceptText').replace('{nickname}', item.nickname));
            };
            call.onclick = async () => {
              try {
                let voice = new Voice(item.id, 'friend', item.nickname, true);
                await voice.call();
              } catch (error) {
                App.error(error);
              }
            };
          }
          friend.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            let body = document.createDocumentFragment();
            const modal = DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('friends')));
            let removeButton = DOM(
              {
                domaudio: domAudioPresets.smallButton,
                style: 'splash-content-button',
                event: [
                  'click',
                  async () => {
                    await App.api.request('friend', 'remove', {
                      id: item.id,
                    });
                    friend.remove();
                    Splash.hide();
                  },
                ],
              },
              Lang.text('friendRemove'),
            );
            let profileButton = DOM(
              {
                domaudio: domAudioPresets.smallButton,
                style: 'splash-content-button',
                event: [
                  'click',
                  () => {
                    Splash.hide();
                    App.openStatsProfile({ id: item.id, login: item.nickname });
                  },
                ],
              },
              Lang.text('showStatistics'),
            );
            let cancelButton = DOM(
              {
                domaudio: domAudioPresets.closeButton,
                style: 'splash-content-button',
                event: ['click', () => Splash.hide()],
              },
              Lang.text('friendCancle'),
            );
            body.append(
              modal,
              DOM({ id: 'friendRemoveText' }, String(item.nickname || '')),
              profileButton,
              removeButton,
              cancelButton,
            );
            Splash.show(body);
            return false;
          });
          bottom.append(call, group);
        } else if (status == 2) {
          bottom.append(
            DOM(
              {
                domaudio: domAudioPresets.smallButton,
                style: 'castle-friend-confirm',
                event: [
                  'click',
                  async () => {
                    await App.api.request('friend', 'accept', { id: item.id });
                    View.bodyCastleFriends();
                  },
                ],
              },
              Lang.text('friendAccept'),
            ),
            DOM(
              {
                domaudio: domAudioPresets.smallButton,
                style: 'castle-friend-cancel',
                event: [
                  'click',
                  async () => {
                    await App.api.request('friend', 'remove', { id: item.id });
                    View.bodyCastleFriends();
                  },
                ],
              },
              Lang.text('friendDecline'),
            ),
          );
        } else if (status == 3) {
          friend.append(
            DOM({ style: 'castle-friend-item-middle' }, DOM({ style: 'castle-friend-request' }, Lang.text('friendAcceptWaiting'))),
          );
          friend.style.filter = 'grayscale(1)';
          bottom.append(
            DOM(
              {
                domaudio: domAudioPresets.smallButton,
                style: 'castle-friend-cancel',
                event: [
                  'click',
                  async () => {
                    await App.api.request('friend', 'remove', { id: item.id });
                    View.bodyCastleFriends();
                  },
                ],
              },
              Lang.text('cancel'),
            ),
          );
        }
      }

      if (status == 1 && item.online && Number(item.mobile) == 1) {
        friend.append(DOM({ style: 'castle-friend-mobile-emoji' }, '📱'));
      }

      friend.dataset.url = `content/hero/friendLogo.png`;
      preload.add(friend);
    }

    View.updateArrows();
  }

  static bodyCastleHeroes() {
    View.castleActiveTab = 'heroes';
    View.castleHeroDeleteConfirmListId = 0;
    View.castleFriendClearConfirm = false;
    View.castleHeroListsBar?.classList?.remove('castle-hero-lists-bar-hidden');
    View.loadCastleHeroSelectedList();
    View.loadCastleHeroListNames();
    if (View.castleHeroSelectedList === 0) View.castleHeroListEditMode = '';

    App.api.silent(
      (result) => {
        if (View.castleActiveTab !== 'heroes') return;
        MM.hero = Array.isArray(result) ? result : [];
        View.castleHeroAll = Array.isArray(result) ? result : [];
        View.cleanupCastleHeroPhantomList();
        const maxAllowed = Math.max(View.getCastleCreatedHeroListCount(), View.castleHeroPhantomList || 0);
        if (View.castleHeroSelectedList > maxAllowed && View.castleHeroSelectedList > 0) {
          View.castleHeroSelectedList = 0;
          View.castleHeroListEditMode = '';
          View.castleHeroEditSelection = new Set();
        }
        View.persistCastleHeroSelectedList();
        View.renderCastleHeroesFromCache();
      },
      'build',
      'heroAll',
    );
  }

  static bodyCastleFriends() {
    View.castleActiveTab = 'friends';
    View.castleHeroDeleteConfirmListId = 0;
    View.castleFriendClearConfirm = false;
    View.cleanupCastleHeroPhantomList();
    View.castleHeroListsBar?.classList?.remove('castle-hero-lists-bar-hidden');
    View.castleHeroPinnedEditor?.replaceChildren?.();
    View.loadCastleFriendSelectedList();
    View.renderCastleFriendsFromCache();

    App.api.silent(
      (result) => {
        if (View.castleActiveTab !== 'friends') return;
        View.setFriendIncomingStatus(Array.isArray(result) && result.some((item) => Number(item?.status) == 2));
        View.castleFriendAll = Array.isArray(result) ? result : [];
        View.renderCastleFriendsFromCache();
      },
      'friend',
      'list',
    );
  }

  static exitOrLogout() {
    let logout = DOM(
      {
        domaudio: domAudioPresets.smallButton,
        event: [
          'click',
          async () => {
            App.exit();

            Splash.hide();
          },
        ],
      },
      'Выйти из аккаунта',
    );

    let close = DOM({ domaudio: domAudioPresets.closeButton, event: ['click', () => Splash.hide()] }, 'Отмена');

    let wrap = DOM({ style: 'wrap' }, logout, close);

    if (NativeAPI.status) {
      let exit = DOM({ domaudio: domAudioPresets.closeButton, event: ['click', () => NativeAPI.exit()] }, Lang.text('exit'));

      wrap = DOM({ style: 'wrap' }, logout, exit, close);
    }

    let dom = DOM({ style: 'div' }, '', wrap);

    Splash.show(dom);
  }

  static header() {
    let play = MM.play();

    play.classList.add('main-header-item');

    play.classList.add('button-play');

    play.classList.remove('castle-button-play');

    let playButton = DOM({ style: 'menu-button-play' }, play);

    let menu = DOM(
      { style: 'main-header' },
      DOM({
        domaudio: domAudioPresets.defaultButton,
        tag: 'img',
        src: 'content/img/logo.webp',
        event: ['click', () => View.show('castle')],
      }),
      playButton,
    );

    if (App.isAdmin()) {
      let adm = DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'main-header-item',
          event: [
            'click',
            () => {
              let body = document.createDocumentFragment();

              body.append(
                DOM(
                  {
                    domaudio: domAudioPresets.bigButton,
                    style: 'splash-content-button',
                    event: [
                      'click',
                      () => {
                        View.show('talents');

                        Splash.hide();
                      },
                    ],
                  },
                  'Таланты (обычные)',
                ),
                DOM(
                  {
                    domaudio: domAudioPresets.bigButton,
                    style: 'splash-content-button',
                    event: [
                      'click',
                      () => {
                        View.show('talents2');

                        Splash.hide();
                      },
                    ],
                  },
                  'Таланты (классовые)',
                ),
                DOM(
                  {
                    domaudio: domAudioPresets.bigButton,
                    style: 'splash-content-button',
                    event: [
                      'click',
                      () => {
                        View.show('users');

                        Splash.hide();
                      },
                    ],
                  },
                  'Пользователи',
                ),
                DOM(
                  {
                    domaudio: domAudioPresets.closeButton,
                    style: 'splash-content-button',
                    event: ['click', () => Splash.hide()],
                  },
                  '[X]',
                ),
              );

              Splash.show(body);
            },
          ],
        },
        'Админ',
      );

      adm.classList.add('animation1');

      adm.style.color = 'rgba(255,255,255,1)';

      menu.append(adm);
    }

    menu.append(
      DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'main-header-item',
          event: ['click', () => View.show('castle')],
        },
        Castle.gl ? 'Замок' : 'Лобби',
      ),
      DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'main-header-item',
          event: ['click', () => View.show('builds')],
        },
        'Билды',
      ),
      /*DOM({ style: 'main-header-item', event: ['click', () => View.show('history')] }, 'История'),*/
      DOM({ domaudio: domAudioPresets.defaultButton, style: 'main-header-item', event: ['click', () => View.show('top')] }, 'Рейтинг'),
      DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'main-header-item',
          event: ['click', () => View.show('game')],
        },
        'Фарм',
      ),
      DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'main-header-item',
          event: ['click', () => View.exitOrLogout()],
        },
        'Выйти',
      ),
    );

    return menu;
  }

  static async main(data) {
    let body = DOM({ style: 'main' });

    let middle = DOM({ style: 'party-middle' });

    // const chatInput = DOM({tag: 'input', placeholder: 'Enter your message here', style: 'chat-input'});
    // const chatMessages = DOM({style: 'chat-input'});
    // const chat = DOM({style: 'chat'}, chatMessages, chatInput);

    // let party = DOM({style:'party'},middle, chat);

    let top = DOM({ style: 'top' });

    App.api.silent(
      (result) => {
        let number = 1;

        for (let player of result) {
          let rank = DOM({ style: 'top-item-hero-rank' });

          rank.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;

          let hero = DOM({ style: 'top-item-hero' }, rank);

          hero.style.backgroundImage = `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`;

          let item = DOM(
            {
              domaudio: domAudioPresets.defaultButton,
              style: 'top-item',
              event: ['click', () => Build.view(player.id, player.hero, player.nickname)],
            },
            hero,
            DOM({ style: 'top-item-player' }, DOM(`#${number}. ${player.nickname}`), DOM(`${player.rating}`)),
          );

          if (number == 1) {
            //item.style.background = 'rgba(255,50,0,0.9)';

            item.classList.add('animation1');
          }
          /*
                else if(number == 2){
                    
                    item.style.background = 'rgba(255,100,0,0.9)';
                    
                }
                else if(number == 3){
                    
                    item.style.background = 'rgba(150,50,255,0.9)';
                    
                }
                else if(number == 4){
                    
                    item.style.background = 'rgba(50,100,200,0.9)';
                    
                }
                */
          top.append(item);

          number++;
        }
      },
      App.CURRENT_MM,
      'top',
    );

    let party = DOM({ style: 'party' }, middle);

    let players = new Array();

    data = data ? data : await App.api.request(App.CURRENT_MM, 'loadParty');

    MM.partyId = data.id;
    MM.partyMembersCount = Object.keys(data?.users || {}).length || 1;
    if (data && ('mode' in data)) {
      CastleNAVBAR.setMode(Number(data.mode) + 1, { syncParty: false });
    }

    MM.activeSelectHero = data.users[App.storage.data.id].hero;

    MM.searchActive(data.users[MM.partyId].ready);

    for (let key in data.users) {
      players.push({
        id: key,
        hero: data.users[key].hero,
        nickname: data.users[key].nickname,
        ready: data.users[key].ready,
        rating: data.users[key].rating,
        skin: data.users[key].skin,
      });
    }

    if (players.length < 5) {
      while (players.length < 5) {
        players.push({ id: 0, hero: 0, nickname: '', ready: 0 });
      }
    }

    for (let item of players) {
      let img = DOM({ style: 'party-middle-item-middle' });

      let rank = Rank.createRankNode(item.rating);
      img.append(rank);

      let status = DOM({ style: 'party-middle-item-not-ready' }, DOM({}, 'Не готов'));

      if (item.id) {
        if (item.ready) {
          status.firstChild.innerText = Lang.text('ready');

          status.classList.replace('party-middle-item-not-ready', 'party-middle-item-ready');
        } else if (MM.partyId == item.id) {
          status.firstChild.innerText = Lang.text('ready');

          status.classList.replace('party-middle-item-not-ready', 'party-middle-item-ready');
        } else if (item.id == App.storage.data.id) {
          status.onclick = async () => {
            if (NativeAPI.status) {
              if (PWGame.gameConnectionTestIsActive) {
                return;
              }

              PWGame.gameConnectionTestIsActive = true;

              try {
                await PWGame.check();

                await PWGame.testGameServerConnection();

                await PWGame.checkUpdates();
              } catch (e) {
                PWGame.gameConnectionTestIsActive = false;
                throw e;
              }

              PWGame.gameConnectionTestIsActive = false;
            } else {
              return;
            }

            await App.api.request(App.CURRENT_MM, 'readyParty', {
              id: MM.partyId,
            });

            status.onclick = false;
          };

          status.innerText = 'Подтвердить';
        }

        const heroImg = item.hero ? `url(content/hero/${item.hero}/${item.skin ? item.skin : 1}.webp)` : `url(content/hero/empty.webp)`;
        img.style.backgroundImage = `${heroImg}, url(content/hero/background.png)`;
        img.style.backgroundRepeat = 'no-repeat, no-repeat';
        img.style.backgroundPosition = 'center, center';
        img.style.backgroundSize = 'contain, contain';
      } else {
        img.innerText = '+';

        status.style.opacity = 0;

        // lvl.style.opacity = 0;

        //rank.style.opacity = 0;
      }

      let nickname = DOM({ style: 'party-middle-item-nickname' }, `${item.nickname ? item.nickname : 'Добавить'}`);

      let player = DOM({ id: `PP${item.id}`, style: 'party-middle-item' }, nickname, img, status); // TODO use this for lvl and rank
      // let player = DOM({id:`PP${item.id}`,style:'party-middle-item'},nickname,img,status);

      player.dataset.id = item.id;

      if (MM.partyId == App.storage.data.id && player.dataset.id != App.storage.data.id && player.dataset.id != 0) {
        nickname.append(
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              tag: 'span',
              event: [
                'click',
                async () => {
                  await App.api.request(App.CURRENT_MM, 'leaderKickParty', {
                    id: player.dataset.id,
                  });
                },
              ],
            },
            '[X]',
          ),
        );
      }

      if (MM.partyId != App.storage.data.id && player.dataset.id == App.storage.data.id) {
        nickname.append(
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              tag: 'span',
              event: [
                'click',
                async () => {
                  await App.api.request(App.CURRENT_MM, 'leaveParty', {
                    id: MM.partyId,
                  });

                  View.show('castle');
                },
              ],
            },
            '[X]',
          ),
        );
      }

      img.addEventListener('click', async () => {
        if (player.dataset.id == App.storage.data.id) {
          if (MM.active) {
            return;
          }

          let request = await App.api.request('build', 'heroAll');

          MM.hero = request;

          let bannedHeroesResponse = new Array();
          try {
            bannedHeroesResponse = await App.api.request(App.CURRENT_MM, 'bannedHeroes', { mode: CastleNAVBAR.mode });
          } catch (error) {
            bannedHeroesResponse = new Array();
          }

          const bannedHeroes = new Set(
            (Array.isArray(bannedHeroesResponse) ? bannedHeroesResponse : new Array())
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id) && id > 0),
          );

          request.push({ id: 0 });

          let bodyHero = DOM({ style: 'party-hero' });

          let preload = new PreloadImages(bodyHero);

          for (let item of request) {
            let hero = DOM({ domaudio: domAudioPresets.smallButton });

            const isBannedInMode = item.id && bannedHeroes.has(Number(item.id));
            if (isBannedInMode) {
              hero.style.filter = 'grayscale(100%)';
              hero.style.opacity = '0.6';
              hero.title = Lang.text('thisHeroIsUnavailableInCurrentGameMode');
            }

            hero.addEventListener('click', async () => {
              if (isBannedInMode) {
                App.error(Lang.text('thisHeroIsUnavailableInCurrentGameMode'));
                return;
              }

              try {
                await App.api.request(App.CURRENT_MM, 'heroParty', {
                  id: MM.partyId,
                  hero: item.id,
                });
              } catch (error) {
                return App.error(error);
              }

              MM.activeSelectHero = item.id;

              Splash.hide();
            });

            if (item.id) {
              hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;
            } else {
              hero.dataset.url = `content/hero/empty.webp`;
            }

            preload.add(hero);
          }

          Splash.show(bodyHero, false);
        }

        if (player.dataset.id == 0 && (!MM.partyId || MM.partyId == App.storage.data.id)) {
          let input = DOM({ tag: 'input', style: 'search-input' });

          let body = DOM({ style: 'search-body' });

          let search = DOM(
            { style: 'search' },
            input,
            body,
            DOM(
              {
                domaudio: domAudioPresets.closeButton,
                style: 'search-bottom',
                event: [
                  'click',
                  () => {
                    Splash.hide();
                  },
                ],
              },
              Lang.text('back'),
            ),
          );

          input.addEventListener('input', async () => {
            let request = await App.api.request(App.CURRENT_MM, 'findUser', {
              name: input.value,
            });

            if (body.firstChild) {
              while (body.firstChild) {
                body.firstChild.remove();
              }
            }

            for (let item of request) {
              body.append(
                DOM(
                  {
                    domaudio: domAudioPresets.defaultButton,
                    event: [
                      'click',
                      async () => {
                        await App.api.request(App.CURRENT_MM, 'inviteParty', {
                          id: item.id,
                        });

                        App.notify(`Приглашение отправлено игроку ${item.nickname}`, 1000);

                        // Splash.hide();
                      },
                    ],
                  },
                  item.nickname,
                ),
              );
            }
          });

          Splash.show(search, false);

          input.focus();
        }
      });

      middle.append(player);
    }

    body.append(View.header(), DOM({ style: 'main-body-column' }, top, party));

    return body;
  }
  /*
    static async history(isWindow) {

        let body = DOM({ style: 'main' }), history = DOM({ style: isWindow ? 'whistory' : 'history' });

        let result = await App.api.request(App.CURRENT_MM, 'history');

        for (let item of result) {

            let hero = DOM();

            hero.style.backgroundImage = `url(content/hero/${item.hero}/${item.skin ? item.skin : 1}.webp)`;

            let game = DOM({ style: 'history-item' }, hero, DOM({ style: 'history-text-box', tag: 'div' }, (item.team == 1) ? 'Докты' : 'Адорния'), DOM({ style: 'history-text-box', tag: 'div' }, Math.round(((item.team == item.win) ? +item.rating : -item.rating) * 10.0) / 10.0), DOM({ style: 'history-text-box', tag: 'div' }, new Date(item.added).toLocaleString()));

            if (item.team == item.win) {

                game.style.background = 'rgba(51,255,51,0.5)';

            }

            history.append(game);

        }

        if (!isWindow) {
            body.append(View.header());
        }
        body.append(history);

        return body;

    }
    */
  static async top(hero = 0, isSplah = false, mode = 0) {
    const TOP_MODE_TABS = [
      { id: 0, labelKey: 'gm1' },
      { id: 1, labelKey: 'gm2' },
      { id: 2, labelKey: 'gm3' },
      { id: 3, labelKey: 'gm4' },
    ];
    const HERO_STATS_TAB_ID = 6;

    const heroId = hero == null || hero === '' ? 0 : Number(hero) || 0;
    let activeMode = mode == null || mode === '' ? 0 : Number(mode);
    if (!Number.isFinite(activeMode) || activeMode < 0) {
      activeMode = 0;
    }
    if (activeMode === 4 || activeMode === 5) {
      activeMode = 0;
    }
    const isHeroStatsView = activeMode === HERO_STATS_TAB_ID;
    if (!isHeroStatsView && activeMode > 3) {
      activeMode = 0;
    }

    let body = DOM({ style: 'main' });

    const [result] = await Promise.all([
      isHeroStatsView
        ? App.api.request(App.CURRENT_MM, 'topHeroStats')
        : App.api.request(App.CURRENT_MM, 'top', {
            limit: 100,
            hero: heroId,
            mode: activeMode,
          }),
      (async () => {
        if (!MM.hero) {
          try {
            MM.hero = await App.api.request('build', 'heroAll');
          } catch {
            MM.hero = [];
          }
        }
      })(),
    ]);

    if (result == null) {
      throw 'Рейтинг отсутствует';
    }

    const list = isHeroStatsView ? [] : (Array.isArray(result) ? result : []);
    const heroStatsPayload =
      isHeroStatsView && result && typeof result === 'object' && !Array.isArray(result)
        ? result
        : { month: [], allTime: [] };

    const heroNameById = (id) => {
      const localizedName = Lang.heroName(Number(id), 1);
      if (localizedName && localizedName !== `hero_${Number(id)}_name`) {
        return localizedName;
      }
      const row = MM.hero && MM.hero.find((h) => Number(h.id) === Number(id));
      return row && row.name ? row.name : '';
    };

    const makeCrownForRank = (rankNum, variant) => {
      if (rankNum < 1 || rankNum > 3) {
        return [];
      }
      const src = rankNum === 1 ? 'content/icons/crown_5.png' : rankNum === 2 ? 'content/icons/crown_3.png' : 'content/icons/crown_2.png';
      const style = variant === 'podium' ? ['wtop-crown', 'wtop-crown--podium'] : ['wtop-crown', 'wtop-crown--row'];
      return [
        DOM({
          tag: 'img',
          src,
          alt: '',
          style,
          draggable: false,
        }),
      ];
    };

    const makePodiumCard = (player, rankNum) => {
      const rank = DOM({ style: 'top-item-hero-rank' });
      rank.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;
      const heroFace = DOM({ style: 'top-item-hero' }, rank);
      heroFace.style.backgroundImage = `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`;
      const heroBlock = DOM({ style: 'wtop-podium-hero-wrap' }, heroFace);
      const crownSlot = DOM({ style: 'wtop-podium-crown-slot' }, ...makeCrownForRank(rankNum, 'podium'));
      const playerBlock = DOM(
        { style: 'wtop-podium-player' },
        DOM({ style: 'wtop-podium-name-line' }, `#${rankNum}. ${player.nickname}`),
        DOM(`${player.rating}`),
      );
      const middle = DOM({ style: 'wtop-podium-card-body' }, playerBlock, crownSlot);
      return DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: ['top-item', 'wtop-podium-card', `wtop-podium-card--${rankNum}`],
          event: ['click', () => Build.view(player.id, player.hero, player.nickname)],
        },
        heroBlock,
        middle,
      );
    };

    const makeTableRow = (player, rankNum) => {
      const hName = heroNameById(player.hero);
      const placeCell = DOM({ style: ['wtop-cell', 'wtop-cell--place'] }, String(rankNum));
      const nameCell = DOM(
        { style: ['wtop-cell', 'wtop-cell--name'] },
        DOM({ tag: 'span', style: 'wtop-cell-name-text' }, player.nickname || '—'),
      );
      const heroIcon = DOM({ style: 'wtop-cell-hero-icon' });
      heroIcon.style.backgroundImage = `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`;
      const heroNameEl = DOM({ style: 'wtop-cell-hero-name' }, hName || '—');
      const heroCellStyle = ['wtop-cell', 'wtop-cell--hero'];
      if (rankNum <= 3) {
        heroCellStyle.push('wtop-cell--hero-with-crown');
      }
      const heroCell = DOM({ style: heroCellStyle }, heroIcon, heroNameEl, ...makeCrownForRank(rankNum, 'row'));
      const ratingCell = DOM({ style: ['wtop-cell', 'wtop-cell--rating'] }, String(player.rating));
      return DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'wtop-table-row',
          event: ['click', () => Build.view(player.id, player.hero, player.nickname)],
        },
        placeCell,
        nameCell,
        heroCell,
        ratingCell,
      );
    };

    const heroStatsSortState = {
      key: 'battles',
      direction: 'desc',
    };
    let heroStatsPeriod = 'month';

    const heroStatsColumns = [
      { key: 'hero', labelKey: 'topColHero' },
      { key: 'battles', labelKey: 'topColBattles' },
      { key: 'wins', labelKey: 'topColWins' },
      { key: 'losses', labelKey: 'topColLosses' },
      { key: 'winrate', labelKey: 'topColWinrate' },
    ];
    const HERO_STATS_COLOR_RANGE = {
      battles: { min: '#d46a6a', max: '#62d27a' },
      wins: { min: '#d46a6a', max: '#62d27a' },
      losses: { min: '#d46a6a', max: '#62d27a' },
      winrate: { min: '#d46a6a', max: '#62d27a' },
    };
    const HERO_STATS_METRIC_KEYS = ['battles', 'wins', 'losses', 'winrate'];

    const hexToRgb = (hexColor) => {
      const hex = String(hexColor || '').replace('#', '');
      if (hex.length !== 6) return { r: 255, g: 255, b: 255 };
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
      };
    };

    const mixColor = (minColor, maxColor, ratio) => {
      const clamped = Math.max(0, Math.min(1, ratio));
      const minRgb = hexToRgb(minColor);
      const maxRgb = hexToRgb(maxColor);
      const r = Math.round(minRgb.r + (maxRgb.r - minRgb.r) * clamped);
      const g = Math.round(minRgb.g + (maxRgb.g - minRgb.g) * clamped);
      const b = Math.round(minRgb.b + (maxRgb.b - minRgb.b) * clamped);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const buildMetricRanges = (rows) => {
      const ranges = {};
      for (const key of HERO_STATS_METRIC_KEYS) {
        let min = Infinity;
        let max = -Infinity;
        for (const item of rows) {
          const value = Number(item[key]) || 0;
          if (value < min) min = value;
          if (value > max) max = value;
        }
        ranges[key] = {
          min: Number.isFinite(min) ? min : 0,
          max: Number.isFinite(max) ? max : 0,
        };
      }
      return ranges;
    };

    const metricValueColor = (metricKey, value, metricRanges) => {
      const range = metricRanges[metricKey];
      if (!range) return '';
      const min = Number(range.min) || 0;
      const max = Number(range.max) || 0;
      const ratio = max === min ? 0.5 : (value - min) / (max - min);
      const palette = HERO_STATS_COLOR_RANGE[metricKey] || HERO_STATS_COLOR_RANGE.battles;
      return mixColor(palette.min, palette.max, ratio);
    };

    const makeHeroStatsRow = (item, metricRanges) => {
      const heroIcon = DOM({ style: 'wtop-cell-hero-icon' });
      heroIcon.style.backgroundImage = `url(content/hero/${item.hero}/1.webp)`;
      const heroCell = DOM(
        { style: ['wtop-cell', 'wtop-cell--hero', 'wtop-cell--hero-stats-hero'] },
        heroIcon,
        DOM({ style: 'wtop-cell-hero-name' }, heroNameById(item.hero) || '—'),
      );
      const battlesCell = DOM({ style: ['wtop-cell', 'wtop-cell--hero-stat-number'] }, String(item.battles || 0));
      const winsCell = DOM({ style: ['wtop-cell', 'wtop-cell--hero-stat-number'] }, String(item.wins || 0));
      const lossesCell = DOM({ style: ['wtop-cell', 'wtop-cell--hero-stat-number'] }, String(item.losses || 0));
      const winrateCell = DOM({ style: ['wtop-cell', 'wtop-cell--hero-stat-number', 'wtop-cell--hero-stat-winrate'] }, `${Number(item.winrate || 0).toFixed(2)}%`);
      battlesCell.style.color = metricValueColor('battles', Number(item.battles) || 0, metricRanges);
      winsCell.style.color = metricValueColor('wins', Number(item.wins) || 0, metricRanges);
      lossesCell.style.color = metricValueColor('losses', Number(item.losses) || 0, metricRanges);
      winrateCell.style.color = metricValueColor('winrate', Number(item.winrate) || 0, metricRanges);
      return DOM({ style: 'wtop-hero-stats-row' }, heroCell, battlesCell, winsCell, lossesCell, winrateCell);
    };

    const makeHeroStatsTable = (listScroll) => {
      const rowsBody = DOM({ style: 'wtop-hero-stats-rows' });
      const headerButtons = new Map();
      const periodToggle = DOM({
        tag: 'button',
        type: 'button',
        domaudio: domAudioPresets.defaultButton,
        style: ['wtop-cell', 'wtop-hero-period-toggle'],
      });
      const headerHeroTitle = DOM({ style: ['wtop-cell', 'wtop-cell--hero', 'wtop-cell--hero-stats-hero', 'wtop-hero-title-cell'] });
      const headerHeroLabel = DOM({ tag: 'span', style: 'wtop-hero-title-label' }, Lang.text('topColHero'));
      const getCurrentHeroList = () => (heroStatsPeriod === 'allTime' ? heroStatsPayload.allTime || [] : heroStatsPayload.month || []);
      const hasAnyData = (heroStatsPayload.month || []).length > 0 || (heroStatsPayload.allTime || []).length > 0;

      const sortRows = () => {
        const key = heroStatsSortState.key;
        const dir = heroStatsSortState.direction === 'asc' ? 1 : -1;
        const rows = [...getCurrentHeroList()];
        rows.sort((a, b) => {
          const av = Number(a[key]) || 0;
          const bv = Number(b[key]) || 0;
          if (av === bv) {
            return (Number(a.hero) || 0) - (Number(b.hero) || 0);
          }
          return (av - bv) * dir;
        });

        rowsBody.innerHTML = '';
        if (!rows.length) {
          rowsBody.append(DOM({ style: 'wtop-empty-hint', textContent: Lang.text('topEmpty') }));
        } else {
          const metricRanges = buildMetricRanges(rows);
          for (const item of rows) {
            rowsBody.append(makeHeroStatsRow(item, metricRanges));
          }
        }

        for (const [keyName, btn] of headerButtons) {
          const arrow = heroStatsSortState.key === keyName ? (heroStatsSortState.direction === 'asc' ? ' ▲' : ' ▼') : '';
          btn.textContent = `${Lang.text(heroStatsColumns.find((col) => col.key === keyName).labelKey)}${arrow}`;
          btn.classList.toggle('is-active', heroStatsSortState.key === keyName);
        }
        headerHeroLabel.textContent = Lang.text('topColHero');
        periodToggle.textContent = heroStatsPeriod === 'month' ? Lang.text('topPeriodMonth') : Lang.text('topPeriodAllTime');
      };

      if (!hasAnyData) {
        listScroll.append(DOM({ style: 'wtop-empty-hint', textContent: Lang.text('topEmpty') }));
        return;
      }

      const header = DOM({ style: 'wtop-hero-stats-header' });
      for (const col of heroStatsColumns) {
        if (col.key === 'hero') {
          periodToggle.addEventListener('click', () => {
            heroStatsPeriod = heroStatsPeriod === 'month' ? 'allTime' : 'month';
            sortRows();
          });
          headerHeroTitle.append(DOM({ style: 'wtop-hero-title-split' }, headerHeroLabel, periodToggle));
          header.append(headerHeroTitle);
          continue;
        }
        const btn = DOM({
          tag: 'button',
          type: 'button',
          style: ['wtop-cell', 'wtop-sortable-header'],
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            () => {
              if (heroStatsSortState.key === col.key) {
                heroStatsSortState.direction = heroStatsSortState.direction === 'desc' ? 'asc' : 'desc';
              } else {
                heroStatsSortState.key = col.key;
                heroStatsSortState.direction = 'desc';
              }
              sortRows();
            },
          ],
        });
        headerButtons.set(col.key, btn);
        header.append(btn);
      }
      listScroll.append(header);
      listScroll.append(rowsBody);
      sortRows();
    };

    const openHeroPicker = async () => {
      let request = await App.api.request('build', 'heroAll');
      request.push({ id: 0 });
      const bodyHero = DOM({ style: 'party-hero' });
      const preload = new PreloadImages(bodyHero);
      for (let item of request) {
        const heroEl = DOM({ domaudio: domAudioPresets.smallButton });
        if (item.id) {
          heroEl.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;
        } else {
          heroEl.dataset.url = `content/hero/empty.webp`;
        }
        heroEl.addEventListener('click', async () => {
          if (isSplah) {
            Window.show('main', 'top', item.id, activeMode);
          } else {
            View.show('top', item.id, false, activeMode);
          }
          Splash.hide();
        });
        preload.add(heroEl);
      }
      Splash.show(bodyHero, false);
    };

    const scrollClass = isSplah ? 'wtop-scroll' : 'top-scroll';
    const modeBar = DOM({ style: 'wtop-mode-bar' });
    modeBar.append(
      DOM({
        domaudio: domAudioPresets.defaultButton,
        style: ['wtop-mode-tab', isHeroStatsView ? 'is-active' : null].filter(Boolean),
        tag: 'button',
        type: 'button',
        textContent: Lang.text('topHeroesTab'),
        event: [
          'click',
          () => {
            if (isHeroStatsView) return;
            if (isSplah) {
              Window.show('main', 'top', heroId, HERO_STATS_TAB_ID);
            } else {
              View.show('top', heroId, false, HERO_STATS_TAB_ID);
            }
          },
        ],
      }),
    );
    for (const tab of TOP_MODE_TABS) {
      const isActive = tab.id === activeMode;
      const btn = DOM({
        domaudio: domAudioPresets.defaultButton,
        style: ['wtop-mode-tab', isActive ? 'is-active' : null].filter(Boolean),
        tag: 'button',
        type: 'button',
        textContent: Lang.text(tab.labelKey),
        event: [
          'click',
          () => {
            if (tab.id === activeMode) return;
            if (isSplah) {
              Window.show('main', 'top', heroId, tab.id);
            } else {
              View.show('top', heroId, false, tab.id);
            }
          },
        ],
      });
      modeBar.append(btn);
    }

    const podium = DOM({ style: 'wtop-podium' });
    for (let i = 0; i < 3 && i < list.length; i++) {
      podium.append(makePodiumCard(list[i], i + 1));
    }

    const listScroll = DOM({ style: 'wtop-list-scroll' });
    if (!isHeroStatsView && list.length === 0) {
      listScroll.append(DOM({ style: 'wtop-empty-hint', textContent: Lang.text('topEmpty') }));
    } else if (!isHeroStatsView) {
      listScroll.append(
        DOM(
          { style: 'wtop-table-header' },
          DOM({ style: ['wtop-cell', 'wtop-cell--place'] }, Lang.text('topColPlace')),
          DOM({ style: ['wtop-cell', 'wtop-cell--name'] }, DOM({ tag: 'span', style: 'wtop-cell-name-text' }, Lang.text('topColPlayer'))),
          DOM({ style: ['wtop-cell', 'wtop-cell--hero'] }, Lang.text('topColHero')),
          DOM({ style: ['wtop-cell', 'wtop-cell--rating'] }, Lang.text('topColRating')),
        ),
      );
      for (let i = 0; i < list.length; i++) {
        listScroll.append(makeTableRow(list[i], i + 1));
      }
    } else {
      makeHeroStatsTable(listScroll);
    }

    const heroFilterImg = DOM({
      tag: 'img',
      src: 'content/icons/ЗалСлавы.png',
      alt: '',
      style: 'wtop-hero-filter-img',
      draggable: false,
    });
    const heroFilterBtn = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        tag: 'button',
        type: 'button',
        style: 'wtop-hero-filter',
        title: Lang.text('clickToViewHeroRating'),
        event: ['click', openHeroPicker],
      },
      heroFilterImg,
    );
    heroFilterBtn.setAttribute('aria-label', Lang.text('clickToViewHeroRating'));

    const listRow = DOM({ style: 'wtop-list-row' }, listScroll);
    const topChildren = [modeBar];
    if (!isHeroStatsView) {
      topChildren.push(DOM({ style: 'wtop-podium-row' }, podium, heroFilterBtn));
    }
    topChildren.push(listRow);
    const top = DOM({ style: [scrollClass, 'top-layout'] }, ...topChildren);

    const helpBtn = DOM({
      id: 'wtop_help',
      domaudio: domAudioPresets.defaultButton,
      style: 'help-button',
      event: [
        'click',
        () => {
          HelpSplash(Lang.text('top_help_content'));
        },
      ],
    });

    if (!isSplah) {
      body.append(View.header());
    }
    body.append(top);
    body.append(helpBtn);

    return body;
  }

  static builds() {
    let body = DOM({ style: 'main' });

    let hero = DOM({ style: 'hero' });

    let preload = new PreloadImages(hero, (element) => {
      /*
            let test = () => {
                
                element.dataset.slide = ( ( ( Number(element.dataset.slide) + 1 ) > element.dataset.total ) ? 1 : ( Number(element.dataset.slide) + 1 ));
                
                PreloadImages.load(() => {
                    
                    let firstSlide = DOM(), twoSlide = DOM();
                    
                    firstSlide.style.backgroundImage = element.style.backgroundImage;
                    
                    element.append(firstSlide);
                    
                    element.style.backgroundImage = 'none';
                    
                    twoSlide.style.opacity = 0;
                    
                    element.append(twoSlide);
                    
                    twoSlide.style.backgroundImage = `url("content/hero/${element.dataset.id}/${element.dataset.slide}.webp")`;
                    
                    firstSlide.animate({opacity:[1,0]},{duration:500,easing:'ease-out',fill:'forwards'});
                    
                    let animation = twoSlide.animate({opacity:[0,1]},{duration:500,easing:'ease-in',fill:'forwards'});
                    
                    animation.onfinish = () => {
                        
                        element.style.backgroundImage = twoSlide.style.backgroundImage;
                        
                        firstSlide.remove();
                        
                        twoSlide.remove();
                        
                        setTimeout(() => {
                            
                            test();
                            
                        },App.getRandomInt(5000,15000));
                        
                    }
                    
                },`content/hero/${element.dataset.id}/${element.dataset.slide}.webp`);
                
            }
            
            if(element.dataset.total > 1){
                
                setTimeout(() => {
                    
                    test();
                    
                },App.getRandomInt(2500,5000));
                
            }
            */
    });

    App.api.silent(
      (result) => {
        MM.hero = result;

        for (const item of result) {
          //item.rating = App.getRandomInt(1100,3000);
          let rank = Rank.createRankNode(item.rating);
          const hero = DOM({ style: 'hero-item' }, DOM({ tag: 'span', style: 'name' }, item.name), rank);

          hero.addEventListener('click', () => View.show('build', item.id));

          hero.dataset.id = item.id;

          hero.dataset.slide = 1;

          hero.dataset.total = item.total;

          hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;

          preload.add(hero);
        }
      },
      'build',
      'heroAll',
    );

    body.append(View.header(), DOM({ style: 'main-body-full' }, hero));

    return body;
  }

  static inventory(isWindow) {
    let body = DOM({ style: 'main' });

    let inventory = DOM({ style: 'inventory' });

    App.api.silent(
      (result) => {
        for (let item of result) {
          let unit = DOM({ style: [`rarity${item.rarity}`] });

          unit.style.backgroundImage = `url(content/talents/${item.id}.webp)`;

          unit.append(DOM({ tag: 'span' }, item.score));

          inventory.append(unit);
        }
      },
      'gamev2',
      'inventory',
    );

    if (!isWindow) {
      body.append(
        DOM(
          { style: 'main-header' },
          DOM({ tag: 'img', src: 'content/img/logo.webp' }),
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'main-header-item',
              event: ['click', () => View.show('castle')],
            },
            App.storage.data.login,
          ),
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'main-header-item',
              event: ['click', () => View.show('inventory')],
            },
            'Осколки',
          ),
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'main-header-item',
              event: ['click', () => View.show('game')],
            },
            'Фарм',
          ),
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'main-header-item',
              event: ['click', () => View.exitOrLogout()],
            },
            'Выйти',
          ),
        ),
      );
    } else {
      body.append(DOM({ style: 'inventory-header' }, Lang.text('library')));
    }
    body.append(DOM({ style: 'main-body-full' }, inventory));

    return body;
  }

  static game(isWindow) {
    let body = DOM({ style: 'game' });

    let button = DOM(
      {
        domaudio: domAudioPresets.bigButton,
        style: 'game-button',
        event: [
          'click',
          async () => {
            let request = await App.api.request('gamev2', 'start');

            if ('error' in request) {
              button.innerText = `Начать фарм можно будет через ${request.error} мин.`;

              return;
            }

            dscription.remove();

            request.back = () => {
              View.show('castle');
            };

            request.finish = async () => {
              await App.api.request('gamev2', 'finish');

              isWindow ? Window.close('main') : View.show('castle');
            };

            request.exit = () => {
              View.show('castle');
            };

            Game.init(body, request, isWindow);
          },
        ],
      },
      'Начать фарм',
    );

    let dscription = DOM(
      { style: 'game-description' },
      DOM({ tag: 'h1' }, 'Лорды и леди!'),
      DOM({ tag: 'p' }, '— необходимо собрать 1000 осколков одного и того же таланта, чтобы получить 1 талант для билда;'),
      DOM({ tag: 'p' }, '— на одну карту рассчитано 100 ходов;'),
      //DOM({tag:'p'},'— кулдаун между играми 60 минут;'),
      DOM(
        { tag: 'p' },
        '— чтобы сделать ход, переставляйте два соседних таланта местами. Если такая перестановка приводит к образованию комбинации, то «выстроившиеся»‎ таланты исчезают, и на их место падают таланты верхних рядов;',
      ),
      DOM({ tag: 'p' }, '— засчитывается комбинация минимум из трёх одинаковых талантов;'),
      DOM({ tag: 'p' }, '— если за 100 ходов серебряных монет будет 150, даётся +100 дополнительных ходов;'),
      //DOM({tag:'p'},'— в рейтинге на главной страничке отображается сумма всех очков на одного игрока за всё время.'),
      button,
      isWindow
        ? DOM()
        : DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'game-button',
              event: ['click', () => View.show('castle')],
            },
            Lang.text('back'),
          ),
    );

    body.append(dscription);

    return body;
  }

  static async build(heroId, targetId = 0, isWindow = false) {
    const body = DOM({ style: 'build-horizontal' });
    requestAnimationFrame(() => Voice.updatePanelPosition());

    await Build.init(heroId, targetId, isWindow);

    body.append(
      DOM({
        id: 'wbuild_help',
        domaudio: domAudioPresets.defaultButton,
        style: 'help-button',
        event: [
          'click',
          () => {
            HelpSplash(Lang.text('build_help_content'));
          },
        ],
      }),
      DOM({ style: 'build-left' }, Build.heroView),
      DOM(
        { style: 'build-center' },
        Build.buildActionsView,
        DOM({ style: 'build-field-with-tabs' }, Build.listView, DOM({ style: 'build-field-container' }, Build.levelView, Build.fieldView)),
        DOM(
          { style: 'build-active-bar-container' },
          Build.activeBarKeybindingsView,
          Build.activeBarView,
          DOM({ style: 'build-active-bar-hint' }, Lang.text('smartcastDescription')),
        ),
      ),
      DOM({ style: 'build-right' }, Build.talentsAndSetsView, Build.rarityView, Build.inventoryView),
    );

    if (!isWindow) {
      body.append(
        DOM(
          {
            domaudio: domAudioPresets.closeButton,
            style: ['build-list-close', 'close-button'],
            title: Lang.text('titleClose'),
            event: [
              'click',
              () => {
                Build.CleanInvalidDescriptions();
                if (isWindow) {
                  View.show('castle');
                } else {
                  View.show('builds');
                }
              },
            ],
          },
          DOM({
            tag: 'img',
            src: 'content/icons/close-cropped.svg',
            alt: Lang.text('titleClose'),
            style: 'close-image-style',
          }),
        ),
      );
    }

    return isWindow ? body : DOM({ id: 'viewbuild' }, body);
  }

  static async talents() {
    let body = DOM({ style: 'main' });

    // Создаем контейнер для заголовка (кнопка закрытия + поиск)
    let header = DOM({ style: 'adm-header' });

    // Кнопка закрытия
    let closeBtn = DOM(
      {
        domaudio: domAudioPresets.closeButton,
        style: 'close-btn',
        event: ['click', () => View.show('castle')],
      },
      '[X]',
    );

    // Строка поиска
    let searchInput = DOM({
      tag: 'input',
      placeholder: 'Поиск талантов...',
      style: 'search-input',
    });

    header.append(closeBtn, searchInput);

    let adm = DOM({ style: 'adm' }, header);
    let result = await App.api.request('build', 'talentAll');
    let talentContainers = [];
    let talentsContainer = DOM({ style: 'talents-container' });

    for (let item of result) {
      let div = DOM({ tag: 'div', class: 'talent-item' });
      div.append(DOM(`id${item.id}`), DOM({ tag: 'img', src: `content/talents/${item.id}.webp` }));

      for (let key in item) {
        if (key == 'id') continue;

        // Создаем контейнер для пары "ключ-значение"
        let keyValuePair = DOM({
          tag: 'div',
          class: 'key-value-pair',
        });

        keyValuePair.append(
          DOM({ tag: 'div', class: 'key' }, key),
          App.input(
            async (value) => {
              let object = new Object();
              object[key] = value;
              await App.api.request('build', 'talentEdit', {
                id: item.id,
                object: object,
              });
            },
            { value: item[key] },
          ),
        );

        div.append(keyValuePair);
      }

      talentContainers.push({ element: div, data: item });
      talentsContainer.append(div);
    }

    const filterTalents = (searchText) => {
      searchText = searchText.toLowerCase();
      talentContainers.forEach(({ element, data }) => {
        let matches = false;
        for (let key in data) {
          if (String(data[key]).toLowerCase().includes(searchText)) {
            matches = true;
            break;
          }
        }
        element.style.display = matches ? 'flex' : 'none';
      });
    };

    searchInput.addEventListener('input', (e) => {
      filterTalents(e.target.value);
    });

    adm.append(talentsContainer);
    body.append(adm);
    return body;
  }

  static async talents2() {
    let body = DOM({ style: 'main' });

    // Создаем контейнер для заголовка (кнопка закрытия + поиск)
    let header = DOM({ style: 'adm-header' });

    // Кнопка закрытия
    let closeBtn = DOM(
      {
        domaudio: domAudioPresets.closeButton,
        style: 'close-btn',
        event: ['click', () => View.show('castle')],
      },
      '[X]',
    );

    // Строка поиска
    let searchInput = DOM({
      tag: 'input',
      placeholder: 'Поиск геройских талантов...',
      style: 'search-input',
    });

    header.append(closeBtn, searchInput);

    let adm = DOM({ style: 'adm' }, header);
    let result = await App.api.request('build', 'talentHeroAll');
    let talentContainers = [];
    let talentsContainer = DOM({ style: 'talents-container' });

    for (let item of result) {
      let div = DOM({ tag: 'div', class: 'talent-item' });
      div.append(DOM(`id${item.id}`), DOM({ tag: 'img', src: `content/htalents/${item.id}.webp` }));

      for (let key in item) {
        if (key == 'id') continue;

        // Создаем контейнер для пары "ключ-значение"
        let keyValuePair = DOM({
          tag: 'div',
          class: 'key-value-pair',
        });

        keyValuePair.append(
          DOM({ tag: 'div', class: 'key' }, key),
          App.input(
            async (value) => {
              let object = new Object();
              object[key] = value;
              await App.api.request('build', 'talentHeroEdit', {
                id: item.id,
                object: object,
              });
            },
            { value: item[key] },
          ),
        );

        div.append(keyValuePair);
      }

      talentContainers.push({ element: div, data: item });
      talentsContainer.append(div);
    }

    const filterTalents = (searchText) => {
      searchText = searchText.toLowerCase();
      talentContainers.forEach(({ element, data }) => {
        let matches = false;
        for (let key in data) {
          if (String(data[key]).toLowerCase().includes(searchText)) {
            matches = true;
            break;
          }
        }
        element.style.display = matches ? 'flex' : 'none';
      });
    };

    searchInput.addEventListener('input', (e) => {
      filterTalents(e.target.value);
    });

    adm.append(talentsContainer);
    body.append(adm);
    return body;
  }

  static async users() {
    let filter = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            let users = document.getElementsByClassName('user-item');
            for (let user in users) {
              if (users[user].className && users[user].className == 'user-item') {
                let isBlocked = users[user].getElementsByClassName('userParam-blocked')[0].nextSibling.value != '0';
                if (!isBlocked) {
                  users[user].style.display = users[user].style.display == 'none' ? 'inherit' : 'none';
                }
              }
            }
          },
        ],
      },
      'Filter only banned',
    );

    let userMute = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        tag: 'input',
        placeholder: 'mute',
        event: [
          'contextmenu',
          (e) => {
            e.preventDefault();
            if (App.isAdmin()) {
              let userId = parseInt(userMute.value);

              if (!userId) {
                return;
              }

              let users = document.getElementsByClassName('user-item');

              let userTag = Array.from(users).findIndex((x) => x.firstChild.innerText === 'id' + userId);

              let userNickname = users[userTag].children[3].value;

              let body = document.createDocumentFragment();

              body.append(
                DOM(`Выдать мут чата ${userNickname}?`),
                DOM(
                  {
                    domaudio: domAudioPresets.bigButton,
                    style: 'splash-content-button',
                    event: [
                      'click',
                      async () => {
                        await App.api.request('user', 'mute', { id: userId });

                        App.notify('Выдан мут игроку ' + userNickname + '; id: ' + userId);

                        Splash.hide();
                      },
                    ],
                  },
                  'Да',
                ),
                DOM(
                  {
                    domaudio: domAudioPresets.closeButton,
                    style: 'splash-content-button',
                    event: ['click', async () => Splash.hide()],
                  },
                  'Нет',
                ),
              );

              Splash.show(body);
            }
          },
        ],
      },
      '',
    );

    let body = DOM({ style: 'main' }),
      adm = DOM({ style: 'adm' }, DOM({ event: ['click', () => View.show('castle')] }, '[X]'), filter, userMute);

    let result = await App.api.request('user', 'all');

    for (let item of result) {
      let div = DOM({ tag: 'div', className: 'user-item' });

      div.append(DOM(`id${item.id}`), DOM(`inv ${item.invite}`));

      for (let key in item) {
        if (['id', 'invite'].includes(key)) {
          continue;
        }

        if (key == 'added') {
          div.append(DOM(`${new Date(item.added).toLocaleString('ru-RU')}`));

          continue;
        }

        div.append(
          DOM({ tag: 'div', className: 'userParam-' + key }, key),
          App.input(
            async (value) => {
              let object = new Object();

              object[key] = value;

              await App.api.request('user', 'edit', {
                id: item.id,
                object: object,
              });
            },
            { value: item[key] },
          ),
        );
      }

      div.append(
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            event: [
              'click',
              async () => {
                if (!confirm(`Сброс пароля «${item.nickname}»?`)) {
                  return;
                }

                let password = await App.api.request('user', 'restore', {
                  id: item.id,
                });

                prompt('Сброс пароля произведен успешно', `Пароль: ${password}`);
              },
            ],
          },
          `RESTORE`,
        ),
      );

      adm.append(div);
    }

    body.append(adm);

    return body;
  }
}
