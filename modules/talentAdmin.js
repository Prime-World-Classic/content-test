import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { App } from './app.js';
import { HTTP } from './http.js';
import { View } from './view.js';
import { Window } from './window.js';
import { Splash } from './splash.js';
import { domAudioPresets } from './domAudioPresets.js';

// Админка талантов (обычные + классовые) для View.talents / View.talents2.
//
// Откуда что берётся в лончере:
//  - названия и описания — lang/ru.js и en.js (talent_<id>_*, htalent_<id>_*),
//    в БД поля name/description больше не читаются;
//  - level / rarity / active / conflict — из БД при каждой загрузке билда;
//  - stats / descriptionStat (txtNum) и params героических — из content/talent_data/*.json,
//    которые выгружаются из БД (node stats.js talent-data <dir> в pw-api или кнопкой здесь).
// Поэтому правка статов в БД доходит до игроков только после выгрузки talent_data
// в контент — страница показывает, где БД и контент разошлись.

const KINDS = {
  common: {
    title: 'Обычные',
    list: 'talentAll',
    edit: 'talentEdit',
    icon: (id) => `content/talents/${id}.webp`,
    langPrefix: 'talent_',
    file: 'talents.json',
  },
  hero: {
    title: 'Классовые',
    list: 'talentHeroAll',
    edit: 'talentHeroEdit',
    icon: (id) => `content/htalents/${id}.webp`,
    langPrefix: 'htalent_',
    file: 'hero_talents.json',
  },
};

const RARITY = {
  0: { key: null, name: 'Без редкости' },
  1: { key: 'titleTheBlue', name: 'Синее' },
  2: { key: 'titleThePurple', name: 'Фиолетовое' },
  3: { key: 'titleTheOrange', name: 'Оранжевое' },
  4: { key: 'titleTheRed', name: 'Красное' },
};

// Статы из глоссария lang (раздел «Стата талантов»); к ним добавляются ключи, найденные в данных.
const STAT_KEYS = [
  'hp', 'mp', 'sila', 'razum', 'provorstvo', 'hitrost', 'stoikost', 'volia', 'health', 'speedtal',
  'sr', 'ph', 'sv', 'srsv', 'hpmp', 'regenhp', 'regenmp', 'krajahp', 'krajamp',
  'silarz', 'razumrz', 'provorstvorz', 'hitrostrz', 'stoikostrz', 'voliarz', 'speedtalrz', 'krajahprz',
  'silavz', 'razumvz', 'provorstvovz', 'hitrostvz', 'svvz', 'regenhpvz', 'regenmpvz', 'krajahpvz', 'speedtalvz',
];

const LEVELS = [1, 2, 3, 4, 5, 6];
const MMTEST_LEVELS = [11, 22, 33, 44, 55, 66];

export class TalentAdmin {
  static render(kind = 'common') {
    return new TalentAdmin(kind).root;
  }

  constructor(kind) {
    this.kind = KINDS[kind] ? kind : 'common';
    this.rows = { common: [], hero: [] };
    this.byId = { common: new Map(), hero: new Map() };
    this.content = { common: {}, hero: {} };
    this.items = { common: [], hero: [] };
    this.loaded = false;
    this.selectedId = null;
    this.draft = null;
    this.filters = { text: '', level: '', rarity: '', active: '', hero: '', sync: false };
    this.sort = 'id';

    this.build();
    this.load();

    // Esc закрывает админку. Глобальный обработчик лаунчера (App) на Esc открывает меню —
    // перехватываем раньше него (capture), пока страница на экране и поверх нет окон/сплэша.
    this.onEscape = (e) => {
      if (!this.root.isConnected) {
        document.removeEventListener('keydown', this.onEscape, true);
        return;
      }
      if (e.key !== 'Escape' || Splash.body?.style.display === 'flex' || Window.anyOpen?.()) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      this.close();
    };
    document.addEventListener('keydown', this.onEscape, true);
  }

  close() {
    if (!this.confirmDiscard()) return;
    document.removeEventListener('keydown', this.onEscape, true);
    View.show('castle');
  }

  // ---------- данные ----------

  async load() {
    try {
      const bust = `?t=${Date.now()}`;
      const [common, hero, contentCommon, contentHero] = await Promise.all([
        App.api.requestPaged('build', KINDS.common.list),
        App.api.requestPaged('build', KINDS.hero.list),
        HTTP.request(`content/talent_data/${KINDS.common.file}${bust}`).catch(() => ({})),
        HTTP.request(`content/talent_data/${KINDS.hero.file}${bust}`).catch(() => ({})),
      ]);

      this.rows.common = common;
      this.rows.hero = hero;
      this.content.common = contentCommon || {};
      this.content.hero = contentHero || {};

      for (const kind of Object.keys(KINDS)) {
        for (const row of this.rows[kind]) {
          row.id = Number(row.id);
          this.byId[kind].set(row.id, row);
        }
      }
    } catch (error) {
      this.listEl.replaceChildren(DOM({ style: 'tadm-empty' }, `Не удалось загрузить таланты: ${error}`));
      return;
    }

    this.loaded = true;
    this.fillStatKeys();
    this.switchKind(this.kind, true);
    this.refreshExportButton();
  }

