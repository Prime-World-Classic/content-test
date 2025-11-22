import * as glMatrix from "./glMatrix/common.js";
import * as vec2 from "./glMatrix/vec2.js";
import * as vec3 from "./glMatrix/vec3.js";
import * as vec4 from "./glMatrix/vec4.js";

import * as mat4 from "./glMatrix/mat4.js";

import * as quat from "./glMatrix/quat.js";

import { Window } from "./window.js";
import { App } from "./app.js";
import { HTTP } from "./http.js";
import { NativeAPI } from "./nativeApi.js";
import { CastleBuildingsEvents } from "./castleBuildingEvents.js";
import { Settings } from "./settings.js";
import { Sound } from "./sound.js";
import { PreloadImages } from "./preloadImages.js";
import { DOM } from "./dom.js";

export class Castle {
  static canvas;

  static gl;

  static AUDIO_MUSIC = 0;
  static AUDIO_SOUNDS = 1;
  static GetVolume(type) {
    // Используем настройки из Settings вместо внутренних переменных
    const global = Settings.settings.globalVolume ?? 1.0;
    const music = Settings.settings.musicVolume ?? 0.5;
    const sounds = Settings.settings.soundsVolume ?? 0.3;

    if (type == Castle.AUDIO_MUSIC) {
      return global * music;
    }
    if (type == Castle.AUDIO_SOUNDS) {
      return global * sounds;
    }
    return 1.0; // Значение по умолчанию
  }
  static testSoundIsPlaying = false;

  static RENDER_LAYER_LAUNCHER = 0;
  static RENDER_LAYER_GAME = 1;
  static RENDER_LAYER_PLAYER = 2;

  static render = [true, true, true];

  static MUSIC_LAYER_PLAYER = 0;
  static MUSIC_LAYER_GAME = 1;
  static MUSIC_LAYER_TAMBUR = 2;

  static music = [true, true, true];

  static identityMatrix;

  static viewMatrix;

  static flipMatr;

  static viewMatrix2;

  static projMatrix;

  static viewProjMatr;

  static cursorBasis = new Float32Array(4);

  static cursorDeltaBasis = new Float32Array(4);

  static cursorBasis2 = new Float32Array(4);

  static viewProjInv = new Float32Array(16);

  static isSMEnabled;

  static isBuildingsLoaded = false;
  static isStaticSMCached = false;

  static lightViewProjMatrix;

  static depthTexture;

  static gridTexture;

  static depthFramebuffer;

  static depthTextureSize = 8192;

  static zNear = 10.0;

  static zFar = 4500.0;

  static canvasWidth;

  static canvasHeight;

  static zNearSM = 0.1;

  static zFarSM = 1200.0;

  static zeroTranslation = [1072, 1360];

  static gridTranslation = [0, 0];

  static gridTranslationY = 0;

  static cursorPosition = [0, 0];

  static gridCursorPosX;

  static gridCursorPosZ;

  static minFov = 35;

  static maxFov = 55;

  static fixedFovValues = [55, 45, 35, 25, 55, 45, 35];

  static fixedRotationTiltValues = [0, 0, 0, 0, -0.8, -0.9, -0.8];

  static fixedCameraHeightValues = [0, 0, 0, 0, 350, 350, 350];

  static START_FIXED_VALUE = 1.0;

  static initialFixedValue = Castle.START_FIXED_VALUE;

  static currentFixedValue = Castle.START_FIXED_VALUE;

  static targetFixedValue = Castle.START_FIXED_VALUE;

  static cameraAnimationSpeed = 4.0;

  static fov = Castle.fixedFovValues[Math.floor(Castle.currentFixedValue)];

  static rotationTilt =
    Castle.fixedRotationTiltValues[Math.floor(Castle.currentFixedValue)];

  static cameraHeight =
    Castle.fixedCameraHeightValues[Math.floor(Castle.currentFixedValue)];

  static doMove = false;
  static wasMoved = false;

  static cursorDeltaPos = [0.0, 0.0];

  static camDeltaPos = [0.0, 0.0];

  static camDeltaPosMinMax = [
    [-50, 10],
    [-50, 10],
  ];

  static loadTime = Date.now();

  static currentTime = Date.now();

  static prevTime = Date.now();

  static deltaTime = 0;

  static scenesJson;

  static globalCanvas;

  static currentSceneName;

  static sceneObjects = [];

  static buildMode = false;

  static buildings = [
    "grid",

    "crystal_farm",
    "food_farm",
    "heavy_farm",
    "light_farm",
    "silver_farm",
    "talent_farm",

    "clan_house",
    "fair",
    "house",
    "library",
    "storage",

    "agility",
    "cunning",
    "health",
    "intelligence",
    "strength",
    "tavern",

    "cat",
    "dog",
    "unicorn",

    "deco_0",
    "deco_1",
    "deco_2",
    "deco_3",
    "deco_4",
    "deco_5",
    "deco_6",
    "deco_7",
    "deco_8",
    "deco_9",
    "deco_10",
    "deco_11",
    "deco_12",
    "deco_13",
    "deco_14",
    "deco_15",
    "deco_16",
    "deco_17",
    "deco_18",
    "deco_19",
    "deco_20",
    "deco_21",
    "deco_22",
    "deco_23",
    "deco_24",
    "deco_25",
    "deco_26",
    "deco_27",
    "deco_28",
    "deco_29",
    "deco_30",
    "deco_31",
    "deco_32",
  ];

  static defaultPlacedBuildings = [
    {
      id: "2",
      rot: 0,
      posX: 39,
      posY: 1,
    },
    {
      id: "1",
      rot: 0,
      posX: 31,
      posY: 1,
    },
    {
      id: "3",
      rot: 2,
      posX: 25,
      posY: 3,
    },
    {
      id: "5",
      rot: 2,
      posX: 39,
      posY: 7,
    },
    {
      id: "11",
      rot: 0,
      posX: 27,
      posY: 15,
    },
    {
      id: "13",
      rot: 0,
      posX: 0,
      posY: 17,
    },
    {
      id: "14",
      rot: 0,
      posX: 5,
      posY: 17,
    },
    {
      id: "15",
      rot: 0,
      posX: 0,
      posY: 22,
    },
    {
      id: "16",
      rot: 0,
      posX: 5,
      posY: 22,
    },
    {
      id: "17",
      rot: 0,
      posX: 0,
      posY: 27,
    },
    {
      id: "18",
      rot: 2,
      posX: 34,
      posY: 21,
    },
    {
      id: "19",
      rot: 2,
      posX: 28,
      posY: 21,
    },
    {
      id: "6",
      rot: 0,
      posX: 10,
      posY: 29,
    },
    {
      id: "20",
      rot: 2,
      posX: 33,
      posY: 9,
    },
    {
      id: "27",
      rot: 0,
      posX: 5,
      posY: 27,
    },
    {
      id: "25",
      rot: 0,
      posX: 0,
      posY: 33,
    },
    {
      id: "10",
      rot: 0,
      posX: 21,
      posY: 20,
    },
    {
      id: "8",
      rot: 0,
      posX: 25,
      posY: 9,
    },
    {
      id: "7",
      rot: 0,
      posX: 18,
      posY: 14,
    },
    {
      id: "12",
      rot: 2,
      posX: 40,
      posY: 14,
    },
  ];

  static placedBuildings = [];

  static buildingBubblesDoms = {};

  static allowedToBuildGridTex = new Uint8Array(64 * 64 * 4).fill(0);
  static allowedToBuildGrid = Array.from(Array(47), () => new Array(38));

  static phantomBuildingSize = 0;
  static phantomBuilding = {
    id: 0,
    rot: 0,
    posX: 0,
    posY: 1000,
  };
  static BUILDING_OUTLINE_BAD = [40, 0, 0, 2];
  static BUILDING_OUTLINE_GOOD = [0, 40, 0, 2];
  static BUILDING_OUTLINE_SELECTION = [40, 40, 0, 2];
  static phantomBuildingIsAllowedToBuild = false;

