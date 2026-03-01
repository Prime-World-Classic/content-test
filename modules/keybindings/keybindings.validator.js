export class BindParseError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'BindParseError';
    this.line = line;
  }
}

export class BindSameKeysError extends Error {
  constructor(combo, conflicts) {
    super(`Key combo ${combo} is assigned to multiple commands: ${conflicts.map((c) => c.command).join(', ')}`);
    this.name = 'BindSameKeysError';
    this.combo = combo;
    this.conflicts = conflicts;
  }
}

// Validate parse
export function validate(bind, line) {
  switch (bind.type) {
    case 'bind':
      validateBind(bind, line);
      break;
    case 'bind_command':
      validateBindCommand(bind, line);
      break;
    default:
      throw new BindParseError(`Unknown bind type: ${bind.type}`, line);
  }
}

function validateBind(bind, line) {
  if (!bind.command || typeof bind.command !== 'string') {
    throw new BindParseError('Missing or invalid command', line);
  }

  if (typeof bind.negated !== 'boolean') {
    throw new BindParseError('Invalid negated flag', line);
  }

  if (bind.value !== null) {
    if (typeof bind.value !== 'string' || !/^[-+]?\d+(\.\d+)?$/.test(bind.value)) {
      throw new BindParseError('Invalid numeric value', line);
    }
  }

  if (bind.keys !== null) {
    if (!Array.isArray(bind.keys)) {
      throw new BindParseError('Keys must be array or null', line);
    }
    for (const k of bind.keys) {
      if (typeof k !== 'string') {
        throw new BindParseError(`Invalid key "${k}"`, line);
      }
    }
  }

  if (bind.value !== null && (!bind.keys || bind.keys.length === 0)) {
    throw new BindParseError('Bind with value requires keys', line);
  }
}

function validateBindCommand(bind, line) {
  if (bind.value !== null) {
    throw new BindParseError('bind_command must not have value', line);
  }

  if (!bind.command || typeof bind.command !== 'string') {
    throw new BindParseError('bind_command requires command', line);
  }

  if (!Array.isArray(bind.keys) || bind.keys.length === 0) {
    throw new BindParseError('bind_command requires keys', line);
  }
}

// key conflicts
function createKeysBindMap(fileModel) {
  const map = new Map();

  for (const section of fileModel.sections) {
    const sectionName = section.name ?? '__global__';

    for (const bind of section.binds) {
      if (!bind.keys || bind.keys.length === 0) continue;
      if (bind.keys.some((k) => !k)) continue;

      const combo = [...bind.keys].sort().join('+');

      if (!map.has(combo)) {
        map.set(combo, []);
      }

      map.get(combo).push({
        section: sectionName,
        bind: bind,
      });
    }
  }

  return map;
}

function isLinkedGroup(entries, sectionName, linkedGroups) {

  for (const group of Object.values(linkedGroups)) {

    if (!group.sections.includes(sectionName)) continue;

    const allMatch = entries.every(e =>
      group.members.some(m =>
        m.command === e.bind.command &&
        m.negated === e.bind.negated
      )
    );

    if (!allMatch) continue;

    if (entries.length === group.members.length) {
      return true;
    }
  }

  return false;
}

function dedupeEntries(entries) {
  const seen = new Set();
  return entries.filter((e) => {
    const key = [e.section, e.bind.command, e.bind.value ?? '', e.bind.negated ? 1 : 0].join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isConflict(combo, entries, linkedGroups) {
  if (!combo) return false;

  const unique = dedupeEntries(entries);

  const sections = new Map();

  for (const e of unique) {
    if (!sections.has(e.section)) {
      sections.set(e.section, []);
    }
    sections.get(e.section).push(e);
  }

  for (const [sectionName, sectionEntries] of sections) {
    if (sectionEntries.length <= 1) continue;

    if (!isLinkedGroup(sectionEntries, sectionName, linkedGroups)) {
      return {
        combo: combo,
        section: sectionName,
        entries: sectionEntries
      };
    }
  }

  return false;
}

export function findConflicts(fileModel, linkedGroups) {
  const conflicts = [];
  const keysMap = createKeysBindMap(fileModel);

  for (const [combo, entries] of keysMap.entries()) {
    const conflict = isConflict(combo, entries, linkedGroups);
    if (conflict) {
      conflicts.push(conflict);
    }
  }

  return conflicts;
}
