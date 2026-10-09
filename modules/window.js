import { DOM } from './dom.js';
import { ParentEvent } from './parentEvent.js';
import { Lang } from './lang.js';
import { View } from './view.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { Castle } from './castle.js';
import { Settings } from './settings.js';
import { Sound } from './sound.js';
import { Splash } from './splash.js';
import { Shop } from './shop.js';
import { Voice } from './voice.js';
import { MM } from './mm.js';
import { Build } from './build.js';
import { Timer } from './timer.js';
import { HelpSplash } from './helpSpalsh.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';

// windows
import { keybindings } from './keybindings/keybindings.window.js';

export class Window {
  static windows = {};
  static windowOrder = [];
  static overlayWindowIds = new Set(['wquest', 'wbuild', 'wtop', 'wshop', 'wsteamauth', 'wyandexauth', 'wregistration-fraction']);
  static overlayWindowMethods = new Set(['menu', 'settings', 'advancedSettings', 'keybindings', 'accountPanel', 'support']);
  static async show(category, method, value, value2, value3) {
    if (!(method in Window)) {
      return;
    }
    if (category === 'main' && method !== 'build') {
      try {
        View.setCastleOpenedBuildHero(0);
      } catch {}
    }
    let template;
    try {
      template = await Window[method](value, value2, value3);
    } catch (error) {
      App.error(error);
      return;
    }
    if (!template) {
      return;
    }
    template.requestClose = () => {
      Window.close(category);
    };
    if (category === 'main' && method === 'keybindings') {
      const previousMethod = typeof value === 'string' ? value : 'settings';
      template.requestClose = () => {
        Window.show(category, previousMethod);
      };
    }
    let closeButton = DOM(
      {
        domaudio: domAudioPresets.closeButton,
        style: 'close-button',
        title: Lang.text('titleClose'),
        event: [
          'click',
          () => {
            Window.close(category);
            requestAnimationFrame(() => Voice.updatePanelPosition());
          },
        ],
      },
      DOM({
        tag: 'img',
        src: 'content/icons/close-cropped.svg',
        alt: Lang.text('titleClose'),
        style: 'close-image-style',
      }),
    );
    template.append(closeButton);
    if (category in Window.windows) {
      Window.windows[category].cleanup?.();
      Window.windows[category].remove();
      const index = Window.windowOrder.indexOf(category);
      if (index > -1) {
        Window.windowOrder.splice(index, 1);
      }
    }
    if (Window.overlayWindowIds.has(template.id) || Window.overlayWindowMethods.has(method)) {
      const overlay = DOM({
        style: template.id === 'wquest' ? ['window__overlay', 'wquest__overlay'] : 'window__overlay',
        event: [
          'click',
          async (event) => {
            if (template.id === 'wbuild') {
              const hero = document.elementsFromPoint(event.clientX, event.clientY)
                .map((element) => element.closest('.castle-hero-item[data-hero-id]'))
                .find(Boolean);
              if (hero) {
                const heroId = Number(hero.dataset.heroId);
                View.setCastleOpenedBuildHero(heroId);
                await Window.show(category, 'build', heroId, 0, true);
                View.syncCastleOpenedBuildHeroGlow();
                return;
              }
            }
            Window.close(category);
            requestAnimationFrame(() => Voice.updatePanelPosition());
          },
        ],
      });
      const cleanup = template.cleanup;
      template.cleanup = () => {
        cleanup?.();
        overlay.remove();
      };
      View.active.append(overlay);
    }
    Window.windows[category] = template;

    Window.windowOrder.unshift(category);

    View.active.append(template);
  }

  static close(category) {
    if (category === 'main') {
      try {
        const closingWindow = Window.windows[category];
        if (closingWindow?.id === 'wbuild') {
          View.setCastleOpenedBuildHero(0);
        }
      } catch {}
    }

    if (category === 'main' && typeof Build !== 'undefined' && Build.cleanup) {
      Build.cleanup();
    }

    if (category === 'main') {
      const windowElement = Window.windows[category];

      if (windowElement) {
        // Окно звонка
        if (windowElement.id === 'wcastle-call') {
          Sound.stop('ui-call');
          Window.callData = null;
        }

        // Окно приглашения
        if (windowElement.id === 'wcastle-invite') {
          if (Window.inviteTimeout) {
            clearTimeout(Window.inviteTimeout);
            Window.inviteTimeout = null;
          }
          Window.inviteData = null;
        }
      }
    }

    if (category in Window.windows) {
      if (Window.windows[category].cleanup) {
        Window.windows[category].cleanup();
      }
      Window.windows[category].remove();
      delete Window.windows[category];
      const index = Window.windowOrder.indexOf(category);
      if (index > -1) {
        Window.windowOrder.splice(index, 1);
      }
      return true;
    }
    return false;
  }
  static closeLast() {
    if (Window.windowOrder.length > 0) {
      const lastCategory = Window.windowOrder[0]; // Берем первый элемент (последний открытый)
      if (lastCategory === 'main') {
        const currentWindow = Window.windows['main'];
        if (currentWindow && currentWindow.id === 'wcastle-call') {
          Sound.stop('ui-call');
          Window.callData = null;
        }
        if (currentWindow.id === 'wcastle-invite') {
          if (Window.inviteTimeout) {
            clearTimeout(Window.inviteTimeout);
            Window.inviteTimeout = null;
          }
          Window.inviteData = null;
        }
      }
      return this.close(lastCategory);
    }
    return false;
  }
  static anyOpen() {
    return Window.windowOrder.length > 0;
  }
  // Окно входа через внешнего провайдера (Steam/Яндекс): бэкенд отдаёт
  // редирект на провайдера, результат возвращается postMessage'ом opener'у
  // (ParentEvent). Base один на всех провайдеров — раньше URL был
  // захардкожен в трёх местах.
  static authBase = 'https://api.zone-play.com:2087';
  // Язык серверных сообщений (ошибки входа/привязки) передаётся провайдеру:
  // у попапа своя цепочка редиректов, Accept-Language там системный, а не
  // выбранный в лончере.
  static authPopup(path, name) {
    const sep = path.includes('?') ? '&' : '?';
    ParentEvent.children = window.open(
      `${Window.authBase}${path}${sep}lang=${encodeURIComponent(Lang.target)}`,
      name,
      'width=1280, height=720, top=' +
        (screen.height - 720) / 2 +
        ', left=' +
        (screen.width - 1280) / 2 +
        ', toolbar=no, menubar=no, location=no, scrollbars=no, resizable=no, status=no',
    );
  }
  static async steamauth() {
    return DOM(
      { id: 'wsteamauth' },
      DOM({ style: ['castle-menu-title', 'steam-auth-title', 'auth-window-title'] }, Lang.text('steamauthTitle')),
      DOM(
        { style: ['castle-menu-items', 'steam-auth-items'] },
        DOM({ style: ['castle-menu-text', 'steam-auth-text'] }, Lang.text('steamauth')),
        DOM(
          {
            domaudio: domAudioPresets.defaultButton,
            style: ['castle-menu-item-button', 'steam-auth-continue'],
            event: ['click', () => Window.authPopup('/', 'SteamAuth')],
          },
          Lang.text('continue'),
        ),
      ),
    );
  }
  // Яндекс-вход: тот же контракт postMessage, что у Steam, но регистрация — не
  // автоматом: бэкенд присылает билет {action:'register'}, а форму (ник,
  // фракция, согласие на обработку ПДн) рисует лончер — View.yandexRegistration.
  static async yandexauth() {
    return DOM(
      { id: 'wyandexauth' },
      DOM({ style: ['castle-menu-title', 'auth-title', 'auth-window-title'] }, Lang.text('yandexauthTitle')),
      DOM(
        { style: ['castle-menu-items', 'auth-items'] },
        DOM({ style: ['castle-menu-text', 'auth-text'] }, Lang.text('yandexauth')),
        DOM(
          {
            domaudio: domAudioPresets.defaultButton,
            style: ['castle-menu-item-button', 'auth-continue'],
            event: ['click', () => Window.authPopup('/yandex/', 'YandexAuth')],
          },
          Lang.text('continue'),
        ),
      ),
    );
  }
  static async registrationFraction(fractionButton) {
    const factions = [
      { value: '2', label: Lang.text('docts'), icon: 'content/icons/Human_logo_over2.webp' },
      { value: '1', label: Lang.text('adornia'), icon: 'content/icons/Elf_logo_over.webp' },
    ];

    const items = factions.map((fraction) =>
      DOM(
        {
          tag: 'button',
          type: 'button',
          domaudio: domAudioPresets.defaultButton,
          style: [
            'registration-faction-option',
            ...(fractionButton.value === fraction.value ? ['registration-faction-option--selected'] : []),
          ],
          event: [
            'click',
            () => {
              fractionButton.value = fraction.value;
              fractionButton.textContent = fraction.label;
              fractionButton.classList.add('registration-fraction-trigger--selected');
              Window.close('main');
            },
          ],
        },
        DOM({ style: 'registration-faction-label' }, fraction.label),
        DOM({ tag: 'img', style: 'registration-faction-icon', src: fraction.icon, alt: fraction.label }),
      ),
    );

    return DOM(
      { id: 'wregistration-fraction' },
      DOM({ style: ['castle-menu-title', 'registration-faction-title', 'auth-window-title'] }, Lang.text('fraction')),
      DOM({ style: 'registration-faction-items' }, ...items),
    );
  }
  static async build(heroId, targetId = 0, isWindow = false) {
    let viewBuild = await View.build(heroId, targetId, isWindow);
    // Пропускаем null наверх: Window.show не подменит текущее окно пустым #wbuild
    // (быстрое переключение вкладок билдов — устаревший инициал).
    if (!viewBuild) {
      return null;
    }
    requestAnimationFrame(() => Voice.updatePanelPosition());
    return DOM({ id: 'wbuild' }, viewBuild);
  }
  static async top(hero = 0, mode = 0) {
    let viewTop = await View.top(hero, true, mode);
    return DOM({ id: 'wtop', cleanup: () => viewTop.cleanup?.() }, viewTop);
  }
  static async farm() {
    // одна мини-игра за раз: открытая «Мастерская свитков» закрывается,
    // а при её открытии закрывается это окно
    window.dispatchEvent(new CustomEvent('pw:minigame-open', { detail: 'farm' }));
    if (!Window.farmMinigameListener) {
      Window.farmMinigameListener = (e) => {
        if (e.detail !== 'farm' && Window.windows.main?.id === 'wgame') Window.close('main');
      };
      window.addEventListener('pw:minigame-open', Window.farmMinigameListener);
    }
    let view = await View.game(true);
    return DOM({ id: 'wgame' }, view);
  }
  static async history() {
    let view = await View.history(true);
    return DOM({ id: 'whistory' }, view);
  }
  static async inventory() {
    let view = await View.inventory(true);
    return DOM({ id: 'winventory' }, view);
  }

