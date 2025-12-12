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

export class Build {
  static loading = false;

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
    Build.talents = new Object();

    Build.descriptionView = document.createElement('div');

    Build.CleanInvalidDescriptions();

    Build.descriptionView.classList.add('build-description');

    Build.descriptionView.style.display = 'none';

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

    Build.inventoryView.append(buildTalents);

    // ================================================

    Build.rarityView = DOM({ style: 'build-rarity' });

    Build.activeBarView = DOM({ style: 'build-active-bar' });

    let request = await App.api.request('build', 'data', {
      heroId: heroId,
      target: targetId,
    });

    Build.dataRequest = request;

    Build.id = request.id;

    Build.heroId = heroId;

    Build.dataStats = new Object();
    Build.calculationStats = new Object();
    Build.initialStats = new Object();
    Build.heroPower = 0.0;
    Build.heroStatsFromPower = {
      hp: 0.0,
      mp: 0.0,
      sila: 0.0,
      razum: 0.0,
      provorstvo: 0.0,
      hitrost: 0.0,
      stoikost: 0.0,
      volia: 0.0,
    };
    Build.installedTalents = new Array(36).fill(null);
    Build.profileStats = new Object();

    Build.applyRz = true;
    Build.applyVz = false;
    Build.applyStak = true;
    Build.applyBuffs = true;

    Build.list(request.build, isWindow);
    Build.buildActions(request.build, isWindow);

    request.hero.stats['damage'] = 0;
    request.hero.stats['critProb'] = 0;
    request.hero.stats['attackSpeed'] = 0;
    request.hero.stats['punching'] = 0;
    request.hero.stats['protectionBody'] = 0;
    request.hero.stats['protectionSpirit'] = 0;
    Build.hero(request.hero);

    Build.level();

    Build.field(request.body);

    Build.inventory();

    Build.rarity();

    Build.activeBar(request.active);

    Build.ruleSortInventory = new Object();
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

  static skinChange() {
    let bodyHero = DOM({ style: 'skin-change' });

    let preload = new PreloadImages(bodyHero);

    for (const i of Build.dataRequest.hero.skin.list) {
      let hero = DOM({ domaudio: domAudioPresets.smallButton });

      hero.dataset.url = `content/hero/${Build.heroId}/${i}.webp`;

      hero.dataset.skin = i;

      hero.addEventListener('click', async () => {
        Build.changeSkinForHero(Build.heroId, hero.dataset.skin);

        Build.heroImg.style.backgroundImage = `url(content/hero/${Build.heroId}/${hero.dataset.skin}.webp)`;

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

    template.append(name, button, close);

    Splash.show(template);
  }

  static buildActions(builds, isWindow) {
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
      createBg.style.backgroundImage = `url('content/icons/plus.svg')`;
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
            { style: 'splash-text' },
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
          closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';
          fragment.append(closeButton);

          Splash.show(fragment);
        },
      ],
    });

    let duplicateBg = DOM({ style: ['btn-duplicate'] });
    duplicateBg.style.backgroundImage = `url('content/icons/copy.svg')`;
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
      randomBg.style.backgroundImage = `url('content/icons/dice.svg')`;
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
            const title = DOM({ style: 'splash-text' }, Lang.text('resetTalentsTitle'));
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

