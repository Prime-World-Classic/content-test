import { HTTP } from './http.js';

// Статические данные талантов (txtNum/stats/statsRefine у общих, params у hero)
// живут в контенте лончера (talent_data/*.json, генератор — pw-api stats.js
// «talent-data»), бэкенд их в build.data / build.inventory не отправляет.
// Загрузка — по аналогии с локализацией (Lang.init): один раз при старте, жёстко.
export class TalentData {
  static common = {}; // id → { txtNum, stats, statsRefine }
  static hero = {};   // |id| → { params }
  static _loaded = false;

  static async init() {
    console.log('Loading talent data...');

    try {
      [TalentData.common, TalentData.hero] = await Promise.all([
        HTTP.request('content/talent_data/talents.json'),
        HTTP.request('content/talent_data/hero_talents.json'),
      ]);
    } catch (error) {
      console.error('Error loading talent data files:', error);
      throw new Error('Failed to load talent data: ' + error.message);
    }

    TalentData._loaded = true;
    console.log(
      'Talent data loaded:',
      Object.keys(TalentData.common).length,
      'common,',
      Object.keys(TalentData.hero).length,
      'hero'
    );
  }

  // Наполняет предметы списка (build.data body / build.inventory items) данными
  // из локальных файлов. предметы null пропускаются; id без локальных данных —
  // громко в лог (файлы должны покрывать всю таблицу).
  static enrich(items) {
    if (!TalentData._loaded || !Array.isArray(items)) {
      return items;
    }

    for (let item of items) {
      if (!item) {
        continue;
      }

      const id = Number(item.id);

      if (!id) {
        continue;
      }

      const local = id > 0 ? TalentData.common[id] : TalentData.hero[Math.abs(id)];

      if (!local) {
        console.error(`TalentData: талант ${id} отсутствует в talent_data`);
        continue;
      }

      Object.assign(item, local);
    }

    return items;
  }
}
