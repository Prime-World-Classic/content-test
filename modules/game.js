import { DOM } from './dom.js';
import { App } from './app.js';

export class Game {
  static sizeX = 10;

  static sizeY = 15;

  static target = false;

  static targetAnimate = false;

  static blocked = false;

  static eventBack = false;

  static eventFinish = false;

  static eventExit = false;

  static init(body, object, isSplah) {
    if (object) {
      if ('back' in object) {
        Game.eventBack = object.back;
      }

      if ('finish' in object) {
        Game.eventFinish = object.finish;
      }

      if ('exit' in object) {
        Game.eventExit = object.exit;
      }
    }

    Game.units = new Array();

    Game.info = DOM({
      style: 'game-info',
      event: ['click', (e) => Game.click(e)],
    });

    Game.scoring = DOM({
      style: 'game-scoring',
      event: ['click', (e) => Game.click(e)],
    });

    Game.field = DOM({
      style: 'game-field',
      event: ['click', (e) => Game.click(e)],
    });

    Game.fieldScoringContainer = DOM(
      {
        style: 'game-field-scoring-container',
        event: ['click', (e) => Game.click(e)],
      },
      Game.scoring,
      Game.field,
    );

    Game.viewScore = DOM({ style: 'game-view-score' });

    Game.viewInfo = DOM({ style: 'game-view-info' });

    Game.viewMoves = DOM();

    Game.viewTotalScore = DOM();

    Game.map = object.map;

    Game.background = object.background;

    Game.units = object.unit;

    Game.rarity = object.rarity;

    Game.moves = object.move;

    Game.dataScore = new Object();

    Game.totalScore = 0;

    if ('score' in object) {
      for (let id in object.score) {
        Game.score(id, object.score[id]);
      }
    }

    Game.viewMoves.innerText = `Ходы: ${object.move} (${object.moveTotal})`;

    Game.viewTotalScore.innerText = `Оcколки: ${Game.totalScore} | `;

    if (!isSplah) {
      Game.viewInfo.append(DOM({ event: ['click', () => Game.eventBack()] }, 'Вернуться назад'), DOM({}, ` | `));
    }

    Game.viewInfo.append(
      Game.viewTotalScore,
      Game.viewMoves,
      DOM({}, ` | `),
      DOM({ event: ['click', () => Game.eventFinish()] }, 'Завершить игру'),
    );

    Game.scoring.append(Game.viewScore);
    Game.info.append(Game.viewInfo);

    if (body) {
      body.append(Game.info, Game.fieldScoringContainer);
    } else {
      document.body.append(Game.info, Game.field);
    }

    Game.view();
  }

  static score(id, number) {
    if (!id || id == '0') {
      return;
    }

    if (!(id in Game.dataScore)) {
      let unit = DOM({
        style: [`rarity${Game.rarity[id]}`, 'game-rarity-general'],
      });
      let text = DOM({ style: 'game-text' });

      unit.style.backgroundImage = `url(content/talents/${id}.webp)`;

      unit.append(text);

      Game.dataScore[id] = unit;

      Game.viewScore.append(unit);
    }

    Game.totalScore += number;

    Game.viewTotalScore.innerText = `Оcколки: ${Game.totalScore} | `;

    Game.dataScore[id].firstChild.innerText = Number(Game.dataScore[id].innerText) + number;

    Game.dataScore[id].animate({ transform: ['scale(1)', 'scale(1.5)', 'scale(1)'] }, { duration: 250, fill: 'both', easing: 'ease-out' });
  }

  static position(coordinate) {
    return coordinate ? `${coordinate * 100}cqh` : '0';
  }

  static createUnit(id, x, y) {
    let unit = DOM({ style: 'game-unit-item', id: `${x}:${y}` });

    let rarity = '';

    switch (Game.rarity[id]) {
      case 2:
        rarity = '0 0 20cqh rgba(174,80,251,0.8), inset 10cqh 10cqh 15cqh rgba(174,80,251,0.5)';
        break;

      case 3:
        rarity = '0 0 20cqh rgba(255,156,32,0.8), inset 10cqh 10cqh 15cqh rgba(255,156,32,0.5)';
        break;

      case 4:
        rarity = '0 0 20cqh rgba(255,26,26,0.8), inset 10cqh 10cqh 15cqh rgba(255,26,26,0.5)';
        break;
    }

    if (rarity) {
      unit.style.boxShadow = rarity;
    }

    unit.style.backgroundImage = `url(content/talents/${id}.webp)`;

    unit.style.top = `${Game.position(x)}`;

    unit.style.left = `${Game.position(y)}`;

    Game.field.append(DOM({ style: 'unit-container', event: ['click', (e) => Game.click(e)] }, unit));

    return unit;
  }

