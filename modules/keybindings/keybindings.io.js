import { App } from '../app.js';
import { Lang } from '../lang.js';
import { DOM } from '../dom.js';
import { normalizeFileModel } from './keybindings.schema.js';
import { KeybindStore } from './keybindings.store.js';
import { parseKeybindCfg } from './keybindings.parser.js';
import { serializeCfg } from './keybindings.serializer.js';
import { NativeAPI } from '../nativeApi.js';
import { createEmptyFileModel } from './keybindings.schema.js';
import { BindParseError } from './keybindings.validator.js';

async function createDefaultConfigFile(targetPath) {
  if (!NativeAPI.status) return false;

  const targetDir = NativeAPI.path.dirname(targetPath);

  try {
    console.log('Creating default config file at', targetPath);

    await NativeAPI.fileSystem.promises.mkdir(targetDir, {
      recursive: true,
    });

    const r = await fetch('/content/keybindsFallback.cfg', {
      cache: 'no-store',
    });

    if (!r.ok) {
      console.error('Failed to fetch fallback config');
      return false;
    }

    const data = await r.text();

    await NativeAPI.fileSystem.promises.writeFile(targetPath, data, {
      encoding: 'utf8',
      flag: 'wx',
    });

    console.log('Default config file created at', targetPath);
    return true;
  } catch (e) {
    if (e.code === 'EEXIST') {
      return true;
    }

    console.error('Failed to create default config file:', e);
    return false;
  }
}

export async function findConfigFile() {
  const documentsPath = NativeAPI.getDocumentsDir();
  if (documentsPath) {
    console.log('Searching for native config file...');
    const configPath = NativeAPI.path.join(documentsPath, 'My Games', 'Prime World Classic', 'input_new.cfg');
	const backupPath = NativeAPI.path.join(documentsPath, 'My Games', 'Prime World Classic', 'input_new_backup.cfg');

    try {
      await NativeAPI.fileSystem.promises.access(configPath);
      console.log('Found native config file at', configPath);
      try {
        await NativeAPI.fileSystem.promises.access(backupPath);
        console.log('Backup already exists at', backupPath);
      } catch (backupErr) {
        if (backupErr.code === 'ENOENT') {
          console.log('Creating backup at', backupPath);
          await NativeAPI.fileSystem.promises.copyFile(configPath, backupPath);
          console.log('Backup created successfully');
        }
      }	  
      return { type: 'native', path: configPath };
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('Native config file not found at', configPath);
        const created = await createDefaultConfigFile(configPath);
        if (created) {
          return { type: 'native', path: configPath };
        }
      }
      console.error('Failed to access native config file:', e);
    }
  }
  console.log('Searching for browser config file...');
  try {
    const r = await fetch('/content/keybindsFallback.cfg', { cache: 'no-store' });
    if (r.ok) {
      return { type: 'browser', path: '/content/keybindsFallback.cfg' };
    }
  } catch (e) {
    console.error('Failed to fetch browser config file:', e);
  }

  return null;
}

