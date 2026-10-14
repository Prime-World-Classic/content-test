import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { View } from './view.js';
import { App } from './app.js';
import { MM } from './mm.js';
import { Build } from './build.js';
import { Castle } from './castle.js';
import { Sound } from './sound.js';
import { Splash } from './splash.js';
import { Shop } from './shop.js';
import { Timer } from './timer.js';
import { HelpSplash } from './helpSpalsh.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';
import { NativeAPI } from './nativeApi.js';
import { UserCfg } from './battleSettings.js';

// «Ярмарка» в замке: окно в стиле «Настроек боя» (вкладки категорий слева, товары справа).
// Товары берутся из базы: shop.available (ярмарка), shop.purchase (коллекция),
// покупка shop.buy, выбор shop.apply / shop.applyDefault, скины — Build.changeSkinForHero.
//
// Новые категории (shop_item.categoryId, отдельной таблицы категорий в базе нет):
// - Загрузочные экраны (4): externalId = имя картинки: content/img/fair/loadscreens/<имя>.webp (превью лаунчера)
//   и /UI/Styles/LoadingBack/Fair/<имя>.dds в данных игры (DXT1 1920x1080). Выбранное имя — user.cfg
//   `setvar fair_loadscreen = <имя>` (none — фон карты), игра подменяет фон загрузки только у этого игрока
//   (PW_Game LoadingScreenLogic, FairLoadingBack). Новый экран = webp в лаунчер + dds в Data (патч игры).
// - Похвалы (5): externalId = номер похвалы, текст — Lang `praise_<номер>` (ru/en), название — `praise_<номер>_name`.
//   В бой уходит только номер: user.cfg `setvar praise_id = <номер>` -> CmdPraise (amount), а текст каждый клиент
//   берёт из praises.txt («<номер>\t<текст>», пишет syncFairGameFiles) — PW_Game AdventureScreen::OnPraise.
// - Стили интерфейса (6) — следующим шагом.
// Выбор экрана и похвалы пока хранится в лаунчере (localStorage): на сервере под них нет столбцов
// (у флага и рамки — user.shopItemFlagId / shopItemFrameId), shop.apply их не знает.
// Пока в базе нет товаров категории, ярмарка показывает тестовые товары TEST_ITEMS: их покупка
// тоже хранится только в localStorage (кристаллы не списываются).

const CAT = { flag: 1, frame: 2, skin: 3, loadscreen: 4, praise: 5 };

const CATEGORIES = [
  { id: 'skin', categoryId: CAT.skin, label: 'fairCatSkins', hint: 'fairHintSkins' },
  { id: 'flag', categoryId: CAT.flag, label: 'fairCatFlags', hint: 'fairHintFlags' },
  { id: 'frame', categoryId: CAT.frame, label: 'fairCatFrames', hint: 'fairHintFrames' },
  { id: 'loadscreen', categoryId: CAT.loadscreen, label: 'fairCatLoadscreens', hint: 'fairHintLoadscreens' },
  { id: 'praise', categoryId: CAT.praise, label: 'fairCatPraises', hint: 'fairHintPraises' },
];

const TEST_ITEMS = [
  { id: 'test-ls-1', categoryId: CAT.loadscreen, externalId: 'winter_rider', price: 30, test: true },
  { id: 'test-ls-2', categoryId: CAT.loadscreen, externalId: 'moon_garden', price: 30, test: true },
  { id: 'test-ls-3', categoryId: CAT.loadscreen, externalId: 'pumpkin_fox', price: 40, test: true, isNew: true },
  { id: 'test-ls-4', categoryId: CAT.loadscreen, externalId: 'violet_blade', price: 40, test: true, isNew: true },
  { id: 'test-pr-1', categoryId: CAT.praise, externalId: '1', price: 8, test: true },
  { id: 'test-pr-2', categoryId: CAT.praise, externalId: '2', price: 8, test: true },
  { id: 'test-pr-3', categoryId: CAT.praise, externalId: '3', price: 10, test: true, isNew: true },
];

// категории, выбор в которых хранит лаунчер
const LOCAL_CATEGORIES = [CAT.loadscreen, CAT.praise];

// owned — id купленных тестовых товаров, selected — { categoryId: externalId } (нет записи — стандартный)
const LOCAL_STORAGE = 'fair_local_v2';

