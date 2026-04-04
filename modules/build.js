import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { View } from './view.js';
import { Window } from './window.js';
import { Rank } from './rank.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { MM } from './mm.js';
import { PreloadImages } from './preloadImages.js';
import { Game } from './game.js';
import { Splash } from './splash.js';
import { domAudioPresets } from './domAudioPresets.js';
import { Sound } from './sound.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { Castle } from './castle.js';
import { KeybindStore } from './keybindings/keybindings.store.js';
import { TalentSets } from './talentSets.js';
import { Settings } from './settings.js';
import { getMainHeroTalentId } from './mainHeroTalent.js';

export class Build {
  static loading = false;

  static shouldShowMmtestIds() {
    return App.CURRENT_MM === 'mmtest';
  }

  /** HSL hue для подсветки сетов (как rgba(80,190,255)); толщина рамки в мм (макс. 1.5). */
  static BUILD_HIGHLIGHT_HUE_DEFAULT = 199;
  static BUILD_HIGHLIGHT_BORDER_MM_DEFAULT = 0.42;
  static BUILD_HIGHLIGHT_BORDER_MM_MIN = 0.08;
  static BUILD_HIGHLIGHT_BORDER_MM_MAX = 1.5;
  static REGEN_HP_FROM_MAX_HP_PCT = 0.0015; // 0.15%
  static REGEN_MP_FROM_MAX_MP_PCT = 0.0036; // 0.36%
  // Max talent cooldown reduction percent shown in build hero stats and used in CD calculations.
  static TALENT_COOLDOWN_PCT_MAX = 40;

  /** span с числом подсвеченных по стат-фильтру талантов (см. .build-hero-stats-highlight-count). */
  static statFilterHighlightCountValueEl = null;
  static statFilterHighlightCountWrapEl = null;
  static combatModeButtonEl = null;
  static combatModeButtonCountEl = null;
  static combatModeEnabled = false;
  static combatModeLearnOrder = [];
  static combatModeLearnOrderBySlot = new Map();
  static combatModeLearnedSlots = new Set();

  static language = {
    sr: 'Сила/Разум',
    hp: 'Здоровье',
    provorstvo: 'Проворство',
    hitrost: 'Хитрость',
    regenmp: 'Регенерация энергии',
    stoikost: 'Стойкость',
    volia: 'Воля',
    ph: 'Проворство/Хитрость',
    sv: 'Стойкость/Воля',
    razum: 'Разум',
    sila: 'Сила',
    speedtal: '%<speedtal></speedtal>',
    srsv: 'Сила/Разум/Стойкость/Воля',
    hpmp: 'Здоровье/Энергия',
    krajahp: 'Кража здоровья',
    regenhp: 'Регенерация здоровья',
    mp: 'Энергия',
    krajamp: 'Кража энергии',
    stoikostrz: 'Стойкость на родной земле',
    voliarz: 'Воля на родной земле',
    speedtalrz: '%<speedtal></speedtal> на родной земле',
    speedtalvz: '%<speedtal></speedtal> на вражеской земле',
    hitrostrz: 'Хитрость на родной земле',
    provorstvorz: 'Проворство на родной земле',
    silarz: 'Сила на родной земле',
    razumrz: 'Разум на родной земле',
    krajahprz: 'Кража здоровья на родной земле',
    regenhpvz: 'Регенерация здоровья на вражеской земле',
    hitrostvz: 'Хитрость на вражеской земле',
    provorstvovz: 'Проворство на вражеской земле',
    regenmpvz: 'Регенерация энергии на вражеской земле',
    silavz: 'Сила на вражеской земле',
    razumvz: 'Разум на вражеской земле',
    svvz: 'Стойкость/Воля на вражеской земле',
    krajahpvz: 'Кража здоровья на вражеской земле',
    vs: 'Воля/Стойкость',
    speed: 'Скорость',
    speedrz: 'Скорость на родной земле',
    speedvz: 'Скорость на вражеской или нейтральной земле',
    dopspeed: 'Дополнительный бонус к скорости',
    speedstak: 'Стак скорости',
  };

  /** Индексы в build.profile для галочек приоритета статов (на сервере массив из 9 слотов; 0–2 не использовались) */
  static heroStatProfileIndex = {
    sila: 3,
    razum: 4,
    provorstvo: 5,
    hitrost: 6,
    stoikost: 7,
    volia: 8,
  };

  static talentRefineByRarity = {
    4: 5.0, //И классовые
    3: 7.0,
    2: 9.0,
    1: 12.0,
  };

  static talentPowerByRarityFirstLevel = {
    4: 53.04,
    3: 47.04,
    2: 43.2,
    1: 36,
    0: 45.12,
  };

  static talentPowerByRarityPerLevel = {
    4: 3.978,
    3: 3.528,
    2: 3.24,
    1: 2.625,
    0: 11.28,
  };

  /** Доля строки билда (слоты сверху вниз) в мощи: суммарно по 6 слотам строки = вклад веса. */
  static TALENT_POWER_LINE_WEIGHTS = {
    5: 33.0 / 600.0,
    4: 23.0 / 600.0,
    3: 16.0 / 600.0,
    2: 13.0 / 600.0,
    1: 9.0 / 600.0,
    0: 6.0 / 600.0,
  };

  static binds = [];

  static async view(user, hero, nickname = '', animate = true) {
    let request = await App.api.request('build', 'get', {
      user: user,
      hero: hero,
    });

    let container = DOM({
      domaudio: domAudioPresets.defaultButton,
      event: [
        'click',
        async () => {
          if (animate) {
            Build.view(user, hero, nickname, false);
          }
        },
      ],
    });

    container.style.width = '60cqmin';

    container.style.height = '60cqmin';

    let state = false;
    let get = DOM(
      {
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          async () => {
            if (!state) {
              get.innerText = Lang.text('overwriteBuild');

              state = true;

              return;
            }

            await App.api.request('build', 'steal', { user: user, hero: hero });

            await Window.show('main', 'build', hero, 0, true);

            Splash.hide();
          },
        ],
      },
      Lang.text('stealBuild'),
    );