  static parseStats(value, index) {
    if (!value) {
      return value;
    }

    const result = {};

    for (const item of String(value).split(';')) {
      const split = item.split(',');
      result[split[2]] = split[index];
    }

    return result;
  }

  // Ровно то, что пишет stats.js exportTalentData — чтобы выгрузка давала тот же файл.
  static exportRow(kind, row) {
    if (kind === 'hero') {
      return { params: row.params == null ? '' : String(row.params) };
    }

    return {
      txtNum: row.descriptionStat == null ? '' : String(row.descriptionStat),
      stats: TalentAdmin.parseStats(row.stats, 0),
      statsRefine: TalentAdmin.parseStats(row.stats, 1),
    };
  }

  syncState(kind, row) {
    const local = this.content[kind][row.id];

    if (!local) {
      return 'missing';
    }

    return JSON.stringify(TalentAdmin.exportRow(kind, row)) === JSON.stringify(local) ? 'ok' : 'diff';
  }

  unsyncedCount() {
    let count = 0;

    for (const kind of Object.keys(KINDS)) {
      for (const row of this.rows[kind]) {
        if (this.syncState(kind, row) !== 'ok') count++;
      }
    }

    return count;
  }

  // Название в lang = «имя» + хвост с разметкой игры: стоимость (<mana>, <lifecost>, «20<detail>»)
  // и перезарядка (<CD>, варианты <mag>…<CD></CD></mag>/<fiz>…). Хвост рендерится теми же тегами,
  // что и в билде (иконки из main.css), а числа разбираются отдельно.
  splitName(kind, id) {
    const key = `${KINDS[kind].langPrefix}${id}_name`;
    const raw = Lang.text(key);

    if (raw === key) {
      return { title: '', tail: '' };
    }

    const match = String(raw).match(/^([\s\S]*?)(\d+(?:\.\d+)?<detail>[\s\S]*|<[\s\S]*)$/);
    const title = (match ? match[1] : String(raw)).replace(/[\s|/]+$/, '').trim();
    const tail = match ? match[2].trim() : '';

    return { title, tail };
  }

