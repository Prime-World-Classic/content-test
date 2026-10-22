export function createEmptyFileModel() {
  return {
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
          { type: 'bind', command: 'show_charstat', value: null, negated: false, keys: null },
          { type: 'bind', command: 'show_talents', value: null, negated: false, keys: null },
          { type: 'bind', command: 'show_statistics', value: null, negated: false, keys: null },
          { type: 'bind', command: 'hide_statistics', value: null, negated: true, keys: null },
          { type: 'bind', command: 'easel_skip_movie', value: null, negated: false, keys: null },
        ],
      },

      //  GLOBAL (chat & misc)
      {
        name: null,
        binds: [
          { type: 'bind', command: 'dialog_escape', value: null, negated: false, keys: null },

          { type: 'bind', command: 'editline_wordleft', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_wordright', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_left', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_right', value: null, negated: false, keys: null },

          { type: 'bind', command: 'editline_paste', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_copy', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_cut', value: null, negated: false, keys: null },

          { type: 'bind', command: 'editline_up', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_down', value: null, negated: false, keys: null },

          { type: 'bind', command: 'editline_return', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_return', value: null, negated: false, keys: null },

          { type: 'bind', command: 'editline_delete', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_back', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_clear', value: null, negated: false, keys: null },
          { type: 'bind', command: 'editline_tab', value: null, negated: false, keys: null },

          { type: 'bind', command: 'draganddrop_cancel', value: null, negated: false, keys: null },
          { type: 'bind', command: 'dumpscreens', value: null, negated: false, keys: null },

          { type: 'bind', command: 'minimap_signal_key_down', value: null, negated: false, keys: null },
          { type: 'bind', command: 'minimap_signal_key_up', value: null, negated: true, keys: null },

          { type: 'bind', command: 'chat_open_close', value: null, negated: false, keys: null },
          { type: 'bind', command: 'chat_open_global', value: null, negated: false, keys: null },
          { type: 'bind', command: 'chat_open_team', value: null, negated: false, keys: null },

          { type: 'bind', command: 'window_full_screen', value: null, negated: false, keys: null },

          { type: 'bind', command: 'login_screen_tab', value: null, negated: false, keys: null },
          { type: 'bind', command: 'login_screen_enter', value: null, negated: false, keys: null },
          { type: 'bind', command: 'login_screen_enter', value: null, negated: false, keys: null },

          { type: 'bind', command: 'open_close_game_menu', value: null, negated: false, keys: null },
          { type: 'bind', command: 'skip_phrase_cinematic', value: null, negated: false, keys: null },

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
  };
}

export function createEmptyUiModel() {
  return {
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
  };
}

export function normalizeFileModel(schemaModel, parsedModel) {
  function makeBindMapKey(sectionName, bind) {
    return [sectionName ?? '__global__', bind.type, bind.command, bind.value ?? '', bind.negated ? '!' : ''].join('|');
  }

  const lastBindMap = new Map();

  for (const section of parsedModel.sections) {
    const logicalSection = section.name ?? '__global__';

    for (const bind of section.binds) {
      const key = makeBindMapKey(logicalSection, bind);
      lastBindMap.set(key, bind);
    }
  }

  for (const section of schemaModel.sections) {
    const logicalSection = section.name ?? '__global__';

    for (const bind of section.binds) {
      const key = makeBindMapKey(logicalSection, bind);
      const override = lastBindMap.get(key);

      bind.keys = override?.keys ? [...override.keys] : null;
    }
  }

  return schemaModel;
}