function loadLocalState() {
  try {
    const state = JSON.parse(localStorage.getItem(LOCAL_STORAGE) || '{}');
    return { owned: Array.isArray(state.owned) ? state.owned : [], selected: state.selected || {} };
  } catch {
    return { owned: [], selected: {} };
  }
}

function saveLocalState(state) {
  try {
    localStorage.setItem(LOCAL_STORAGE, JSON.stringify(state));
  } catch {}
}

// Файлы игры (My Games/Prime World Classic): номер выбранной похвалы и имя загрузочного экрана в user.cfg,
// тексты всех похвал в praises.txt (у получателя похвалы должен быть текст её номера). Вызывается при входе
// в замок и при выборе экрана или похвалы.
export async function syncFairGameFiles() {
  try {
    if (!NativeAPI.status) return;
    const documents = NativeAPI.getDocumentsDir();
    if (!documents) return;
    const words = { ...(Lang.list[Lang.default]?.word || {}), ...(Lang.list[Lang.target]?.word || {}) };
    const lines = [];
    for (const key of Object.keys(words)) {
      const m = /^praise_(\d+)$/.exec(key);
      if (m && typeof words[key] === 'string') lines.push(`${m[1]}\t${words[key].replace(/[\t\r\n]+/g, ' ')}`);
    }
    const folder = NativeAPI.path.join(documents, 'My Games', 'Prime World Classic');
    await NativeAPI.fileSystem.promises.mkdir(folder, { recursive: true });
    await NativeAPI.fileSystem.promises.writeFile(NativeAPI.path.join(folder, 'praises.txt'), lines.join('\n') + '\n', 'utf8');

    const selected = loadLocalState().selected;
    const praiseId = Number(selected[CAT.praise]) || 0;
    // имя фона /UI/Styles/LoadingBack/Fair/<имя>.dds в данных игры; none — фон карты
    const loadscreen = /^[A-Za-z0-9_-]{1,64}$/.test(selected[CAT.loadscreen] || '') ? selected[CAT.loadscreen] : 'none';
    await UserCfg.load();
    const changes = {};
    if (UserCfg.num('praise_id', 0) !== praiseId) changes.praise_id = praiseId;
    if (UserCfg.get('fair_loadscreen', '') !== loadscreen) changes.fair_loadscreen = loadscreen;
    if (Object.keys(changes).length) await UserCfg.set(changes);
  } catch (e) {
    console.error('fair: game files write failed', e);
  }
}

let shownTab = 'skin';
let sortMode = 'default';
let hideOwned = false;

function crystalCount() {
  return Number(View.castleTotalCrystal?.firstChild?.innerText) || 0;
}

function heroOf(item) {
  const [heroId, skinId] = String(item.externalId).split('/');
  return { heroId: Number(heroId), skinId: Number(skinId) };
}

function itemName(item) {
  if (item.categoryId === CAT.loadscreen || item.categoryId === CAT.praise) {
    return Lang.text(`${item.categoryId === CAT.loadscreen ? 'loadscreen' : 'praise'}_${item.externalId}_name`);
  }
  if (item.id == 0) {
    if (item.categoryId === CAT.flag) return Lang.text('flag_no_flag');
    if (item.categoryId === CAT.frame) return Lang.text('frame_no_frame');
  }
  return Lang.text(Shop.getName(item.categoryId, item.externalId)[0]);
}

function praiseText(item) {
  return Lang.text(`praise_${item.externalId}`);
}

function heroName(heroId) {
  return Lang.text(`hero_${heroId}_name`);
}

// ---------------------------------------------------------------- картинки товаров

function circle(url, extraStyle) {
  const el = DOM({ style: extraStyle ? ['fair-circle', extraStyle] : 'fair-circle' });
  el.style.backgroundImage = url;
  return el;
}