export async function ensureActionBarSlotsInNativeCfg(cfgOverride = null) {
  if (!NativeAPI.status) return { changed: false };

  const cfg = cfgOverride || (await findConfigFile());
  if (!cfg || cfg.type !== 'native' || !cfg.path) return { changed: false };

  const configPath = cfg.path;
  let data = '';
  try {
    data = await NativeAPI.fileSystem.promises.readFile(configPath, 'utf8');
  } catch {
    return { changed: false };
  }

  const hasCrlf = data.includes('\r\n');
  const eol = hasCrlf ? '\r\n' : '\n';
  const lines = data.split(/\r?\n/);
  const present = new Set();
  const emptySlotsToFill = [];
  let lastFoundLineIndex = -1;
  const defaultActionBarBindings = {
    11: "'CTRL' + 'F11'",
    12: "'CTRL' + 'F12'",
    13: "'F13'",
    14: "'F14'",
    15: "'F15'",
    16: "'F16'",
    17: "'F17'",
    18: "'F18'",
    19: "'F19'",
    20: "'F20'",
    21: "'F21'",
    22: "'F22'",
    23: "'F23'",
    24: "'F24'",
  };

  const re = /^\s*bind\s+cmd_action_bar_slot(\d+)\b/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;

    const n = Number(m[1]);
    if (!Number.isFinite(n) || n < 1 || n > 24) continue;

    present.add(n);
    lastFoundLineIndex = i;

    if (n >= 11 && n <= 24) {
      const rhsMatch = lines[i].match(/^\s*bind\s+cmd_action_bar_slot\d+\s*(.*)$/);
      const rhs = String(rhsMatch?.[1] || '').trim();
      if (!rhs || rhs === "''" || rhs === '""') {
        lines[i] = `bind cmd_action_bar_slot${n} ${defaultActionBarBindings[n]}`;
        emptySlotsToFill.push(n);
      }
    }
  }

  const missing = [];
  for (let n = 1; n <= 24; n++) {
    if (!present.has(n)) missing.push(n);
  }

  if (missing.length) {
    const toInsert = missing.map((n) => `bind cmd_action_bar_slot${n} ${defaultActionBarBindings[n] || "''"}`);
    if (lastFoundLineIndex >= 0) lines.splice(lastFoundLineIndex + 1, 0, ...toInsert);
    else lines.push(...toInsert);
  }

  if (!missing.length && !emptySlotsToFill.length) return { changed: false };

  let out = lines.join(eol);
  if (!out.endsWith(eol)) out += eol;

  await NativeAPI.fileSystem.promises.writeFile(configPath, out, 'utf8');
  return { changed: true, configPath, missingAdded: missing.length, emptyFixed: emptySlotsToFill.length };
}

export async function loadKeybindsNative(cfg) {
  const data = await NativeAPI.fileSystem.promises.readFile(cfg.path, 'utf8');
  const parsed = parseKeybindCfg(data);
  const schema = createEmptyFileModel();

  KeybindStore.init(normalizeFileModel(schema, parsed), cfg.type, cfg.path);
  KeybindStore.notify();
}

export async function loadKeybindsBrowser(cfg) {
  const data = await fetch(cfg.path).then((r) => r.text());
  const parsed = parseKeybindCfg(data);
  const schema = createEmptyFileModel();

  KeybindStore.init(normalizeFileModel(schema, parsed), cfg.type, cfg.path);
  KeybindStore.notify();
}

export async function loadKeybinds() {
  const cfg = await findConfigFile();
  if (!cfg) return false;

  try {
    if (cfg.type === 'native') {
      await ensureActionBarSlotsInNativeCfg(cfg);
      await loadKeybindsNative(cfg);
    } else {
      await loadKeybindsBrowser(cfg);
    }
  } catch (err) {
    if (cfg.type === 'native' && err instanceof BindParseError) {
      console.error(err);
      console.warn('Invalid keybinds, restoring default...');

      // delete config
      await NativeAPI.fileSystem.promises.unlink(cfg.path);

      const restored = await createDefaultConfigFile(cfg.path);
      if (!restored) {
        return false;
      }

      try {
        await loadKeybindsNative(cfg);
        App.notify(Lang.text('restoredDefaultKeybindings'));
        return true;
      } catch (e) {
        App.error(Lang.text('errorKeybindingsLoad'));
        return false;
      }
    }
    App.error(Lang.text('errorKeybindingsLoad'));
    return false;
  }

  console.log('Keybinds loaded from', cfg.type, cfg.path);
  return true;
}

export async function saveKeybinds() {
  try {
    const data = serializeCfg(KeybindStore.fileModel);
    console.log('Saving keybinds to', KeybindStore.source, KeybindStore.configPath);
    console.log(data);
    if (KeybindStore.source === 'native') {
      await NativeAPI.fileSystem.promises.writeFile(KeybindStore.configPath, data, 'utf8');
    } else {
      const blob = new Blob([data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = DOM({
        tag: 'a',
        href: url,
        download: 'input_new.cfg',
        event: [
          'click',
          () => {
            a.remove();
            URL.revokeObjectURL(url);
          },
        ],
      });
      document.body.appendChild(a);
      a.click();
    }

    App.notify(Lang.text('savedKeybindings'));
    return true;
  } catch (err) {
    console.error('Failed to save keybinds:', err);
    App.error(Lang.text('errorKeybindings'));
    return false;
  }
}
