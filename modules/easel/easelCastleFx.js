// Анимация здания «Мастерская свитков» в замке — как onIdleEffect PW (Buildings/B/MiniGame/FX.EFFT):
// скиннинговые капли (FXallDrops01.skin, скелет FXroot.skel) по графу idle → idle1 (FXIdle1, вероятность 1)
// или idle2 (FXIdle2, вероятность 2), переходы 0.5 с; «дыра» (FXHoleHolle.stat) видна только в idle1.
// Меши лежат в scenes.json (easel/fx_drops.bin, easel/fx_hole.bin), здесь — только CPU-скиннинг капель
// в их вершинный буфер. Данные: tools/pw-convert/build_easel_castle.py → content/easel/castle/.
import * as mat4 from '../glMatrix/mat4.js';
import { Skeleton, fetchOk, EASEL_BASE } from './easelRenderer.js';

const DROPS = 'easel/fx_drops.bin';
const HOLE = 'easel/fx_hole.bin';
const BASE = EASEL_BASE + 'castle/';
const NODES = [
  { anim: 'FXIdle1', p: 1, hole: true },
  { anim: 'FXIdle2', p: 2, hole: false },
];
const BLEND = 0.5; // PoseToAnim, сек
const HOLE_ALPHA = 0.7; // DiffuseMul.A материала дыры
const HOLE_FADE_OUT = 0.2;
const STEP = 1 / 30; // анимации PW — 30 кадров/с
const BOX_STEP = 0.5; // шаг выборки поз для границ капель за всю анимацию, сек
const DEFAULT_TRANSFORM = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]; // как в Castle.drawObject

let assets = null; // Promise<{ skel, src, stride }>

function loadAssets() {
  if (!assets) {
    assets = Promise.all([
      fetchOk(BASE + 'assets.json'),
      fetchOk(BASE + 'models/drops.bin', 'buf'),
      fetchOk(BASE + 'anims/fx.bin', 'buf'),
    ]).then(([desc, mesh, anims]) => ({
      skel: new Skeleton(desc.skeletons.fx, new Float32Array(anims)),
      src: new Float32Array(mesh),
      stride: desc.models.drops.stride,
    }));
    assets.catch((e) => {
      console.error('easel castle fx:', e);
    });
  }
  return assets;
}

function pickNode() {
  const total = NODES.reduce((s, n) => s + n.p, 0);
  let r = Math.random() * total;
  for (const n of NODES) {
    if ((r -= n.p) < 0) return n;
  }
  return NODES[0];
}

const states = new WeakMap(); // объект капель сцены → состояние

export class EaselCastleFx {
  // building — Castle.sceneBuildings.easel; time — секунды
  static update(gl, building, time) {
    const drops = building && building.objects.find((o) => o.meshName === DROPS);
    if (!drops || !drops.meshData || !drops.meshData.vertices) return;
    let s = states.get(drops);
    if (!s) {
      s = { ready: false };
      states.set(drops, s);
      const hole = building.transparentObjects.find((o) => o.meshName === HOLE);
      loadAssets()
        .then((a) => {
          const n = a.src.length / a.stride;
          if (n !== drops.meshData.indexCount) throw new Error('easel castle fx: число вершин капель не совпадает');
          Object.assign(s, a, {
            ready: true,
            n,
            out: new Float32Array(n * 8),
            bones: new Float32Array(a.skel.count * 16),
            hole,
            holeCount: hole && hole.meshData ? hole.meshData.indexCount : 0,
            holeFade: 0,
            cur: null,
            prev: null,
            last: -1,
            shadowDirty: false,
          });
          s.box = EaselCastleFx._animBox(s);
        })
        .catch(() => {});
      return;
    }
    if (!s.ready) return;
    EaselCastleFx._step(s, time);
    if (time - s.last < STEP && s.last >= 0) return;
    s.last = time;
    EaselCastleFx._pose(s, time);
    EaselCastleFx._skin(s);
    gl.bindBuffer(gl.ARRAY_BUFFER, drops.meshData.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, s.out, gl.DYNAMIC_DRAW);
    s.shadowDirty = true;
  }

