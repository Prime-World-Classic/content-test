import { DOM } from '../dom.js';
import { KeybindStore } from './keybindings.store.js';
import { serializeCfg, parseKeybindCfg } from './keybindings.parser.js';
import { NativeAPI } from '../nativeApi.js';

export async function findConfigFile() {
  if (NativeAPI?.status) {
    console.log('NativeAPI.fileSystem.promises:', NativeAPI.fileSystem.promises);
    console.log('NativeAPI.path:', NativeAPI.path);
    console.log('Searching for native config file...');
    const basePaths = [
      NativeAPI.path.join(NativeAPI.os.homedir(), 'Documents'),
      NativeAPI.path.join(NativeAPI.os.homedir(), 'OneDrive', 'Documents'),
    ];

    const paths = basePaths.map((base) => NativeAPI.path.join(base, 'My Games', 'Prime World Classic', 'input_new.cfg'));

    for (const p of paths) {
      try {
        await NativeAPI.fileSystem.promises.access(p);
        return { type: 'native', path: p };
      } catch {
        // File does not exist
        console.log('Config file not found at', p);
      }
    }

    const targetPath = paths[0];
    const targetDir = NativeAPI.path.dirname(targetPath);

    try {
      console.log('Creating default config file at', targetPath);
           console.log('process:', typeof process);
console.log('require:', typeof require);

      await NativeAPI.fileSystem.promises.mkdir(targetDir, { recursive: true });

      const r = await fetch('/content/keybindsFallback.cfg', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.text();
        await NativeAPI.fileSystem.promises.writeFile(targetPath, data, {
          encoding: 'utf8',
          flag: 'wx',
        });
        console.log('Default config file created at', targetPath);
        return { type: 'native', path: targetPath };
      }
    } catch (e) {
      if (e.code === 'EEXIST') {
        return { type: 'native', path: targetPath };
      }
      console.error('Failed to create default config file:', e);
    }
  }

  try {
    const r = await fetch('/content/keybindsFallback.cfg', { cache: 'no-store' });
    if (r.ok) {
      return { type: 'browser', path: '/content/keybindsFallback.cfg' };
    }
  } catch {}

  return null;
}

export async function loadKeybinds() {
  const cfg = await findConfigFile();
  if (!cfg) return false;

  let data;

  if (cfg.type === 'native') {
    data = await NativeAPI.fileSystem.promises.readFile(cfg.path, 'utf8');
  } else {
    data = await fetch(cfg.path).then((r) => r.text());
  }

  const binds = parseKeybindCfg(data);

  KeybindStore.fileModel = binds;
  KeybindStore.uiModel = KeybindStore.mapFileToUiModel(binds);

  console.log(KeybindStore.uiModel);

  // KeybindStore.setAll(binds);
  KeybindStore.source = cfg.type;
  console.log('Keybinds loaded from', cfg.type, cfg.path);
  KeybindStore.configPath = cfg.path;

  return true;
}

export async function saveKeybinds() {
  const data = serializeCfg(KeybindStore.fileModel);
  console.log('Saving keybinds:', data);

  if (KeybindStore.source === 'native') {
    await NativeAPI.fileSystem.promises.writeFile(KeybindStore.configPath, data);
  } else {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'input_new.cfg',
      types: [{ description: 'Config', accept: { 'text/plain': ['.cfg'] } }],
    });

    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  }
}
