/**
 * Parse Prime World keybind cfg into file model
 * @param {string} cfgText
 * @returns {{ sections: Array<{name: string|null, binds: any[]}> }}
 */
export function parseKeybindCfg(cfgText) {
  const lines = cfgText.split(/\r?\n/);

  /** @type {{ sections: any[] }} */
  const model = { sections: [] };

  let currentSection = { name: null, binds: [] };
  model.sections.push(currentSection);

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === 'unbindall') continue;

    // bindsection
    if (line.startsWith('bindsection')) {
      const parts = line.split(/\s+/);
      const name = parts.length > 1 ? parts[1] : null;

      currentSection = { name, binds: [] };
      model.sections.push(currentSection);
      continue;
    }

    //  bind or bind_command
    if (line.startsWith('bind ') || line.startsWith('bind_command ')) {
      const bind = parseBindLine(line);
      if (bind) currentSection.binds.push(bind);
    }
  }

  return model;
}

/**
 * Parse single bind line
 * @param {string} line
 */
export function parseBindLine(line) {
  let rest = '';
  let type = 'bind';

  if (line.startsWith('bind_command ')) {
    rest = line.slice(13).trim();
    type = 'bind_command';
  } else if (line.startsWith('bind ')) {
    rest = line.slice(5).trim();
  } else {
    return null;
  }

  let negated = false;
  if (rest.startsWith('!')) {
    negated = true;
    rest = rest.slice(1).trim();
  }

  const tokens = tokenize(rest);
  if (tokens.length === 0) return null;

  let command = null;
  let value = null;

  if (type === 'bind') {
    command = tokens.shift();

    if (tokens.length >= 1) {
      if (/^[+-]\d/.test(tokens[0])) {
        value = tokens.shift();
      } else if (/^\d+(\.\d+)?$/.test(tokens[0])) {
        value = tokens.shift();
      } else if ((tokens[0] === '+' || tokens[0] === '-') && tokens[1] && /^\d+(\.\d+)?$/.test(tokens[1])) {
        value = tokens.shift() + tokens.shift();
      }
    }
  } else {
    const cmdTokens = [];

    for (const t of tokens) {
      if (t === '+') continue;
      if (t.startsWith("'") && t.endsWith("'")) continue;
      cmdTokens.push(t);
    }

    command = cmdTokens.join(' ').replace(/^"|"$/g, '');
  }

  const keyTokens = tokens.filter((t) => t !== '+');

  const keys = keyTokens
    .filter((k) => k.startsWith("'"))
    .map((k) => k.replace(/^'|'$/g, ''))
    .filter((k) => k.length > 0);

  return {
    type,
    command,
    value,
    negated,
    keys: keys.length ? keys : null,
  };
}


/**
 * Tokenize a given string into an array of tokens.
 * Tokens are defined as any of the following:
 * - A single '+' character
 * - A sequence of characters enclosed in single quotes
 * - Any sequence of non-whitespace characters
 * @param {string} str - The string to tokenize
 * @returns {Array<string>} - An array of tokens
 */
export function tokenize(str) {
  const regex = /'[^']*'|\+|[^\s]+/g;
  return str.match(regex) || [];
}

/**
 * Serialize keybind file model into string
 * @param {{ sections: Array<{name: string|null, binds: any[]}> }} fileModel
 * @returns {string} Serialized keybind config
 */
export function serializeCfg(fileModel) {
  if (!fileModel) return '';
  let out = 'unbindall\n';

  for (const section of fileModel.sections) {
    if (section.name) out += `bindsection ${section.name}\n`;

    for (const bind of section.binds) {
      const neg = bind.negated ? '!' : '';
      const val = bind.value ? ` ${bind.value}` : '';
      const keys = bind.keys?.map(k => `'${k}'`).join(' + ') ?? '';

      out += `${bind.type} ${neg}${bind.command}${val} ${keys}\n`;
    }
  }

  return out;
}
