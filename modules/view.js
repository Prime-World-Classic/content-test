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
import { Shop } from './shop.js';
import { DomAudio } from './domAudio.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { Sound } from './sound.js';

export class View {
  static mmQueueMap = {};

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
        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
          App.authorization(login, password);
        }
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
        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
          App.registration(fraction, invite, login, password, password2);
        }
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
        await App.exit();

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
            const userHero = MM.hero.find(h => h.id === data.users[key].hero);
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
        });
    }
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

      const rankIcon = DOM({ style: 'rank-icon' });
      
      rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;

      item.style.backgroundImage = player.hero ? `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)` : '';

      let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, player.rating), rankIcon);

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

        item.style.backgroundImage = player.hero
          ? `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`
          : `url(content/hero/empty.webp)`;
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
          title: nickname.innerText,
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

      if (MM.partyId == App.storage.data.id && playerX.dataset.id != App.storage.data.id && playerX.dataset.id != 0) {
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
          if (MM.active) {
            return;
          }

          let request = await App.api.request('build', 'heroAll');

          // request.sort((a, b) => b.rating - a.rating);

          MM.hero = request;

          request.push({ id: 0 });

          let bodyHero = DOM({ style: 'party-hero' });

          let preload = new PreloadImages(bodyHero);

          for (let item2 of request) {
            let hero = DOM({ domaudio: domAudioPresets.smallButton });

            hero.addEventListener('click', async () => {
				try {
					await App.api.request(App.CURRENT_MM, 'heroParty', {
						id: MM.partyId,
						hero: item2.id,
					});
				} catch (error) {
					return App.error(error);
				}

				item.style.backgroundImage = item2.id
					? `url(content/hero/${item2.id}/${item2.skin ? item2.skin : 1}.webp)`
					: `url(content/hero/empty.webp)`;

				const rankContainer = item.querySelector('.rank');
				if (rankContainer) {
					const rankLvl = rankContainer.querySelector('.rank-lvl');
					const rankIcon = rankContainer.querySelector('.rank-icon');
					
					if (rankLvl) {
						const heroRating = item2.rating || player.rating || 1100;
						
						rankLvl.style.backgroundImage = '';

						rankLvl.textContent = heroRating;
					}
					
					if (rankIcon) {
						const heroRating = item2.rating || player.rating || 1100;
						rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(parseInt(heroRating))}.webp)`;
					}
				}

				MM.activeSelectHero = item2.id;
				Splash.hide();
			});

            if (item2.id) {
              hero.dataset.url = `content/hero/${item2.id}/${item2.skin ? item2.skin : 1}.webp`;
            } else {
              hero.dataset.url = `content/hero/empty.webp`;
            }

            preload.add(hero);
          }

          Splash.show(bodyHero, false);
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

    // тип медалей
    const medalMap = {
      pvp: 'gold',
      anderkrug: 'gold',
      cte: 'gold',
      m4: 'gold',
      'pve-ep2-red': 'gold',
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
          const onEsc = (e) => {
            if (e.key === 'Escape') {
              Sound.play(SOUNDS_LIBRARY.CLICK_CLOSE, { id: 'ui-close', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });
              Splash.hide();
              document.removeEventListener('keydown', onEsc);
            }
          };
          document.addEventListener('keydown', onEsc, { once: true });

          const BASE = 'https://pw2.26rus-game.ru/stats/';
          const id = Number(App?.storage?.data?.id) || 0;
          const login = String(App?.storage?.data?.login || '').trim();

          const qs = new URLSearchParams();
          if (id > 0) qs.set('user_id', String(id));
          else if (login) qs.set('login', login);
          else qs.set('user_id', '0');
          qs.set('tab', 'info');
          qs.set('q', '');
          qs.set('_', Date.now().toString());

          const src = `${BASE}?${qs.toString()}`;

          Splash.show(
            DOM(
              {
                domaudio: domAudioPresets.closeButton,
                style: 'iframe-stats',
                event: [
                  'click',
                  (e) => {
                    if (e.target === e.currentTarget) Splash.hide();
                  },
                ],
              },
              DOM({
                domaudio: domAudioPresets.closeButton,
                style: 'iframe-stats-navbar',
                event: ['click', () => Splash.hide()],
              }),
              DOM({ tag: 'iframe', src, style: 'iframe-stats-frame' }),
            ),
            false,
          );
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

  static castleHeroes() {
    let tab = 1;

    let body = DOM({ style: 'castle-bottom' });

    View.castleBottom = DOM({ style: 'castle-bottom-content' });

    View.castleBottom.addEventListener('wheel', function (event) {
      if (event.deltaY != 0) {
        if (event.deltaMode == event.DOM_DELTA_PIXEL) {
          event.preventDefault();

          View.scrollHero(event.deltaY / 100);
        } else if (event.deltaMode == event.DOM_DELTA_LINE) {
          event.preventDefault();

          View.scrollHeroLine(event.deltaY / 100);
        } else if (event.deltaMode == event.DOM_DELTA_PAGE) {
          event.preventDefault();

          let modifier = this.clientWidth;

          View.castleBottom.scrollLeft += modifier;

          View.updateArrows();
        }
      }
    });

    View.bodyCastleHeroes();

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
          View.castleBottom.scrollLeft = 0;
          View.updateArrows();
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
          View.castleBottom.scrollLeft = 0;
          View.updateArrows();
          Castle.buildMode = false;
        },
      ],
      title: Lang.text('titlefriends'),
    });
    let buildingsMenuItem = DOM({
      domaudio: domAudioPresets.defaultButton,
      style: 'buildings-menu-item',
      event: [
        'click',
        () => {
          View.bodyCastleBuildings();
          View.castleBottom.scrollLeft = 0;
          View.updateArrows();
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
    body.append(
      DOM(
        { style: 'castle-bottom-menu' },
        nicknameMenuItem,
        flagMenuItem,
        settingsMenuItem,
        heroesMenuItem,
        friendsMenuItem,
        buildingsMenuItem,
        chatMenuItem,
      ),
      DOM(
        { style: 'castle-bottom-content-container' },
        View.castleBottom,
        DOM({ style: 'castle-bottom-content-left-scroll' }, View.arrows.ls, View.arrows.ld),
        DOM({ style: 'castle-bottom-content-right-scroll' }, View.arrows.rs, View.arrows.rd),
      ),
    );

    View.updateArrows();

    return body;
  }

  static currentFloatScroll = 0.0;

  static scrollHero(delta) {
    let modifier =
      parseFloat(getComputedStyle(View.castleBottom.firstChild).width) +
      parseFloat(getComputedStyle(View.castleBottom.firstChild).borderRightWidth);

    let maxScrollLeft = View.castleBottom.scrollWidth - View.castleBottom.clientWidth;
    if (isNaN(View.currentFloatScroll)) {
      View.currentFloatScroll = 0;
    }
    View.currentFloatScroll += modifier * delta;
    View.currentFloatScroll = Castle.clamp(View.currentFloatScroll, 0, maxScrollLeft);
    View.castleBottom.scrollLeft = View.currentFloatScroll;

    View.updateArrows();
  }

  static scrollHeroLine(delta) {
    let width = parseFloat(getComputedStyle(View.castleBottom).width);

    let maxScrollLeft = View.castleBottom.scrollWidth - View.castleBottom.clientWidth;
    if (isNaN(View.currentFloatScroll)) {
      View.currentFloatScroll = 0;
    }
    View.currentFloatScroll += width * delta;
    View.currentFloatScroll = Castle.clamp(View.currentFloatScroll, 0, maxScrollLeft);
    View.castleBottom.scrollLeft = View.currentFloatScroll;

    View.updateArrows();
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

    render();
  }

  static bodyCastleBuildings() {
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

      let building = DOM({ style: 'castle-building-item' }, DOM({ style: ['castle-item-ornament', 'hover-brightness'] }), buildingNameBase);

      building.dataset.url = `content/img/buildings/${Castle.currentSceneName}/${item}.png`;

      building.dataset.buildingId = i;

      building.addEventListener('click', async () => {
        Castle.phantomBuilding.id = building.dataset.buildingId;
      });

      preload.add(building);
    }
  }

  static bodyCastleHeroes() {
    let preload = new PreloadImages(View.castleBottom);

    App.api.silent(
      (result) => {
        MM.hero = result;

        while (View.castleBottom.firstChild) {
          View.castleBottom.firstChild.remove();
        }

        for (let item of result) {
          // Используем новый метод для получения имени с учётом скина
          const localizedName = Lang.heroName(item.id, item.skin);
          const heroName = DOM({ style: 'castle-hero-name' }, DOM({}, localizedName));

          if (localizedName.length > 10) {
            heroName.firstChild.classList.add('castle-name-autoscroll');
          }

          let heroNameBase = DOM({ style: ['castle-item-hero-name', 'hover-brightness'] }, heroName);

          let rankIcon = DOM({ style: 'castle-hero-rank-icon' });
          rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

          let rank = DOM({ style: 'castle-hero-rank' }, DOM({ style: 'castle-hero-rank-lvl' }, item.rating), rankIcon);

          let hero = DOM(
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

          hero.addEventListener('click', async () => Window.show('main', 'build', item.id, 0, true));

          hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;

          preload.add(hero);
        }
      },
      'build',
      'heroAll',
    );
  }

  static bodyCastleFriends() {
    let preload = new PreloadImages(View.castleBottom);

    App.api.silent(
      (result) => {
        while (View.castleBottom.firstChild) {
          View.castleBottom.firstChild.remove();
        }
        // status 1 - друг, 2 - запрос дружбы, 3 - дружбу отправил, игрок еще не подтвердил
        console.log('ДРУЗЬЯ', result);

        let buttonAdd = DOM(
          {
            style: 'castle-friend-item',
            onclick: () => {
              let input = DOM({
                tag: 'input',
                domaudio: domAudioPresets.defaultInput,
                style: 'search-input',
                placeholder: Lang.text('friendNicknamePlaceholder'),
              });
              let body = DOM({ style: 'search-body' });

              // Создаём крестик для закрытия (как в buildSelectName)
              let closeButton = DOM({
                tag: 'div',
                domaudio: domAudioPresets.closeButton,
                style: 'close-button',
                event: ['click', () => Splash.hide()],
              });
              closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';

              let search = DOM({ style: 'search' }, input, body, closeButton);

              input.addEventListener('input', async () => {
                let request = await App.api.request('user', 'find', {
                  nickname: input.value,
                });

                if (body.firstChild) {
                  while (body.firstChild) {
                    body.firstChild.remove();
                  }
                }

                for (let item of request) {
                  let template = DOM(
                    {
                      domaudio: domAudioPresets.defaultButton,
                      event: [
                        'click',
                        async () => {
                          await App.api.request('friend', 'request', {
                            id: item.id,
                          });

                          View.bodyCastleFriends();

                          App.notify(`Заявка в друзья ${item.nickname} отправлена`, 1000);

                          Splash.hide();
                        },
                      ],
                    },
                    item.nickname,
                  );

                  if ('blocked' in item) {
                    template.oncontextmenu = () => {
                      let body = document.createDocumentFragment();

                      // Создаём крестик для закрытия
                      const closeButton = DOM({
                        tag: 'div',
                        domaudio: domAudioPresets.closeButton,
                        style: 'close-button',
                        event: ['click', () => Splash.hide()],
                      });
                      closeButton.style.backgroundImage = 'url(content/icons/close-cropped.svg)';

                      body.append(
                        DOM({}, item.nickname),
                        DOM(
                          {
                            domaudio: domAudioPresets.bigButton,
                            style: 'splash-content-button',
                            event: [
                              'click',
                              async () => {
                                await App.api.request('user', 'blocked', {
                                  id: item.id,
                                });
                                Splash.hide();
                              },
                            ],
                          },
                          item.blocked ? 'Разблокировать' : 'Заблокировать',
                        ),
                        DOM(
                          {
                            domaudio: domAudioPresets.bigButton,
                            style: 'splash-content-button',
                            event: [
                              'click',
                              async () => {
                                await App.api.request('user', 'mute', {
                                  id: item.id,
                                });
                                Splash.hide();
                              },
                            ],
                          },
                          item.mute ? 'Убрать мут' : 'Мут чата',
                        ),
                        DOM(
                          {
                            domaudio: domAudioPresets.bigButton,
                            style: 'splash-content-button',
                            event: [
                              'click',
                              async () => {
                                let password = await App.api.request('user', 'restore', { id: item.id });
                                App.notify(`Скопировано в буфер обмена! Пароль: ${password}`);
                                navigator.clipboard.writeText(password);
                              },
                            ],
                          },
                          'Сброс пароля',
                        ),
                        closeButton, // Добавляем крестик вместо кнопки "Назад"
                      );

                      Splash.show(body);
                      return false;
                    };

                    if (item.mute) {
                      template.style.color = 'yellow';
                    }

                    if (item.blocked) {
                      template.style.color = 'red';
                    }
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
            DOM({ style: ['castle-item-ornament', 'hover-brightness'] }),
            DOM({ style: 'castle-friend-add' }, '+'),
          ),
        );

        preload.add(buttonAdd);

        buttonAdd.dataset.url = `content/hero/empty.webp`;

        for (let item of result) {
          const heroName = DOM({ style: 'castle-hero-name' }, DOM({ tag: 'span' }, item.nickname));

          if (item.nickname.length > 10) {
            heroName.firstChild.classList.add('castle-name-autoscroll');
          }

          let heroNameBase = DOM({ style: 'castle-item-hero-name' }, heroName);

          let bottom = DOM({ style: 'castle-friend-item-bottom' });

          let friend = DOM(
            { style: 'castle-friend-item' },
            DOM({ style: ['castle-item-ornament', 'hover-brightness'] }),
            heroNameBase,
            bottom,
          );

          if (item.status == 1) {
            let group = DOM({ style: 'castle-friend-add-group' }, item.online ? Lang.text('inviteToAGroup') : Lang.text('friendIsOffline'));

            let call = DOM({ style: 'castle-friend-add-group' }, Lang.text('callAFriend'));

            if (!item.online) {
              group.style.filter = 'grayscale(1)';

              call.style.filter = 'grayscale(1)';
            } else {
              group.onclick = async () => {
                await App.api.request(App.CURRENT_MM, 'inviteParty', {
                  id: item.id,
                });

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

            friend.oncontextmenu = () => {
              let body = document.createDocumentFragment();

              let b1 = DOM(
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

              let b2 = DOM(
                {
                  domaudio: domAudioPresets.closeButton,
                  style: 'splash-content-button',
                  event: ['click', () => Splash.hide()],
                },
                Lang.text('friendCancle'),
              );

              body.append(DOM(Lang.text('friendRemoveText').replace('{nickname}', item.nickname)), b1, b2);

              Splash.show(body);

              return false;
            };

            bottom.append(call, group);
          } else if (item.status == 2) {
            Sound.play(SOUNDS_LIBRARY.GROUP_INVITE, {
              id: 'ui-groupInvite',
              volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) * 1.2,
            });
            bottom.append(
              DOM(
                {
                  domaudio: domAudioPresets.smallButton,
                  style: 'castle-friend-confirm',
                  event: [
                    'click',
                    async () => {
                      await App.api.request('friend', 'accept', {
                        id: item.id,
                      });

                      while (bottom.firstChild) {
                        bottom.firstChild.remove();
                      }

                      bottom.append(
                        DOM(
                          {
                            domaudio: domAudioPresets.bigButton,
                            style: 'castle-friend-add-group',
                            event: [
                              'click',
                              async () => {
                                await App.api.request(App.CURRENT_MM, 'inviteParty', { id: item.id });

                                App.notify(Lang.text('friendAcceptText').replace('{nickname}', item.nickname));
                              },
                            ],
                          },
                          Lang.text('inviteToAGroup'),
                        ),
                      );
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
                      await App.api.request('friend', 'remove', {
                        id: item.id,
                      });

                      friend.remove();
                    },
                  ],
                },
                Lang.text('friendDecline'),
              ),
            );
          } else if (item.status == 3) {
            
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
                      await App.api.request('friend', 'remove', {
                        id: item.id,
                      });

                      friend.remove();
                    },
                  ],
                },
                Lang.text('cancel'),
              ),
            );
          }

          friend.dataset.url = `content/hero/empty.webp`;

          preload.add(friend);
        }
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

      let rankIcon = DOM({ style: 'rank-icon' });

      rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

      let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, item.rating), rankIcon);

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

        img.style.backgroundImage = item.hero
          ? `url(content/hero/${item.hero}/${item.skin ? item.skin : 1}.webp)`
          : `url(content/hero/empty.webp)`;
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

          request.push({ id: 0 });

          let bodyHero = DOM({ style: 'party-hero' });

          let preload = new PreloadImages(bodyHero);

          for (let item of request) {
            let hero = DOM({ domaudio: domAudioPresets.smallButton });

            hero.addEventListener('click', async () => {
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
    let body = DOM({ style: 'main' });

    let result = await App.api.request(App.CURRENT_MM, 'top', {
      limit: 100,
      hero: hero,
      mode: mode,
    });

    if (!result) {
      throw 'Рейтинг отсутствует';
    }

    let top = DOM(
      { style: isSplah ? 'wtop-scroll' : 'top-scroll' },
      DOM(
        {
          domaudio: domAudioPresets.defaultButton,
          style: 'top-filter',
          title: Lang.text('titleClickToViewHeroRating'),
          event: [
            'click',
            async () => {
              let request = await App.api.request('build', 'heroAll');

              request.push({ id: 0 });

              let bodyHero = DOM({ style: 'party-hero' });

              let preload = new PreloadImages(bodyHero);

              for (let item of request) {
                let hero = DOM({ domaudio: domAudioPresets.smallButton });

                if (item.id) {
                  hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;
                } else {
                  hero.dataset.url = `content/hero/empty.webp`;
                }

                hero.addEventListener('click', async () => {
                  if (isSplah) {
                    Window.show('main', 'top', item.id, mode);
                  } else {
                    View.show('top', item.id, false, mode);
                  }

                  Splash.hide();
                });

                preload.add(hero);
              }

              Splash.show(bodyHero, false);
            },
          ],
        },
        DOM({ tag: 'div' }),
        DOM({ tag: 'div' }),
      ),
    );

    const topFilter = top.querySelector('.top-filter');

    topFilter.style.setProperty('--filter-text', `'${Lang.text('clickToViewHeroRating')}'`);

    top.firstChild.classList.add('animation1');

    top.firstChild.firstChild.style.backgroundImage = `url(content/hero/${result[0].hero}/${result[0].skin ? result[0].skin : 1}.webp)`;

    top.firstChild.lastChild.innerText = `#1. ${result[0].nickname}`;

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

      top.append(item);

      number++;
    }

    if (!isSplah) {
      body.append(View.header());
    }
    body.append(top);

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
          let rankIcon = DOM({ style: 'rank-icon' });

          rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;

          let rank = DOM({ style: 'rank' }, DOM({ style: 'rank-lvl' }, item.rating), rankIcon);

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
      DOM({ style: 'build-left' }, Build.heroView),
      DOM(
        { style: 'build-center' },
        Build.buildActionsView,
        DOM({ style: 'build-field-with-tabs' }, Build.listView, DOM({ style: 'build-field-container' }, Build.levelView, Build.fieldView)),
        DOM(
          { style: 'build-active-bar-container' },
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
      ); // Замените путь к изображению
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
