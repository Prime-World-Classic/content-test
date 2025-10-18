import { App } from './app.js';
import { Voice } from './voice.js';
import { PWGame } from './pwgame.js';
import { Settings } from './settings.js';

export class NativeAPI {

    static status = false;

    static platform;

    static title;
    static updated = false;
    static curLabel;
    static lastBranchV = null;

    static modules = {

        fileSystem: 'fs',
        childProcess: 'child_process',
        os: 'os',
        path: 'path',
        crypto: 'crypto',
        net: 'net',
        http: 'http'

    };

    static setDefaultWindow() {

        NativeAPI.window.width = 1280;

        NativeAPI.window.height = 720;

        NativeAPI.window.setMinimumSize(1280, 720);

        NativeAPI.window.setResizable(true);

        NativeAPI.window.setPosition('center');

        NativeAPI.window.enterFullscreen();

    }

    static init() {

        try {

            if (!nw) {

                return;

            }

        }
        catch (e) {

            return;

        }

        NativeAPI.status = true;

        NativeAPI.window = nw.Window.get();

        NativeAPI.setDefaultWindow();

        NativeAPI.app = nw.App;

        NativeAPI.altEnterShortcut = new nw.Shortcut({
            key: 'Alt+Enter', active: () => {
                Settings.settings.fullscreen = !Settings.settings.fullscreen;
                Settings.ApplySettings();
            }
        });

        NativeAPI.app.registerGlobalHotKey(NativeAPI.altEnterShortcut);

        NativeAPI.voiceShortcut = new nw.Shortcut({
            key: 'Ctrl+Z', active: () => {

                Voice.toggleEnabledMic();

            },
            failed: (error) => {

                console.log(error);

            }
        });

        NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceShortcut);

        NativeAPI.voiceDestroyShortcut = new nw.Shortcut({
            key: 'Ctrl+K', active: () => {

                Voice.destroy();

            },
            failed: (error) => {

                console.log(error);

            }
        });

        NativeAPI.app.registerGlobalHotKey(NativeAPI.voiceDestroyShortcut);

        NativeAPI.loadModules();

        NativeAPI.platform = NativeAPI.os.platform();

        window.addEventListener('error', (event) => NativeAPI.write('error.txt', event.error.toString()));

