// «Мастерская свитков» (Easel) — мини-игра из Prime World, порт в лаунчер.
// easelLogic.js — логика (порт PF_Minigames/Lux*), easelScene.js — 3D-сцена, здесь — окно, HUD, меню, прогресс.
import { EaselRenderer, EASEL_BASE, CONTENT_BASE, fetchOk } from './easelRenderer.js';
import { EaselGame, Rng, BOARD, BOOST, BALL_TYPE, STEP_MS, M, FIELD_L, selectTrajectory } from './easelLogic.js';
import { EaselSound } from './easelSound.js';
import { EaselFx } from './easelFx.js';
import { EaselScene, toLogic, FIELD } from './easelScene.js';

export { FIELD, toClient, toLogic, COLOR_TEX } from './easelScene.js';

const LUX_Z = 0.56;
const STORE_KEY = 'easel.progress.v1';
const START_GOLD = 300;
const LEVELS = 16;
// Панель бустов: тип логики, иконка (Data/UI/Styles/Minigame02/Boosts), клавиша
const BOOST_UI = [
  { type: BOOST.PAINTBLAST, icon: 'boost_colorbomb', key: '1' },
  { type: BOOST.FREEZE, icon: 'boost_freeze', key: '2' },
  { type: BOOST.JOKER, icon: 'boost_jocker', key: '3' },
  { type: BOOST.SORTER, icon: 'boost_sort', key: '4' },
  { type: BOOST.MAGNET, icon: 'boost_magnet', key: '5' },
  { type: BOOST.ALCHEMIST, icon: 'boost_alchemist', key: '6' },
];
const DIFFICULTY = { Easy: 'Лёгкий', Medium: 'Средний', Hard: 'Сложный', Impossible: 'Невозможный' };
const MEDAL = { gold: 'Золотая медаль', silver: 'Серебряная медаль', bronze: 'Без медали' };
const MEDAL_ICON = { gold: '🥇', silver: '🥈', bronze: '✔' };
const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };

const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Подсказка буста из Minigame02 (теги PW: <style:TT_Title>, <br>, <value:price>)
function parseTooltip(src, price) {
  if (!src) return { title: '', body: '' };
  const t = src.replace(/<value:price>/g, String(price));
  const m = t.match(/<style:TT_Title>(.*?)(?:<br>|<style:)/);
  const title = m ? m[1].replace(/<[^>]*>/g, '').trim() : '';
  const i = t.lastIndexOf('<br><br>');
  const body = (i >= 0 ? t.slice(i + 8) : t).replace(/<[^>]*>/g, '').trim();
  return { title, body };
}

