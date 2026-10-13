// Анимация здания «Мастерская свитков» в замке — как onIdleEffect PW (Buildings/B/MiniGame/FX.EFFT):
// скиннинговые капли (FXallDrops01.skin, скелет FXroot.skel) по графу idle → idle1 (FXIdle1, вероятность 1)
// или idle2 (FXIdle2, вероятность 2), переходы 0.5 с; «дыра» (FXHoleHolle.stat) видна только в idle1.
// Меши лежат в scenes.json: easel/fx_drops.bin (с индексами и весами костей, шейдер shader_pos_norm_uv_skin)
// и easel/fx_hole.bin. Здесь — граф анимаций и позы скелета: матрицы костей уходят в убер-шейдер замка
// (drops.bones → uniform bones, VS_SKIN), вершины скинит шейдер. Данные: tools/pw-convert/build_easel_castle.py.
import * as mat4 from '../glMatrix/mat4.js';
import { Skeleton, fetchOk, EASEL_BASE, CONTENT_BASE } from './easelRenderer.js';

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
const STEP = 1 / 30; // шаг перерисовки тени капель, сек (позы — каждый кадр)
const BOX_STEP = 0.5; // шаг выборки поз для границ капель за всю анимацию, сек
const STRIDE = 10; // вершина капель во float: pos3 norm3 uv2 + индексы костей 4×u8 + веса 4×u8 (40 байт)
const DEFAULT_TRANSFORM = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]; // как в Castle.drawObject

let assets = null; // Promise<{ skel, src, n, boneBox }>

function loadAssets() {
  if (!assets) {
    assets = Promise.all([
      fetchOk(BASE + 'assets.json'),
      fetchOk(CONTENT_BASE + 'meshes/' + DROPS, 'buf'),
      fetchOk(BASE + 'anims/fx.bin', 'buf'),
    ]).then(([desc, mesh, anims]) => {
      const skel = new Skeleton(desc.skeletons.fx, new Float32Array(anims));
      const src = new Float32Array(mesh);
      const bytes = new Uint8Array(mesh);
      const n = src.length / STRIDE;
      // границы вершин каждой кости в позе привязки — для границ капель за всю анимацию (_animBox)
      const boneBox = new Float32Array(skel.count * 6);
      for (let b = 0; b < skel.count; b++) boneBox.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], b * 6);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < 4; j++) {
          if (!bytes[i * STRIDE * 4 + 36 + j]) continue;
          const b = bytes[i * STRIDE * 4 + 32 + j];
          for (let k = 0; k < 3; k++) {
            const v = src[i * STRIDE + k];
            if (v < boneBox[b * 6 + k]) boneBox[b * 6 + k] = v;
            if (v > boneBox[b * 6 + 3 + k]) boneBox[b * 6 + 3 + k] = v;
          }
        }
      }
      return { skel, src, n, boneBox };
    });
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

