import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';

export class PWGame {
  static PATH = '../Game/Bin/PW_Game.exe';

  static WORKING_DIR_PATH = '../Game/Bin/';

  static LUTRIS_EXEC = 'lutris lutris:rungame/prime-world';

  static PATH_UPDATE = '../Tools/PW_NanoUpdater.exe';

  static PATH_UPDATE_LINUX = '../update.sh';

  static PATH_TEST_HASHES = './content/PW_HashTest.exe';
  
  static PATH_LUA_BRIDGE = '../Game/Bin/bridge';

  static gameConnectionTestIsActive = false;

  static isUpToDate = false;

  static isValidated = false;

  static isUpdateFailed = false;

  static isTestHashesFailed = false;

  // Протокол текущего запуска. Формируется в start() из токена сессии бэкенда;
  // до запуска игры протокола нет (дебажной сессии с фиксированным токеном больше нет).
  static currentPlayPwProtocol = '';

  static protocolServer;

  static async openProtocolSocket() {
    try {
      const http = NativeAPI.http;

      if (PWGame.protocolServer) {
        PWGame.protocolServer.close(() => {});
      }

      PWGame.protocolServer = http.createServer((req, res) => {
        if (req.url === '/getConnectionData' && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(JSON.stringify({ protocol: PWGame.currentPlayPwProtocol }));

          //PWGame.protocolServer.close(() => {});
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });

      PWGame.protocolServer.listen(34980, '127.0.0.1', () => {});
    } catch (e) {
      App.error(e, 30000);
    }
  }

  static GetPlayPwProtocol(id, ips, port) {
    // 5th token is the legacy mirror index. Mirror selection is gone: the
    // pool block is pre-sorted by the launcher (fastest reachable first),
    // so the client always starts from index 0.
    let protocol = `pwclassic://runGame/${id}/${App.PW_VERSION}/0`;
    if (ips) {
      protocol = `${protocol}/${ips}`;
      // Base port of the target server (6th token). Without it the client
      // falls back to its standard ports (server_ip.h).
      if (port) {
        protocol = `${protocol}/${port}`;
      }
    }
    return protocol;
  }

  // UDP login port of the game server (newlogin): the health-check probe
  // sends an RDP INIT here and waits for INIT_ACK/REFUSED.
  static GAME_SERVER_LOGIN_PORT = 27301;

  static decodeIps(hex) {
    if (!hex || typeof hex !== 'string' || hex.length % 8 !== 0) {
      return [];
    }

    let ips = [];

    for (let i = 0; i < hex.length; i += 8) {
      let octets = [];
      for (let j = 0; j < 4; ++j) {
        let octet = parseInt(hex.substr(i + j * 2, 2), 16);
        if (Number.isNaN(octet)) {
          return [];
        }
        octets.push(octet);
      }
      ips.push(octets.join('.'));
    }

    return ips;
  }

  static encodeIps(ips) {
    return ips
      .map((ip) => ip.split('.').map((o) => Number(o).toString(16).padStart(2, '0'))
      .join(''))
      .join('');
  }

  // UDP health probe of the game server: 8-byte RDP INIT to the newlogin
  // login port; INIT_ACK(1) or REFUSED(3) in the answer means the login
  // path (the one the client uses) is alive. Replaces the old HTTP
  // `checkConnection` check to the synchronizer (port 27302).
  // Resolves the response time in ms (fractional, performance.now);
  // null on timeout / ICMP port-unreachable / any other answer.
  static udpGameProbe(ip, port, timeoutMs = 2000) {
    return new Promise((resolve) => {
      const dgram = NativeAPI.dgram;
      if (!dgram) {
        resolve(null);
        return;
      }
      let socket;
      try {
        socket = dgram.createSocket('udp4');
      } catch (e) {
        resolve(null);
        return;
      }
      let done = false;
      const finish = (rtt) => {
        if (done) {
          return;
        }
        done = true;
        clearTimeout(timer);
        try {
          socket.close();
        } catch (e) {}
        resolve(rtt);
      };
      // 8-byte RDP INIT: type=0, seqIdx=0, pad=0, srcMux=32768 (ephemeral), destMux=10 (login)
      const pkt = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x0A, 0x00]);
      const timer = setTimeout(() => finish(null), timeoutMs);
      socket.once('message', (msg) => {
        if (msg.length >= 1 && (msg[0] === 1 || msg[0] === 3)) {
          finish(performance.now() - t0);
        } else {
          finish(null);
        }
      });
      socket.once('error', () => finish(null)); // ICMP port-unreachable -> fast fail
      const t0 = performance.now();
      socket.send(pkt, port, ip);
    });
  }

  // Orders the pool block for the client: reachable IPs first, sorted by
  // response time (fastest first); unreachable ones appended at the end in
  // their original order. The launcher never drops an address from the
  // block — a false-negative probe (or a broken local UDP path) must not
  // prevent the client from walking the pool itself; a total failure shows
  // up as an in-game error.
  static async orderServerIps(ipsHex, port) {
    let ips = PWGame.decodeIps(ipsHex);
    if (!ips.length) {
      return '';
    }

    // The login port of the pool is the target base port + 1 (all pool
    // servers run the same offsets); without a port — the legacy 27301.
    let loginPort = port ? port + 1 : PWGame.GAME_SERVER_LOGIN_PORT;
    let rtts = await Promise.all(ips.map((ip) => PWGame.udpGameProbe(ip, loginPort)));
    let reachable = [];
    let unreachable = [];
    for (let i = 0; i < ips.length; ++i) {
      if (typeof rtts[i] === 'number') {
        reachable.push({ ip: ips[i], rtt: rtts[i] });
      } else {
        unreachable.push(ips[i]);
      }
    }
    reachable.sort((a, b) => a.rtt - b.rtt);

    return PWGame.encodeIps(reachable.map((r) => r.ip).concat(unreachable));
  }

  static async start(id, callback, ips, port) {
    await PWGame.check();

    if (ips) {
      // The whole block always goes to the client, reordered by the probes:
      // fastest reachable first, unreachable at the end.
      ips = await PWGame.orderServerIps(ips, port);
    }

    PWGame.currentPlayPwProtocol = PWGame.GetPlayPwProtocol(id, ips, port);

    PWGame.openProtocolSocket();

    if (NativeAPI.platform == 'linux') {
      let spawn = await NativeAPI.childProcess.exec(PWGame.LUTRIS_EXEC);
      spawn.on('close', async (code) => {
        callback();
      });
    } else {
      await NativeAPI.exec(PWGame.PATH, PWGame.WORKING_DIR_PATH, ['protocol', PWGame.currentPlayPwProtocol], callback);
    }
  }

  static async reconnect(id, callback, ips, port) {
    this.start(id, callback, ips, port);
  }

  static async check() {
    if (!NativeAPI.status) {
      //throw 'Необходима Windows версия лаунчера';
    }

    await NativeAPI.fileSystem.promises.access(PWGame.PATH);
  }

  static async checkUpdates() {
    if (PWGame.isUpdateFailed) {
      throw 'Не удалось обновить игру! Обратитесь в поддержку PWClassic';
    }
    if (PWGame.isTestHashesFailed) {
      throw 'Файлы игры повреждены! Обратитесь в поддержку PWClassic';
    }
    if (!PWGame.isUpToDate) {
      //throw 'Проверка обновления не завершена! Подождите';
    }
    if (!PWGame.isValidated) {
      //throw 'Проверка файлов не завершена! Подождите';
    }
  }

}