function itemPicture(item, ctx) {
  switch (item.categoryId) {
    case CAT.skin: {
      const icon = Shop.getSkinIcon(item.externalId);
      return DOM({ style: 'fair-iconrow' }, circle(icon[1], 'is-gray'), DOM({ style: 'fair-arrow' }), circle(icon[0]));
    }
    case CAT.flag: {
      const flag = DOM({ style: 'fair-circle' });
      if (item.id != 0) flag.style.backgroundImage = Shop.getFlagIcon(item.externalId)[0];
      else flag.classList.add('is-empty');
      return DOM({ style: 'fair-iconrow' }, flag);
    }
    case CAT.frame: {
      const hero = ctx.topHero;
      const portrait = DOM({ style: 'fair-frame-portrait' });
      portrait.style.backgroundImage = `url("content/hero/${hero.heroId}/${hero.skinId}.webp")`;
      const box = DOM({ style: 'fair-frame' }, portrait);
      if (item.id != 0) {
        const frames = Shop.getFrameIcon(`${item.externalId}/${hero.frameId}`);
        const frame = DOM({ style: 'fair-frame-img' });
        frame.style.backgroundImage = frames[Math.max(0, hero.frameId - 1)];
        box.append(frame);
      }
      return DOM({ style: 'fair-iconrow' }, box);
    }
    case CAT.loadscreen: {
      const thumb = DOM({ style: 'fair-thumb' });
      thumb.style.backgroundImage = `url("${item.image || `content/img/fair/loadscreens/${item.externalId}.webp`}")`;
      if (item.id == 0) thumb.classList.add('is-default');
      return thumb;
    }
    case CAT.praise:
      return DOM({ style: 'fair-praise' }, DOM({ style: 'fair-praise-text' }, item.id == 0 ? Lang.text('fairPraiseDefaultText') : praiseText(item)));
  }
  return DOM();
}

// ---------------------------------------------------------------- окно