function loadProgress() {
  const def = { gold: START_GOLD, maxLevel: 0, medals: {}, trackUse: {}, lastTrack: -1, first: true };
  try {
    return { ...def, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
  } catch (e) {
    return def;
  }
}

export class Easel {
  static root = null;
  static renderer = null;
  static fx = null;
  static data = null;
  static running = false;
  static faction = 'doct';
  static game = null;
  static scene = null;
  static paused = false;
  static mouse = null;

  // opts: {level, track} — сразу начать уровень (иначе — меню уровней)
  static async open(faction = 'doct', opts = {}) {
    if (Easel.root) return;
    Easel.faction = faction === 'ad' ? 'ad' : 'doct';
    Easel.progress = loadProgress();
    Easel._injectStyle();
    const root = document.createElement('div');
    root.className = 'easel-overlay';
    root.innerHTML = `
      <canvas class="easel-canvas"></canvas>
      <div class="easel-hud" hidden>
        <div class="easel-top">
          <div class="easel-cell easel-level"></div>
          <div class="easel-cell easel-time"></div>
          <div class="easel-cell easel-fill"></div>
          <div class="easel-cell easel-gold"></div>
        </div>
        <div class="easel-banner"></div>
        <div class="easel-boosts"></div>
      </div>
      <div class="easel-buttons">
        <button class="easel-btn easel-mute" title="Звук"></button>
        <button class="easel-btn easel-menu-btn" title="Esc">Меню</button>
        <button class="easel-btn easel-close" title="Закрыть">×</button>
      </div>
      <div class="easel-panel" hidden></div>
      <div class="easel-loading">Загрузка…</div>`;
    document.body.appendChild(root);
    Easel.root = root;
    Easel.$ = (s) => root.querySelector(s);
    Easel.$('.easel-close').onclick = () => Easel.close();
    Easel.$('.easel-mute').onclick = () => {
      Easel.progress.mute = !Easel.progress.mute;
      Easel._save();
      Easel._applyVolume();
    };
    Easel.$('.easel-menu-btn').onclick = () => (Easel.game ? Easel.pause(!Easel.paused) : Easel.showLevels());
    Easel._bindInput(root.querySelector('.easel-canvas'));
    Easel._pauseCastle(true);
    try {
      Easel.renderer = new EaselRenderer(root.querySelector('.easel-canvas'));
      if (!Easel.data) Easel.data = await fetchOk(EASEL_BASE + 'data.json');
      Easel.sound = new EaselSound();
      Easel._applyVolume();
      Easel.fx = new EaselFx(Easel.renderer);
      // эффекты необязательны: без них сцена рисует простые спрайты
      const fxLoad = Easel.fx.load().catch((e) => console.warn('easel: effects', e));
      await Promise.all([Easel.renderer.load(), Easel.sound.load(), fxLoad]);
      await Easel._loadBoard();
      if (!Easel.root) return; // закрыли во время загрузки
      Easel.$('.easel-loading').remove();
      Easel.running = true;
      Easel._last = performance.now();
      requestAnimationFrame(Easel._frame);
      if (opts.level !== undefined) await Easel.startLevel(opts.level, opts.track);
      else Easel.showLevels();
    } catch (e) {
      console.error('easel', e);
      const l = Easel.root && Easel.$('.easel-loading');
      if (l) l.textContent = String(e.message || e);
    }
  }

  static close() {
    if (!Easel.root) return;
    Easel._saveGold();
    Easel.running = false;
    Easel.game = Easel.scene = null;
    window.removeEventListener('keydown', Easel._onKey);
    document.removeEventListener('visibilitychange', Easel._onVis);
    if (Easel.renderer) Easel.renderer.destroy();
    Easel.renderer = null;
    Easel.fx = null;
    if (Easel.sound) Easel.sound.destroy();
    Easel.sound = null;
    Easel.root.remove();
    Easel.root = null;
    Easel._pauseCastle(false);
  }

  static async _pauseCastle(pause) {
    try {
      const { Castle } = await import('../castle.js');
      Easel._castle = Castle;
      Easel._applyVolume();
      if (Castle.render && Castle.RENDER_LAYER_EASEL !== undefined) Castle.render[Castle.RENDER_LAYER_EASEL] = !pause;
    } catch (e) {
      // вне лаунчера (тестовая страница) замка нет
    }
  }

  // Громкость — как у звуков лаунчера (Настройки → общая × звуки), плюс своя кнопка «без звука»
  static _applyVolume() {
    const C = Easel._castle;
    let v = 0.5;
    try {
      if (C && C.GetVolume) v = C.GetVolume(C.AUDIO_SOUNDS);
    } catch (e) {
      // настройки недоступны
    }
    const mute = !!(Easel.progress && Easel.progress.mute);
    if (Easel.sound) Easel.sound.setVolume(Math.min(1, v * 2), mute);
    const b = Easel.root && Easel.$('.easel-mute');
    if (b) b.textContent = mute ? '🔇' : '🔊';
  }

  // Модель здания (та же, что в замке): content/meshes/easel/*.bin
  static async _loadBoard() {
    const r = Easel.renderer;
    const parts =
      Easel.faction === 'ad'
        ? [['ad_0', 'easel/ad_board']]
        : [
            ['doct_0', 'easel/doct_board'],
            ['doct_1', 'easel/doct_gem'],
          ];
    Easel.board = [];
    for (const [mesh, tex] of parts) {
      const buf = await fetchOk(`${CONTENT_BASE}meshes/easel/${mesh}.bin`, 'buf');
      const texId = 'board_' + mesh;
      await r.loadTexture(texId, `${CONTENT_BASE}textures/${tex}.webp`);
      const m = r.dynamicModel('board_' + mesh, new Float32Array(buf));
      m.subs[0].tex = texId;
      m.subs[0].kind = mesh === 'doct_1' ? 'drop' : undefined;
      Easel.board.push(m);
    }
  }

  static _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Easel.progress));
    } catch (e) {
      // localStorage недоступен — прогресс только на сессию
    }
  }

  static _saveGold() {
    if (Easel.game && !Easel.game._saved) Easel.progress.gold = Math.max(0, Easel.game.gold);
    Easel._save();
  }

  // ---------- партия ----------
  static async startLevel(level, track) {
    const data = Easel.data;
    level = Math.max(0, Math.min(LEVELS - 1, level | 0));
    Easel._saveGold();
    Easel._hidePanel();
    const P = Easel.progress;
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    if (track === undefined || track === null || !data.tracks[track]) {
      track = selectTrajectory(data, level, P.trackUse, P.lastTrack, new Rng(seed), P.first);
    }
    P.lastTrack = track;
    if (level === 0) P.first = false;
    Easel._save();
    const picture = level % data.pictures.length;
    const boosts = level >= 1 ? BOOST_UI.map((b) => b.type) : [];
    const game = new EaselGame({ data, track, level, picture, seed, triple: false, boosts, gold: P.gold });
    const tex = await Easel.renderer.loadPicture(picture);
    if (!Easel.root) return;
    Easel.game = game;
    Easel.scene = new EaselScene(Easel.renderer, data, game, Easel.board, tex, Easel.fx);
    Easel.level = level;
    Easel.acc = 0;
    Easel.clicks = { left: false, right: false };
    Easel.paused = false;
    Easel._near = false;
    if (Easel.sound) {
      Easel.sound.stopAll();
      Easel.sound.pause(false);
    }
    game.start();
    Easel._buildHud();
  }

  static _frame(now) {
    if (!Easel.running || !Easel.renderer) return;
    const dt = Math.min(0.25, Math.max(0, (now - Easel._last) / 1000));
    Easel._last = now;
    const g = Easel.game;
    const s = Easel.scene;
    if (g && s) {
      if (!Easel.paused) {
        Easel._liveAim();
        Easel.acc += dt * 1000;
        while (Easel.acc >= STEP_MS) {
          Easel.acc -= STEP_MS;
          const [x, y] = Easel._fieldMouse() || [g.platform.pos.x / M, FIELD / 2];
          g.input(x, y, Easel.clicks.left, Easel.clicks.right);
          Easel.clicks.left = Easel.clicks.right = false;
          g.step(STEP_MS);
          const ev = g.events.splice(0);
          s.afterStep(ev);
          for (const e of ev) Easel._onEvent(e);
          if (!Easel.game) break;
          Easel._checkNearExit();
        }
      }
      if (Easel.scene) Easel.scene.render(Easel.paused ? 0 : dt);
      if (Easel.game) Easel._updateHud();
    } else {
      // меню без партии: пустая доска
      const r = Easel.renderer;
      const cam = Easel.data.common.camera;
      r.setCamera({ target: [cam.anchor.x, cam.anchor.y, cam.anchor.z], yaw: cam.yaw, pitch: cam.pitch, rod: cam.rod, fov: cam.fov });
      r.begin();
      const m = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0.44, 1]);
      for (const b of Easel.board) r.draw({ model: b, matrix: m });
      r.end();
    }
    requestAnimationFrame(Easel._frame);
  }

  // Мышь → координаты поля (0..FIELD)
  static _fieldMouse() {
    if (!Easel.mouse || !Easel.renderer) return null;
    const p = Easel.renderer.screenToPlane(Easel.mouse[0], Easel.mouse[1], LUX_Z);
    return toLogic(p[0], p[1]);
  }

  // Тележка следует за мышью каждый кадр (логика всё равно берёт позицию на шаге)
  static _liveAim() {
    const g = Easel.game;
    const f = Easel._fieldMouse();
    const mg = g.boosts.get(BOOST.MAGNET);
    if (!f || (mg && mg.state === 'waiting')) return;
    const x = Math.max(20, Math.min(FIELD_L - 20, Math.trunc(f[0] * M)));
    g.platform.setPos({ x, y: g.platform.pos.y });
    if (g.state === BOARD.LEVEL_RUN) g._updatePointer();
  }

  static _onEvent(e) {
    Easel._soundFor(e);
    if (e.type !== 'state') return;
    if (e.state === BOARD.WON_FINAL || e.state === BOARD.FAIL_FINAL) Easel._finish(e.state === BOARD.WON_FINAL);
  }

  // Звуки по событиям логики (PF_Minigames/SoundObserver.cpp, EaselMinigameData.xdb: soundData)
  static _soundFor(e) {
    const S = Easel.sound;
    if (!S) return;
    switch (e.type) {
      case 'fired':
        return S.play('easel_drop_shot');
      case 'hit':
        return S.play(e.matched ? 'easel_hit_color_match' : 'easel_hit_color_missmatch');
      case 'miss':
        return S.play('easel_miss');
      case 'swap':
        return S.play('easel_platform_drops_swap');
      case 'explode':
        return S.play('easel_drop_explosion', { gap: 0.06 });
      case 'paintFlow':
        return S.play('easel_paint_flow', { gap: 0.3, volume: 0.7 });
      case 'paintBlast':
        return S.play('easel_boost_paintblas_explosion');
      case 'chainGenerated':
        return S.play('easel_drop_slide_high', { gap: 0.5 });
      case 'slideBack':
        return S.play('easel_drop_slide_low', { gap: 0.5 });
      case 'chainMerged':
        return S.play('easel_chain_merged', { gap: 0.3 });
      case 'chainDestroyed':
        return S.play('easel_chain_destroyed', { gap: 0.3 });
      case 'coinPicked':
        return S.play('easel_coin_catched');
      case 'freeze':
        return e.on && S.play('easel_boost_freeze_click');
      case 'sorter':
        return S.play('easel_boost_inspiration_cli');
      case 'specialBall':
        return S.play(e.ball.type === BALL_TYPE.JOKER ? 'easel_boost_joker_click' : 'easel_boost_paintblast_clic');
      case 'magnetInstalled':
        return S.play('Magnet', { id: 'magnet' });
      case 'state':
        if (e.state === BOARD.LEVEL_BEGIN) S.play('easel_level_scroll_start');
        else if (e.state === BOARD.LEVEL_WON) {
          S.stopAll();
          S.play('easel_level_win', { id: 'result' });
        } else if (e.state === BOARD.LEVEL_FAIL) {
          S.stopAll();
          S.play('easel_chain_reach_end', { id: 'result' });
        } else if (e.state === BOARD.FAIL_FINAL) S.play('easel_level_loose', { id: 'result' });
    }
  }

  // Цепочка близко к колодцу — тревожный звук (CHAIN_NEAR_EXIT), пока не отъедет
  static _checkNearExit() {
    const g = Easel.game;
    let k = 0;
    if (g.state === BOARD.LEVEL_RUN) {
      for (const bc of g.boardChains) if (bc.chains.length) k = Math.max(k, bc.chains[0].position() / bc.path.traj.length);
    }
    if (!Easel._near && k > 0.82) {
      Easel._near = true;
      if (Easel.sound) Easel.sound.play('easel_chain_near_exit', { id: 'near' });
    } else if (Easel._near && k < 0.75) {
      Easel._near = false;
      if (Easel.sound) Easel.sound.stop('near');
    }
  }

  static _finish(won) {
    const g = Easel.game;
    const P = Easel.progress;
    P.gold = Math.max(0, g.gold);
    g._saved = true;
    let medal = null;
    if (won) {
      medal = g.medal || 'bronze';
      const prev = P.medals[g.level];
      if (!prev || MEDAL_RANK[medal] > MEDAL_RANK[prev]) P.medals[g.level] = medal;
      P.maxLevel = Math.max(P.maxLevel, Math.min(LEVELS - 1, g.level + 1));
    }
    Easel._save();
    if (Easel.sound && (medal === 'gold' || medal === 'silver')) Easel.sound.play('easel_result_' + medal, { id: 'medal' });
    const st = g.levelStats;
    const html = won
      ? `<h2>Картина готова!</h2>
         <div class="easel-medal">${MEDAL_ICON[medal]} ${MEDAL[medal]}</div>
         <p>Время: <b>${fmtTime(g.elapsed / 1000)}</b> · золото: ≤ ${fmtTime(st.goldMedalTime)} · серебро: ≤ ${fmtTime(st.silverMedalTime)}</p>
         <p>Заработано: <b>${g.goldEarned}</b> 🪙 · всего: <b>${P.gold}</b> 🪙</p>`
      : `<h2>Краска утекла в колодец</h2><p>Цепочка дошла до конца трассы. Попробуйте ещё раз!</p>
         <p>Заработано: <b>${g.goldEarned}</b> 🪙 · всего: <b>${P.gold}</b> 🪙</p>`;
    const next = won && g.level + 1 < LEVELS;
    Easel._showPanel(
      html +
        `<div class="easel-actions">
          ${next ? '<button class="easel-btn easel-primary" data-act="next">Следующий уровень</button>' : ''}
          <button class="easel-btn${next ? '' : ' easel-primary'}" data-act="retry">Ещё раз</button>
          <button class="easel-btn" data-act="levels">Уровни</button>
          <button class="easel-btn" data-act="exit">Выход</button>
        </div>`,
    );
  }

  static pause(on) {
    if (!Easel.game) return;
    const g = Easel.game;
    if (g.state === BOARD.WON_FINAL || g.state === BOARD.FAIL_FINAL) return;
    Easel.paused = on;
    if (Easel.sound) Easel.sound.pause(on);
    if (!on) {
      Easel._hidePanel();
      Easel._last = performance.now();
      return;
    }
    Easel._showPanel(`<h2>Пауза</h2>
      <p>Уровень ${g.level + 1} · ${esc(DIFFICULTY[Easel.data.levels[g.level].difficulty] || '')}</p>
      <div class="easel-help">Мышь — двигать тележку · ЛКМ — выстрел · ПКМ / Пробел — поменять капли · 1–6 — бусты</div>
      <div class="easel-actions">
        <button class="easel-btn easel-primary" data-act="resume">Продолжить</button>
        <button class="easel-btn" data-act="retry">Начать заново</button>
        <button class="easel-btn" data-act="levels">Уровни</button>
        <button class="easel-btn" data-act="exit">Выход</button>
      </div>`);
  }

  static showLevels() {
    Easel._saveGold();
    Easel.game = Easel.scene = null;
    Easel.paused = false;
    if (Easel.sound) {
      Easel.sound.stopAll();
      Easel.sound.pause(false);
    }
    Easel.$('.easel-hud').hidden = true;
    const P = Easel.progress;
    const cells = Easel.data.levels
      .map((l, i) => {
        const locked = i > P.maxLevel;
        const medal = P.medals[i];
        return `<button class="easel-lvl${locked ? ' locked' : ''}" data-level="${i}" ${locked ? 'disabled' : ''}>
          <b>${i + 1}</b><small>${esc(DIFFICULTY[l.difficulty] || l.difficulty)}</small>
          <span>${locked ? '🔒' : medal ? MEDAL_ICON[medal] : ''}</span></button>`;
      })
      .join('');
    Easel._showPanel(`<h2>Мастерская свитков</h2>
      <p>Закрасьте картину каплями нужного цвета, пока цепочка не докатилась до колодца.</p>
      <div class="easel-gold-big">${P.gold} 🪙</div>
      <div class="easel-levels">${cells}</div>
      <div class="easel-actions"><button class="easel-btn" data-act="exit">Выход</button></div>`);
  }

  static _showPanel(html) {
    const p = Easel.$('.easel-panel');
    p.innerHTML = `<div class="easel-box">${html}</div>`;
    p.hidden = false;
    p.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.level !== undefined) return Easel.startLevel(+b.dataset.level);
      const g = Easel.game;
      switch (b.dataset.act) {
        case 'resume':
          return Easel.pause(false);
        case 'retry':
          return Easel.startLevel(g ? g.level : Easel.level);
        case 'next':
          return Easel.startLevel((g ? g.level : Easel.level) + 1);
        case 'levels':
          return Easel.showLevels();
        case 'exit':
          return Easel.close();
      }
    };
  }

  static _hidePanel() {
    const p = Easel.root && Easel.$('.easel-panel');
    if (p) p.hidden = true;
  }

  // ---------- HUD ----------
  static _buildHud() {
    const g = Easel.game;
    const data = Easel.data;
    Easel.$('.easel-hud').hidden = false;
    Easel.$('.easel-level').textContent = `Уровень ${g.level + 1} · ${DIFFICULTY[data.levels[g.level].difficulty] || ''}`;
    const bar = Easel.$('.easel-boosts');
    bar.innerHTML = '';
    Easel.boostEls = [];
    for (const ui of BOOST_UI) {
      const b = g.boosts.get(ui.type);
      if (!b) continue;
      const tip = parseTooltip(data.boostTooltips[ui.type], b.price);
      const el = document.createElement('button');
      el.className = 'easel-boost';
      el.innerHTML = `<img src="${EASEL_BASE}ui/${ui.icon}.webp" alt=""><i class="easel-cd"></i>
        <span class="easel-price">${b.price}</span><kbd>${ui.key}</kbd>
        <div class="easel-tip"><b>${esc(tip.title)}</b> <em>${b.price} 🪙 · ${Math.round(b.cooldown / 1000)} с</em><br>${esc(tip.body)}</div>`;
      el.onclick = (e) => {
        e.stopPropagation();
        Easel._fireBoost(ui.type);
      };
      bar.appendChild(el);
      Easel.boostEls.push({ el, boost: b, cd: el.querySelector('.easel-cd') });
    }
    Easel._hud = {};
  }

  static _fireBoost(type) {
    const g = Easel.game;
    if (!g || Easel.paused) return;
    const b = g.boosts.get(type);
    const can = g.boosts.canFire(b);
    g.fireBoost(type);
    if (can && type === BOOST.ALCHEMIST && Easel.sound) Easel.sound.play('Alchemist', { id: 'alchemist' });
  }

  static _setText(sel, text) {
    if (Easel._hud[sel] === text) return;
    Easel._hud[sel] = text;
    Easel.$(sel).innerHTML = text;
  }

  static _updateHud() {
    const g = Easel.game;
    const st = g.levelStats;
    const t = g.elapsed / 1000;
    const medal =
      t <= st.goldMedalTime ? '🥇 ' + fmtTime(st.goldMedalTime) : t <= st.silverMedalTime ? '🥈 ' + fmtTime(st.silverMedalTime) : '';
    Easel._setText('.easel-time', `⏱ ${fmtTime(t)} <small>${medal}</small>`);
    Easel._setText('.easel-fill', `🎨 ${Math.round(g.paint.fillRatio() * 100)}%`);
    Easel._setText('.easel-gold', `${g.gold} 🪙`);
    let banner = '';
    if (g.state === BOARD.LEVEL_BEGIN) banner = `Уровень ${g.level + 1}<small>Щёлкните, чтобы начать</small>`;
    else if (g.state >= BOARD.LEVEL_WON && g.state <= BOARD.WON_MOVIE) banner = 'Картина готова!';
    else if (g.state === BOARD.LEVEL_FAIL) banner = 'Краска утекла…';
    else if (g.boosts.get(BOOST.MAGNET) && g.boosts.get(BOOST.MAGNET).state === 'waiting')
      banner = '<small>Выберите место для магнита</small>';
    else if (g.frozen) banner = '<small>Заморозка</small>';
    Easel._setText('.easel-banner', banner);
    for (const x of Easel.boostEls) {
      const b = x.boost;
      const can = g.boosts.canFire(b);
      x.el.classList.toggle('off', !can);
      x.el.classList.toggle('active', b.waiting || (b.type === BOOST.FREEZE && g.frozen) || !!b.active);
      x.el.classList.toggle('poor', g.gold < b.price);
      x.cd.style.height = b.cooling ? `${Math.round((1 - b.progress()) * 100)}%` : '0';
    }
  }

  // ---------- ввод ----------
  static _bindInput(canvas) {
    Easel.clicks = { left: false, right: false };
    canvas.addEventListener('mousemove', (e) => (Easel.mouse = [e.clientX, e.clientY]));
    canvas.addEventListener('mousedown', (e) => {
      Easel.mouse = [e.clientX, e.clientY];
      if (!Easel.game || Easel.paused) return;
      if (e.button === 0) Easel.clicks.left = true;
      else if (e.button === 2) Easel.clicks.right = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    Easel._onKey = (e) => {
      if (!Easel.root) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (Easel.game) {
          const s = Easel.game.state;
          if (s === BOARD.WON_FINAL || s === BOARD.FAIL_FINAL) Easel.showLevels();
          else Easel.pause(!Easel.paused);
        } else Easel.close();
        return;
      }
      if (!Easel.game || Easel.paused) return;
      if (e.key === ' ') {
        e.preventDefault();
        Easel.clicks.right = true;
        return;
      }
      const ui = BOOST_UI.find((b) => b.key === e.key);
      if (ui) Easel._fireBoost(ui.type);
    };
    window.addEventListener('keydown', Easel._onKey);
    Easel._onVis = () => {
      if (document.hidden && Easel.game && !Easel.paused) Easel.pause(true);
    };
    document.addEventListener('visibilitychange', Easel._onVis);
  }

  static _injectStyle() {
    if (document.getElementById('easel-style')) return;
    const s = document.createElement('style');
    s.id = 'easel-style';
    s.textContent = `
      .easel-overlay{position:fixed;inset:0;z-index:9000;background:radial-gradient(ellipse at center,rgba(20,26,18,.55),rgba(0,0,0,.88));
        color:#f3e3b5;font-family:inherit;user-select:none}
      .easel-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair}
      .easel-hud{position:absolute;inset:0;pointer-events:none}
      .easel-hud[hidden],.easel-panel[hidden]{display:none}
      .easel-btn{pointer-events:auto;background:rgba(40,30,18,.88);color:#f3e3b5;border:1px solid #b08a4a;border-radius:6px;
        font:inherit;font-size:16px;line-height:1;padding:8px 14px;cursor:pointer}
      .easel-btn:hover{background:rgba(90,66,32,.95)}
      .easel-primary{background:rgba(120,84,30,.95);border-color:#e0b860}
      .easel-buttons{position:absolute;top:14px;right:16px;display:flex;gap:8px;z-index:3}
      .easel-close{font-size:20px;padding:6px 12px}
      .easel-top{position:absolute;top:14px;left:16px;right:140px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
      .easel-cell{background:rgba(25,18,10,.72);border:1px solid rgba(176,138,74,.6);border-radius:6px;padding:6px 12px;
        font-size:16px;text-shadow:0 1px 2px #000;white-space:nowrap}
      .easel-cell small{opacity:.8;font-size:13px}
      .easel-banner{position:absolute;top:34%;left:50%;transform:translate(-50%,-50%);font-size:44px;font-weight:bold;
        text-align:center;text-shadow:0 2px 8px #000,0 0 3px #000}
      .easel-banner small{display:block;font-size:18px;font-weight:normal;margin-top:6px}
      .easel-boosts{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:10px}
      .easel-boost{pointer-events:auto;position:relative;width:62px;height:62px;padding:0;border-radius:10px;cursor:pointer;
        border:2px solid #b08a4a;background:rgba(25,18,10,.8);overflow:visible}
      .easel-boost img{width:100%;height:100%;border-radius:8px;display:block}
      .easel-boost.off img{filter:grayscale(.7) brightness(.6)}
      .easel-boost.active{border-color:#ffe27a;box-shadow:0 0 12px #ffd24a}
      .easel-boost.poor .easel-price{color:#ff7a6a}
      .easel-cd{position:absolute;left:0;right:0;bottom:0;height:0;background:rgba(0,0,0,.6);border-radius:0 0 8px 8px}
      .easel-price{position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);font-size:12px;background:#2a1d0e;
        border:1px solid #b08a4a;border-radius:8px;padding:0 6px;color:#ffe27a;font-style:normal}
      .easel-boost kbd{position:absolute;top:2px;left:4px;font-size:11px;color:#fff;text-shadow:0 0 3px #000;font-family:inherit}
      .easel-tip{display:none;position:absolute;bottom:74px;left:50%;transform:translateX(-50%);width:240px;padding:8px 10px;
        background:rgba(20,14,8,.95);border:1px solid #b08a4a;border-radius:6px;font-size:13px;text-align:left;color:#f3e3b5;line-height:1.35}
      .easel-tip em{float:right;font-style:normal;color:#ffe27a}
      .easel-boost:hover .easel-tip{display:block}
      .easel-panel{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:2}
      .easel-box{min-width:360px;max-width:640px;padding:20px 26px;background:rgba(32,23,12,.96);border:1px solid #b08a4a;
        border-radius:10px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.6)}
      .easel-box h2{margin:0 0 10px;font-size:26px;color:#ffe9b0}
      .easel-box p{margin:6px 0;font-size:15px}
      .easel-help{font-size:13px;opacity:.85;margin:10px 0}
      .easel-medal{font-size:22px;margin:8px 0}
      .easel-gold-big{font-size:20px;margin:8px 0;color:#ffe27a}
      .easel-actions{display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap}
      .easel-levels{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
      .easel-lvl{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;background:rgba(60,44,22,.9);
        color:#f3e3b5;border:1px solid #b08a4a;border-radius:6px;cursor:pointer;font:inherit}
      .easel-lvl:hover{background:rgba(100,74,36,.95)}
      .easel-lvl b{font-size:20px}
      .easel-lvl small{font-size:11px;opacity:.8}
      .easel-lvl span{min-height:18px}
      .easel-lvl.locked{opacity:.45;cursor:default}
      .easel-loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:22px}`;
    document.head.appendChild(s);
  }
}
