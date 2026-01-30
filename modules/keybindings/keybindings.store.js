/**
 * KeybindStore: manages keybindings for the application,
 * observer pattern implementation
 *
 * @typedef {Object} KeybindStore
 * @property {Keybinds} fileModel - { slot1: '1', slot2: 'Q', ... }
 * @property {'native'|'browser'} source - source of keybindings
 * @property {string|null} configPath - path to keybindings config this.keybindsFileModel
 * @property {function[]} subscribers - list of subscribers to notify when keybindings change
 *
 * @method set - sets keybinding for a slot
 * @param {string} slot - slot to set keybinding for
 * @param {string} key - key to set for a slot
 *
 * @method setAll - sets keybindings for all slots
 * @param {Object} newBinds - object with keybindings to set
 *
 * @method notify - notifies subscribers about keybindings change
 *
 * @method subscribe - subscribes to keybindings change notification
 * @param {function} fn - callback function to call when keybindings change
 */

export const KeybindStore = {
  fileModel: {
    sections: [
      // GLOBAL
      {
        name: null,
        binds: [
          { type: 'bind', command: 'console_prevcommand', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_nextcommand', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_scrollup', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_scrolldown', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_charleft', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_charright', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_home', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_end', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_runcommand', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_runcommand', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_autocomplete', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_clear', value: null, negated: false, keys: null },
          { type: 'bind', command: 'console_eraselastchar', value: null, negated: false, keys: null },
          { type: 'bind_command', command: 'toggle_fps', value: null, negated: false, keys: null },
          { type: 'bind_command', command: 'screenshot .jpg', value: null, negated: false, keys: null },
          { type: 'bind_command', command: 'screenshot .png', value: null, negated: false, keys: null },
        ],
      },

      //  adventure_screen (main)
      {
        name: 'adventure_screen',
        binds: [
          { type: 'bind', command: 'cmd_move', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_attack', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_hold', value: null, negated: false, keys: null },

          // slots 1–24
          ...Array.from({ length: 24 }, (_, i) => ({
            type: 'bind',
            command: `cmd_action_bar_slot${i + 1}`,
            value: null,
            negated: false,
            keys: null,
          })),
          { type: 'bind', command: 'self_cast_on', value: null, negated: false, keys: null },
          { type: 'bind', command: 'self_cast_off', value: null, negated: true, keys: null },

          { type: 'bind', command: 'cmd_portal', value: null, negated: false, keys: null },

          { type: 'bind', command: 'cs_toggle_healthbars', value: null, negated: false, keys: null },

          { type: 'bind', command: 'exit_game', value: null, negated: false, keys: null },

          { type: 'bind', command: 'camera_switch_attach_mode_down', value: null, negated: false, keys: null },
          { type: 'bind', command: 'camera_switch_attach_mode_up', value: null, negated: true, keys: null },

          { type: 'bind', command: 'show_statistics', value: null, negated: false, keys: null },
          { type: 'bind', command: 'hide_statistics', value: null, negated: true, keys: null },

          { type: 'bind', command: 'show_charstat', value: null, negated: false, keys: null },
          { type: 'bind', command: 'show_inventory', value: null, negated: false, keys: null },
          { type: 'bind', command: 'show_talents', value: null, negated: false, keys: null },

          { type: 'bind', command: 'actionbar_lock_off', value: null, negated: false, keys: null },
          { type: 'bind', command: 'actionbar_lock_on', value: null, negated: true, keys: null },
        ],
      },

      //  GLOBAL
      {
        name: null,
        binds: [
          { type: 'bind', command: 'cmd_cancel', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cs_mouse_wheel_down', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cs_mouse_wheel_up', value: null, negated: true, keys: null },
          { type: 'bind', command: 'exit_bind', value: null, negated: false, keys: null },
        ],
      },

      //  adventure_screen (camera numeric)
      {
        name: 'adventure_screen',
        binds: [
          { type: 'bind', command: 'camera_zoom', value: '+1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_zoom', value: '-1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_forward', value: '+1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_forward', value: '-1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_strafe', value: '+1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_strafe', value: '-1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_pitch', value: '-1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_pitch', value: '+1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_rotate', value: '+1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_rotate', value: '-1.0', negated: false, keys: null },
          { type: 'bind', command: 'camera_zoom_mouse', value: '-0.003', negated: false, keys: null },
        ],
      },

      //  GLOBAL (mouse camera)
      {
        name: null,
        binds: [
          { type: 'bind', command: '+camera_roll', value: null, negated: false, keys: null },
          { type: 'bind', command: '-camera_roll', value: null, negated: false, keys: null },
          { type: 'bind', command: '+camera_upward', value: null, negated: false, keys: null },
          { type: 'bind', command: '-camera_upward', value: null, negated: false, keys: null },

          { type: 'bind', command: 'camera_rotate_mouse', value: '0.03', negated: false, keys: null },
          { type: 'bind', command: 'camera_pitch_mouse', value: '0.03', negated: false, keys: null },
          { type: 'bind', command: 'camera_strafe_mouse', value: '-0.03', negated: false, keys: null },
          { type: 'bind', command: 'camera_strafe_mouse', value: '0.03', negated: false, keys: null },
          { type: 'bind', command: 'camera_forward_mouse', value: '0.03', negated: false, keys: null },
          { type: 'bind', command: 'camera_forward_mouse', value: '0.03', negated: false, keys: null },
        ],
      },

      //  minigame
      {
        name: 'minigame',
        binds: [
          { type: 'bind', command: 'minigame_escape', value: null, negated: false, keys: null },
          { type: 'bind', command: 'easel_mg_boost1', value: null, negated: false, keys: null },
          { type: 'bind', command: 'easel_mg_boost2', value: null, negated: false, keys: null },
          { type: 'bind', command: 'easel_mg_boost3', value: null, negated: false, keys: null },
          { type: 'bind', command: 'easel_mg_heroic_boost', value: null, negated: false, keys: null },
        ],
      },

      //  GLOBAL (chat & misc)
      {
        name: null,
        binds: [
          { type: 'bind', command: 'cmd_smart_chat', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_cancel', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_1', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_2', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_3', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_4', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_5', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_6', value: null, negated: false, keys: null },
          { type: 'bind', command: 'cmd_smart_chat_7', value: null, negated: false, keys: null },
        ],
      },
    ],
  },
  uiModel: {
    talents: {
      ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`cmd_action_bar_slot${i + 1}`, null])),

      self_cast_on: {
        keys: null,
        self_cast_off: null,
      },

      cmd_portal: null,
      actionbar_lock_off: {
        keys: null,
        actionbar_lock_on: null,
      },
    },
    additionalTalents: {
      ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`cmd_action_bar_slot${i + 11}`, null])),
    },
    smartChat: {
      cmd_smart_chat: null,
      ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`cmd_smart_chat_${i + 1}`, null])),
    },
    fighting: {
      cmd_move: null,
      cmd_attack: null,
      cmd_hold: null,
      cs_toggle_healthbars: null,
    },
    windowManagement: {
      chat_open_close: null,
      chat_open_global: null,
      chat_open_team: null,
      show_statistics: {
        keys: null,
        hide_statistics: null,
      },
      show_charstat: null,
      show_inventory: null,
      show_talents: null,
    },
    camera: {
      camera_switch_attach_mode_down: {
        keys: null,
        camera_switch_attach_mode_up: null,
      },
      camera_forward: {
        '+1.0': null,
        '-1.0': null,
      },
      camera_strafe: {
        '+1.0': null,
        '-1.0': null,
      },
      camera_rotate: {
        '+1.0': null,
        '-1.0': null,
      },
    },
  },
  linkedCommands: {
    actionbar_lock_off: 'actionbar_lock_on',
    camera_switch_attach_mode_down: 'camera_switch_attach_mode_up',
    self_cast_on: 'self_cast_off',
    show_statistics: 'hide_statistics',
    cs_mouse_wheel_down: 'cs_mouse_wheel_up',
    minimap_signal_key_down: 'minimap_signal_key_up',
  },
  source: 'native' | 'browser',
  configPath: null,
  subscribers: [],

  init(fileModel) {
    this.fileModel = fileModel;
    this.uiModel = this.mapFileToUiModel();
  },

  getBind(command, value = null) {
    for (const section of this.fileModel.sections) {
      for (const bind of section.binds) {
        if (bind.command === command && bind.value === value) {
          return bind;
        }
      }
    }
    return null;
  },
  setBind(command, keys, value = null) {
    const bind = this.getBind(command, value);
    if (!bind) return false;

    bind.keys = keys;
    const linked = this.linkedCommands[command];
    if (linked) {
      const linkedBind = this.getBind(linked, value);
      if (linkedBind) {
        linkedBind.keys = [...keys];
      }
    }
    this.uiModel = this.mapFileToUiModel();
    this.notify();
    return true;
  },

  notify() {
    this.subscribers.forEach((fn) => fn(this.fileModel));
  },

  subscribe(fn) {
    this.subscribers.push(fn);
  },

  mapFileToUiModel() {
    const ui = structuredClone(this.uiModel);
    for (const section of this.fileModel.sections) {
      for (const bind of section.binds) {
        // talents
        if (bind.command.startsWith('cmd_action_bar_slot')) {
          const n = Number(bind.command.replace('cmd_action_bar_slot', ''));
          if (n <= 10) ui.talents[bind.command] = bind.keys;
          else ui.additionalTalents[bind.command] = bind.keys;
          continue;
        }

        // camera numeric
        if (['camera_forward', 'camera_strafe', 'camera_rotate'].includes(bind.command)) {
          ui.camera[bind.command][bind.value] = bind.keys;
          continue;
        }

        // fighting
        if (ui.fighting[bind.command] !== undefined) {
          ui.fighting[bind.command] = bind.keys;
          continue;
        }

        // smart chat
        if (ui.smartChat[bind.command] !== undefined) {
          ui.smartChat[bind.command] = bind.keys;
          continue;
        }
      }
    }

    return ui;
  },
};