export async function fair(tab = null) {
  const isCollectionTab = (id) => id === 'collection';
  if (tab) shownTab = tab;

  View.castleCrystalContainer?.classList.remove('crystal-container-anim');

  const ctx = { topHero: { heroId: 1, skinId: 1, frameId: 0 }, available: [], purchased: [], local: loadLocalState() };

  const [available, purchased, topHero] = await Promise.all([
    App.api.request('shop', 'available').catch((e) => (App.error(e), [])),
    App.api.request('shop', 'purchase').catch((e) => (App.error(e), [])),
    App.api.request(App.CURRENT_MM, 'getHeroWithFrameId').catch((e) => (App.error(e), null)),
  ]);
  if (topHero) ctx.topHero = topHero;
  ctx.available = (available || []).map((item) => ({ ...item, categoryId: Number(item.categoryId) }));
  ctx.purchased = (purchased || []).map((item) => ({ ...item, categoryId: Number(item.categoryId) }));

  for (const categoryId of LOCAL_CATEGORIES) {
    // стандартный экран / похвала — всегда в коллекции
    ctx.purchased.push({ id: 0, categoryId, externalId: 'default', local: true });
    // тестовые товары, пока в базе нет товаров категории
    if (ctx.available.some((item) => item.categoryId === categoryId) || ctx.purchased.some((item) => item.categoryId === categoryId && item.id != 0)) continue;
    const tests = TEST_ITEMS.filter((item) => item.categoryId === categoryId);
    ctx.available.push(...tests.map((item) => ({ ...item, enabled: !ctx.local.owned.includes(item.id) })));
    for (const item of tests) {
      if (ctx.local.owned.includes(item.id)) ctx.purchased.push({ ...item, enabled: true });
    }
  }

  await Shop.retrieveLastUpdate();

  const sidebar = DOM({ style: 'bs-sidebar' });
  const content = DOM({ style: ['bs-content', 'fair-content'] });
  const detail = DOM({ style: 'fair-detail' });
  const tabButtons = new Map();

  // ---- панель над товарами
  const search = DOM({ tag: 'input', type: 'text', style: 'fair-search', placeholder: Lang.text('fairSearch') });
  const sort = DOM({ tag: 'select', style: ['bs-select', 'fair-sort'], domaudio: domAudioPresets.defaultSelect });
  for (const [value, label] of [
    ['default', 'fairSortDefault'],
    ['name', 'fairSortName'],
    ['priceAsc', 'fairSortPriceAsc'],
    ['priceDesc', 'fairSortPriceDesc'],
    ['new', 'fairSortNew'],
  ]) {
    sort.append(DOM({ tag: 'option', value }, Lang.text(label)));
  }
  sort.value = sortMode;
  const hideCheck = DOM({ tag: 'input', type: 'checkbox', style: 'bs-check', id: 'fair-hide-owned', checked: hideOwned, domaudio: domAudioPresets.defaultSelect });
  const hideRow = DOM(
    { style: ['bs-row', 'bs-row--check', 'fair-hide'] },
    hideCheck,
    DOM({ tag: 'label', style: 'bs-row-label', htmlFor: 'fair-hide-owned' }, Lang.text('fairHideOwned')),
  );
  const balanceValue = DOM({ tag: 'span' }, String(crystalCount()));
  const balance = DOM(
    { style: 'fair-balance' },
    Lang.text('fairBalance'),
    DOM({ tag: 'img', src: 'content/img/queue/DiamondBlue.png', style: 'fair-gem' }),
    balanceValue,
  );
  const toolbar = DOM({ style: 'fair-toolbar' }, search, sort, hideRow, balance);

  const title = DOM({ style: 'bs-header' });
  const quickbar = DOM({ style: 'fair-quickbar' });
  const cards = DOM({ style: 'fair-cards-wrap' });

  // ---- нижняя строка: таймер обновления ассортимента
  const timerValue = DOM({ tag: 'b' }, Timer.getFormattedTimer(Shop.timeBeforeUpdate));
  const footer = DOM({ style: ['bs-footer', 'fair-footer'] }, DOM({ style: 'fair-timer' }, Lang.text('shop_bottom'), ' ', timerValue));

  let selected = null;

  const itemsOfTab = () => {
    if (isCollectionTab(shownTab)) return ctx.purchased.slice();
    const cat = CATEGORIES.find((c) => c.id === shownTab);
    return ctx.available.filter((item) => item.categoryId === cat.categoryId);
  };

  const isOwned = (item) => !isCollectionTab(shownTab) && !item.enabled;
  // в коллекции enabled = «можно выбрать» (у скинов — по текущему скину героя)
  const isEquipped = (item) => {
    if (LOCAL_CATEGORIES.includes(item.categoryId)) {
      return String(ctx.local.selected[item.categoryId] ?? 'default') === String(item.externalId);
    }
    if (item.categoryId === CAT.skin) {
      const { heroId, skinId } = heroOf(item);
      const hero = MM.hero?.find((h) => h.id == heroId);
      return hero ? hero.skin == skinId : !item.enabled;
    }
    return !item.enabled;
  };

  const filteredItems = () => {
    let items = itemsOfTab();
    const query = search.value.trim().toLowerCase();
    if (query) {
      items = items.filter((item) => {
        let text = itemName(item);
        if (item.categoryId === CAT.skin) text += ` ${heroName(heroOf(item).heroId)}`;
        if (item.categoryId === CAT.praise && item.id != 0) text += ` ${praiseText(item)}`;
        return text.toLowerCase().includes(query);
      });
    }
    if (hideOwned && !isCollectionTab(shownTab)) items = items.filter((item) => !isOwned(item));
    const byName = (a, b) => itemName(a).localeCompare(itemName(b), Lang.target);
    if (sortMode === 'name') items.sort(byName);
    if (sortMode === 'priceAsc') items.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortMode === 'priceDesc') items.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortMode === 'new') items.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || (Number(b.id) || 0) - (Number(a.id) || 0));
    return items;
  };

  const badge = (item) => {
    if (isCollectionTab(shownTab)) return isEquipped(item) ? DOM({ style: ['fair-badge', 'is-equipped'] }, Lang.text('shop_in_use')) : DOM();
    if (isOwned(item)) return DOM({ style: ['fair-badge', 'is-owned'] }, Lang.text('fairOwned'));
    if (item.isNew) return DOM({ style: ['fair-badge', 'is-new'] }, Lang.text('fairNew'));
    return DOM();
  };

  const subtitle = (item) => {
    if (item.categoryId === CAT.skin) return heroName(heroOf(item).heroId);
    if (item.test && item.id != 0) return Lang.text('fairTestItem');
    return Lang.text(CATEGORIES.find((c) => c.categoryId === item.categoryId)?.label || '');
  };

  const action = (item) => {
    if (isCollectionTab(shownTab)) {
      return isEquipped(item)
        ? DOM({ style: 'fair-tag' }, Lang.text('shop_in_use'))
        : DOM({ style: 'fair-price', event: ['click', (e) => (e.stopPropagation(), select(item), equip(item))] }, Lang.text('shop_use'));
    }
    if (isOwned(item)) return DOM({ style: 'fair-tag' }, Lang.text('fairInCollection'));
    return DOM(
      { style: 'fair-price', domaudio: domAudioPresets.bigButton, title: Lang.text('fairBuyFor').replace('{price}', item.price), event: ['click', (e) => (e.stopPropagation(), select(item), buy(item))] },
      DOM({ tag: 'img', src: 'content/img/queue/DiamondBlue.png', style: 'fair-gem' }),
      String(item.price),
    );
  };

  const card = (item) => {
    const el = DOM(
      { style: selected === item ? ['fair-card', 'is-selected'] : 'fair-card', domaudio: domAudioPresets.defaultButton, event: ['click', () => select(item)] },
      badge(item),
      itemPicture(item, ctx),
      DOM({ style: 'fair-name' }, itemName(item)),
      DOM({ style: 'fair-sub' }, subtitle(item)),
      action(item),
    );
    el.fairItem = item;
    return el;
  };

  const grid = (items) => {
    const el = DOM({ style: 'fair-cards' });
    for (const item of items) el.append(card(item));
    return el;
  };

  const renderCards = () => {
    const items = filteredItems();
    cards.replaceChildren();
    quickbar.replaceChildren();
    quickbar.classList.add('is-hidden');

    if (!items.length) {
      cards.append(DOM({ style: 'bs-note' }, Lang.text('fairEmpty')));
      return;
    }

    // скины — группами по героям, сверху быстрый переход к герою
    const skins = items.filter((item) => item.categoryId === CAT.skin);
    if (shownTab === 'skin' && skins.length) {
      const groups = new Map();
      for (const item of skins) {
        const { heroId } = heroOf(item);
        if (!groups.has(heroId)) groups.set(heroId, []);
        groups.get(heroId).push(item);
      }
      let order = [...groups.keys()];
      if (sortMode === 'name') order.sort((a, b) => heroName(a).localeCompare(heroName(b), Lang.target));
      quickbar.classList.remove('is-hidden');
      for (const heroId of order) {
        const group = DOM({ style: 'fair-group', data: { hero: heroId } });
        const head = DOM(
          { style: 'fair-group-head' },
          circle(`url("content/hero/${heroId}/1.webp")`, 'fair-group-icon'),
          DOM({ tag: 'span' }, heroName(heroId)),
          DOM({ style: 'fair-count' }, String(groups.get(heroId).length)),
          DOM({ style: 'fair-group-line' }),
        );
        group.append(head, grid(groups.get(heroId)));
        cards.append(group);
        quickbar.append(
          DOM(
            {
              style: 'fair-chip',
              data: { hero: heroId },
              title: heroName(heroId),
              domaudio: domAudioPresets.defaultButton,
              event: [
                'click',
                () => {
                  const top = group.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop - quickbar.offsetHeight;
                  content.scrollTop = top;
                },
              ],
            },
            circle(`url("content/hero/${heroId}/1.webp")`, 'fair-chip-icon'),
            heroName(heroId),
          ),
        );
      }
      return;
    }

    if (isCollectionTab(shownTab)) {
      // коллекция — разделами по категориям
      for (const cat of CATEGORIES) {
        const own = items.filter((item) => item.categoryId === cat.categoryId);
        if (sortMode === 'default') own.sort((a, b) => Number(b.id == 0) - Number(a.id == 0)); // стандартный — первым
        if (!own.length) continue;
        cards.append(DOM({ style: 'fair-group-head' }, DOM({ tag: 'span' }, Lang.text(cat.label)), DOM({ style: 'fair-count' }, String(own.length)), DOM({ style: 'fair-group-line' })), grid(own));
      }
      return;
    }
    cards.append(grid(items));
  };

  // подсветка героя в быстром списке при прокрутке
  content.addEventListener('scroll', () => {
    if (shownTab !== 'skin') return;
    let active = null;
    const limit = content.getBoundingClientRect().top + quickbar.offsetHeight + 20;
    for (const group of cards.querySelectorAll('.fair-group')) {
      if (group.getBoundingClientRect().top <= limit) active = group.dataset.hero;
    }
    for (const chip of quickbar.children) chip.classList.toggle('is-active', chip.dataset.hero === active);
  });

  // ---- панель выбранного товара
  const renderDetail = () => {
    detail.replaceChildren();
    detail.classList.toggle('is-visible', !!selected);
    if (!selected) return;
    const item = selected;
    let desc = Lang.text(CATEGORIES.find((c) => c.categoryId === item.categoryId)?.hint || '');
    if (item.categoryId === CAT.skin) desc = `${heroName(heroOf(item).heroId)}: ${desc}`;
    if (item.categoryId === CAT.praise) desc = `«${item.id == 0 ? Lang.text('fairPraiseDefaultText') : praiseText(item)}» — ${desc}`;
    if (item.categoryId === CAT.frame && item.id != 0 && ctx.topHero.frameId == 0) desc += ` ${Lang.text('frame_hint')}`;
    if (item.test) desc += ` ${Lang.text('fairTestHint')}`;

    let button = DOM();
    if (isCollectionTab(shownTab)) {
      if (!isEquipped(item)) button = fairButton(Lang.text('shop_use'), () => equip(item));
    } else if (!isOwned(item)) {
      button = fairButton(Lang.text('fairBuyFor').replace('{price}', item.price), () => buy(item));
    }
    detail.append(
      DOM({ style: 'fair-detail-pic' }, itemPicture(item, ctx)),
      DOM({ style: 'fair-detail-text' }, DOM({ style: 'fair-detail-name' }, itemName(item)), DOM({ style: 'fair-detail-desc' }, desc)),
      button,
    );
  };

  const select = (item) => {
    selected = item;
    for (const el of cards.querySelectorAll('.fair-card')) el.classList.toggle('is-selected', el.fairItem === item);
    renderDetail();
  };

  // ---- покупка и выбор
  const confirm = (titleKey, text, item, okText, onOk) => {
    Splash.show(
      DOM(
        {},
        DOM({ style: 'splash-modal-scope-shop-action' }),
        DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text(titleKey))),
        DOM({ style: ['splash-item-container', 'fair-splash-item'] }, itemPicture(item, ctx)),
        DOM({ style: 'splash-item-text' }, text),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'splash-content-button',
            event: ['click', async () => (Splash.hide(), await onOk())],
          },
          okText,
        ),
        DOM({ domaudio: domAudioPresets.closeButton, style: 'splash-content-button-red', event: ['click', () => Splash.hide()] }, Lang.text('windowShopCancel')),
      ),
    );
  };

  const buy = (item) => {
    if (!item.test && crystalCount() < item.price) {
      Splash.show(DOM({}, Lang.text('fairNotEnough').replace('{price}', item.price).replace('{balance}', crystalCount())));
      return;
    }
    const text = DOM(
      {},
      Lang.text('windowShopBuyItem'),
      DOM({ style: 'splash-shop-item-name' }, itemName(item)),
      DOM({ tag: 'br' }),
      Lang.text('windowShopItemPrice').replace('{rItem.price}', item.price),
      DOM({ tag: 'img', src: 'content/img/queue/DiamondBlue.png', style: ['fair-gem', 'fair-splash-gem'] }),
      '?',
    );
    confirm('buyModalText', text, item, Lang.text('windowShopBuy'), async () => {
      try {
        if (item.test) {
          ctx.local.owned.push(item.id);
          saveLocalState(ctx.local);
          ctx.purchased.push({ ...item, enabled: true });
        } else {
          const crystalLeft = await App.api.request('shop', 'buy', { id: item.id });
          if (item.categoryId === CAT.skin) {
            const { heroId, skinId } = heroOf(item);
            await Build.changeSkinForHero(heroId, skinId);
          }
          if (Number.isInteger(crystalLeft)) {
            View.castleTotalCrystal.firstChild.innerText = crystalLeft;
          } else {
            App.error(`Неизвестное число кристаллов: ${crystalLeft}`);
          }
          // купленный товар появится в коллекции при следующем открытии
          const testPurchased = ctx.purchased.filter((p) => p.test || p.local);
          const purchased = await App.api.request('shop', 'purchase').catch(() => null);
          if (purchased) {
            ctx.purchased = [...purchased.map((p) => ({ ...p, categoryId: Number(p.categoryId) })), ...testPurchased];
          }
        }
        Sound.play(SOUNDS_LIBRARY.BUY, { id: 'ui-buy', volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) });
      } catch (e) {
        App.error(e);
        return;
      }
      item.enabled = false;
      balanceValue.innerText = String(crystalCount());
      refreshSidebar();
      renderCards();
      renderDetail();
    });
  };

  const equip = (item) => {
    const text = DOM({}, Lang.text('windowShopEquipItem'), DOM({ style: 'splash-shop-item-name' }, itemName(item)), '?');
    confirm('equipment', text, item, Lang.text('windowShopEquip'), async () => {
      try {
        if (LOCAL_CATEGORIES.includes(item.categoryId)) {
          if (item.id == 0) delete ctx.local.selected[item.categoryId];
          else ctx.local.selected[item.categoryId] = String(item.externalId);
          saveLocalState(ctx.local);
          await syncFairGameFiles();
        } else if (item.categoryId === CAT.skin) {
          const { heroId, skinId } = heroOf(item);
          await Build.changeSkinForHero(heroId, skinId);
        } else if (item.id == 0) {
          await App.api.request('shop', 'applyDefault', { categoryId: item.categoryId });
        } else {
          await App.api.request('shop', 'apply', { id: item.id });
        }
      } catch (e) {
        App.error(e);
        return;
      }
      for (const other of ctx.purchased) {
        if (other.categoryId !== item.categoryId) continue;
        if (item.categoryId === CAT.skin && heroOf(other).heroId !== heroOf(item).heroId) continue;
        other.enabled = other !== item;
      }
      renderCards();
      renderDetail();
    });
  };

  // ---- вкладки
  const show = (id) => {
    shownTab = id;
    selected = null;
    for (const [tid, el] of tabButtons) el.classList.toggle('is-active', tid === id);
    hideRow.classList.toggle('is-disabled', isCollectionTab(id));
    const cat = CATEGORIES.find((c) => c.id === id);
    title.replaceChildren(
      DOM({ tag: 'span' }, Lang.text(cat ? cat.label : 'shop_collection')),
      DOM({ style: 'fair-title-hint' }, Lang.text(cat ? cat.hint : 'fairHintCollection')),
    );
    content.scrollTop = 0;
    renderCards();
    renderDetail();
  };

  const counter = (id) => {
    if (isCollectionTab(id)) return ctx.purchased.filter((item) => item.id != 0).length;
    const cat = CATEGORIES.find((c) => c.id === id);
    return ctx.available.filter((item) => item.categoryId === cat.categoryId).length;
  };

  const refreshSidebar = () => {
    for (const [id, el] of tabButtons) el.querySelector('.fair-count').innerText = String(counter(id));
  };

  for (const tabDesc of [...CATEGORIES, { id: 'collection', label: 'shop_collection' }]) {
    const el = DOM(
      {
        domaudio: domAudioPresets.bigButton,
        style: isCollectionTab(tabDesc.id) ? ['castle-menu-item-button', 'bs-cat', 'fair-cat', 'fair-cat--collection'] : ['castle-menu-item-button', 'bs-cat', 'fair-cat'],
        event: ['click', () => show(tabDesc.id)],
      },
      DOM({ tag: 'span', style: 'fair-cat-text' }, Lang.text(tabDesc.label)),
      DOM({ tag: 'span', style: 'fair-count' }, String(counter(tabDesc.id))),
    );
    tabButtons.set(tabDesc.id, el);
    sidebar.append(el);
  }

  search.addEventListener('input', renderCards);
  sort.addEventListener('change', () => {
    sortMode = sort.value;
    renderCards();
  });
  hideCheck.addEventListener('change', () => {
    hideOwned = hideCheck.checked;
    renderCards();
  });

  content.append(toolbar, title, quickbar, cards);

  const helpBtn = DOM({
    domaudio: domAudioPresets.defaultButton,
    style: ['help-button', 'fair-help'],
    event: ['click', () => HelpSplash(Lang.text('shop_help_content'))],
  });

  const root = DOM(
    { id: 'wfair', style: ['wcastle-menu--quest-bg'] },
    DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('shop_shop'))),
    helpBtn,
    DOM({ style: 'bs-body' }, sidebar, DOM({ style: 'bs-main' }, content, detail, footer)),
  );

  // таймер обновления ассортимента: по нулю ярмарка открывается заново
  let timeLeft = Shop.timeBeforeUpdate;
  const timer = setInterval(() => {
    if (!root.isConnected) return;
    timeLeft -= 1000;
    if (timeLeft <= 0) {
      clearInterval(timer);
      import('./window.js').then(({ Window }) => Window.show('main', 'shop', shownTab));
      return;
    }
    timerValue.innerText = Timer.getFormattedTimer(timeLeft);
    balanceValue.innerText = String(crystalCount());
  }, 1000);
  root.cleanup = () => clearInterval(timer);

  show(shownTab === 'collection' || CATEGORIES.some((c) => c.id === shownTab) ? shownTab : 'skin');
  return root;
}

function fairButton(text, onClick) {
  return DOM(
    {
      domaudio: domAudioPresets.bigButton,
      style: ['castle-menu-item-button', 'bs-button', 'fair-buy'],
      event: ['click', onClick],
    },
    text,
  );
}