  static createBackgroundUnit(x, y) {
    let unit = DOM({ style: 'game-unit-bg', id: `${x}:${y}` });

    unit.id = `BG:${x}:${y}`;

    unit.style.backgroundImage = `url(content/talents/763.webp)`;

    unit.style.top = `${Game.position(x)}`;

    unit.style.left = `${Game.position(y)}`;

    Game.field.append(DOM({ style: 'unit-container', event: ['click', (e) => Game.click(e)] }, unit));

    return unit;
  }

  static shuffle(arr) {
    let j, temp;

    for (let i = arr.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));

      temp = arr[j];

      arr[j] = arr[i];

      arr[i] = temp;
    }

    return arr;
  }

  static getRandomInt(min, max) {
    min = Math.ceil(min);

    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static view() {
    Game.blocked = true;

    let units = new Array(),
      background = new Array();

    for (let x = 0; x < Game.sizeX; x++) {
      for (let y = 0; y < Game.sizeY; y++) {
        if (Game.background[x][y]) {
          background.push({
            x: x,
            y: y,
            body: Game.createBackgroundUnit(x, y),
          });
        }

        units.push(Game.createUnit(Game.map[x][y], x, y));
      }
    }

    units = Game.shuffle(units);

    let delay = 0,
      number = 0;

    for (let unit of units) {
      number++;

      let topOffset = `${unit.offsetTop + Game.getRandomInt(-50, 50)}cqh`;

      let leftOffset = `${unit.offsetLeft + Game.getRandomInt(-50, 50)}cqh`;

      let animate = unit.animate(
        {
          top: [topOffset, unit.style.top],
          left: [leftOffset, unit.style.left],
          opacity: [0, 1],
          transform: ['scale(2.5)', 'scale(0.9)'],
        },
        { delay: delay, duration: 250, fill: 'both', easing: 'ease-out' },
      );

      delay += 5;

      if (number == units.length) {
        animate.onfinish = () => {
          for (let item of background) {
            let state = Game.background[item.x][item.y];

            switch (state) {
              case 1:
                state = 0.9;
                break;

              case 2:
                state = 0.6;
                break;

              case 3:
                state = 0.3;
                break;
            }

            item.body.animate(
              {
                opacity: [0, state],
                transform: ['scale(0.3)', 'scale(1)', 'scale(0.9)'],
              },
              { duration: 500, fill: 'both', easing: 'ease-in' },
            );
          }

          Game.blocked = false;

          animate.onfinish = null;
        };
      }
    }
  }

  static async click(event) {
    if (Game.blocked) {
      return;
    }

    if (!event.target.id) {
      return;
    }

    let data = event.target.id.split(':');

    if (!Game.map[data[0]][data[1]]) {
      return;
    }

    if (Game.target) {
      if (Game.target.id == event.target.id) {
        Game.target = false;

        Game.targetAnimate.cancel();

        return;
      }

      Game.targetAnimate.cancel();

      try {
        await Game.move(Game.target, event.target);
      } catch (e) {
        console.log(e);
        return Game.exit();
      }

      Game.target = false;
    } else {
      Game.target = event.target;

      Game.targetAnimate = Game.target.animate(
        { transform: ['scale(0.9)', 'scale(1.1)', 'scale(0.9)'] },
        { duration: 500, iterations: Infinity },
      );
    }
  }

  static async move(element1, element2) {
    Game.blocked = true;

    let data1 = element1.id.split(':'),
      data2 = element2.id.split(':');

    let protect = false;

    if (
      (Number(data1[0]) - 1 == data2[0] && data1[1] == data2[1]) ||
      (Number(data1[0]) + 1 == data2[0] && data1[1] == data2[1]) ||
      (Number(data1[1]) - 1 == data2[1] && data1[0] == data2[0]) ||
      (Number(data1[1]) + 1 == data2[1] && data1[0] == data2[0])
    ) {
      protect = true;
    }

    if (!protect) {
      Game.blocked = false;

      return;
    }

    let request = await App.api.request('gamev2', 'move2', {
      x1: data1[0],
      y1: data1[1],
      x2: data2[0],
      y2: data2[1],
    });

    if (request.render.length) {
      element1.id = `${data2[0]}:${data2[1]}`;

      element2.id = `${data1[0]}:${data1[1]}`;

      Game.moves++;

      Game.viewMoves.innerText = `Ходов: ${request.move} (${request.moveTotal})`;
    }

    let element1Animate = element1.animate(
      {
        top: [`${Game.position(data1[0])}`, `${Game.position(data2[0])}`],
        left: [`${Game.position(data1[1])}`, `${Game.position(data2[1])}`],
      },
      { duration: 250, fill: 'both' },
    );

    let element2Animate = element2.animate(
      {
        top: [`${Game.position(data2[0])}`, `${Game.position(data1[0])}`],
        left: [`${Game.position(data2[1])}`, `${Game.position(data1[1])}`],
      },
      { duration: 250, fill: 'both' },
    );

    element1Animate.onfinish = async () => {
      if (request.render.length) {
        for (let item of request.render) {
          switch (item.action) {
            case 'hide':
              await Game.hideAnimate(item.data);

              await Game.backgroundAnimate(item.data);

              break;

            case 'move':
              await Game.moveAnimate(item.data);
              break;

            case 'add':
              await Game.dropAnimate(item.data);
              break;
          }
        }

        if (request.move != request.moveTotal) {
          Game.blocked = false;
        }
      } else {
        element1Animate.reverse();

        if (request.move != request.moveTotal) {
          Game.blocked = false;
        }
      }

      element1Animate.onfinish = null;
    };

    element2Animate.onfinish = () => {
      if (!request.render.length) {
        element2Animate.reverse();
      }

      element2Animate.onfinish = null;
    };
  }

  static async hideAnimate(data) {
    return new Promise((resolve, reject) => {
      if (!data.hide.length) {
        resolve(false);
      }

      let number = 1;

      for (let unit of data.hide) {
        let findUnit = document.getElementById(`${unit.x}:${unit.y}`);

        if (!findUnit) {
          continue;
        }

        let animate = findUnit.animate(
          { opacity: [1, 0], transform: ['scale(0.9)', 'scale(3)'] },
          { duration: 250, fill: 'both', easing: 'ease-out' },
        );

        if (number == data.hide.length) {
          animate.onfinish = () => {
            for (let id in data.score) {
              Game.score(id, data.score[id]);
            }

            findUnit.remove();

            resolve(true);
          };
        } else {
          animate.onfinish = () => {
            findUnit.remove();
          };
        }

        number++;
      }
    });
  }

  static async backgroundAnimate(data) {
    return new Promise((resolve, reject) => {
      if (!data.hide.length) {
        resolve(false);
      }

      let hideBackground = new Array();

      for (let unit of data.hide) {
        if (!Game.background[unit.x][unit.y]) {
          continue;
        }

        hideBackground.push({
          x: unit.x,
          y: unit.y,
          body: document.getElementById(`BG:${unit.x}:${unit.y}`),
        });
      }

      if (!hideBackground.length) {
        resolve(true);
      }

      let number = 0,
        state = [0, 0.9, 0.6, 0.3];

      for (let item of hideBackground) {
        number++;

        if (!item.body) {
          continue;
        }

        let currentState = Game.background[item.x][item.y];

        Game.background[item.x][item.y]--;

        let animate = item.body.animate(
          {
            opacity: [currentState, Game.background[item.x][item.y]],
            transform: ['scale(0.9)', 'scale(1.6)', 'scale(0.9)'],
          },
          { duration: 500, fill: 'both', easing: 'ease-out' },
        );

        if (number == hideBackground.length) {
          animate.onfinish = () => {
            if (!Game.background[item.x][item.y]) {
              item.body.remove();
            }

            resolve(true);
          };
        } else {
          animate.onfinish = () => {
            if (!Game.background[item.x][item.y]) {
              item.body.remove();
            }
          };
        }
      }
    });
  }

  static async moveAnimate(data) {
    return new Promise((resolve, reject) => {
      if (!data.length) {
        resolve(false);
      }

      let number = 1;

      for (let unit of data) {
        let findUnit = document.getElementById(`${unit.x1}:${unit.y1}`);

        findUnit.id = `${unit.x2}:${unit.y2}`;

        let animate = findUnit.animate(
          {
            top: [`${Game.position(unit.x1)}`, `${Game.position(unit.x2)}`],
            transform: ['rotate(0) scale(0.9)', `rotate(${Game.getRandomInt(-180, 180)}deg) scale(0.9)`, 'rotate(0) scale(0.9)'],
          },
          { duration: 250, fill: 'both', easing: 'ease-in' },
        );

        if (number == data.length) {
          animate.onfinish = () => {
            animate.onfinish = null;

            resolve(true);
          };
        }

        number++;
      }
    });
  }

  static async dropAnimate(data) {
    return new Promise((resolve, reject) => {
      if (!data.length) {
        resolve(false);
      }

      let number = 1;

      for (let unit of data) {
        let createUnit = Game.createUnit(unit.id, unit.x, unit.y);

        let animate = createUnit.animate(
          {
            opacity: [0, 1],
            transform: ['rotate(0) scale(0.9)', 'rotate(360deg) scale(0.9)'],
          },
          { duration: 250, fill: 'both', easing: 'ease-in' },
        );

        if (number == data.length) {
          animate.onfinish = () => {
            animate.onfinish = null;

            resolve(true);
          };
        }

        number++;
      }
    });
  }

  static exit() {
    if (Game.eventExit) {
      Game.eventExit();
    }
  }
}
