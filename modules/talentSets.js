import { Lang } from './lang.js';
import { TALENT_SETS } from './sets.list.js';

export class TalentSets {
  static list() {
    const setsObj = TALENT_SETS || {};
    return Object.entries(setsObj)
      .map(([key, s]) => ({
        key,
        set_name: s?.set_name,
        set_desc: s?.set_desc,
        _manualOrder: (s?.talents || []).filter((id) => Number(id) > 0),
      }))
      .filter((set) => Array.isArray(set._manualOrder) && set._manualOrder.length > 0)
      .reverse();
  }

  static getDisplayName(set) {
    // manual list: set name = main talent name (localized)
    if (Array.isArray(set._manualOrder) && set._manualOrder.length) {
      const mainId = set._manualOrder[0];
      const absId = Math.abs(mainId);
      const nameKey = `talent_${absId}_name`;
      const name = Lang.text(nameKey);
      if (name && name !== nameKey) return name;
    }

    return set.key;
  }

  static chooseMainTalentId(set) {
    if (Array.isArray(set._manualOrder) && set._manualOrder.length) return set._manualOrder[0];
    return null;
  }

  static getTalentIds(set) {
    // manual: keep declared order (main first, rest by id as you keep it)
    if (Array.isArray(set._manualOrder) && set._manualOrder.length) return set._manualOrder.slice();
    return [];
  }
}

