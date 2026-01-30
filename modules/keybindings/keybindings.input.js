const CODE_MAP = {
  /* Letters */
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E',
  KeyF: 'F', KeyG: 'G', KeyH: 'H', KeyI: 'I', KeyJ: 'J',
  KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N', KeyO: 'O',
  KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T',
  KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y',
  KeyZ: 'Z',

  /* Digits */
  Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3',
  Digit4: '4', Digit5: '5', Digit6: '6', Digit7: '7',
  Digit8: '8', Digit9: '9',

  /* Arrows */
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',

  /* Navigation */
  Space: 'SPACE',
  Enter: 'ENTER',
  Escape: 'ESC',
  Tab: 'TAB',
  Backspace: 'BACKSPACE',
  Delete: 'DELETE',
  Insert: 'INSERT',
  Home: 'HOME',
  End: 'END',
  PageUp: 'PAGE_UP',
  PageDown: 'PAGE_DOWN',
  Backquote: '`',

  /* Function */
  F1:'F1',F2:'F2',F3:'F3',F4:'F4',F5:'F5',F6:'F6',
  F7:'F7',F8:'F8',F9:'F9',F10:'F10',F11:'F11',F12:'F12',

  /* Numpad */
  Numpad0:'NUM_0',Numpad1:'NUM_1',Numpad2:'NUM_2',
  Numpad3:'NUM_3',Numpad4:'NUM_4',Numpad5:'NUM_5',
  Numpad6:'NUM_6',Numpad7:'NUM_7',Numpad8:'NUM_8',
  Numpad9:'NUM_9',
  NumpadAdd:'NUM_ADD',
  NumpadSubtract:'NUM_SUB',
  NumpadMultiply:'NUM_MUL',
  NumpadDivide:'NUM_DIV',
  NumpadDecimal:'NUM_DOT',
  NumpadEnter:'NUM_ENTER'
};

export function normalizeKey(e) {
  const keys = [];

  if (e.ctrlKey) keys.push('CTRL');
  if (e.altKey) keys.push('ALT');
  if (e.shiftKey) keys.push('SHIFT');
  if (e.metaKey) keys.push('WIN');

  let main = CODE_MAP[e.code];

  if (!main || main == 'BACKSPACE') return keys; 

  keys.push(main);
  return keys;
}

