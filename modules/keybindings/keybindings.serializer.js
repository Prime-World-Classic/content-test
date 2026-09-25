
/**
 * Serialize keybind file model into string
 * @param {{ sections: Array<{name: string|null, binds: any[]}> }} fileModel
 * @returns {string} Serialized keybind config
 */
export function serializeCfg(fileModel) {
  if (!fileModel) return '';
  let out = 'unbindall\n';

  for (const section of fileModel.sections) {
    out += `bindsection ${section.name ?? ''}\n`;

    for (const bind of section.binds) {
      switch (bind.type) {
        case 'bind':
          out += serializeBind(bind);
          break;
        case 'bind_command':
          out += serializeBindCommand(bind);
          break;
      }
    }
  }

  return out;
}

function serializeBind(bind) {
  const neg = bind.negated ? '!' : '';
  const val = bind.value ? ` ${bind.value}` : '';
  const keys = serializeKeys(bind);
  return `${bind.type} ${neg}${bind.command}${val} ${keys}\n`;
}

function serializeBindCommand(bind) {
  return `${bind.type} ${serializeKeys(bind)} "${bind.command}" \n`;
}

function serializeKeys(bind) {
  return bind.keys && bind.keys.length ? bind.keys.map((k) => `'${k}'`).join(' + ') : "''";
}