  name(kind, id) {
    const { title, tail } = this.splitName(kind, id);
    return title || tail.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  costs(kind, id) {
    const { tail } = this.splitName(kind, id);
    const all = (re) => [...tail.matchAll(re)].map((m) => m[1] ?? m[2]).filter((v) => v !== undefined && v !== '');

    return {
      tail,
      mana: all(/<mana>\s*([\d.]+)\s*<\/mana>/g),
      life: all(/<lifecost>\s*([\d.]+)\s*<\/lifecost>/g),
      detail: all(/([\d.]+)\s*<detail>/g),
      cd: all(/<CD>\s*([\d.]+)\s*<\/CD>|([\d.]+)\s*<CD>\s*<\/CD>/g),
    };
  }

  costsText(costs) {
    const parts = [];
    if (costs.mana.length) parts.push(`энергия ${costs.mana.join(' / ')}`);
    if (costs.life.length) parts.push(`здоровье ${costs.life.join(' / ')}`);
    if (costs.detail.length) parts.push(`детали ${costs.detail.join(' / ')}`);
    if (costs.cd.length) parts.push(`кд ${costs.cd.join(' / ')} с`);
    return parts.join(', ');
  }

  costsElement(costs, style) {
    const element = DOM({ tag: 'span', style });
    // Разметка из нашего же lang (те же теги, что в билде); <white> снимаем — на тёмном фоне он лишний.
    element.innerHTML = costs.tail.replace(/<\/?white>/g, '');
    return element;
  }

  description(kind, id) {
    const key = `${KINDS[kind].langPrefix}${id}_description`;
    const text = Lang.text(key);
    return text === key ? '' : String(text).trim();
  }

  // hero1/hero2 — обычно один и тот же герой за обе фракции, имя показываем один раз.
  heroNames(row) {
    const names = [row.hero1, row.hero2]
      .map(Number)
      .filter((id) => id > 0)
      .map((id) => Lang.heroName(id) || `hero ${id}`);
    return [...new Set(names)];
  }

  statLabel(key) {
    const text = Lang.text(key);
    const plain = text === key ? '' : String(text).replace(/<[^>]*>/g, '').trim();
    if (key.startsWith('speedtal')) {
      return `Скорость${plain.replace(/^%/, '')}`;
    }
    return plain.length > 2 ? plain : key;
  }

  fillStatKeys() {
    const keys = new Set(STAT_KEYS);

    for (const row of this.rows.common) {
      for (const key in TalentAdmin.parseStats(row.stats, 0) || {}) keys.add(key);
    }

    this.statKeys = [...keys];
  }

  // ---------- каркас ----------

  build() {
    this.root = DOM({ style: 'tadm', tabIndex: -1 });

    this.tabs = {};
    const tabs = DOM({ style: 'tadm-tabs' });
    for (const kind of Object.keys(KINDS)) {
      const tab = DOM(
        { tag: 'button', style: 'tadm-tab', domaudio: domAudioPresets.defaultButton, event: ['click', () => this.switchKind(kind)] },
        KINDS[kind].title,
        DOM({ tag: 'span', style: 'tadm-tab-count' }, ''),
      );
      this.tabs[kind] = tab;
      tabs.append(tab);
    }

    this.searchInput = DOM({ tag: 'input', style: 'tadm-search', placeholder: 'Поиск: название, id, стат…' });
    this.searchInput.addEventListener('input', () => {
      this.filters.text = this.searchInput.value.trim().toLowerCase();
      this.applyFilters();
    });

    this.levelSelect = this.select(
      [['', 'Все уровни'], ...LEVELS.map((l) => [String(l), `Уровень ${l}`]), ['mmtest', 'Только mmtest']],
      (value) => {
        this.filters.level = value;
        this.applyFilters();
      },
    );

    this.raritySelect = this.select(
      [['', 'Любая редкость'], ...[4, 3, 2, 1, 0].map((r) => [String(r), this.rarityName(r)])],
      (value) => {
        this.filters.rarity = value;
        this.applyFilters();
      },
    );

    this.activeSelect = this.select(
      [['', 'Активные и пассивные'], ['1', 'Только активные'], ['0', 'Только пассивные']],
      (value) => {
        this.filters.active = value;
        this.applyFilters();
      },
    );

    this.heroSelect = this.select([['', 'Все герои']], (value) => {
      this.filters.hero = value;
      this.applyFilters();
    });

    this.sortSelect = this.select(
      [
        ['id', 'По id'],
        ['name', 'По названию'],
        ['cd', 'По перезарядке'],
        ['cost', 'По стоимости'],
        ['level', 'По уровню'],
      ],
      (value) => {
        this.sort = value;
        this.applySort();
      },
    );

    this.syncCheck = DOM({ tag: 'input', type: 'checkbox' });
    this.syncCheck.addEventListener('change', () => {
      this.filters.sync = this.syncCheck.checked;
      this.applyFilters();
    });
    const syncLabel = DOM({ tag: 'label', style: 'tadm-check', title: 'БД отличается от content/talent_data' }, this.syncCheck, 'Расходятся с контентом');

    this.exportButton = DOM(
      {
        tag: 'button',
        style: 'tadm-button',
        domaudio: domAudioPresets.defaultButton,
        title: 'Скачать talents.json и hero_talents.json из БД — положить в content/talent_data/ лаунчера',
        event: ['click', () => this.exportFiles()],
      },
      'Выгрузить talent_data',
    );

    const close = DOM(
      {
        tag: 'button',
        style: ['tadm-button', 'tadm-close'],
        domaudio: domAudioPresets.closeButton,
        event: ['click', () => this.close()],
      },
      '✕',
    );

    this.countEl = DOM({ style: 'tadm-count' });

    const header = DOM(
      { style: 'tadm-header' },
      DOM({ style: 'tadm-header-row' }, DOM({ style: 'tadm-title' }, 'Таланты'), tabs, this.searchInput, this.exportButton, close),
      DOM({ style: 'tadm-header-row' }, this.levelSelect, this.raritySelect, this.activeSelect, this.heroSelect, this.sortSelect, syncLabel, this.countEl),
    );

    this.listEl = DOM({ style: 'tadm-list', tabIndex: 0 }, DOM({ style: 'tadm-empty' }, 'Загрузка…'));
    this.editorEl = DOM({ style: 'tadm-editor' }, DOM({ style: 'tadm-empty' }, 'Выберите талант слева'));

    this.root.append(header, DOM({ style: 'tadm-body' }, this.listEl, this.editorEl));

    this.root.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        this.save();
        return;
      }

      const tag = e.target?.tagName;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        this.moveSelection(e.key === 'ArrowDown' ? 1 : -1);
      }
    });
  }

  select(options, onChange) {
    const element = DOM({ tag: 'select', style: 'tadm-select' });
    this.setOptions(element, options);
    element.addEventListener('change', () => onChange(element.value));
    return element;
  }

  setOptions(element, options) {
    element.replaceChildren(...options.map(([value, text]) => DOM({ tag: 'option', value }, text)));
  }

  rarityName(rarity) {
    const item = RARITY[rarity] || RARITY[0];
    if (!item.key) return item.name;
    const text = Lang.text(item.key);
    return text === item.key ? item.name : text;
  }

  // ---------- список ----------

  switchKind(kind, force = false) {
    if (!force && kind === this.kind) return;
    if (!force && !this.confirmDiscard()) return;

    this.kind = kind;
    this.selectedId = null;
    this.draft = null;

    for (const k of Object.keys(KINDS)) {
      this.tabs[k].classList.toggle('tadm-tab-active', k === kind);
      this.tabs[k].lastChild.textContent = this.loaded ? String(this.rows[k].length) : '';
    }

    this.raritySelect.style.display = kind === 'common' ? '' : 'none';
    this.heroSelect.style.display = kind === 'hero' ? '' : 'none';

    if (kind === 'hero') {
      // Один герой может быть под двумя id (по фракциям) — в фильтре одна строка на имя.
      const heroes = new Map();
      for (const row of this.rows.hero) {
        for (const id of [row.hero1, row.hero2].map(Number)) {
          if (id <= 0) continue;
          const name = Lang.heroName(id) || `hero ${id}`;
          if (!heroes.has(name)) heroes.set(name, new Set());
          heroes.get(name).add(id);
        }
      }
      const sorted = [...heroes].sort((a, b) => a[0].localeCompare(b[0]));
      this.setOptions(this.heroSelect, [['', 'Все герои'], ...sorted.map(([name, ids]) => [[...ids].join(','), name])]);
      this.heroSelect.value = this.filters.hero;
      if (this.heroSelect.value !== this.filters.hero) this.filters.hero = '';
    }

    if (!this.loaded) return;

    if (!this.items[kind].length) {
      this.items[kind] = this.rows[kind].map((row) => ({ row, element: this.renderRow(kind, row) }));
    }

    this.applySort();
    this.applyFilters();
    this.renderEditor();
  }

  renderRow(kind, row) {
    const element = DOM({
      style: 'tadm-row',
      domaudio: domAudioPresets.defaultButton,
      event: [
        'click',
        () => {
          this.listEl.focus({ preventScroll: true });
          this.selectTalent(row.id);
        },
      ],
    });
    element.dataset.id = row.id;
    this.fillRow(kind, row, element);
    return element;
  }

  fillRow(kind, row, element) {
    const name = this.name(kind, row.id) || '— без названия —';
    const sync = this.syncState(kind, row);
    const level = Number(row.level) || 1;
    const meta = [];

    if (kind === 'hero') {
      meta.push(this.heroNames(row).join(', ') || 'без героя');
    } else {
      const stats = TalentAdmin.parseStats(row.stats, 0);
      if (stats) meta.push(Object.entries(stats).map(([k, v]) => `${v} ${this.statLabel(k)}`).join(', '));
    }

    const costs = this.costs(kind, row.id);
    const badges = DOM({ style: 'tadm-badges' });
    // Необязательные отметки — слева, уровень и редкость — у правого края, чтобы стояли колонкой.
    if (sync !== 'ok') badges.append(DOM({ style: ['tadm-badge', 'tadm-badge-sync'], title: sync === 'missing' ? 'Нет в content/talent_data' : 'Отличается от content/talent_data' }, sync === 'missing' ? 'нет в контенте' : '≠ контент'));
    if (costs.tail) {
      const costsEl = this.costsElement(costs, 'tadm-costs');
      costsEl.title = this.costsText(costs);
      badges.append(costsEl);
    }
    if (Number(row.active) === 1) badges.append(DOM({ style: ['tadm-badge', 'tadm-badge-active'], title: 'Активный' }, 'акт'));
    badges.append(DOM({ style: ['tadm-badge', MMTEST_LEVELS.includes(level) ? 'tadm-badge-mmtest' : 'tadm-badge-level'] }, MMTEST_LEVELS.includes(level) ? `mm ${level}` : `ур ${level}`));
    if (kind === 'common') badges.append(DOM({ style: ['tadm-badge', `tadm-rarity-${Number(row.rarity) || 0}`], title: this.rarityName(Number(row.rarity) || 0) }, '●'));

    const icon = DOM({ tag: 'img', style: 'tadm-icon', src: KINDS[kind].icon(row.id), loading: 'lazy' });
    icon.onerror = () => icon.classList.add('tadm-icon-missing');

    element.replaceChildren(
      icon,
      DOM(
        { style: 'tadm-row-main' },
        DOM({ style: 'tadm-row-title' }, DOM({ tag: 'span', style: 'tadm-id' }, `#${row.id}`), name),
        DOM({ style: 'tadm-row-meta' }, meta.join(' · ')),
      ),
      badges,
    );

    element.dataset.search = [row.id, name, ...meta, this.costsText(costs), row.stats || '', row.params || '', row.conflict || ''].join(' ').toLowerCase();
    element.classList.toggle('tadm-row-selected', row.id === this.selectedId);
  }

  matches(kind, row, element) {
    const f = this.filters;
    const level = Number(row.level) || 1;

    if (f.text && !element.dataset.search.includes(f.text)) return false;
    if (f.level === 'mmtest' && !MMTEST_LEVELS.includes(level)) return false;
    if (f.level && f.level !== 'mmtest' && level !== Number(f.level)) return false;
    if (kind === 'common' && f.rarity !== '' && (Number(row.rarity) || 0) !== Number(f.rarity)) return false;
    if (f.active !== '' && Number(row.active) !== Number(f.active)) return false;
    if (kind === 'hero' && f.hero) {
      const ids = f.hero.split(',').map(Number);
      if (!ids.includes(Number(row.hero1)) && !ids.includes(Number(row.hero2))) return false;
    }
    if (f.sync && this.syncState(kind, row) === 'ok') return false;

    return true;
  }

  // Талант без значения (нет КД / стоимости) — в конец списка.
  sortValue(kind, row) {
    const first = (list) => (list.length ? Math.max(...list.map(Number)) : null);

    switch (this.sort) {
      case 'name':
        return this.name(kind, row.id) || null;
      case 'cd':
        return first(this.costs(kind, row.id).cd);
      case 'cost': {
        const costs = this.costs(kind, row.id);
        return first([...costs.mana, ...costs.life, ...costs.detail]);
      }
      case 'level':
        return Number(row.level) || 1;
      default:
        return row.id;
    }
  }

  applySort() {
    if (!this.loaded) return;

    const kind = this.kind;
    const keyed = this.items[kind].map((item) => ({ item, value: this.sortValue(kind, item.row) }));
    const descending = this.sort === 'cd' || this.sort === 'cost';

    keyed.sort((a, b) => {
      if (a.value === b.value) return a.item.row.id - b.item.row.id;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      if (typeof a.value === 'string') return a.value.localeCompare(b.value);
      return descending ? b.value - a.value : a.value - b.value;
    });

    this.items[kind] = keyed.map(({ item }) => item);
    this.listEl.replaceChildren(...this.items[kind].map((item) => item.element));
  }

  applyFilters() {
    if (!this.loaded) return;

    let shown = 0;

    for (const { row, element } of this.items[this.kind]) {
      const visible = this.matches(this.kind, row, element);
      element.style.display = visible ? '' : 'none';
      if (visible) shown++;
    }

    this.countEl.textContent = `Показано ${shown} из ${this.rows[this.kind].length}`;
  }

  moveSelection(step) {
    const visible = this.items[this.kind].filter(({ element }) => element.style.display !== 'none');
    if (!visible.length) return;

    let index = visible.findIndex(({ row }) => row.id === this.selectedId);
    index = index < 0 ? 0 : Math.min(visible.length - 1, Math.max(0, index + step));

    this.selectTalent(visible[index].row.id);
    visible[index].element.scrollIntoView({ block: 'nearest' });
  }

  selectTalent(id) {
    if (id === this.selectedId) return;
    if (!this.confirmDiscard()) return;

    this.selectedId = id;
    const row = this.byId[this.kind].get(id);
    this.draft = row ? { ...row } : null;

    for (const { row: r, element } of this.items[this.kind]) {
      element.classList.toggle('tadm-row-selected', r.id === id);
    }

    this.renderEditor();
  }

  // ---------- редактор ----------

  editableKeys(kind) {
    return kind === 'hero' ? ['level', 'active', 'conflict', 'params'] : ['level', 'rarity', 'active', 'conflict', 'stats', 'descriptionStat'];
  }

  changes() {
    const row = this.byId[this.kind].get(this.selectedId);
    if (!row || !this.draft) return {};

    const result = {};
    for (const key of this.editableKeys(this.kind)) {
      const before = row[key] == null ? '' : String(row[key]);
      const after = this.draft[key] == null ? '' : String(this.draft[key]);
      if (before !== after) result[key] = after;
    }
    return result;
  }

  confirmDiscard() {
    if (!Object.keys(this.changes()).length) return true;
    return window.confirm('Есть несохранённые изменения. Отбросить их?');
  }

  renderEditor() {
    const kind = this.kind;
    const row = this.byId[kind].get(this.selectedId);

    if (!row || !this.draft) {
      this.editorEl.replaceChildren(DOM({ style: 'tadm-empty' }, 'Выберите талант слева (↑/↓ — листать, Ctrl+S — сохранить)'));
      return;
    }

    const draft = this.draft;
    const name = this.name(kind, row.id);
    const prefix = KINDS[kind].langPrefix;
    const costs = this.costs(kind, row.id);

    const head = DOM(
      { style: 'tadm-ed-head' },
      DOM({ tag: 'img', style: 'tadm-ed-icon', src: KINDS[kind].icon(row.id) }),
      DOM(
        { style: 'tadm-ed-titles' },
        DOM({ style: 'tadm-ed-name' }, name || '— без названия —', costs.tail ? this.costsElement(costs, 'tadm-ed-costs') : ''),
        costs.tail ? DOM({ style: 'tadm-ed-cost-text' }, `Стоимость и перезарядка: ${this.costsText(costs) || 'см. название'}`) : '',
        DOM(
          { style: 'tadm-ed-sub' },
          `#${row.id}`,
          kind === 'common' && row.externalId ? ` · externalId ${row.externalId}` : '',
          kind === 'hero' ? ` · ${this.heroNames(row).join(', ') || 'без героя'}` : '',
        ),
        DOM({ style: 'tadm-hint' }, `Название (со стоимостью и КД) и описание — в content/lang/ru.js и en.js: ${prefix}${row.id}_name, ${prefix}${row.id}_description`),
      ),
    );

    const preview = DOM({ style: 'tadm-preview' });
    const description = this.description(kind, row.id);
    if (description) {
      preview.innerHTML = description;
    } else {
      preview.textContent = 'Описания в lang нет — в игре оно строится из статов.';
      preview.classList.add('tadm-muted');
    }

    const main = DOM({ style: 'tadm-section' }, DOM({ style: 'tadm-section-title' }, 'Основное'));
    main.append(this.field('Уровень', this.levelControl()));
    if (kind === 'common') main.append(this.field('Редкость', this.rarityControl()));
    main.append(this.field('Тип', this.activeControl()));

    const conflicts = DOM({ style: 'tadm-section' }, DOM({ style: 'tadm-section-title' }, 'Конфликтует с'), this.conflictControl());

    const sections = [head, preview, main, conflicts];

    if (kind === 'common') {
      sections.push(
        DOM(
          { style: 'tadm-section' },
          DOM({ style: 'tadm-section-title' }, 'Статы ', DOM({ tag: 'span', style: 'tadm-muted' }, '→ content/talent_data')),
          this.statsControl(),
          this.field(
            'Число в описании',
            this.textControl('descriptionStat', 'значение,заточка,стат (txtNum)'),
            'Подставляется в описание вместо числа; формат как у стата: значение,заточка,стат.',
          ),
        ),
      );
    } else {
      sections.push(
        DOM(
          { style: 'tadm-section' },
          DOM({ style: 'tadm-section-title' }, 'Параметры описания ', DOM({ tag: 'span', style: 'tadm-muted' }, '→ content/talent_data')),
          this.textControl('params', 'цель,стат,база,тип,от;…', true),
          DOM({ style: 'tadm-hint' }, 'Каждая группа через «;» заполняет очередной %s в описании: цель,коэф…,тип,от какого стата (напр. all,11,147,num,sr_max).'),
        ),
      );
    }

    sections.push(this.syncControl(kind, row));

    this.saveButton = DOM({ tag: 'button', style: ['tadm-button', 'tadm-save'], domaudio: domAudioPresets.defaultButton, event: ['click', () => this.save()] }, 'Сохранить');
    this.resetButton = DOM(
      {
        tag: 'button',
        style: 'tadm-button',
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            this.draft = { ...row };
            this.renderEditor();
          },
        ],
      },
      'Сбросить',
    );
    this.changesEl = DOM({ style: 'tadm-changes' });

    const scroll = DOM({ style: 'tadm-ed-scroll' }, ...sections);
    this.editorEl.replaceChildren(scroll, DOM({ style: 'tadm-ed-footer' }, this.changesEl, this.resetButton, this.saveButton));
    this.refreshDirty();
  }

  field(label, control, hint = '') {
    return DOM({ style: 'tadm-field' }, DOM({ style: 'tadm-label' }, label), DOM({ style: 'tadm-control' }, control, hint ? DOM({ style: 'tadm-hint' }, hint) : ''));
  }

  set(key, value) {
    this.draft[key] = value;
    this.refreshDirty();
  }

  refreshDirty() {
    if (!this.saveButton) return;
    const keys = Object.keys(this.changes());
    this.saveButton.disabled = !keys.length;
    this.resetButton.disabled = !keys.length;
    this.changesEl.textContent = keys.length ? `Изменено: ${keys.join(', ')}` : 'Без изменений';
  }

  segmented(options, value, onPick) {
    const wrap = DOM({ style: 'tadm-seg' });
    for (const [optionValue, text, extra] of options) {
      const button = DOM(
        {
          tag: 'button',
          style: ['tadm-seg-item', ...(extra ? [extra] : [])],
          domaudio: domAudioPresets.defaultButton,
          event: [
            'click',
            () => {
              wrap.querySelectorAll('.tadm-seg-item').forEach((b) => b.classList.remove('tadm-seg-active'));
              button.classList.add('tadm-seg-active');
              onPick(optionValue);
            },
          ],
        },
        text,
      );
      if (String(optionValue) === String(value)) button.classList.add('tadm-seg-active');
      wrap.append(button);
    }
    return wrap;
  }

  levelControl() {
    const current = Number(this.draft.level) || 0;
    const options = LEVELS.map((l) => [l, String(l)]);
    let mm = null;
    const wrap = DOM(
      { style: 'tadm-inline' },
      this.segmented(options, current, (v) => {
        if (mm) mm.value = '';
        this.set('level', v);
      }),
    );

    mm = this.select([['', 'mmtest…'], ...MMTEST_LEVELS.map((l) => [String(l), `${l} (mmtest, ур ${l / 11})`])], (v) => {
      if (!v) return;
      wrap.querySelectorAll('.tadm-seg-item').forEach((b) => b.classList.remove('tadm-seg-active'));
      this.set('level', Number(v));
    });
    if (MMTEST_LEVELS.includes(current)) mm.value = String(current);
    mm.title = 'Уровни 11…66 видны только в mmtest-клиенте';
    wrap.append(mm);

    if (!current) wrap.append(DOM({ style: 'tadm-hint' }, 'не задан — считается 1'));
    return wrap;
  }

  rarityControl() {
    return this.segmented(
      [4, 3, 2, 1, 0].map((r) => [r, this.rarityName(r), `tadm-rarity-${r}`]),
      Number(this.draft.rarity) || 0,
      (v) => this.set('rarity', v),
    );
  }

  activeControl() {
    return this.segmented(
      [
        [0, 'Пассивный'],
        [1, 'Активный'],
      ],
      Number(this.draft.active) ? 1 : 0,
      (v) => this.set('active', v),
    );
  }

  conflictIds() {
    return String(this.draft.conflict || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  conflictControl() {
    const kind = this.kind;
    const wrap = DOM({ style: 'tadm-conflicts' });
    const chips = DOM({ style: 'tadm-chips' });

    const renderChips = () => {
      const ids = this.conflictIds();
      chips.replaceChildren(
        ...(ids.length
          ? ids.map((id) => {
              const known = this.byId[kind].has(Number(id));
              const remove = DOM({ tag: 'span', style: 'tadm-chip-x', title: 'Убрать' }, '✕');
              remove.addEventListener('click', (e) => {
                e.stopPropagation();
                this.set('conflict', this.conflictIds().filter((x) => x !== id).join(','));
                renderChips();
              });
              const chip = DOM(
                { style: ['tadm-chip', ...(known ? [] : ['tadm-chip-bad'])], title: known ? 'Открыть' : 'Такого таланта нет' },
                DOM({ tag: 'img', src: KINDS[kind].icon(id) }),
                `#${id} ${this.name(kind, id) || ''}`,
                remove,
              );
              if (known) chip.addEventListener('click', () => this.selectTalent(Number(id)));
              return chip;
            })
          : [DOM({ style: 'tadm-muted' }, 'нет')]),
      );
    };

    const listId = `tadm-conflict-list-${kind}`;
    const datalist = DOM({ tag: 'datalist', id: listId });
    datalist.append(...this.rows[kind].map((r) => DOM({ tag: 'option', value: `${r.id} ${this.name(kind, r.id)}` })));

    const input = DOM({ tag: 'input', style: 'tadm-input', placeholder: 'id или название' });
    input.setAttribute('list', listId);

    const add = () => {
      const value = input.value.trim();
      let id = (value.match(/^\d+/) || [])[0];
      if (!id && value) {
        const found = this.rows[kind].find((r) => this.name(kind, r.id).toLowerCase() === value.toLowerCase());
        id = found ? String(found.id) : null;
      }
      if (!id) {
        App.error('Укажите id таланта');
        return;
      }
      if (Number(id) === this.selectedId) {
        App.error('Талант не может конфликтовать сам с собой');
        return;
      }
      const ids = this.conflictIds();
      if (!ids.includes(id)) this.set('conflict', [...ids, id].join(','));
      input.value = '';
      renderChips();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        add();
      }
    });

    renderChips();
    wrap.append(
      chips,
      DOM(
        { style: 'tadm-inline' },
        input,
        datalist,
        DOM({ tag: 'button', style: 'tadm-button', domaudio: domAudioPresets.defaultButton, event: ['click', add] }, 'Добавить'),
      ),
      DOM({ style: 'tadm-hint' }, kind === 'hero' ? 'Только с классовыми талантами того же героя.' : 'Только с обычными талантами.'),
    );
    return wrap;
  }

  statsControl() {
    const wrap = DOM({ style: 'tadm-stats' });
    const parse = () =>
      String(this.draft.stats || '')
        .split(';')
        .filter((s) => s.trim() !== '')
        .map((s) => s.split(','));
    let items = parse();

    const write = () => {
      this.set(
        'stats',
        items
          .filter((item) => item[2])
          .map((item) => `${item[0].trim()},${item[1].trim()},${item[2]}`)
          .join(';'),
      );
      raw.textContent = this.draft.stats || '(пусто)';
    };

    const raw = DOM({ style: ['tadm-hint', 'tadm-mono'] }, this.draft.stats || '(пусто)');
    const rowsEl = DOM({ style: 'tadm-stat-rows' });

    const renderRows = () => {
      rowsEl.replaceChildren(
        DOM({ style: ['tadm-stat-row', 'tadm-stat-head'] }, DOM({}, 'Стат'), DOM({}, 'Значение'), DOM({}, 'Заточка'), DOM({}, '')),
        ...items.map((item, index) => {
          const key = this.select(
            this.statKeys.includes(item[2]) || !item[2]
              ? this.statKeys.map((k) => [k, `${this.statLabel(k)} (${k})`])
              : [[item[2], item[2]], ...this.statKeys.map((k) => [k, `${this.statLabel(k)} (${k})`])],
            (v) => {
              item[2] = v;
              write();
            },
          );
          key.value = item[2] || '';

          const num = (i) => {
            const input = DOM({ tag: 'input', style: 'tadm-input', value: item[i] ?? '' });
            const check = () => input.classList.toggle('tadm-invalid', !Number.isFinite(Number(input.value)) || input.value.trim() === '');
            input.addEventListener('input', () => {
              item[i] = input.value;
              check();
              write();
            });
            check();
            return input;
          };

          const remove = DOM(
            {
              tag: 'button',
              style: ['tadm-button', 'tadm-icon-button'],
              title: 'Убрать стат',
              domaudio: domAudioPresets.defaultButton,
              event: [
                'click',
                () => {
                  items.splice(index, 1);
                  write();
                  renderRows();
                },
              ],
            },
            '✕',
          );

          return DOM({ style: 'tadm-stat-row' }, key, num(0), num(1), remove);
        }),
      );
    };

    const add = DOM(
      {
        tag: 'button',
        style: 'tadm-button',
        domaudio: domAudioPresets.defaultButton,
        event: [
          'click',
          () => {
            items.push(['0', '0', this.statKeys[0]]);
            write();
            renderRows();
          },
        ],
      },
      '+ стат',
    );

    renderRows();
    wrap.append(rowsEl, DOM({ style: 'tadm-inline' }, add, raw));
    return wrap;
  }

  textControl(key, placeholder, multiline = false) {
    const input = DOM({ tag: multiline ? 'textarea' : 'input', style: ['tadm-input', 'tadm-mono'], placeholder });
    input.value = this.draft[key] == null ? '' : String(this.draft[key]);
    if (multiline) input.rows = 3;
    input.addEventListener('input', () => this.set(key, input.value));
    return input;
  }

  syncControl(kind, row) {
    const state = this.syncState(kind, row);
    const box = DOM({ style: ['tadm-section', `tadm-sync-${state}`] });

    if (state === 'ok') {
      box.append(DOM({ style: 'tadm-section-title' }, '✓ Совпадает с content/talent_data'));
      return box;
    }

    box.append(
      DOM({ style: 'tadm-section-title' }, state === 'missing' ? 'Таланта нет в content/talent_data' : 'БД и content/talent_data расходятся'),
      DOM({ style: 'tadm-hint' }, 'Игроки видят значения из контента. Нажмите «Выгрузить talent_data», положите файлы в content/talent_data/ лаунчера и закоммитьте.'),
      DOM(
        { style: 'tadm-sync-cmp' },
        DOM({}, DOM({ style: 'tadm-label' }, 'В БД'), DOM({ tag: 'pre', style: 'tadm-mono' }, JSON.stringify(TalentAdmin.exportRow(kind, row), null, 1))),
        DOM({}, DOM({ style: 'tadm-label' }, 'В контенте'), DOM({ tag: 'pre', style: 'tadm-mono' }, state === 'missing' ? '—' : JSON.stringify(this.content[kind][row.id], null, 1))),
      ),
    );
    return box;
  }

  async save() {
    const changes = this.changes();
    if (!Object.keys(changes).length || !this.saveButton || this.saving) return;

    const kind = this.kind;
    const id = this.selectedId;

    this.saving = true;
    this.saveButton.disabled = true;
    this.saveButton.textContent = 'Сохранение…';

    try {
      const result = await App.api.request('build', KINDS[kind].edit, { id, object: changes });
      const row = this.byId[kind].get(id);

      Object.assign(row, result && typeof result === 'object' ? result : changes);
      this.draft = { ...row };

      const item = this.items[kind].find((i) => i.row.id === id);
      if (item) this.fillRow(kind, row, item.element);

      App.notify(`Талант #${id} сохранён`);
      this.refreshExportButton();
      this.renderEditor();
    } catch (error) {
      App.error(String(error));
      if (this.saveButton) {
        this.saveButton.textContent = 'Сохранить';
        this.refreshDirty();
      }
    } finally {
      this.saving = false;
    }
  }

  // ---------- выгрузка talent_data ----------

  refreshExportButton() {
    if (!this.loaded) return;
    const count = this.unsyncedCount();
    this.exportButton.classList.toggle('tadm-attention', count > 0);
    this.exportButton.textContent = count ? `Выгрузить talent_data (${count} ≠)` : 'Выгрузить talent_data';
  }

  exportFiles() {
    if (!this.loaded) return;

    for (const kind of Object.keys(KINDS)) {
      const data = {};
      for (const row of this.rows[kind]) data[row.id] = TalentAdmin.exportRow(kind, row);

      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = DOM({ tag: 'a', href: url, download: KINDS[kind].file });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    App.notify('talents.json и hero_talents.json скачаны — положите их в content/talent_data/');
  }
}