            fragment.append(reset);

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
      resetBg.style.backgroundImage = `url('content/icons/trash.svg')`;
      resetBuild.append(resetBg);
      Build.buildActionsView.append(resetBuild);
    }
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
    let talentsStat = Build.calculationStats[stat];
    let powerStat = 0.0;
    if (stat in Build.heroStatsFromPower) {
      powerStat += Build.heroStatsFromPower[stat];
    }
    return initialStat + talentsStat + powerStat;
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

    let stats = DOM({ style: 'build-hero-stats-view' });

    const template = {
      hp: Lang.text('health'),
      mp: Lang.text('energy'),
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
                      Build.removeSortInventory('stats', 'krajahp');
                      Build.removeSortInventory('stats', 'krajahprz');
                      Build.removeSortInventory('stats', 'regenhpvz');
                      Build.removeSortInventory('stats', 'krajahpvz');
                      Build.removeSortInventory('stats', 'regenhp');
                      Build.removeSortInventory('stats', 'hpmp');
                    } else if (key == 'mp') {
                      Build.removeSortInventory('stats', 'mp');
                      Build.removeSortInventory('stats', 'regenmp');
                      Build.removeSortInventory('stats', 'krajamp');
                      Build.removeSortInventory('stats', 'regenmpvz');
                      Build.removeSortInventory('stats', 'hpmp');
                    } else if (key == 'speed') {
                      Build.removeSortInventory('stats', 'speed');
                      Build.removeSortInventory('stats', 'speedrz');
                      Build.removeSortInventory('stats', 'speedvz');
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
                      Build.setSortInventory('stats', 'krajahp');
                      Build.setSortInventory('stats', 'krajahprz');
                      Build.setSortInventory('stats', 'regenhpvz');
                      Build.setSortInventory('stats', 'krajahpvz');
                      Build.setSortInventory('stats', 'regenhp');
                      Build.setSortInventory('stats', 'hpmp');
                    } else if (key == 'mp') {
                      Build.setSortInventory('stats', 'mp');
                      Build.setSortInventory('stats', 'regenmp');
                      Build.setSortInventory('stats', 'krajamp');
                      Build.setSortInventory('stats', 'regenmpvz');
                      Build.setSortInventory('stats', 'hpmp');
                    } else if (key == 'speed') {
                      Build.setSortInventory('stats', 'speed');
                      Build.setSortInventory('stats', 'speedrz');
                      Build.setSortInventory('stats', 'speedvz');
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
        DOM({ tag: 'div' }, data.stats[key] || 0),
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
              }
            },
          ],
        });

        daw.dataset.index = i;

        daw.dataset.status = Build.dataRequest.profile[i];

        Build.profileStats[key] = parseInt(daw.dataset.status);

        if (daw.dataset.status == 1) {
          daw.src = 'content/icons/checkbox.webp';
        } else {
          daw.src = 'content/icons/circle.webp';
        }

        stats.append(DOM({ style: 'build-hero-stats-line' }, daw, item));
      } else {
        stats.append(DOM({ style: 'build-hero-stats-line' }, item));
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

    Build.heroName = DOM({ tag: 'div', style: 'name' });

    if (MM.hero) {
      const hero = MM.hero.find((h) => h.id === data.id);
      Build.heroName.innerText = Lang.heroName(hero.id, hero.skin || 1);
    }

    Build.heroImg = DOM({ style: 'avatar' });

    if (App.isAdmin()) {
      Build.heroImg.onclick = async () => {
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

    Build.heroImg.style.backgroundImage = `url(content/hero/${data.id}/${
      Build.dataRequest.hero.skin.target ? Build.dataRequest.hero.skin.target : 1
    }.webp)`;

    let rankIcon = DOM({ style: 'rank-icon' });

    rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;

    let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, data.rating), rankIcon);

    Build.heroImg.append(rank);
    // Build.training
    const wrapper = DOM({ style: 'build-hero-avatar-and-name' }, Build.heroImg, Build.skinView, Build.training);

    Build.heroView.append(wrapper, stats);
  }

  static updateHeroStats() {
    Build.heroPower = 0.0;
    for (let key in Build.calculationStats) {
      Build.calculationStats[key] = 0.0;
    }

    for (let i = 35; i >= 0; i--) {
      let talent = Build.installedTalents[i];
      if (talent) {
        Build.calcStatsFromPower(i);
        Build.setStat(talent, true, false);
      }
    }

    for (let key2 in Build.dataStats) {
      Build.dataStats[key2].lastChild.innerText = Math.round(Build.totalStat(key2));
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
      Build.dataStats['critProb'].lastChild.innerText = Math.max(0.0, Math.round(crit)) + '%';
    }

    {
      let attackSpeed = Math.min(2.0, 0.00364 * statAg + 0.49);
      Build.dataStats['attackSpeed'].lastChild.innerText = Math.round(attackSpeed * 100.0) / 100.0;
    }
  }

  static calcStatsFromPower(maxTalentId) {
    const talentPowerByLine = {
      5: 33.0 / 600.0,
      4: 23.0 / 600.0,
      3: 16.0 / 600.0,
      2: 13.0 / 600.0,
      1: 9.0 / 600.0,
      0: 6.0 / 600.0,
    };

    Build.heroPowerFromInstalledTalents = 0.0;

    for (let i = 35; i >= 0 && i >= maxTalentId; i--) {
      let talent = Build.installedTalents[i];
      if (talent) {
        let line = Math.floor((35 - i) / 6);
        Build.heroPowerFromInstalledTalents += talentPowerByLine[line];
      }
    }

    for (let stat in Build.heroStatsFromPower) {
      let Lvl = Build.heroStatMods[stat];
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

    // Apply animation and change stats in Build.calculationStats
    for (let key2 in add) {
      let statChange = parseFloat(add[key2]);
      if (Build.applyStak && key2.indexOf('stak') != -1) {
        calcualteSpecialStats(key2.replace('stak', ''), statChange);
      } else if (Build.applyRz && key2.indexOf('rz') != -1) {
        calcualteSpecialStats(key2.replace('rz', ''), statChange);
      } else if (Build.applyVz && key2.indexOf('vz') != -1) {
        calcualteSpecialStats(key2.replace('vz', ''), statChange);
      } else if (key2.indexOf('dop') != -1) {
        calcualteSpecialStats(key2.replace('dop', ''), statChange);
      } else if (Build.applyBuffs && key2.indexOf('buff') != -1) {
        calcualteSpecialStats(key2.replace('buff', ''), statChange);
      } else {
        calcualteSpecialStats(key2, statChange);
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

    if (data.level == 0) {
      talent.style.display = 'none';
    }

    return talent;

    preload.add(talent);
  }

  static inventory() {
    if (Build.loading) {
      return;
    }

    Build.loading = true;

    App.api.silent(
      (data) => {
        for (let item of data) {
          let talentContainer = DOM({ style: 'build-talent-item-container' });

          Build.inventoryView.querySelector('.build-talents').append(talentContainer);

          let preload = new PreloadImages(talentContainer);

          item.state = 1;

          preload.add(Build.templateViewTalent(item));
        }

        Build.loading = false;
      },
      'build',
      'inventory',
      { buildId: Build.id },
    );
  }

  static rarity() {
    const element = [
      { id: '4', name: Lang.text('titleTheRed'), color: '170,20,44' },
      { id: '3', name: Lang.text('titleTheOrange'), color: '237,129,5' },
      { id: '2', name: Lang.text('titleThePurple'), color: '205,0,205' },
      { id: '1', name: Lang.text('titleTheBlue'), color: '17,105,237' },
    ];

    let a = document.createElement('div');
    a.title = Lang.text('titleActiveTalents');

    a.classList.add('build-rarity-other');

    a.innerText = 'А';

    a.dataset.active = 0;

    a.addEventListener('click', (e) => {
      Sound.play(SOUNDS_LIBRARY.CLICK_BUTTON_PRESS_SMALL, {
        id: 'ui-small-click',
        volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
      });
      if (a.dataset.active == 1) {
        a.style.background = 'rgba(255,255,255,0.1)';

        Build.removeSortInventory('active', '1');

        Build.sortInventory();

        a.dataset.active = 0;
      } else {
        a.style.background = 'rgba(153,255,51,0.7)';

        Build.setSortInventory('active', '1');

        Build.sortInventory();

        a.dataset.active = 1;
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
        a.parentElement.childNodes[l].dataset.active = 0;
        a.parentElement.childNodes[l].style.border = 'none';
      }
      a.style.background = 'rgba(255,255,255,0.1)';

      Build.setSortInventory('active', '1');

      Build.sortInventory();

      a.dataset.active = 1;

      a.style.background = 'rgba(153,255,51,0.7)';
    });

    Build.rarityView.append(a);

    for (let item of element) {
      let button = document.createElement('div');

      button.dataset.active = 0;

      button.style.boxSizing = 'border-box';

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
        } else {
          button.style.border = 'solid calc(min(0.5cqh, 1cqw)) rgb(153,255,51)';

          Build.setSortInventory('rarity', item.id);

          Build.sortInventory();

          button.dataset.active = 1;
        }
      });

      button.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        for (let itemEl of element) {
          Build.removeSortInventory('rarity', itemEl.id);
        }
        Build.removeSortInventory('active', '1');

        for (let l = 0; l < button.parentElement.childNodes.length; l++) {
          button.parentElement.childNodes[l].dataset.active = 0;
          button.parentElement.childNodes[l].style.border = 'none';
        }
        a.style.background = 'rgba(255,255,255,0.1)';

        Build.setSortInventory('rarity', item.id);

        Build.sortInventory();

        button.dataset.active = 1;

        button.style.border = 'solid calc(min(0.5cqh, 1cqw)) rgb(153,255,51)';
      });

      button.style.background = `rgba(${item.color},0.6)`;

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

      index++;
    }
  }

  static setSortInventory(key, value) {
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
    for (let itemContainer of Build.inventoryView.querySelectorAll('.build-talent-item-container')) {
      Build.applySorting(itemContainer);
    }
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
      return elems[0].className == 'build-level' ? elems[1] : elems[0];
    };

    let elementSetDisplay = (element, display) => {
      if (element.parentElement.classList == 'build-talent-item-container') {
        element.parentElement.style.display = display;
      }
      element.style.display = display;
    };

    element.onmousedown = (event) => {
      if (event.button != 0) return;

      let moveStart = Date.now();
      Build.descriptionView.style.display = 'none';

      let data = Build.talents[element.dataset.id];
      let fieldRow = document.getElementById(`bfr${data.level}`);

      if (!fromActiveBar) {
        fieldRow.style.background = 'rgba(255,255,255,0.5)';
        fieldRow.style.borderRadius = '1cqh';
      }

      // Фикс для transform
      element.style.transformOrigin = 'center center';
      element.style.willChange = 'transform';
      element.style.setProperty('transform', 'scale(1.1)', 'important');
      element.style.transition = 'transform 0.1s ease';

      let rect = element.getBoundingClientRect();
      let shiftX = event.pageX - rect.left - 5;
      let shiftY = event.pageY - rect.top - 5;

      let offsetParent = element;
      do {
        shiftX += offsetParent.offsetParent.offsetLeft;
        shiftY += offsetParent.offsetParent.offsetTop;
        offsetParent = offsetParent.offsetParent;
      } while (!(offsetParent.id == 'wbuild' || offsetParent.id == 'viewbuild'));

      element.style.zIndex = '9999';
      element.style.position = 'absolute';
      element.style.left = event.pageX - shiftX - 1 + 'px';
      element.style.top = event.pageY - shiftY - 1 + 'px';

      elementSetDisplay(element, 'none');
      let startingElementBelow = elementFromPoint(event.clientX, event.clientY);
      elementSetDisplay(element, 'block');

      document.onmousemove = (e) => {
        element.style.left = e.pageX - shiftX - 1 + 'px';
        element.style.top = e.pageY - shiftY - 1 + 'px';
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

        let offsetParent = element;
        do {
          left += offsetParent.offsetParent.offsetLeft;
          top += offsetParent.offsetParent.offsetTop;
          offsetParent = offsetParent.offsetParent;
        } while (!(offsetParent.id == 'wbuild' || offsetParent.id == 'viewbuild'));

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

        let removeFromActive = async (position, skipActiveId) => {
          for (let i = 0; i < Build.activeBarItems.length; i++) {
            const talPos = Math.abs(Build.activeBarItems[i]) - 1;
            if (talPos == position && i != skipActiveId) {
              await Build.removeTalentFromActive(i);
            }
          }
        };

        let addToActive = async (index, position, datasetPosition, targetElem, clone, smartCast) => {
          await App.api.request('build', 'setActive', {
            buildId: Build.id,
            index: index,
            position: position,
          });
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
            await Build.enableSmartCast(targetElem, true);
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
				
				let conflictState = false;

				if ('conflict' in data) {
					
					for (let conflictId of data.conflict) {
						
						for (let installedTalent of Build.installedTalents) {
							
							if (installedTalent) {
								
								if (Math.abs(installedTalent.id) == conflictId) {
									
									let isCurrentOrdinary = data.id > 0;
									
									let isInstalledOrdinary = installedTalent.id > 0;
									
									if (isCurrentOrdinary === isInstalledOrdinary) {
										
										conflictState = true;
										
										break;
									}
								}
							}
						}
						
						if (conflictState) break;
					}
				}

				if (conflictState) {
					
					if (typeof App !== 'undefined' && App.notify) {
						
						const message = Lang.text('talentConflict');
						
						App.notify(message);
					}
				}

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

                  Build.inventoryView.querySelector('build-talents').prepend(element);

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

            element.dataset.state = 1;

            let containedTalent = DOM({ style: 'build-talent-item-container' }, element);

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

        Build.updateHeroStats();

        fieldRow.style.background = '';

        element.style.position = 'static';

        element.style.zIndex = 'auto';
      };
    };

    element.ondragstart = () => {
      return false;
    };
  }

  static description(element) {
    let descEvent = () => {
      let positionElement = element.getBoundingClientRect();
      let data = Build.talents[element.dataset.id];

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
        Build.descriptionView.innerHTML = `<b>Талант #${data.id}</b><div>Информация отсутствует. Сообщите пожалуйста об этом в отдельную тему Telegram сообщества Prime World Classic.</div><span>+1000 Уважение</span>`;

        let positionDescription = Build.descriptionView.getBoundingClientRect();
        Build.descriptionView.style.zIndex = 9999;
        Build.descriptionView.style.position = 'fixed';
        Build.descriptionView.style.display = 'block';
        Build.descriptionView.style.left = positionElement.left + positionElement.height + 'px';
        Build.descriptionView.style.top = positionElement.top + 'px';
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

          let sign = key == 'speedtal' || key == 'speedtalrz' || key == 'speedtalvz' ? '-' : '+';
          stats += sign + `${Math.floor(statValue * 10.0) / 10.0} ${Lang.text(key)}<br>`;
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

      // Используем переведенное название
      Build.descriptionView.innerHTML = `<b style="color:rgb(${rgb})">${name}</b><div>${descriptionWithStars}</div><span>${stats}</span>`;

      let innerChilds = Build.descriptionView.childNodes[1].childNodes;
      let paramIterator = 0;
      for (let outerTag of innerChilds) {
        for (let specialTag of outerTag.childNodes) {
          let tagString = specialTag.innerHTML ? specialTag.innerHTML : specialTag.data;
          if (!tagString || tagString.indexOf('%s') == -1 || !data.params) {
            continue;
          }
          let params = data.params.split(';');
          if (paramIterator >= params.length) {
            continue;
          }
          let param = params[paramIterator];
          let paramValues = param.split(',');

          let statAffection, minValue, maxValue;

          if (paramValues.length == 5) {
            minValue = parseFloat(paramValues[1]);
            maxValue = parseFloat(paramValues[2]);
            statAffection = paramValues[4];
          } else if (paramValues.length == 3) {
            minValue = parseFloat(paramValues[0]);
            maxValue = parseFloat(paramValues[1]);
            statAffection = paramValues[2];
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

          let outputString;
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
            outputString = lerp(minValue, maxValue, (resolvedTotalStat1 + resolvedTotalStat2 - param1) / param2).toFixed(1);
            if (outputString.endsWith('.0')) {
              outputString = outputString.replace('.0', '');
            }
          } else {
            if (resolvedStatAffection in Build.dataStats && paramValues.length == 5) {
              let resolvedTotalStat = Build.totalStat(resolvedStatAffection);
              const isHpOrEnergy = resolvedStatAffection == 'hp' || resolvedStatAffection == 'mp';
              const param1 = isHpOrEnergy ? 600.0 : 50.0;
              const param2 = isHpOrEnergy ? 6250.0 : 250.0;
              outputString = lerp(minValue, maxValue, (resolvedTotalStat - param1) / param2).toFixed(1);
              if (outputString.endsWith('.0')) {
                outputString = outputString.replace('.0', '');
              }
            } else {
              let refineBonus = Build.getTalentRefineByRarity(data.rarity);
              outputString = (minValue + maxValue * refineBonus).toFixed(1);
              if (outputString.endsWith('.0')) {
                outputString = outputString.replace('.0', '');
              }
            }
          }
          if (specialTag.innerHTML) {
            specialTag.innerHTML = tagString.replace('%s', outputString);
          } else {
            outerTag.innerHTML = tagString.replace('%s', outputString);
          }
          paramIterator++;
        }
      }

      let positionDescription = Build.descriptionView.getBoundingClientRect();
      Build.descriptionView.style.zIndex = 9999;
      Build.descriptionView.style.position = 'fixed';
      Build.descriptionView.style.display = 'block';

      let descriptionWidth = Build.descriptionView.offsetWidth;
      let ofSetW = 0,
        ofSetH = 0;

      if (Build.descriptionView.offsetHeight + positionElement.top > window.innerHeight) {
        ofSetW = window.innerHeight - Build.descriptionView.offsetHeight - positionElement.top;
      }

      Build.descriptionView.style.left = positionElement.left + positionElement.height + 'px';
      Build.descriptionView.style.top = positionElement.top + ofSetW + 'px';
    };

    let descEventEnd = () => {
      Build.descriptionView.style.display = 'none';
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
    if (Build.descriptionView && Build.descriptionView.parentNode) {
      Build.descriptionView.remove();
      Build.descriptionView = null;
    }
  }
}