        window.addEventListener('unhandledrejection', (event) => NativeAPI.write('unhandledrejection.txt', event.reason.stack));

    }

    static loadModules() {

        for (let module in NativeAPI.modules) {

            NativeAPI[module] = require(NativeAPI.modules[module]);

        }

    }

    static async exec(exeFile, workingDir, args, callback, cwd = process.cwd()) {

        return new Promise((resolve, reject) => {

            if (!NativeAPI.status) {

                reject();

            }

            let workingDirPath = NativeAPI.path.join(cwd, workingDir);
            let executablePath = NativeAPI.path.join(cwd, exeFile);
            NativeAPI.childProcess.execFile(executablePath, args, { cwd: workingDirPath }, (error, stdout, stderr) => {

                if (error) {

                    reject(error);

                }

                resolve(stdout);

                if (callback) {

                    callback();

                }

            });

        });

    }

    static reset() {

        if (!NativeAPI.status) {

            return;

        }

        NativeAPI.app.clearCache();

        NativeAPI.window.reload();

    }

    static progress(value = 0.0) {

        if (!NativeAPI.status) {

            return;

        }

        NativeAPI.window.setProgressBar(value);

    }

    static attention() {

        if (!NativeAPI.status) {

            return;

        }

        NativeAPI.window.focus();

        NativeAPI.window.requestAttention(true);

    }

    static exit() {

        if (!NativeAPI.status) {

            return false;

        }

        NativeAPI.app.quit();

        return true;

    }

    static testHashes() {
        if (NativeAPI.platform == 'linux') {
            PWGame.isValidated = true;
            return; // No hash check for linux
        }
        NativeAPI.fileSystem.promises.access(PWGame.PATH_TEST_HASHES);

        let spawn = NativeAPI.childProcess.spawn(PWGame.PATH_TEST_HASHES);

        spawn.on('close', (code) => {
            if ((code == 0)) {
                PWGame.isValidated = true;
                App.notify('Проверка обновлений и файлов игры завершена');
            } else {
                PWGame.isTestHashesFailed = true;
                App.error('Проверка файлов не выполнена: ' + code);
            }
        });
    }

    static updateLinux(data, callback) {
        let outputs = data.toString().split('\n');  // I have used space, you can use any thing.
        for (let o of outputs) {
            if (o == 'Updating game files') {
                this.title = 'Обновление игры';
                this.curLabel = 'game';
                continue;
            }
            if (o == 'Updating launcher') {
                this.title = 'Обновление лаунчера';
                this.curLabel = 'content';
                continue;
            }

            if (o.startsWith('* main')) {
                if (this.lastBranchV == null) {
                    this.lastBranchV = o;
                } else {
                    this.updated = this.lastBranchV != o;
                }
            }

            if (o.startsWith('Receiving objects:')) {
                let percent = parseInt(o.substring(19, o.indexOf('%')));

                callback({ update: true, title: this.title, total: percent });

                NativeAPI.progress(percent / 100);
            }
        }

    }

    static updateWindows(data, callback) {

        let progressDataElements = data.toString().substring(1).split('#');

        for (let progressDataElement of progressDataElements) {

            let json = JSON.parse(progressDataElement);

            if (json.type) {

                if (json.type == 'bar') {

                    if (this.curLabel == 'content') {
                        this.updated = true;
                    }

                    callback({ update: true, title: this.title, total: Number(json.data) });

                    NativeAPI.progress(Number(json.data) / 100);

                }
                else if (json.type == 'label') {

                    switch (json.data) {

                        case 'game': this.title = 'Обновление игры'; this.curLabel = json.data; break;

                        case 'content': this.title = 'Обновление лаунчера'; this.curLabel = json.data; break;

                        case 'game_data0': this.title = 'Загрузка игровых архивов 1/8'; this.curLabel = json.data; break;
                        case 'game_data1': this.title = 'Загрузка игровых архивов 2/8'; this.curLabel = json.data; break;
                        case 'game_data2': this.title = 'Загрузка игровых архивов 3/8'; this.curLabel = json.data; break;
                        case 'game_data3': this.title = 'Загрузка игровых архивов 4/8'; this.curLabel = json.data; break;
                        case 'game_data4': this.title = 'Загрузка игровых архивов 5/8'; this.curLabel = json.data; break;
                        case 'game_data5': this.title = 'Загрузка игровых архивов 6/8'; this.curLabel = json.data; break;
                        case 'game_data6': this.title = 'Загрузка игровых архивов 7/8'; this.curLabel = json.data; break;
                        case 'game_data7': this.title = 'Загрузка игровых архивов 8/8'; this.curLabel = json.data; break;

                        default: this.title = 'Загрузка игровых архивов'; this.curLabel = json.data; break;

                    }

                }

            }

        }

    }

    static async update(callback) {

        if (!NativeAPI.status) {

            return false;

        }

        const isLinuxUpdate = NativeAPI.platform == 'linux';

        const updaterPath = isLinuxUpdate ? PWGame.PATH_UPDATE_LINUX : PWGame.PATH_UPDATE;

        await NativeAPI.fileSystem.promises.access(updaterPath);

        let spawn = NativeAPI.childProcess.spawn(updaterPath);

        App.notify('Проверка обновлений и файлов игры... Подождите');

        spawn.stdout.on('data', (data) => {
            if (isLinuxUpdate) {
                this.updateLinux(data, callback)
            } else {
                this.updateWindows(data, callback)
            }
        });

        spawn.on('close', async (code) => {

            callback({ update: false, title: '', total: 0 });

            NativeAPI.progress(-1);

            if ((code == 0 || code == null)) {
                PWGame.isUpToDate = true;
                try {
                    NativeAPI.testHashes();
                }
                catch (e) {
                    App.error('Неисправна проверка файлов: ' + e);
                }
            } else {
                PWGame.isUpdateFailed = true;
                App.error('Ошибка обновления: ' + code);

            }

            if (this.updated) {
                NativeAPI.reset();
            }

        });

    }

    static analysis() {

        if (!NativeAPI.status) {

            return false;

        }

        let username = '', cpus = NativeAPI.os.cpus();

        try {

            let userInfo = NativeAPI.os.userInfo();

            username = userInfo.username;

        }
        catch (error) {



        }

        return {

            hostname: NativeAPI.os.hostname(),
            core: { model: (cpus.length ? cpus[0].model : ''), total: cpus.length },
            memory: Math.round((NativeAPI.os.totalmem() / 1024) / 1024),
            version: NativeAPI.os.version(),
            release: NativeAPI.os.release(),
            username: username

        };

    }

    static getMACAdress() {

        let result = new Array();

        if (!NativeAPI.status) {

            return result;

        }

        try {

            let networkInterfaces = NativeAPI.os.networkInterfaces();

            for (let key in networkInterfaces) {

                if (['Radmin VPN'].includes(`${key}`)) {

                    continue;

                }

                for (let networkInterface of networkInterfaces[key]) {

                    if (networkInterface.internal) {

                        continue;

                    }

                    if (!('mac' in networkInterface) || (!networkInterface.mac) || (networkInterface.mac == '00:00:00:00:00:00')) {

                        continue;

                    }

                    if (!result.includes(`${networkInterface.mac}`)) {

                        result.push(`${networkInterface.mac}`);

                    }

                }

            }


        }
        catch (error) {

            console.log(error);

        }

        return result;

    }

    static getLocale() {

        let result = '';

        if (!NativeAPI.status) {

            return result;

        }

        try {

            result = Intl.DateTimeFormat().resolvedOptions().locale;

        }
        catch (error) {



        }

        return result;

    }

    static async ping(hostname, port = 80, timeout = 3000) {

        return new Promise((resolve) => {

            const start = performance.now();

            const socket = NativeAPI.net.createConnection(port, hostname);

            socket.setTimeout(timeout);

            socket.on('connect', () => {

                const end = performance.now();

                socket.end();

                resolve(end - start);

            });

            function handleError() {

                socket.destroy();

                resolve(-1);

            }

            socket.on('timeout', handleError);

            socket.on('error', handleError);

        });

    }

    static async write(file, body, append = false) {
        if (append) {
            await NativeAPI.fileSystem.promises.appendFile(file, body);
        } else {
            await NativeAPI.fileSystem.promises.writeFile(file, body);
        }

    }

    static linkHandler(evt) {
        if (NativeAPI.status) {
            evt.preventDefault();
            let url = evt.target.href;
            if (evt.currentTarget.href) {
                url = evt.currentTarget.href;
            }
            App.OpenExternalLink(url);
        }
    }

}