  // Карта теней замка статична (кэшируется один раз). После каждого обновления капель
  // перерисовываем только её участок под каплями (scissor): очищаем глубину и рисуем
  // заслонителей, чьи границы попадают в этот участок, — остальная карта не меняется.
  static updateShadow(Castle, buildingsToDraw) {
    const building = Castle.sceneBuildings && Castle.sceneBuildings.easel;
    const drops = building && building.objects.find((o) => o.meshName === DROPS);
    const s = drops && states.get(drops);
    if (!s || !s.ready || !s.shadowDirty || !Castle.depthFramebuffer) return;
    s.shadowDirty = false;
    const size = Castle.depthTextureSize;
    const lvp = Castle.lightViewProjMatrix;
    const visible = buildingsToDraw.filter((b) => !b.outlined);

    let rect = null;
    for (const b of visible) {
      if (b.name !== 'easel') continue;
      rect = unionRect(rect, smRect(lvp, size, drops, b.rotation, b.translation, s.box[0], s.box[1], 2));
    }
    if (!rect) return;
    rect[0] = Math.max(0, Math.floor(rect[0]));
    rect[1] = Math.max(0, Math.floor(rect[1]));
    rect[2] = Math.min(size, Math.ceil(rect[2]));
    rect[3] = Math.min(size, Math.ceil(rect[3]));
    if (rect[2] <= rect[0] || rect[3] <= rect[1]) return;

    const gl = Castle.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, Castle.depthFramebuffer);
    gl.viewport(0, 0, size, size);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const hits = (obj, rotation, translation) => {
      const md = obj.meshData;
      if (!md || !md.vertices) return false;
      if (obj.objRotation || !md.bboxMin || !isFinite(md.bboxMin[0])) return true;
      const r = smRect(lvp, size, obj, rotation, translation, md.bboxMin, md.bboxMax, 4);
      return r[0] < rect[2] && r[2] > rect[0] && r[1] < rect[3] && r[3] > rect[1];
    };
    // те же заслонители, что и в статическом проходе Castle.loop
    for (const obj of Castle.sceneObjects) {
      if (obj.blend) break;
      if (hits(obj)) Castle.prepareAndDrawObject(obj, true);
    }
    for (const b of visible) {
      for (const obj of b.mesh.objects) {
        if (hits(obj, b.rotation, b.translation)) Castle.prepareAndDrawObject(obj, true, b.rotation, b.translation);
      }
    }
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // границы капель (локально) по всем позам обеих анимаций и позе привязки
  static _animBox(s) {
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    const grow = (a, st) => {
      for (let i = 0; i < s.n; i++) {
        for (let k = 0; k < 3; k++) {
          const v = a[i * st + k];
          if (v < mn[k]) mn[k] = v;
          if (v > mx[k]) mx[k] = v;
        }
      }
    };
    grow(s.src, s.stride);
    for (const node of NODES) {
      const d = s.skel.duration(node.anim);
      for (let t = 0; t <= d; t += BOX_STEP) {
        s.skel.pose(s.bones, node.anim, t, false);
        EaselCastleFx._skin(s);
        grow(s.out, 8);
      }
    }
    return [mn, mx];
  }

  static _step(s, time) {
    const sk = s.skel;
    if (!s.cur) s.cur = { node: pickNode(), start: time };
    const dur = sk.duration(s.cur.node.anim);
    if (time - s.cur.start >= dur) {
      // конец анимации → узел idle → следующая по вероятностям, плавный переход от последней позы
      s.prev = { anim: s.cur.node.anim, time: dur };
      s.cur = { node: pickNode(), start: time };
    }
    const local = time - s.cur.start;
    if (s.prev && local >= BLEND) s.prev = null;

    // дыра: включается вместе с idle1 (fadeIn = переход), гаснет за 0.2 с
    if (s.hole && s.hole.meshData) {
      const dt = Math.max(0, time - (s.holeTime ?? time));
      s.holeTime = time;
      if (s.cur.node.hole) s.holeFade = Math.min(1, s.prev ? local / BLEND : s.holeFade + dt / BLEND);
      else s.holeFade = Math.max(0, s.holeFade - dt / HOLE_FADE_OUT);
      s.hole.tintColor = [1, 1, 1, HOLE_ALPHA * s.holeFade];
      s.hole.meshData.indexCount = s.holeFade > 0 ? s.holeCount : 0;
    }
  }