  static async processShopAndCollection(request, isShop) {
    View.castleCrystalContainer.classList.remove('crystal-container-anim');
    let topHeroVictoryCount = { heroId: 1, skinId: 1, frameId: 0 };
    try {
      topHeroVictoryCount = await App.api.request(App.CURRENT_MM, 'getHeroWithFrameId');
    } catch (e) {
      App.error(e);
    }
    let category = {
      skin: DOM({ style: 'shop_items' }),
      flag: DOM({ style: 'shop_items' }),
      frame: DOM({ style: ['shop_items', 'shop_items_frames'] }),
    };

    function prepareItem(rItem) {
      let additionalMessage = DOM({ style: 'shop_category_hint' });
      let isEnabled = rItem.enabled;
      const categoryName = Shop.categories[rItem.categoryId];
      const isFrame = categoryName == 'frame';
      const isFlag = categoryName == 'flag';
      const isSkin = categoryName == 'skin';
      const isDefault = rItem.id == 0;
      let item = DOM({
        style: isFrame ? 'shop_item_img_frame' : 'shop_item_img',
      });
      let itemSrc = DOM({ style: 'shop_item_img' });
      let itemIcon = Shop.getIcon(rItem.categoryId, isFrame ? `${rItem.externalId}/${topHeroVictoryCount.frameId}` : rItem.externalId);
      item.style.backgroundImage = itemIcon[0];
      let itemName = Shop.getName(rItem.categoryId, rItem.externalId);
      const translatedName = Lang.text(itemName[0]);
      let srcTranslatedName = '';
      let frameItems = [item.cloneNode(), item.cloneNode(), item.cloneNode(), item.cloneNode()];
      if (isSkin) {
        itemSrc.style.backgroundImage = itemIcon[1]; //`url("content/hero/${heroId}/1.webp")`;
        srcTranslatedName = Lang.text(itemName[1]);
        let heroId_skinId = rItem.externalId.split('/');
        let heroId = heroId_skinId[0];
        let skinId = heroId_skinId[1];
        if (!isShop) {
          const currentHeroSkin = MM.hero.filter((hero) => {
            return hero.id == heroId;
          })[0].skin;
          isEnabled = currentHeroSkin != skinId;
        }
      }
      let shopItemBackground = DOM();
      if (isFrame) {
        shopItemBackground = DOM({ style: 'shop_item_img' });
        shopItemBackground.style.backgroundImage = `url("content/hero/${topHeroVictoryCount.heroId}/${topHeroVictoryCount.skinId}.webp")`;
        frameItems[1].style.backgroundImage = itemIcon[1];
        frameItems[2].style.backgroundImage = itemIcon[2];
        frameItems[3].style.backgroundImage = itemIcon[3];

        if (topHeroVictoryCount.frameId == 0 && !isDefault) {
          additionalMessage.appendChild(DOM({ style: 'splash-shop-item-hint' }, Lang.text('frame_hint')));
        }
        if (topHeroVictoryCount.frameId > 0 && !isDefault) {
          let targetShopItem = frameItems[topHeroVictoryCount.frameId - 1];
          targetShopItem.classList.add('shop_item_frame_animated');
        }
      }
      if (isFlag) {
        shopItemBackground = DOM({ style: 'shop_item_img_flag' });
        shopItemBackground.style.backgroundImage = item.style.backgroundImage;
        item.style.backgroundImage = `url("content/img/b7.png")`;
      }
      if (isSkin) {
        shopItemBackground = DOM({ style: 'shop_item_img_skin' });
        shopItemBackground.style.backgroundImage = `url("content/img/b2.png")`;
      }
      let shopItemContainerStyle = [
        isEnabled ? 'shop_item_container' : isShop ? 'shop_item_container_disabled' : 'shop_item_container_equipped',
      ];
      const showQuadFrame = isFrame && !isDefault;
      if (isSkin) {
        shopItemContainerStyle.push('show_item_container_double');
      }
      if (showQuadFrame) {
        shopItemContainerStyle.push('show_item_container_quadruple');
      }
      let shopItem = DOM(
        { style: shopItemContainerStyle, title: translatedName },
        isSkin
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), itemSrc),
              DOM({ style: 'shop_item_name' }, isSkin ? srcTranslatedName : ''),
            )
          : DOM(),
        !isFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground, item),
              DOM(
                { style: 'shop_item_name' },
                isSkin
                  ? translatedName
                  : isFrame
                    ? Lang.text('frame_req_1')
                    : isFlag && isDefault
                      ? Lang.text('flag_no_flag')
                      : '',
              ),
            )
          : DOM(),
        isFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[0]),
              DOM({ style: 'shop_item_name' }, showQuadFrame ? Lang.text('frame_req_1') : Lang.text('frame_no_frame')),
            )
          : DOM(),
        showQuadFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[1]),
              DOM({ style: 'shop_item_name' }, Lang.text('frame_req_2')),
            )
          : DOM(),
        showQuadFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[2]),
              DOM({ style: 'shop_item_name' }, Lang.text('frame_req_3')),
            )
          : DOM(),
        showQuadFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[3]),
              DOM({ style: 'shop_item_name' }, Lang.text('frame_req_4')),
            )
          : DOM(),
        isSkin ? DOM({ style: 'shop_item_arrow' }) : DOM(),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'shop_item_price_container',
            event: [
              'click',
              async () => {
                if (!shopItem.classList.contains('shop_item_container')) {
                  return;
                }
                if (isShop) {
                  Splash.show(
                    DOM(
                      {},
                      DOM({ style: 'splash-modal-scope-shop-action' }),
                      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('buyModalText'))),
                      DOM({ style: 'splash-item-container' }, isFlag ? shopItemBackground.cloneNode() : item.cloneNode()),
                      DOM(
                        { style: 'splash-item-text' },
                        Lang.text('windowShopBuyItem'),
                        DOM({ style: 'splash-shop-item-name' }, `${translatedName}`),
                        DOM({ tag: 'br' }),
                        Lang.text('windowShopItemPrice').replace('{rItem.price}', rItem.price),
                        DOM({
                          tag: 'img',
                          src: 'content/img/queue/DiamondBlue.png',
                          style: 'splash_shop_item_price_icon',
                        }),
                        `?`,
                        DOM({}, additionalMessage),
                      ),
                      DOM(
                        {
                          domaudio: domAudioPresets.bigButton,
                          style: 'splash-content-button',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                              let crystalLeft = null;
                              try {
                                crystalLeft = await App.api.request('shop', 'buy', { id: rItem.id });
                                if (isSkin) {
                                  let heroId_skinId = rItem.externalId.split('/');
                                  let heroId = heroId_skinId[0];
                                  let skinId = heroId_skinId[1];
                                  await Build.changeSkinForHero(heroId, skinId);
                                }
                                // to refactor sound
                                Sound.play(SOUNDS_LIBRARY.BUY, {
                                  id: 'ui-buy',
                                  volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
                                });
                              } catch (e) {
                                App.error(e);
                                return;
                              }
                              if (Number.isInteger(crystalLeft)) {
                                View.castleTotalCrystal.firstChild.innerText = crystalLeft;
                              } else {
                                App.error(`Неизвестное число кристаллов: ${crystalLeft}`);
                              }
                              shopItem.classList.add('shop_item_container_disabled');
                              shopItem.classList.remove('shop_item_container');
                            },
                          ],
                        },
                        Lang.text('windowShopBuy'),
                      ),
                      DOM(
                        {
                          domaudio: domAudioPresets.closeButton,
                          style: 'splash-content-button-red',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                            },
                          ],
                        },
                        Lang.text('windowShopCancel'),
                      ),
                    ),
                  );
                } else {
                  Splash.show(
                    DOM(
                      {},
                      DOM({ style: 'splash-modal-scope-shop-action' }),
                      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('equipment'))),
                      DOM({ style: 'splash-item-container' }, isFlag ? shopItemBackground.cloneNode() : item.cloneNode()),
                      DOM(
                        { style: 'splash-item-text' },
                        isFrame && !showQuadFrame ? Lang.text('windowShopUnequipItem') : Lang.text('windowShopEquipItem'),
                        DOM(
                          { style: 'splash-shop-item-name' },
                          isFrame && !showQuadFrame ? Lang.text('windowShopCurrentFrame') : `${translatedName}`,
                        ),
                        '?',
                        DOM({}, additionalMessage),
                      ),
                      DOM(
                        {
                          domaudio: domAudioPresets.bigButton,
                          style: 'splash-content-button',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                              try {
                                if (isSkin) {
                                  let heroId_skinId = rItem.externalId.split('/');
                                  let heroId = heroId_skinId[0];
                                  let skinId = heroId_skinId[1];
                                  await Build.changeSkinForHero(heroId, skinId);
                                } else {
                                  if (isDefault) {
                                    await App.api.request('shop', 'applyDefault', { categoryId: rItem.categoryId });
                                  } else {
                                    await App.api.request('shop', 'apply', {
                                      id: rItem.id,
                                    });
                                  }
                                }
                              } catch (e) {
                                App.error(e);
                                return;
                              }
                              shopItem.classList.add('shop_item_container_equipped');
                              shopItem.classList.remove('shop_item_container');
                              shopItem.lastChild.firstChild.innerText = Lang.text('shop_in_use');
                              for (const collectionItem of category[categoryName].childNodes) {
                                if (collectionItem != shopItem) {
                                  collectionItem.classList.add('shop_item_container');
                                  collectionItem.classList.remove('shop_item_container_equipped');
                                  collectionItem.lastChild.firstChild.innerText = Lang.text('shop_use');
                                }
                              }
                            },
                          ],
                        },
                        isFrame && !showQuadFrame ? Lang.text('windowShopUnequip') : Lang.text('windowShopEquip'),
                      ),
                      DOM(
                        {
                          domaudio: domAudioPresets.closeButton,
                          style: 'splash-content-button-red',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                            },
                          ],
                        },
                        Lang.text('windowShopCancel'),
                      ),
                    ),
                  );
                }
              },
            ],
          },
          isShop
            ? DOM({ style: 'shop_item_price' }, DOM({ style: 'shop_item_price_icon' }), rItem.price)
            : DOM({ style: 'shop_item_price' }, isEnabled ? Lang.text('shop_use') : Lang.text('shop_in_use')),
        ),
      );
      return shopItem;
    }
    for (const rItem of request) {
      const categoryName = Shop.categories[rItem.categoryId];
      category[categoryName].appendChild(prepareItem(rItem));
    }
    let shopSeparator = DOM(
      { style: 'shop_separator' },
      DOM({ style: 'shop_separator_left' }),
      DOM({ style: 'shop_separator_right' }),
      DOM({ style: 'shop_separator_center' }),
    );

    let shopHeader = DOM(
      { style: 'shop_header' },
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: ['shop_header_item', isShop ? 'shop_header_selected' : 'shop_header_not_selected'],
          event: ['click', async () => Window.show('main', 'shop')],
        },
        Lang.text('shop_shop'),
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: ['shop_header_item', !isShop ? 'shop_header_selected' : 'shop_header_not_selected'],
          event: ['click', async () => Window.show('main', 'collection')],
        },
        Lang.text('shop_collection'),
      ),
      shopSeparator.cloneNode(true),
    );

    let shopTimeLeft = DOM({ style: 'shop_bottom_time' }, Timer.getFormattedTimer(Shop.timeBeforeUpdate));

    let shopBottom = DOM({ style: 'shop_bottom' }, Lang.text('shop_bottom'), shopTimeLeft);

    let skins = DOM(
      {
        style: category.skin.childNodes.length == 0 ? 'shop_category_hidden' : 'shop_category',
      },
      DOM({ style: 'shop_category_header' }, Lang.text('shop_skins')),
      category.skin,
    );
    let flags = DOM(
      {
        style: category.flag.childNodes.length == 0 ? 'shop_category_hidden' : 'shop_category',
      },
      DOM({ style: 'shop_category_header' }, Lang.text('shop_flags')),
      category.flag,
    );
    let frames = DOM(
      {
        style: category.frame.childNodes.length == 0 ? 'shop_category_hidden' : 'shop_category',
      },
      DOM({ style: 'shop_category_header' }, Lang.text('shop_frames')),
      category.frame,
    );

    let helpBtn = DOM({
      id: 'wshop_help',
      domaudio: domAudioPresets.defaultButton,
      style: 'help-button',
      event: [
        'click',
        () => {
          HelpSplash(Lang.text('shop_help_content'));
        },
      ],
    });
    let wnd = DOM(
      { id: 'wshop' },
      helpBtn,
      shopHeader,
      DOM(
        {
          style: ['shop_with_scroll', isShop ? 'shop_with_scroll_shop' : '_dummy_'],
        },
        skins,
        flags,
        frames,
      ),
      isShop ? shopBottom : DOM(),
    );

    await Shop.retrieveLastUpdate();

    wnd.timeLeft = Shop.timeBeforeUpdate;

    function checkUpdate() {
      setTimeout((_) => {
        if (!('main' in Window.windows) || !(Window.windows['main'].id == 'wshop')) {
          return;
        }

        if (wnd.timeLeft <= 0) {
          Window.show('main', 'shop');
          return;
        }

        shopTimeLeft.innerText = Timer.getFormattedTimer(wnd.timeLeft);
        wnd.timeLeft -= 1000;
        checkUpdate();
      }, 1000);
    }

    checkUpdate();

    return wnd;
  }

  static async shop() {
    let request = await App.api.request('shop', 'available');
    //request.sort((x,y) => x.id - y.id );
    return await this.processShopAndCollection(request, true);
  }

  static async collection() {
    let request = await App.api.request('shop', 'purchase');

    return await this.processShopAndCollection(request, false);
  }

  static async quest(item) {
    let quest = await App.api.request('quest', 'get', { id: item.id });
    let helpBtn = DOM({
      id: 'wshop_help',
      domaudio: domAudioPresets.defaultButton,
      style: 'help-button',
      event: [
        'click',
        () => {
          HelpSplash(Lang.text('quest_help_content'));
        },
      ],
    });
    let root = DOM({ id: 'wquest' }, helpBtn);

    const content = DOM({ style: 'wquest__content' });

    const titlebar = DOM({ style: 'wquest__titlebar' });
    const h3 = DOM({ tag: 'h3', style: 'wquest__title' }, quest.title);

    titlebar.appendChild(h3);

    const body = DOM({ style: 'wquest__body' }, quest.description);

    const objectiveText = DOM({ style: 'wquest__objective-title' }, quest.target);
    const objective = DOM({ style: 'wquest__objective' }, objectiveText);
    //const objText = DOM({ style: 'wquest__objective' }, quest.target);
    //objective.appendChild(objText);

    if (quest.total) {
      const progress = Math.max(0, Math.min(100, (Number(quest.score) / Number(quest.total)) * 100 || 0));
      objective.style.setProperty('--quest-progress', `${progress}%`);
      const counter = DOM({ style: 'wquest__objective-counter' }, quest.score, ' / ', quest.total);
      //objText.append(counter);
	  objective.append(counter);
    }

    const tokens = item.reward;
    const rewards = DOM({ style: 'wquest__rewards' });
    for (let reward in item.reward) {
      const chip = DOM({ style: 'wquest__chip' });
      const icon = DOM({ style: 'wquest__chip-icon' });
      let iconUrl = '';
      switch (reward) {
        case 'crystal':
          iconUrl = `url("content/img/queue/DiamondBlue.png")`;
          break;
        default:
          iconUrl = `url("content/img/queue/Spravka.png")`;
      }
      icon.style.backgroundImage = iconUrl;

      const val = DOM({ style: 'wquest__chip-value' }, item.reward[reward]);
      chip.appendChild(icon);
      chip.appendChild(val);
      rewards.appendChild(chip);
    }

    const avatarBackground = DOM({ style: 'wquest__avatar-background' });
    const avatar = DOM({ style: 'wquest__avatar' });
    const avatarContainer = DOM({ style: 'quest_container' }, avatarBackground, avatar);
    const timerMs = Number(item.timer ?? quest.timer ?? item.timeLeft ?? quest.timeLeft ?? item.remainingMs ?? quest.remainingMs ?? item.remaining ?? quest.remaining ?? 0) || 0;
    const isActiveQuest = Number(quest.status ?? item.status) === 1;

    avatar.style.backgroundImage = `url("content/hero/${item.heroId}/1.webp")`;
    avatar.style.backgroundSize = 'cover, contain';
    avatar.style.backgroundPosition = 'center, center';
    avatar.style.backgroundRepeat = 'no-repeat, no-repeat';

    if (isActiveQuest) {
      const timer = DOM({ style: ['quest-item-timer', 'wquest__timer'] });
      let timerLeft = Math.max(0, timerMs);
      const updateTimer = () => {
        timer.textContent = Timer.getFormattedTimer(timerLeft) || '00:00';
        timerLeft = Math.max(0, timerLeft - 1000);
      };
      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      const cleanup = root.cleanup;
      root.cleanup = () => {
        cleanup?.();
        clearInterval(timerInterval);
      };
      avatarContainer.appendChild(timer);
    }

    content.appendChild(titlebar);
    content.appendChild(body);
    content.appendChild(objective);
    content.appendChild(rewards);
    content.appendChild(avatarContainer);

    switch (quest.status) {
      case 0:
        content.appendChild(
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'quest-accept-button',
              domaudio: domAudioPresets.defaultButton,
              event: [
                'click',
                async () => {
                  await App.api.request('quest', 'start', { id: quest.id });

                  Window.close('main');

                  View.castleQuestUpdate();
                },
              ],
            },
            DOM({ style: 'quest-button-text' }, 'Начать'),
          ),
        );

        break;

      case 2:
        content.appendChild(
          DOM(
            {
              domaudio: domAudioPresets.finishQuestButton,
              style: 'quest-accept-button',
              domaudio: domAudioPresets.defaultButton,
              event: [
                'click',
                async () => {
                  await App.api.request('quest', 'finish', { id: quest.id });

                  Window.close('main');

                  View.castleQuestUpdate();
                },
              ],
            },
            DOM({ style: 'quest-button-text' }, 'Завершить'),
          ),
        );

        break;
    }

    root.appendChild(content);

    return root;
  }

  static async menu() {
    return DOM(
      { id: 'wcastle-menu', style: ['wcastle-menu--main', 'wcastle-menu--quest-bg'] },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('menu'))),
      DOM(
        { style: 'castle-menu-items' },
        App.isAdmin()
          ? DOM(
              { style: 'castle-menu-item-button' },
              DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'adminPanel')] }, 'Админ'),
            )
          : Window.canManageNews()
            ? DOM(
                { style: 'castle-menu-item-button' },
                DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'adminNewsPanel')] }, 'Новости'),
              )
            : DOM(),
        DOM(
          { style: 'castle-menu-item-button' },
          DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'accountPanel')] }, Lang.text('account')),
        ),
        DOM(
          { style: 'castle-menu-item-button' },
          DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'settings')] }, Lang.text('preferences')),
        ),
        DOM(
          { style: 'castle-menu-item-button' },
          DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'support')] }, Lang.text('support')),
        ),
        DOM(
          {
            domaudio: domAudioPresets.closeButton,
            style: 'castle-menu-item-button',
            event: [
              'click',
              async () => {
                App.exit();
                Splash.hide();
              },
            ],
          },
          Lang.text('accountSwitch'),
        ),
        DOM({ style: 'wcastle-menu__exit-separator' }),
        DOM(
          {
            domaudio: domAudioPresets.closeButton,
            style: ['castle-menu-item-button', 'castle-menu-item-button--red'],
            event: [
              'click',
              () => {
                if (NativeAPI.status) {
                  NativeAPI.exit();
                }
              },
            ],
          },
          Lang.text('exit'),
        ),
        DOM({ style: 'castle-menu-label' }, `${Lang.text('version')}: v.${App.PW_VERSION}`),
        DOM({ style: ['wcastle-menu__exit-separator', 'wcastle-menu__version-separator'] }),
        DOM(
          { style: 'menu-icons' },
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://vk.com/primeworld',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/vk.webp',
              alt: 'VK',
              style: 'menu-icons',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://t.me/primeworldclassic',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/telegram.webp',
              alt: 'Telegram',
              style: 'menu-icons',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://discord.gg/MueeP3aAzh',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/discord.webp',
              alt: 'Discord',
              style: 'menu-icons',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://store.steampowered.com/app/3684820/Prime_World_Classic',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/steam2.webp',
              alt: 'Steam',
              style: 'menu-icons',
            }),
          ),
        ),
      ),
    );
  }

  static async settings() {
    let soundTestId = 'sound_test';
	
	 setTimeout(() => {
          const sliders = document.querySelectorAll('.castle-menu-slider');
          sliders.forEach(slider => {
              Window.updateSliderFill(slider);
          });
      }, 0);

	
    return DOM(
      { id: 'wcastle-menu', style: ['wcastle-menu--quest-bg', 'wcastle-menu--settings-shade'] },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('preferences'))),
      DOM(
        { style: 'castle-menu-items' },
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('volume'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            value: Settings.settings.globalVolume * 100,
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.globalVolume = parseFloat(e.target.value) / 100;
                Settings.ApplySettings({ render: false, window: false });

                document.getElementById('global-volume-percentage').textContent = `${Math.round(Settings.settings.globalVolume * 100)}%`;
				Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'global-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round(Settings.settings.globalVolume * 100)}%`,
          ),
        ),
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('volumeMusic'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            value: Settings.settings.musicVolume * 100,
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.musicVolume = parseFloat(e.target.value) / 100;
                Settings.ApplySettings({ render: false, window: false });

                document.getElementById('music-volume-percentage').textContent = `${Math.round(Settings.settings.musicVolume * 100)}%`;
				Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'music-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round(Settings.settings.musicVolume * 100)}%`,
          ),
        ),
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('volumeSound'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            value: Settings.settings.soundsVolume * 100,
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.soundsVolume = parseFloat(e.target.value) / 100;
                Settings.ApplySettings({ render: false, window: false });

                if (!Castle.testSoundIsPlaying) {
                  Castle.testSoundIsPlaying = true;
                  Sound.play(
                    SOUNDS_LIBRARY.MM_FOUND,
                    {
                      id: soundTestId,
                      volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
                    },
                    () => {
                      Castle.testSoundIsPlaying = false;
                    },
                  );
                }

                document.getElementById('sounds-volume-percentage').textContent = `${Math.round(Settings.settings.soundsVolume * 100)}%`;
				Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'sounds-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round(Settings.settings.soundsVolume * 100)}%`,
          ),
        ),
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('voiceVolume'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            id: 'voice-volume-slider',
            value: Math.round((Number(Settings.settings.voiceVolume) || 1) * 100),
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.voiceVolume = parseFloat(e.target.value) / 100;
                Voice.setVolumeLevel(Settings.settings.voiceVolume);
                document.getElementById('voice-volume-percentage').textContent = `${Math.round(Settings.settings.voiceVolume * 100)}%`;
                Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'voice-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round((Number(Settings.settings.voiceVolume) || 1) * 100)}%`,
          ),
        ),
        DOM(
          {
            style: 'castle-menu-item-button',
            domaudio: domAudioPresets.defaultButton,
            event: [
              'click',
              () => {
                Window.show('main', 'advancedSettings');
              },
            ],
          },
          Lang.text('advancedSettings'),
        ),
        DOM(
          {
            style: 'castle-menu-item-button',
            domaudio: domAudioPresets.defaultButton,
            event: [
              'click',
              async (e) => {
                const oldLanguage = Lang.target;
                Lang.toggle();
                Settings.settings.language = Lang.target;
                App.error(`${Lang.text('LangTarg')}: ${Lang.list[oldLanguage].name} → ${Lang.list[Lang.target].name}`);
                await Lang.reinitViews();
                await Window.show('main', 'settings');
              },
            ],
          },
          `${Lang.text('language')} (${Lang.target})`,
        ),
        // Добавленная кнопка "Клавиши"
        DOM(
          {
            style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                Window.show('main', 'keybindings', 'settings');
              },
            ],
          },
          Lang.text('keys'),
        ),
        // Кнопка "Назад"
        DOM({ style: 'wcastle-menu__exit-separator' }),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: ['castle-menu-item-button', 'castle-menu-item-button--red'],
            event: [
              'click',
              () => {
                Window.show('main', 'menu');
              },
            ],
          },
          Lang.text('back'),
        ),
        /*,
				
				DOM({ style: 'castle-menu-label-description' }, Lang.text('soundHelp'))
				*/
      ),
    );
  }

  static async advancedSettings() {
    const voiceInWindowUnavailableByWindows = NativeAPI.isLegacyWindowsForVoiceWindow?.() === true;
    const voiceInWindowUnavailableByNwjs = NativeAPI.isLegacyNwjsForVoiceWindow?.() === true;
    const voiceInWindowUnavailable = voiceInWindowUnavailableByWindows || voiceInWindowUnavailableByNwjs;
    const voiceInWindowUnavailableTitle = voiceInWindowUnavailableByWindows
      ? Lang.text('voiceInWindowRequiresWin11')
      : voiceInWindowUnavailableByNwjs
        ? Lang.text('voiceInWindowRequiresNwjs')
        : '';
    if (voiceInWindowUnavailable) {
      Settings.settings.voiceInWindow = false;
    }

    return DOM(
      { id: 'wcastle-menu', style: ['wcastle-menu--quest-bg', 'wcastle-menu--settings-shade'] },
      DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('advancedSettings'))),
      DOM(
        { style: 'castle-menu-items' },
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'fullscreen-toggle',
              checked: !Settings.settings.fullscreen,
              event: [
                'change',
                (e) => {
                  Settings.settings.fullscreen = !e.target.checked;
                  Settings.ApplySettings({ render: false, audio: false });
                },
              ],
            },
            { checked: Settings.settings.fullscreen },
          ),
          DOM({ tag: 'label', for: 'fullscreen-toggle' }, Lang.text('windowMode') + ' (F11)'),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultSelect,
            type: 'checkbox',
            id: 'render-toggle',
            checked: Settings.settings.render,
            event: [
              'change',
              (e) => {
                Settings.settings.render = e.target.checked;
                Settings.ApplySettings({ audio: false, window: false });
              },
            ],
          }),
          DOM({ tag: 'label', for: 'render-toggle' }, Lang.text('threeD')),
        ),
        DOM({ style: 'castle-menu-section-title' }, 'Голосовая связь'),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'novoice',
              checked: Settings.settings.novoice,
              event: [
                'change',
                (e) => {
                  Settings.settings.novoice = e.target.checked;
                },
              ],
            },
            { checked: Settings.settings.novoice },
          ),
          DOM({ tag: 'label', for: 'novoice' }, Lang.text('voiceEnabled')),
        ),
        DOM(
          {
            style: voiceInWindowUnavailable ? ['castle-menu-item-checkbox', 'is-disabled'] : 'castle-menu-item-checkbox',
            title: voiceInWindowUnavailableTitle,
          },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'voice-in-window',
              checked: !voiceInWindowUnavailable && Settings.settings.voiceInWindow !== false,
              disabled: voiceInWindowUnavailable,
              title: voiceInWindowUnavailableTitle,
              event: [
                'change',
                (e) => {
                  if (voiceInWindowUnavailable) {
                    Settings.settings.voiceInWindow = false;
                    e.target.checked = false;
                    return;
                  }
                  Settings.settings.voiceInWindow = e.target.checked;
                },
              ],
            },
            { checked: !voiceInWindowUnavailable && Settings.settings.voiceInWindow !== false },
          ),
          DOM({ tag: 'label', for: 'voice-in-window', title: voiceInWindowUnavailableTitle }, Lang.text('voiceInWindow')),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'voice-radio-mode',
              checked: Settings.settings.voiceRadioMode,
              event: [
                'change',
                (e) => {
                  Settings.settings.voiceRadioMode = e.target.checked;
                },
              ],
            },
            { checked: Settings.settings.voiceRadioMode },
          ),
          DOM({ tag: 'label', for: 'voice-radio-mode' }, Lang.text('voiceRadioMode')),
        ),
        DOM({ style: 'wcastle-menu__exit-separator' }),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: ['castle-menu-item-button', 'castle-menu-item-button--red'],
            event: [
              'click',
              () => {
                Window.show('main', 'settings');
              },
            ],
          },
          Lang.text('back'),
        ),
      ),
    );
  }

  // static async keybindings() {
  //   async function findConfigFile() {
  //     const possiblePaths = [
  //       `${nw.App.getDataPath('documents')}/My Games/Prime World Classic/input_new.cfg`,
  //       `${process.env.USERPROFILE}/Documents/My Games/Prime World Classic/input_new.cfg`,
  //       `${process.env.USERPROFILE}/OneDrive/Documents/My Games/Prime World Classic/input_new.cfg`,
  //     ];

  //     for (const path of possiblePaths) {
  //       try {
  //         await fs.access(path);
  //         return path;
  //       } catch (e) {
  //         continue;
  //       }
  //     }
  //     return null;
  //   }

  //   const configPath = await findConfigFile();

  //   if (!configPath) {
  //     console.error('Не удалось найти файл конфигурации ни по одному из путей');
  //     return DOM(
  //       { id: 'wcastle-keybindings' },
  //       DOM({ style: 'castle-menu-error' }, Lang.text('keybindings_error', 'Не удалось найти файл конфигурации клавиш')),
  //       DOM(
  //         {
  //           domaudio: domAudioPresets.bigButton,
  //           class: 'castle-menu-item-button',
  //           event: ['click', () => Window.show('settings', 'menu')],
  //         },
  //         Lang.text('back', 'Назад'),
  //       ),
  //     );
  //   }

  //   const defaultKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  //   let currentBinds = {};
  //   let configReadError = false;

  //   try {
  //     const configContent = await fs.readFile(configPath, 'utf-8');
  //     const bindRegex = /bind cmd_action_bar_slot(\d+) '(.+?)'/g;
  //     let match;

  //     while ((match = bindRegex.exec(configContent)) !== null) {
  //       currentBinds[`slot${match[1]}`] = match[2];
  //     }
  //   } catch (e) {
  //     console.error('Ошибка чтения конфига:', e);
  //     configReadError = true;
  //   }

  //   return DOM(
  //     { id: 'wcastle-keybindings' },
  //     DOM({ style: 'castle-menu-title' }, Lang.text('keybindings_title', 'Настройка клавиш')),

  //     configReadError
  //       ? DOM(
  //           { style: 'castle-menu-error' },
  //           Lang.text('keybindings_error', 'Не удалось прочитать файл конфигурации клавиш. Проверьте путь:') + ' ' + configPath,
  //         )
  //       : DOM(
  //           {},
  //           ...Array.from({ length: 10 }, (_, i) => {
  //             const slotNum = i + 1;
  //             const slotKey = `slot${slotNum}`;
  //             const currentKey = currentBinds[slotKey] || defaultKeys[i];

  //             return DOM(
  //               { style: 'castle-menu-label keybinding-row' },
  //               DOM({ style: 'keybinding-label' }, Lang.text(`talent_slot_${slotNum}`, `Талант ${slotNum}`)),
  //               DOM({
  //                 tag: 'input',
  //                 domaudio: domAudioPresets.defaultInput,
  //                 type: 'text',
  //                 value: currentKey,
  //                 class: 'castle-keybinding-input',
  //                 maxLength: 1,
  //                 event: [
  //                   'keydown',
  //                   (e) => {
  //                     if (e.key === 'Backspace' || e.key === 'Delete') {
  //                       e.target.value = '';
  //                       currentBinds[slotKey] = '';
  //                       return;
  //                     }

  //                     if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
  //                       return;
  //                     }

  //                     e.preventDefault();
  //                     const key = e.key.toUpperCase();

  //                     if (/^[0-9A-Z]$/.test(key)) {
  //                       e.target.value = key;
  //                       currentBinds[slotKey] = key;
  //                       e.target.classList.add('input-success');
  //                       setTimeout(() => e.target.classList.remove('input-success'), 200);
  //                     } else {
  //                       e.target.classList.add('input-error');
  //                       setTimeout(() => e.target.classList.remove('input-error'), 200);
  //                     }
  //                   },
  //                 ],
  //               }),
  //             );
  //           }),

  //           DOM(
  //             {
  //               domaudio: domAudioPresets.bigButton,
  //               class: 'castle-menu-item-button reset-btn',
  //               event: [
  //                 'click',
  //                 () => {
  //                   document.querySelectorAll('.castle-keybinding-input').forEach((input, i) => {
  //                     input.value = defaultKeys[i];
  //                     currentBinds[`slot${i + 1}`] = defaultKeys[i];
  //                   });

  //                   const btn = document.querySelector('.reset-btn');
  //                   btn.classList.add('action-success');
  //                   btn.textContent = Lang.text('reset_complete', 'Сброшено!');
  //                   setTimeout(() => {
  //                     btn.classList.remove('action-success');
  //                     btn.textContent = Lang.text('reset_defaults', 'Сбросить на 1-0');
  //                   }, 1000);
  //                 },
  //               ],
  //             },
  //             Lang.text('reset_defaults', 'Сбросить на 1-0'),
  //           ),

  //           DOM(
  //             {
  //               domaudio: domAudioPresets.bigButton,
  //               class: 'castle-menu-item-button save-btn',
  //               event: [
  //                 'click',
  //                 async () => {
  //                   try {
  //                     let newConfig = '';
  //                     for (let i = 1; i <= 10; i++) {
  //                       const key = currentBinds[`slot${i}`] || defaultKeys[i - 1];
  //                       newConfig += `bind cmd_action_bar_slot${i} '${key}'\n`;
  //                     }

  //                     await fs.writeFile(configPath, newConfig);

  //                     const btn = document.querySelector('.save-btn');
  //                     btn.classList.add('action-success');
  //                     btn.textContent = Lang.text('saved', 'Сохранено!');
  //                     setTimeout(() => {
  //                       btn.classList.remove('action-success');
  //                       btn.textContent = Lang.text('save', 'Сохранить');
  //                     }, 1000);
  //                   } catch (e) {
  //                     console.error('Ошибка сохранения:', e);
  //                     const btn = document.querySelector('.save-btn');
  //                     btn.classList.add('action-error');
  //                     btn.textContent = Lang.text('save_error', 'Ошибка!');
  //                     setTimeout(() => {
  //                       btn.classList.remove('action-error');
  //                       btn.textContent = Lang.text('save', 'Сохранить');
  //                     }, 1000);
  //                   }
  //                 },
  //               ],
  //             },
  //             Lang.text('save', 'Сохранить'),
  //           ),
  //         ),

  //     DOM(
  //       {
  //         domaudio: domAudioPresets.bigButton,
  //         class: 'castle-menu-item-button',
  //         event: ['click', () => Window.show('settings', 'menu')],
  //       },
  //       Lang.text('back', 'Назад'),
  //     ),
  //   );
  // }

  static async support() {
    return DOM(
      { id: 'wcastle-menu', style: 'wcastle-menu--quest-bg' },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('support'))),
      DOM(
        { style: 'castle-menu-items' },
        DOM({ style: 'castle-menu-text' }, 'У вас есть вопросы или нужна помощь, то можете связаться с нами через социальные сети.'),
        DOM(
          { style: 'menu-icons' },
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://vk.me/join/AZQ1dy/d2Qg98tKilOoQ1u34',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/vk.webp',
              alt: 'VK',
              style: 'support-icon',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://t.me/primeworldclassic/8232',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/telegram.webp',
              alt: 'Telegram',
              style: 'support-icon',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://discord.gg/S3yrbFGT86',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/discord.webp',
              alt: 'Discord',
              style: 'support-icon',
            }),
          ),
        ),
        DOM({ style: 'wcastle-menu__exit-separator' }),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: ['castle-menu-item-button', 'castle-menu-item-button--red'],
            event: ['click', () => Window.show('main', 'menu')],
          },
          Lang.text('back'),
        ),
      ),
    );
  }
  
  static async mmSearchSettings() {
    let mmEnabled = true;
    let mmtestEnabled = true;
    let mmRatingChangesEnabled = true;
    
    try {
      const [mmState, mmtestState, mmRatingChangesState] = await Promise.all([
        App.api.request('mm', 'getSearchAvailability'),
        App.api.request('mmtest', 'getSearchAvailability'),
        App.api.request('mm', 'getRatingChangesAvailability'),
      ]);
      mmEnabled = Boolean(mmState?.enabled);
      mmtestEnabled = Boolean(mmtestState?.enabled);
      mmRatingChangesEnabled = Boolean(mmRatingChangesState?.enabled);
    } catch (error) {
      App.error(error);
    }
    
    const updateFlag = async (target, checked, input) => {
      try {
        const response = await App.api.request(target, 'setSearchAvailability', { enabled: checked });
        input.checked = Boolean(response?.enabled);
      } catch (error) {
        input.checked = !checked;
        App.error(error);
      }
    };
    
    const mmToggle = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultSelect,
      type: 'checkbox',
      id: 'mm-search-enabled',
      checked: mmEnabled,
      event: [
        'change',
        (e) => updateFlag('mm', e.target.checked, e.target),
      ],
    });
    
    const mmtestToggle = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultSelect,
      type: 'checkbox',
      id: 'mmtest-search-enabled',
      checked: mmtestEnabled,
      event: [
        'change',
        (e) => updateFlag('mmtest', e.target.checked, e.target),
      ],
    });
    
    const mmRatingChangesToggle = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultSelect,
      type: 'checkbox',
      id: 'mm-rating-changes-enabled',
      checked: mmRatingChangesEnabled,
      event: [
        'change',
        async (e) => {
          try {
            const response = await App.api.request('mm', 'setRatingChangesAvailability', { enabled: e.target.checked });
            e.target.checked = Boolean(response?.enabled);
          } catch (error) {
            e.target.checked = !e.target.checked;
            App.error(error);
          }
        },
      ],
    });
    
    return DOM(
      { id: 'wcastle-menu' },
      DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, 'Настройка поиска боя')),
      DOM(
        { style: 'castle-menu-items' },
        DOM({ style: 'castle-menu-item-checkbox' }, mmToggle, DOM({ tag: 'label', for: 'mm-search-enabled' }, 'Включить поиск боя (MM)')),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          mmtestToggle,
          DOM({ tag: 'label', for: 'mmtest-search-enabled' }, 'Включить поиск боя (MMTEST)'),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          mmRatingChangesToggle,
          DOM({ tag: 'label', for: 'mm-rating-changes-enabled' }, 'Изменять рейтинг после обычных матчей (MM)'),
        ),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'castle-menu-item-button',
            event: ['click', () => Window.show('main', 'adminPanel')],
          },
          Lang.text('back'),
        ),
      ),
    );
  }
  
  static async adminPanel() {
    return DOM(
      { id: 'wcastle-menu' },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, 'Админ Панель')),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: ['click', () => Window.show('main', 'adminNewsPanel')],
        },
        'Оформление новостей',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              Window.show('main', 'mmSearchSettings');
            },
          ],
        },
        'Поиск боя',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              View.show('talents'); // Логика для отображения обычных талантов
            },
          ],
        },
        'Таланты (обычные)',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              View.show('talents2'); // Логика для отображения классовых талантов
            },
          ],
        },
        'Таланты (классовые)',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              View.show('users'); // Логика для управления пользователями
            },
          ],
        },
        'Пользователи',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              Window.show('main', 'castleDebug'); // Логика для управления пользователями
            },
          ],
        },
        'Замок дебаг',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: ['click', () => Window.show('main', 'menu')],
        },
        Lang.text('back'),
      ),
    );
  }

  static canManageNews() {
    return App.isAdmin() || App.isHelper();
  }

  static async adminNewsPanel() {
    if (!Window.canManageNews()) {
      return DOM(
        { id: 'wcastle-menu' },
        DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, 'Нет доступа')),
        DOM({ style: 'castle-menu-text' }, 'Эта панель доступна только администраторам и модераторам.'),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'castle-menu-item-button',
            event: ['click', () => Window.show('main', 'menu')],
          },
          Lang.text('back'),
        ),
      );
    }

    const title = DOM({ tag: 'input', domaudio: domAudioPresets.defaultInput, style: 'admin-news-input', placeholder: 'Заголовок новости' });
    const bannerFile = DOM({ tag: 'input', domaudio: domAudioPresets.defaultInput, style: 'admin-news-file', type: 'file', accept: 'image/webp,image/png,image/jpeg' });
    const lifetime = DOM(
      { tag: 'select', domaudio: domAudioPresets.defaultSelect, style: 'admin-news-input' },
      DOM({ tag: 'option', value: 'week' }, 'Неделя'),
      DOM({ tag: 'option', value: 'month' }, 'Месяц'),
      DOM({ tag: 'option', value: 'permanent' }, 'Постоянно'),
      DOM({ tag: 'option', value: 'custom' }, 'Своя дата'),
    );
    const expiresAt = DOM({ tag: 'input', domaudio: domAudioPresets.defaultInput, style: 'admin-news-input', type: 'date' });
    const publishAt = DOM({ tag: 'input', domaudio: domAudioPresets.defaultInput, style: 'admin-news-input', type: 'datetime-local' });
    const existingNews = DOM({ tag: 'select', domaudio: domAudioPresets.defaultSelect, style: 'admin-news-input' }, DOM({ tag: 'option', value: '' }, 'Новая новость'));
    const message = DOM({ tag: 'textarea', domaudio: domAudioPresets.defaultInput, style: 'admin-news-textarea', placeholder: 'Описание новости. Картинка в тексте: ![описание](https://site/image.webp)' });
    const status = DOM({ style: 'admin-news-status' }, 'Черновик готов к оформлению');
    const previewLabel = DOM({ style: 'admin-news-preview-label' }, 'Предпросмотр');
    const previewTitle = DOM({ style: 'admin-news-preview-title' }, 'Заголовок новости');
    const previewMessage = DOM({ style: 'admin-news-preview-message' }, 'Описание появится здесь.');
    const preview = DOM(
      { style: 'admin-news-preview' },
      previewLabel,
      previewTitle,
      previewMessage,
    );
    let selectedBannerFile = null;
    let selectedBannerPreviewUrl = '';
    let editingNewsId = 0;

    const getExpiresAt = () => {
      const now = new Date();
      if (lifetime.value === 'permanent') return '';
      if (lifetime.value === 'custom') {
        if (!expiresAt.value) return '';
        return `${expiresAt.value}T23:59:59`;
      }

      const days = lifetime.value === 'month' ? 30 : 7;
      now.setDate(now.getDate() + days);
      return now.toISOString();
    };

    const getDraft = () => {
      const expires_at = getExpiresAt();
      return {
        title: title.value.trim() || 'Новость',
        message: message.value.trim() || 'Новость пока без описания',
        details: '',
        lifetime: lifetime.value,
        expires_at,
        publish_at: publishAt.value ? new Date(publishAt.value).toISOString() : '',
        scheduled_at: publishAt.value ? new Date(publishAt.value).toISOString() : '',
        created_at: new Date().toISOString(),
      };
    };

    const insertTextAtCursor = (node, textToInsert) => {
      const start = Number(node.selectionStart || 0);
      const end = Number(node.selectionEnd || start);
      const before = node.value.slice(0, start);
      const after = node.value.slice(end);
      const prefix = before && !before.endsWith('\n') ? '\n\n' : '';
      const suffix = after && !after.startsWith('\n') ? '\n\n' : '';
      const value = `${prefix}${textToInsert}${suffix}`;
      node.value = `${before}${value}${after}`;
      node.focus();
      node.selectionStart = node.selectionEnd = before.length + value.length;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const isImageUrl = (value) => /^https?:\/\/\S+\.(?:png|jpe?g|webp|gif|avif)(?:[/?#]\S*)?$/i.test(String(value || '').trim());

    const extractImageUrlFromClipboardHtml = (html) => {
      const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
      const image = doc.querySelector('img[src]');
      const src = String(image?.getAttribute('src') || '').trim();
      return isImageUrl(src) ? src : '';
    };

    const insertImageUrl = (target, url) => {
      insertTextAtCursor(target, `![Картинка новости](${url})`);
      status.textContent = 'Ссылка на картинку вставлена в текст новости';
    };

    const handleImagePaste = (event) => {
      const target = event.currentTarget;
      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const text = clipboard.getData('text/plain').trim();
      if (isImageUrl(text)) {
        event.preventDefault();
        insertImageUrl(target, text);
        return;
      }

      const htmlImageUrl = extractImageUrlFromClipboardHtml(clipboard.getData('text/html'));
      if (htmlImageUrl) {
        event.preventDefault();
        insertImageUrl(target, htmlImageUrl);
        return;
      }

      const imageItem = Array.from(clipboard.items || []).find((item) => item.kind === 'file' && item.type.startsWith('image/'));
      if (!imageItem) return;

      event.preventDefault();
      status.textContent = 'Сама картинка слишком большая для поля новости. Скопируйте ссылку на картинку или загрузите ее на сайт и вставьте URL.';
    };

    const compactText = (value, limit = 900) => {
      const textValue = String(value || '').trim();
      if (textValue.length <= limit) return textValue;
      return `${textValue.slice(0, limit - 3).trim()}...`;
    };

    const prepareDraftForPublish = () => {
      const draft = getDraft();
      if (/data:image\//i.test(`${draft.message}\n${draft.details}`)) {
        status.textContent = 'Удалите старую base64-картинку из текста. Для новости нужна ссылка на картинку, иначе серверная колонка message переполняется.';
        return null;
      }

      if (draft.message.length > 900) {
        draft.details = draft.details ? `${draft.message}\n\n${draft.details}` : draft.message;
        draft.message = compactText(draft.message, 900);
      }

      return draft;
    };

    const renderPreview = () => {
      const draft = getDraft();
      previewTitle.textContent = draft.title;
      previewMessage.textContent = draft.message;
      previewLabel.textContent = draft.expires_at ? `Предпросмотр - до ${new Date(draft.expires_at).toLocaleDateString('ru-RU')}` : 'Предпросмотр - постоянно';
      preview.style.backgroundImage = selectedBannerPreviewUrl
        ? `linear-gradient(90deg, rgba(0, 25, 32, 0.18), rgba(0, 25, 32, 0.78)), url("${selectedBannerPreviewUrl}")`
        : '';
    };

    const updateLifetimeControl = () => {
      expiresAt.disabled = lifetime.value !== 'custom';
      expiresAt.classList.toggle('is-disabled', lifetime.value !== 'custom');
      renderPreview();
    };

    bannerFile.addEventListener('change', () => {
      const file = bannerFile.files?.[0] || null;
      selectedBannerFile = null;
      if (selectedBannerPreviewUrl && selectedBannerPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedBannerPreviewUrl);
      }
      selectedBannerPreviewUrl = '';

      if (!file) {
        renderPreview();
        return;
      }

      if (!['image/webp', 'image/png', 'image/jpeg'].includes(file.type)) {
        status.textContent = 'Баннер должен быть WEBP, PNG или JPEG';
        bannerFile.value = '';
        renderPreview();
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        status.textContent = 'Баннер слишком большой, максимум 2 MB';
        bannerFile.value = '';
        renderPreview();
        return;
      }

      selectedBannerFile = file;
      selectedBannerPreviewUrl = URL.createObjectURL(file);
      status.textContent = 'Баннер добавлен к публикации';
      renderPreview();
    });

    const resetEditor = () => {
      editingNewsId = 0;
      existingNews.value = '';
      title.value = '';
      message.value = '';
      publishAt.value = '';
      expiresAt.value = '';
      lifetime.value = 'week';
      selectedBannerFile = null;
      selectedBannerPreviewUrl = '';
      bannerFile.value = '';
      updateLifetimeControl();
      status.textContent = 'Новая новость готова к оформлению';
      renderPreview();
    };

    const fillEditor = (item) => {
      editingNewsId = Number(item?.id || 0);
      title.value = item?.title || '';
      message.value = item?.message || '';
      publishAt.value = item?.publish_at || item?.scheduled_at ? new Date(item.publish_at || item.scheduled_at).toISOString().slice(0, 16) : '';
      expiresAt.value = item?.expires_at ? new Date(item.expires_at).toISOString().slice(0, 10) : '';
      lifetime.value = item?.expires_at ? 'custom' : 'permanent';
      selectedBannerFile = null;
      bannerFile.value = '';
      selectedBannerPreviewUrl = item?.banner_url || '';
      updateLifetimeControl();
      status.textContent = `Редактируется новость #${editingNewsId}`;
      renderPreview();
    };

    const refreshExistingNews = async () => {
      await App.loadNotificationNews({ forceUpdate: true, render: false });
      const auditNews = App.notificationsNews.filter((item) => item.source !== 'steam' && !item.is_external);
      existingNews.replaceChildren(DOM({ tag: 'option', value: '' }, 'Новая новость'));
      auditNews.forEach((item) => existingNews.append(DOM({ tag: 'option', value: String(item.id) }, `${item.id}: ${item.title}`)));
      if (editingNewsId) existingNews.value = String(editingNewsId);
    };

    existingNews.addEventListener('change', () => {
      const id = Number(existingNews.value || 0);
      if (!id) return resetEditor();
      const item = App.notificationsNews.find((news) => Number(news.id) === id);
      if (item) fillEditor(item);
    });

    message.addEventListener('paste', handleImagePaste);
    [title, message, expiresAt, publishAt].forEach((node) => node.addEventListener('input', renderPreview));
    lifetime.addEventListener('change', updateLifetimeControl);
    updateLifetimeControl();
    renderPreview();

    const publishNews = async () => {
      const draft = prepareDraftForPublish();
      if (!draft) return;
      try {
        if (editingNewsId) {
          await App.notificationsRequestNewsUpdate(editingNewsId, draft, selectedBannerFile);
        } else {
          await App.notificationsRequestNewsCreate(draft, selectedBannerFile);
        }
        status.textContent = 'Новость отправлена на сервер для всех игроков';
        if (selectedBannerPreviewUrl && selectedBannerPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(selectedBannerPreviewUrl);
        }
        selectedBannerPreviewUrl = '';
        selectedBannerFile = null;
        bannerFile.value = '';
        renderPreview();
        App.notificationsActiveTab = 'news';
        await App.loadNotificationNews({ forceUpdate: true });
        await refreshExistingNews();
        App.notify('Новость опубликована');
      } catch (error) {
        status.textContent = `Audit API: ${String(error?.message || error || 'news_create failed')}`;
        if (error?.audit || error?.meta) {
          console.warn('Audit news_create response', error.audit, error.meta);
        }
        App.error(error);
      }
    };

    const deleteNews = async () => {
      if (!editingNewsId) {
        status.textContent = 'Выберите новость для удаления';
        return;
      }
      try {
        await App.notificationsRequestNewsDelete(editingNewsId);
        status.textContent = `Новость #${editingNewsId} удалена`;
        resetEditor();
        await refreshExistingNews();
      } catch (error) {
        status.textContent = `Audit API: ${String(error?.message || error || 'news_delete failed')}`;
        App.error(error);
      }
    };

    refreshExistingNews().catch((error) => {
      status.textContent = `Не удалось загрузить список новостей: ${String(error?.message || error)}`;
    });

    if (Window.pendingNewsEdit) {
      fillEditor(Window.pendingNewsEdit);
      Window.pendingNewsEdit = null;
    }

    return DOM(
      { id: 'wcastle-admin-news' },
      DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, 'Оформление новостей')),
      DOM(
        { style: 'admin-news-layout' },
        DOM(
          { style: 'admin-news-form' },
          DOM({ style: 'admin-news-field' }, DOM({ tag: 'label' }, 'Заголовок'), title),
          DOM({ style: 'admin-news-field' }, DOM({ tag: 'label' }, 'Баннер'), bannerFile),
          DOM(
            { style: 'admin-news-row' },
            DOM({ style: 'admin-news-field' }, DOM({ tag: 'label' }, 'Срок'), lifetime),
            DOM({ style: 'admin-news-field' }, DOM({ tag: 'label' }, 'Дата окончания'), expiresAt),
          ),
          DOM({ style: 'admin-news-field' }, DOM({ tag: 'label' }, 'Описание'), message),
          DOM({ style: 'admin-news-field' }, DOM({ tag: 'label' }, 'Дата публикации'), publishAt),
          status,
          DOM(
            { style: 'admin-news-actions' },
            DOM({ domaudio: domAudioPresets.bigButton, style: ['castle-menu-item-button', 'castle-menu-item-button--red'], event: ['click', deleteNews] }, 'Удалить'),
            DOM({ domaudio: domAudioPresets.bigButton, style: 'castle-menu-item-button', event: ['click', resetEditor] }, 'Новая'),
            DOM({ domaudio: domAudioPresets.bigButton, style: 'castle-menu-item-button', event: ['click', publishNews] }, 'Опубликовать всем'),
            DOM({ domaudio: domAudioPresets.bigButton, style: 'castle-menu-item-button', event: ['click', () => Window.show('main', 'adminPanel')] }, Lang.text('back')),
          ),
        ),
        preview,
      ),
    );
  }

  static async castleDebug() {
    let pattern = DOM({ tag: 'input' });
    let flags = DOM({ tag: 'input' });
    pattern.addEventListener('input', () => {
      Castle.updateFilter(pattern.value, flags.value);
    });
    flags.addEventListener('input', () => {
      Castle.updateFilter(pattern.value, flags.value);
    });
    return DOM(
      { id: 'wcastle-render-debug' },
      DOM({ style: 'castle-menu-label' }, 'Поиск построек по JS RegExp'),
      DOM({ style: 'castle-menu-label' }, 'Паттерн ', pattern),
      DOM({ style: 'castle-menu-label' }, 'Флаги ', flags),
    );
  }
  static async accountPanel() {
    return DOM({ id: 'wcastle-menu', style: 'wcastle-menu--quest-bg' }, DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('account')),),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => Window.authPopup(`/connect/${App.storage.data.token}`, 'SteamAuth'),
          ],
        },
        Lang.text('steamConnect'),
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => Window.authPopup(`/yandex/connect/${App.storage.data.token}`, 'YandexAuth'),
          ],
        },
        Lang.text('yandexConnect'),
      ),
      DOM({ style: 'wcastle-menu__exit-separator' }),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                Window.close('main');
                App.setNickname();
              },
            ],
        },
        Lang.text('nicknameChange'),
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                Window.close('main');
                App.setFraction();
              },
            ],
        },
        Lang.text('sideChange'),
      ),
      DOM({ style: 'wcastle-menu__exit-separator' }),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: ['castle-menu-item-button', 'castle-menu-item-button--red'],
          event: ['click', () => Window.show('main', 'menu')],
        },
        Lang.text('back'),
      ),
    );
  }

  static async callWindow() {
    const data = Window.callData;

    if (!data) {
      return DOM({ id: 'wcastle-call' });
    }

    let displayName = String(data?.name || data?.nickname || `id${Number(data?.id) || '?'}`);
    if (displayName.length > 13) {
      displayName = displayName.substring(0, 11) + '...';
    }

    const callTimeout = setTimeout(() => {
      Sound.stop('ui-call');

      if (Window.windows['main'] && Window.windows['main'].id === 'wcastle-call') {
        App.api.request('user', 'callTimeout', { id: data.id }).catch(console.error);
        Window.close('main');
      }

      Window.callData = null;
      Window.callTimeout = null;
    }, 15000);

    Window.callTimeout = callTimeout;

    return DOM(
      { id: 'wcastle-call' },
      DOM({style: 'title-modal'},
        DOM({style: 'title-modal-text'}, 'Звонок'),
      ),
      DOM({ style: 'castle-menu-title' }, Lang.text('friendCallFrom').replace('{name}', displayName)),
      DOM(
        { style: 'castle-menu-items-modal' },
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'splash-content-button-modal',
            event: [
              'click',
              async () => {
                Sound.stop('ui-call');
                try {
                  let voice = new Voice(data.id, String(data?.key || ''), data.name, true);
                  await voice.accept(data.offer);
                  Window.callData = null;
                  Window.close('main');
                } catch (error) {
                  App.error(error);
                  Window.callData = null;
                }
              },
            ],
          },
          Lang.text('friendAccept'),
        ),

        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'splash-content-button-modal',
            id: 'splash-content-button-modal-red',
            event: [
              'click',
              async () => {
                Sound.stop('ui-call');
                Window.callData = null;
                Window.close('main');
              },
            ],
          },
          Lang.text('friendDropCall'),
        ),
      ),
    );
  }

  static async inviteWindow() {
    const data = Window.inviteData;

    Sound.play(SOUNDS_LIBRARY.GROUP_INVITE, {
      id: 'ui-groupInvite',
      volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) * 1.2,
    });

    if (!data) {
      console.warn('Нет данных для окна приглашения');
      return DOM({ id: 'wcastle-invite' });
    }

    let displayNickname = data.nickname;
    if (displayNickname.length > 13) {
      displayNickname = displayNickname.substring(0, 11) + '...';
    }

    const inviteTimeout = setTimeout(() => {
      console.log('Таймаут 15 секунд, приглашение автоматически отменяется');

      if (Window.windows['main'] && Window.windows['main'].id === 'wcastle-invite') {
        Window.close('main');
      }

      Window.inviteData = null;
      Window.inviteTimeout = null;
    }, 15000);

    Window.inviteTimeout = inviteTimeout;

    return DOM(
      { id: 'wcastle-invite' }, DOM({style: 'title-modal'},DOM({style: 'title-modal-text'}, Lang.text('battleText')),),
      DOM({ style: 'castle-menu-title' }, Lang.text('friendInvitesToLobby').replace('{nickname}', displayNickname)),
      DOM(
        { style: 'castle-menu-items-modal' },
        DOM(
          {
            style: 'splash-content-button-modal',
            domaudio: domAudioPresets.bigButton,
            event: [
              'click',
              async () => {
                if (Window.inviteTimeout) {
                  clearTimeout(Window.inviteTimeout);
                  Window.inviteTimeout = null;
                }

                try {
                  await App.api.request(App.CURRENT_MM, 'joinParty', {
                    code: data.code,
                    version: App.PW_VERSION,
                  });
                  Window.inviteData = null;
                  Window.close('main');
                } catch (error) {
                  App.error(error);
                  Window.inviteData = null;
                }
              },
            ],
          },
          Lang.text('friendAccept'),
        ),

        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'splash-content-button-modal',
            id: 'splash-content-button-modal-red',
            event: [
              'click',
              () => {
                if (Window.inviteTimeout) {
                  clearTimeout(Window.inviteTimeout);
                  Window.inviteTimeout = null;
                }
                Window.inviteData = null;
                Window.close('main');
              },
            ],
          },
          Lang.text('friendCancle'),
        ),
      ),
    );
  }
  
  static updateSliderFill(slider) {
	const value = slider.value;
	const max = slider.max;
	const percentage = 2 + (value / max * 98);
	console.log(value, max);
	slider.style.setProperty('--fill-percentage', percentage + '%');
  }
}
Window.keybindings = keybindings;
