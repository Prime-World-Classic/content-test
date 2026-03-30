/*
  Короткие и альтернативные названия для поиска героев в замке.
  Ключ — id героя. Можно дополнять своими строками.
*/
export const HERO_SEARCH_ALIASES = {
  1: ['duel', 'дуэлянт', 'дуэль', 'дуля'],
  2: ['cryo', 'крио'],
  3: ['face', 'faceless', 'безликий', 'маска'],
  4: ['warlord', 'wl', 'варлорд', 'дед'],
  5: ['lm', 'lightning', 'маг молний', 'молния'],
  6: ['shadow', 'шадоу', 'тень'],
  7: ['wolf', 'dancer', 'wd', 'волк'],
  8: ['inv', 'inventor', 'инженер'],
  9: ['art', 'artiste', 'артист', 'краска'],
  10: ['high', 'highlander', 'хай', 'горец', 'меч'],
  11: ['brawl', 'brawler', 'драчун', 'вдв'],
  12: ['fox', 'firefox', 'лиса', 'огненная лиса'],
  13: ['heal', 'healer', 'хилка', 'лекарь'],
  14: ['nq', 'night queen', 'ночная королева', 'кошка'],
  15: ['quarry', 'quarrier', 'карьер', 'чг'],
  16: ['sin', 'assa', 'assassin', 'ассасин', 'убийца'],
  17: ['maiden', 'дева'],
  18: ['hunt', 'hunter', 'охотник', 'кент'],
  19: ['reaper', 'soul', 'жнец', 'душ'],
  20: ['piper', 'pied', 'крысолов'],
  21: ['amz', 'amazon', 'амазонка', 'лучница'],
  22: ['claw', 'коготь'],
  23: ['frog', 'whisperer', 'лягушка', 'жаба'],
  24: ['wood', 'woodsman', 'лесник'],
  25: ['df', 'dragonfly', 'стрекоза', 'креветка'],
  26: ['muse', 'муза'],
  27: ['bm', 'blade', 'бм', 'клинок', 'мастер клинка'],
  28: ['mag', 'mage', 'маг'],
  29: ['fairy', 'fq', 'фея', 'королева фей'],
  30: ['wand', 'wanderer', 'странник', 'w1'],
  31: ['doc', 'doctrine', 'доктрина'],
  32: ['demo', 'demon', 'демонолог'],
  33: ['vamp', 'vampire', 'вамп', 'вампир'],
  34: ['moira', 'мойра'],
  35: ['daka', 'дака', "da'ka", 'haka', 'хака', "ha'ka"],
  36: ['haka', 'хака', "ha'ka", 'daka', 'дака', "da'ka"],
  37: ['nox', 'нокс', 'жук'],
  38: ['guard', 'guardian', 'страж', 'танк'],
  39: ['frz', 'freeze', 'фриз', 'мороз'],
  40: ['des', 'desperado', 'десперадо'],
  41: ['turehu', "tu'rehu", 'туреху', 'турок'],
  42: ['mimi', 'мими'],
  43: ['sput', 'sputnik', 'спутник'],
  44: ['luna', 'луна'],
  45: ['tear', 'tearaway', 'отрыв'],
  46: ['zerk', 'ber', 'berserker', 'берс'],
  47: ['aggel', 'аггел', 'ангел'],
  48: ['hb', 'hellblade', 'адский клинок'],
  49: ['oak', 'smasher', 'дуб'],
  50: ['pd', 'plague', 'plague doctor', 'чумной', 'доктор'],
  51: ['kat', 'katana', 'катана'],
  52: ['avia', 'pilot', 'aviator', 'летчик', 'авиатор'],
  53: ['zeal', 'zealot', 'фанатик'],
  54: ['fallen', 'fl', 'fallen lord', 'падший'],
  55: ['dryad', 'дриада'],
  56: ['wand2', 'w2', 'wanderer2', 'странник2'],
  57: ['gun', 'gunner', 'ганнер', 'пушка'],
  58: ['chron', 'chronicle', 'хроника'],
  59: ['brew', 'brewer', 'пивовар', 'варун'],
  60: ['kara', 'кара'],
  61: ['wendy', 'wendigo', 'вендиго'],
  62: ['trick', 'trickster', 'трикстер', 'плут'],
  63: ['ban', 'banshee', 'банши'],
  64: ['sham', 'shaman', 'шаман'],
  65: ['bomb', 'bomber', 'бомбер', 'бомба'],
};

export function getHeroSearchAliases(heroId) {
  const numericId = Number(heroId);
  const raw = HERO_SEARCH_ALIASES[numericId];
  if (Array.isArray(raw)) {
    return raw.filter((name) => typeof name === 'string' && name.trim().length > 0);
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return [raw];
  }
  return [];
}