    let bottom = DOM(
      { style: 'build-bottom' },
      get,
      DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            () => {
              Splash.hide();
              requestAnimationFrame(() => Voice.updatePanelPosition());
            },
          ],
        },
        `[Х]`,
      ),
    );

    if (animate) {
      bottom.style.opacity = 1;
    }

    container.append(Build.viewModel(request, () => {}, animate));

    Splash.show(DOM({ style: 'div' }, DOM({ style: 'build-top' }, nickname), container, bottom), false);
  }

  static viewModel(data, callback, animate = true) {
    let body = DOM({ style: 'build-body' }),
      i = 1,
      row = DOM({ style: 'build-body-row' }),
      elements1 = new Array(),
      elements2 = new Array();

    body.append(row);

    for (let item of data) {
      let talent = DOM();

      if (item != 0) {
        if (animate) {
          talent.style.opacity = 0;

          talent.style.zIndex = 9999;

          if (item > 0) {
            elements2.push(talent);
          } else {
            elements1.push(talent);
          }
        }

        talent.style.backgroundImage = item > 0 ? `url(content/talents/${item}.webp)` : `url(content/htalents/${Math.abs(item)}.webp)`;
      }

      if (i > 6) {
        i = 2;

        row = DOM({ style: 'build-body-row' });

        row.append(talent);

        body.append(row);

        continue;
      } else {
        row.append(talent);
      }

      i++;
    }

    if (!animate) {
      return body;
    }

    elements1 = Game.shuffle(elements1);

    elements2 = Game.shuffle(elements2);

    let delay = 0,
      number = 1;

    for (let element of elements1) {
      delay += 150;

      let animate = element.animate(
        { opacity: [0, 1], transform: ['scale(3)', 'scale(1)'] },
        { delay: delay, duration: 350, fill: 'both', easing: 'ease-out' },
      );

      if (number == elements1.length) {
        animate.onfinish = () => {
          setTimeout(() => {
            let number = 1;

            delay = 0;

            for (let element of elements2) {
              delay += 50;

              let animate = element.animate(
                { opacity: [0, 1], transform: ['scale(3)', 'scale(1)'] },
                {
                  delay: delay,
                  duration: 350,
                  fill: 'both',
                  easing: 'ease-out',
                },
              );

              if (number == elements2.length) {
                animate.onfinish = () => {
                  if (callback) {
                    callback();
                  }
                };
              }

              number++;
            }
          }, 100);
        };
      }

      number++;
    }

    return body;
  }

  static async init(heroId, targetId, isWindow) {
    Build.ensureBuildSettingsDefaults();
    Build.applyBuildHighlightVariablesFromSettings();

    try {
      Build.buildSettingsButton?.parentNode?.removeChild?.(Build.buildSettingsButton);
    } catch {}
    try {
      Build.buildSettingsPanel?.parentNode?.removeChild?.(Build.buildSettingsPanel);
    } catch {}
    Build.buildSettingsButton = null;
    Build.buildSettingsPanel = null;

    Build.talents = new Object();

    Build.descriptionView = document.createElement('div');

    Build.CleanInvalidDescriptions();

    Build.descriptionView.classList.add('build-description');

    Build.descriptionView.style.display = 'none';

    const bindCommandsToGet = [
      "cmd_action_bar_slot1",
      "cmd_action_bar_slot2",
      "cmd_action_bar_slot3",
      "cmd_action_bar_slot4",
      "cmd_action_bar_slot5",
      "cmd_action_bar_slot6",
      "cmd_action_bar_slot7",
      "cmd_action_bar_slot8",
      "cmd_action_bar_slot9",
      "cmd_action_bar_slot10",
      "cmd_action_bar_slot11",
      "cmd_action_bar_slot12",
      "cmd_action_bar_slot13",
      "cmd_action_bar_slot14",
      "cmd_action_bar_slot15",
      "cmd_action_bar_slot16",
      "cmd_action_bar_slot17",
      "cmd_action_bar_slot18",
      "cmd_action_bar_slot19",
      "cmd_action_bar_slot20",
      "cmd_action_bar_slot21",
      "cmd_action_bar_slot22",
      "cmd_action_bar_slot23",
      "cmd_action_bar_slot24",
    ]
    this.binds = bindCommandsToGet.map((bindCommand) => {
      return KeybindStore.getBind(bindCommand);
    })

    Build.descriptionView.onmouseover = () => {
      Build.descriptionView.style.display = 'none';
    };

    document.body.append(Build.descriptionView);

    Build.heroView = document.createElement('div');
    Build.heroView.classList.add('build-hero');

    Build.levelView = document.createElement('div');
    Build.levelView.classList.add('build-level');

    Build.fieldView = document.createElement('div');
    Build.fieldView.classList.add('build-field');

    Build.listView = document.createElement('div');
    Build.listView.classList.add('build-list');

    Build.buildActionsView = document.createElement('div');
    Build.buildActionsView.classList.add('build-actions-view');

    Build.fieldConflict = new Object();

    // ================================================

    const buttonTalents = document.createElement('button');
    buttonTalents.innerText = Lang.text('talents');
    buttonTalents.title = Lang.text('todoInProgress');
    buttonTalents.classList.add('btn-talents', 'btn-hover', 'color-1');
    buttonTalents.title = Lang.text('talentLibrary');

    const separator = document.createElement('div');
    separator.innerText = '|';
    separator.classList.add('btn-separator');

    const buttonSets = document.createElement('button');
    buttonSets.innerText = Lang.text('sets');
    buttonSets.title = Lang.text('todoInProgress');
    buttonSets.classList.add('btn-sets', 'btn-hover', 'color-1');

    buttonSets.addEventListener('click', () => Build.sets());

    Build.talentsAndSetsView = document.createElement('div');
    Build.talentsAndSetsView.classList.add('buttons-talents-and-sets');
    Build.talentsAndSetsView.append(buttonTalents, separator, buttonSets);

    const buildTalents = DOM({ style: 'build-talents' });

    Build.inventoryView = document.createElement('div');
    Build.inventoryView.classList.add('build-talent-view');
    Build.applyTalentViewLayoutFromSettings();

    Build.setsListView = DOM({ style: 'build-sets' });
    Build.setsListView.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || e.shiftKey) return;
        if (!Build.setsListView) return;

        const view = Build.setsListView;
        const dy = Number(e.deltaY) || 0;
        if (!dy) return;

        const max = Math.max(0, view.scrollHeight - view.clientHeight);
        const cur = view.scrollTop;
        const canScroll = max > 0 && ((dy < 0 && cur > 0) || (dy > 0 && cur < max));
        // If list is already at edge and cannot scroll further, keep current hover preview.
        if (!canScroll) return;

        // Match library behavior: wheel scroll drops current hover visuals.
        Build._setsHoverSuppressed = true;
        Build._setsLastPointerX = e.clientX;
        Build._setsLastPointerY = e.clientY;
        Build.clearEmptySlotPreviews();
        if (Build.descriptionView) Build.descriptionView.style.display = 'none';
        Build._descriptionPinnedBySet = false;
        Build._hoveredSetTalentIds = null;
        Build._hoveredSetAnchorEl = null;
        Build.clearSetHighlights();
        try {
          if (Build._setsScrollStopTimer) clearTimeout(Build._setsScrollStopTimer);
        } catch {}
        Build._setsScrollStopTimer = setTimeout(() => {
          Build._setsScrollStopTimer = 0;
          Build._setsHoverSuppressed = false;
          try {
            const x = Number(Build._setsLastPointerX);
            const y = Number(Build._setsLastPointerY);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            const below = document.elementFromPoint(x, y);
            const hoveredSet = below?.closest?.('.build-set-item');
            if (!hoveredSet || !Build.setsListView?.contains?.(hoveredSet)) return;
            hoveredSet.dispatchEvent(
              new MouseEvent('mouseenter', {
                bubbles: false,
                cancelable: false,
                view: window,
                clientX: x,
                clientY: y,
              }),
            );
          } catch {}
        }, 140);

        // In row layout, keep native wheel speed (same feel as library).
        if (Build.inventoryView?.classList?.contains('build-talent-view--row')) return;

        e.preventDefault();

        const scaled = dy / 3;

        if (typeof Build._setsScrollTarget !== 'number') Build._setsScrollTarget = view.scrollTop;
        Build._setsScrollTarget += scaled;

        if (Build._setsScrollTarget < 0) Build._setsScrollTarget = 0;
        if (Build._setsScrollTarget > max) Build._setsScrollTarget = max;

        if (Build._setsScrollRaf) return;
        const step = () => {
          Build._setsScrollRaf = 0;
          if (!Build.setsListView) return;
          const v = Build.setsListView;
          const target = typeof Build._setsScrollTarget === 'number' ? Build._setsScrollTarget : v.scrollTop;
          const cur = v.scrollTop;

          const next = cur + (target - cur) * 0.22;
          v.scrollTop = next;

          if (Math.abs(target - next) > 0.5) {
            Build._setsScrollRaf = requestAnimationFrame(step);
          } else {
            v.scrollTop = target;
          }
        };
        Build._setsScrollRaf = requestAnimationFrame(step);
      },
      { passive: false },
    );

    Build.skinView = DOM(
      {
        tag: 'button',
        domaudio: domAudioPresets.defaultButton,
        style: ['btn-skins', 'btn-hover', 'color-3'],
        title: Lang.text('titleSkinsForTheHero'),
        event: ['click', async () => Build.skinChange()],
      },
      Lang.text('skins'),
    );

    Build.training = DOM(
      {
        tag: 'button',
        domaudio: domAudioPresets.defaultButton,
        style: ['btn-skins', 'btn-hover', 'color-3'],
        title: Lang.text('titletraining'),
        event: [
          'click',
          async () => {
            try {
              if (NativeAPI.status) {
                await MM.gameStartCheck();

                await App.api.request(App.CURRENT_MM, 'heroParty', {
                  id: MM.partyId,
                  hero: Build.heroId,
                });

                await App.api.request(App.CURRENT_MM, 'start', {
                  version: App.PW_VERSION,
                  mode: 99,
                  mac: NativeAPI.getMACAdress(),
                });
              } else {
                App.error(Lang.text('windowsLauncherRequired'));
              }
            } catch (error) {
              return App.error(error);
            }
          },
        ],
      },
      Lang.text('training'),
    );

    const talentsSection = DOM({ tag: 'fieldset', style: ['build-inventory-fieldset', 'build-talents-section'] });
    const talentsHeader = DOM({ tag: 'legend', style: 'build-inventory-legend' }, Lang.text('library'));
    talentsSection.append(talentsHeader, buildTalents);

    const setsSection = DOM({ tag: 'fieldset', style: ['build-inventory-fieldset', 'build-sets-section'] });
    const setsHeader = DOM({ tag: 'legend', style: 'build-inventory-legend' }, Lang.text('sets'));
    setsSection.append(setsHeader, Build.setsListView);

    Build.altResetHintView = DOM({ style: 'build-alt-reset-hint' }, Lang.text('buildAltResetHint'));
    Build.inventoryView.append(talentsSection, setsSection);
    Build.attachAltResetHintBelowInventory();
    Build.installAltResetHandler();
    Build.buildSettingsButton = Build.createBuildSettingsButton();
    Build.buildSettingsPanel = Build.createBuildSettingsPanel();
    Build.attachBuildSettingsToWbuild();
    Build.applyBuildHighlightVariablesFromSettings();

    Build.renderTalentSetsList();

    // ================================================

    Build.rarityView = DOM({ style: 'build-rarity' });

    Build.activeBarView = DOM({ style: 'build-active-bar' });

    Build.activeBarKeybindingsView = DOM({ style: 'build-active-bar' });

    let request = await App.api.request('build', 'data', {
      heroId: heroId,
      target: targetId,
    });

    Build.dataRequest = request;

    Build.id = request.id;

    Build.heroId = heroId;
    Build.targetId = targetId;

    Build.dataStats = new Object();
    Build.calculationStats = new Object();
    Build.initialStats = new Object();
    Build.heroPower = 0.0;
    Build.heroStatsFromPower = {
      hp: 0.0,
      mp: 0.0,
      regenhp: 0.0,
      regenmp: 0.0,
      sila: 0.0,
      razum: 0.0,
      provorstvo: 0.0,
      hitrost: 0.0,
      stoikost: 0.0,
      volia: 0.0,
    };
    Build.installedTalents = new Array(36).fill(null);
    Build.resetCombatModeState();
    Build.profileStats = new Object();

    Build.applyRz = true;
    Build.applyVz = false;
    Build.applyStak = true;
    Build.applyBuffs = true;

    Build.list(request.build, isWindow);
    Build.buildActions(request.build, isWindow);

    const hs = request.hero.stats;
    hs['damage'] = 0;
    hs['critProb'] = 0;
    hs['attackSpeed'] = 0;
    hs['punching'] = 0;
    hs['protectionBody'] = 0;
    hs['protectionSpirit'] = 0;
    if (hs.regenhp === undefined || hs.regenhp === null) hs.regenhp = 0;
    else hs.regenhp = parseFloat(hs.regenhp) || 0;
    if (hs.regenmp === undefined || hs.regenmp === null) hs.regenmp = 0;
    else hs.regenmp = parseFloat(hs.regenmp) || 0;
    hs.krajahp = 0;
    hs.krajamp = 0;
    hs.speedtal = 0;
    Build.hero(request.hero);

    Build.level();

    Build.field(request.body);
    Build.syncCombatModeButtonState();
    Build.renderCombatOrderBadges();

    Build.inventory();

    Build.rarity();

    Build.activeBar(request.active);

    //	Build.activeBar([35,-35,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);

    Build.ruleSortInventory = new Object();
    Build.scheduleAttachBuildSettings();
  }

  static async refreshBuildStateFromServer({ refreshInventory = true } = {}) {
    if (!Build.heroId || Build.targetId === undefined || Build.targetId === null) return;

    // Ensure the settings button/panel remain attached after rebuilds.
    Build.scheduleAttachBuildSettings(20);

    let highlightedLevels = [];
    try {
      highlightedLevels = Array.from(Build.fieldView?.querySelectorAll?.('.build-field-row.highlight') || [])
        .map((el) => el?.dataset?.level)
        .filter(Boolean);
    } catch {}

    let request = null;
    try {
      request = await App.api.request('build', 'data', {
        heroId: Build.heroId,
        target: Build.targetId,
      });
    } catch {
      return;
    }

    try {
      Build.setCombatMode(false, { force: true });
      Build.fieldConflict = new Object();
      Build.installedTalents = new Array(36).fill(null);
      Build.fieldView?.replaceChildren();
    } catch {}

    try {
      if (request?.body) Build.field(request.body);
    } catch {}

    try {
      for (const lvl of highlightedLevels) {
        const row = Build.fieldView?.querySelector?.(`.build-field-row[data-level="${lvl}"]`);
        if (row) row.classList.add('highlight');
      }
    } catch {}

    if (refreshInventory) {
      try {
        Build.inventory();
      } catch {}
    }

    try {
      if (request?.active) Build.activeBar(request.active);
    } catch {}
    Build.syncCombatModeButtonState();
  }

  static ensureBuildSettingsDefaults() {
    if (!Settings.settings) return;
    if (!Number.isFinite(Number(Settings.settings.buildSetLmbMode))) {
      Settings.settings.buildSetLmbMode = 1;
    }
    if (Settings.settings.buildSetLmbMode < 1 || Settings.settings.buildSetLmbMode > 3) {
      Settings.settings.buildSetLmbMode = 1;
    }
    if (typeof Settings.settings.buildRowHoverHighlight !== 'boolean') {
      Settings.settings.buildRowHoverHighlight = true;
    }
    if (!Number.isFinite(Number(Settings.settings.buildTalentViewLayout))) {
      Settings.settings.buildTalentViewLayout = 0;
    }
    if (Settings.settings.buildTalentViewLayout !== 0 && Settings.settings.buildTalentViewLayout !== 1) {
      Settings.settings.buildTalentViewLayout = 0;
    }
    if (typeof Settings.settings.buildSetOnlyMatchingStats !== 'boolean') {
      Settings.settings.buildSetOnlyMatchingStats = false;
    }
    if (!Number.isFinite(Number(Settings.settings.buildStatFilterHighlightMode))) {
      Settings.settings.buildStatFilterHighlightMode = 1;
    }
    if (Settings.settings.buildStatFilterHighlightMode < 0 || Settings.settings.buildStatFilterHighlightMode > 2) {
      Settings.settings.buildStatFilterHighlightMode = 1;
    }
    if (!Number.isFinite(Number(Settings.settings.buildHighlightHue))) {
      Settings.settings.buildHighlightHue = Build.BUILD_HIGHLIGHT_HUE_DEFAULT;
    }
    let bhHue = Number(Settings.settings.buildHighlightHue);
    bhHue = ((bhHue % 360) + 360) % 360;
    Settings.settings.buildHighlightHue = bhHue;
    if (!Number.isFinite(Number(Settings.settings.buildHighlightBorderMm))) {
      Settings.settings.buildHighlightBorderMm = Build.BUILD_HIGHLIGHT_BORDER_MM_DEFAULT;
    }
    const bhMm = Number(Settings.settings.buildHighlightBorderMm);
    Settings.settings.buildHighlightBorderMm = Math.min(
      Build.BUILD_HIGHLIGHT_BORDER_MM_MAX,
      Math.max(Build.BUILD_HIGHLIGHT_BORDER_MM_MIN, bhMm),
    );
  }

  static getBuildHighlightHue() {
    let h = Number(Settings.settings?.buildHighlightHue);
    if (!Number.isFinite(h)) h = Build.BUILD_HIGHLIGHT_HUE_DEFAULT;
    return ((h % 360) + 360) % 360;
  }

  static getBuildHighlightBorderMm() {
    let mm = Number(Settings.settings?.buildHighlightBorderMm);
    if (!Number.isFinite(mm)) mm = Build.BUILD_HIGHLIGHT_BORDER_MM_DEFAULT;
    return Math.min(
      Build.BUILD_HIGHLIGHT_BORDER_MM_MAX,
      Math.max(Build.BUILD_HIGHLIGHT_BORDER_MM_MIN, mm),
    );
  }

  static applyBuildHighlightVariablesFromSettings() {
    try {
      const h = String(Build.getBuildHighlightHue());
      const b = `${Build.getBuildHighlightBorderMm()}mm`;
      document.documentElement.style.setProperty('--build-hl-h', h);
      document.documentElement.style.setProperty('--build-hl-border-mm', b);
    } catch {}
  }

  /** Пока зажата ЛКМ на полосках цвета/толщины подсветки — подсветить все таланты (поле + библиотека). */
  static setHighlightSettingsStripPreviewActive(on) {
    const fieldCls = 'build-highlight-settings-demo';
    const libCls = 'build-highlight-settings-demo-lib';
    const v = !!on;
    try {
      Build.fieldView?.querySelectorAll?.('.build-talent-item')?.forEach((el) => {
        el.classList.toggle(fieldCls, v);
      });
    } catch {}
    try {
      Build.inventoryView?.querySelectorAll?.('.build-talents .build-talent-item')?.forEach((el) => {
        el.classList.toggle(libCls, v);
      });
    } catch {}
  }

  static getBuildStatFilterHighlightMode() {
    const m = Number(Settings.settings?.buildStatFilterHighlightMode);
    if (!Number.isFinite(m) || m < 0 || m > 2) return 1;
    return m;
  }

  static getSetLmbMode() {
    const mode = Number(Settings.settings?.buildSetLmbMode);
    if (!Number.isFinite(mode) || mode < 1 || mode > 3) return 1;
    return mode;
  }

  static isBuildRowHoverHighlightEnabled() {
    return !!Settings.settings?.buildRowHoverHighlight;
  }

  static applyTalentViewLayoutFromSettings() {
    try {
      const v = Build.inventoryView;
      if (!v) return;
      const mode = Number(Settings.settings?.buildTalentViewLayout) === 1 ? 1 : 0;
      v.classList.toggle('build-talent-view--row', mode === 1);
    } catch {}
  }

  static createBuildSettingsButton() {
    const button = DOM({
      tag: 'button',
      style: 'build-list-settings',
      domaudio: domAudioPresets.defaultButton,
      event: [
        'click',
        (e) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          Build.toggleBuildSettingsPanel();
        },
      ],
    });
    button.type = 'button';
    button.textContent = '';
    button.title = Lang.text('buildSettingsTitle');
    return button;
  }

  static createBuildSettingsPanel() {
    const panel = DOM({ style: 'build-settings-panel' });
    panel.style.display = 'none';

    const title = DOM({ style: 'build-settings-title' }, Lang.text('buildSettingsTitle'));

    const modeLabel = DOM({ style: 'build-settings-row-label' }, Lang.text('buildSettingsLmbMode'));
    const modeValue = DOM({ tag: 'span', style: 'build-settings-row-value' });
    modeValue.textContent = Build.getSetLmbModeLabel(Build.getSetLmbMode());
    const modeDots = DOM({ style: 'build-settings-mode-dots' });
    const buildSetModeValue = async (next) => {
      Settings.settings.buildSetLmbMode = next;
      modeValue.textContent = Build.getSetLmbModeLabel(next);
      const items = modeDots.querySelectorAll('.build-settings-mode-dot');
      items.forEach((dot, idx) => dot.classList.toggle('build-settings-mode-dot-active', idx + 1 === next));
      try {
        await Settings.WriteSettings();
      } catch {}
    };

    for (let i = 1; i <= 3; i++) {
      const dotStyle = ['build-settings-mode-dot'];
      if (Build.getSetLmbMode() === i) dotStyle.push('build-settings-mode-dot-active');
      const dot = DOM({
        tag: 'button',
        type: 'button',
        style: dotStyle,
        title: Lang.text(`buildSettingsLmbMode${i}`),
        event: [
          'click',
          async () => {
            await buildSetModeValue(i);
          },
        ],
      });
      modeDots.append(dot);
    }

    const hoverLabel = DOM({ style: 'build-settings-row-label' }, Lang.text('buildSettingsRowHighlight'));
    const hoverValue = DOM({ tag: 'span', style: 'build-settings-row-value' });
    const hoverDots = DOM({ style: 'build-settings-mode-dots' });
    const applyHoverValue = async (enabled) => {
      Settings.settings.buildRowHoverHighlight = enabled;
      hoverValue.textContent = enabled ? Lang.text('buildSettingsOn') : Lang.text('buildSettingsOff');
      if (!enabled) Build.clearBuildRowHoverHighlight();
      const activeIndex = enabled ? 1 : 0;
      const items = hoverDots.querySelectorAll('.build-settings-mode-dot');
      items.forEach((dot, idx) => dot.classList.toggle('build-settings-mode-dot-active', idx === activeIndex));
      try {
        await Settings.WriteSettings();
      } catch {}
    };
    const hoverEnabledNow = Build.isBuildRowHoverHighlightEnabled();
    hoverValue.textContent = hoverEnabledNow ? Lang.text('buildSettingsOn') : Lang.text('buildSettingsOff');
    for (let i = 0; i < 2; i++) {
      const enabled = i === 1;
      const dotStyle = ['build-settings-mode-dot'];
      if ((hoverEnabledNow && enabled) || (!hoverEnabledNow && !enabled)) dotStyle.push('build-settings-mode-dot-active');
      const dot = DOM({
        tag: 'button',
        type: 'button',
        style: dotStyle,
        title: enabled ? Lang.text('buildSettingsOn') : Lang.text('buildSettingsOff'),
        event: ['click', async () => applyHoverValue(enabled)],
      });
      hoverDots.append(dot);
    }

    const layoutLabel = DOM({ style: 'build-settings-row-label' }, Lang.text('buildSettingsLayout'));
    const layoutValue = DOM({ tag: 'span', style: 'build-settings-row-value' });
    const getLayoutText = (n) => (n === 1 ? Lang.text('buildSettingsLayoutRow') : Lang.text('buildSettingsLayoutColumn'));
    layoutValue.textContent = getLayoutText(Number(Settings.settings?.buildTalentViewLayout) === 1 ? 1 : 0);

    const layoutDots = DOM({ style: 'build-settings-mode-dots' });
    const applyLayoutValue = async (next) => {
      Settings.settings.buildTalentViewLayout = next;
      layoutValue.textContent = getLayoutText(next);
      Build.applyTalentViewLayoutFromSettings();
      const items = layoutDots.querySelectorAll('.build-settings-mode-dot');
      items.forEach((dot, idx) => dot.classList.toggle('build-settings-mode-dot-active', idx === next));
      try {
        await Settings.WriteSettings();
      } catch {}
    };
    const layoutNow = Number(Settings.settings?.buildTalentViewLayout) === 1 ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const dotStyle = ['build-settings-mode-dot'];
      if (layoutNow === i) dotStyle.push('build-settings-mode-dot-active');
      const dot = DOM({
        tag: 'button',
        type: 'button',
        style: dotStyle,
        title: i === 1 ? Lang.text('buildSettingsLayoutRow') : Lang.text('buildSettingsLayoutColumn'),
        event: ['click', async () => applyLayoutValue(i)],
      });
      layoutDots.append(dot);
    }

    const matchLabel = DOM({ style: 'build-settings-row-label' }, Lang.text('buildSettingsSetMatchOnly'));
    const matchValue = DOM({ tag: 'span', style: 'build-settings-row-value' });
    const matchDots = DOM({ style: 'build-settings-mode-dots' });
    const applyMatchValue = async (enabled) => {
      Settings.settings.buildSetOnlyMatchingStats = enabled;
      matchValue.textContent = enabled ? Lang.text('buildSettingsOn') : Lang.text('buildSettingsOff');
      const activeIndex = enabled ? 1 : 0;
      const items = matchDots.querySelectorAll('.build-settings-mode-dot');
      items.forEach((dot, idx) => dot.classList.toggle('build-settings-mode-dot-active', idx === activeIndex));
      try {
        await Settings.WriteSettings();
      } catch {}
    };
    const matchEnabledNow = Boolean(Settings.settings?.buildSetOnlyMatchingStats);
    matchValue.textContent = matchEnabledNow ? Lang.text('buildSettingsOn') : Lang.text('buildSettingsOff');
    for (let i = 0; i < 2; i++) {
      const enabled = i === 1;
      const dotStyle = ['build-settings-mode-dot'];
      if ((matchEnabledNow && enabled) || (!matchEnabledNow && !enabled)) dotStyle.push('build-settings-mode-dot-active');
      const dot = DOM({
        tag: 'button',
        type: 'button',
        style: dotStyle,
        title: enabled ? Lang.text('buildSettingsOn') : Lang.text('buildSettingsOff'),
        event: ['click', async () => applyMatchValue(enabled)],
      });
      matchDots.append(dot);
    }

    const statFiltLabel = DOM({ style: 'build-settings-row-label' }, Lang.text('buildSettingsStatFilterHighlight'));
    const statFiltValue = DOM({ tag: 'span', style: 'build-settings-row-value' });
    const statFiltModeNow = Build.getBuildStatFilterHighlightMode();
    statFiltValue.textContent = Build.getBuildStatFilterHighlightModeLabel(statFiltModeNow);
    const statFiltDots = DOM({ style: 'build-settings-mode-dots' });
    const applyStatFiltMode = async (next) => {
      Settings.settings.buildStatFilterHighlightMode = next;
      statFiltValue.textContent = Build.getBuildStatFilterHighlightModeLabel(next);
      const items = statFiltDots.querySelectorAll('.build-settings-mode-dot');
      items.forEach((dot, idx) => dot.classList.toggle('build-settings-mode-dot-active', idx === next));
      try {
        await Settings.WriteSettings();
      } catch {}
    };
    for (let i = 0; i < 3; i++) {
      const dotStyle = ['build-settings-mode-dot'];
      if (statFiltModeNow === i) dotStyle.push('build-settings-mode-dot-active');
      const dot = DOM({
        tag: 'button',
        type: 'button',
        style: dotStyle,
        title: Build.getBuildStatFilterHighlightModeLabel(i),
        event: ['click', async () => applyStatFiltMode(i)],
      });
      statFiltDots.append(dot);
    }

    const hlBlock = DOM({ style: 'build-settings-hl-block' });
    const hlSliders = DOM({ style: 'build-settings-hl-sliders' });
    const hlHueLabel = DOM({ style: 'build-settings-hl-line-label' }, Lang.text('buildSettingsHighlightHue'));
    const hlHueTrack = DOM({ style: 'build-settings-hl-hue-track' });
    const hlHueThumb = DOM({ style: 'build-settings-hl-thumb' });
    hlHueTrack.append(hlHueThumb);
    const hlBorderLabel = DOM({ style: 'build-settings-hl-line-label' }, Lang.text('buildSettingsHighlightBorder'));
    const hlBorderTrack = DOM({ style: 'build-settings-hl-mm-track' });
    const hlBorderThumb = DOM({ style: 'build-settings-hl-thumb' });
    hlBorderTrack.append(hlBorderThumb);
    hlSliders.append(hlHueLabel, hlHueTrack, hlBorderLabel, hlBorderTrack);

    const hlReset = DOM(
      {
        tag: 'button',
        type: 'button',
        style: 'build-settings-hl-reset',
        title: Lang.text('buildSettingsHighlightReset'),
        domaudio: domAudioPresets.defaultButton,
      },
      '↺',
    );

    const syncHlPanelThumbs = () => {
      const hue = Build.getBuildHighlightHue();
      hlHueThumb.style.left = `${(hue / 360) * 100}%`;
      const mm = Build.getBuildHighlightBorderMm();
      const span = Build.BUILD_HIGHLIGHT_BORDER_MM_MAX - Build.BUILD_HIGHLIGHT_BORDER_MM_MIN;
      const t = span > 0 ? (mm - Build.BUILD_HIGHLIGHT_BORDER_MM_MIN) / span : 0;
      hlBorderThumb.style.left = `${Math.min(1, Math.max(0, t)) * 100}%`;
    };

    const commitHlSettings = async () => {
      Build.applyBuildHighlightVariablesFromSettings();
      try {
        await Settings.WriteSettings();
      } catch {}
    };

    const setHueFromClientX = (clientX) => {
      const r = hlHueTrack.getBoundingClientRect();
      if (r.width <= 0) return Build.getBuildHighlightHue();
      const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const hue = t * 360;
      Settings.settings.buildHighlightHue = hue;
      hlHueThumb.style.left = `${t * 100}%`;
      Build.applyBuildHighlightVariablesFromSettings();
      return hue;
    };

    const setBorderMmFromClientX = (clientX) => {
      const r = hlBorderTrack.getBoundingClientRect();
      if (r.width <= 0) return Build.getBuildHighlightBorderMm();
      const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const mm =
        Build.BUILD_HIGHLIGHT_BORDER_MM_MIN +
        t * (Build.BUILD_HIGHLIGHT_BORDER_MM_MAX - Build.BUILD_HIGHLIGHT_BORDER_MM_MIN);
      Settings.settings.buildHighlightBorderMm = mm;
      hlBorderThumb.style.left = `${t * 100}%`;
      Build.applyBuildHighlightVariablesFromSettings();
      return mm;
    };

    let hlHueDrag = false;
    let hlBorderDrag = false;
    const syncHlStripPreview = () => {
      Build.setHighlightSettingsStripPreviewActive(hlHueDrag || hlBorderDrag);
    };
    hlHueTrack.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      hlHueDrag = true;
      hlHueTrack.setPointerCapture(e.pointerId);
      setHueFromClientX(e.clientX);
      syncHlStripPreview();
    });
    hlHueTrack.addEventListener('pointermove', (e) => {
      if (!hlHueDrag) return;
      setHueFromClientX(e.clientX);
    });
    const endHueDrag = async (e) => {
      if (!hlHueDrag) return;
      hlHueDrag = false;
      syncHlStripPreview();
      try {
        hlHueTrack.releasePointerCapture(e.pointerId);
      } catch {}
      setHueFromClientX(e.clientX);
      await commitHlSettings();
    };
    hlHueTrack.addEventListener('pointerup', endHueDrag);
    hlHueTrack.addEventListener('pointercancel', endHueDrag);
    hlHueTrack.addEventListener('lostpointercapture', async () => {
      if (!hlHueDrag) return;
      hlHueDrag = false;
      syncHlStripPreview();
      await commitHlSettings();
    });

    hlBorderTrack.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      hlBorderDrag = true;
      hlBorderTrack.setPointerCapture(e.pointerId);
      setBorderMmFromClientX(e.clientX);
      syncHlStripPreview();
    });
    hlBorderTrack.addEventListener('pointermove', (e) => {
      if (!hlBorderDrag) return;
      setBorderMmFromClientX(e.clientX);
    });
    const endBorderDrag = async (e) => {
      if (!hlBorderDrag) return;
      hlBorderDrag = false;
      syncHlStripPreview();
      try {
        hlBorderTrack.releasePointerCapture(e.pointerId);
      } catch {}
      setBorderMmFromClientX(e.clientX);
      await commitHlSettings();
    };
    hlBorderTrack.addEventListener('pointerup', endBorderDrag);
    hlBorderTrack.addEventListener('pointercancel', endBorderDrag);
    hlBorderTrack.addEventListener('lostpointercapture', async () => {
      if (!hlBorderDrag) return;
      hlBorderDrag = false;
      syncHlStripPreview();
      await commitHlSettings();
    });

    hlReset.addEventListener('click', async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      Settings.settings.buildHighlightHue = Build.BUILD_HIGHLIGHT_HUE_DEFAULT;
      Settings.settings.buildHighlightBorderMm = Build.BUILD_HIGHLIGHT_BORDER_MM_DEFAULT;
      Build.ensureBuildSettingsDefaults();
      syncHlPanelThumbs();
      await commitHlSettings();
    });

    syncHlPanelThumbs();
    Build.refreshBuildHighlightSettingsPanel = syncHlPanelThumbs;

    hlBlock.append(hlSliders, hlReset);
    panel.append(
      title,
      modeLabel,
      modeDots,
      modeValue,
      hoverLabel,
      hoverDots,
      hoverValue,
      layoutLabel,
      layoutDots,
      layoutValue,
      matchLabel,
      matchDots,
      matchValue,
      statFiltLabel,
      statFiltDots,
      statFiltValue,
      hlBlock,
    );

    return panel;
  }

  static getSetLmbModeLabel(mode) {
    if (mode === 2) return Lang.text('buildSettingsLmbMode2');
    if (mode === 3) return Lang.text('buildSettingsLmbMode3');
    return Lang.text('buildSettingsLmbMode1');
  }

  static getBuildStatFilterHighlightModeLabel(mode) {
    if (mode === 0) return Lang.text('buildSettingsStatFilterHighlightModeOff');
    if (mode === 2) return Lang.text('buildSettingsStatFilterHighlightModeAffectsTotal');
    return Lang.text('buildSettingsStatFilterHighlightModeHasStat');
  }

  static toggleBuildSettingsPanel(force) {
    const panel = Build.buildSettingsPanel;
    if (!panel) return;
    const shouldOpen = typeof force === 'boolean' ? force : panel.style.display === 'none';
    panel.style.display = shouldOpen ? 'flex' : 'none';
    if (shouldOpen) {
      try {
        Build.refreshBuildHighlightSettingsPanel?.();
      } catch {}
    }
  }

  static attachBuildSettingsToWbuild() {
    try {
      // Attach only to the current build window instance.
      // During window re-open, an old #wbuild can still exist briefly.
      const candidates = Array.from(document.querySelectorAll('#wbuild'));
      const wbuild = candidates.find((el) => el?.contains?.(Build.buildActionsView));
      if (!wbuild) return;
      if (Build.buildSettingsButton && Build.buildSettingsButton.parentNode !== wbuild) wbuild.append(Build.buildSettingsButton);
      if (Build.buildSettingsPanel && Build.buildSettingsPanel.parentNode !== wbuild) wbuild.append(Build.buildSettingsPanel);
      Build.applyBuildHighlightVariablesFromSettings();
    } catch {}
  }

  static scheduleAttachBuildSettings(maxAttempts = 80) {
    try {
      if (Build._buildSettingsAttachTimer) clearTimeout(Build._buildSettingsAttachTimer);
    } catch {}

    let attempts = 0;
    const tick = () => {
      Build._buildSettingsAttachTimer = 0;
      Build.attachBuildSettingsToWbuild();

      let attached = false;
      try {
        const candidates = Array.from(document.querySelectorAll('#wbuild'));
        const wbuild = candidates.find((el) => el?.contains?.(Build.buildActionsView));
        attached =
          !!wbuild &&
          wbuild.contains(Build.buildActionsView) &&
          Build.buildSettingsButton?.parentNode === wbuild &&
          Build.buildSettingsPanel?.parentNode === wbuild;
      } catch {}

      if (attached || attempts >= maxAttempts) return;
      attempts++;
      Build._buildSettingsAttachTimer = setTimeout(tick, 120);
    };

    tick();
  }

  static CleanInvalidDescriptions() {
    let invalidDescriptions = document.getElementsByClassName('build-description');
    for (let descElement in invalidDescriptions) {
      if (invalidDescriptions[descElement].className && invalidDescriptions[descElement].className == 'build-description') {
        console.log('Удалено протухшее описание');
        invalidDescriptions[descElement].remove();
      }
    }
  }

  static async sets() {
    let sets = await App.api.request('build', 'sets');

    for (let set of sets) {
      console.log(set);
    }
  }

  static async changeSkinForHero(heroId, skinId) {
    await App.api.request('build', 'skinChange', {
      hero: heroId,
      skin: skinId,
    });

    MM.hero.filter((hero) => {
      return hero.id == heroId;
    })[0].skin = skinId;
    if (Build.heroId === heroId) {
      Build.applyBuildHeroAvatarSkin(heroId, skinId);
    }

    try {
      let heroItem = View.castleBottom.querySelector(`#id${heroId}`);

      heroItem.style.backgroundImage = `url(content/hero/${heroId}/${skinId}.webp)`;

      let heroName = heroItem.querySelector('.castle-item-hero-name');

      heroName.firstChild.innerText = Lang.heroName(heroId, skinId);
    } catch (e) {
      App.error(e);
    }

    //View.bodyCastleHeroes();

    //await App.ShowCurrentViewAsync();
  }

  static applyBuildHeroAvatarSkin(heroId, skinId) {
    if (!Build.heroImg) return;
    const sid = Number.isFinite(Number(skinId)) ? Number(skinId) : 1;
    Build.heroImg.style.backgroundImage = `url(content/hero/${heroId}/${sid}.webp), url(content/hero/background.png)`;
    // Use contain for hero layer so built-in frame inside skin image is not clipped on non-uniform source sizes.
    Build.heroImg.style.backgroundSize = 'contain, 100%';
    Build.heroImg.style.backgroundPosition = 'center, center';
    Build.heroImg.style.backgroundRepeat = 'no-repeat, no-repeat';
  }

  static skinChange() {
    let bodyHero = DOM({ style: 'skin-change' });

    let preload = new PreloadImages(bodyHero);

    for (const i of Build.dataRequest.hero.skin.list) {
      let hero = DOM({ domaudio: domAudioPresets.smallButton });

      hero.dataset.url = `content/hero/${Build.heroId}/${i}.webp`;

      hero.dataset.skin = i;

      hero.addEventListener('click', async () => {
        await Build.changeSkinForHero(Build.heroId, hero.dataset.skin);
        Build.applyBuildHeroAvatarSkin(Build.heroId, hero.dataset.skin);

        Splash.hide();
      });

      preload.add(hero);
    }

    Splash.show(bodyHero, false);
  }

  static buildSelectName(method, btnName, data, isWindow) {
    const close = DOM({
      tag: 'div',
      domaudio: domAudioPresets.closeButton,
      style: 'close-button',
      event: ['click', () => Splash.hide()],
    });

    close.style.backgroundImage = 'url(content/icons/close-cropped.svg)';

    let template = document.createDocumentFragment();
    const modal = DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('assembly')));
    let name = DOM({
      id: 'build-create-input',
      domaudio: domAudioPresets.defaultInput,
      tag: 'input',
      placeholder: Lang.text('buildNamePlaceholder'),
    });

    let button = DOM(
      {
        style: 'splash-content-button-modal',
        domaudio: domAudioPresets.bigButton,
        event: [
          'click',
          async () => {
            if (!name.value) {
              Splash.hide();
            }

            data['name'] = name.value;

            await App.api.request('build', method, data);

            Splash.hide();

            isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
          },
        ],
      },
      btnName,
    );

    template.append(modal, name, button, close);

    Splash.show(template);
  }

  static buildActions(builds, isWindow) {
    // Переключаемый боевой режим (симуляция прокачки талантов в текущем билде)
    {
      const combatMode = DOM({
        tag: 'button',
        domaudio: domAudioPresets.defaultButton,
        style: ['build-action-item', 'btn-hover', 'color-1', 'build-action-item-combat-mode'],
        event: [
          'click',
          () => {
            Build.toggleCombatMode();
          },
        ],
      });
      const combatModeBg = DOM({
        style: ['btn-combat-mode', 'build-action-item-background'],
      });
      const combatModeCount = DOM({ tag: 'span', style: 'btn-combat-mode-count' }, '');
      const combatModeGlass = DOM({ tag: 'span', style: 'btn-combat-mode-glass' });
      combatModeBg.append(combatModeCount, combatModeGlass);
      combatMode.append(combatModeBg);
      Build.buildActionsView.append(combatMode);
      Build.combatModeButtonEl = combatMode;
      Build.combatModeButtonCountEl = combatModeCount;
      Build.syncCombatModeButtonState();
    }

    if (builds.length < 6) {
      const create = DOM({
        tag: 'button',
        domaudio: domAudioPresets.defaultButton,
        style: ['build-action-item', 'btn-hover', 'color-1'],
        title: Lang.text('titleCreateANewBuildTab'),
        event: ['click', () => Build.buildSelectName('create', Lang.text('createBuild'), { heroId: Build.heroId }, isWindow)],
      });

      let createBg = DOM({
        style: ['btn-create', 'build-action-item-background'],
      });
      createBg.style.backgroundImage = `url('content/img/create.png')`;
      create.append(createBg);
      Build.buildActionsView.append(create);
    }

    // Кнопка дублирования

    const duplicate = DOM({
      tag: 'button',
      domaudio: domAudioPresets.defaultButton,
      style: ['build-action-item', 'btn-hover', 'color-1'],
      title: Lang.text('titleDuplicateTheCurrentBuild'),
      event: [
        'click',
        async () => {
          // Сохраняем ID текущего билда до любых действий
          const currentBuildId = Build.id;

          const fragment = document.createDocumentFragment();
          const title = DOM(
            { style: 'splash-text', id: 'duplicateBuildModal'},
            builds.length >= 6 ? Lang.text('buildLimitReached') : Lang.text('selectBuildToReplace'),
          );
          fragment.append(title);

          // Показываем все билды кроме текущего
          builds
            .filter((build) => build.id !== currentBuildId)
            .forEach((build) => {
              const btn = DOM(
                {
                  tag: 'button',
                  domaudio: domAudioPresets.defaultButton,
                  style: ['build-replace-btn', 'btn-hover'],
                  event: [
                    'click',
                    async () => {
                      await App.api.request('build', 'duplicate', {
                        id: currentBuildId,
                        target: build.id,
                      });
                      Splash.hide();

                      isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
                    },
                  ],
                },
                build.name,
              );
              fragment.append(btn);
            });

          // Если билдов меньше 6, добавляем кнопку создания нового
          if (builds.length < 6) {
            const createNewBtn = DOM(
              {
                tag: 'button',
                domaudio: domAudioPresets.defaultButton,
                style: ['build-replace-btn', 'btn-hover', 'color-1'],
                event: [
                  'click',
                  async () => {
                    Splash.hide();

                    // Создаем форму для имени нового билда
                    const close = DOM({
                      tag: 'div',
                      domaudio: domAudioPresets.closeButton,
                      style: 'close-button',
                      event: ['click', () => Splash.hide()],
                    });
                    close.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
                    let template = document.createDocumentFragment();
                    let name = DOM({
                      domaudio: domAudioPresets.defaultInput,
                      tag: 'input',
                      placeholder: Lang.text('buildNamePlaceholder'),
                    });
                    
                    let button = DOM(
                      {
                        style: 'splash-content-button',
                        domaudio: domAudioPresets.bigButton,
                        event: [
                          'click',
                          async () => {
                            if (!name.value) {
                              Splash.hide();
                              return;
                            }

                            // Сначала создаем новый билд
                            const createData = {
                              heroId: Build.heroId,
                              name: name.value,
                            };
                            const createResponse = await App.api.request('build', 'create', createData);
                            console.log(currentBuildId);
                            console.log(createResponse);
                            // Затем дублируем сохраненный билд в новый

                            await App.api.request('build', 'duplicate', {
                              id: currentBuildId,
                              target: createResponse,
                            });

                            Splash.hide();
                            isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
                          },
                        ],
                      },
                      Lang.text('createAndDuplicate'),
                    );
                    
                    template.append(name, button, close);
                    Splash.show(template);
                  },
                ],
              },
              Lang.text('duplicateToNewBuild'),
            );
            fragment.append(createNewBtn);
          }

          // Добавляем крестик для закрытия вместо кнопки "Отмена"
          const closeButton = DOM({
            tag: 'div',
            domaudio: domAudioPresets.closeButton,
            style: 'close-button',
            event: ['click', () => Splash.hide()],
          });

          const modal = DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('assembly')));
          closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
          fragment.append(modal, closeButton);

          Splash.show(fragment);
        },
      ],
    });

    let duplicateBg = DOM({ style: ['btn-duplicate'] });
    duplicateBg.style.backgroundImage = `url('content/img/copy.png')`;
    duplicate.append(duplicateBg);
    Build.buildActionsView.append(duplicate);

    // Кнопка случайного билда
    {
      const random = DOM({
        tag: 'button',
        domaudio: domAudioPresets.defaultButton,
        style: ['build-action-item', 'btn-hover', 'color-1'],
        title: Lang.text('titleGenerateARandomBuild'),
        event: [
          'click',
          async () => {
            await App.api.request('build', 'random', { id: Build.id });
            isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
          },
        ],
      });

      let randomBg = DOM({
        style: ['btn-random', 'build-action-item-background'],
      });
      randomBg.style.backgroundImage = `url('content/img/random.png')`;
      random.append(randomBg);
      Build.buildActionsView.append(random);
    }

    // Кнопка сброса билда
    {
      const resetBuild = DOM({
        tag: 'button',
        domaudio: domAudioPresets.defaultButton,
        style: ['build-action-item', 'btn-hover', 'color-1'],
        title: Lang.text('titleResetTalentsInThisBuild'),
        event: [
          'click',
          async () => {
            const fragment = document.createDocumentFragment();
            const modal = DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('assembly')));
            const title = DOM({ style: 'splash-text', id: 'resetBuildText' }, Lang.text('resetTalentsTitle'));
            fragment.append(title);

            // Красная кнопка сброса
            const reset = DOM(
              {
                tag: 'button',
                domaudio: domAudioPresets.bigButton,
                style: ['build-replace-btn', 'btn-hover'],
                event: [
                  'click',
                  async () => {
                    await App.api.request('build', 'clear', { id: Build.id });
                    Splash.hide();
                    isWindow ? Window.show('main', 'build', Build.heroId, 0, true) : View.show('build', Build.heroId);
                  },
                ],
              },
              Lang.text('reset'),
            );

            // Явно задаём красный цвет
            reset.style.backgroundColor = '#7b001c';
            reset.style.color = 'white';
            reset.style.borderColor = '#ff3333';
            reset.addEventListener('mouseover', () => {
              reset.style.backgroundColor = '#ff3333';
            });
            reset.addEventListener('mouseout', () => {
              reset.style.backgroundColor = '#7b001c';
            });

            fragment.append(modal, reset);

            let closeButton = DOM({
              tag: 'div',
              domaudio: domAudioPresets.closeButton,
              style: 'close-button',
              event: ['click', () => Splash.hide()],
            });
            closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
            fragment.append(closeButton);
            Splash.show(fragment);
          },
        ],
      });

      let resetBg = DOM({
        style: ['btn-trash', 'build-action-item-background'],
      });
      resetBg.style.backgroundImage = `url('content/img/remove.png')`;
      resetBuild.append(resetBg);
      Build.buildActionsView.append(resetBuild);
    }

  }

  static resetCombatModeState() {
    Build.combatModeButtonEl = null;
    Build.combatModeButtonCountEl = null;
    Build.combatModeEnabled = false;
    Build.combatModeLearnOrder = [];
    Build.combatModeLearnOrderBySlot = new Map();
    Build.combatModeLearnedSlots = new Set();
  }

  static getCombatModeHeroLevel() {
    return Build.combatModeLearnOrder.length;
  }

  static getCombatMainTalentSlotIndex() {
    for (let i = 0; i < (Build.installedTalents || []).length; i++) {
      const t = Build.installedTalents[i];
      if (Build.isMainHeroClassTalent(t)) return i;
    }
    return -1;
  }

  static isBuildCompleteForCombatMode() {
    const list = Build.installedTalents || [];
    if (!Array.isArray(list) || list.length !== 36) return false;
    for (const t of list) {
      if (!t) return false;
    }
    return true;
  }

  static hasMainTalentInBuildForCombatMode() {
    return Build.getCombatMainTalentSlotIndex() >= 0;
  }

  static canEnableCombatMode() {
    return Build.isBuildCompleteForCombatMode() && Build.hasMainTalentInBuildForCombatMode();
  }

  static getCombatModeTooltip() {
    if (!Build.canEnableCombatMode()) {
      return `${Lang.text('combatModeName')}\n${Lang.text('combatModeBuildNotComplete')}`;
    }
    return Lang.text('combatModeName');
  }

  static syncCombatModeButtonState() {
    const btn = Build.combatModeButtonEl;
    if (!btn) return;
    const canEnable = Build.canEnableCombatMode();
    if (!canEnable && Build.combatModeEnabled) {
      Build.setCombatMode(false, { force: true });
    }
    btn.classList.toggle('build-action-item-active', Build.combatModeEnabled);
    btn.classList.toggle('build-action-item-disabled', !canEnable);
    btn.title = Build.getCombatModeTooltip();
    if (Build.combatModeButtonCountEl) {
      const isRawMode = !Build.combatModeEnabled;
      Build.combatModeButtonCountEl.classList.toggle('btn-combat-mode-count-raw', isRawMode);
      Build.combatModeButtonCountEl.textContent = isRawMode ? '' : String(Build.getCombatModeHeroLevel());
    }
  }

  static getCombatUnlockedRowsForLevel(level) {
    const lvl = Math.max(1, Number(level) || 1);
    if (lvl >= 20) return 6;
    return Math.max(1, Math.min(6, 1 + Math.floor(lvl / 4)));
  }

  static renderCombatOrderBadges() {
    try {
      Build.fieldView?.querySelectorAll('.build-combat-order-badge').forEach((el) => el.remove());
      Build.fieldView?.querySelectorAll('.build-talent-item.build-combat-learned').forEach((el) => el.classList.remove('build-combat-learned'));
      Build.fieldView?.querySelectorAll('.build-talent-item.build-combat-locked').forEach((el) => el.classList.remove('build-combat-locked'));
      Build.fieldView?.querySelectorAll('.build-talent-item.build-combat-surrounded-blink').forEach((el) =>
        el.classList.remove('build-combat-surrounded-blink'),
      );
    } catch {}
    if (!Build.combatModeEnabled) {
      Build.fieldView?.classList.remove('build-combat-mode-on');
      return;
    }
    Build.fieldView?.classList.add('build-combat-mode-on');
    const unlockedRows = Build.getCombatUnlockedRowsForLevel(Build.getCombatModeHeroLevel());
    const cells = Build.fieldView?.querySelectorAll('.build-hero-grid-item') || [];
    const slotToTalentEl = new Map();
    for (const cell of cells) {
      const talentEl = cell?.querySelector?.('.build-talent-item');
      if (!talentEl) continue;
      const slot = Number(cell?.dataset?.position);
      if (!Number.isFinite(slot)) continue;
      slotToTalentEl.set(slot, talentEl);
      const slotTalent = Build.installedTalents?.[slot];
      const row = Math.max(1, Number(slotTalent?.level) || 1);
      const learnedOrder = Build.combatModeLearnOrderBySlot.get(slot);
      const isLearned = Number.isFinite(learnedOrder);
      if (isLearned) {
        talentEl.classList.add('build-combat-learned');
        const badge = DOM({ style: 'build-combat-order-badge' }, String(learnedOrder));
        talentEl.append(badge);
      } else if (row > unlockedRows) {
        talentEl.classList.add('build-combat-locked');
      }
    }

    // Blink enclosed unlearned talents (4 sides are either walls or already learned talents).
    const GRID_SIZE = 6;
    const learnedSet = Build.combatModeLearnedSlots || new Set();
    for (const [slot, talentEl] of slotToTalentEl.entries()) {
      if (learnedSet.has(slot)) continue;
      const row = Math.floor(slot / GRID_SIZE);
      const col = slot % GRID_SIZE;
      const topBlocked = row === 0 || learnedSet.has(slot - GRID_SIZE);
      const rightBlocked = col === GRID_SIZE - 1 || learnedSet.has(slot + 1);
      const bottomBlocked = row === GRID_SIZE - 1 || learnedSet.has(slot + GRID_SIZE);
      const leftBlocked = col === 0 || learnedSet.has(slot - 1);
      if (topBlocked && rightBlocked && bottomBlocked && leftBlocked) {
        talentEl.classList.add('build-combat-surrounded-blink');
      }
    }
  }

  static getCombatLearnedInstalledTalents() {
    const effective = new Array(36).fill(null);
    for (const slot of Build.combatModeLearnedSlots) {
      if (slot < 0 || slot >= 36) continue;
      effective[slot] = Build.installedTalents?.[slot] || null;
    }
    return effective;
  }

  static getEffectiveInstalledTalents() {
    if (!Build.combatModeEnabled) return Build.installedTalents;
    return Build.getCombatLearnedInstalledTalents();
  }

  static canLearnTalentInCombatMode(slotIndex) {
    if (!Build.combatModeEnabled) return false;
    if (Build.combatModeLearnedSlots.has(slotIndex)) return false;
    const talent = Build.installedTalents?.[slotIndex];
    if (!talent) return false;
    const currentLevel = Build.getCombatModeHeroLevel();
    const unlockedRows = Build.getCombatUnlockedRowsForLevel(currentLevel);
    const talentRow = Math.max(1, Number(talent.level) || 1);
    return talentRow <= unlockedRows;
  }

  static learnCombatTalentAtSlot(slotIndex) {
    if (!Build.canLearnTalentInCombatMode(slotIndex)) return false;
    const order = Build.combatModeLearnOrder.length + 1;
    Build.combatModeLearnOrder.push(slotIndex);
    Build.combatModeLearnedSlots.add(slotIndex);
    Build.combatModeLearnOrderBySlot.set(slotIndex, order);
    return true;
  }

  static rebuildCombatLearnOrderMapsFromOrderArray() {
    Build.combatModeLearnedSlots = new Set(Build.combatModeLearnOrder);
    Build.combatModeLearnOrderBySlot = new Map();
    for (let i = 0; i < Build.combatModeLearnOrder.length; i++) {
      Build.combatModeLearnOrderBySlot.set(Build.combatModeLearnOrder[i], i + 1);
    }
  }

  /**
   * После изменения числа изученных: уровень = длина списка; строки выше допустимой для этого уровня снимаются
   * (с конца порядка изучения среди нарушителей).
   */
  static enforceCombatLearnedRowConstraints() {
    const requirements = [4, 8, 12, 16, 20];
    
    let changed = true;
    while (changed) {
      changed = false;
      
      const talentsByRow = new Map();
      Build.combatModeLearnOrder.forEach(slot => {
        const t = Build.installedTalents?.[slot];
        const row = Math.max(1, Number(t?.level) || 1);
        talentsByRow.set(row, (talentsByRow.get(row) || 0) + 1);
      });
      
      let totalTalents = 0;
      for (let row = 1; row <= 5; row++) {
        totalTalents += talentsByRow.get(row) || 0;
        if (totalTalents < requirements[row - 1]) {
          for (let i = Build.combatModeLearnOrder.length - 1; i > 0; i--) {
            const slot = Build.combatModeLearnOrder[i];
            const t = Build.installedTalents?.[slot];
            const talentRow = Math.max(1, Number(t?.level) || 1);
            if (talentRow === row + 1) {
              Build.combatModeLearnOrder.splice(i, 1);
              Build.rebuildCombatLearnOrderMapsFromOrderArray();
              changed = true;
              break;
            }
          }
          break;
        }
      }
    }
    
    while (Build.combatModeLearnOrder.length > 0) {
      const level = Build.combatModeLearnOrder.length;
      const unlockedRows = Build.getCombatUnlockedRowsForLevel(level);
      let removeIdx = -1;
      for (let j = Build.combatModeLearnOrder.length - 1; j > 0; j--) {
        const slot = Build.combatModeLearnOrder[j];
        const t = Build.installedTalents?.[slot];
        const row = Math.max(1, Number(t?.level) || 1);
        if (row > unlockedRows) {
          removeIdx = j;
          break;
        }
      }
      if (removeIdx < 0) break;
      Build.combatModeLearnOrder.splice(removeIdx, 1);
      Build.rebuildCombatLearnOrderMapsFromOrderArray();
    }
    
    if (Build.combatModeLearnOrder.length === 0) {
      const mainSlot = Build.getCombatMainTalentSlotIndex();
      if (mainSlot >= 0) {
        Build.combatModeLearnOrder = [mainSlot];
        Build.rebuildCombatLearnOrderMapsFromOrderArray();
      }
    }
  }

  /**
   * Оставить только первые keepLastOrder шагов (номера 1…keepLastOrder). 0 — ни одного; пусто → снова только главный классовый талант.
   */
  static rollbackCombatProgressToOrder(keepLastOrder) {
    let keep = Number(keepLastOrder);
    if (!Number.isFinite(keep)) keep = 0;
    keep = Math.max(0, Math.floor(keep));
    const nextOrder = [];
    const nextSet = new Set();
    const nextMap = new Map();
    for (let i = 0; i < Build.combatModeLearnOrder.length; i++) {
      const slot = Build.combatModeLearnOrder[i];
      const ord = i + 1;
      if (ord > keep) break;
      nextOrder.push(slot);
      nextSet.add(slot);
      nextMap.set(slot, ord);
    }
    Build.combatModeLearnOrder = nextOrder;
    Build.combatModeLearnedSlots = nextSet;
    Build.combatModeLearnOrderBySlot = nextMap;
    if (Build.combatModeLearnOrder.length === 0) {
      const mainSlot = Build.getCombatMainTalentSlotIndex();
      if (mainSlot >= 0) {
        Build.combatModeLearnOrder = [mainSlot];
        Build.rebuildCombatLearnOrderMapsFromOrderArray();
      }
    }
    Build.enforceCombatLearnedRowConstraints();
  }

  /** ПКМ по изученному таланту: снять только его, номера следующих −1; затем проверка строк по уровню. */
  static handleCombatTalentContextMenu(talentEl, event) {
    if (!Build.combatModeEnabled) return false;
    if (Number(talentEl?.dataset?.state) !== 2) return false;
    const slot = Number(talentEl?.parentElement?.dataset?.position);
    if (!Number.isFinite(slot)) return false;
    
    const mainSlot = Build.getCombatMainTalentSlotIndex();
    if (slot === mainSlot) return false;
    
    if (!Build.combatModeLearnOrderBySlot.has(slot)) return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const idx = Build.combatModeLearnOrder.indexOf(slot);
    if (idx < 0) return true;
    Build.combatModeLearnOrder.splice(idx, 1);
    Build.rebuildCombatLearnOrderMapsFromOrderArray();
    Build.enforceCombatLearnedRowConstraints();
    Build.renderCombatOrderBadges();
    Build.updateHeroStats();
    Build.refreshStatFilterHighlightCountDisplay();
    Build.syncCombatModeButtonState();
    return true;
  }

  static handleCombatTalentClick(element, event) {
    if (!Build.combatModeEnabled) return false;
    if (Number(element?.dataset?.state) !== 2) return false;
    const slot = Number(element?.parentElement?.dataset?.position);
    if (!Number.isFinite(slot)) return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const existingOrder = Build.combatModeLearnOrderBySlot.get(slot);
    if (Number.isFinite(existingOrder)) {
      Build.rollbackCombatProgressToOrder(existingOrder - 1);
    } else {
      const learned = Build.learnCombatTalentAtSlot(slot);
      if (!learned) return true;
    }
    Build.renderCombatOrderBadges();
    Build.updateHeroStats();
    Build.refreshStatFilterHighlightCountDisplay();
    Build.syncCombatModeButtonState();
    return true;
  }

  static toggleCombatMode() {
    Build.setCombatMode(!Build.combatModeEnabled);
  }

  static setCombatMode(enabled, { force = false } = {}) {
    const next = !!enabled;
    if (!force && next && !Build.canEnableCombatMode()) {
      Build.syncCombatModeButtonState();
      return;
    }
    if (Build.combatModeEnabled === next) {
      Build.syncCombatModeButtonState();
      return;
    }

    Build.combatModeEnabled = next;
    Build.combatModeLearnOrder = [];
    Build.combatModeLearnOrderBySlot = new Map();
    Build.combatModeLearnedSlots = new Set();

    if (next) {
      const mainSlot = Build.getCombatMainTalentSlotIndex();
      if (mainSlot < 0) {
        Build.combatModeEnabled = false;
      } else {
        Build.combatModeLearnOrder = [mainSlot];
        Build.combatModeLearnedSlots = new Set([mainSlot]);
        Build.combatModeLearnOrderBySlot = new Map([[mainSlot, 1]]);
      }
    }

    Build.renderCombatOrderBadges();
    Build.updateHeroStats();
    Build.refreshStatFilterHighlightCountDisplay();
    Build.syncCombatModeButtonState();
  }

  static list(builds, isWindow) {
    const buildButtonsWrapper = DOM({ style: 'build-list' });

    for (let build of builds) {
      const item = DOM(
        {
          tag: 'button',
          domaudio: domAudioPresets.defaultButton,
          style: ['build-tab-item', 'btn-hover'],
          event: [
            'click',
            () => {
              isWindow ? Window.show('main', 'build', Build.heroId, build.id, true) : View.show('build', Build.heroId, build.id);
            },
          ],
        },
        DOM({}, `${build.name}`),
      );
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        Build.buildSelectName('rename', Lang.text('renameBuild'), { id: build.id }, isWindow);
      });

      const div = DOM({ tag: 'div', style: 'button-build--wrapper' }, item);

      if (build.target) {
        item.classList.add('list-highlight');
      } else {
        item.classList.add('list-not-highlight');
      }

      Build.listView.append(div);
    }

    // Добавляем обработчик колесика мыши после создания списка
    setTimeout(() => {
      const buildList = document.querySelector('.build-list');
      if (buildList) {
        buildList.addEventListener('wheel', function (e) {
          e.preventDefault();
          this.scrollLeft += e.deltaY;

          // Опционально: можно добавить множитель для скорости прокрутки
          // this.scrollLeft += e.deltaY * 2;
        });
      }
    }, 0);

    /*
		setTimeout(_ => {
			if (!document.querySelector('.build-list.list-highlight')) {
				document.querySelector('.build-list').classList.add('list-highlight');
			}
		}, 300);
		*/
  }

  static totalStat(stat) {
    let initialStat = Build.initialStats[stat];
    if (!Number.isFinite(Number(initialStat))) initialStat = 0;
    else initialStat = Number(initialStat);
    let talentsStat = Build.calculationStats[stat];
    if (!Number.isFinite(Number(talentsStat))) talentsStat = 0;
    else talentsStat = Number(talentsStat);
    let powerStat = 0.0;
    if (stat in Build.heroStatsFromPower) {
      powerStat += Build.heroStatsFromPower[stat];
    }
    if (!Number.isFinite(powerStat)) powerStat = 0;
    // speeda — отдельный аддитивный вклад в скорость, суммируется с max-speed.
    if (stat === 'speed') {
      let speedAdd = Build.calculationStats['speeda'];
      if (!Number.isFinite(Number(speedAdd))) speedAdd = 0;
      else speedAdd = Number(speedAdd);
      talentsStat += speedAdd;
    }
    let total = initialStat + talentsStat + powerStat;
    if (stat === 'speedtal') {
      total = Math.max(0, Math.min(Build.TALENT_COOLDOWN_PCT_MAX, total));
    }
    return total;
  }

  static hero(data) {
    Build.heroStatMods = Build.dataRequest.hero.statModifiers;

    Build.heroPowerModifier = Build.dataRequest.hero.overallModifier;

    Build.heroPowerFromInstalledTalents = 0.0;

    Build.heroMainAttackStat = data.param; // osn_param
    Build.heroAttackModifier = data.koef; // aa_koef

    for (let stat in data.stats) {
      Build.initialStats[stat] = parseFloat(data.stats[stat]);
      Build.calculationStats[stat] = 0.0;
    }
    if (!('speeda' in Build.initialStats)) Build.initialStats['speeda'] = 0;
    if (!('speeda' in Build.calculationStats)) Build.calculationStats['speeda'] = 0;
    // Прямой бонус шанса крита из талантов/сетов.
    if (!('crit' in Build.initialStats)) Build.initialStats['crit'] = 0;
    if (!('crit' in Build.calculationStats)) Build.calculationStats['crit'] = 0;
    Build.initialStats['talentCdPct'] = 0;
    Build.calculationStats['talentCdPct'] = 0;

    let stats = DOM({ style: 'build-hero-stats-view' });

    const template = {
      hp: Lang.text('health'),
      mp: Lang.text('energy'),
      regenhp: Lang.text('statRegenHealth'),
      regenmp: Lang.text('statRegenEnergy'),
      krajahp: Lang.text('statStealHealth'),
      krajamp: Lang.text('statStealEnergy'),
      talentCdPct: Lang.text('statTalentCooldownPct'),
      speed: Lang.text('speed'),
      sila: Lang.text('strength'),
      razum: Lang.text('intelligence'),
      provorstvo: Lang.text('agility'),
      hitrost: Lang.text('dexterity'),
      stoikost: Lang.text('stamina'),
      volia: Lang.text('will'),
      damage: Lang.text('damage'),
      critProb: Lang.text('criticalHit'),
      attackSpeed: Lang.text('attacksPerSecond'),
      punching: Lang.text('penetration'),
      protectionBody: Lang.text('defencePsys'),
      protectionSpirit: Lang.text('defenceMagic'),
    };

    if (!('profile' in Build.dataRequest)) {
      Build.dataRequest.profile = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    let i = 0;

    const cond = (key) =>
      [
        'damage',
        'critProb',
        'attackSpeed',
        'punching',
        'protectionBody',
        'protectionSpirit',
        'considerStacks',
        'considerBuff',
        'groundType',
      ].includes(key);

    for (const key in template) {
      const item = DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'build-hero-stats-item',
          event: [
            'click',
            !cond(key)
              ? () => {
                  if (item.dataset.active == 1) {
                    item.style.background = 'rgba(0,0,0,0)';

                    if (key == 'hp') {
                      Build.removeSortInventory('stats', 'hp');
                      Build.removeSortInventory('stats', 'hpmp');
                    } else if (key == 'mp') {
                      Build.removeSortInventory('stats', 'mp');
                      Build.removeSortInventory('stats', 'hpmp');
                    } else if (key == 'regenhp') {
                      Build.removeSortInventory('stats', 'regenhp');
                      Build.removeSortInventory('stats', 'regenhpvz');
                    } else if (key == 'regenmp') {
                      Build.removeSortInventory('stats', 'regenmp');
                      Build.removeSortInventory('stats', 'regenmpvz');
                    } else if (key == 'krajahp') {
                      Build.removeSortInventory('stats', 'krajahp');
                      Build.removeSortInventory('stats', 'krajahprz');
                      Build.removeSortInventory('stats', 'krajahpvz');
                    } else if (key == 'krajamp') {
                      Build.removeSortInventory('stats', 'krajamp');
                    } else if (key == 'talentCdPct') {
                      Build.removeSortInventory('stats', 'speedtal');
                      Build.removeSortInventory('stats', 'speedtalrz');
                      Build.removeSortInventory('stats', 'speedtalvz');
                    } else if (key == 'speed') {
                      Build.removeSortInventory('stats', 'speed');
                      Build.removeSortInventory('stats', 'speedrz');
                      Build.removeSortInventory('stats', 'speedvz');
                      Build.removeSortInventory('stats', 'speeda');
                      Build.removeSortInventory('stats', 'speedarz');
                      Build.removeSortInventory('stats', 'speedavz');
                      Build.removeSortInventory('stats', 'speedd');
                      Build.removeSortInventory('stats', 'speeddrz');
                      Build.removeSortInventory('stats', 'speeddvz');
                    } else if (key == 'sila') {
                      Build.removeSortInventory('stats', 'sila');
                      Build.removeSortInventory('stats', 'sr');
                      Build.removeSortInventory('stats', 'srsv');
                      Build.removeSortInventory('stats', 'silarz');
                      Build.removeSortInventory('stats', 'silavz');
                    } else if (key == 'razum') {
                      Build.removeSortInventory('stats', 'razum');
                      Build.removeSortInventory('stats', 'sr');
                      Build.removeSortInventory('stats', 'srsv');
                      Build.removeSortInventory('stats', 'razumrz');
                      Build.removeSortInventory('stats', 'razumvz');
                    } else if (key == 'provorstvo') {
                      Build.removeSortInventory('stats', 'provorstvo');
                      Build.removeSortInventory('stats', 'ph');
                      Build.removeSortInventory('stats', 'provorstvorz');
                      Build.removeSortInventory('stats', 'provorstvovz');
                    } else if (key == 'hitrost') {
                      Build.removeSortInventory('stats', 'hitrost');
                      Build.removeSortInventory('stats', 'ph');
                      Build.removeSortInventory('stats', 'hitrostrz');
                      Build.removeSortInventory('stats', 'hitrostvz');
                    } else if (key == 'stoikost') {
                      Build.removeSortInventory('stats', 'stoikost');
                      Build.removeSortInventory('stats', 'sv');
                      Build.removeSortInventory('stats', 'srsv');
                      Build.removeSortInventory('stats', 'stoikostrz');
                      Build.removeSortInventory('stats', 'svvz');
                      Build.removeSortInventory('stats', 'vs');
                    } else if (key == 'volia') {
                      Build.removeSortInventory('stats', 'volia');
                      Build.removeSortInventory('stats', 'sv');
                      Build.removeSortInventory('stats', 'srsv');
                      Build.removeSortInventory('stats', 'voliarz');
                      Build.removeSortInventory('stats', 'svvz');
                      Build.removeSortInventory('stats', 'vs');
                    }
                    Build.sortInventory();
                    item.dataset.active = 0;
                  } else {
                    item.style.background = '#5899';
                    if (key == 'hp') {
                      Build.setSortInventory('stats', 'hp');
                      Build.setSortInventory('stats', 'hpmp');
                    } else if (key == 'mp') {
                      Build.setSortInventory('stats', 'mp');
                      Build.setSortInventory('stats', 'hpmp');
                    } else if (key == 'regenhp') {
                      Build.setSortInventory('stats', 'regenhp');
                      Build.setSortInventory('stats', 'regenhpvz');
                    } else if (key == 'regenmp') {
                      Build.setSortInventory('stats', 'regenmp');
                      Build.setSortInventory('stats', 'regenmpvz');
                    } else if (key == 'krajahp') {
                      Build.setSortInventory('stats', 'krajahp');
                      Build.setSortInventory('stats', 'krajahprz');
                      Build.setSortInventory('stats', 'krajahpvz');
                    } else if (key == 'krajamp') {
                      Build.setSortInventory('stats', 'krajamp');
                    } else if (key == 'talentCdPct') {
                      Build.setSortInventory('stats', 'speedtal');
                      Build.setSortInventory('stats', 'speedtalrz');
                      Build.setSortInventory('stats', 'speedtalvz');
                    } else if (key == 'speed') {
                      Build.setSortInventory('stats', 'speed');
                      Build.setSortInventory('stats', 'speedrz');
                      Build.setSortInventory('stats', 'speedvz');
                      Build.setSortInventory('stats', 'speeda');
                      Build.setSortInventory('stats', 'speedarz');
                      Build.setSortInventory('stats', 'speedavz');
                      Build.setSortInventory('stats', 'speedd');
                      Build.setSortInventory('stats', 'speeddrz');
                      Build.setSortInventory('stats', 'speeddvz');
                    } else if (key == 'sila') {
                      Build.setSortInventory('stats', 'sila');
                      Build.setSortInventory('stats', 'sr');
                      Build.setSortInventory('stats', 'srsv');
                      Build.setSortInventory('stats', 'silarz');
                      Build.setSortInventory('stats', 'silavz');
                    } else if (key == 'razum') {
                      Build.setSortInventory('stats', 'razum');
                      Build.setSortInventory('stats', 'sr');
                      Build.setSortInventory('stats', 'srsv');
                      Build.setSortInventory('stats', 'razumrz');
                      Build.setSortInventory('stats', 'razumvz');
                    } else if (key == 'provorstvo') {
                      Build.setSortInventory('stats', 'provorstvo');
                      Build.setSortInventory('stats', 'ph');
                      Build.setSortInventory('stats', 'provorstvorz');
                      Build.setSortInventory('stats', 'provorstvovz');
                    } else if (key == 'hitrost') {
                      Build.setSortInventory('stats', 'hitrost');
                      Build.setSortInventory('stats', 'ph');
                      Build.setSortInventory('stats', 'hitrostrz');
                      Build.setSortInventory('stats', 'hitrostvz');
                    } else if (key == 'stoikost') {
                      Build.setSortInventory('stats', 'stoikost');
                      Build.setSortInventory('stats', 'sv');
                      Build.setSortInventory('stats', 'srsv');
                      Build.setSortInventory('stats', 'stoikostrz');
                      Build.setSortInventory('stats', 'svvz');
                      Build.setSortInventory('stats', 'vs');
                    } else if (key == 'volia') {
                      Build.setSortInventory('stats', 'volia');
                      Build.setSortInventory('stats', 'sv');
                      Build.setSortInventory('stats', 'srsv');
                      Build.setSortInventory('stats', 'voliarz');
                      Build.setSortInventory('stats', 'svvz');
                      Build.setSortInventory('stats', 'vs');
                    } else if (key == 'hpmp') {
                      Build.setSortInventory('stats', 'hpmp');
                    } else {
                      Build.setSortInventory('stats', key);
                    }
                    // Build.setSortInventory('stats','hp');

                    Build.sortInventory();
                    item.dataset.active = 1;
                  }
                }
              : null,
          ],
        },
        DOM({ tag: 'div' }, template[key]),
        DOM(
          { tag: 'div' },
          key === 'talentCdPct'
            ? 0
            : key === 'regenhp' || key === 'regenmp'
              ? (() => {
                  const v =
                    data.stats[key] !== undefined && data.stats[key] !== null ? parseFloat(data.stats[key]) : 0;
                  return Build.formatRegenStatDisplay(v);
                })()
              : data.stats[key] !== undefined && data.stats[key] !== null
                ? data.stats[key]
                : 0,
        ),
      );

      if (key === 'groundType') {
        let isMouseOverItem = false;
        let isMouseOverWrapper = false;
        item.classList.add('noNumber');
        if (Build.applyRz || Build.applyVz) {
          item.classList.add('highlight');
        }
        let mouseOutEvent = function () {
          if (isMouseOverWrapper || isMouseOverItem) {
            return;
          }
          let wrapper = item.parentNode.querySelector('.wrapper');
          if (wrapper) {
            wrapper.remove();
          }
        };
        item.onclick = (_) => {
          item.classList.toggle('highlight');
          let wrapper = item.parentNode.querySelector('.wrapper');
          if (Build.applyRz || Build.applyVz) {
            // Disable
            Build.applyRz = false;
            Build.applyVz = false;
            if (wrapper) {
              if (wrapper.querySelector('.home.highlight')) {
              }
              wrapper.querySelector('.home').classList.remove('highlight');
              if (wrapper.querySelector('.enemy.highlight')) {
              }
              wrapper.querySelector('.enemy').classList.remove('highlight');
            }
          } else {
            // Enable home
            Build.applyRz = true;
            Build.applyVz = false;
            if (wrapper) {
              wrapper.querySelector('.home').classList.add('highlight');
              if (wrapper.querySelector('.enemy.highlight')) {
                wrapper.querySelector('.enemy.highlight').classList.remove('highlight');
              }
            }
          }
          Build.updateHeroStats();
        };
        item.onmouseover = (_) => {
          isMouseOverItem = true;
          if (item.parentNode.querySelector('.wrapper')) {
            // Node already here
            return;
          }
          const home = DOM({ style: 'home' }, Lang.text('native'));
          const enemy = DOM({ style: 'enemy' }, Lang.text('enemy'));
          if (Build.applyRz) {
            home.classList.add('highlight');
          } else if (Build.applyVz) {
            enemy.classList.add('highlight');
          }
          home.onclick = (_) => {
            // Remove applicator if already selected
            if (home.classList.contains('highlight')) {
              home.classList.remove('highlight');
              item.classList.remove('highlight');
              Build.applyRz = false;
            } else {
              if (!item.classList.contains('.build-hero-stats-item.highlight')) {
                item.classList.add('highlight');
              }
              home.classList.add('highlight');
              enemy.classList.remove('highlight');
              Build.applyRz = true;
              Build.applyVz = false;
            }
            Build.updateHeroStats();
          };
          enemy.onclick = (_) => {
            // Remove applicator if already selected
            if (enemy.classList.contains('highlight')) {
              enemy.classList.remove('highlight');
              item.classList.remove('highlight');
              Build.applyVz = false;
            } else {
              if (!item.classList.contains('.build-hero-stats-item.highlight')) {
                item.classList.add('highlight');
              }
              enemy.classList.add('highlight');
              home.classList.remove('highlight');
              Build.applyVz = true;
              Build.applyRz = false;
            }
            Build.updateHeroStats();
          };
          const wrapper = DOM({ style: 'wrapper' }, home, enemy);
          wrapper.onmouseover = (_) => {
            isMouseOverWrapper = true;
          };
          wrapper.onmouseout = (_) => {
            isMouseOverWrapper = false;
            setTimeout((_) => {
              mouseOutEvent();
            }, 100);
          };
          item.parentNode.append(wrapper);
        };
        item.onmouseout = (_) => {
          isMouseOverItem = false;
          setTimeout((_) => {
            mouseOutEvent();
          }, 100);
        };
      }

      if (key === 'considerStacks') {
        item.title = Lang.text('gradualTalentsTitle');
      }
      if (key === 'considerBuff') {
        item.title = Lang.text('aoeTalentsTitle');
      }
      if (key === 'groundType') {
        item.title = Lang.text('territoryTalentsTitle');
      }

      if (key === 'considerStacks' || key === 'considerBuff') {
        item.classList.add('noNumber');
        if (Build.applyStak && key === 'considerStacks') {
          item.classList.add('highlight');
        }
        if (Build.applyBuffs && key === 'considerBuff') {
          item.classList.add('highlight');
        }
        item.onclick = (_) => {
          item.classList.toggle('highlight');
          if (key == 'considerStacks') {
            Build.applyStak = !Build.applyStak;
          } else if (key == 'considerBuff') {
            Build.applyBuffs = !Build.applyBuffs;
          }
          Build.updateHeroStats();
        };
      }

      item.dataset.active = 0;
      if (cond(key)) {
        item.classList.add('passive');
      }

      Build.dataStats[key] = item;

      if (
        ![
          'hp',
          'mp',
          'regenhp',
          'regenmp',
          'krajahp',
          'krajamp',
          'talentCdPct',
          'speed',
          'damage',
          'critProb',
          'attackSpeed',
          'punching',
          'protectionBody',
          'protectionSpirit',
          'considerStacks',
          'considerBuff',
          'groundType',
        ].includes(key)
      ) {
        const daw = DOM({
          tag: 'img',
          domaudio: domAudioPresets.smallButton,
          style: 'build-hero-stats-daw',
          title: Lang.text('makeStatPriorityTitle'),
          event: [
            'click',
            async () => {
              if (daw.dataset.status != 0) {
                await App.api.request('build', 'setProfile', {
                  id: Build.id,
                  index: daw.dataset.index,
                  value: false,
                });

                daw.dataset.status = 0;
                daw.src = 'content/icons/circle.webp';

                Build.profileStats[key] = 0;

                Build.updateHeroStats();
                try {
                  if (Build._statFilterHoverRowKey) {
                    Build.applyStatFilterHoverHighlightOnBuild(Build._statFilterHoverRowKey);
                  } else {
                    Build.refreshStatFilterHighlightCountDisplay();
                  }
                  if (Build._hoveredSetTalentIds) {
                    Build.previewSetTalentsInEmptySlots({ _manualOrder: Build._hoveredSetTalentIds });
                  }
                } catch {}
              } else {
                await App.api.request('build', 'setProfile', {
                  id: Build.id,
                  index: daw.dataset.index,
                  value: true,
                });

                daw.dataset.status = 1;
                daw.src = 'content/icons/checkbox.webp';

                Build.profileStats[key] = 1;

                Build.updateHeroStats();
                try {
                  if (Build._statFilterHoverRowKey) {
                    Build.applyStatFilterHoverHighlightOnBuild(Build._statFilterHoverRowKey);
                  } else {
                    Build.refreshStatFilterHighlightCountDisplay();
                  }
                  if (Build._hoveredSetTalentIds) {
                    Build.previewSetTalentsInEmptySlots({ _manualOrder: Build._hoveredSetTalentIds });
                  }
                } catch {}
              }
            },
          ],
        });

        const profileIdx =
          key in Build.heroStatProfileIndex ? Build.heroStatProfileIndex[key] : i;
        daw.dataset.index = profileIdx;

        const prof = Build.dataRequest.profile;
        daw.dataset.status =
          prof && profileIdx in prof && prof[profileIdx] !== undefined && prof[profileIdx] !== null
            ? prof[profileIdx]
            : 0;

        Build.profileStats[key] = parseInt(daw.dataset.status, 10) || 0;

        if (daw.dataset.status == 1) {
          daw.src = 'content/icons/checkbox.webp';
        } else {
          daw.src = 'content/icons/circle.webp';
        }

        const statsLineWithDaw = DOM({ style: 'build-hero-stats-line' }, daw, item);
        if (!cond(key)) {
          statsLineWithDaw.addEventListener('mouseenter', () => Build.applyStatFilterHoverHighlightOnBuild(key));
          statsLineWithDaw.addEventListener('mouseleave', () => Build.clearStatFilterHoverHighlightOnBuild());
        }
        stats.append(statsLineWithDaw);
      } else {
        const statsLinePlain = DOM({ style: 'build-hero-stats-line' }, item);
        if (!cond(key)) {
          statsLinePlain.addEventListener('mouseenter', () => Build.applyStatFilterHoverHighlightOnBuild(key));
          statsLinePlain.addEventListener('mouseleave', () => Build.clearStatFilterHoverHighlightOnBuild());
        }
        stats.append(statsLinePlain);
      }
      i++;
    }

    let landTypeSetting = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: ['build-hero-stats-setting-land-type', 'button-outline', 'build-hero-stats-setting-land-type-rz'],
      title: Lang.text('titleLandTipeRZ'),
      event: [
        'click',
        async () => {
          Build.applyRz = !Build.applyRz;
          Build.applyVz = !Build.applyVz;
          Build.updateHeroStats();
          if (Build.applyRz) {
            landTypeSetting.classList.replace('build-hero-stats-setting-land-type-vz', 'build-hero-stats-setting-land-type-rz');
            landTypeSetting.title = Lang.text('titleLandTipeRZ');
          } else {
            landTypeSetting.classList.replace('build-hero-stats-setting-land-type-rz', 'build-hero-stats-setting-land-type-vz');
            landTypeSetting.title = Lang.text('titleLandTipeVZ');
          }
        },
      ],
    });

    stats.append(DOM({ style: 'build-hero-stats-settings' }, landTypeSetting));

    const statFilterHighlightCountValue = DOM({
      tag: 'span',
      style: 'build-hero-stats-highlight-count-value',
    });
    statFilterHighlightCountValue.textContent = '0';
    const statFilterHighlightCountBadge = DOM(
      { style: 'build-hero-stats-highlight-count-badge' },
      statFilterHighlightCountValue,
    );
    const statFilterHighlightCountEl = DOM({ style: 'build-hero-stats-highlight-count' }, statFilterHighlightCountBadge);
    const statFilterHighlightCountTitle = Lang.text('buildStatsHighlightedTalentsCountTitle');
    statFilterHighlightCountEl.dataset.tooltip = statFilterHighlightCountTitle;
    stats.append(statFilterHighlightCountEl);
    Build.statFilterHighlightCountValueEl = statFilterHighlightCountValue;
    Build.statFilterHighlightCountWrapEl = statFilterHighlightCountEl;
    Build.refreshStatFilterHighlightCountDisplay();

    Build.heroName = DOM({ tag: 'div', style: 'name' });

    if (MM.hero) {
      const hero = MM.hero.find((h) => h.id === data.id);
      Build.heroName.innerText = Lang.heroName(hero.id, hero.skin || 1);
    }

    Build.heroImg = DOM({ style: 'avatar' });

    if (App.isAdmin()) {
      Build.heroImg.oncontextmenu = async () => {
        let body = document.createDocumentFragment(),
          request = await App.api.request('build', 'heroData', { id: data.id });

        for (let key in request) {
          body.append(
            App.input(
              (value) => {
                let object = new Object();

                object[key] = value;

                App.api.request('build', 'heroEdit', {
                  id: data.id,
                  object: object,
                });
              },
              { value: request[key] },
            ),
          );
        }

        body.append(
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'splash-content-button',
              event: ['click', () => Splash.hide()],
            },
            Lang.text('titleClose'),
          ),
        );

        Splash.show(body);
      };
    }

    Build.heroImg.onclick = () => {
      Window.show('main', 'top', data.id, 0);
	  closeTip();
    };

    Build.applyBuildHeroAvatarSkin(data.id, Build.dataRequest.hero.skin.target ? Build.dataRequest.hero.skin.target : 1);

    let rankIcon = DOM({ style: 'rank-icon' });
    rankIcon.style.backgroundImage = `url("content/ranks/${Rank.icon(data.rating)}.webp"), url("content/ranks/rateIconBack.png")`;
    rankIcon.style.backgroundSize = '70%, 100%';
    rankIcon.style.backgroundPosition = 'center, center';
    rankIcon.style.backgroundRepeat = 'no-repeat, no-repeat';

    let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, data.rating), rankIcon);
    Build.heroImg.append(rank);

    try {
      Build._avatarTipEl?.parentNode?.removeChild?.(Build._avatarTipEl);
    } catch {}
    Build._avatarTipEl = null;
    try {
      document.querySelectorAll('.build-avatar-tip').forEach((el) => el.remove());
    } catch {}

    const avatarTip = DOM({ style: 'build-avatar-tip' }, DOM({ style: 'tip-title' }, Lang.text('tipTitle')), DOM({ style: 'tip-body' }, Lang.text('tipBody')));
    Build._avatarTipEl = avatarTip;
    document.body.append(avatarTip);

    
    function placeAvatarTip() {
      const r = Build.heroImg.getBoundingClientRect();
      const gap = 12;

      let left = r.right + gap;
      let top = r.top + r.height / 2;

      const tipRect = avatarTip.getBoundingClientRect();

      top = top - tipRect.height / 2;

      const pad = 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (left + tipRect.width > vw - pad) {
        left = r.left - gap - tipRect.width;
      }

      left = Math.max(pad, Math.min(left, vw - tipRect.width - pad));

      top = Math.max(pad, Math.min(top, vh - tipRect.height - pad));

      avatarTip.style.left = `${Math.round(left)}px`;
      avatarTip.style.top = `${Math.round(top)}px`;
    }

    let tipOpen = false;

    function openTip() {
      if (tipOpen) return;
      tipOpen = true;

      avatarTip.classList.add('is-open');
      requestAnimationFrame(() => {
        placeAvatarTip();
      });
    }

    function closeTip() {
      if (!tipOpen) return;
      tipOpen = false;
      avatarTip.classList.remove('is-open');
    }

    Build.heroImg.addEventListener('mouseenter', openTip);
    Build.heroImg.addEventListener('mouseleave', closeTip);

    function onViewportChange() {
      if (!tipOpen) return;
      placeAvatarTip();
    }
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    const oldCleanup = Build.cleanup;
    Build.cleanup = function () {
      try {
        window.removeEventListener('scroll', onViewportChange, true);
        window.removeEventListener('resize', onViewportChange);
        if (avatarTip && avatarTip.parentNode) avatarTip.remove();
        if (Build._avatarTipEl === avatarTip) Build._avatarTipEl = null;
      } catch (e) {}
      if (typeof oldCleanup === 'function') oldCleanup.call(Build);
    };

    const avatarWrap = DOM({ style: 'build-avatar-wrap' }, Build.heroImg);

    const navPrev = DOM({
      style: ['build-hero-nav-btn', 'build-hero-nav-btn-left'],
      domaudio: domAudioPresets.defaultButton,
      event: [
        'click',
        async () => {
          await Build.switchHeroFromCastleBottomList(-1);
        },
      ],
    });
    navPrev.style.backgroundImage = 'url("content/img/goLeft.png")';

    const navNext = DOM({
      style: ['build-hero-nav-btn', 'build-hero-nav-btn-right'],
      domaudio: domAudioPresets.defaultButton,
      event: [
        'click',
        async () => {
          await Build.switchHeroFromCastleBottomList(1);
        },
      ],
    });
    navNext.style.backgroundImage = 'url("content/img/goRight.png")';

    const avatarActions = DOM({ style: 'build-hero-avatar-actions' }, Build.skinView, Build.training);
    const wrapper = DOM({ style: 'build-hero-avatar-and-name' }, avatarWrap, avatarActions);
    const heroNav = DOM({ style: 'build-hero-nav-controls' }, navPrev, navNext);

    Build.heroView.append(wrapper, stats, heroNav);
  }

  static getHeroIdsFromCastleBottomList() {
    const ids = [];
    const seen = new Set();
    try {
      const nodes = View.castleBottom?.querySelectorAll?.('.castle-hero-item');
      for (const node of nodes || []) {
        let heroId = Number(node?.dataset?.heroId);
        if (!Number.isFinite(heroId) || heroId <= 0) {
          const m = String(node?.id || '').match(/^id(\d+)$/);
          heroId = m ? Number(m[1]) : NaN;
        }
        if (!Number.isFinite(heroId) || heroId <= 0 || seen.has(heroId)) continue;
        seen.add(heroId);
        ids.push(heroId);
      }
    } catch {}
    return ids;
  }

  static async switchHeroFromCastleBottomList(direction = 1) {
    const ids = Build.getHeroIdsFromCastleBottomList();
    if (!ids.length) return;
    const dir = Number(direction) < 0 ? -1 : 1;
    const currentHeroId = Number(Build.heroId);
    let index = ids.indexOf(currentHeroId);
    if (index < 0) index = 0;
    const nextHeroId = ids[(index + dir + ids.length) % ids.length];
    if (!Number.isFinite(nextHeroId) || nextHeroId <= 0 || nextHeroId === currentHeroId) return;

    try {
      View.setCastleOpenedBuildHero?.(nextHeroId);
      View.scrollCastleBottomToHero?.(nextHeroId);
    } catch {}

    const isWindowBuild = Window.windows?.main?.id === 'wbuild';
    if (isWindowBuild) {
      await Window.show('main', 'build', nextHeroId, 0, true);
      try {
        View.scrollCastleBottomToHero?.(nextHeroId);
      } catch {}
      return;
    }
    await View.show('build', nextHeroId);
  }

  /** Одна десятичная, без «.0» у целых (реген HP/MP). */
  static formatRegenStatDisplay(value) {
    const r = Math.round(Number(value) * 10) / 10;
    const s = r.toFixed(1);
    return s.endsWith('.0') ? String(Math.round(r)) : s;
  }

  /** Пересчёт вкладов талантов в calculationStats / силу героя (без обновления подписей в UI). */
  static recomputeTalentCalculationTotals() {
    const effectiveInstalledTalents = Build.getEffectiveInstalledTalents() || [];
    Build.heroPower = 0.0;
    for (let key in Build.calculationStats) {
      Build.calculationStats[key] = 0.0;
    }

    for (let i = 35; i >= 0; i--) {
      let talent = effectiveInstalledTalents[i];
      if (talent) {
        if (!Build.combatModeEnabled) {
          Build.calcStatsFromPower(i, effectiveInstalledTalents);
        }
        Build.setStat(talent, true, false);
      }
    }

    // Итоговая мощь: последний calcStatsFromPower(i) шёл до setStat слота i — в heroPower не хватало этого таланта.
    // Пересчитываем один раз при полном Build.heroPower, как в боевом режиме при полной сумме мощи.
    if (!Build.combatModeEnabled) {
      Build.calcStatsFromPower(0, effectiveInstalledTalents);
    }

    Build.applySetAddStatsForInstalledTalents(effectiveInstalledTalents);
    if (Build.combatModeEnabled) {
      Build.applyCombatModeHeroStatsFromPower();
    }
  }

  /** Мощь таланта по редкости/заточке (как в setStat). */
  static getTalentRarityPowerContribution(talent) {
    if (!talent) return 0;
    const talentPowerByRarity = {
      4: Build.talentPowerByRarityFirstLevel[4] + Build.talentPowerByRarityPerLevel[4] * (Build.talentRefineByRarity[4] - 1),
      3: Build.talentPowerByRarityFirstLevel[3] + Build.talentPowerByRarityPerLevel[3] * (Build.talentRefineByRarity[3] - 1),
      2: Build.talentPowerByRarityFirstLevel[2] + Build.talentPowerByRarityPerLevel[2] * (Build.talentRefineByRarity[2] - 1),
      1: Build.talentPowerByRarityFirstLevel[1] + Build.talentPowerByRarityPerLevel[1] * (Build.talentRefineByRarity[1] - 1),
      0: Build.talentPowerByRarityFirstLevel[0] + Build.talentPowerByRarityPerLevel[0] * (Build.talentRefineByRarity[4] - 1),
    };
    return 'rarity' in talent ? talentPowerByRarity[talent.rarity] : talentPowerByRarity[0];
  }

  /**
   * Боевой режим: вклад мощи в статы героя.
   * Сначала по полному билду считаются heroPowerFull и сумма весов строк (позиция на сетке),
   * от m = heroPowerFull * sumWeightFull получаем «чистый» стат от мощи (как раньше по формуле),
   * затем к базе идут только доли: statPowerFull * вес_строки_таланта для каждого изученного таланта (уровень строки = talent.level).
   */
  static applyCombatModeHeroStatsFromPower() {
    const w = Build.TALENT_POWER_LINE_WEIGHTS;
    const full = Build.installedTalents || [];
    let heroPowerFull = 0;
    let sumWeightFull = 0;
    for (let i = 35; i >= 0; i--) {
      const t = full[i];
      if (!t) continue;
      heroPowerFull += Build.getTalentRarityPowerContribution(t);
      const gridLine = Math.floor((35 - i) / 6);
      const wl = w[gridLine];
      if (Number.isFinite(wl)) sumWeightFull += wl;
    }
    const mFull = heroPowerFull * sumWeightFull;
    const q = Build.heroPowerModifier;
    let sumLearnedLineWeights = 0;
    for (const slot of Build.combatModeLearnedSlots) {
      const t = full[slot];
      if (!t) continue;
      const rowIdx = Math.max(0, Math.min(5, (Number(t.level) || 1) - 1));
      const wl = w[rowIdx];
      if (Number.isFinite(wl)) sumLearnedLineWeights += wl;
    }
    for (let stat in Build.heroStatsFromPower) {
      let Lvl = Number(Build.heroStatMods[stat]);
      if (!Number.isFinite(Lvl)) Lvl = 0;
      const statPowerFull = Lvl * (0.6 * q * (mFull / 10.0 - 16.0) + 36.0);
      Build.heroStatsFromPower[stat] = statPowerFull * sumLearnedLineWeights;
    }
  }

  static normalizeSetAddStatsRules(addStats) {
    const normalized = [];
    const pushRule = (needRaw, stats) => {
      const need = Number(needRaw);
      if (!Number.isFinite(need) || need <= 0 || !stats || typeof stats !== 'object' || Array.isArray(stats)) return;
      normalized.push({ need, stats });
    };

    if (Array.isArray(addStats)) {
      for (const entry of addStats) {
        if (Array.isArray(entry) && entry.length >= 2) {
          pushRule(entry[0], entry[1]);
          continue;
        }
        if (!entry || typeof entry !== 'object') continue;
        if ('need' in entry && 'stats' in entry) {
          pushRule(entry.need, entry.stats);
          continue;
        }
        for (const [k, v] of Object.entries(entry)) {
          pushRule(k, v);
        }
      }
    } else if (addStats && typeof addStats === 'object') {
      for (const [k, v] of Object.entries(addStats)) {
        pushRule(k, v);
      }
    }

    normalized.sort((a, b) => a.need - b.need);
    return normalized;
  }

  static resolveCompositeStatAlias(statKey) {
    if (statKey === 'critProb') return 'crit';
    if (statKey === 'sr') return Build.getMaxStat(['sila', 'razum']);
    if (statKey === 'ph') return Build.getMaxStat(['provorstvo', 'hitrost']);
    if (statKey === 'sv') return Build.getMaxStat(['stoikost', 'volia']);
    if (statKey === 'srsv') return Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']);
    if (statKey === 'hpmp') return Build.getMaxStat(['hp', 'mp']);
    if (statKey === 'srMin') return Build.getMinStat(['sila', 'razum']);
    if (statKey === 'phMin') return Build.getMinStat(['provorstvo', 'hitrost']);
    if (statKey === 'svMin') return Build.getMinStat(['volia', 'stoikost']);
    if (statKey === 'srsvMin') return Build.getMinStat(['sila', 'razum', 'stoikost', 'volia']);
    if (statKey === 'hpmpMin') return Build.getMinStat(['hp', 'mp']);
    return statKey;
  }

  static applyCalculatedStatDelta(calcKey, statChange) {
    if (!(calcKey in Build.calculationStats)) return;
    if (calcKey === 'speed') {
      Build.calculationStats[calcKey] = Math.max(Build.calculationStats[calcKey], statChange);
      return;
    }
    Build.calculationStats[calcKey] += statChange;
  }

  static resolveConditionalStatKey(rawKey) {
    if (Build.applyStak && rawKey.indexOf('stak') !== -1) return rawKey.replace('stak', '');
    if (Build.applyRz && rawKey.indexOf('rz') !== -1) return rawKey.replace('rz', '');
    if (Build.applyVz && rawKey.indexOf('vz') !== -1) return rawKey.replace('vz', '');
    if (rawKey.indexOf('dop') !== -1) return rawKey.replace('dop', '');
    if (Build.applyBuffs && rawKey.indexOf('buff') !== -1) return rawKey.replace('buff', '');
    return rawKey;
  }

  static applySetStatMap(statsMap) {
    if (!statsMap || typeof statsMap !== 'object') return;
    const resolved = new Object();
    for (const [rawKey, rawValue] of Object.entries(statsMap)) {
      const val = Number(rawValue);
      if (!Number.isFinite(val)) continue;
      const targetKey = Build.resolveCompositeStatAlias(rawKey);
      if (!targetKey) continue;
      resolved[targetKey] = (resolved[targetKey] || 0) + val;
    }

    for (const [key2, statChange] of Object.entries(resolved)) {
      Build.applyCalculatedStatDelta(Build.resolveConditionalStatKey(key2), statChange);
    }
  }

  static findInstalledTalentById(installedTalents, talentId) {
    const wanted = Math.abs(Number(talentId));
    if (!Number.isFinite(wanted) || wanted <= 0) return null;
    for (const talent of installedTalents || []) {
      const tid = Math.abs(Number(talent?.id));
      if (Number.isFinite(tid) && tid === wanted) return talent;
    }
    return null;
  }

  static getResolvedTalentStatValue(talent, targetKey) {
    if (!talent || !talent.stats || typeof talent.stats !== 'object') return 0;
    let maxValue = -Infinity;
    let sumValue = 0;
    let hasAny = false;

    for (const key in talent.stats) {
      let statValue = parseFloat(talent.stats[key]);
      if (!Number.isFinite(statValue)) continue;
      if ('statsRefine' in talent && 'rarity' in talent) {
        let refineBonus = Build.getTalentRefineByRarity(talent.rarity);
        let refineMul = parseFloat(talent.statsRefine[key]);
        if (Number.isFinite(refineMul)) statValue += refineBonus * refineMul;
      }

      const resolvedKey = Build.resolveConditionalStatKey(key);
      if (resolvedKey !== targetKey) continue;
      hasAny = true;
      if (targetKey === 'speed') {
        if (statValue > maxValue) maxValue = statValue;
      } else {
        sumValue += statValue;
      }
    }

    if (!hasAny) return 0;
    if (targetKey === 'speed') return Number.isFinite(maxValue) ? maxValue : 0;
    return Number.isFinite(sumValue) ? sumValue : 0;
  }

  static applySetAddStatsForInstalledTalents(installedTalents) {
    const installedIds = new Set();
    for (const talent of installedTalents || []) {
      const tid = Number(talent?.id);
      if (Number.isFinite(tid) && tid !== 0) installedIds.add(tid);
    }
    if (!installedIds.size) return;

    const mainTalentSpeedBonusById = new Map();
    const sets = TalentSets.list();
    for (const set of sets) {
      const setIds = TalentSets.getTalentIds(set)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id !== 0);
      if (!setIds.length) continue;

      let count = 0;
      for (const id of setIds) {
        if (installedIds.has(id)) count++;
      }
      if (count <= 0) continue;

      const requiredMain = Number(set?.mainNeed);
      if (Number.isFinite(requiredMain) && requiredMain !== 0 && !installedIds.has(requiredMain)) {
        continue;
      }

      const rules = Build.normalizeSetAddStatsRules(set?.addStats);
      for (const rule of rules) {
        if (count >= rule.need) {
          const map = rule.stats && typeof rule.stats === 'object' ? { ...rule.stats } : null;
          if (!map) continue;

          for (const rawKey of Object.keys(map)) {
            const resolvedKey = Build.resolveConditionalStatKey(rawKey);
            if (resolvedKey !== 'speedd') continue;
            const speedDeltaResolved = Number(map[rawKey]);
            if (!Number.isFinite(speedDeltaResolved) || speedDeltaResolved === 0) {
              delete map[rawKey];
              continue;
            }
            let mainId = Number(set?.mainNeed);
            if (!Number.isFinite(mainId) || mainId <= 0) {
              mainId = Number(TalentSets.chooseMainTalentId(set));
            }
            if (Number.isFinite(mainId) && mainId !== 0 && installedIds.has(mainId)) {
              const prev = Number(mainTalentSpeedBonusById.get(mainId)) || 0;
              mainTalentSpeedBonusById.set(mainId, prev + speedDeltaResolved);
            }
            delete map[rawKey];
          }

          Build.applySetStatMap(map);
        }
      }
    }

    for (const [mainId, bonus] of mainTalentSpeedBonusById.entries()) {
      const mainTalent = Build.findInstalledTalentById(installedTalents, mainId);
      if (!mainTalent) continue;
      const baseMainSpeed = Build.getResolvedTalentStatValue(mainTalent, 'speed');
      Build.applyCalculatedStatDelta('speed', baseMainSpeed + bonus);
    }
  }

  static updateHeroStats() {
    Build.recomputeTalentCalculationTotals();

    for (let key2 in Build.dataStats) {
      if (key2 === 'talentCdPct') continue;
      let total = Build.totalStat(key2);
      if (key2 === 'regenhp' || key2 === 'regenmp') {
        if (key2 === 'regenhp') {
          total += Build.totalStat('hp') * Build.REGEN_HP_FROM_MAX_HP_PCT;
        } else {
          total += Build.totalStat('mp') * Build.REGEN_MP_FROM_MAX_MP_PCT;
        }
        Build.dataStats[key2].lastChild.innerText = Build.formatRegenStatDisplay(total);
      } else {
        Build.dataStats[key2].lastChild.innerText = Math.round(total);
      }
    }
    if (Build.dataStats['talentCdPct']) {
      const cdPct = Math.max(0, Math.round(Build.totalStat('speedtal')));
      Build.dataStats['talentCdPct'].lastChild.innerText = cdPct === 0 ? '0%' : `-${cdPct}%`;
    }

    const statAg = Build.totalStat('provorstvo');
    const statCun = Build.totalStat('hitrost');
    const statStamina = Build.totalStat('stoikost');
    const statWill = Build.totalStat('volia');
    const statStrength = Build.totalStat('sila');
    const statInt = Build.totalStat('razum');

    {
      // TODO: make hero damage calculation
      let damage = Build.heroMainAttackStat == 1 ? statStrength : statInt;
      let dmgMin = Math.round(damage * Build.heroAttackModifier * 0.9);
      let dmgMax = Math.round(damage * Build.heroAttackModifier * 1.1);
      let dmgTag = Build.heroMainAttackStat == 1 ? '<fiz> </fiz>' : '<mag> </mag>';
      Build.dataStats['damage'].lastChild.innerHTML = dmgMin + '-' + dmgMax + dmgTag;
    }

    {
      let penetration = 0.0;
      if (statAg > 500.0) {
        penetration += 61.72 + 0.6876 * statAg - 10.035 * Math.sqrt(statAg);
      } else {
        penetration += 48.45 + 0.764 * statAg - 11.15 * Math.sqrt(statAg);
      }
      if (statCun > 500.0) {
        penetration += 85.78 + 0.43 * statCun - 15.55 * Math.log(statCun);
      } else {
        penetration += 59.83 + 0.57 * statCun - 20.73 * Math.log(statCun);
      }
      Build.dataStats['punching'].lastChild.innerText = Math.round(penetration) + '%';
    }

    {
      let defStamina = 0.5355 * (statStamina + 0.3 * statWill) - 20;
      let defWill = 0.5355 * (statWill + 0.3 * statStamina) - 20;

      Build.dataStats['protectionBody'].lastChild.innerText = Math.round(defStamina) + '%';
      Build.dataStats['protectionSpirit'].lastChild.innerText = Math.round(defWill) + '%';
    }

    {
      let crit = 62.765 - 11534.0 / (126.04 + statCun);
      crit += Build.getTalentDirectCalculationValue('crit');
      Build.dataStats['critProb'].lastChild.innerText = Math.max(0.0, Math.round(crit)) + '%';
    }

    {
      let attackSpeed = Math.min(2.0, 0.00364 * statAg + 0.49);
      Build.dataStats['attackSpeed'].lastChild.innerText = Math.round(attackSpeed * 100.0) / 100.0;
    }
  }

  static calcStatsFromPower(maxTalentId, installedTalents = Build.installedTalents) {
    const talentPowerByLine = Build.TALENT_POWER_LINE_WEIGHTS;

    Build.heroPowerFromInstalledTalents = 0.0;

    for (let i = 35; i >= 0 && i >= maxTalentId; i--) {
      let talent = installedTalents[i];
      if (talent) {
        let line = Math.floor((35 - i) / 6);
        Build.heroPowerFromInstalledTalents += talentPowerByLine[line];
      }
    }

    for (let stat in Build.heroStatsFromPower) {
      let Lvl = Number(Build.heroStatMods[stat]);
      if (!Number.isFinite(Lvl)) Lvl = 0;
      let q = Build.heroPowerModifier;
      let m = Build.heroPower * Build.heroPowerFromInstalledTalents;
      Build.heroStatsFromPower[stat] = Lvl * (0.6 * q * (m / 10.0 - 16.0) + 36.0);
    }
  }

  static getMaxStat(stats) {
    const fakeStat = 999;
    let maxStat = stats[0];
    let maxValue = Build.totalStat(maxStat);
    if (maxStat in Build.profileStats) {
      maxValue += Build.profileStats[maxStat] * fakeStat;
    }

    for (let s = 1; s < stats.length; s++) {
      let possibleMaxStat = Build.totalStat(stats[s]);
      if (stats[s] in Build.profileStats) {
        possibleMaxStat += Build.profileStats[stats[s]] * fakeStat;
      }
      if (possibleMaxStat > maxValue) {
        maxStat = stats[s];
        maxValue = Build.totalStat(maxStat);
        if (maxStat in Build.profileStats) {
          maxValue += Build.profileStats[maxStat] * fakeStat;
        }
      }
    }

    return maxStat;
  }

  static getMinStat(stats) {
    const fakeStat = 999;
    let minStat = stats[0];
    let minValue = Build.totalStat(minStat);
    if (minStat in Build.profileStats) {
      minValue += Build.profileStats[minStat] * fakeStat;
    }

    for (let s = 1; s < stats.length; s++) {
      let possibleMinStat = Build.totalStat(stats[s]);
      if (stats[s] in Build.profileStats) {
        possibleMinStat += Build.profileStats[stats[s]] * fakeStat;
      }
      if (possibleMinStat < minValue) {
        minStat = stats[s];
        minValue = Build.totalStat(minStat);
        if (minStat in Build.profileStats) {
          minValue += Build.profileStats[minStat] * fakeStat;
        }
      }
    }

    return minStat;
  }

  static getSumStat(stats) {
    let sumStat = stats[0];
    return sumStat;
  }

  static getTalentRefineByRarity(rarity) {
    return rarity ? Build.talentRefineByRarity[rarity] - 1.0 : 4.0;
  }

  static setStat(talent, fold = true, animation = true) {
    // Calculate overall power bonus
    const talentPowerByRarity = {
      4: Build.talentPowerByRarityFirstLevel[4] + Build.talentPowerByRarityPerLevel[4] * (Build.talentRefineByRarity[4] - 1),
      3: Build.talentPowerByRarityFirstLevel[3] + Build.talentPowerByRarityPerLevel[3] * (Build.talentRefineByRarity[3] - 1),
      2: Build.talentPowerByRarityFirstLevel[2] + Build.talentPowerByRarityPerLevel[2] * (Build.talentRefineByRarity[2] - 1),
      1: Build.talentPowerByRarityFirstLevel[1] + Build.talentPowerByRarityPerLevel[1] * (Build.talentRefineByRarity[1] - 1),
      0: Build.talentPowerByRarityFirstLevel[0] + Build.talentPowerByRarityPerLevel[0] * (Build.talentRefineByRarity[4] - 1),
    };

    let talentPower = 'rarity' in talent ? talentPowerByRarity[talent.rarity] : talentPowerByRarity[0];
    Build.heroPower += fold ? talentPower : -talentPower;

    let add = new Object();

    function registerStat(stat, key) {
      let statValue = parseFloat(talent.stats[key]);
      if ('statsRefine' in talent && 'rarity' in talent) {
        let refineBonus = Build.getTalentRefineByRarity(talent.rarity);
        let refineMul = parseFloat(talent.statsRefine[key]);
        statValue += refineBonus * refineMul;
      }
      add[stat] = statValue;
    }

    for (let key in talent.stats) {
      if (key == 'sr') {
        registerStat(Build.getMaxStat(['sila', 'razum']), key);
      } else if (key == 'ph') {
        registerStat(Build.getMaxStat(['provorstvo', 'hitrost']), key);
      } else if (key == 'sv') {
        registerStat(Build.getMaxStat(['stoikost', 'volia']), key);
      } else if (key == 'srsv') {
        registerStat(Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']), key);
      } else if (key == 'hpmp') {
        registerStat(Build.getMaxStat(['hp', 'mp']), key);
      } else if (key == 'srMin') {
        registerStat(Build.getMinStat(['sila', 'razum']), key);
      } else if (key == 'phMin') {
        registerStat(Build.getMinStat(['provorstvo', 'hitrost']), key);
      } else if (key == 'svMin') {
        registerStat(Build.getMinStat(['volia', 'stoikost']), key);
      } else if (key == 'srsvMin') {
        registerStat(Build.getMinStat(['sila', 'razum', 'stoikost', 'volia']), key);
      } else if (key == 'hpmpMin') {
        registerStat(Build.getMinStat(['hp', 'mp']), key);
      } else {
        registerStat(key, key);
      }
    }

    function calcualteSpecialStats(keyStat, statChange) {
      if (keyStat in Build.calculationStats) {
        if (keyStat == 'speed') {
          Build.calculationStats[keyStat] = Math.max(Build.calculationStats[keyStat], statChange);
        } else {
          Build.calculationStats[keyStat] += fold ? statChange : -statChange;
        }
      }
    }

    let hasSpeedCandidate = false;
    let speedBaseCandidate = -Infinity;
    let speedDeltaCandidate = 0;
    let speedNeedsAnimation = false;

    // Apply animation and change stats in Build.calculationStats
    for (let key2 in add) {
      let statChange = parseFloat(add[key2]);
      const resolvedKey = Build.resolveConditionalStatKey(key2);
      if (resolvedKey === 'speed') {
        hasSpeedCandidate = true;
        if (Number.isFinite(statChange)) speedBaseCandidate = Math.max(speedBaseCandidate, statChange);
        speedNeedsAnimation = true;
      } else if (resolvedKey === 'speedd') {
        hasSpeedCandidate = true;
        if (Number.isFinite(statChange)) speedDeltaCandidate += statChange;
        speedNeedsAnimation = true;
      } else {
        calcualteSpecialStats(resolvedKey, statChange);
      }

      if (!(key2 in Build.dataStats)) {
        continue;
      }

      if (animation) {
        Build.dataStats[key2].animate(
          { transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] },
          { duration: 250, fill: 'both', easing: 'ease-out' },
        );

        Build.heroImg.animate({ transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] }, { duration: 250, fill: 'both', easing: 'ease-out' });
      }
    }

    if (hasSpeedCandidate) {
      const base = Number.isFinite(speedBaseCandidate) ? speedBaseCandidate : 0;
      const addSpeed = Number.isFinite(speedDeltaCandidate) ? speedDeltaCandidate : 0;
      calcualteSpecialStats('speed', base + addSpeed);

      if (animation && speedNeedsAnimation && Build.dataStats['speed']) {
        Build.dataStats['speed'].animate(
          { transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] },
          { duration: 250, fill: 'both', easing: 'ease-out' },
        );
        Build.heroImg.animate({ transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] }, { duration: 250, fill: 'both', easing: 'ease-out' });
      }
    }
  }

  static isMainHeroClassTalent(talent) {
    const mainTalentId = Math.abs(Number(getMainHeroTalentId(Build.heroId)));
    if (!Number.isFinite(mainTalentId) || mainTalentId <= 0) return false;
    const rawTalentId = Number(talent?.id);
    if (!Number.isFinite(rawTalentId) || rawTalentId >= 0) return false; // only heroic/class talents
    const classTalentId = Math.abs(rawTalentId);
    return classTalentId === mainTalentId;
  }

  static level() {
    let i = 6;
    for (const number of ['VI', 'V', 'IV', 'III', 'II', 'I']) {
      const item = document.createElement('div');

      item.innerText = number;

      item.dataset.id = i;

      item.dataset.active = 0;

      item.id = `bl${i}`;

      item.addEventListener('click', (e) => {
        Sound.play(SOUNDS_LIBRARY.CLICK, {
          id: 'ui-click',
          volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
        });
        if (item.dataset.active == 1) {
          Build.removeSortInventory('level', item.dataset.id);

          Build.sortInventory();

          item.dataset.active = 0;
        } else {
          Build.setSortInventory('level', item.dataset.id);

          Build.sortInventory();

          item.dataset.active = 1;
        }

        e.target.classList.toggle('highlight');

        document.querySelector(`[data-level="${item.dataset['id']}"`).classList.toggle('highlight');
      });

      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        Sound.play(SOUNDS_LIBRARY.CLICK, {
          id: 'ui-click',
          volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
        });

        for (const level of ['1', '2', '3', '4', '5', '6']) {
          Build.removeSortInventory('level', level);
        }
        for (let l = 0; l < 6; l++) {
          item.parentElement.childNodes[l].dataset.active = 0;

          item.parentElement.childNodes[l].classList.remove('highlight');
          document.querySelector(`[data-level="${item.parentElement.childNodes[l].dataset['id']}"`).classList.remove('highlight');
        }
        Build.setSortInventory('level', item.dataset.id);

        Build.sortInventory();

        item.dataset.active = 1;

        document.querySelectorAll('.build-level div.highlight').forEach((n) => n.click());
        item.classList.add('highlight');
        document.querySelector(`[data-level="${item.dataset['id']}"`).classList.add('highlight');
      });

      Build.levelView.append(item);

      i--;
    }
  }

  static talentStatFilter(stat) {
    return (
      stat.indexOf('stak') != -1 ||
      stat.indexOf('rz') != -1 ||
      stat.indexOf('vz') != -1 ||
      stat.indexOf('stak') != -1 ||
      stat.indexOf('dop') != -1 ||
      stat.indexOf('buff') != -1 ||
      (stat.indexOf('speed') != -1 && stat.indexOf('speedtal') == -1)
    );
  }

  static field(data) {
    /*

		*/
    let y = 0,
      index = 0,
      level = 6,
      preload = new PreloadImages();

    while (y < 6) {
      let row = document.createElement('div');

      row.classList.add('build-field-row');

      row.id = `bfr${level}`;

      row.dataset.level = level;

      let x = 0;

      while (x < 6) {
        let item = document.createElement('div');

        item.dataset.position = index;

        item.classList.add('build-hero-grid-item');

        if (data[index]) {
          data[index].state = 2;

          preload.add(Build.templateViewTalent(data[index]), item);
          if (Build.shouldShowMmtestIds()) {
            const talentId = Number(data[index]?.id);
            if (Number.isFinite(talentId)) {
              item.dataset.mmtestId = String(talentId);
            }
          }
        }

        row.append(item);

        Build.installedTalents[index] = data[index];

        if (data[index] && 'conflict' in data[index]) {
          Build.fieldConflict[Math.abs(data[index].id)] = true;
        }

        x++;

        index++;
      }

      Build.fieldView.append(row);

      level--;

      y++;
    }

    Build.updateHeroStats();
    Build.renderCombatOrderBadges();
    Build.syncMmtestTalentIdBadges();
  }

  static templateViewTalent(data) {
    const talent = DOM({ domaudio: domAudioPresets.talent, style: 'build-talent-item' });

    if (data.txtNum) {
      let params = data.txtNum.split(';');
      if (!data.stats) {
        data.stats = new Object();
      }
      if (!data.statsRefine) {
        data.statsRefine = new Object();
      }
      for (let param in params) {
        let paramValues = params[param].split(',');
        if (Build.talentStatFilter(paramValues[2])) {
          data.stats[paramValues[2]] = parseFloat(paramValues[0]);
          data.statsRefine[paramValues[2]] = parseFloat(paramValues[1]);
        } else if (!(paramValues[2] in data.stats) && paramValues[2] in Build.initialStats && Build.initialStats[paramValues[2]] > 0) {
          data.stats[paramValues[2] + 'buff'] = parseFloat(paramValues[0]);
          data.statsRefine[paramValues[2] + 'buff'] = parseFloat(paramValues[1]);
        }
      }
    }

    data.params = data.txtNum ? data.txtNum : data.params; //"all,8,74,num,razum";

    Build.talents[data.id] = data;

    talent.dataset.id = data.id;

    talent.dataset.active = data.active;

    talent.dataset.state = data.state;

    talent.dataset.url = data.id > 0 ? `content/talents/${data.id}.webp` : `content/htalents/${Math.abs(data.id)}.webp`;

    Build.move(talent);

    Build.description(talent);
    talent.addEventListener('click', (event) => {
      Build.handleCombatTalentClick(talent, event);
    });
    talent.addEventListener('contextmenu', (event) => {
      Build.handleCombatTalentContextMenu(talent, event);
    });

    if (data.level == 0) {
      talent.style.display = 'none';
    }

    return talent;

    preload.add(talent);
  }

  static inventory() {
    const container = Build.inventoryView?.querySelector('.build-talents');
    if (container) {
      container.replaceChildren();
    }
    Build._inventoryDefaultOrder = new Map();

    const requestedBuildId = Build.id;
    Build.loading = true;

    App.api.silent(
      (data) => {
        if (requestedBuildId !== Build.id) {
          Build.loading = false;
          return;
        }

        let orderIndex = 0;
        for (let item of data) {
          const key = `${Number(item?.id)}`;
          Build._inventoryDefaultOrder.set(key, orderIndex);
          let talentContainer = DOM({ style: 'build-talent-item-container' });
          talentContainer.dataset.defaultOrder = `${orderIndex}`;
          if (Build.shouldShowMmtestIds()) {
            const talentId = Number(item?.id);
            if (Number.isFinite(talentId)) {
              talentContainer.dataset.mmtestId = String(talentId);
            }
          }

          Build.inventoryView.querySelector('.build-talents').append(talentContainer);

          let preload = new PreloadImages(talentContainer);

          item.state = 1;

          preload.add(Build.templateViewTalent(item));
          orderIndex++;
        }

        Build.syncMmtestTalentIdBadges();
        Build.loading = false;
        try {
          Build.sortInventory();
        } catch {}
        try {
          const ids = Build._hoveredSetTalentIds;
          const anchor = Build._hoveredSetAnchorEl;
          if (ids?.length && anchor?.isConnected) {
            Build.highlightSetTalents(ids);
            Build.previewSetTalentsInEmptySlots({ _manualOrder: ids, key: 'hover_preview_inventory' });
            const start = performance.now();
            const tick = () => {
              if (Build._hoveredSetAnchorEl !== anchor || Build._hoveredSetTalentIds !== ids) return;
              Build.highlightSetTalents(ids);
              Build.previewSetTalentsInEmptySlots({ _manualOrder: ids, key: 'hover_preview_inventory_tick' });
              if (performance.now() - start >= 900) return;
              setTimeout(tick, 140);
            };
            setTimeout(tick, 120);
          }
        } catch {}
      },
      'build',
      'inventory',
      { buildId: Build.id },
    );
  }

  static isTalentInBuild(talentId) {
    const numericId = Number(talentId);
    for (const t of Build.installedTalents || []) {
      if (!t) continue;
      if (Number.isFinite(numericId)) {
        if (Number(t.id) === numericId) return true;
      } else if (`${t.id}` === `${talentId}`) {
        return true;
      }
    }
    return false;
  }

  static isTalentConflictState(talentData, installedTalents) {
    try {
      if (!talentData || !Array.isArray(installedTalents)) return false;
      if (!('conflict' in talentData) || !Array.isArray(talentData.conflict)) return false;

      for (const conflictId of talentData.conflict) {
        for (const installedTalent of installedTalents) {
          if (!installedTalent) continue;
          if (Math.abs(installedTalent.id) == conflictId) {
            const isCurrentOrdinary = talentData.id > 0;
            const isInstalledOrdinary = installedTalent.id > 0;
            if (isCurrentOrdinary === isInstalledOrdinary) return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  static notifyTalentConflict() {
    try {
      if (typeof App !== 'undefined' && App.notify) {
        App.notify(Lang.text('talentConflict'));
      }
    } catch {}
  }

  static clearSetHighlights() {
    try {
      Build.fieldView?.querySelectorAll('.build-talent-item.build-set-highlight').forEach((el) => el.classList.remove('build-set-highlight'));
    } catch {}
    try {
      Build.inventoryView
        ?.querySelectorAll('.build-talents .build-talent-item.build-set-highlight-lib')
        .forEach((el) => el.classList.remove('build-set-highlight-lib'));
    } catch {}

    Build.clearEmptySlotPreviews();
    Build.refreshStatFilterHighlightCountDisplay();
  }

  /** Ключи stats у таланта, совпадающие с фильтром строки героя (как при setSortInventory). */
  static getHeroStatRowFilterStatKeys(heroRowKey) {
    const m = {
      hp: ['hp', 'hpmp'],
      mp: ['mp', 'hpmp'],
      regenhp: ['regenhp', 'regenhpvz'],
      regenmp: ['regenmp', 'regenmpvz'],
      krajahp: ['krajahp', 'krajahprz', 'krajahpvz'],
      krajamp: ['krajamp'],
      talentCdPct: ['speedtal', 'speedtalrz', 'speedtalvz'],
      speed: ['speed', 'speedrz', 'speedvz', 'speeda', 'speedarz', 'speedavz', 'speedd', 'speeddrz', 'speeddvz'],
      sila: ['sila', 'sr', 'srsv', 'silarz', 'silavz'],
      razum: ['razum', 'sr', 'srsv', 'razumrz', 'razumvz'],
      provorstvo: ['provorstvo', 'ph', 'provorstvorz', 'provorstvovz'],
      hitrost: ['hitrost', 'ph', 'hitrostrz', 'hitrostvz'],
      stoikost: ['stoikost', 'sv', 'srsv', 'stoikostrz', 'svvz', 'vs'],
      volia: ['volia', 'sv', 'srsv', 'voliarz', 'svvz', 'vs'],
    };
    return m[heroRowKey] ? m[heroRowKey].slice() : [heroRowKey];
  }

  /** Ключ в calculationStats (прямой вклад талантов через setStat), соответствующий строке героя. */
  static getHeroStatRowDisplayTotalKey(heroRowKey) {
    if (heroRowKey === 'talentCdPct') return 'speedtal';
    return heroRowKey;
  }

  static getTalentDirectCalculationValue(statKey) {
    if (statKey === 'speed') {
      const base = Number(Build.calculationStats['speed']);
      const add = Number(Build.calculationStats['speeda']);
      const b = Number.isFinite(base) ? base : 0;
      const a = Number.isFinite(add) ? add : 0;
      return b + a;
    }
    const v = Number(Build.calculationStats[statKey]);
    return Number.isFinite(v) ? v : 0;
  }

  /**
   * Состояние расчёта до применения таланта в слоте slotIndex (порядок i=35..0 как в updateHeroStats).
   */
  static computeStatsStateBeforeSlot(slotIndex) {
    Build.heroPower = 0.0;
    for (let key in Build.calculationStats) {
      Build.calculationStats[key] = 0.0;
    }
    const partialInstalledTalents = new Array(36).fill(null);
    for (let i = 35; i > slotIndex; i--) {
      const talent = Build.installedTalents[i];
      if (talent) {
        partialInstalledTalents[i] = talent;
        Build.calcStatsFromPower(i);
        Build.setStat(talent, true, false);
      }
    }
    Build.applySetAddStatsForInstalledTalents(partialInstalledTalents);
  }

  /** Меняется ли calculationStats[calcKey] при удалении таланта (для строк без max/min-алиасов). */
  static talentMarginalContributesToCalcKey(slotIndex, calcKey) {
    const installed = Build.installedTalents;
    const t = installed?.[slotIndex];
    if (!t) return false;
    const eps = 1e-4;
    Build.recomputeTalentCalculationTotals();
    const full = Build.getTalentDirectCalculationValue(calcKey);
    installed[slotIndex] = null;
    Build.recomputeTalentCalculationTotals();
    const without = Build.getTalentDirectCalculationValue(calcKey);
    installed[slotIndex] = t;
    Build.recomputeTalentCalculationTotals();
    return Math.abs(full - without) > eps;
  }

  static isCompositeHeroStatRowForHighlight(heroRowKey) {
    return ['hitrost', 'provorstvo', 'sila', 'razum', 'stoikost', 'volia', 'hp', 'mp'].includes(heroRowKey);
  }

  /**
   * Режим «есть ключ стата»: совпадение с фильтром библиотеки по ключам в данных таланта
   * (в т.ч. ph на обеих строках ловкости/хитрости), без проверки фактического вклада.
   */
  static statRowMatchesTalentByFilterKeysOnly(heroRowKey, t) {
    const base = t.id != null ? Build.talents?.[String(t.id)] : null;
    const stats = { ...(base?.stats || {}), ...(t.stats || {}) };
    const statKeys = Build.getHeroStatRowFilterStatKeys(heroRowKey);
    for (const sk of statKeys) {
      if (sk in stats) return true;
    }
    return false;
  }

  /**
   * Подсветка строки героя: для ph/sr/sv/srsv/hpmp смотрим куда уйдёт бонус в момент setStat
   * (getMaxStat/getMinStat на состоянии до слота). Маргинальный пересчёт неверен — соседний талант с ph
   * может перекинуться на другую характеристику при удалении «проворства».
   */
  static statRowMatchesTalentForHighlight(heroRowKey, t, slotIndex) {
    const base = t.id != null ? Build.talents?.[String(t.id)] : null;
    const stats = { ...(base?.stats || {}), ...(t.stats || {}) };
    const has = (k) => k in stats;

    if (heroRowKey === 'hitrost') {
      if (has('hitrost') || has('hitrostrz') || has('hitrostvz')) return true;
      if (has('ph')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['provorstvo', 'hitrost']) === 'hitrost';
      }
      if (has('phMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['provorstvo', 'hitrost']) === 'hitrost';
      }
      return false;
    }
    if (heroRowKey === 'provorstvo') {
      if (has('provorstvo') || has('provorstvorz') || has('provorstvovz')) return true;
      if (has('ph')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['provorstvo', 'hitrost']) === 'provorstvo';
      }
      if (has('phMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['provorstvo', 'hitrost']) === 'provorstvo';
      }
      return false;
    }
    if (heroRowKey === 'sila') {
      if (has('sila') || has('silarz') || has('silavz')) return true;
      if (has('sr')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['sila', 'razum']) === 'sila';
      }
      if (has('srsv')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']) === 'sila';
      }
      if (has('srMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['sila', 'razum']) === 'sila';
      }
      if (has('srsvMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['sila', 'razum', 'stoikost', 'volia']) === 'sila';
      }
      return false;
    }
    if (heroRowKey === 'razum') {
      if (has('razum') || has('razumrz') || has('razumvz')) return true;
      if (has('sr')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['sila', 'razum']) === 'razum';
      }
      if (has('srsv')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']) === 'razum';
      }
      if (has('srMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['sila', 'razum']) === 'razum';
      }
      if (has('srsvMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['sila', 'razum', 'stoikost', 'volia']) === 'razum';
      }
      return false;
    }
    if (heroRowKey === 'stoikost') {
      if (has('stoikost') || has('stoikostrz')) return true;
      if (has('sv')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['stoikost', 'volia']) === 'stoikost';
      }
      if (has('srsv')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']) === 'stoikost';
      }
      if (has('svMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['volia', 'stoikost']) === 'stoikost';
      }
      if (has('srsvMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['sila', 'razum', 'stoikost', 'volia']) === 'stoikost';
      }
      if (has('svvz') || has('vs')) {
        return Build.talentMarginalContributesToCalcKey(slotIndex, 'stoikost');
      }
      return false;
    }
    if (heroRowKey === 'volia') {
      if (has('volia') || has('voliarz')) return true;
      if (has('sv')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['stoikost', 'volia']) === 'volia';
      }
      if (has('srsv')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']) === 'volia';
      }
      if (has('svMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['volia', 'stoikost']) === 'volia';
      }
      if (has('srsvMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['sila', 'razum', 'stoikost', 'volia']) === 'volia';
      }
      if (has('svvz') || has('vs')) {
        return Build.talentMarginalContributesToCalcKey(slotIndex, 'volia');
      }
      return false;
    }
    if (heroRowKey === 'hp') {
      if (has('hp')) return true;
      if (has('hpmp')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['hp', 'mp']) === 'hp';
      }
      if (has('hpmpMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['hp', 'mp']) === 'hp';
      }
      return false;
    }
    if (heroRowKey === 'mp') {
      if (has('mp')) return true;
      if (has('hpmp')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMaxStat(['hp', 'mp']) === 'mp';
      }
      if (has('hpmpMin')) {
        Build.computeStatsStateBeforeSlot(slotIndex);
        return Build.getMinStat(['hp', 'mp']) === 'mp';
      }
      return false;
    }

    const statKeys = Build.getHeroStatRowFilterStatKeys(heroRowKey);
    for (const sk of statKeys) {
      if (sk in stats) return true;
    }
    return false;
  }

  static refreshStatFilterHighlightCountDisplay() {
    try {
      const el = Build.statFilterHighlightCountValueEl;
      const wrap = Build.statFilterHighlightCountWrapEl;
      if (!el) return;
      const nodes =
        Build.fieldView?.querySelectorAll?.(
          '.build-talent-item.build-stat-filter-hover, .build-talent-item.build-set-highlight',
        ) || [];
      el.textContent = String(new Set(Array.from(nodes)).size);
      if (wrap) wrap.dataset.tooltip = Lang.text('buildStatsHighlightedTalentsCountTitle');
    } catch {}
  }

  static clearStatFilterHoverHighlightOnSets() {
    try {
      Build.setsListView?.querySelectorAll('.build-set-item.build-stat-filter-hover-set').forEach((el) => {
        el.classList.remove('build-stat-filter-hover-set');
      });
    } catch {}
  }

  static heroRowMatchesResolvedSetStatKey(heroRowKey, resolvedSetStatKey) {
    const key = Build.resolveConditionalStatKey(Build.resolveCompositeStatAlias(resolvedSetStatKey));
    if (!key) return false;
    if (heroRowKey === 'critProb' && key === 'crit') return true;
    const rowKeys = Build.getHeroStatRowFilterStatKeys(heroRowKey);
    for (const rowKey of rowKeys) {
      const normalizedRowKey = Build.resolveConditionalStatKey(Build.resolveCompositeStatAlias(rowKey));
      if (normalizedRowKey === key) return true;
    }
    return false;
  }

  static applyStatFilterHoverHighlightOnSets(heroRowKey) {
    Build.clearStatFilterHoverHighlightOnSets();
    if (!Build.setsListView) return;
    const rendered = Array.isArray(Build._renderedSetEntries) ? Build._renderedSetEntries : [];
    if (!rendered.length) return;

    const installedIds = new Set();
    for (const talent of Build.installedTalents || []) {
      const tid = Number(talent?.id);
      if (Number.isFinite(tid) && tid !== 0) installedIds.add(tid);
    }
    if (!installedIds.size) return;

    for (const entry of rendered) {
      const set = entry?.set;
      const item = entry?.item;
      if (!set || !item || !item.isConnected) continue;

      const setIds = TalentSets.getTalentIds(set)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id !== 0);
      if (!setIds.length) continue;

      let count = 0;
      for (const id of setIds) {
        if (installedIds.has(id)) count++;
      }
      if (count <= 0) continue;

      const requiredMain = Number(set?.mainNeed);
      if (Number.isFinite(requiredMain) && requiredMain !== 0 && !installedIds.has(requiredMain)) {
        continue;
      }

      const rules = Build.normalizeSetAddStatsRules(set?.addStats);
      let matched = false;
      for (const rule of rules) {
        if (count < rule.need) continue;
        const stats = rule?.stats;
        if (!stats || typeof stats !== 'object') continue;

        let speeddTotal = 0;
        for (const [rawKey, rawValue] of Object.entries(stats)) {
          const value = Number(rawValue);
          if (!Number.isFinite(value) || value === 0) continue;
          const resolvedStatKey = Build.resolveConditionalStatKey(Build.resolveCompositeStatAlias(rawKey));
          if (!resolvedStatKey) continue;
          if (resolvedStatKey === 'speedd') {
            speeddTotal += value;
            continue;
          }
          if (Build.heroRowMatchesResolvedSetStatKey(heroRowKey, resolvedStatKey)) {
            matched = true;
            break;
          }
        }
        if (matched) break;

        if (speeddTotal !== 0 && Build.heroRowMatchesResolvedSetStatKey(heroRowKey, 'speed')) {
          let mainId = Number(set?.mainNeed);
          if (!Number.isFinite(mainId) || mainId <= 0) mainId = Number(TalentSets.chooseMainTalentId(set));
          if (Number.isFinite(mainId) && mainId !== 0 && installedIds.has(mainId)) {
            matched = true;
            break;
          }
        }
      }

      if (matched) item.classList.add('build-stat-filter-hover-set');
    }
  }

  static clearStatFilterHoverHighlightOnBuild() {
    try {
      Build.fieldView
        ?.querySelectorAll('.build-talent-item.build-stat-filter-hover')
        .forEach((el) => el.classList.remove('build-stat-filter-hover'));
    } catch {}
    Build.clearStatFilterHoverHighlightOnSets();
    Build._statFilterHoverRowKey = null;
    Build.refreshStatFilterHighlightCountDisplay();
  }

  /** Подсветка слотов билда при наведении на строку стат-фильтра. */
  static applyStatFilterHoverHighlightOnBuild(heroRowKey) {
    Build.clearStatFilterHoverHighlightOnBuild();
    const mode = Build.getBuildStatFilterHighlightMode();
    if (mode === 0) {
      Build._statFilterHoverRowKey = null;
      return;
    }
    Build._statFilterHoverRowKey = heroRowKey;
    const installed = Build.installedTalents || [];
    const highlightAt = (index) => {
      const cell = Build.fieldView?.querySelector?.(`.build-hero-grid-item[data-position="${index}"]`);
      const el = cell?.querySelector?.('.build-talent-item');
      if (el) el.classList.add('build-stat-filter-hover');
    };

    if (mode === 1) {
      for (let index = 0; index < installed.length; index++) {
        const t = installed[index];
        if (!t) continue;
        if (Build.statRowMatchesTalentByFilterKeysOnly(heroRowKey, t)) highlightAt(index);
      }
      Build.applyStatFilterHoverHighlightOnSets(heroRowKey);
      Build.refreshStatFilterHighlightCountDisplay();
      return;
    }

    if (Build.isCompositeHeroStatRowForHighlight(heroRowKey)) {
      for (let index = 0; index < installed.length; index++) {
        const t = installed[index];
        if (!t) continue;
        if (Build.statRowMatchesTalentForHighlight(heroRowKey, t, index)) highlightAt(index);
      }
      Build.recomputeTalentCalculationTotals();
      Build.applyStatFilterHoverHighlightOnSets(heroRowKey);
      Build.refreshStatFilterHighlightCountDisplay();
      return;
    }

    const displayKey = Build.getHeroStatRowDisplayTotalKey(heroRowKey);
    Build.recomputeTalentCalculationTotals();
    const fullDirect = Build.getTalentDirectCalculationValue(displayKey);
    const eps = 1e-4;
    for (let index = 0; index < installed.length; index++) {
      const t = installed[index];
      if (!t) continue;
      installed[index] = null;
      Build.recomputeTalentCalculationTotals();
      const withoutDirect = Build.getTalentDirectCalculationValue(displayKey);
      installed[index] = t;
      if (Math.abs(fullDirect - withoutDirect) > eps) {
        highlightAt(index);
      }
    }
    Build.recomputeTalentCalculationTotals();
    Build.applyStatFilterHoverHighlightOnSets(heroRowKey);
    Build.refreshStatFilterHighlightCountDisplay();
  }

  static setSelectedSetItem(item) {
    try {
      if (Build._selectedSetItem && Build._selectedSetItem !== item) {
        Build._selectedSetItem.classList.remove('build-set-item-selected');
      }
      Build._selectedSetItem = item || null;
      if (Build._selectedSetItem) {
        Build._selectedSetItem.classList.add('build-set-item-selected');
      }
    } catch {}
  }

  static clearSelectedSetItem() {
    try {
      if (Build._selectedSetItem) {
        Build._selectedSetItem.classList.remove('build-set-item-selected');
      }
    } catch {}
    Build._selectedSetItem = null;
  }

  static clearEmptySlotPreviews() {
    try {
      Build.fieldView
        ?.querySelectorAll(
          '.build-hero-grid-item.build-set-empty-slot-preview, .build-hero-grid-item.build-talent-empty-slot-preview',
        )
        .forEach((el) => {
          el.classList.remove('build-set-empty-slot-preview');
          el.classList.remove('build-talent-empty-slot-preview');
          el.style.backgroundImage = '';
        });
    } catch {}
    Build.stopPreviewBlinkTickerIfIdle();
  }

  static ensurePreviewBlinkTicker() {
    if (Build._previewBlinkTimer) return;
    Build._previewBlinkState = false;
    const tick = () => {
      if (!Build._previewBlinkTimer) return;
      Build._previewBlinkState = !Build._previewBlinkState;
      try {
        Build.fieldView?.classList?.toggle('build-preview-blink-on', Build._previewBlinkState);
      } catch {}
    };
    Build._previewBlinkTimer = setInterval(tick, 450);
    tick();
  }

  static stopPreviewBlinkTickerIfIdle() {
    let hasPreview = false;
    try {
      hasPreview = !!Build.fieldView?.querySelector?.(
        '.build-hero-grid-item.build-set-empty-slot-preview, .build-hero-grid-item.build-talent-empty-slot-preview',
      );
    } catch {}
    if (hasPreview) return;
    try {
      if (Build._previewBlinkTimer) clearInterval(Build._previewBlinkTimer);
    } catch {}
    Build._previewBlinkTimer = 0;
    Build._previewBlinkState = false;
    try {
      Build.fieldView?.classList?.remove('build-preview-blink-on');
    } catch {}
  }

  static getFirstEmptySlotIndexForLevelIn(installedTalents, level) {
    const lvl = Number(level);
    if (!Number.isFinite(lvl) || lvl <= 0) return null;

    for (let t = (lvl - 1) * 6; t < lvl * 6; t++) {
      const index = 35 - t;
      if (!installedTalents?.[index]) return index;
    }
    return null;
  }

  static previewSetTalentsInEmptySlots(set, slotDirection = 'right', { previewClass = 'build-set-empty-slot-preview' } = {}) {
    try {
      Build.clearEmptySlotPreviews();

      let ids = TalentSets.getTalentIds(set);
      if (previewClass === 'build-set-empty-slot-preview' && Array.isArray(ids)) {
        if (ids.length > 1) ids = Build.sortSetTalentIdsByPriority(ids);
        ids = Build.filterSetTalentIdsByMatchingStats(ids);
      }
      const simInstalled = Array.isArray(Build.installedTalents) ? Build.installedTalents.slice() : new Array(36).fill(null);

      for (const id of ids) {
        if (Build.isTalentInBuild(id)) continue; // already installed in real build
        const data = Build.talents?.[String(id)];
        if (!data || !data.level || data.level <= 0) continue;

        let emptyIndex = null;
        if (slotDirection === 'left') {
          // left-to-right within the row: indices increase from left to right in Build.field()
          const lvl = Number(data.level);
          const start = (6 - lvl) * 6;
          if (Number.isFinite(start)) {
            for (let idx = start; idx < start + 6; idx++) {
              if (!simInstalled?.[idx]) {
                emptyIndex = idx;
                break;
              }
            }
          }
        } else {
          // right-to-left (current behavior used by sets)
          emptyIndex = Build.getFirstEmptySlotIndexForLevelIn(simInstalled, data.level);
        }

        if (emptyIndex == null) continue;

        // simulate installation so next missing talent uses the correct next empty slot
        simInstalled[emptyIndex] = data;

        const cell = Build.fieldView?.querySelector(`.build-hero-grid-item[data-position="${emptyIndex}"]`);
        if (!cell) continue;
        cell.classList.add(previewClass);
        const src = id > 0 ? `content/talents/${id}.webp` : `content/htalents/${Math.abs(id)}.webp`;
        cell.style.backgroundImage = `url("${src}")`;
      }
      Build.ensurePreviewBlinkTicker();
    } catch {}
  }


  static positionDescriptionNearRect(anchorRect) {
    const gap = 8;
    Build.descriptionView.style.zIndex = 9999;
    Build.descriptionView.style.position = 'fixed';

    let left = anchorRect.left + anchorRect.width + gap;
    let top = anchorRect.top;

    const w = Build.descriptionView.offsetWidth;
    const h = Build.descriptionView.offsetHeight;

    const overBottom = top + h - window.innerHeight;
    if (overBottom > 0) {
      top -= overBottom;
    }

    if (top < 0) top = 0;

    Build.descriptionView.style.left = `${left}px`;
    Build.descriptionView.style.top = `${top}px`;
  }

  static scheduleDescriptionReposition(anchorRect) {
    Build.positionDescriptionNearRect(anchorRect);
    requestAnimationFrame(() => Build.positionDescriptionNearRect(anchorRect));
    try {
      const imgs = Build.descriptionView.querySelectorAll('img');
      imgs.forEach((img) => {
        if (img.complete) return;
        img.addEventListener(
          'load',
          () => {
            Build.positionDescriptionNearRect(anchorRect);
          },
          { once: true },
        );
        img.addEventListener(
          'error',
          () => {
            Build.positionDescriptionNearRect(anchorRect);
          },
          { once: true },
        );
      });
    } catch {}
  }

  static applyTalentParamsToDescription(talentData) {
    if (!talentData || !talentData.params || !Build.descriptionView) return;

    try {
      let paramIterator = 0;
      const params = String(talentData.params || '').split(';').filter(Boolean);
      if (!params.length) return;

      const nodes = Build.descriptionView.querySelectorAll('*');
      for (const outerTag of nodes) {
        for (const specialTag of outerTag.childNodes || []) {
          const tagString = specialTag.innerHTML ? specialTag.innerHTML : specialTag.data;
          if (!tagString || tagString.indexOf('%s') === -1) continue;
          if (paramIterator >= params.length) return;

          const param = params[paramIterator];
          const paramValues = String(param || '')
            .split(',')
            .map((value) => String(value).trim());

          let statAffection, minValue, maxValue;
          let dynamicByStat = false;
          let optionalTokens = new Array();
          if (paramValues.length >= 5) {
            minValue = parseFloat(paramValues[1]);
            maxValue = parseFloat(paramValues[2]);
            statAffection = paramValues[4];
            dynamicByStat = true;
            optionalTokens = paramValues.slice(5);
          } else if (paramValues.length >= 3) {
            minValue = parseFloat(paramValues[0]);
            maxValue = parseFloat(paramValues[1]);
            statAffection = paramValues[2];
            optionalTokens = paramValues.slice(3);
          } else {
            continue;
          }

          if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || !statAffection) {
            paramIterator++;
            continue;
          }

          let clampMin = null;
          let clampMax = null;
          for (const token of optionalTokens) {
            const rawToken = String(token || '');
            const minMatch = rawToken.match(/^min\s*:\s*(-?\d+(?:\.\d+)?)$/i);
            if (minMatch) {
              const parsed = Number(minMatch[1]);
              if (Number.isFinite(parsed)) clampMin = parsed;
              continue;
            }
            const maxMatch = rawToken.match(/^max\s*:\s*(-?\d+(?:\.\d+)?)$/i);
            if (maxMatch) {
              const parsed = Number(maxMatch[1]);
              if (Number.isFinite(parsed)) clampMax = parsed;
            }
          }
          if (Number.isFinite(clampMin) && Number.isFinite(clampMax) && clampMin > clampMax) {
            const swap = clampMin;
            clampMin = clampMax;
            clampMax = swap;
          }

          let resolvedStatAffection;
          let resolvedStatAffection1;
          let resolvedStatAffection2;
          switch (statAffection) {
            case 'sr_max':
              resolvedStatAffection = Build.getMaxStat(['sila', 'razum']);
              break;
            case 'sv_max':
              resolvedStatAffection = Build.getMaxStat(['stoikost', 'volia']);
              break;
            case 'ph_max':
              resolvedStatAffection = Build.getMaxStat(['provorstvo', 'hitrost']);
              break;
            case 'hpmp_max':
              resolvedStatAffection = Build.getMaxStat(['hp', 'mp']);
              break;
            case 'sr_sum':
              resolvedStatAffection1 = 'sila';
              resolvedStatAffection2 = 'razum';
              break;
            case 'ph_sum':
              resolvedStatAffection1 = 'provorstvo';
              resolvedStatAffection2 = 'hitrost';
              break;
            case 'sv_sum':
              resolvedStatAffection1 = 'stoikost';
              resolvedStatAffection2 = 'volia';
              break;
            case 'hpmp_sum':
              resolvedStatAffection1 = 'hp';
              resolvedStatAffection2 = 'mp';
              break;
            default:
              resolvedStatAffection = statAffection;
              break;
          }

          function lerp(a, b, alpha) {
            return a + alpha * (b - a);
          }

          let outputValue;
          if (statAffection == 'sr_sum' || statAffection == 'ph_sum' || statAffection == 'sv_sum' || statAffection == 'hpmp_sum') {
            let resolvedTotalStat1 = Build.totalStat(resolvedStatAffection1);
            let resolvedTotalStat2 = Build.totalStat(resolvedStatAffection2);
            const isHpOrEnergy =
              resolvedStatAffection1 == 'hp' ||
              resolvedStatAffection1 == 'mp' ||
              resolvedStatAffection2 == 'hp' ||
              resolvedStatAffection2 == 'mp';
            const param1 = isHpOrEnergy ? 600.0 : 50.0;
            const param2 = isHpOrEnergy ? 6250.0 : 250.0;
            outputValue = lerp(minValue, maxValue, (resolvedTotalStat1 + resolvedTotalStat2 - param1) / param2);
          } else {
            if (resolvedStatAffection in Build.dataStats && dynamicByStat) {
              let resolvedTotalStat = Build.totalStat(resolvedStatAffection);
              const isHpOrEnergy = resolvedStatAffection == 'hp' || resolvedStatAffection == 'mp';
              const param1 = isHpOrEnergy ? 600.0 : 50.0;
              const param2 = isHpOrEnergy ? 6250.0 : 250.0;
              outputValue = lerp(minValue, maxValue, (resolvedTotalStat - param1) / param2);
            } else {
              let refineBonus = Build.getTalentRefineByRarity(talentData.rarity);
              outputValue = minValue + maxValue * refineBonus;
            }
          }

          if (!Number.isFinite(outputValue)) {
            paramIterator++;
            continue;
          }
          if (Number.isFinite(clampMin)) outputValue = Math.max(outputValue, clampMin);
          if (Number.isFinite(clampMax)) outputValue = Math.min(outputValue, clampMax);
          let outputString = outputValue.toFixed(1);
          if (outputString.endsWith('.0')) outputString = outputString.replace('.0', '');

          if (specialTag.innerHTML) specialTag.innerHTML = tagString.replace('%s', outputString);
          else outerTag.innerHTML = tagString.replace('%s', outputString);

          paramIterator++;
        }
      }
    } catch {}
  }

  static formatCooldownValue(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const rounded = Math.round(num * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
    return String(rounded).replace(/\.0$/, '');
  }

  static applyCooldownReductionToDescriptionMarkup() {
    if (!Build.descriptionView) return;
    const cdNodes = Build.descriptionView.querySelectorAll('cd');
    if (!cdNodes.length) return;

    const rawPct = Number(Build.totalStat('speedtal'));
    const cdPct = Number.isFinite(rawPct) ? Math.max(0, Math.min(Build.TALENT_COOLDOWN_PCT_MAX, rawPct)) : 0;
    if (cdPct <= 0) return;

    for (const cdNode of cdNodes) {
      const source = String(cdNode.textContent || '').trim();
      let base = NaN;
      const explicit = source.match(/^([0-9]+(?:[.,][0-9]+)?)$/);
      if (explicit) {
        base = Number(String(explicit[1]).replace(',', '.'));
      } else if (!source) {
        const parent = cdNode.parentElement;
        if (parent) {
          const textNodes = Array.from(parent.childNodes).filter((n) => n !== cdNode && n.nodeType === 3);
          const rawNeighborNumber = textNodes
            .map((n) => String(n.textContent || ''))
            .join('')
            .trim();
          const implicit = rawNeighborNumber.match(/^([0-9]+(?:[.,][0-9]+)?)$/);
          if (implicit) {
            base = Number(String(implicit[1]).replace(',', '.'));
            for (const tn of textNodes) tn.textContent = '';
          }
        }
      }

      if (!Number.isFinite(base) || base <= 0) continue;

      const reduced = base * (1 - cdPct / 100);
      const reducedText = Build.formatCooldownValue(reduced);
      const baseText = Build.formatCooldownValue(base);
      if (!reducedText || !baseText) continue;

      const leftCd = document.createElement('cd');
      leftCd.textContent = baseText;
      const rightCd = document.createElement('cd');
      rightCd.textContent = reducedText;
      const fragment = document.createDocumentFragment();
      fragment.append(leftCd, document.createTextNode(' -> '), rightCd);
      cdNode.replaceWith(fragment);
    }
  }

  static renderDescriptionHtml({ html, anchorEl, anchorRect, talentDataForParams }) {
    if (!Build.descriptionView) return;
    Build.descriptionView.innerHTML = html || '';
    Build.descriptionView.style.display = 'block';

    if (talentDataForParams) {
      Build.applyTalentParamsToDescription(talentDataForParams);
    }
    Build.applyCooldownReductionToDescriptionMarkup();

    const rect = anchorRect || anchorEl?.getBoundingClientRect?.();
    if (rect) Build.scheduleDescriptionReposition(rect);
  }

  static highlightSetTalents(talentIds) {
    Build.clearSetHighlights();
    const wanted = new Set((talentIds || []).map(String));
    Build.fieldView?.querySelectorAll('.build-talent-item').forEach((el) => {
      if (wanted.has(el.dataset.id)) el.classList.add('build-set-highlight');
    });
    Build.inventoryView?.querySelectorAll('.build-talents .build-talent-item').forEach((el) => {
      if (wanted.has(el.dataset.id)) el.classList.add('build-set-highlight-lib');
    });
    Build.refreshStatFilterHighlightCountDisplay();
  }

  static async highlightSetTalentsAfterRender(talentIds, timeoutMs = 2000) {
    const ids = (talentIds || []).map(String);
    if (!ids.length) return;
    const hasAny = () => ids.some((id) => Build.fieldView?.querySelector(`.build-talent-item[data-id="${id}"]`) || Build.inventoryView?.querySelector(`.build-talents .build-talent-item[data-id="${id}"]`));
    await Build.waitForCondition(hasAny, timeoutMs);
    if (Build._hoveredSetTalentIds !== talentIds) return;
    Build.highlightSetTalents(talentIds);
    Build.previewSetTalentsInEmptySlots({ _manualOrder: ids, key: 'hover_preview_recover' });
  }

  static showSetDescription(set, anchorEl) {
    Build._descriptionPinnedBySet = true;
    const mode = Build.getSetLmbMode();
    const mainId = TalentSets.chooseMainTalentId(set);
    const ids = TalentSets.getTalentIds(set);

    const iconHtml = ids
      .map((id) => {
        const inBuild = Build.isTalentInBuild(id);
        const src = `content/talents/${id}.webp`;
        const cls = inBuild ? 'build-set-desc-icon is-in-build' : 'build-set-desc-icon';
        return `<img class="${cls}" src="${src}">`;
      })
      .join('');

    let mainDesc = '';
    if (mainId != null) {
      const absId = Math.abs(mainId);
      const prefix = 'talent_';
      const nameKey = `${prefix}${absId}_name`;
      const descriptionKey = `${prefix}${absId}_description`;
      const mainName = Lang.text(nameKey);
      const desc = Lang.text(descriptionKey);
      mainDesc = `<div class="build-set-main-desc"><b>${mainName}</b><br><br>${desc}</div>`;
    }

    let lmbHint = Lang.text('setHintLmb');
    if (mode === 2) lmbHint = Lang.text('setHintLmbMode2');
    if (mode === 3) lmbHint = Lang.text('setHintLmbMode3');

    let rmbHint = Lang.text('setHintRmb');
    if (mode === 3) rmbHint = Lang.text('setHintRmbMode3');

    const html =
      `${mainDesc}` +
      `<div class="build-set-desc-icons">${iconHtml}</div>` +
      `<div class="build-set-desc-hints">` +
      `<div>${lmbHint}</div>` +
      `<div>${rmbHint}</div>` +
      `</div>`;

    const dataForParams = mainId != null ? Build.talents[String(mainId)] : null;
    Build.renderDescriptionHtml({ html, anchorEl, talentDataForParams: dataForParams });
  }

  static refreshSetHoverState(set, item, ids, withDelayedHighlights = false) {
    if (Build._hoveredSetAnchorEl !== item) return;

    Build.showSetDescription(set, item);
    Build.highlightSetTalents(ids);
    Build.previewSetTalentsInEmptySlots(set);
    Build.highlightSetTalentsAfterRender(ids);
    if (withDelayedHighlights) {
      const start = performance.now();
      const tick = () => {
        if (Build._hoveredSetAnchorEl !== item || Build._hoveredSetTalentIds !== ids) return;
        Build.highlightSetTalents(ids);
        if (performance.now() - start >= 1400) return;
        setTimeout(tick, 140);
      };
      setTimeout(tick, 120);
    }
    requestAnimationFrame(() => {
      if (Build._hoveredSetAnchorEl !== item || Build._hoveredSetTalentIds !== ids) return;
      Build.showSetDescription(set, item);
      Build.highlightSetTalents(ids);
      Build.previewSetTalentsInEmptySlots(set);
    });
  }

  static getFirstEmptySlotIndexForLevel(level) {
    const lvl = Number(level);
    if (!Number.isFinite(lvl) || lvl <= 0) return null;

    for (let t = (lvl - 1) * 6; t < lvl * 6; t++) {
      const index = 35 - t;
      if (!Build.installedTalents?.[index]) return index;
    }
    return null;
  }

  static async removeTalentFromActiveByFieldIndex(fieldIndex) {
    const pos = Number(fieldIndex);
    if (!Number.isFinite(pos)) return;
    for (let i = 0; i < (Build.activeBarItems || []).length; i++) {
      const talPos = Math.abs(Build.activeBarItems[i]) - 1;
      if (talPos === pos) {
        try {
          await Build.removeTalentFromActive(i);
        } catch {}
      }
    }
  }

  static findFirstFreeActiveBarIndex() {
    for (let i = 0; i < (Build.activeBarItems || []).length; i++) {
      if (Build.activeBarItems[i] === 0) return i;
    }
    return -1;
  }

  static isFieldIndexAlreadyInActiveBar(fieldIndex) {
    const pos = Number(fieldIndex);
    if (!Number.isFinite(pos)) return false;
    for (let i = 0; i < (Build.activeBarItems || []).length; i++) {
      const talPos = Math.abs(Build.activeBarItems[i]) - 1;
      if (talPos === pos) return true;
    }
    return false;
  }

  static waitForCondition(check, timeoutMs = 1200) {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        let ok = false;
        try {
          ok = !!check();
        } catch {
          ok = false;
        }
        if (ok) return resolve(true);
        if (performance.now() - start >= timeoutMs) return resolve(false);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  static waitForApiIdle(objectName, timeoutMs = 3000) {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        let pending = 0;
        try {
          const awaiting = App?.api?.awaiting || {};
          for (const v of Object.values(awaiting)) {
            if (v?.object === objectName) pending++;
          }
        } catch {}

        if (pending === 0) return resolve(true);
        if (performance.now() - start >= timeoutMs) return resolve(false);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  static getSetApplyPriorityBases(useFallback = true) {
    const bases = ['sila', 'razum', 'provorstvo', 'hitrost', 'stoikost', 'volia'];

    // Source of truth: profile checkboxes (circle/checkbox) in hero stats block.
    const profile = Build.profileStats || {};
    const fromProfile = bases.filter((k) => Number(profile[k]) === 1);
    if (fromProfile.length) return new Set(fromProfile);

    if (!useFallback) return new Set();

    // Fallback: current stats filter state.
    const selected = Array.isArray(Build.ruleSortInventory?.stats) ? Build.ruleSortInventory.stats : [];
    if (!selected.length) return new Set();
    return new Set(bases.filter((k) => selected.includes(k)));
  }

  static getSetPriorityFamilyWeights() {
    return {
      sila: { pure: ['sila', 'silarz', 'silavz'], mixed: ['sr', 'srsv'] },
      razum: { pure: ['razum', 'razumrz', 'razumvz'], mixed: ['sr', 'srsv'] },
      provorstvo: { pure: ['provorstvo', 'provorstvorz', 'provorstvovz'], mixed: ['ph'] },
      hitrost: { pure: ['hitrost', 'hitrostrz', 'hitrostvz'], mixed: ['ph'] },
      stoikost: { pure: ['stoikost', 'stoikostrz'], mixed: ['sv', 'svvz', 'vs', 'srsv'] },
      volia: { pure: ['volia', 'voliarz'], mixed: ['sv', 'svvz', 'vs', 'srsv'] },
    };
  }

  static getSetSilaRazumPresence(stats = {}) {
    const pureSilaKeys = ['sila', 'silarz', 'silavz'];
    const pureRazumKeys = ['razum', 'razumrz', 'razumvz'];
    const maxSrKeys = ['sr', 'srsv'];
    const hasPureSila = pureSilaKeys.some((k) => Build.hasTalentStatKey(stats, k));
    const hasPureRazum = pureRazumKeys.some((k) => Build.hasTalentStatKey(stats, k));
    const hasSrMax = maxSrKeys.some((k) => Build.hasTalentStatKey(stats, k));
    return { hasPureSila, hasPureRazum, hasSrMax };
  }

  static hasTalentStatKey(stats = {}, key = '') {
    if (!key) return false;
    return key in stats || `${key}buff` in stats;
  }

  static hasNonCheckboxStatKey(stats = {}, familyWeights = null) {
    const map = familyWeights || Build.getSetPriorityFamilyWeights();
    const checkboxKeys = new Set(['srMin', 'phMin', 'svMin', 'srsvMin']);
    try {
      for (const cfg of Object.values(map)) {
        for (const k of cfg?.pure || []) checkboxKeys.add(k);
        for (const k of cfg?.mixed || []) checkboxKeys.add(k);
      }
    } catch {}

    for (const rawKey of Object.keys(stats || {})) {
      const k = String(rawKey).endsWith('buff') ? String(rawKey).slice(0, -4) : String(rawKey);
      if (!checkboxKeys.has(k)) return true;
    }
    return false;
  }

  static hasAnyCheckboxStatKey(stats = {}, familyWeights = null) {
    const map = familyWeights || Build.getSetPriorityFamilyWeights();
    const checkboxKeys = new Set(['srMin', 'phMin', 'svMin', 'srsvMin']);
    try {
      for (const cfg of Object.values(map)) {
        for (const k of cfg?.pure || []) checkboxKeys.add(k);
        for (const k of cfg?.mixed || []) checkboxKeys.add(k);
      }
    } catch {}

    for (const rawKey of Object.keys(stats || {})) {
      const k = String(rawKey).endsWith('buff') ? String(rawKey).slice(0, -4) : String(rawKey);
      if (checkboxKeys.has(k)) return true;
    }
    return false;
  }

  static sortSetTalentIdsByPriority(ids) {
    if (!Array.isArray(ids) || ids.length <= 1) return ids;
    const bases = Build.getSetApplyPriorityBases(false);
    if (!bases.size) return ids;

    const familyWeights = Build.getSetPriorityFamilyWeights();
    const hasSilaSelected = bases.has('sila');
    const hasRazumSelected = bases.has('razum');
    const dominantSr = hasSilaSelected && hasRazumSelected ? Build.getMaxStat(['sila', 'razum']) : null;

    const pureWeight = 10;
    const mixedWeight = 3;

    const scored = ids.map((id, idx) => {
      const data = Build.talents?.[String(id)];
      const score = Build.getSetTalentPriorityScore(data, bases, familyWeights, pureWeight, mixedWeight, { dominantSr });

      return { id, idx, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    });

    return scored.map((x) => x.id);
  }

  static getSetTalentPriorityScore(data, bases, familyWeights, pureWeight = 10, mixedWeight = 3, options = {}) {
    const stats = data?.stats || {};
    let score = 0;
    for (const base of bases || []) {
      const map = familyWeights?.[base];
      if (!map) continue;
      let basePureWeight = pureWeight;
      let baseMixedWeight = mixedWeight;

      // If both Sila and Razum are selected, prioritize the larger of those
      // stats in current build state.
      if (options?.dominantSr && (base === 'sila' || base === 'razum')) {
        if (base === options.dominantSr) {
          basePureWeight += 4;
          baseMixedWeight += 1;
        } else {
          basePureWeight = Math.max(0, basePureWeight - 2);
          baseMixedWeight = Math.max(0, baseMixedWeight - 1);
        }
      }

      for (const k of map.pure) {
        if (Build.hasTalentStatKey(stats, k)) score += basePureWeight;
      }
      for (const k of map.mixed) {
        if (Build.hasTalentStatKey(stats, k)) score += baseMixedWeight;
      }
    }
    return score;
  }

  static filterSetTalentIdsByMatchingStats(ids) {
    if (!Array.isArray(ids) || !ids.length) return ids || [];
    if (!Settings.settings?.buildSetOnlyMatchingStats) return ids;

    const bases = Build.getSetApplyPriorityBases(false);

    const familyWeights = Build.getSetPriorityFamilyWeights();
    const hasSilaSelected = bases.has('sila');
    const hasRazumSelected = bases.has('razum');
    const bothSelected = hasSilaSelected && hasRazumSelected;
    const dominantSr = bothSelected ? Build.getMaxStat(['sila', 'razum']) : null;
    const nonSrBases = new Set([...bases].filter((b) => b !== 'sila' && b !== 'razum'));

    return ids.filter((id) => {
      const data = Build.talents?.[String(id)];
      const stats = data?.stats || {};
      const hasCheckbox = Build.hasAnyCheckboxStatKey(stats, familyWeights);
      const hasNonCheckbox = Build.hasNonCheckboxStatKey(stats, familyWeights);
      if (!bases.size) return !hasCheckbox && hasNonCheckbox;
      // Always allow "other stats" only when talent has no checkbox-related
      // stats at all. Mixed talents must still obey checkbox filters.
      if (!hasCheckbox && hasNonCheckbox) return true;
      const srPresence = Build.getSetSilaRazumPresence(stats);

      // If only Razum is selected, reject only pure Sila talents.
      // "Largest stat" aliases (sr/srsv) are allowed.
      if (hasRazumSelected && !hasSilaSelected && srPresence.hasPureSila) return false;
      // If only Sila is selected, reject only pure Razum talents.
      // "Largest stat" aliases (sr/srsv) are allowed.
      if (hasSilaSelected && !hasRazumSelected && srPresence.hasPureRazum) return false;

      // If neither Sila nor Razum is selected, reject talents that are only
      // Sila/Razum-based (including "max between them" aliases like sr/srsv).
      if (!hasSilaSelected && !hasRazumSelected && (srPresence.hasPureSila || srPresence.hasPureRazum || srPresence.hasSrMax)) {
        const nonSrScore = Build.getSetTalentPriorityScore(data, nonSrBases, familyWeights);
        if (nonSrScore <= 0) return false;
      }

      return Build.getSetTalentPriorityScore(data, bases, familyWeights, 10, 3, { dominantSr }) > 0;
    });
  }

  static async applySetToBuild(set) {
    const setIds = TalentSets.getTalentIds(set);
    let ids = Build.sortSetTalentIdsByPriority(setIds);
    ids = Build.filterSetTalentIdsByMatchingStats(ids);
    const simInstalled = Array.isArray(Build.installedTalents) ? Build.installedTalents.slice() : new Array(36).fill(null);
    for (const id of ids) {
      if (Build.isTalentInBuild(id)) continue;
      const data = Build.talents?.[String(id)];
      if (!data) continue;
      if (!data.level || data.level <= 0) continue;

      // Conflict handling: match Build.move() behavior.
      const conflictState = Build.isTalentConflictState(data, simInstalled);
      if (conflictState) {
        Build.notifyTalentConflict();
        continue;
      }

      const emptyIndex = Build.getFirstEmptySlotIndexForLevelIn(simInstalled, data.level);
      if (emptyIndex == null) continue;

      try {
        await App.api.request('build', 'set', {
          buildId: Build.id,
          talentId: data.id,
          index: emptyIndex,
        });

        Build.installedTalents[emptyIndex] = data;
        simInstalled[emptyIndex] = data;

        if (data.active) {
          try {
            if (!Build.isFieldIndexAlreadyInActiveBar(emptyIndex)) {
              const free = Build.findFirstFreeActiveBarIndex();
              if (free !== -1) {
                const position = Number(emptyIndex) + 1;
                await App.api.request('build', 'setActive', {
                  buildId: Build.id,
                  index: free,
                  position: position,
                });
                Build.activeBarItems[free] = position;
              }
            }
          } catch {}
        }
      } catch (e) {
      }
    }

    Build.refreshLocalBuildUiAfterSet(setIds);

  }

  /** Индекс порядка из карты загрузки библиотеки (устойчиво к типу id). */
  static lookupInventoryDefaultOrderIndex(talentIdRaw) {
    try {
      const m = Build._inventoryDefaultOrder;
      if (!m) return null;
      if (talentIdRaw === undefined || talentIdRaw === null) return null;
      const s = String(talentIdRaw).trim();
      if (!s) return null;
      const n = Number(s);
      if (Number.isFinite(n)) {
        const v = m.get(`${n}`);
        if (Number.isFinite(Number(v))) return Number(v);
      }
      const v2 = m.get(s);
      if (Number.isFinite(Number(v2))) return Number(v2);
    } catch {}
    return null;
  }

  /** Проставить data-default-order с карты (новые обёртки после билда часто без него). */
  static attachDefaultOrderDatasetToInventoryContainer(container) {
    try {
      const item = container?.querySelector?.('.build-talent-item');
      const idx = Build.lookupInventoryDefaultOrderIndex(item?.dataset?.id);
      if (idx !== null) container.dataset.defaultOrder = `${idx}`;
    } catch {}
  }

  /** Порядок таланта в библиотеке как при загрузке (не после перестановок сета). */
  static getInventoryContainerDefaultOrder(container) {
    const item = container?.querySelector?.('.build-talent-item');
    const byData = Number(container?.dataset?.defaultOrder);
    if (Number.isFinite(byData)) return byData;
    const fromMap = Build.lookupInventoryDefaultOrderIndex(item?.dataset?.id);
    if (fromMap !== null) return fromMap;
    return Number.MAX_SAFE_INTEGER;
  }

  /** Вернуть узлы библиотеки в исходный порядок (после Alt / сброса режима сета). */
  static reorderInventoryByDefaultOrder() {
    const list = Build.inventoryView?.querySelector('.build-talents');
    if (!list) return;
    const allContainers = Array.from(list.querySelectorAll('.build-talent-item-container'));
    for (const c of allContainers) {
      Build.attachDefaultOrderDatasetToInventoryContainer(c);
    }
    if (allContainers.length < 2) return;
    const sorted = allContainers.slice().sort((a, b) => {
      const da = Build.getInventoryContainerDefaultOrder(a);
      const db = Build.getInventoryContainerDefaultOrder(b);
      if (da !== db) return da - db;
      const ia = Number(a.querySelector('.build-talent-item')?.dataset?.id);
      const ib = Number(b.querySelector('.build-talent-item')?.dataset?.id);
      if (Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ia - ib;
      return 0;
    });
    for (const container of sorted) {
      try {
        list.appendChild(container);
      } catch {}
    }
  }

  static applySetInventoryOrder(set) {
    const list = Build.inventoryView?.querySelector('.build-talents');
    if (!list) return;

    const ids = TalentSets.getTalentIds(set);
    const mode = Build.getSetLmbMode();
    Build._forceShowOnlySetTalentIds = null;
    Build._forceShowOnlyTalentIds = null;

    if (mode === 2 || mode === 3) {
      Build._forceShowOnlySetTalentIds = new Set(ids.map(String));
      Build.refreshForcedSetOnlyTalentIds();
      // Весь сет уже в билде — не оставляем «пустой» фильтр (вся библиотека пропадала без sortInventory).
      if (!Build._forceShowOnlyTalentIds?.size) {
        Build._forceShowOnlySetTalentIds = null;
        Build._forceShowOnlyTalentIds = null;
        Build.sortInventory();
        return;
      }

      const prevScroll = list.scrollTop;

      // Show only leftovers; then rebuild DOM order grouped by build rows (levels 6..1).
      // We preserve the original relative order inside each level group.
      Build.sortInventory();

      const visibleContainers = Array.from(list.querySelectorAll('.build-talent-item-container')).filter((container) => {
        try {
          return container?.style?.display !== 'none';
        } catch {
          return false;
        }
      });

      const byLevel = new Map();
      for (const container of visibleContainers) {
        const item = container.querySelector('.build-talent-item');
        const talentId = item?.dataset?.id ? String(item.dataset.id) : null;
        if (!talentId) continue;
        const level = Number(Build.talents?.[talentId]?.level) || 0;
        if (!byLevel.has(level)) byLevel.set(level, []);
        byLevel.get(level).push(container);
      }

      const orderedLevels = [6, 5, 4, 3, 2, 1, 0];
      const ordered = [];
      for (const lvl of orderedLevels) {
        const part = byLevel.get(lvl);
        if (part?.length) ordered.push(...part);
      }

      for (const container of ordered) {
        try {
          if (container.parentNode === list) list.removeChild(container);
        } catch {}
      }
      for (const container of ordered) {
        try {
          list.appendChild(container);
        } catch {}
      }

      try {
        list.scrollTop = prevScroll;
      } catch {}
      return;
    }
    Build._forceShowOnlySetTalentIds = null;

    Build.sortInventory();
    const allContainers = Array.from(list.querySelectorAll('.build-talent-item-container'));
    const setContainers = [];
    const setContainerKeys = new Set();
    for (const id of ids) {
      if (Build.isTalentInBuild(id)) continue;
      const el = list.querySelector(`.build-talent-item[data-id="${id}"]`);
      if (!el) continue;
      const container = el.closest('.build-talent-item-container');
      if (!container) continue;
      if (container.style.display === 'none') continue;
      const key = `${Number(id)}`;
      if (setContainerKeys.has(key)) continue;
      setContainerKeys.add(key);
      setContainers.push(container);
    }
    const restContainers = allContainers.filter((container) => {
      const item = container?.querySelector?.('.build-talent-item');
      const id = `${Number(item?.dataset?.id)}`;
      return !setContainerKeys.has(id);
    });
    restContainers.sort(
      (a, b) => Build.getInventoryContainerDefaultOrder(a) - Build.getInventoryContainerDefaultOrder(b),
    );
    const ordered = [...setContainers, ...restContainers];
    for (const container of ordered) {
      try {
        list.appendChild(container);
      } catch {}
    }
    try {
      list.scrollTop = 0;
    } catch {}
  }

  static async removeSetFromBuild(set) {
    const ids = TalentSets.getTalentIds(set);
    for (const id of ids) {
      const setTalentIdNum = Number(id);
      for (let index = 0; index < (Build.installedTalents || []).length; index++) {
        const t = Build.installedTalents[index];
        if (!t) continue;
        const installedIdNum = Number(t.id);
        if (Number.isFinite(setTalentIdNum) && Number.isFinite(installedIdNum)) {
          if (installedIdNum !== setTalentIdNum) continue;
        } else if (`${t.id}` !== `${id}`) {
          continue;
        }

        try {
          await Build.removeTalentFromActiveByFieldIndex(index);
        } catch {}

        try {
          await App.api.request('build', 'setZero', { buildId: Build.id, index });
          Build.installedTalents[index] = null;
        } catch (e) {}
      }
    }

    Build.refreshLocalBuildUiAfterSet(ids, set);

  }

  static tryBeginSetAction() {
    if (Build._setActionInProgress) return false;
    Build._setActionInProgress = true;
    return true;
  }

  static endSetAction() {
    Build._setActionInProgress = false;
  }

  static renderTalentSetsList() {
    if (!Build.setsListView) return;
    Build.setsListView.replaceChildren();
    Build._renderedSetEntries = [];

    if (!Build._setsHoverMonitorInstalled) {
      Build._setsHoverMonitorInstalled = true;
      let lastCheck = 0;
      document.addEventListener(
        'mousemove',
        (e) => {
          const anchor = Build._hoveredSetAnchorEl;
          if (!anchor) return;
          const now = performance.now();
          if (now - lastCheck < 80) return;
          lastCheck = now;
          const below = document.elementFromPoint(e.clientX, e.clientY);
          const hoveredSet = below?.closest?.('.build-set-item');
          if (hoveredSet === anchor) return;
          Build.descriptionView.style.display = 'none';
          Build._descriptionPinnedBySet = false;
          Build._hoveredSetTalentIds = null;
          Build._hoveredSetAnchorEl = null;
          Build.clearSetHighlights();
        },
        { passive: true },
      );
    }

    const sets = TalentSets.list();
    for (const set of sets) {
      const mainId = TalentSets.chooseMainTalentId(set);
      if (mainId == null) continue;
      const src = `content/talents/${mainId}.webp`;

      const item = DOM({ style: 'build-set-item' });
      item.style.backgroundImage = `url("${src}")`;
      if (Build.shouldShowMmtestIds()) {
        const rawSetId = String(set?.key || '').match(/setId_(\d+)/);
        const numericSetId = Number(rawSetId?.[1]);
        if (Number.isFinite(numericSetId)) {
          item.dataset.mmtestId = String(numericSetId);
        }
      }
      Build._renderedSetEntries.push({ set, item });

      const ids = TalentSets.getTalentIds(set);
      item.addEventListener('mouseenter', () => {
        if (Build._setsHoverSuppressed) return;
        Build.showSetDescription(set, item);
        Build._hoveredSetTalentIds = ids;
        Build._hoveredSetAnchorEl = item;
        Build.highlightSetTalents(ids);
        Build.previewSetTalentsInEmptySlots(set);
      });
      item.addEventListener('mouseleave', () => {
        // After set click, transient mouseleave can happen during fast rerender.
        // Keep current hover visuals pinned; global mousemove monitor will clear on real leave.
        if (Build._descriptionPinnedBySet && Build._hoveredSetAnchorEl === item) return;
        Build.descriptionView.style.display = 'none';
        Build._descriptionPinnedBySet = false;
        Build._hoveredSetTalentIds = null;
        Build._hoveredSetAnchorEl = null;
        Build.clearSetHighlights();
      });
      item.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          Sound.play(SOUNDS_LIBRARY.CLICK, { id: 'ui-set-down', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });
          Sound.play(SOUNDS_LIBRARY.CLICK_BUTTON_PRESS_SMALL, { id: 'ui-set-up', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });
        } catch {}
        if (!Build.tryBeginSetAction()) return;
        (async () => {
          try {
            Build.setSelectedSetItem(item);
            const mode = Build.getSetLmbMode();
            Build._descriptionPinnedBySet = true;
            Build._hoveredSetTalentIds = ids;
            Build._forceShowTalentIds = mode === 1 ? new Set(ids.map(String)) : null;
            Build._forceShowOnlySetTalentIds = null;
            Build._forceShowOnlyTalentIds = null;

            if (mode === 2) {
              Build._forceShowOnlySetTalentIds = new Set(ids.map(String));
              Build._forceShowOnlyTalentIds = new Set();
            } else if (mode === 3) {
              Build.applySetInventoryOrder(set);
            }
            if (mode !== 3) {
              await Build.applySetToBuild(set);
              Build.applySetInventoryOrder(set);
            } else {
              Build.applySetInventoryOrder(set);
            }
            Build.refreshSetHoverState(set, item, ids, true);
          } finally {
            Build.endSetAction();
          }
        })();
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (Build.combatModeEnabled) return;
        try {
          Sound.play(SOUNDS_LIBRARY.CLICK, { id: 'ui-set-down', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });
        } catch {}
        if (!Build.tryBeginSetAction()) return;
        (async () => {
          try {
            Build.setSelectedSetItem(item);
            const mode = Build.getSetLmbMode();
            Build._hoveredSetTalentIds = ids;
            Build._forceShowTalentIds = mode === 1 ? new Set(ids.map(String)) : null;
            Build._forceShowOnlySetTalentIds = null;
            Build._forceShowOnlyTalentIds = null;
            Build.applySetInventoryOrder(set);
            await Build.removeSetFromBuild(set);
            Build.refreshSetHoverState(set, item, ids);
          } finally {
            Build.endSetAction();
          }
        })();
      });

      Build.setsListView.append(item);
    }
    if (Build._statFilterHoverRowKey) {
      Build.applyStatFilterHoverHighlightOnSets(Build._statFilterHoverRowKey);
    }
  }

  static rarity() {
    const element = [
      { id: '4', name: Lang.text('titleTheRed'), color: '170,20,44' },
      { id: '3', name: Lang.text('titleTheOrange'), color: '237,129,5' },
      { id: '2', name: Lang.text('titleThePurple'), color: '205,0,205' },
      { id: '1', name: Lang.text('titleTheBlue'), color: '17,105,237' },
    ];
    const rarityImageBaseById = {
      4: 'red',
      3: 'orange',
      2: 'purple',
      1: 'blue',
    };
    const applyActiveFilterVisualByState = (button, isActive) => {
      if (!button) return;
      const suffix = isActive ? 'Show' : 'NoShow';
      button.style.backgroundImage = `url("content/img/active${suffix}.png")`;
      button.style.backgroundColor = 'transparent';
      button.style.backgroundRepeat = 'no-repeat';
      button.style.backgroundPosition = 'center';
      button.style.backgroundSize = 'cover';
      button.style.filter = isActive
        ? 'brightness(1.04) saturate(2.02) drop-shadow(0 0 0.45cqh rgba(255,255,255,0.35))'
        : 'none';
    };
    const applyRarityVisualByState = (button, rarityId, isActive) => {
      const base = rarityImageBaseById[Number(rarityId)];
      if (!base || !button) return;
      const suffix = isActive ? 'Show' : 'NoShow';
      button.style.backgroundImage = `url("content/img/${base}${suffix}.png")`;
      button.style.backgroundColor = 'transparent';
      button.style.backgroundRepeat = 'no-repeat';
      button.style.backgroundPosition = 'center';
      button.style.backgroundSize = 'cover';
    };

    let a = document.createElement('div');
    a.title = Lang.text('titleActiveTalents');

    a.classList.add('build-rarity-other');

    a.innerText = '';

    a.dataset.active = 0;
    applyActiveFilterVisualByState(a, false);

    a.addEventListener('click', (e) => {
      Sound.play(SOUNDS_LIBRARY.CLICK_BUTTON_PRESS_SMALL, {
        id: 'ui-small-click',
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
      if (a.dataset.active == 1) {
        Build.removeSortInventory('active', '1');

        Build.sortInventory();

        a.dataset.active = 0;
        applyActiveFilterVisualByState(a, false);
      } else {
        Build.setSortInventory('active', '1');

        Build.sortInventory();

        a.dataset.active = 1;
        applyActiveFilterVisualByState(a, true);
      }
    });

    a.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      Sound.play(SOUNDS_LIBRARY.CLICK_BUTTON_PRESS_SMALL, {
        id: 'ui-small-click',
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });

      for (let itemEl of element) {
        Build.removeSortInventory('rarity', itemEl.id);
      }

      for (let l = 0; l < a.parentElement.childNodes.length; l++) {
        const node = a.parentElement.childNodes[l];
        node.dataset.active = 0;
        node.style.border = 'none';
        if (node !== a) {
          applyRarityVisualByState(node, node?.dataset?.rarityId, false);
        }
      }
      applyActiveFilterVisualByState(a, false);

      Build.setSortInventory('active', '1');

      Build.sortInventory();

      a.dataset.active = 1;
      applyActiveFilterVisualByState(a, true);
    });

    Build.rarityView.append(a);

    for (let item of element) {
      let button = document.createElement('div');

      button.dataset.active = 0;

      button.style.boxSizing = 'border-box';
      button.dataset.rarityId = item.id;

      button.addEventListener('click', (e) => {
        Sound.play(SOUNDS_LIBRARY.CLICK_BUTTON_PRESS_SMALL, {
          id: 'ui-small-click',
          volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
        });
        if (button.dataset.active == 1) {
          button.style.border = 'none';

          Build.removeSortInventory('rarity', item.id);

          Build.sortInventory();

          button.dataset.active = 0;
          applyRarityVisualByState(button, item.id, false);
        } else {
          button.style.border = 'none';

          Build.setSortInventory('rarity', item.id);

          Build.sortInventory();

          button.dataset.active = 1;
          applyRarityVisualByState(button, item.id, true);
        }
      });

      button.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        for (let itemEl of element) {
          Build.removeSortInventory('rarity', itemEl.id);
        }
        Build.removeSortInventory('active', '1');

        for (let l = 0; l < button.parentElement.childNodes.length; l++) {
          const node = button.parentElement.childNodes[l];
          node.dataset.active = 0;
          node.style.border = 'none';
          if (node !== a) {
            applyRarityVisualByState(node, node?.dataset?.rarityId, false);
          }
        }
        applyActiveFilterVisualByState(a, false);

        Build.setSortInventory('rarity', item.id);

        Build.sortInventory();

        button.dataset.active = 1;

        button.style.border = 'none';
        applyRarityVisualByState(button, item.id, true);
      });

      applyRarityVisualByState(button, item.id, false);

      button.title = Lang.text('talentQualityTitle').replace('{name}', item.name);

      Build.rarityView.append(button);
    }
  }

  static async removeTalentFromActive(activeId) {
    let container = Build.activeBarView.childNodes[activeId];

    Build.disableSmartCast(container);
    container.firstChild.remove();

    Build.activeBarItems[activeId] = 0;
    await App.api.request('build', 'setZeroActive', {
      buildId: Build.id,
      index: activeId,
    });
  }

  static async requestSmartcast(element) {
    if (element.firstChild) {
      let position = Number(element.firstChild.dataset.position) + 1;
      if (element.dataset.active == 1) {
        position = -position;
      }

      await App.api.request('build', 'setActive', {
        buildId: Build.id,
        index: element.dataset.index,
        position: position,
      });
    }
  }

  static async enableSmartCast(element, sendRequest) {
    element.classList.add('smartcast');
    element.dataset.active = 1;
    element.title = Lang.text('titleSmartcastIsEnabled');
    if (sendRequest) {
      await Build.requestSmartcast(element);
    }
  }

  static async disableSmartCast(element, sendRequest) {
    element.classList.remove('smartcast');
    element.dataset.active = 0;
    element.title = Lang.text('titleSmartcastIsDisabled');
    if (sendRequest) {
      await Build.requestSmartcast(element);
    }
  }

  static activeBar(data) {
    Build.activeBarItems = data;

    console.log('activeBar', data);

    try {
      Build.activeBarView?.replaceChildren();
    } catch {}
    try {
      Build.activeBarKeybindingsView?.replaceChildren();
    } catch {}

    let index = 0;

    for (let item of data) {
      const element = DOM({
        domaudio: domAudioPresets.defaultButton,
        data: { index: index },
        style: 'build-active-bar-item',
        event: [
          'contextmenu',
          async (e) => {
            e.preventDefault();
            if (!element.firstChild) {
              return;
            }

            if (element.dataset.active == 1) {
              await Build.disableSmartCast(element, true);
            } else {
              await Build.enableSmartCast(element, true);
            }
          },
        ],
      });

      if (item >= 0) {
        element.dataset.active = 0;
      } else {
        Build.enableSmartCast(element);
      }

      const keyName = Build.getKeyName(index);

      if (Math.abs(item)) {
        let position = Math.abs(item) - 1;
        let findTalent = Build.fieldView.querySelector(`[data-position = "${position}"]`);

        if (findTalent && findTalent.firstChild) {
          let clone = findTalent.firstChild.cloneNode(true);
          element.append(clone);

          clone.dataset.state = 3;
          clone.style.opacity = 1;
          clone.style.position = 'static';
          clone.style.backgroundImage = `url("${clone.dataset.url}")`;
          clone.dataset.position = position;
          Build.move(clone, true);
        }
      }

      Build.activeBarView.append(element);

      // Keep key-label alignment: always append an element per slot.
      // If no key is assigned, we render an empty text node.
      const keyElement = DOM({ style: 'build-active-bar-key' }, keyName || '');
      Build.activeBarKeybindingsView.append(keyElement);

      index++;
    }
  }

  static getKeyName(index) {
    try {
      const bind = Build.binds?.[index];
      const keys = bind?.keys;
      if (!Array.isArray(keys) || !keys.length) return '';
      return keys.join('+');
    } catch {
      return '';
    }
	
  }

  static setSortInventory(key, value) {
    Build._forceShowTalentIds = null;
    Build._forceShowOnlySetTalentIds = null;
    Build._forceShowOnlyTalentIds = null;
    if (!(key in Build.ruleSortInventory)) {
      Build.ruleSortInventory[key] = new Array();

      Build.ruleSortInventory[key].push(value);
    } else {
      if (!Build.ruleSortInventory[key].includes(value)) {
        Build.ruleSortInventory[key].push(value);
      }
    }

    // Build.sortInventory();
  }

  static removeSortInventory(key, value) {
    Build._forceShowTalentIds = null;
    Build._forceShowOnlySetTalentIds = null;
    Build._forceShowOnlyTalentIds = null;
    if (key in Build.ruleSortInventory) {
      let newArray = new Array();

      for (let item of Build.ruleSortInventory[key]) {
        if (item != value) {
          newArray.push(item);
        }
      }

      if (newArray.length) {
        Build.ruleSortInventory[key] = newArray;
      } else {
        delete Build.ruleSortInventory[key];
      }

      // Build.sortInventory();
    }
  }

  static applySorting(itemContainer) {
    let item = itemContainer.firstChild;

    let data = Build.talents[item.dataset.id],
      flag = true;

    try {
      // Сначала: в билде — никогда не показывать в библиотеке (в т.ч. при режиме «остаток сета» и после Alt).
      const tid0 = item?.dataset?.id;
      if (tid0 != null && `${tid0}` !== '' && Build.isTalentInBuild(tid0)) {
        itemContainer.style.display = 'none';
        itemContainer.style.gridRow = '';
        return;
      }

      // Пустой Set — не режим «только остаток сета» (иначе скрывается вся библиотека).
      if (Build._forceShowOnlyTalentIds && Build._forceShowOnlyTalentIds.size > 0) {
        const id = String(item.dataset.id);
        const visible = Build._forceShowOnlyTalentIds.has(id);
        itemContainer.style.display = visible ? 'block' : 'none';
        if (visible) {
          const level = Number(Build.talents?.[id]?.level) || 0;
          // Build rows are rendered from 6 -> 1 (top -> bottom), mirror this in library.
          const row = level > 0 ? 7 - level : 1;
          itemContainer.style.gridRow = `${row}`;
        } else {
          itemContainer.style.gridRow = '';
        }
        return;
      }
      itemContainer.style.gridRow = '';
      if (Build._forceShowTalentIds && Build._forceShowTalentIds.has(String(item.dataset.id))) {
        itemContainer.style.display = 'block';
        return;
      }
    } catch {}

    if (data.level == 0) {
      itemContainer.style.display = 'none';
      return;
    }

    for (let key in Build.ruleSortInventory) {
      if (!(key in data)) {
        flag = false;

        break;
      }

      if (key == 'stats') {
        let foundStat = false;

        if (!data.stats) {
          flag = false;

          break;
        }

        for (let stat of Build.ruleSortInventory.stats) {
          if (stat in data.stats) {
            foundStat = true;
          }
        }

        if (!foundStat) {
          flag = false;

          break;
        }
      } else {
        if (!Build.ruleSortInventory[key].includes(`${data[key]}`)) {
          flag = false;

          break;
        }
      }
    }

    if (flag) {
      itemContainer.style.display = 'block';
    } else {
      itemContainer.style.display = 'none';
    }
  }

  static sortInventory() {
    Build.refreshForcedSetOnlyTalentIds();
    for (let itemContainer of Build.inventoryView.querySelectorAll('.build-talent-item-container')) {
      Build.applySorting(itemContainer);
    }
  }

  static syncMmtestTalentIdBadges() {
    const shouldShow = Build.shouldShowMmtestIds();
    const syncHost = (host) => {
      if (!host) return;
      if (!shouldShow) {
        delete host.dataset.mmtestId;
        return;
      }
      const talentNode = host.querySelector('.build-talent-item');
      const talentId = Number(talentNode?.dataset?.id);
      if (Number.isFinite(talentId) && talentId !== 0) {
        host.dataset.mmtestId = String(talentId);
      } else {
        delete host.dataset.mmtestId;
      }
    };
    for (const container of Build.inventoryView?.querySelectorAll?.('.build-talent-item-container') || []) {
      syncHost(container);
    }
    for (const cell of Build.fieldView?.querySelectorAll?.('.build-hero-grid-item') || []) {
      syncHost(cell);
    }
  }

  static refreshLocalBuildUiAfterSet(ids, set = null) {
    try {
      Build.updateHeroStats();
    } catch {}
    try {
      Build.rebuildFieldConflictFromInstalledTalents();
      Build.syncFieldSlotsFromInstalledTalents();
      Build.activeBar(Array.isArray(Build.activeBarItems) ? Build.activeBarItems : new Array(24).fill(0));
      Build.ensureTalentIdsPresentInInventory(ids);
      Build.sortInventory();
      Build.syncMmtestTalentIdBadges();
      if (set) Build.applySetInventoryOrder(set);
    } catch {}
  }

  static rebuildFieldConflictFromInstalledTalents() {
    Build.fieldConflict = new Object();
    for (const talent of Build.installedTalents || []) {
      if (!talent) continue;
      if ('conflict' in talent) {
        Build.fieldConflict[Math.abs(talent.id)] = true;
      }
    }
  }

  static syncFieldSlotsFromInstalledTalents() {
    for (let index = 0; index < 36; index++) {
      const cell = Build.fieldView?.querySelector?.(`.build-hero-grid-item[data-position="${index}"]`);
      if (!cell) continue;
      const currentEl = cell.querySelector('.build-talent-item');
      const expectedTalent = Build.installedTalents?.[index] || null;
      const currentId = currentEl ? Number(currentEl.dataset.id) : null;
      const expectedId = expectedTalent ? Number(expectedTalent.id) : null;
      if (currentEl && expectedTalent && currentId === expectedId) continue;
      if (currentEl) {
        try {
          currentEl.remove();
        } catch {}
      }
      if (!expectedTalent) continue;
      const view = Build.templateViewTalent({ ...expectedTalent, state: 2 });
      const preload = new PreloadImages(cell);
      preload.add(view, cell);
    }
    Build.syncMmtestTalentIdBadges();
  }

  static ensureTalentIdsPresentInInventory(ids) {
    const list = Build.inventoryView?.querySelector('.build-talents');
    if (!list || !Array.isArray(ids)) return;
    const normalizeId = (v) => {
      const n = Number(v);
      if (Number.isFinite(n)) return `${n}`;
      return `${v}`;
    };
    const existing = new Map();
    for (const item of Array.from(list.querySelectorAll('.build-talent-item'))) {
      const id = item?.dataset?.id;
      if (!id) continue;
      const key = normalizeId(id);
      const container = item.closest('.build-talent-item-container');
      if (!container) continue;
      if (existing.has(key)) {
        try { container.remove(); } catch {}
        continue;
      }
      existing.set(key, container);
    }
    const uniqueIds = new Set((ids || []).map((id) => normalizeId(id)));
    for (const key of uniqueIds) {
      if (Build.isTalentInBuild(key)) continue;
      if (existing.has(key)) continue;
      const data = Build.talents?.[key] || Build.talents?.[String(key)];
      if (!data) continue;
      const talentContainer = DOM({ style: 'build-talent-item-container' });
      const preload = new PreloadImages(talentContainer);
      const talentView = Build.templateViewTalent({ ...data, state: 1 });
      preload.add(talentView);
      list.append(talentContainer);
      Build.attachDefaultOrderDatasetToInventoryContainer(talentContainer);
      existing.set(key, talentContainer);
    }
    Build.syncMmtestTalentIdBadges();
  }

  static refreshForcedSetOnlyTalentIds() {
    if (!Build._forceShowOnlySetTalentIds) {
      // Без активного сета не держим «остаток» — иначе после Alt/sortInventory остаётся устаревший фильтр.
      Build._forceShowOnlyTalentIds = null;
      return;
    }
    const leftovers = new Set();
    for (const id of Build._forceShowOnlySetTalentIds) {
      if (Build.isTalentInBuild(id)) continue;
      leftovers.add(String(id));
    }
    Build._forceShowOnlyTalentIds = leftovers;
  }

  static attachAltResetHintBelowInventory() {
    try {
      const hint = Build.altResetHintView;
      const inv = Build.inventoryView;
      const parent = inv?.parentElement;
      if (!hint || !inv || !parent) {
        requestAnimationFrame(() => Build.attachAltResetHintBelowInventory());
        return;
      }
      if (hint.parentNode !== parent || hint.previousSibling !== inv) {
        inv.insertAdjacentElement('afterend', hint);
      }
    } catch {}
  }

  static resetSetForcedLibraryView() {
    Build._forceShowTalentIds = null;
    Build._forceShowOnlySetTalentIds = null;
    Build._forceShowOnlyTalentIds = null;
    Build.clearSelectedSetItem();
    try {
      Build._descriptionPinnedBySet = false;
      Build._hoveredSetTalentIds = null;
      Build._hoveredSetAnchorEl = null;
      Build.clearSetHighlights();
      Build.clearEmptySlotPreviews();
      if (Build.descriptionView) Build.descriptionView.style.display = 'none';
    } catch {}
    try {
      Build.sortInventory();
      Build.reorderInventoryByDefaultOrder();
    } catch {}
  }

  static installAltResetHandler() {
    try {
      if (Build._altResetHandler) {
        window.removeEventListener('keydown', Build._altResetHandler, true);
      }
    } catch {}

    Build._altResetHandler = (e) => {
      const isAlt = e?.key === 'Alt' || e?.code === 'AltLeft' || e?.code === 'AltRight';
      if (!isAlt || e?.repeat) return;
      Build.resetSetForcedLibraryView();
    };

    try {
      window.addEventListener('keydown', Build._altResetHandler, true);
    } catch {}
  }

  static cancelSortInventory() {
    Build.ruleSortInventory = new Object();

    for (let item of Build.inventoryView.children) {
      item.style.display = 'block';
    }
  }

  static move(element, fromActiveBar) {
    let elementFromPoint = (x, y) => {
      let elems = document.elementsFromPoint(x, y);
      if (!elems || elems.length === 0) return document.body;
      if (elems[0] && elems[0].className == 'build-level') return elems[1] || elems[0];
      return elems[0] || document.body;
    };
    let elementSetDisplay = (element, display) => {
      if (element.parentElement.classList == 'build-talent-item-container') {
        element.parentElement.style.display = display;
      }
      element.style.display = display;
    };

    element.onmousedown = (event) => {
      if (event.button != 0) return;
      if (Build.combatModeEnabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      let moveStart = Date.now();
      if (!Build._descriptionPinnedBySet) Build.descriptionView.style.display = 'none';

      if (!Build._hoveredSetTalentIds) Build.clearSetHighlights();
      try {
        const hadStatHover = element.classList.contains('build-stat-filter-hover');
        element.classList.remove('build-set-highlight', 'build-set-highlight-lib', 'build-stat-filter-hover');
        if (hadStatHover) Build.refreshStatFilterHighlightCountDisplay();
      } catch {}

      let data = Build.talents[element.dataset.id];
      if (!data || typeof data.level !== 'number') {
        return;
      }
      let fieldRow = document.getElementById(`bfr${data.level}`);

      if (!fromActiveBar) {
        if (fieldRow) {
          fieldRow.style.background = 'rgba(255,255,255,0.5)';
          fieldRow.style.borderRadius = '1cqh';
        }
      }

      // Фикс для transform
      element.style.transformOrigin = 'center center';
      element.style.willChange = 'transform';
      element.style.setProperty('transform', 'scale(1.1)', 'important');
      element.style.transition = 'transform 0.1s ease';

      let shiftX = 0;
      let shiftY = 0;

      const startRect = element.getBoundingClientRect();
      shiftX = event.clientX - startRect.left;
      shiftY = event.clientY - startRect.top;

      element.style.zIndex = '9999';
      element.style.position = 'fixed';
      element.style.left = event.clientX - shiftX + 'px';
      element.style.top = event.clientY - shiftY + 'px';

      elementSetDisplay(element, 'none');
      let startingElementBelow = elementFromPoint(event.clientX, event.clientY);
      elementSetDisplay(element, 'block');

      document.onmousemove = (e) => {
        element.style.left = e.clientX - shiftX + 'px';
        element.style.top = e.clientY - shiftY + 'px';
      };

      element.onmouseup = async (event) => {
        // Возвращаем исходный размер
        element.style.setProperty('transform', 'scale(1)', 'important');

        let moveEnd = Date.now();
        let isClick = moveEnd - moveStart < 200;

        document.onmousemove = null;
        element.onmouseup = null;

        let field = Build.fieldView.getBoundingClientRect();
        let inventory = Build.inventoryView.getBoundingClientRect();
        let bar = Build.activeBarView.getBoundingClientRect();
        let target = element.getBoundingClientRect();

        let left = parseInt(element.style.left) + target.width / 2;
        let top = parseInt(element.style.top) + target.height / 2;

        let isFieldTarget = left > field.x && left < field.x + field.width && top > field.y && top < field.y + field.height;
        let isInventoryTarget =
          left > inventory.x && left < inventory.x + inventory.width && top > inventory.y && top < inventory.y + inventory.height;
        let isActiveBarTarget = left > bar.x && left < bar.x + bar.width && top > bar.y && top < bar.y + bar.height;

        if (isClick && (isFieldTarget || (isActiveBarTarget && fromActiveBar))) {
          elementSetDisplay(element, 'none');
          let elemBelow = elementFromPoint(event.clientX, event.clientY);
          elementSetDisplay(element, 'block');
          isClick = elemBelow == startingElementBelow;
        }
        if (isClick) {
          if (element.dataset.state == 2) {
            isFieldTarget = false;
            isInventoryTarget = true;
            isActiveBarTarget = false;
          } else if (element.dataset.state == 1 && data.level > 0) {
            let hasEmptySpace = false;
            for (let t = (data.level - 1) * 6; t < data.level * 6; t++) {
              if (!Build.installedTalents[35 - t]) {
                hasEmptySpace = true;

                break;
              }
            }
            if (hasEmptySpace) {
              isFieldTarget = true;
              isInventoryTarget = false;
              isActiveBarTarget = false;
            }
          }
        }

        if (Build._hoveredSetTalentIds) {
          Build.highlightSetTalents(Build._hoveredSetTalentIds);
          Build.previewSetTalentsInEmptySlots({ _manualOrder: Build._hoveredSetTalentIds, key: 'hover_preview_move' });
        }
        else Build.clearSetHighlights();

        let removeFromActive = async (position, skipActiveId) => {
          for (let i = 0; i < Build.activeBarItems.length; i++) {
            const talPos = Math.abs(Build.activeBarItems[i]) - 1;
            if (talPos == position && i != skipActiveId) {
              await Build.removeTalentFromActive(i);
            }
          }
        };

        let addToActive = async (index, position, datasetPosition, targetElem, clone, smartCast) => {
          Build.activeBarItems[index] = position;
          targetElem.append(clone);
          clone.style.position = 'static';
          clone.style.zIndex = 1;

          clone.dataset.position = datasetPosition;
          clone.dataset.state = 3;
          clone.style.opacity = 1;
          clone.style.zIndex = 1;
          clone.style.position = 'static';

          Build.move(clone, true);

          if (smartCast) {
            try {
              await Build.enableSmartCast(targetElem, false);
            } catch {}
          }

          try {
            await App.api.request('build', 'setActive', {
              buildId: Build.id,
              index: index,
              position: position,
            });
            if (smartCast) {
              try {
                await Build.requestSmartcast(targetElem);
              } catch {}
            }
          } catch {
            try {
              await Build.refreshBuildStateFromServer({ refreshInventory: true });
            } catch {}
          }
        };

        let editActive = async (position, newPosition, clone, skipActiveId) => {
          if (position == newPosition) {
            clone.remove();
            return null;
          }

          let activeBarPosition = -1;
          for (let i = 0; i < Build.activeBarItems.length; i++) {
            const talPos = Math.abs(Build.activeBarItems[i]) - 1;
            if (talPos == position && i != skipActiveId) {
              activeBarPosition = i;
              break;
            }
          }
          if (activeBarPosition == -1) {
            clone.remove();
            return null;
          }

          let container = Build.activeBarView.childNodes[activeBarPosition];

          let isSmartCast = Number(container.dataset.active);

          let activePosition = Number(newPosition) + 1;

          let glone = container.firstChild.cloneNode(true);

          await removeFromActive(position, skipActiveId);

          await addToActive(activeBarPosition, activePosition, newPosition, container, clone, isSmartCast);

          return activeBarPosition;
        };

        if (isFieldTarget && !fromActiveBar) {
          elementSetDisplay(element, 'none');

          let elemBelow = elementFromPoint(event.clientX, event.clientY);

          if (elemBelow.childNodes[0] && elemBelow.childNodes[0].className == 'build-talent-item') {
            // Select 'build-talent-item' if selected its parent
            elemBelow = elemBelow.childNodes[0];
          }

          let swapParentNode = element.parentNode;
          let performSwap = false;
          let performSwapFromLibrary = false;

          if (elemBelow.className == 'build-talent-item' && elemBelow.parentElement.className == 'build-hero-grid-item') {
            elemBelow = elemBelow.parentElement;
            performSwap = swapParentNode.dataset.position ? true : false;
            performSwapFromLibrary = !performSwap;
          }

          if (isClick && data.level > 0) {
            let talentsInRow = document.getElementsByClassName('build-field-row')[6 - data.level].childNodes;
            for (let tal in talentsInRow) {
              if (talentsInRow[tal].childNodes.length == 0) {
                elemBelow = talentsInRow[tal];
                break;
              }
            }
          }

          elementSetDisplay(element, 'block');

          if (elemBelow && elemBelow.className == 'build-hero-grid-item') {
            if (data.level && elemBelow.parentNode.dataset.level == data.level) {
              let conflictState = Build.isTalentConflictState(data, Build.installedTalents);
              if (conflictState) Build.notifyTalentConflict();

              if (!conflictState) {
                if ('conflict' in data) {
                  Build.fieldConflict[Math.abs(data.id)] = true;
                }

                let prevState = element.dataset.state;
                element.dataset.state = 2;

                let swappingTal = null;
                let removeContainerAfterMove = false;
                if (performSwap) {
                  swappingTal = Build.installedTalents[parseInt(swapParentNode.dataset.position)];
                  let swappedTal = Build.installedTalents[parseInt(elemBelow.dataset.position)];
                  Build.installedTalents[parseInt(elemBelow.dataset.position)] = swappingTal;
                  Build.installedTalents[parseInt(swapParentNode.dataset.position)] = swappedTal;

                  swapParentNode.append(elemBelow.firstChild);
                  elemBelow.append(element);
                } else {
                  if (performSwapFromLibrary) {
                    swappingTal = Build.installedTalents[parseInt(elemBelow.dataset.position)];
                    if (Build.isMainHeroClassTalent(swappingTal)) {
                      App.notify(Lang.text('mainHeroClassTalentLocked'));
                      elementSetDisplay(element, 'block');
                      fieldRow.style.background = '';
                      element.style.position = 'static';
                      element.style.zIndex = 'auto';
                      return;
                    }
                  }
                  Build.installedTalents[parseInt(elemBelow.dataset.position)] = data;
                  Build.installedTalents[parseInt(swapParentNode.dataset.position)] = null;

                  elemBelow.append(element);
                  if (performSwapFromLibrary) {
                    swapParentNode.prepend(elemBelow.firstChild);
                  } else {
                    if (swapParentNode.classList == 'build-talent-item-container') {
                      removeContainerAfterMove = true;
                    }
                  }
                }

                try {
                  let activeBarPosition = null;
                  if (data.active && swapParentNode.dataset.position) {
                    activeBarPosition = await editActive(
                      swapParentNode.dataset.position,
                      elemBelow.dataset.position,
                      element.cloneNode(true),
                    );
                  }
                  if (performSwap) {
                    let swappedTalent = Build.installedTalents[parseInt(swapParentNode.dataset.position)];

                    if (swappedTalent.active) {
                      await editActive(
                        elemBelow.dataset.position,
                        swapParentNode.dataset.position,
                        swapParentNode.firstChild.cloneNode(true),
                        activeBarPosition,
                      );
                    }
                    await App.api.request('build', 'setZero', {
                      buildId: Build.id,
                      index: swapParentNode.dataset.position,
                    });
                    await App.api.request('build', 'set', {
                      buildId: Build.id,
                      talentId: swappedTalent.id,
                      index: swapParentNode.dataset.position,
                    });

                    Build.setStat(data, true, false);
                  } else {
                    if (performSwapFromLibrary) {
                      if (swappingTal.active) {
                        await removeFromActive(elemBelow.dataset.position);
                      }
                      swapParentNode.firstChild.dataset.state = 1;
                      await App.api.request('build', 'setZero', {
                        buildId: Build.id,
                        index: elemBelow.dataset.position,
                      });
                    }
                    Build.setStat(data, true);
                  }

                  await App.api.request('build', 'set', {
                    buildId: Build.id,
                    talentId: data.id,
                    index: elemBelow.dataset.position,
                  });

                  if (data.active && prevState != element.dataset.state) {
                    let index = -1;
                    for (let i = 0; i < Build.activeBarItems.length; i++) {
                      if (Build.activeBarItems[i] == 0) {
                        index = i;
                        break;
                      }
                    }
                    if (index != -1) {
                      let targetActiveContainer = Build.activeBarView.childNodes[index];
                      await addToActive(
                        index,
                        Number(elemBelow.dataset.position) + 1,
                        elemBelow.dataset.position,
                        targetActiveContainer,
                        element.cloneNode(true),
                      );
                    }
                  }
                } catch (e) {
                  element.dataset.state = 1;

                  const invList = Build.inventoryView?.querySelector('.build-talents');
                  if (invList) {
                    const container = element.closest('.build-talent-item-container');
                    if (container && container.parentNode) {
                      invList.prepend(container);
                    } else {
                      const wrapped = DOM({ style: 'build-talent-item-container' }, element);
                      Build.attachDefaultOrderDatasetToInventoryContainer(wrapped);
                      Build.applySorting(wrapped);
                      invList.prepend(wrapped);
                    }
                  }

                  Build.installedTalents[parseInt(elemBelow.dataset.position)] = null;
                }

                if (removeContainerAfterMove) {
                  swapParentNode.remove();
                }
              }
            }
          }
        } else if (isInventoryTarget && !fromActiveBar) {
          elementSetDisplay(element, 'none');

          let elemBelow = elementFromPoint(event.clientX, event.clientY);

          if (isClick) {
            elemBelow = document.getElementsByClassName('build-talents')[0].firstChild;
          }

          elementSetDisplay(element, 'block');

          let targetElement = elemBelow.parentNode;

          if (targetElement.className == 'build-talent-item-container') {
            targetElement = targetElement.parentNode;
          }

          if (elemBelow && targetElement.className == 'build-talents' && element.dataset.state != 1) {
            let oldParentNode = element.parentNode;
            if (Build.isMainHeroClassTalent(data)) {
              App.notify(Lang.text('mainHeroClassTalentLocked'));
              elementSetDisplay(element, 'block');
              fieldRow.style.background = '';
              element.style.position = 'static';
              element.style.zIndex = 'auto';
              return;
            }

            element.dataset.state = 1;

            try {
              const duplicates = Array.from(
                targetElement.querySelectorAll(`.build-talent-item[data-id="${data.id}"]`)
              );
              for (const dup of duplicates) {
                if (dup === element) continue;
                const dupContainer = dup.closest('.build-talent-item-container');
                if (dupContainer) {
                  dupContainer.remove();
                } else {
                  dup.remove();
                }
              }
            } catch {}

            let containedTalent = DOM({ style: 'build-talent-item-container' }, element);
            Build.attachDefaultOrderDatasetToInventoryContainer(containedTalent);

            Build.applySorting(containedTalent);

            targetElement.prepend(containedTalent);

            try {
              if (data.active && oldParentNode.dataset.position) {
                await removeFromActive(oldParentNode.dataset.position);
              }

              await App.api.request('build', 'setZero', {
                buildId: Build.id,
                index: oldParentNode.dataset.position,
              });

              Build.installedTalents[parseInt(oldParentNode.dataset.position)] = null;

              Build.setStat(data, true);

              if ('conflict' in data) {
                delete Build.fieldConflict[Math.abs(data.id)];
              }
            } catch (e) {
              element.dataset.state = 2;

              oldParentNode.append(element);

              elementSetDisplay(element, 'block');

              containedTalent.remove();
            }
          }
        } else if (isActiveBarTarget) {
          elementSetDisplay(element, 'none');

          let elemBelow = elementFromPoint(event.clientX, event.clientY);

          let isSwap = elemBelow.parentNode.classList.contains('build-active-bar-item');

          elementSetDisplay(element, 'block');

          if (
            elemBelow &&
            (element.dataset.state == 2 || element.dataset.state == 3) &&
            (elemBelow.classList.contains('build-active-bar-item') || isSwap) &&
            data.active == 1
          ) {
            let index = elemBelow.dataset.index;
            let smartCast = Number(element.parentNode.dataset.active);
            let positionRaw = element.dataset.position;

            if (!positionRaw) {
              positionRaw = element.parentNode.dataset.position;
            }

            if (isSwap) {
              index = elemBelow.parentNode.dataset.index;
            }

            let position = Number(positionRaw) + 1;

            try {
              if (fromActiveBar) {
                let startingIndex = element.parentNode.dataset.index;
                if (isClick) {
                  await removeFromActive(positionRaw);
                } else if (index != startingIndex) {
                  // moved to other position
                  let swapElemParent = element.parentNode;
                  let targetElem = isSwap ? elemBelow.parentNode : elemBelow;
                  let swapPositionRaw = isSwap ? elemBelow.dataset.position : 0;
                  let swapPosition = Number(swapPositionRaw) + 1;
                  let swapSmartCast = Number(targetElem.dataset.active);

                  let clone = element.cloneNode(true);
                  let swapClone = isSwap ? elemBelow.cloneNode(true) : null;
                  await removeFromActive(positionRaw);
                  if (swapClone) {
                    await removeFromActive(swapPositionRaw);
                  }

                  await addToActive(index, position, positionRaw, targetElem, clone, smartCast);

                  if (swapClone) {
                    await addToActive(startingIndex, swapPosition, swapPositionRaw, swapElemParent, swapClone, swapSmartCast);
                  }
                }
              } else {
                let targetElem = isSwap ? elemBelow.parentNode : elemBelow;
                let clone = element.cloneNode(true);
                clone.dataset.position = element.parentNode.dataset.position;
                clone.dataset.state = 3;
                clone.style.opacity = 1;
                clone.style.zIndex = 1;
                clone.style.position = 'static';

                if (isSwap) {
                  await removeFromActive(elemBelow.dataset.position);
                }
                await removeFromActive(positionRaw);
                await App.api.request('build', 'setActive', {
                  buildId: Build.id,
                  index: index,
                  position: position,
                });
                Build.activeBarItems[index] = position;

                Build.move(clone, true);

                targetElem.append(clone);
              }
            } catch (e) {
              App.error('Failed to swap activebar');
            }
          }
        } else if (fromActiveBar) {
          await removeFromActive(element.dataset.position);
        }

        try {
          // Всегда пересчитать видимость (в т.ч. скрыть дубликаты «в билде + в библиотеке» без режима сета).
          Build.syncMmtestTalentIdBadges();
          Build.sortInventory();
        } catch {}

        Build.updateHeroStats();
        Build.syncCombatModeButtonState();

        fieldRow.style.background = '';

        element.style.position = 'static';

        element.style.zIndex = 'auto';

        // If cursor stays over a library talent after click/drag-end,
        // restore tooltip/row-highlight without requiring mouse movement.
        try {
          const hovered = document.elementFromPoint(event.clientX, event.clientY);
          const hoveredTalent = hovered?.closest?.('.build-talents .build-talent-item');
          if (hoveredTalent) {
            hoveredTalent.dispatchEvent(
              new MouseEvent('mouseover', {
                bubbles: true,
                clientX: event.clientX,
                clientY: event.clientY,
              }),
            );
          }
        } catch {}
      };
    };

    element.ondragstart = () => {
      return false;
    };
  }

  static highlightBuildRowByLevel(level) {
    Build.clearBuildRowHoverHighlight();
    const row = document.getElementById(`bfr${level}`);
    if (!row) return;
    row.style.background = 'rgba(255,255,255,0.5)';
    row.style.borderRadius = '1cqh';
    Build._hoveredBuildRowEl = row;
  }

  static clearBuildRowHoverHighlight() {
    if (!Build._hoveredBuildRowEl) return;
    Build._hoveredBuildRowEl.style.background = '';
    Build._hoveredBuildRowEl.style.borderRadius = '';
    Build._hoveredBuildRowEl = null;
  }

  static description(element) {
    let descEvent = () => {
      let positionElement = element.getBoundingClientRect();
      let data = Build.talents[element.dataset.id];
      const isInventoryTalent = !!element.closest?.('.build-talents');

      if (!data) {
        console.log('Не найден талант в билде: ' + element.dataset.id);
        Build.descriptionView.style.display = 'none';
        return;
      }

      // Определяем тип таланта и формируем ключи для перевода
      const isHeroTalent = data.id < 0;
      const prefix = isHeroTalent ? 'htalent_' : 'talent_';
      const absId = Math.abs(data.id);

      const nameKey = `${prefix}${absId}_name`;
      const descriptionKey = `${prefix}${absId}_description`;

      // Получаем переводы из системы Lang
      const name = Lang.text(nameKey);
      const description = Lang.text(descriptionKey);

      // Проверяем, есть ли переводы (если вернулся ключ, значит перевода нет)
      if (name === nameKey || description === descriptionKey) {
        Build.renderDescriptionHtml({
          html: `<b>Талант #${data.id}</b><div>Информация отсутствует. Сообщите пожалуйста об этом в отдельную тему Telegram сообщества Prime World Classic.</div><span>+1000 Уважение</span>`,
          anchorRect: positionElement,
        });
        return;
      }

      let rgb = '';
      switch (data.rarity) {
        case 1:
          rgb = '17,105,237';
          break;
        case 2:
          rgb = '205,0,205';
          break;
        case 3:
          rgb = '237,129,5';
          break;
        case 4:
          rgb = '170,20,44';
          break;
      }

      let stats = '';
      if ('stats' in data && data.stats) {
        for (let key in data.stats) {
          if (Build.talentStatFilter(key)) {
            continue;
          }

          let statValue = parseFloat(data.stats[key]);

          if ('statsRefine' in data && 'rarity' in data) {
            let refineBonus = Build.getTalentRefineByRarity(data.rarity);
            let refineMul = parseFloat(data.statsRefine[key]);
            statValue += refineBonus * refineMul;
          }

          const v = Math.floor(statValue * 10.0) / 10.0;
          if (key == 'speedtal' || key == 'speedtalrz' || key == 'speedtalvz') {
            if (Math.abs(v) < 1e-9) {
              stats += `0 ${Lang.text(key)}<br>`;
            } else {
              stats += `-${Math.abs(v)} ${Lang.text(key)}<br>`;
            }
          } else {
            stats += '+' + `${v} ${Lang.text(key)}<br>`;
          }
        }
      }

      let dataTemp = data.rarity;

      switch (dataTemp) {
        case 1:
          dataTemp = 1;
          break;
        case 2:
          dataTemp = 2;
          break;
        case 3:
          dataTemp = 3;
          break;
        case 4:
          dataTemp = 4;
          break;
        default:
          dataTemp = 0;
          break;
      }

      let talentIsClassBased = '';

      if (!dataTemp) {
        talentIsClassBased = Lang.text('classTalent') + `<br>`;
      }

      let starOrange = window.innerHeight * 0.015;
      let starGold = window.innerHeight * 0.015;
      let talentRefineByRarity = Build.talentRefineByRarity[dataTemp == 0 ? 4 : dataTemp];

      let stars = '';

      for (let i = 0; i < (talentRefineByRarity > 15 ? 0 : talentRefineByRarity); i++) {
        if (Math.floor(i / 5) % 2 == 1) {
          stars = stars + `<img src="content/icons/starOrange27.webp" width=${starOrange} height=${starOrange}>`;
        } else {
          stars = stars + `<img src="content/icons/starGold.webp" width=${starGold} height=${starGold}>`;
        }
      }

      if (talentRefineByRarity > 15) {
        stars = stars + talentRefineByRarity + `<img src="content/icons/starOrange27.webp" width=${starOrange} height=${starOrange}>`;
      }

      // Используем переведенное описание
      let descriptionWithStars = `<b>${talentIsClassBased}</b>${stars} <br><br> ${description} `;

      Build.renderDescriptionHtml({
        html: `<b style="color:rgb(${rgb})">${name}</b><div>${descriptionWithStars}</div><span>${stats}</span>`,
        anchorRect: positionElement,
        talentDataForParams: data,
      });

      // Preview: where this library talent would land in the build.
      if (isInventoryTalent) {
        if (Build.isBuildRowHoverHighlightEnabled() && data.level > 0) {
          Build.highlightBuildRowByLevel(data.level);
        }
        // Single talent preview in library should pick the left-most empty slot.
        Build.previewSetTalentsInEmptySlots(
          { _manualOrder: [data.id], key: `single_${data.id}` },
          'left',
          { previewClass: 'build-talent-empty-slot-preview' },
        );
      }
    };

    let descEventEnd = () => {
      Build.descriptionView.style.display = 'none';
      Build.clearBuildRowHoverHighlight();
      // Remove only slot previews (keeps set-highlight logic independent).
      if (element.closest?.('.build-talents')) Build.clearEmptySlotPreviews();
    };

    element.ontouchstart = (e) => {
      descEvent();
    };

    element.onmouseover = () => {
      descEvent();
    };
    element.onmouseout = () => {
      descEventEnd();
    };
    element.ontouchend = () => {
      descEventEnd();
    };
  }
  static cleanup() {
    Build.clearBuildRowHoverHighlight();
    Build.toggleBuildSettingsPanel(false);
    try {
      if (Build._altResetHandler) window.removeEventListener('keydown', Build._altResetHandler, true);
    } catch {}
    Build._altResetHandler = null;
    try {
      Build.altResetHintView?.parentNode?.removeChild?.(Build.altResetHintView);
    } catch {}
    Build.altResetHintView = null;
    try {
      if (Build._previewBlinkTimer) clearInterval(Build._previewBlinkTimer);
    } catch {}
    Build._previewBlinkTimer = 0;
    Build._previewBlinkState = false;
    try {
      Build.fieldView?.classList?.remove('build-preview-blink-on');
    } catch {}
    try {
      if (Build._setsScrollStopTimer) clearTimeout(Build._setsScrollStopTimer);
    } catch {}
    Build._setsScrollStopTimer = 0;
    try {
      if (Build._buildSettingsAttachTimer) clearTimeout(Build._buildSettingsAttachTimer);
    } catch {}
    Build._buildSettingsAttachTimer = 0;
    try {
      Build.buildSettingsButton?.parentNode?.removeChild?.(Build.buildSettingsButton);
    } catch {}
    try {
      Build.buildSettingsPanel?.parentNode?.removeChild?.(Build.buildSettingsPanel);
    } catch {}
    Build.buildSettingsButton = null;
    Build.buildSettingsPanel = null;
    try {
      Build._avatarTipEl?.parentNode?.removeChild?.(Build._avatarTipEl);
    } catch {}
    Build._avatarTipEl = null;
    try {
      document.querySelectorAll('.build-avatar-tip').forEach((el) => el.remove());
    } catch {}
    if (Build.descriptionView && Build.descriptionView.parentNode) {
      Build.descriptionView.remove();
      Build.descriptionView = null;
    }
  }
}