  static buildingsNames = [
    ["", ""],
    ["pearl_farm_ad", "pearl_farm_doct"],
    ["mushroom_farm_ad", "mushroom_farm_doct"],
    ["rubber_tree_ad", "rubber_tree_doct"],
    ["spinning_mill_ad", "spinning_mill_doct"],
    ["weaving_workshop_ad", "weaving_workshop_doct"],
    ["talent_garden_ad", "talent_garden_doct"],
    ["clan_house_ad", "clan_house_doct"],
    ["fair_ad", "fair_doct"],
    ["mansion_ad", "mansion_doct"],
    ["library_ad", "library_doct"],
    ["storage_ad", "storage_doct"],
    ["arena_ad", "arena_doct"],
    ["spire_ad", "spire_doct"],
    ["alcove_ad", "alcove_doct"],
    ["temple_ad", "temple_doct"],
    ["monument_ad", "monument_doct"],
    ["tea_house_ad", "tea_house_doct"],
    ["cat_house_ad", "cat_house_doct"],
    ["dog_house_ad", "dog_house_doct"],
    ["unicorn_house_ad", "unicorn_house_doct"],
    ["scarlet_flower_ad", "scarlet_flower_doct"],
    ["amber_flower_ad", "amber_flower_doct"],
    ["signpost_ad", "signpost_doct"],
    ["statue_ad", "statue_doct"],
    ["drums_ad", "drums_doct"],
    ["palm_with_bird_ad", "palm_with_bird_doct"],
    ["fountain_ad", "fountain_doct"],
    ["lantern_shop_ad", "lantern_shop_doct"],
    ["crimson_bush_ad", "crimson_bush_doct"],
    ["azure_bush_ad", "azure_bush_doct"],
    ["crimson_inflorescence_ad", "crimson_inflorescence_doct"],
    ["purple_inflorescence_ad", "purple_inflorescence_doct"],
    ["hedge_ad", "hedge_doct"],
    ["hedge_flowering_ad", "hedge_flowering_doct"],
    ["hedge_flowering2_ad", "hedge_flowering2_doct"],
    ["column_ad", "column_doct"],
    ["flower_bed_ad", "flower_bed_doct"],
    ["flower_bed2_ad", "flower_bed2_doct"],
    ["flower_bed3_ad", "flower_bed3_doct"],
    ["flower_bed4_ad", "flower_bed4_doct"],
    ["small_tree_ad", "small_tree_doct"],
    ["blooming_sakura_ad", "blooming_sakura_doct"],
    ["bonsai_ad", "bonsai_doct"],
    ["blooming_bonsai_ad", "blooming_bonsai_doct"],
    ["reed_tower_ad", "reed_tower_doct"],
    ["miniature_garden_ad", "miniature_garden_doct"],
    ["big_sakura_ad", "big_sakura_doct"],
    ["huge_cactus_ad", "huge_cactus_doct"],
    ["rafflesia_ad", "rafflesia_doct"],
    ["flytrap_ad", "flytrap_doct"],
    ["figured_reed_ad", "figured_reed_doct"],
    ["banana_palm_ad", "banana_palm_doct"],
    ["coconut_palm_ad", "coconut_palm_doct"],
  ];

  static filter = RegExp("", "");

  static toggleMusic(layer, value) {
    Castle.music[layer] = value ? value : !Castle.music[layer];
    if (Castle.music.includes(false)) {
      Sound.pause("castle");
    } else {
      Sound.unpause("castle");
      Sound.setVolume("castle", Castle.GetVolume(Castle.AUDIO_MUSIC));
    }
  }

  static toggleRender(layer, value) {
    Castle.render[layer] = value ? value : !Castle.render[layer];
  }

  static zoom(event) {
    if (Math.abs(Castle.currentFixedValue - Castle.targetFixedValue) > 0.04) {
      // camera animation is not finished
      return;
    }
    // Reset
    Castle.currentFixedValue = Castle.targetFixedValue;

    Castle.initialFixedValue = Castle.currentFixedValue;
    // Setup new target
    Castle.targetFixedValue =
      Castle.currentFixedValue + (event.deltaY > 0 ? -1 : +1);

    Castle.targetFixedValue = Castle.clamp(
      Castle.targetFixedValue,
      0,
      Castle.fixedFovValues.length - 1,
    );
  }

  static prepareMove(event) {
    if (Castle.phantomBuilding.id == 0) {
      Castle.doMove = true;
    }
  }

  static stopMove(event) {
    Castle.doMove = false;
    setTimeout((_) => {
      Castle.wasMoved = false;
    }, 100);
  }

  static updateFilter(pattern, flags) {
    Castle.filter = RegExp(pattern, flags);
  }

  static moveMouse(event) {
    if (Castle.doMove) {
      Castle.cursorDeltaPos[0] = event.movementX * 2.0;

      Castle.cursorDeltaPos[1] = event.movementY * 2.0;

      if (Math.abs(event.movementX + event.movementY) > 0.1) {
        Castle.wasMoved = true;
      }
    } else {
      Castle.cursorDeltaPos[0] = 0;

      Castle.cursorDeltaPos[1] = 0;
    }

    Castle.cursorPosition[0] = event.offsetX;

    Castle.cursorPosition[1] = event.offsetY;

    let shift = [Castle.gridTranslation[0], Castle.gridTranslation[1]];
    if (
      Castle.phantomBuilding.id > 0 &&
      Castle.gridCursorPosX &&
      Castle.gridCursorPosX
    ) {
      const size =
        Castle.sceneBuildings[Castle.buildings[Castle.phantomBuilding.id]]
          .size[0];
      Castle.phantomBuilding.posX = Math.floor(
        (shift[0] - Castle.gridCursorPosX) / 7.0 - size / 2.0,
      );
      Castle.phantomBuilding.posY =
        Math.floor((shift[1] - Castle.gridCursorPosZ) / 7.0 - size / 2.0) + 17;
      Castle.phantomBuildingSize = size;

      Castle.phantomBuildingIsAllowedToBuild = Castle.isBuildingAllowed(
        Castle.phantomBuilding.posX,
        Castle.phantomBuilding.posY,
        size,
      );
    }
  }

  static isBuildingAllowed(posX, posY, size) {
    Castle.UpdateGridImage();
    const posXMax = posX + size - 1;
    const posYMax = posY + size - 1;
    if (posX < 0 || posY < 0) {
      return false;
    }
    if (posXMax > 45 || posYMax > 37) {
      return false;
    }
    // Castle zone
    if (posX < 31 && posY < 3) {
      return false;
    }
    if (posX < 23 && posY < 8) {
      return false;
    }
    if (posX < 22 && posY < 14) {
      return false;
    }
    if (posX < 18 && posY < 17) {
      return false;
    }
    if (posXMax > 9 && posX < 18 && posY == 17) {
      return false;
    }
    // Bottom corner
    if (posXMax > 28 || posYMax > 20) {
      if (45 - posYMax + 37 - posXMax < 17) {
        return false;
      }
    }
    // Left corner
    if (posXMax > 43 || posY < 2) {
      if (45 - posXMax + posY < 2) {
        return false;
      }
    }
    // Right corner
    if (posX < 2 || posYMax > 35) {
      if (posX + 37 - posYMax < 2) {
        return false;
      }
    }
    for (let i = 0; i < size; ++i) {
      for (let j = 0; j < size; ++j) {
        if (Castle.allowedToBuildGrid[posX + i][posY + j]) {
          return false;
        }
      }
    }
    return true;
  }

  static UpdateGridImage() {
    let data = Castle.allowedToBuildGridTex;
    for (let i = 0; i < data.length / 4; ++i) {
      let posX = i % 64;
      let posY = Math.floor(i / 64);
      data[i * 4] = 0; // R (красный)
      data[i * 4 + 1] = 0; // G (зеленый)
      data[i * 4 + 2] = 0; // B (синий)
      data[i * 4 + 3] = 0; // A (альфа, непрозрачность)
      if (posX < 47 && posY < 38) {
        if (
          Castle.phantomBuilding.id &&
          posX >= Castle.phantomBuilding.posX &&
          posY >= Castle.phantomBuilding.posY &&
          posX < Castle.phantomBuilding.posX + Castle.phantomBuildingSize &&
          posY < Castle.phantomBuilding.posY + Castle.phantomBuildingSize
        ) {
          data[i * 4] = Castle.phantomBuildingIsAllowedToBuild ? 0 : 255; // R (красный)
          data[i * 4 + 1] = Castle.phantomBuildingIsAllowedToBuild ? 255 : 106; // G (зеленый)
          data[i * 4 + 2] = 0; // B (синий)
          data[i * 4 + 3] = 255; // A (альфа, непрозрачность)
        }
        if (Castle.allowedToBuildGrid[posX][posY]) {
          data[i * 4] = 255; // R (красный)
          data[i * 4 + 1] = 0; // G (зеленый)
          data[i * 4 + 2] = 0; // B (синий)
          data[i * 4 + 3] = 255; // A (альфа, непрозрачность)
        }
      }
    }
  }

  static UpdateAllowedToBuildGrid() {
    Castle.allowedToBuildGrid = Array.from(Array(47), () => new Array(38));
    for (const placedBuilding of Castle.placedBuildings) {
      const pbSize =
        Castle.sceneBuildings[Castle.buildings[placedBuilding.id]].size[0];
      for (let i = 0; i < pbSize; ++i) {
        for (let j = 0; j < pbSize; ++j) {
          Castle.allowedToBuildGrid[placedBuilding.posX + i][
            placedBuilding.posY + j
          ] = 1;
        }
      }
    }
  }

  static placePhantomBuilding() {
    if (Castle.phantomBuildingIsAllowedToBuild) {
      Castle.placedBuildings.push(Object.assign({}, Castle.phantomBuilding));
      Castle.isStaticSMCached = false;
      Castle.WriteBuildings();
    }
  }

  static findAndRotateBuilding(posX, posY) {
    for (let b = 0; b < Castle.placedBuildings.length; ++b) {
      let building = Castle.placedBuildings[b];
      if (building.posX == posX && building.posY == posY) {
        building.rot = (building.rot + 1) % 4;
        Castle.isStaticSMCached = false;
        Castle.WriteBuildings();
        return;
      }
    }
  }

  static findAndDeleteBuilding(posX, posY) {
    for (let b = 0; b < Castle.placedBuildings.length; ++b) {
      let building = Castle.placedBuildings[b];
      if (building.posX == posX && building.posY == posY) {
        Castle.placedBuildings.splice(b, 1);
        Castle.isStaticSMCached = false;
        Castle.WriteBuildings();
        return;
      }
    }
  }

