import { App } from "./app.js";
import { Lang } from "./lang.js";

export class Api {
  constructor(host, bestHost, events) {
    if (!("WebSocket" in window)) {
      throw "Отсутствует поддержка WebSocket";
    }

    if (!Array.isArray(host)) {
      throw "Необходим массив хостов";
    }

    if (!host.length) {
      throw "Не указан хост";
    }

    this.WebSocket;

    this.host = host;

    this.MAIN_HOST = this.host[bestHost];

    this.DISCONNECT_LAST_DATE_LIMIT_MS = 30000; // плюсуем неудачное соединение в указанном диапазоне времени

    this.DISCONNECT_LAST_DATE = Date.now(); // метка времени с последнего неудачного соединения

    this.DISCONNECT_TOTAL = 0; // количество неудачных соединений

    this.DISCONNECT_LIMIT = 3; // лимит неудачных соединений, чтобы перейти на другой хост (DISCONNECT_LIMIT * RECONNECT_TIME)

    this.RECONNECT_TIME = 1000; // через сколько делаем повторное соединение (1000 = 1 секунда)

    this.awaiting = new Object();

    this.events = events ? events : new Object();
  }

  async init() {
    await this.connect();
  }

  async connect(delay = 0) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        console.log(
          `Попытка соединения ${this.MAIN_HOST} (${this.DISCONNECT_TOTAL})...`
        );

        if (this.WebSocket) {
          if (this.WebSocket.readyState == 1) {
            return resolve();
          }

          await this.disconnect();
        }

        if (this.DISCONNECT_TOTAL >= this.DISCONNECT_LIMIT) {
          this.hostChange();
        }

        this.WebSocket = new WebSocket(
          `${this.MAIN_HOST}/${App.storage.data.token}`
        );

        this.WebSocket.onmessage = (event) => this.message(event.data);

        this.WebSocket.onerror = (event) => {
          console.log(`Разрыв соединения ${this.MAIN_HOST}...`, event);
          App.error(
            Lang.text("connectionLostError").replace(
              "{count}",
              this.DISCONNECT_TOTAL
            ),
            event
          );
        };

        this.WebSocket.onclose = () => {
          this.connect(this.RECONNECT_TIME);

          reject();
        };

        this.WebSocket.onopen = () => {
          this.WebSocket.onclose = () => this.connect(this.RECONNECT_TIME);

          console.log(`Успешно подключились к ${this.MAIN_HOST}...`);

          App.ShowCurrentView();

          resolve();
        };

        // this.WebSocket.onerror = reject;
      }, delay);
    });
  }

  async disconnect() {
    console.log(`Закрываем соединение ${this.MAIN_HOST}...`);
    App.error(
      Lang.text("connectionClosedError").replace(
        "{count}",
        this.DISCONNECT_TOTAL
      )
    );
    if (!this.WebSocket) {
      return;
    }

    if (
      Date.now() - this.DISCONNECT_LAST_DATE <
      this.DISCONNECT_LAST_DATE_LIMIT_MS
    ) {
      this.DISCONNECT_TOTAL++;
    }

    this.DISCONNECT_LAST_DATE = Date.now();

    return new Promise((resolve, reject) => {
      if (this.WebSocket.readyState == 3) {
        return resolve();
      }

      this.WebSocket.onclose = resolve;

      // this.WebSocket.onerror = reject;

      this.WebSocket.close();
    });
  }

  hostChange() {
    this.DISCONNECT_TOTAL = 0;

    if (this.host.length == 1) {
      return;
    }

    let currentHost = 0;
    for (let i = 0; i < this.host.length; ++i) {
      if (this.MAIN_HOST == this.host[i]) {
        currentHost = i;
        break;
      }
    }
    App.error(
      Lang.text("connectionRestoringError").replace("{host}", currentHost)
    );

    this.MAIN_HOST = this.host[(currentHost + 1) % this.host.length];
  }

  async message(body) {
    let json = JSON.parse(body);

    if (!json) {
      return;
    }

    if ("response" in json) {
      let { request, data, error } = json.response;

      if (!(request in this.awaiting)) {
        return;
      }

      if (error) {
        this.awaiting[request].reject(error);
      } else {
        this.awaiting[request].resolve(data);
      }

      delete this.awaiting[request];
    } else if ("from" in json) {
      // request

      let { action, data } = json.from;

      if ("queue" in json) {
        try {
          this.WebSocket.send(JSON.stringify({ queue: json.queue }));
        } catch (error) {
          console.log("API (queue)", error);
        }
      }

      if (action in this.events) {
        try {
          this.events[action](data);
        } catch (error) {
          console.log("API (events/action)", error);
        }
      }
    } else {
      throw Lang.text("unknownMessageStructure").replace(
        "{json}",
        JSON.stringify(json)
      );
    }
  }

  async request(object, method, data) {
    for (let key in this.awaiting) {
      if (
        this.awaiting[key].object == object &&
        this.awaiting[key].method == method
      ) {
        throw Lang.text("requestAlreadyPending")
          .replace("{method}", method)
          .replace("{object}", object);
      }
    }

    let identify = Date.now();

    try {
      await this.say(identify, object, method, data);
    } catch (error) {
      throw Lang.text("requestFailedConnectionError");
    }

    return await new Promise((resolve, reject) => {
      let rejectTimerId = setTimeout(() => {
        delete this.awaiting[identify];

        reject(
          Lang.text("requestTimeoutError")
            .replace("{object}", object)
            .replace("{method}", method)
        );
      }, 15000);

      this.awaiting[identify] = {
        object: object,
        method: method,
        resolve: (data) => {
          clearTimeout(rejectTimerId);

          resolve(data);
        },
        reject: (error) => {
          clearTimeout(rejectTimerId);

          reject(error);
        },
      };
    });
  }

  async silent(callback, object, method, data, infinity = false) {
    let identify = `${method}${Date.now()}`; // если у нас более одного silent, то они перебивают друг друга так как это не async

    try {
      await this.say(identify, object, method, data);
    } catch (error) {
      if (infinity) {
        setTimeout(
          () => this.silent(callback, object, method, data, true),
          3000
        );
      }

      return;
    }

    let timerId = setTimeout(() => {
      delete this.awaiting[identify];

      if (infinity) {
        this.silent(callback, object, method, data, true);
      }
    }, 15000);

    this.awaiting[identify] = {
      object: object,
      method: method,
      resolve: (data) => {
        clearTimeout(timerId);

        callback(data, false);
      },
      reject: (error) => {
        clearTimeout(timerId);

        callback(false, error);
      },
    };

    return;
  }

  async ghost(object, method, data) {
    try {
      await this.say(0, object, method, data);
    } catch (error) {}

    return;
  }

  async say(request, object, method, data = "", retryCount = 0) {
    if (this.WebSocket.readyState === this.WebSocket.OPEN) {
      this.WebSocket.send(
        JSON.stringify({
          token: App.storage.data.token,
          request: request,
          object: object,
          method: method,
          data: data,
          version: `${App.PW_VERSION}.${App.APP_VERSION}`,
        })
      );
    } else {
      if (retryCount < 5) {
        setTimeout(
          () => this.say(request, object, method, data, retryCount + 1),
          3000
        );
      }
    }
  }
}
