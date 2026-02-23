class Rule {
  constructor(name, priority = 0) {
    this.name = name;
    this.priority = priority;
  }

  evaluate(context) {
    return {
      allowed: true,
      priority: this.priority,
      severity: null,
      reason: null,
    };
  }
}

class EmptyKeyRule extends Rule {
  constructor() {
    super('EmptyKeyRule', 0);
  }
  evaluate({ combo }) {
    if (!combo) {
      return {
        allowed: true,
        severity: 'info',
        reason: 'Empty combo',
      };
    }
    return { allowed: true };
  }
}

class LinkedGroupRule extends Rule {
  constructor(linkedGroups) {
    super('LinkedGroupRule', 100);
    this.linkedGroups = linkedGroups;
  }

  evaluate({ entries }) {
    for (const group of Object.values(this.linkedGroups)) {
      const allMatch = entries.every((e) => group.members.some((m) => m.command === e.bind.command && m.negated === e.bind.negated));

      if (!allMatch) continue;

      const sectionsOk = entries.every((e) => group.sections.includes(e.section));

      if (sectionsOk && entries.length === group.members.length) {
        return {
          allowed: true,
          priority: this.priority,
          severity: 'none',
          reason: 'Linked group',
        };
      }
    }

    return { allowed: true };
  }
}

class SameSectionDuplicateRule extends Rule {
  constructor() {
    super('SameSectionDuplicateRule', 50);
  }

  evaluate({ entries }) {
    const sections = new Set(entries.map((e) => e.section));

    if (sections.size === 1 && entries.length > 1) {
      return {
        allowed: false,
        priority: this.priority,
        severity: 'error',
        reason: 'Duplicate in same section',
      };
    }

    return { allowed: true };
  }
}

class RuleEngine {
  constructor(rules = []) {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  evaluate(context) {
    const results = [];

    for (const rule of this.rules) {
      const result = rule.evaluate(context);
      results.push({ rule: rule.name, ...result });
    }
    return results;
  }
}

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

export function findConflicts(fileModel, linkedGroups) {
  const engine = new RuleEngine([
    new EmptyKeyRule(),
    new LinkedGroupRule(linkedGroups),
    new SameSectionDuplicateRule(),
  ]);

  const conflicts = [];

  const keysMap = createKeysBindMap(fileModel);

  for (const [combo, entries] of keysMap.entries()) {
    const context = { combo, entries, fileModel, linkedGroups };
    const results = engine.evaluate(context);

    // check top priority result, if not allowed, it's a conflict, if allowed with reason 'Linked group', it's not a conflict even if there are duplicates, otherwise it's a conflict
    const final = results.sort((a, b) => b.priority - a.priority)[0].allowed;
    console.log(combo, final)
    if (final) {
      conflicts.push({
        combo,
        entries,
        reason: final.reason,
        severity: final.severity,
      });
    }
  }

  return conflicts;
}