  static GetLauncherFilePath(fileName) {
    const homeDir = NativeAPI.os.homedir();
    let pwcLauncherDir = NativeAPI.path.join(homeDir, "Prime World Classic");
    return NativeAPI.path.join(pwcLauncherDir, fileName);
  }

  static async ensureCastleFile() {
    const homeDir = NativeAPI.os.homedir();
    let pwcLauncherDir = NativeAPI.path.join(homeDir, "Prime World Classic");
    let castleFilePath = Castle.GetLauncherFilePath("castle.cfg");
    try {
      await NativeAPI.fileSystem.promises.mkdir(pwcLauncherDir, {
        recursive: true,
      });
      await NativeAPI.fileSystem.promises.access(castleFilePath);
      return true;
    } catch (e) {
      await Castle.WriteDefaultBuildings();
      return false;
    }
  }

  static async WriteDefaultBuildings() {
    Castle.placedBuildings = JSON.parse(
      JSON.stringify(Castle.defaultPlacedBuildings),
    );
    await Castle.WriteBuildings();
  }

  static async ReadBuildings() {
    if (!NativeAPI.status) {
      Castle.placedBuildings = Castle.defaultPlacedBuildings;
      Castle.UpdateAllowedToBuildGrid();
      return;
    }

    let castleFilePath = Castle.GetLauncherFilePath("castle.cfg");
    try {
      if (await Castle.ensureCastleFile()) {
        const data = await NativeAPI.fileSystem.promises.readFile(
          castleFilePath,
          "utf-8",
        );
        Castle.placedBuildings = JSON.parse(data);
      }
    } catch (e) {
      Castle.placedBuildings = Castle.defaultPlacedBuildings;
    }
    Castle.UpdateAllowedToBuildGrid();
  }

  static async WriteBuildings() {
    if (!NativeAPI.status) {
      Castle.UpdateAllowedToBuildGrid();
      return;
    }

    let castleFilePath = Castle.GetLauncherFilePath("castle.cfg");
    try {
      await NativeAPI.fileSystem.promises.writeFile(
        castleFilePath,
        JSON.stringify(Castle.placedBuildings, null, 2),
        "utf-8",
      );
    } catch (e) {
      App.error(e);
    }
    Castle.UpdateAllowedToBuildGrid();
  }

  static async loadBuildings() {
    await Castle.ReadBuildings();
    Castle.isBuildingsLoaded = true;

    window.addEventListener("beforeunload", () => {
      Castle.WriteBuildings();
    });
  }

  static async initDemo(sceneName, canvas) {
    Castle.currentSceneName = sceneName;

    Castle.shaderFactionDef = sceneName == "doct" ? "SCENE_DOCT" : "SCENE_AD";

    window.addEventListener(
      "resize",
      function (event) {
        canvas.width = document.body.offsetWidth;

        canvas.height = document.body.offsetHeight;

        Castle.canvasWidth = canvas.width;

        Castle.canvasHeight = canvas.height;

        Castle.cursorPosition = [Castle.canvasWidth, Castle.canvasHeight];
      },
      true,
    );

    canvas.addEventListener("click", function (event) {
      if (Castle.phantomBuilding.id > 0) {
        Castle.placePhantomBuilding();
      } else {
        if (Castle.outlinedBuilding && !Castle.wasMoved) {
          if (Castle.buildMode) {
            Castle.findAndRotateBuilding(
              Castle.outlinedBuilding.position[0],
              Castle.outlinedBuilding.position[1],
            );
          } else {
            if (Castle.outlinedBuilding.name in CastleBuildingsEvents) {
              CastleBuildingsEvents[Castle.outlinedBuilding.name]();
            }
          }
        }
      }
    });

    Castle.globalCanvas = canvas;

    canvas.onwheel = Castle.zoom;

    //var canvas = document.getElementById('game-surface');

    canvas.width = document.body.offsetWidth;

    canvas.height = document.body.offsetHeight;

    canvas.onmousedown = Castle.prepareMove;

    canvas.onmouseup = Castle.stopMove;

    oncontextmenu = (event) => {
      event.preventDefault();
      Castle.phantomBuilding.id = 0;
      Castle.phantomBuilding.posX = 0;
      Castle.phantomBuilding.posY = 1000;
      if (Castle.buildMode && Castle.outlinedBuilding) {
        Castle.findAndDeleteBuilding(
          Castle.outlinedBuilding.position[0],
          Castle.outlinedBuilding.position[1],
        );
      }
    };

    canvas.addEventListener("mousemove", Castle.moveMouse);

    Castle.gl = canvas.getContext("webgl");

    if (!Castle.gl) {
      console.log("WebGL not supported, falling back on experimental-webgl");
      Castle.gl = canvas.getContext("experimental-webgl");
    }

    if (!Castle.gl) {
      console.error("Your browser does not support WebGL");
      return 1;
    }

    Castle.gl.enable(Castle.gl.DEPTH_TEST);
    Castle.gl.enable(Castle.gl.CULL_FACE);
    Castle.gl.frontFace(Castle.gl.CCW);
    Castle.gl.cullFace(Castle.gl.FRONT);

    Castle.viewMatrix = new Float32Array(16);
    Castle.viewMatrix2 = new Float32Array(16);
    Castle.projMatrix = new Float32Array(16);
    Castle.viewProjMatr = new Float32Array(16);
    Castle.flipMatr = new Float32Array([
      -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    Castle.canvasWidth = canvas.width;
    Castle.canvasHeight = canvas.height;
    Castle.cursorPosition = [Castle.canvasWidth, Castle.canvasHeight];

    Castle.isSMEnabled = true;

    const ext = Castle.gl.getExtension("WEBGL_depth_texture");

    if (!ext) {
      Castle.isSMEnabled = false;
    }

    if (Castle.isSMEnabled) {
      // Setup matrix. Only one viewProj is needed
      let lightViewMatrix = new Float32Array(16);
      let lightViewMatrix2 = new Float32Array(16);
      let lightProjMatrix = new Float32Array(16);
      Castle.lightViewProjMatrix = new Float32Array(16);
      mat4.ortho(
        lightProjMatrix,
        -400,
        400,
        -400,
        400,
        Castle.zNearSM,
        Castle.zFarSM,
      );

      let smCamParams = [
        {
          name: "ad",
          camPos: [-1239.6, -151, -1433],
          camRot: [-2.29, 2.813, 3.14],
        },
        {
          name: "doct",
          camPos: [-1395.8, -291.7, -1338.5],
          camRot: [-2.4, -1.423, 3.14],
        },
      ];

      let quatStart = quat.create();
      quat.identity(quatStart);
      let quatX = quat.create();
      let quatY = quat.create();
      let quatZ = quat.create();

      let smCam = smCamParams.find((value) => value.name === sceneName);
      quat.rotateX(quatX, quatStart, smCam.camRot[0]);
      quat.rotateY(quatY, quatX, smCam.camRot[1]);
      quat.rotateZ(quatZ, quatY, smCam.camRot[2]);

      mat4.fromRotationTranslation(lightViewMatrix, quatZ, vec3.create());
      mat4.translate(lightViewMatrix, lightViewMatrix, smCam.camPos);
      mat4.multiply(lightViewMatrix2, Castle.flipMatr, lightViewMatrix);
      mat4.multiply(
        Castle.lightViewProjMatrix,
        lightProjMatrix,
        lightViewMatrix2,
      );

      Castle.gridTexture = Castle.gl.createTexture();
      Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.gridTexture);
      Castle.gl.texImage2D(
        Castle.gl.TEXTURE_2D, // target
        0, // mip level
        Castle.gl.RGBA, // internal format
        64, // width
        64, // height
        0, // border
        Castle.gl.RGBA,
        Castle.gl.UNSIGNED_BYTE,
        null,
      ); // data
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_MAG_FILTER,
        Castle.gl.NEAREST,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_MIN_FILTER,
        Castle.gl.NEAREST,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_WRAP_S,
        Castle.gl.CLAMP_TO_EDGE,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_WRAP_T,
        Castle.gl.CLAMP_TO_EDGE,
      );

      // Setup textures
      Castle.depthTexture = Castle.gl.createTexture();
      Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.depthTexture);
      Castle.gl.texImage2D(
        Castle.gl.TEXTURE_2D, // target
        0, // mip level
        Castle.gl.DEPTH_COMPONENT, // internal format
        Castle.depthTextureSize, // width
        Castle.depthTextureSize, // height
        0, // border
        Castle.gl.DEPTH_COMPONENT, // format
        Castle.gl.UNSIGNED_INT, // type
        null,
      ); // data
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_MAG_FILTER,
        Castle.gl.NEAREST,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_MIN_FILTER,
        Castle.gl.NEAREST,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_WRAP_S,
        Castle.gl.REPEAT,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_WRAP_T,
        Castle.gl.REPEAT,
      );