// Перерисовать участок карты теней [x0, y0, x1, y1] (тексели): очистить и заново нарисовать всех,
// кто в него попадает. Используется для капель мольберта и для вращающихся объектов (Castle).
export function redrawShadowRect(Castle, rect, visible) {
  const size = Castle.depthTextureSize;
  const lvp = Castle.lightViewProjMatrix;
  rect = [Math.max(0, Math.floor(rect[0])), Math.max(0, Math.floor(rect[1])), Math.min(size, Math.ceil(rect[2])), Math.min(size, Math.ceil(rect[3]))];
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
    if (!md || !md.vertices || (obj.noShadowCast && Castle.dayNightActive)) return false;
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

// Участок карты теней, который вращающийся объект (objRotation) может занять при любом угле:
// вращение идёт вокруг локального начала координат, берём куб радиуса самой дальней вершины.
export function rotatingShadowRect(Castle, obj, rotation, translation) {
  const md = obj.meshData;
  if (!md || !md.bboxMin || !isFinite(md.bboxMin[0])) return null;
  let r = 0;
  for (let c = 0; c < 8; c++) {
    const x = c & 1 ? md.bboxMax[0] : md.bboxMin[0];
    const y = c & 2 ? md.bboxMax[1] : md.bboxMin[1];
    const z = c & 4 ? md.bboxMax[2] : md.bboxMin[2];
    r = Math.max(r, Math.hypot(x, y, z));
  }
  return smRect(Castle.lightViewProjMatrix, Castle.depthTextureSize, obj, rotation, translation, [-r, -r, -r], [r, r, r], 4);
}

export class EaselCastleFx {
  // building — Castle.sceneBuildings.easel; time — секунды (по часам, не по кадрам);
  // maxBones — сколько костей принимает шейдер (Castle.SKIN_MAX_BONES)
  static update(building, time, maxBones) {
    const drops = building && building.objects.find((o) => o.meshName === DROPS);
    if (!drops || !drops.meshData || !drops.meshData.vertices) return;
    let s = states.get(drops);
    if (!s) {
      s = { ready: false };
      states.set(drops, s);
      const hole = building.transparentObjects.find((o) => o.meshName === HOLE);
      loadAssets()
        .then((a) => {
          if (a.n !== drops.meshData.indexCount) throw new Error('easel castle fx: число вершин капель не совпадает');
          if (a.skel.count > maxBones) throw new Error('easel castle fx: костей больше, чем Castle.SKIN_MAX_BONES');
          Object.assign(s, a, {
            ready: true,
            pose: new Float32Array(a.skel.count * 16),
            hole,
            holeCount: hole && hole.meshData ? hole.meshData.indexCount : 0,
            holeFade: 0,
            cur: null,
            prev: null,
            last: -1,
            shadowDirty: false,
          });
          s.box = EaselCastleFx._animBox(s);
          // заслонители при перерисовке участка карты теней отбираются по границам меша
          drops.meshData.bboxMin = s.box[0];
          drops.meshData.bboxMax = s.box[1];
          drops.bones = new Float32Array(a.skel.count * 12);
        })
        .catch((e) => console.error(e));
      return;
    }
    if (!s.ready) return;
    EaselCastleFx._step(s, time);
    // поза — каждый кадр по текущему времени (между ключами анимации — интерполяция), тень — с шагом STEP
    EaselCastleFx._pose(s, time);
    packRows(drops.bones, s.pose, s.skel.count);
    if (s.last < 0 || time - s.last >= STEP) {
      s.last = time;
      s.shadowDirty = true;
    }
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
    redrawShadowRect(Castle, rect, visible);
  }

  // Границы капель (локально) по всем позам обеих анимаций и позе привязки. Вершина — взвешенная сумма
  // своей точки, перенесённой матрицами костей, поэтому лежит внутри объединения границ костей,
  // перенесённых их матрицами: хватает 8 углов на кость вместо скиннинга всех вершин.
  static _animBox(s) {
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    const { boneBox, pose } = s;
    const count = s.skel.count;
    for (let i = 0; i < s.n; i++) {
      for (let k = 0; k < 3; k++) {
        const v = s.src[i * STRIDE + k];
        if (v < mn[k]) mn[k] = v;
        if (v > mx[k]) mx[k] = v;
      }
    }
    for (const node of NODES) {
      const d = s.skel.duration(node.anim);
      for (let t = 0; t <= d; t += BOX_STEP) {
        s.skel.pose(pose, node.anim, t, false);
        for (let b = 0; b < count; b++) {
          const bb = b * 6;
          if (!isFinite(boneBox[bb])) continue;
          const m = b * 16;
          for (let c = 0; c < 8; c++) {
            const x = boneBox[bb + (c & 1 ? 3 : 0)];
            const y = boneBox[bb + (c & 2 ? 4 : 1)];
            const z = boneBox[bb + (c & 4 ? 5 : 2)];
            for (let k = 0; k < 3; k++) {
              const v = pose[m + k] * x + pose[m + 4 + k] * y + pose[m + 8 + k] * z + pose[m + 12 + k];
              if (v < mn[k]) mn[k] = v;
              if (v > mx[k]) mx[k] = v;
            }
          }
        }
      }
    }
    return [mn, mx];
  }

  static _step(s, time) {
    const sk = s.skel;
    if (!s.cur) s.cur = { node: pickNode(), start: time };
    const dur = sk.duration(s.cur.node.anim);
    if (time - s.cur.start >= dur) {
      // конец анимации → узел idle → следующая по вероятностям, плавный переход от последней позы.
      // Следующая начинается ровно в момент конца, а не на кадре, где его заметили, — время анимации
      // не зависит от частоты кадров; после долгой паузы отрисовки — с текущего момента.
      const end = s.cur.start + dur;
      s.prev = { anim: s.cur.node.anim, time: dur };
      s.cur = { node: pickNode(), start: time - end < BLEND ? end : time };
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
    const pose = s.pose;
    const local = time - s.cur.start;
    if (s.prev) {
      skel.pose(pose, s.prev.anim, s.prev.time, false, {
        anim: s.cur.node.anim,
        time: local,
        loop: false,
        weight: Math.min(1, local / BLEND),
      });
    } else {
      skel.pose(pose, s.cur.node.anim, local, false);
    }
  }
}

// матрицы скиннинга (mat4, column-major) → uniform bones убер-шейдера: 3 строки аффинной матрицы на кость
function packRows(rows, m, count) {
  for (let i = 0; i < count; i++) {
    const a = i * 16;
    const o = i * 12;
    rows[o] = m[a];
    rows[o + 1] = m[a + 4];
    rows[o + 2] = m[a + 8];
    rows[o + 3] = m[a + 12];
    rows[o + 4] = m[a + 1];
    rows[o + 5] = m[a + 5];
    rows[o + 6] = m[a + 9];
    rows[o + 7] = m[a + 13];
    rows[o + 8] = m[a + 2];
    rows[o + 9] = m[a + 6];
    rows[o + 10] = m[a + 10];
    rows[o + 11] = m[a + 14];
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
