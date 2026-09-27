/**
 * HostRacer — единая точка выбора и подключения к API-хостам.
 *
 * Используется и для первого подключения (App.connectAndInit),
 * и для реаконнекта (Api.connect): все кандидаты зовутся параллельно,
 * у каждого свой таймаут, первый открытый сокет побеждает и передаётся
 * дальше ОТКРЫТЫМ (без повторного handshake). Гонка резолвится сразу
 * на первом onopen (остальные кандидаты закрываются) либо когда все
 * кандидаты завершились отказом.
 *
 * Память: localStorage['pwHosts'] = { good: { host, ts, latencyMs } } —
 * последний успешный хост идёт первым (приоритет показа/выбора).
 * Отдельных кулдаунов нет: гонка параллельная — всегда выигрывает
 * самый быстрый из живых, мёртвые просто не успевают открыться.
 */

const STORAGE_KEY = 'pwHosts';

export class HostRacer {
  /**
   * @param {string[]} hosts
   * @param {Object} opts
   * @param {Function} [opts.onState] - (phase, data): 'candidate'/'win'/'lose'
   * @param {Function} [opts.getToken] - () => token для URL (как в старой
   *        схеме `${host}/${token}`): привязка сессии при подключении.
   *        На первом подключении token может быть пустым — тогда URL без него.
   */
  constructor(hosts, { onState, getToken } = {}) {
    if (!Array.isArray(hosts) || !hosts.length) {
      throw 'HostRacer: не указан массив хостов';
    }

    this.hosts = hosts;
    this.onState = onState || (() => {});
    this.getToken = getToken || (() => '');
    this.memory = this.loadMemory();
    this.pending = null; // промис активной гонки (дедупликация)
    this.sockets = []; // сокеты текущей гонки
    this.timers = []; // таймеры текущей гонки
  }

  buildUrl(host) {
    let token = '';

    try {
      token = `${this.getToken() || ''}`.trim();
    } catch (error) {}

    return token ? `${host}/${token}` : host;
  }

  loadMemory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);

        if (parsed && parsed.good && parsed.good.host) {
          return parsed;
        }
      }
    } catch (error) {}

    return { good: null };
  }

  saveMemory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch (error) {}
  }

  lastGood() {
    const good = this.memory.good;

    return good && this.hosts.includes(good.host) ? good.host : null;
  }

  /**
   * Порядок кандидатов: last-good первым, остальные в базовом порядке.
   * Гонка параллельная — порядок влияет на показ и на выбор при равенстве.
   */
  orderedHosts() {
    const good = this.lastGood();

    if (!good) {
      return this.hosts.slice();
    }

    return [good, ...this.hosts.filter((host) => host !== good)];
  }

  recordSuccess(host, latencyMs = 0) {
    this.memory.good = { host: host, ts: Date.now(), latencyMs: latencyMs };
    this.saveMemory();
  }

  /**
   * @param {Object} opts
   * @param {number} opts.timeoutMs - таймаут на одного кандидата
   * @returns {Promise<{ok:true, host:string, socket:Object, latencyMs:number}|{ok:false, failed:string[]}>}
   *
   * Повторный вызов в рамках активной гонки возвращает тот же промис.
   */
  race({ timeoutMs = 3500 } = {}) {
    if (this.pending) {
      return this.pending;
    }

    const ordered = this.orderedHosts();
    const t0 = Date.now();
    let winner = null;
    let pendingCount = ordered.length;
    let settled = false;
    const failures = [];

    this.sockets = [];
    this.timers = [];

    const racePromise = new Promise((resolve) => {
      const finish = (win) => {
        if (settled) {
          return;
        }

        settled = true;

        for (let timer of this.timers) {
          clearTimeout(timer);
        }

        // Закрываем всех, кроме победителя
        for (let socket of this.sockets) {
          if (socket === win?.socket) {
            continue;
          }

          try {
            socket.close();
          } catch (error) {}
        }

        if (win) {
          this.recordSuccess(win.host, win.latencyMs);
          this.onState('win', { host: win.host, latencyMs: win.latencyMs });
          resolve({ ok: true, host: win.host, socket: win.socket, latencyMs: win.latencyMs });
        } else {
          this.onState('lose', { failed: failures.slice() });
          resolve({ ok: false, failed: failures.slice() });
        }
      };

      const attempts = ordered.map((host) => {
        let socket;

        try {
          socket = new WebSocket(this.buildUrl(host));
        } catch (error) {
          return Promise.resolve().then(() => {
            failures.push(host);
            pendingCount--;

            if (pendingCount === 0) {
              finish(null);
            }
          });
        }

        this.sockets.push(socket);
        this.onState('candidate', { host: host, t0: t0 });

        let candidateSettled = false;
        let resolveCandidate;
        const candidate = new Promise((resolve) => {
          resolveCandidate = resolve;
        });

        const settle = (ok) => {
          if (candidateSettled) {
            return;
          }

          candidateSettled = true;
          clearTimeout(timer);

          if (ok && !winner) {
            winner = { host: host, socket: socket, latencyMs: Date.now() - t0 };
          } else if (!ok) {
            failures.push(host);
          }

          pendingCount--;

          if (winner || pendingCount === 0) {
            finish(winner);
          }

          resolveCandidate({ host: host, ok: ok });
        };

        const timer = setTimeout(() => {
          settle(false);

          try {
            socket.close();
          } catch (error) {}
        }, timeoutMs);

        this.timers.push(timer);

        socket.onopen = () => settle(true);
        socket.onclose = () => settle(false);
        socket.onerror = () => {}; // onclose последует

        return candidate;
      });

      // Страховка: если все кандидаты завершены, а finish не сработал
      Promise.all(attempts).then(() => {
        if (pendingCount > 0) {
          pendingCount = 0;
          finish(winner);
        }
      });
    }).finally(() => {
      this.pending = null;
      this.sockets = [];
    });

    this.pending = racePromise;

    return racePromise;
  }
}