      Castle.depthFramebuffer = Castle.gl.createFramebuffer();
      Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, Castle.depthFramebuffer);
      Castle.gl.framebufferTexture2D(
        Castle.gl.FRAMEBUFFER, // target
        Castle.gl.DEPTH_ATTACHMENT, // attachment point
        Castle.gl.TEXTURE_2D, // texture target
        Castle.depthTexture, // texture
        0,
      ); // mip level

      const unusedTexture = Castle.gl.createTexture();
      Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, unusedTexture);
      Castle.gl.texImage2D(
        Castle.gl.TEXTURE_2D,
        0,
        Castle.gl.RGBA,
        Castle.depthTextureSize,
        Castle.depthTextureSize,
        0,
        Castle.gl.RGBA,
        Castle.gl.UNSIGNED_BYTE,
        null,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_MAG_FILTER,
        Castle.gl.NEAREST,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_MIN_FILTER,
        Castle.gl.NEAREST,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_WRAP_S,
        Castle.gl.REPEAT,
      );
      Castle.gl.texParameteri(
        Castle.gl.TEXTURE_2D,
        Castle.gl.TEXTURE_WRAP_T,
        Castle.gl.REPEAT,
      );

      // attach it to the framebuffer
      Castle.gl.framebufferTexture2D(
        Castle.gl.FRAMEBUFFER, // target
        Castle.gl.COLOR_ATTACHMENT0, // attachment point
        Castle.gl.TEXTURE_2D, // texture target
        unusedTexture, // texture
        0,
      ); // mip level
    }

    let shaderNames = [],
      texNames = [];
    Castle.sceneBuildings = new Object();

    let sceneMeshesToLoadCount = -1; // Initial value. Scene must have objects

    let result = await HTTP.request("content/scenes.json");

    Castle.scenesJson = result;

    Castle.currentScene = result.scenes.find(
      (value) => value.sceneName === sceneName,
    );

    sceneMeshesToLoadCount =
      Castle.currentScene.objects.length + Castle.currentScene.buildings.length; // Set scene objects count to some valid value

    let loadedBuildings = [];

    loadedBuildings.push(Castle.currentScene.buildings);

    for (let obj of Castle.currentScene.objects) {
      Castle.sceneObjects.push({
        meshName: obj.mesh,
        meshData: {},
        shader: obj.shader,
        shaderId: {},
        blend: obj.blend,
        tintColor: obj.tintColor,
        uvScale: obj.uvScale,
        uvScroll: obj.uvScroll,
        texture: obj.texture,
        texture_2: obj.texture_2,
        texture_3: obj.texture_3,
        texture_4: obj.texture_4,
        textureId: {},
        texture2Id: {},
        texture3Id: {},
        texture4Id: {},
        strip: obj.strip,
        objRotation: obj.objRotation,
        startFreq: obj.startFreq,
        endAmp: obj.endAmp,
        animDir: obj.animDir,
        transform: obj.transform,
        indexCount: obj.indexCount,
      });

      Castle.loadObjectResources(shaderNames, texNames, obj);

      sceneMeshesToLoadCount--; // Decrement after each loaded object
    }

    Castle.identityMatrix = new Float32Array(16);

    mat4.identity(Castle.identityMatrix);

    for (let building of Castle.currentScene.buildings) {
      let buildingTranslation = building.translation
        ? building.translation
        : [0, 0];

      for (let obj of building.objects) {
        obj.transform[3] -= buildingTranslation[0];

        obj.transform[11] -= buildingTranslation[1];

        if (!(building.name in Castle.sceneBuildings)) {
          Castle.sceneBuildings[building.name] = {
            size: building.size,
            objects: [],
            transparentObjects: [],
          };
        }

        let selectedContainer = obj.blend
          ? Castle.sceneBuildings[building.name].transparentObjects
          : Castle.sceneBuildings[building.name].objects;

        selectedContainer.push({
          meshName: obj.mesh,
          meshData: {},
          shader: obj.shader,
          shaderId: {},
          blend: obj.blend,
          tintColor: obj.tintColor,
          uvScale: obj.uvScale,
          uvScroll: obj.uvScroll,
          texture: obj.texture,
          texture_2: obj.texture_2,
          texture_3: obj.texture_3,
          texture_4: obj.texture_4,
          textureId: {},
          texture2Id: {},
          texture3Id: {},
          texture4Id: {},
          strip: obj.strip,
          objRotation: obj.objRotation,
          startFreq: obj.startFreq,
          endAmp: obj.endAmp,
          animDir: obj.animDir,
          transform: obj.transform,
          indexCount: obj.indexCount,
        });

        Castle.loadObjectResources(shaderNames, texNames, obj);
      }

      sceneMeshesToLoadCount--;
    }

    await Castle.loadResources(
      Castle.sceneObjects,
      Castle.sceneBuildings,
      shaderNames,
      texNames,
    );

    //var canvas = globalCanvas; //document.getElementById('game-surface');

    Castle.globalCanvas.classList.add("castle-fade-in");

    if (NativeAPI.fileSystem && !("castle" in Sound.all)) {
      var soundFiles = NativeAPI.fileSystem.readdirSync(
        "content/sounds/" + sceneName,
      );

      let playCastleMusic = function () {
        let musicName =
          "content/sounds/" +
          sceneName +
          "/" +
          soundFiles[Math.floor(Math.random() * soundFiles.length)];
        Sound.stop("castle");
        Sound.play(
          musicName,
          { id: "castle", volume: Castle.GetVolume(Castle.AUDIO_MUSIC) },
          playCastleMusic,
        );
      };
      playCastleMusic();
    }

    Castle.loadBuildings();

    Castle.MainLoop(
      Castle.sceneObjects,
      Castle.sceneBuildings,
      Castle.sceneShaders,
      Castle.sceneTextures,
    );
  }

  static loadObjectResources(shaderNames, texNames, obj) {
    shaderNames.push(obj.shader);

    texNames.push(obj.texture);

    if (obj.texture_2) {
      texNames.push(obj.texture_2);
    }

    if (obj.texture_3) {
      texNames.push(obj.texture_3);
    }

    if (obj.texture_4) {
      texNames.push(obj.texture_4);
    }
  }

  static uniformLocationCache = new Object();
  static getUniformLocation(program, name) {
    if (program.progId in this.uniformLocationCache) {
      if (name in this.uniformLocationCache[program.progId]) {
        return this.uniformLocationCache[program.progId][name];
      }
    } else {
      this.uniformLocationCache[program.progId] = new Object();
    }
    let uniformLocation = Castle.gl.getUniformLocation(program.prog, name);
    this.uniformLocationCache[program.progId][name] = uniformLocation;
    return uniformLocation;
  }

  static async loadResources(
    sceneObjects,
    sceneBuildings,
    notUniqeShaderNames,
    notUniqeTexNames,
  ) {
    let shaderNames = [...new Set(notUniqeShaderNames)];
    let texNames = [...new Set(notUniqeTexNames)];

    function remapIndices(sceneObjectsContainer, objId) {
      sceneObjectsContainer[objId].shaderId = shaderNames.findIndex(
        (value) => value === sceneObjectsContainer[objId].shader,
      );
      sceneObjectsContainer[objId].textureId = texNames.findIndex(
        (value) => value === sceneObjectsContainer[objId].texture,
      );
      sceneObjectsContainer[objId].texture2Id = texNames.findIndex(
        (value) => value === sceneObjectsContainer[objId].texture_2,
      );
      sceneObjectsContainer[objId].texture3Id = texNames.findIndex(
        (value) => value === sceneObjectsContainer[objId].texture_3,
      );
      sceneObjectsContainer[objId].texture4Id = texNames.findIndex(
        (value) => value === sceneObjectsContainer[objId].texture_4,
      );
    }

    for (var objId = 0; objId < sceneObjects.length; objId++) {
      remapIndices(sceneObjects, objId);
    }
    for (let b in Castle.sceneBuildings) {
      let building = Castle.sceneBuildings[b].objects;
      for (objId = 0; objId < building.length; ++objId) {
        remapIndices(building, objId);
      }

      let buildingTransp = Castle.sceneBuildings[b].transparentObjects;
      for (objId = 0; objId < buildingTransp.length; ++objId) {
        remapIndices(buildingTransp, objId);
      }
    }

    Castle.sceneTextures = new Array(texNames.length);
    let loaded = { mesh: 0, texture: 0, shader: 0 };

    Castle.sceneShaders = new Array(shaderNames.length);

    let vsText = await HTTP.request(`content/shaders/shader.vs.glsl`, "text");

    let fsText = await HTTP.request(`content/shaders/shader.fs.glsl`, "text");

    for (let i = 0; i < shaderNames.length; ++i) {
      let definesText = await HTTP.request(
        `content/shaders/${shaderNames[i]}.glsl`,
        "text",
      );

      let programColor = Castle.prepareShader(
        `\n#define RENDER_PASS_COLOR\n #define ${Castle.shaderFactionDef}`,
        definesText,
        vsText,
        fsText,
      );

      let programSM = Castle.prepareShader(
        `\n#define RENDER_PASS_SM\n #define ${Castle.shaderFactionDef}`,
        definesText,
        vsText,
        fsText,
      );

      Castle.sceneShaders[i] = {
        PSO: programColor,
        PSO_SM: programSM,
        attributes: Castle.scenesJson.shaderLayouts.find(
          (value) => value.name === shaderNames[i],
        ).layout,
        vertStride: 0,
      };

      loaded.shader++;
    }

    for (let i = 0; i < texNames.length; ++i) {
      Castle.sceneTextures[i] = Castle.loadTexture(
        await PreloadImages.loadAsync(`content/textures/${texNames[i]}.webp`),
      );

      loaded.texture++;
    }

    for (let i = 0; i < sceneObjects.length; ++i) {
      await Castle.loadMesh(shaderNames, sceneObjects, i);

      loaded.mesh++;
    }

    let totalMeshes = Castle.sceneObjects.length;

    for (let buildingMain in Castle.sceneBuildings) {
      let building = Castle.sceneBuildings[buildingMain].objects;

      for (let objId = 0; objId < building.length; ++objId) {
        await Castle.loadMesh(shaderNames, building, objId);
      }

      totalMeshes += building.length;

      let buildingTransp =
        Castle.sceneBuildings[buildingMain].transparentObjects;

      for (let objId = 0; objId < buildingTransp.length; ++objId) {
        await Castle.loadMesh(shaderNames, buildingTransp, objId);
      }

      totalMeshes += buildingTransp.length;
    }
  }

  static uniqueProgCounter = 0;

  static shaderFactionDef = "INVALID_DEFINE";

  static prepareShader(renderPassDefine, definesText, vsText, fsText) {
    let vertexShader = Castle.gl.createShader(Castle.gl.VERTEX_SHADER),
      fragmentShader = Castle.gl.createShader(Castle.gl.FRAGMENT_SHADER);

    Castle.gl.shaderSource(
      vertexShader,
      definesText + renderPassDefine + vsText,
    );

    Castle.gl.shaderSource(
      fragmentShader,
      definesText + renderPassDefine + fsText,
    );

    Castle.gl.compileShader(vertexShader);

    if (!Castle.gl.getShaderParameter(vertexShader, Castle.gl.COMPILE_STATUS)) {
      console.error(
        "ERROR compiling vertex shader!",
        Castle.gl.getShaderInfoLog(vertexShader),
      );

      return 1;
    }

    Castle.gl.compileShader(fragmentShader);

    if (
      !Castle.gl.getShaderParameter(fragmentShader, Castle.gl.COMPILE_STATUS)
    ) {
      console.error(
        "ERROR compiling fragment shader!",
        Castle.gl.getShaderInfoLog(fragmentShader),
      );

      return 1;
    }
    //console.log('Loaded shader ' + shaderNames[shaderId]);
    let program = {
      prog: Castle.gl.createProgram(),
      progId: this.uniqueProgCounter++,
    };

    Castle.gl.attachShader(program.prog, vertexShader);

    Castle.gl.attachShader(program.prog, fragmentShader);

    Castle.gl.linkProgram(program.prog);

    if (!Castle.gl.getProgramParameter(program.prog, Castle.gl.LINK_STATUS)) {
      console.error(
        "ERROR linking program!",
        Castle.gl.getProgramInfoLog(program.prog),
      );

      return 1;
    }

    Castle.gl.validateProgram(program.prog);

    if (
      !Castle.gl.getProgramParameter(program.prog, Castle.gl.VALIDATE_STATUS)
    ) {
      console.error(
        "ERROR validating program!",
        Castle.gl.getProgramInfoLog(program.prog),
      );

      return 1;
    }

    return program;
  }

  static lerp(a, b, alpha) {
    return a + alpha * (b - a);
  }
  static clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  static loadTexture(image) {
    let texture = Castle.gl.createTexture();

    Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, texture);

    Castle.gl.texParameteri(
      Castle.gl.TEXTURE_2D,
      Castle.gl.TEXTURE_WRAP_S,
      Castle.gl.REPEAT,
    );

    Castle.gl.texParameteri(
      Castle.gl.TEXTURE_2D,
      Castle.gl.TEXTURE_WRAP_T,
      Castle.gl.REPEAT,
    );

    Castle.gl.texParameteri(
      Castle.gl.TEXTURE_2D,
      Castle.gl.TEXTURE_MIN_FILTER,
      Castle.gl.LINEAR,
    );

    Castle.gl.texParameteri(
      Castle.gl.TEXTURE_2D,
      Castle.gl.TEXTURE_MAG_FILTER,
      Castle.gl.LINEAR,
    );

    Castle.gl.texImage2D(
      Castle.gl.TEXTURE_2D,
      0,
      Castle.gl.RGBA,
      Castle.gl.RGBA,
      Castle.gl.UNSIGNED_BYTE,
      image,
    );

    Castle.gl.generateMipmap(Castle.gl.TEXTURE_2D);

    return texture;
  }

  static async loadMesh(shaderNames, sceneObjectsContainer, objectId) {
    let meshData = await HTTP.request(
      `content/meshes/${sceneObjectsContainer[objectId].meshName}`,
      "arrayBuffer",
    );

    let vertices = Castle.gl.createBuffer();

    let meshFloat = new Float32Array(meshData);

    Castle.gl.bindBuffer(Castle.gl.ARRAY_BUFFER, vertices);

    Castle.gl.bufferData(
      Castle.gl.ARRAY_BUFFER,
      meshFloat,
      Castle.gl.STATIC_DRAW,
    );

    let attributes = Castle.scenesJson.shaderLayouts.find(
      (value) =>
        value.name === shaderNames[sceneObjectsContainer[objectId].shaderId],
    ).layout;

    let vertStride = 0;

    for (let attribute of attributes) {
      vertStride += attribute.count * attribute.sizeElem;
    }

    let indexCount = meshFloat.length / (vertStride / 4);

    if (indexCount != sceneObjectsContainer[objectId].indexCount) {
      console.error("Fatal error getting index count (" + meshName + ")");
    }

    sceneObjectsContainer[objectId].meshData = {
      vertices: vertices,
      vertStride: vertStride,
      indexCount: meshFloat.length / (vertStride / 4),
    };

    // Add up first vertex as base offset
    if (sceneObjectsContainer[objectId].startFreq) {
      sceneObjectsContainer[objectId].startFreq[0] += meshFloat[0];
      sceneObjectsContainer[objectId].startFreq[1] += meshFloat[1];
      sceneObjectsContainer[objectId].startFreq[2] += meshFloat[2];
    }

    if (sceneObjectsContainer[objectId].endAmp) {
      sceneObjectsContainer[objectId].endAmp[0] += meshFloat[0];
      sceneObjectsContainer[objectId].endAmp[1] += meshFloat[1];
      sceneObjectsContainer[objectId].endAmp[2] += meshFloat[2];
    }

    //console.log('Loaded mesh ' + meshName);
  }

  static MainLoop(sceneObjects, sceneBuildings, sceneShaders, sceneTextures) {
    if (Castle.sceneBuildings) {
      var gridBuilding = Castle.sceneBuildings["grid"];

      var gridTransform = gridBuilding.transparentObjects[0].transform;

      Castle.gridTranslation = [gridTransform[3], gridTransform[11]];

      Castle.gridTranslationY = gridTransform[7];
    } else {
      Castle.gridTranslation = [0, 0];
    }
    requestAnimationFrame(Castle.loop);
  }

  static loop() {
    let isStopRender = Castle.render.includes(false);
    if (isStopRender) {
      requestAnimationFrame(Castle.loop);
      return;
    }

    Castle.prevTime = Castle.currentTime;

    Castle.currentTime = (Date.now() - Castle.loadTime) / 1000.0;

    Castle.deltaTime = Castle.currentTime - Castle.prevTime;

    // Update cam behaviour

    let factor = Castle.clamp(
      Castle.cameraAnimationSpeed * Castle.deltaTime,
      0,
      1,
    );

    Castle.currentFixedValue = Castle.lerp(
      Castle.currentFixedValue,
      Castle.targetFixedValue,
      factor,
    );

    let targetFovs = [
      Castle.fixedFovValues[Math.round(Castle.initialFixedValue)],
      Castle.fixedFovValues[Math.round(Castle.targetFixedValue)],
    ];

    let targetRots = [
      Castle.fixedRotationTiltValues[Math.round(Castle.initialFixedValue)],
      Castle.fixedRotationTiltValues[Math.round(Castle.targetFixedValue)],
    ];

    let targetCHVs = [
      Castle.fixedCameraHeightValues[Math.round(Castle.initialFixedValue)],
      Castle.fixedCameraHeightValues[Math.round(Castle.targetFixedValue)],
    ];

    let camLerp = Math.abs(Castle.initialFixedValue - Castle.currentFixedValue);

    Castle.fov = Castle.lerp(targetFovs[0], targetFovs[1], camLerp);

    Castle.rotationTilt = Castle.lerp(targetRots[0], targetRots[1], camLerp);

    Castle.cameraHeight = Castle.lerp(targetCHVs[0], targetCHVs[1], camLerp);

    let buildingsToDraw = [];

    for (let building of Castle.placedBuildings) {
      var mesh = Castle.sceneBuildings[Castle.buildings[building.id]];
      buildingsToDraw.push({
        mesh: mesh,
        rotation: building.rot * 1.57,
        position: [building.posX, building.posY],
        name: Castle.buildings[building.id],
        translation: [
          Castle.zeroTranslation[0] +
            (building.posX * 7.0 + (mesh.size[0] / 2.0) * 7.0),
          1,
          Castle.zeroTranslation[1] +
            ((building.posY - 17) * 7.0 + (mesh.size[1] / 2.0) * 7.0),
        ],
      });
    }
    if (Castle.buildMode && Castle.phantomBuilding.id > 0) {
      var mesh = Castle.sceneBuildings["grid"];
      buildingsToDraw.push({
        mesh: mesh,
        rotation: 0,
        position: [0, 0],
        name: "grid",
        translation: [
          Castle.zeroTranslation[0] + (mesh.size[0] / 2.0) * 7.0,
          1,
          Castle.zeroTranslation[1] + (mesh.size[1] / 2.0) * 7.0,
        ],
      });
    }

    Castle.updateMainCam();

    let outlinedBuilding = -1;
    Castle.outlinedBuilding = null;
    if (Object.keys(Window.windows).length === 0) {
      // do not outline when any window is active
      if (Castle.phantomBuilding.id > 0) {
        let building = Castle.phantomBuilding;
        var mesh = Castle.sceneBuildings[Castle.buildings[building.id]];
        buildingsToDraw.push({
          outlined: true,
          mesh: mesh,
          rotation: building.rot * 1.57,
          position: [building.posX, building.posY],
          name: Castle.buildings[building.id],
          translation: [
            Castle.zeroTranslation[0] +
              (building.posX * 7.0 + (mesh.size[0] / 2.0) * 7.0),
            1,
            Castle.zeroTranslation[1] +
              ((building.posY - 17) * 7.0 + (mesh.size[1] / 2.0) * 7.0),
          ],
        });
        outlinedBuilding = buildingsToDraw.length - 1;
      } else {
        for (let i = 0; i < buildingsToDraw.length; ++i) {
          let building = buildingsToDraw[i];
          let shift = [
            Castle.zeroTranslation[0] + Castle.gridTranslation[0],
            Castle.zeroTranslation[1] + Castle.gridTranslation[1],
          ];
          if (
            shift[0] - Castle.gridCursorPosX >
              building.translation[0] - (building.mesh.size[0] / 2) * 7 &&
            shift[0] - Castle.gridCursorPosX <
              building.translation[0] + (building.mesh.size[1] / 2) * 7 &&
            shift[1] - Castle.gridCursorPosZ >
              building.translation[2] - (building.mesh.size[1] / 2) * 7 &&
            shift[1] - Castle.gridCursorPosZ <
              building.translation[2] + (building.mesh.size[1] / 2) * 7 &&
            (buildingsToDraw[i].name in CastleBuildingsEvents ||
              Castle.buildMode)
          ) {
            outlinedBuilding = i;
            Castle.outlinedBuilding = buildingsToDraw[outlinedBuilding];
            break;
          }
        }
      }
    }

    if (
      Castle.isSMEnabled &&
      !Castle.isStaticSMCached &&
      Castle.sceneObjects &&
      Castle.isBuildingsLoaded
    ) {
      Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, Castle.depthFramebuffer);
      Castle.gl.viewport(
        0,
        0,
        Castle.depthTextureSize,
        Castle.depthTextureSize,
      );
      Castle.gl.clear(Castle.gl.COLOR_BUFFER_BIT | Castle.gl.DEPTH_BUFFER_BIT);

      for (let i = 0; i < Castle.sceneObjects.length; ++i) {
        let obj = Castle.sceneObjects[i];
        if (obj.blend) break;
        Castle.prepareAndDrawObject(obj, true);
      }
      for (let buildingToDraw of buildingsToDraw) {
        for (let i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
          if (!buildingToDraw.outlined) {
            Castle.prepareAndDrawObject(
              buildingToDraw.mesh.objects[i],
              true,
              buildingToDraw.rotation,
              buildingToDraw.translation,
            );
          }
        }
      }
      Castle.isStaticSMCached = true;
    }

    Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, null);
    Castle.gl.viewport(0, 0, Castle.gl.canvas.width, Castle.gl.canvas.height);
    Castle.gl.clearColor(0.75, 0.85, 0.8, 1.0);
    Castle.gl.clear(Castle.gl.COLOR_BUFFER_BIT | Castle.gl.DEPTH_BUFFER_BIT);

    if (Castle.sceneObjects) {
      let blendsFrom;
      for (let i = 0; i < Castle.sceneObjects.length; ++i) {
        if (Castle.sceneObjects[i].blend) {
          blendsFrom = i;
          break;
        }
        Castle.prepareAndDrawObject(Castle.sceneObjects[i], false);
      }

      if (outlinedBuilding >= 0) {
        Castle.gl.disable(Castle.gl.DEPTH_TEST);
        Castle.gl.depthMask(false);
        let buildingToDraw = buildingsToDraw[outlinedBuilding];
        let outlineColor = Castle.BUILDING_OUTLINE_GOOD;
        if (Castle.buildMode) {
          outlineColor = Castle.BUILDING_OUTLINE_SELECTION;
          if (Castle.phantomBuilding.id > 0) {
            outlineColor = Castle.phantomBuildingIsAllowedToBuild
              ? Castle.BUILDING_OUTLINE_GOOD
              : Castle.BUILDING_OUTLINE_BAD;
          }
        }
        for (let i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
          let outlinedTranslation = [
            buildingToDraw.translation[0],
            buildingToDraw.translation[1],
            buildingToDraw.translation[2],
          ];
          outlinedTranslation[1] -= 6.0 / buildingToDraw.mesh.size[0];
          Castle.prepareAndDrawObject(
            buildingToDraw.mesh.objects[i],
            false,
            buildingToDraw.rotation,
            outlinedTranslation,
            outlineColor,
            1.0 + 0.16 / Math.pow(buildingToDraw.mesh.size[0], 3 / 4),
          );
        }
        Castle.gl.enable(Castle.gl.DEPTH_TEST);
        Castle.gl.depthMask(true);
      }

      for (let buildingToDraw of buildingsToDraw) {
        for (let i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
          Castle.prepareAndDrawObject(
            buildingToDraw.mesh.objects[i],
            false,
            buildingToDraw.rotation,
            buildingToDraw.translation,
          );
        }
      }

      for (let i = blendsFrom; i < Castle.sceneObjects.length; ++i) {
        Castle.prepareAndDrawObject(Castle.sceneObjects[i], false);
      }

      for (let buildingToDraw of buildingsToDraw) {
        for (
          let i = 0;
          i < buildingToDraw.mesh.transparentObjects.length;
          ++i
        ) {
          Castle.prepareAndDrawObject(
            buildingToDraw.mesh.transparentObjects[i],
            false,
            buildingToDraw.rotation,
            buildingToDraw.translation,
          );
        }
      }
    }
    Castle.gl.disable(Castle.gl.BLEND);
    Castle.gl.enable(Castle.gl.CULL_FACE);
    Castle.gl.colorMask(true, true, true, true);
    Castle.gl.depthMask(true);

    Castle.cursorDeltaPos[0] = 0;
    Castle.cursorDeltaPos[1] = 0;

    requestAnimationFrame(Castle.loop);
  }

  static prepareAndDrawObject(
    obj,
    isSMPass,
    rotation,
    translation,
    tintOverride,
    scaleOverride,
  ) {
    if (!Castle.filter.test(obj.meshName)) {
      return;
    }
    let meshData = obj.meshData;
    let associatedTexture = obj.textureId;
    let associatedTexture2 = obj.texture2Id;
    let associatedTexture3 = obj.texture3Id;
    let associatedTexture4 = obj.texture4Id;
    let associatedShader = Castle.sceneShaders[obj.shaderId];

    let textures = [
      Castle.sceneTextures[associatedTexture],
      associatedTexture2 ? Castle.sceneTextures[associatedTexture2] : {},
      associatedTexture3 ? Castle.sceneTextures[associatedTexture3] : {},
      associatedTexture4 ? Castle.sceneTextures[associatedTexture4] : {},
    ];
    let uvScroll = [0.0, 0.0];

    if (obj.uvScroll) {
      uvScroll[0] = obj.uvScroll[0] * Castle.currentTime;
      uvScroll[1] = obj.uvScroll[1] * Castle.currentTime;
    }

    Castle.drawObject(
      isSMPass ? associatedShader.PSO_SM : associatedShader.PSO,
      textures,
      meshData.vertices,
      meshData.indexCount,
      meshData.vertStride,
      Castle.sceneShaders[obj.shaderId].attributes,
      obj.strip,
      obj.transform,
      isSMPass,
      obj.blend,
      obj.tintColor,
      obj.uvScale,
      uvScroll,
      obj.objRotation,
      rotation,
      translation,
      tintOverride,
      scaleOverride,
      obj.meshName == "grid_9_01.bin",
      obj.startFreq,
      obj.endAmp,
      obj.animDir,
    );
  }

  static updateMainCam() {
    mat4.perspective(
      Castle.projMatrix,
      glMatrix.toRadian(Castle.fov),
      Castle.canvasWidth / Castle.canvasHeight,
      Castle.zNear,
      Castle.zFar,
    );

    var camPosElements = [-1432, -440, -1582];

    var camPosX = camPosElements[0] + Castle.camDeltaPos[0];

    var camPosY = camPosElements[2] - Castle.camDeltaPos[1];

    var camPosZ = camPosElements[1] + Castle.cameraHeight;

    var camPos = vec3.fromValues(camPosX, camPosZ, camPosY);

    var camForwElements = [-2.17, -2.36, 3.14];

    var quatStart = quat.create();

    quat.identity(quatStart);

    var quatX = quat.create();

    var quatY = quat.create();

    var quatZ = quat.create();

    quat.rotateX(quatX, quatStart, camForwElements[0] + Castle.rotationTilt);

    quat.rotateY(quatY, quatX, camForwElements[1]);

    quat.rotateZ(quatZ, quatY, camForwElements[2]);

    mat4.fromRotationTranslation(Castle.viewMatrix, quatZ, vec3.create());

    mat4.translate(Castle.viewMatrix, Castle.viewMatrix, camPos);

    mat4.multiply(Castle.viewMatrix2, Castle.flipMatr, Castle.viewMatrix);

    mat4.multiply(Castle.viewProjMatr, Castle.projMatrix, Castle.viewMatrix2);

    var camForw = [
      Castle.viewMatrix2[2],
      Castle.viewMatrix2[6],
      Castle.viewMatrix2[10],
      0,
    ];

    var camForwXY = [camForw[0], camForw[2]];

    vec2.normalize(camForwXY, camForwXY);

    var camRight = [
      Castle.viewMatrix2[0],
      Castle.viewMatrix2[4],
      Castle.viewMatrix2[8],
      0,
    ];

    var camRightXY = [camRight[0], camRight[2]];

    vec2.normalize(camRightXY, camRightXY);

    Castle.camDeltaPos[0] -=
      (camForwXY[1] * Castle.cursorDeltaPos[0] -
        camRightXY[1] * Castle.cursorDeltaPos[1]) *
      0.1;

    Castle.camDeltaPos[1] -=
      (camForwXY[0] * Castle.cursorDeltaPos[0] -
        camRightXY[0] * Castle.cursorDeltaPos[1]) *
      0.1;

    Castle.camDeltaPos[0] = Castle.clamp(
      Castle.camDeltaPos[0],
      Castle.camDeltaPosMinMax[0][0],
      Castle.camDeltaPosMinMax[0][1],
    );

    Castle.camDeltaPos[1] = Castle.clamp(
      Castle.camDeltaPos[1],
      Castle.camDeltaPosMinMax[1][0],
      Castle.camDeltaPosMinMax[1][1],
    );

    mat4.invert(Castle.viewProjInv, Castle.viewProjMatr); // viewProj -> world

    Castle.cursorBasis = [
      ((Castle.cursorPosition[0] - Castle.canvasWidth / 2) /
        Castle.canvasWidth) *
        2,
      -(
        ((Castle.cursorPosition[1] - Castle.canvasHeight / 2) /
          Castle.canvasHeight) *
        2
      ),
      1,
      1,
    ];

    vec4.transformMat4(
      Castle.cursorBasis2,
      Castle.cursorBasis,
      Castle.viewProjInv,
    );

    Castle.cursorBasis2[0] /= -Castle.cursorBasis2[3];

    Castle.cursorBasis2[1] /= -Castle.cursorBasis2[3];

    Castle.cursorBasis2[2] /= -Castle.cursorBasis2[3];

    var camForwNew = [
      Castle.cursorBasis2[0] - camPos[0],
      Castle.cursorBasis2[1] - camPos[1],
      Castle.cursorBasis2[2] - camPos[2],
    ];

    vec3.normalize(camForwNew, camForwNew);

    var t = -(camPos[1] + Castle.gridTranslationY) / camForwNew[1];

    Castle.gridCursorPosX =
      camPos[0] +
      t * camForwNew[0] +
      (Castle.zeroTranslation[0] + Castle.gridTranslation[0]);

    Castle.gridCursorPosZ =
      camPos[2] +
      t * camForwNew[2] +
      (Castle.zeroTranslation[1] + Castle.gridTranslation[1]);

    Castle.UpdateBuildingBubbles();
  }
  static setupMainCam(program) {
    let matViewProjUniformLocation = Castle.getUniformLocation(
      program,
      "mViewProj",
    );

    Castle.gl.uniformMatrix4fv(
      matViewProjUniformLocation,
      Castle.gl.FALSE,
      Castle.viewProjMatr,
    );

    let matViewProjSMUniformLocation = Castle.getUniformLocation(
      program,
      "lightViewProj",
    );

    Castle.gl.uniformMatrix4fv(
      matViewProjSMUniformLocation,
      Castle.gl.FALSE,
      Castle.lightViewProjMatrix,
    );

    let zNearFar = Castle.getUniformLocation(program, "zNear_zFar");

    Castle.gl.uniform4f(
      zNearFar,
      Castle.zNear,
      Castle.zFar,
      Castle.zNearSM,
      Castle.zFarSM,
    );

    let cursorGridPosition = Castle.getUniformLocation(
      program,
      "cursorGridPosition",
    );

    Castle.gl.uniform2f(
      cursorGridPosition,
      -Castle.gridCursorPosX,
      -Castle.gridCursorPosZ,
    );
  }

  static setupSMCam(program) {
    let matViewProjUniformLocation = Castle.getUniformLocation(
      program,
      "mViewProj",
    );

    Castle.gl.uniformMatrix4fv(
      matViewProjUniformLocation,
      Castle.gl.FALSE,
      Castle.lightViewProjMatrix,
    );
  }

  static getBlendFunc(blendString) {
    switch (blendString) {
      case "ZERO":
        return Castle.gl.ZERO;
        break;

      case "ONE":
        return Castle.gl.ONE;
        break;

      case "SRC_COLOR":
        return Castle.gl.SRC_COLOR;
        break;

      case "ONE_MINUS_SRC_COLOR":
        return Castle.gl.ONE_MINUS_SRC_COLOR;
        break;

      case "DST_COLOR":
        return Castle.gl.DST_COLOR;
        break;

      case "ONE_MINUS_DST_COLOR":
        return Castle.gl.ONE_MINUS_DST_COLOR;
        break;

      case "SRC_ALPHA":
        return Castle.gl.SRC_ALPHA;
        break;

      case "ONE_MINUS_SRC_ALPHA":
        return Castle.gl.ONE_MINUS_SRC_ALPHA;
        break;

      case "DST_ALPHA":
        return Castle.gl.DST_ALPHA;
        break;

      case "ONE_MINUS_DST_ALPHA":
        return Castle.gl.ONE_MINUS_DST_ALPHA;
        break;

      case "CONSTANT_COLOR":
        return Castle.gl.CONSTANT_COLOR;
        break;

      case "ONE_MINUS_CONSTANT_COLOR":
        return Castle.gl.ONE_MINUS_CONSTANT_COLOR;
        break;

      case "CONSTANT_ALPHA":
        return Castle.gl.CONSTANT_ALPHA;
        break;

      case "ONE_MINUS_CONSTANT_ALPHA":
        return Castle.gl.ONE_MINUS_CONSTANT_ALPHA;
        break;

      case "SRC_ALPHA_SATURATE":
        return Castle.gl.SRC_ALPHA_SATURATE;
        break;

      default:
        return Castle.gl.ONE;
        break;
    }
  }

  static fmod(dividend, divisor) {
    if (divisor === 0) {
      // Handle division by zero based on desired behavior (e.g., return NaN or throw an error)
      return NaN;
    }
    return dividend - Math.floor(dividend / divisor) * divisor;
  }

  static drawObject(
    program,
    textures,
    vertices,
    indexCount,
    vertStride,
    attributes,
    strip,
    transform,
    isSMPass,
    blend,
    tintColor,
    uvScale,
    uvScroll,
    objectRotation,
    rotation,
    translation,
    tintOverride,
    scaleOverride,
    isGrid,
    startFreqValue,
    endAmpValue,
    animDir,
  ) {
    if (blend) {
      Castle.gl.enable(Castle.gl.BLEND);

      Castle.gl.disable(Castle.gl.CULL_FACE);

      Castle.gl.blendEquation(Castle.gl.FUNC_ADD);

      Castle.gl.colorMask(true, true, true, false);

      Castle.gl.depthMask(false);

      Castle.gl.blendFunc(
        Castle.getBlendFunc(blend[0]),
        Castle.getBlendFunc(blend[1]),
      );
    }

    Castle.gl.bindBuffer(Castle.gl.ARRAY_BUFFER, vertices);

    let attribOffset = 0;

    for (let attribute of attributes) {
      let attribLocation = Castle.gl.getAttribLocation(
        program.prog,
        attribute.name,
      );

      let attribType =
        attribute.sizeElem == 4
          ? Castle.gl.FLOAT
          : attribute.sizeElem == 2
            ? Castle.gl.UNSIGNED_SHORT
            : Castle.gl.UNSIGNED_BYTE;

      Castle.gl.vertexAttribPointer(
        attribLocation, // Attribute location
        attribute.count, // Number of elements per attribute
        attribType, // Type of elements
        Castle.gl.TRUE,
        vertStride, // Size of an individual vertex
        attribOffset, // Offset from the beginning of a single vertex to this attribute
      );

      Castle.gl.enableVertexAttribArray(attribLocation);

      attribOffset += attribute.count * attribute.sizeElem;
    }

    Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, null);
    // Tell OpenGL state machine which program should be active.
    Castle.gl.useProgram(program.prog);

    isSMPass ? Castle.setupSMCam(program) : Castle.setupMainCam(program);

    let tintColorValue = tintOverride
      ? tintOverride
      : tintColor
        ? tintColor
        : [1, 1, 1, 1];

    let tintColorLocation = Castle.getUniformLocation(program, "tintColor");

    Castle.gl.uniform4fv(tintColorLocation, tintColorValue);

    let uvScaleValue = uvScale ? uvScale : [1, 1, 1, 1];

    let uvScaleLocation = Castle.getUniformLocation(program, "uvScale");

    Castle.gl.uniform4fv(uvScaleLocation, uvScaleValue);

    // Programmable vertex animation
    let uStartFreqValue = startFreqValue ? startFreqValue : [0, 0, 0, 0];
    let uEndAmpValue = endAmpValue ? endAmpValue : [0, 0, 0, 0];
    let animDirVertFreqValue = animDir ? animDir : [0, 0, 0, 0];
    let startFreq = Castle.getUniformLocation(program, "startFreq");
    Castle.gl.uniform4fv(startFreq, uStartFreqValue);
    let endAmp = Castle.getUniformLocation(program, "endAmp");
    Castle.gl.uniform4fv(endAmp, uEndAmpValue);
    let animDirVertFreq = Castle.getUniformLocation(program, "animDirVertFreq");
    Castle.gl.uniform4fv(animDirVertFreq, animDirVertFreqValue);
    let time = Castle.getUniformLocation(program, "time");
    let timeValue = [Castle.currentTime, 0, 0, 0];
    Castle.gl.uniform4fv(time, timeValue);

    if (uvScroll[0] > 0) {
      let e = 1;
    }

    let uvScrollValue = uvScroll ? uvScroll : [0, 0];

    let uvScrollLocation = Castle.getUniformLocation(program, "uvScroll");

    Castle.gl.uniform2fv(uvScrollLocation, uvScrollValue);

    let worldMatrix = new Float32Array(16);
    mat4.identity(worldMatrix);

    if (objectRotation) {
      var objRotationMatrixX = new Float32Array(16);
      var objRotationMatrixY = new Float32Array(16);
      var objRotationMatrixZ = new Float32Array(16);
      mat4.identity(objRotationMatrixX);
      mat4.identity(objRotationMatrixY);
      mat4.identity(objRotationMatrixZ);

      mat4.fromRotation(
        objRotationMatrixX,
        Castle.fmod(objectRotation[0] * Castle.currentTime, 360.0),
        [1, 0, 0],
      );

      mat4.fromRotation(
        objRotationMatrixY,
        Castle.fmod(objectRotation[1] * Castle.currentTime, 360.0),
        [0, 1, 0],
      );

      mat4.fromRotation(
        objRotationMatrixZ,
        Castle.fmod(objectRotation[2] * Castle.currentTime, 360.0),
        [0, 0, 1],
      );

      mat4.mul(worldMatrix, objRotationMatrixX, worldMatrix);
      mat4.mul(worldMatrix, objRotationMatrixY, worldMatrix);
      mat4.mul(worldMatrix, objRotationMatrixZ, worldMatrix);
    }

    let transformMatrix = transform
      ? transform
      : new Float32Array([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);
    mat4.mul(worldMatrix, worldMatrix, transformMatrix);

    var worldMatrix2 = new Float32Array(16);

    var worldMatrix3 = new Float32Array(16);

    mat4.transpose(worldMatrix2, worldMatrix);

    if (rotation) {
      mat4.fromRotation(worldMatrix3, rotation, [0, 1, 0]);

      mat4.mul(worldMatrix2, worldMatrix3, worldMatrix2);
    }

    if (scaleOverride) {
      mat4.fromScaling(worldMatrix3, [
        scaleOverride,
        scaleOverride,
        scaleOverride,
      ]);

      mat4.mul(worldMatrix2, worldMatrix3, worldMatrix2);
    }

    if (translation) {
      worldMatrix2[12] += translation[0];

      worldMatrix2[13] += translation[1];

      worldMatrix2[14] += translation[2];
    }

    let matWorldUniformLocation = Castle.getUniformLocation(program, "mWorld");

    Castle.gl.uniformMatrix4fv(
      matWorldUniformLocation,
      Castle.gl.FALSE,
      worldMatrix2,
    );

    for (let i = 0; i < textures.length; ++i) {
      if (textures[i]) {
        Castle.gl.activeTexture(Castle.gl.TEXTURE0 + i);

        Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, textures[i]);

        let attribName = "tex" + i;

        let texLocation = Castle.getUniformLocation(program, attribName);

        Castle.gl.uniform1i(texLocation, i);
      }
    }

    if (!isSMPass) {
      Castle.gl.activeTexture(Castle.gl.TEXTURE0 + textures.length);

      Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.depthTexture);

      let attribNameSM = "smTexture";

      let texLocationSM = Castle.getUniformLocation(program, attribNameSM);

      Castle.gl.uniform1i(texLocationSM, textures.length);
    }

    if (!isSMPass && isGrid) {
      Castle.gl.activeTexture(Castle.gl.TEXTURE0 + textures.length + 1);

      Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.gridTexture);
      Castle.gl.texImage2D(
        Castle.gl.TEXTURE_2D,
        0,
        Castle.gl.RGBA,
        64,
        64,
        0,
        Castle.gl.RGBA,
        Castle.gl.UNSIGNED_BYTE,
        Castle.allowedToBuildGridTex,
      );

      let attribNameSM = "gridTex";

      let texLocationSM = Castle.getUniformLocation(program, attribNameSM);

      Castle.gl.uniform1i(texLocationSM, textures.length + 1);
    }

    Castle.gl.drawArrays(
      strip ? Castle.gl.TRIANGLE_STRIP : Castle.gl.TRIANGLES,
      0,
      indexCount,
    );
  }

  static convertBuildingPosToViewCoord(posX, posY) {
    let viewPos = new Float32Array(4);
    let bubblePos = [
      Castle.zeroTranslation[0] + posX * 7, // тут тоже чёта не сошлось
      Castle.gridTranslationY + 30, // иконку повесим над зданием в 30 метрах
      Castle.zeroTranslation[1] - 130 + posY * 7, // не сошлись какие-то числа, пришлось подгонять
      1,
    ];
    let viewProjTransp = new Float32Array(16);
    mat4.transpose(viewProjTransp, Castle.viewProjMatr);
    vec4.transformMat4(viewPos, bubblePos, Castle.viewProjMatr);
    let output = [
      ((viewPos[0] / viewPos[3] + 1) * Castle.canvasWidth) / 2,
      ((1 - viewPos[1] / viewPos[3]) * Castle.canvasHeight) / 2,
    ];
    //let output = [viewPos[0] / viewPos[3] * Castle.canvasWidth, viewPos[1] / viewPos[3] * Castle.canvasHeight, viewPos[2] / viewPos[3]];
    return output;
  }

  static buildingUniqueIdCounter = 0;

  static buildingBubbleStatuses = {};

  static SetBuildingNotification(buildingName, notificationStatus) {
    Castle.buildingBubbleStatuses[buildingName] = notificationStatus;
  }

  static UpdateBuildingBubbles() {
    // Добавить все новые здания
    for (let b = 0; b < Castle.placedBuildings.length; ++b) {
      if (!("uniqueId" in Castle.placedBuildings[b])) {
        Castle.placedBuildings[b].uniqueId = Castle.buildingUniqueIdCounter;
        Castle.buildingUniqueIdCounter++;
      }
    }
    // Удалить здания, которые уже удалены
    for (let uid in Castle.buildingBubblesDoms) {
      if (!Castle.placedBuildings.find((obj) => obj.uniqueId == uid)) {
        Castle.buildingBubbles.removeChild(Castle.buildingBubblesDoms[uid]);
        delete Castle.buildingBubblesDoms[uid];
      }
    }
    for (const building of Castle.placedBuildings) {
      const buildingName = Castle.buildings[building.id];
      if (buildingName in CastleBuildingsEvents) {
        if (!(building.uniqueId in Castle.buildingBubblesDoms)) {
          Castle.buildingBubblesDoms[building.uniqueId] = DOM(
            {
              style: ["castle_building_bubble"],
              event: ["click", () => CastleBuildingsEvents[buildingName]()],
            },
            DOM({
              tag: "img",
              src: `content/icons/buildings/${buildingName}.png`,
            }),
          );
          Castle.buildingBubbles.appendChild(
            Castle.buildingBubblesDoms[building.uniqueId],
          );
        }
        const doShowBubble =
          buildingName in Castle.buildingBubbleStatuses &&
          Castle.buildingBubbleStatuses[buildingName];
        Castle.buildingBubblesDoms[building.uniqueId].style.display =
          doShowBubble ? "block" : "none";
        if (doShowBubble) {
          const buildingSize = Castle.sceneBuildings[buildingName].size[0];
          const buldingViewPos = Castle.convertBuildingPosToViewCoord(
            building.posX + buildingSize / 2,
            building.posY + buildingSize / 2,
          );
          Castle.buildingBubblesDoms[building.uniqueId].style.left =
            buldingViewPos[0] + "px";
          Castle.buildingBubblesDoms[building.uniqueId].style.top =
            buldingViewPos[1] + "px";
        }
      }
    }
  }
}
