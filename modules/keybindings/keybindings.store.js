import { createEmptyUiModel } from './keybindings.schema.js';
import { findConflicts } from './keybindings.validator.js';
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
  fileModel: {},
  uiModel: {},
  linkedGroups: {
    charstat: {
      members: [{ command: 'show_charstat', negated: false }],
      sections: ['adventure_screen', 'minigame'],
    },
    inventory: {
      members: [{ command: 'show_inventory', negated: false }],
      sections: ['adventure_screen', 'minigame'],
    },
    talents: {
      members: [{ command: 'show_talents', negated: false }],
      sections: ['adventure_screen', 'minigame'],
    },
    statistics: {
      members: [
        { command: 'show_statistics', negated: false },
        { command: 'hide_statistics', negated: true },
      ],
      sections: ['adventure_screen', 'minigame'],
    },
    actionbarLock: {
      members: [
        { command: 'actionbar_lock_off', negated: false },
        { command: 'actionbar_lock_on', negated: true },
      ],
      sections: ['adventure_screen'],
    },
    selfCast: {
      members: [
        { command: 'self_cast_on', negated: false },
        { command: 'self_cast_off', negated: true },
      ],
      sections: ['adventure_screen'],
    },
    enter: {
      members: [
        {
          command: 'console_runcommand',
          negated: false,
        },
        {
          command: 'editline_return',
          negated: false,
        },
        {
          command: 'login_screen_enter',
          negated: false,
        },
      ],
      sections: ['__global__'],
    },
    consoleUpKey: {
      members: [
        {
          command: 'console_prevcommand',
          negated: false,
        },
        {
          command: 'editline_up',
          negated: false,
        },
      ],
      sections: ['__global__'],
    },
    consoleDownKey: {
      members: [
        {
          command: 'console_nextcommand',
          negated: false,
        },
        {
          command: 'editline_down',
          negated: false,
        },
      ],
      sections: ['__global__'],
    },
    consoleLeftKey: {
      members: [
        {
          command: 'console_charleft',
          negated: false,
        },
        {
          command: 'editline_left',
          negated: false,
        },
      ],
      sections: ['__global__'],
    },
    consoleRightKey: {
      members: [
        { command: 'console_charright', negated: false },
        { command: 'editline_right', negated: false },
      ],
      sections: ['__global__'],
    },
    tabKey: {
      members: [
        { command: 'console_autocomplete', negated: false },
        { command: 'editline_tab', negated: false },
        { command: 'login_screen_tab', negated: false },
      ],
      sections: ['__global__'],
    },
    escapeKey: {
      members: [
        { command: 'console_clear', negated: false },
        { command: 'cmd_cancel', negated: false },
        { command: 'exit_bind', negated: false },
        { command: 'dialog_escape', negated: false },
        { command: 'editline_clear', negated: false },
        { command: 'draganddrop_cancel', negated: false },
        { command: 'open_close_game_menu', negated: false },
        { command: 'cmd_smart_chat_cancel', negated: false },
      ],
      sections: ['__global__'],
    },
    backspaceKey: {
      members: [
        { command: 'console_eraselastchar', negated: false },
        { command: 'editline_back', negated: false },
      ],
      sections: ['__global__'],
    },
    minimapSignal: {
      members: [
        { command: 'minimap_signal_key_down', negated: false },
        { command: 'minimap_signal_key_up', negated: true },
      ],
      sections: ['__global__'],
    },
    cameraAttach: {
      members: [
        { command: 'camera_switch_attach_mode_down', negated: false },
        { command: 'camera_switch_attach_mode_up', negated: true },
      ],
      sections: ['adventure_screen'],
    },
    mouseWheelPair: {
      members: [
        { command: 'cs_mouse_wheel_down', negated: false },
        { command: 'cs_mouse_wheel_up', negated: true },
      ],
      sections: ['__global__'],
    },
  },
  source: 'native' | 'browser',
  configPath: null,
  subscribers: [],

  init(fileModel, source = 'native', configPath = null) {
    this.fileModel = fileModel;
    this.source = source;
    this.configPath = configPath;
    this.uiModel = this.mapFileToUiModel();
    this.notify();
  },

  findLinkedBinds(changedBind) {
    const result = [];

    for (const group of Object.values(this.linkedGroups)) {
      const isMember = group.members.some((m) => m.command === changedBind.command && m.negated === changedBind.negated);

      if (!isMember) continue;

      for (const section of this.fileModel.sections) {
        if (section.name === null ? group.sections.includes('__global__') : group.sections.includes(section.name)) {
          for (const bind of section.binds) {
            if (group.members.some((m) => m.command === bind.command && m.negated === bind.negated)) {
              result.push(bind);
            }
          }
        }
      }
    }

    return result;
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

    bind.keys = [...keys];

    const linked = this.findLinkedBinds(bind);
    for (const b of linked) {
      b.keys = [...keys];
    }

    this.uiModel = this.mapFileToUiModel();
    this.notify();

    console.log('Current conflicts:', findConflicts(this.fileModel, this.linkedGroups));

    return true;
  },
  notify() {
    this.subscribers.forEach((fn) => fn(this.fileModel));
  },

  subscribe(fn) {
    this.subscribers.push(fn);
    const unsubscribeFunc = () => {
      this.subscribers = this.subscribers.filter((f) => f !== fn);
    };
    return unsubscribeFunc;
  },

  mapFileToUiModel(fileModel = this.fileModel) {
    const ui = createEmptyUiModel();

    for (const section of fileModel.sections) {
      for (const bind of section.binds) {
        // talents
        if (bind.command.startsWith('cmd_action_bar_slot')) {
          const n = Number(bind.command.replace('cmd_action_bar_slot', ''));
          if (n <= 10) ui.talents[bind.command] = bind.keys;
          else ui.additionalTalents[bind.command] = bind.keys;
          continue;
        }

        // paired buttons
        if (ui.talents[bind.command]?.keys !== undefined) {
          ui.talents[bind.command].keys = bind.keys;
          continue;
        }

        // camera numeric
        if (ui.camera[bind.command]?.[bind.value] !== undefined) {
          ui.camera[bind.command][bind.value] = bind.keys;
          continue;
        }

        // fighting
        if (bind.command in ui.fighting) {
          ui.fighting[bind.command] = bind.keys;
          continue;
        }

        // smart chat
        if (bind.command in ui.smartChat) {
          ui.smartChat[bind.command] = bind.keys;
          continue;
        }

        // window management
        if (bind.command in ui.windowManagement) {
          ui.windowManagement[bind.command] = bind.keys;
        }
      }
    }

    return ui;
  },
};
