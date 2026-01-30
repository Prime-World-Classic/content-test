import { DOM } from '../dom.js';
import { Lang } from '../lang.js';
import { domAudioPresets } from '../domAudioPresets.js';
import { KeybindStore } from './keybindings.store.js';
import { loadKeybinds, saveKeybinds } from './keybindings.io.js';
import { normalizeKey } from './keybindings.input.js';


function formatKeys(keys) {
  return keys && keys.length ? keys.join(' + ') : '';
}

function createKeyInput({ command, value = null }) {
  const input = DOM({
    tag: 'input',
    style: 'castle-keybinding-input',
    readonly: true,
  });

  function refresh() {
    const bind = KeybindStore.getBind(command, value);
    input.value = formatKeys(bind?.keys);
  }

  input.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape' || e.key === 'Enter') {
      input.blur();
      return;
    };

    const keys = normalizeKey(e);
    KeybindStore.setBind(command, keys, value);
  });

  KeybindStore.subscribe(refresh);
  refresh();

  return input;
}

function createRow(label, inputEl) {
  return DOM(
    { style: 'keybinding-row' },
    DOM({}, label),
    inputEl
  );
}

function createGroup(title, rows) {
  return DOM(
    { style: 'keybinding-group' },
    DOM({ tag: 'h3', style: 'keybinding-group-title' }, title),
    DOM({ style: 'keybinding-group-rows' },
      ...rows
    ),
  );
}


function buildTalents(ui) {
  const rows = [];

  for (let i = 1; i <= 10; i++) {
    const cmd = `cmd_action_bar_slot${i}`;
    rows.push(createRow(
      Lang.text('slot').replace('{num}', i),
      createKeyInput({ command: cmd })
    ));
  }

  rows.push(createRow(
    Lang.text('selfCast'),
    createKeyInput({ command: 'self_cast_on' })
  ));

  rows.push(createRow(
    Lang.text('portal'),
    createKeyInput({ command: 'cmd_portal' })
  ));

  rows.push(createRow(
    Lang.text('actionBarLock'),
    createKeyInput({ command: 'actionbar_lock_off' })
  ));

  return createGroup(Lang.text('talents'), rows);
}

function buildAdditionalTalents() {
  const rows = [];

  for (let i = 11; i <= 24; i++) {
    const cmd = `cmd_action_bar_slot${i}`;
    rows.push(createRow(
      Lang.text('slot').replace('{num}', i),
      createKeyInput({ command: cmd })
    ));
  }

  return createGroup(Lang.text('additionalTalents'), rows);
}

function buildSmartChat() {
  const rows = [];

  rows.push(createRow(
    Lang.text('smartChatMenu'),
    createKeyInput({ command: 'cmd_smart_chat' })
  ));

  for (let i = 1; i <= 7; i++) {
    const cmd = `cmd_smart_chat_${i}`;
    rows.push(createRow(
      Lang.text(`smartChat${i}`),
      createKeyInput({ command: cmd })
    ));
  }

  return createGroup(Lang.text('smartChat'), rows);
}

function buildFighting() {
  const map = [
    [Lang.text('move'), 'cmd_move'],
    [Lang.text('attack'), 'cmd_attack'],
    [Lang.text('hold'), 'cmd_hold'],
    [Lang.text('healthBars'), 'cs_toggle_healthbars'],
  ];

  const rows = map.map(([label, cmd]) =>
    createRow(label, createKeyInput({ command: cmd }))
  );

  return createGroup(Lang.text('fighting'), rows);
}

function buildWindowManagement() {
  const map = [
    [Lang.text('showStatistics'), 'show_statistics'],
    [Lang.text('character'), 'show_charstat'],
    [Lang.text('inventory'), 'show_inventory'],
    [Lang.text('talents'), 'show_talents'],
  ];

  const rows = map.map(([label, cmd]) =>
    createRow(label, createKeyInput({ command: cmd }))
  );

  return createGroup(Lang.text('windowManagement'), rows);
}

function buildCamera() {
  const rows = [];

  rows.push(createRow(
    Lang.text('cameraMode'),
    createKeyInput({ command: 'camera_switch_attach_mode_down' })
  ));

  const numeric = [
    [Lang.text('forwardPlus'), 'camera_forward', '+1.0'],
    [Lang.text('forwardMinus'), 'camera_forward', '-1.0'],
    [Lang.text('strafePlus'), 'camera_strafe', '+1.0'],
    [Lang.text('strafeMinus'), 'camera_strafe', '-1.0'],
    [Lang.text('turnPlus'), 'camera_rotate', '+1.0'],
    [Lang.text('turnMinus'), 'camera_rotate', '-1.0'],
  ];

  for (const [label, cmd, value] of numeric) {
    rows.push(createRow(
      label,
      createKeyInput({ command: cmd, value })
    ));
  }

  return createGroup(Lang.text('camera'), rows);
}


export async function keybindings() {
  const ok = await loadKeybinds();
  if (!ok) return DOM({}, Lang.text('settingsReadError'));

  const content = DOM(
    { style: 'keybindings-wrapper' },

    buildTalents(),
    buildAdditionalTalents(),
    buildSmartChat(),
    buildFighting(),
    buildWindowManagement(),
    buildCamera()
  );

  const saveBtn = DOM({
    domaudio: domAudioPresets.bigButton,
    style: 'castle-menu-item-button',
    event: ['click', async () => {
      await saveKeybinds();
    }]
  }, Lang.text('save'));

  const controls = DOM({ style: 'keybindings-controls' }, saveBtn);



  return DOM(
    { id: 'wcastle-keybindings' },
    content,
    controls
  );
}
