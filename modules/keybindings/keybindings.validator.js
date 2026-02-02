export class BindParseError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'BindParseError';
    this.line = line;
  }
}

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
    if (typeof bind.value !== 'string' ||
        !/^[-+]?\d+(\.\d+)?$/.test(bind.value)) {
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