  static _pose(s, time) {
    const skel = s.skel;
    const bones = s.bones;
    const local = time - s.cur.start;
    if (s.prev) {
      skel.pose(bones, s.prev.anim, s.prev.time, false, {
        anim: s.cur.node.anim,
        time: local,
        loop: false,
        weight: Math.min(1, local / BLEND),
      });
    } else {
      skel.pose(bones, s.cur.node.anim, local, false);
    }
  }

  static _skin(s) {
    const { src, stride, out, bones, n } = s;
    for (let i = 0; i < n; i++) {
      const b = i * stride;
      const o = i * 8;
      const x = src[b],
        y = src[b + 1],
        z = src[b + 2];
      const nx = src[b + 3],
        ny = src[b + 4],
        nz = src[b + 5];
      let px = 0,
        py = 0,
        pz = 0,
        qx = 0,
        qy = 0,
        qz = 0;
      for (let j = 0; j < 4; j++) {
        const w = src[b + 12 + j];
        if (!w) continue;
        const m = src[b + 8 + j] * 16;
        px += w * (bones[m] * x + bones[m + 4] * y + bones[m + 8] * z + bones[m + 12]);
        py += w * (bones[m + 1] * x + bones[m + 5] * y + bones[m + 9] * z + bones[m + 13]);
        pz += w * (bones[m + 2] * x + bones[m + 6] * y + bones[m + 10] * z + bones[m + 14]);
        qx += w * (bones[m] * nx + bones[m + 4] * ny + bones[m + 8] * nz);
        qy += w * (bones[m + 1] * nx + bones[m + 5] * ny + bones[m + 9] * nz);
        qz += w * (bones[m + 2] * nx + bones[m + 6] * ny + bones[m + 10] * nz);
      }
      out[o] = px;
      out[o + 1] = py;
      out[o + 2] = pz;
      out[o + 3] = qx;
      out[o + 4] = qy;
      out[o + 5] = qz;
      out[o + 6] = src[b + 6];
      out[o + 7] = src[b + 7];
    }
  }
}

// мировая матрица объекта — как в Castle.drawObject (без objRotation и scaleOverride)
const _w = mat4.create();
const _r = mat4.create();
function worldMatrix(obj, rotation, translation) {
  mat4.transpose(_w, obj.transform || DEFAULT_TRANSFORM);
  if (rotation) {
    mat4.fromRotation(_r, rotation, [0, 1, 0]);
    mat4.mul(_w, _r, _w);
  }
  if (translation) {
    _w[12] += translation[0];
    _w[13] += translation[1];
    _w[14] += translation[2];
  }
  return _w;
}

// прямоугольник в текселях карты теней [x0, y0, x1, y1] для локальных границ объекта
function smRect(lvp, size, obj, rotation, translation, bmin, bmax, margin) {
  const w = worldMatrix(obj, rotation, translation);
  const r = [Infinity, Infinity, -Infinity, -Infinity];
  for (let c = 0; c < 8; c++) {
    const x = c & 1 ? bmax[0] : bmin[0];
    const y = c & 2 ? bmax[1] : bmin[1];
    const z = c & 4 ? bmax[2] : bmin[2];
    const wx = w[0] * x + w[4] * y + w[8] * z + w[12];
    const wy = w[1] * x + w[5] * y + w[9] * z + w[13];
    const wz = w[2] * x + w[6] * y + w[10] * z + w[14];
    const cw = lvp[3] * wx + lvp[7] * wy + lvp[11] * wz + lvp[15];
    const px = ((lvp[0] * wx + lvp[4] * wy + lvp[8] * wz + lvp[12]) / cw) * 0.5 + 0.5;
    const py = ((lvp[1] * wx + lvp[5] * wy + lvp[9] * wz + lvp[13]) / cw) * 0.5 + 0.5;
    r[0] = Math.min(r[0], px * size);
    r[1] = Math.min(r[1], py * size);
    r[2] = Math.max(r[2], px * size);
    r[3] = Math.max(r[3], py * size);
  }
  r[0] -= margin;
  r[1] -= margin;
  r[2] += margin;
  r[3] += margin;
  return r;
}

function unionRect(a, b) {
  if (!a) return b;
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
