import { App } from "./app.js";
import { NativeAPI } from "./nativeApi.js";
import { Settings } from "./settings.js";

export class PWGame {
  static PATH = "../Game/Bin/PW_Game.exe";

  static WORKING_DIR_PATH = "../Game/Bin/";

  static LUTRIS_EXEC = "lutris lutris:rungame/prime-world";

  static PATH_UPDATE = "../Tools/PW_NanoUpdater.exe";

  static PATH_UPDATE_LINUX = "../update.sh";

  static PATH_TEST_HASHES = "./content/PW_HashTest.exe";

  static gameServerHasConnection = false;

  static mainServerHasConnection = false;

  static radminHasConnection = false;

  static proxyHasConnection = false;

  static gameConnectionTestIsActive = false;

  static isUpToDate = false;

  static isValidated = false;

  static isUpdateFailed = false;

  static isTestHashesFailed = false;

  static gameServerConnectionCheckTimeout = 1000 * 60 * 100; // 100 minutes

  static currentPlayPwProtocol =
    "pwclassic://runGame/Tester00Tester00Tester00Tester004c8fa55b5ee54d6ddbaab2373f8a6a74d7f9c5d739bdd79da12f3beda73c7115/2.0.0/0";

  static protocolServer;

  static async openProtocolSocket() {
    try {
      const http = NativeAPI.http;

      if (PWGame.protocolServer) {
        PWGame.protocolServer.close(() => {});
      }

      PWGame.protocolServer = http.createServer((req, res) => {
        if (req.url === "/getConnectionData" && req.method === "POST") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(JSON.stringify({ protocol: PWGame.currentPlayPwProtocol }));

          //PWGame.protocolServer.close(() => {});
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
        }
      });

      PWGame.protocolServer.listen(34980, "127.0.0.1", () => {});
    } catch (e) {
      App.error(e, 30000);
    }
  }

  static GetPlayPwProtocol(id) {
    let chosenServer = PWGame.mainServerHasConnection ? 0 : 2;
    if (Settings.settings.radminPriority && PWGame.radminHasConnection) {
      chosenServer = 1;
    }
    return `pwclassic://runGame/${id}/${App.PW_VERSION}/${chosenServer}`;
  }

  static async start(id, callback) {
    await PWGame.check();

    PWGame.currentPlayPwProtocol = PWGame.GetPlayPwProtocol(id);

    PWGame.openProtocolSocket();

    if (NativeAPI.platform == "linux") {
      let spawn = await NativeAPI.childProcess.exec(PWGame.LUTRIS_EXEC);
      spawn.on("close", async (code) => {
        callback();
      });
    } else {
      await NativeAPI.exec(
        PWGame.PATH,
        PWGame.WORKING_DIR_PATH,
        ["protocol", PWGame.currentPlayPwProtocol],
        callback
      );
    }
  }

  static async reconnect(id, callback) {
    this.start(id, callback);
  }

  static async check() {
    if (!NativeAPI.status) {
      //throw 'Необходима Windows версия лаунчера';
    }

    await NativeAPI.fileSystem.promises.access(PWGame.PATH);
  }

  static async checkUpdates() {
    if (PWGame.isUpdateFailed) {
      throw "Не удалось обновить игру! Обратитесь в поддержку PWClassic";
    }
    if (PWGame.isTestHashesFailed) {
      throw "Файлы игры повреждены! Обратитесь в поддержку PWClassic";
    }
    if (!PWGame.isUpToDate) {
      //throw 'Проверка обновления не завершена! Подождите';
    }
    if (!PWGame.isValidated) {
      //throw 'Проверка файлов не завершена! Подождите';
    }
  }

  static gameServerIps = [
    "http://81.88.210.30:27302/api",
    "http://26.133.141.83:27302/api", // test connection to Radmin IP
    "http://46.32.186.159:27302/api",
  ];
  static MAIN_GAME_SERVER_IP = 0;
  static RADMIN_GAME_SERVER_IP = 1;
  static PROXY_GAME_SERVER_IP = 2;

  static async testServerConnection(serverIp) {
    const data = {
      method: "checkConnection",
    };
    try {
      let response = await fetch(serverIp, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      return true;
    } catch (e) {
      // No connection
    }
    return false;
  }

  static async testGameServerConnection() {
    if (PWGame.gameServerHasConnection) {
      return;
    }

    for (let ip of PWGame.gameServerIps) {
      if (PWGame.testServerConnection(ip)) {
        PWGame.gameServerHasConnection = true;

        setTimeout((_) => {
          PWGame.gameServerHasConnection = false;
        }, PWGame.gameServerConnectionCheckTimeout);

        break;
      }
    }
    if (!PWGame.gameServerHasConnection) {
      throw "Игровой сервер недоступен!";
    }
  }
}
