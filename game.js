const TILE = 44;
const COLS = 15;
const ROWS = 13;
const HUD_HEIGHT = 56;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE + HUD_HEIGHT;

const OPENING_SLIDES = [
  { key: "op-01", file: "01.png" },
  { key: "op-02", file: "02.png" },
  { key: "op-03", file: "03.png" },
  { key: "op-04", file: "04.png" },
  { key: "op-05", file: "05.png" },
  { key: "op-06", file: "06.png" },
  { key: "op-07", file: "07.png" },
  { key: "op-08", file: "08.png" },
  { key: "op-09", file: "09.png" },
  { key: "op-10", file: "10.png" },
  { key: "op-11", file: "11.png" },
  { key: "op-12", file: "12.png" },
  { key: "op-13", file: "13.png" },
];
const OPENING_IMAGE_FOLDERS = ["OPimage", "Opimage", "opimage"];
const OPENING_BGM_SRC = "BGM/OP_BGM.mp3";
const OPENING_SLIDE_DURATION = 4800;
const OPENING_SLIDE_DURATIONS = [7000, 7000];
const OPENING_DESCEND_MOTION_DURATION = 7500;
const OPENING_DESCEND_HOLD_DURATION = 10000;
const OPENING_FADE_IN_DURATION = 1500;
const OPENING_SKIP_HOLD_DURATION = 900;
const STAGE_BGM_SRC = "BGM/STAGE BGM/STAGE BGM_001.mp3";
const EXPLOSION_SOUND_SRC = "BGM/効果音/Explosion.mp3";
const BOMB_FUSE_DURATION = 3000;
const ENEMY_BOMB_FUSE_DURATION = 1500;

const touchState = {
  up: false,
  down: false,
  left: false,
  right: false,
  bombQueued: false,
};

const audioState = {
  context: null,
  musicGain: null,
  stageAudio: null,
  explosionAudio: null,
  stageIndex: 0,
  active: false,
};

function audioContext() {
  if (audioState.context) return audioState.context;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const musicGain = context.createGain();
  musicGain.gain.value = 0.055;
  musicGain.connect(context.destination);
  audioState.context = context;
  audioState.musicGain = musicGain;
  return context;
}

function playTone(context, destination, frequency, duration, volume, type = "square", slideTo = null) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function startStageMusic(stageIndex) {
  audioState.stageIndex = stageIndex;
  audioState.active = true;
  const audio = stageBgmAudio();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function setStageMusicActive(active) {
  audioState.active = active;
  const audio = audioState.stageAudio;
  if (!audio) return;
  if (active) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
}

function stageBgmAudio() {
  if (audioState.stageAudio) return audioState.stageAudio;
  const audio = new Audio(STAGE_BGM_SRC);
  audio.loop = true;
  audio.volume = 0.5;
  audio.preload = "auto";
  audioState.stageAudio = audio;
  return audio;
}

function playExplosionSound() {
  const audio = explosionSoundAudio().cloneNode();
  audio.volume = 0.78;
  audio.play().catch(() => {});
}

function explosionSoundAudio() {
  if (audioState.explosionAudio) return audioState.explosionAudio;
  const audio = new Audio(EXPLOSION_SOUND_SRC);
  audio.preload = "auto";
  audioState.explosionAudio = audio;
  return audio;
}

const ENEMY_TYPES = [
  "wander",
  "chaser",
  "ghost",
  "pakunman",
  "chevalier",
  "bakudaso",
  "kedama",
  "tepodon",
];

const AREAS = [
  { id: "standard", name: "STANDARD", floor: 0x15284b, floor2: 0x192f57, line: 0x24416d, solid: 0x3e5d8c, solid2: 0x5879a8, brick: 0xc16b3e, brickDark: 0x6c3428 },
  { id: "coast", name: "COAST", floor: 0x176b86, floor2: 0x1c8aa0, line: 0x7fe7ff, solid: 0xd7c38a, solid2: 0xffe3a1, brick: 0xd89b59, brickDark: 0x8b5b36 },
  { id: "steel", name: "STEEL CITY", floor: 0x303743, floor2: 0x424b58, line: 0x8791a1, solid: 0x68717e, solid2: 0xa5afbd, brick: 0x8f4a3d, brickDark: 0x462c28 },
  { id: "forest", name: "FOREST", floor: 0x21482f, floor2: 0x2f623c, line: 0x82d66f, solid: 0x6b6f57, solid2: 0xa4a17c, brick: 0x8a552b, brickDark: 0x4a2f1c },
  { id: "spaceship", name: "SPACESHIP", floor: 0x101626, floor2: 0x18233c, line: 0x35d9ff, solid: 0x24314f, solid2: 0x6ee7ff, brick: 0x4b7a54, brickDark: 0x173524 },
];

const STAGES = [
  { name: "FIRST SPARK", walls: 0.46, enemies: [3, 0, 0, 0, 0, 0, 0, 0], speed: 72, fuse: 1800 },
  { name: "CROSS FIRE", walls: 0.49, enemies: [2, 1, 0, 0, 0, 0, 0, 0], speed: 75, fuse: 1760 },
  { name: "RED PURSUIT", walls: 0.51, enemies: [2, 1, 0, 1, 0, 0, 0, 0], speed: 78, fuse: 1720 },
  { name: "STANDARD EXIT", walls: 0.53, enemies: [1, 2, 1, 0, 0, 0, 1, 0], speed: 81, fuse: 1680 },
  { name: "BEACH PATROL", walls: 0.54, enemies: [1, 1, 1, 1, 0, 0, 0, 0], speed: 84, fuse: 1640 },
  { name: "TIDE HUNTER", walls: 0.55, enemies: [1, 2, 1, 1, 1, 0, 0, 0], speed: 87, fuse: 1600 },
  { name: "ROCKET SHORE", walls: 0.56, enemies: [0, 0, 0, 0, 0, 0, 0, 3], speed: 90, fuse: 1560 },
  { name: "COAST STORM", walls: 0.57, enemies: [1, 2, 1, 2, 1, 1, 0, 0], speed: 93, fuse: 1520 },
  { name: "HOUSE BLOCK", walls: 0.58, enemies: [1, 2, 2, 1, 1, 1, 0, 0], speed: 96, fuse: 1480 },
  { name: "TOWER FUSE", walls: 0.59, enemies: [1, 1, 2, 2, 1, 1, 1, 0], speed: 99, fuse: 1440 },
  { name: "SKYLINE BLAST", walls: 0.60, enemies: [1, 2, 2, 1, 2, 1, 1, 1], speed: 102, fuse: 1400 },
  { name: "STEEL CORE", walls: 0.61, enemies: [1, 2, 2, 2, 1, 2, 1, 1], speed: 105, fuse: 1360 },
  { name: "FOREST LINE", walls: 0.62, enemies: [1, 2, 2, 1, 2, 2, 1, 1], speed: 108, fuse: 1320 },
  { name: "MOSS PRESS", walls: 0.63, enemies: [1, 2, 2, 2, 2, 2, 1, 1], speed: 111, fuse: 1280 },
  { name: "FOREST ALARM", walls: 0.64, enemies: [1, 3, 2, 2, 2, 2, 2, 1], speed: 114, fuse: 1240 },
  { name: "ROOT HEART", walls: 0.65, enemies: [1, 3, 2, 2, 2, 3, 2, 1], speed: 117, fuse: 1200 },
  { name: "HULL GATE", walls: 0.66, enemies: [1, 3, 2, 2, 2, 2, 2, 2], speed: 120, fuse: 1180 },
  { name: "AIRLOCK", walls: 0.67, enemies: [1, 3, 3, 2, 2, 2, 2, 2], speed: 123, fuse: 1160 },
  { name: "SHIP REACTOR", walls: 0.68, enemies: [1, 3, 3, 2, 3, 2, 2, 2], speed: 126, fuse: 1140 },
  { name: "FINAL BRIDGE", walls: 0.69, enemies: [1, 4, 3, 2, 3, 3, 3, 2], speed: 130, fuse: 1120 },
];

const UPGRADE_RARITIES = {
  common: { label: "COMMON", color: 0x35d9ff },
  rare: { label: "RARE", color: 0xa879ff },
  epic: { label: "EPIC", color: 0xffb341 },
};

const SINGLE_UPGRADE_COST = {
  punch: 2200,
  glove: 2400,
  wallPass: 2600,
  pierceBomb: 2800,
  remoteBomb: 3000,
};

const POWER_MAX = {
  bombLimit: 8,
  blastRadius: 8,
  speedLevel: 8,
};

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellKey(col, row) {
  return `${col},${row}`;
}

class BlastGame extends Phaser.Scene {
  constructor() {
    super("BlastGame");
    this.stageIndex = 0;
    this.lives = 3;
    this.score = 0;
  }

  init(data = {}) {
    this.stageIndex = data.stageIndex ?? 0;
    this.lives = data.lives ?? 3;
    this.score = data.score ?? 0;
    this.bombLevel = data.bombLevel ?? 0;
    this.fireLevel = data.fireLevel ?? 0;
    this.speedLevel = data.speedLevel ?? 0;
    this.bombLevel = Math.min(this.bombLevel, POWER_MAX.bombLimit - 1);
    this.fireLevel = Math.min(this.fireLevel, POWER_MAX.blastRadius - 2);
    this.speedLevel = Math.min(this.speedLevel, POWER_MAX.speedLevel);
    this.punch = data.punch ?? false;
    this.glove = data.glove ?? false;
    this.wallPass = data.wallPass ?? false;
    this.pierceBomb = data.pierceBomb ?? false;
    this.remoteBomb = data.remoteBomb ?? false;
    this.heartCharges = data.heartCharges ?? 0;
    this.bootShowIntro = data.showIntro ?? data.stageIndex === undefined;
    this.bootStartImmediately = data.startImmediately ?? false;
  }

  create() {
    document.querySelector("#loading-message")?.remove();
    this.createTextures();
    this.createInput();
    this.createHud();
    this.startStage(this.stageIndex, this.bootShowIntro, this.bootStartImmediately);
  }

  createTextures() {
    const make = (key, draw) => {
      if (this.textures.exists(key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      draw(graphics);
      graphics.generateTexture(key, TILE, TILE);
      graphics.destroy();
    };

    make("floor", (g) => {
      g.fillStyle(0x15284b).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0x192f57).fillRect(2, 2, TILE - 4, TILE - 4);
      g.lineStyle(1, 0x24416d, 0.55).strokeRect(4, 4, TILE - 8, TILE - 8);
      g.fillStyle(0x2e5384, 0.35).fillCircle(8, 8, 2);
      g.fillCircle(36, 34, 2);
    });

    make("solid", (g) => {
      g.fillStyle(0x26395f).fillRoundedRect(1, 1, 42, 42, 5);
      g.fillStyle(0x3e5d8c).fillRoundedRect(4, 4, 36, 33, 4);
      g.fillStyle(0x5879a8).fillRect(7, 7, 30, 5);
      g.fillStyle(0x1a2948).fillRect(5, 35, 34, 5);
      g.lineStyle(2, 0x17233d).strokeRoundedRect(2, 2, 40, 40, 5);
    });

    make("breakable", (g) => {
      g.fillStyle(0x7b3f2b).fillRect(1, 1, 42, 42);
      g.fillStyle(0xc16b3e).fillRect(3, 3, 38, 36);
      g.lineStyle(3, 0x6c3428);
      g.strokeLineShape(new Phaser.Geom.Line(3, 14, 41, 14));
      g.strokeLineShape(new Phaser.Geom.Line(3, 28, 41, 28));
      g.strokeLineShape(new Phaser.Geom.Line(14, 3, 14, 14));
      g.strokeLineShape(new Phaser.Geom.Line(31, 14, 31, 28));
      g.strokeLineShape(new Phaser.Geom.Line(17, 28, 17, 41));
      g.fillStyle(0xe48b55, 0.7).fillRect(5, 5, 7, 4);
    });

    make("breakable-burning", (g) => {
      g.fillStyle(0x5e1720).fillRect(1, 1, 42, 42);
      g.fillStyle(0xd9402d).fillRect(3, 3, 38, 36);
      g.lineStyle(3, 0x6f1920);
      g.strokeLineShape(new Phaser.Geom.Line(3, 14, 41, 14));
      g.strokeLineShape(new Phaser.Geom.Line(3, 28, 41, 28));
      g.strokeLineShape(new Phaser.Geom.Line(14, 3, 14, 14));
      g.strokeLineShape(new Phaser.Geom.Line(31, 14, 31, 28));
      g.strokeLineShape(new Phaser.Geom.Line(17, 28, 17, 41));
      g.fillStyle(0xffd35a, 0.9).fillRect(5, 5, 7, 4).fillRect(24, 18, 8, 4);
    });

    AREAS.forEach((theme) => {
      make(`${theme.id}-floor`, (g) => {
        g.fillStyle(theme.floor).fillRect(0, 0, TILE, TILE);
        g.fillStyle(theme.floor2).fillRect(2, 2, TILE - 4, TILE - 4);
        g.lineStyle(1, theme.line, 0.5).strokeRect(4, 4, TILE - 8, TILE - 8);
        g.fillStyle(theme.line, 0.22).fillCircle(8, 8, 2).fillCircle(36, 34, 2);
        if (theme.id === "coast") g.fillStyle(0xffffff, 0.28).fillRect(6, 17, 32, 3);
        if (theme.id === "steel") g.fillStyle(0x10151d, 0.35).fillRect(8, 8, 28, 2).fillRect(8, 34, 28, 2);
        if (theme.id === "forest") g.fillStyle(0x17351f, 0.35).fillCircle(12, 13, 4).fillCircle(32, 28, 5);
        if (theme.id === "spaceship") g.fillStyle(0xffffff, 0.55).fillCircle(12, 13, 1).fillCircle(32, 27, 1);
      });

      make(`${theme.id}-solid`, (g) => {
        if (theme.id === "coast") {
          g.fillStyle(0xc99a55).fillRect(5, 13, 34, 26);
          g.fillStyle(0xf0cf82).fillRect(8, 10, 28, 27);
          g.fillStyle(0xf7e0a4).fillRect(10, 22, 24, 4);
          g.fillStyle(0x8b5b36).fillRect(18, 27, 8, 10);
          g.fillStyle(0xf0cf82).fillTriangle(8, 10, 14, 3, 20, 10);
          g.fillTriangle(24, 10, 30, 3, 36, 10);
          g.lineStyle(2, 0x8b5b36).strokeRect(8, 10, 28, 27);
          return;
        }
        if (theme.id === "steel") {
          g.fillStyle(0x1e2630).fillRect(6, 6, 32, 34);
          g.fillStyle(0x6f7d8f).fillRect(9, 3, 26, 37);
          g.fillStyle(0xb5c2d1).fillRect(13, 8, 5, 5).fillRect(25, 8, 5, 5);
          g.fillRect(13, 18, 5, 5).fillRect(25, 18, 5, 5).fillRect(13, 28, 5, 5).fillRect(25, 28, 5, 5);
          g.lineStyle(2, 0x26313f).strokeRect(9, 3, 26, 37);
          return;
        }
        if (theme.id === "forest") {
          g.fillStyle(0x3b3f35).fillCircle(22, 23, 17);
          g.fillStyle(0x777a65).fillCircle(22, 22, 15);
          g.fillStyle(0x9a9a83).fillCircle(16, 18, 5).fillCircle(27, 27, 4);
          g.lineStyle(3, 0x2f352b).strokeCircle(22, 22, 16);
          return;
        }
        if (theme.id === "spaceship") {
          g.fillStyle(0x111827).fillRoundedRect(4, 5, 36, 34, 4);
          g.fillStyle(0x56657a).fillRoundedRect(7, 8, 30, 28, 3);
          g.fillStyle(0xa9bacf).fillRect(10, 11, 24, 5).fillRect(10, 27, 24, 5);
          g.lineStyle(2, 0x1d2a44).strokeRoundedRect(6, 7, 32, 30, 3);
          return;
        }
        g.fillStyle(0x10172a).fillRoundedRect(1, 1, 42, 42, 5);
        g.fillStyle(theme.solid).fillRoundedRect(4, 4, 36, 33, 4);
        g.fillStyle(theme.solid2).fillRect(7, 7, 30, 5);
        g.fillStyle(0x0b1326, 0.45).fillRect(5, 35, 34, 5);
        g.lineStyle(2, theme.line, 0.6).strokeRoundedRect(2, 2, 40, 40, 5);
      });

      make(`${theme.id}-breakable`, (g) => {
        if (theme.id === "coast") {
          g.fillStyle(0x0b1326, 0.18).fillEllipse(22, 33, 32, 10);
          g.fillStyle(0xf6d7b0).fillEllipse(22, 24, 30, 25);
          g.fillStyle(0xffe8cb).fillEllipse(22, 21, 24, 18);
          g.lineStyle(2, 0xc7906a);
          [9, 15, 22, 29, 35].forEach((x) => g.strokeLineShape(new Phaser.Geom.Line(22, 12, x, 32)));
          g.fillStyle(0xe8b186).fillCircle(22, 26, 4);
          return;
        }
        if (theme.id === "steel") {
          g.fillStyle(0x3b2520).fillRect(6, 14, 32, 24);
          g.fillStyle(0xa24d34).fillRect(9, 16, 26, 22);
          g.fillStyle(0x6f2f24).fillTriangle(5, 14, 22, 4, 39, 14);
          g.fillStyle(0xffd36b).fillRect(14, 22, 6, 6).fillRect(25, 22, 6, 6);
          g.fillStyle(0x3b2520).fillRect(19, 29, 7, 9);
          return;
        }
        if (theme.id === "forest") {
          g.fillStyle(0x3c2415).fillEllipse(22, 31, 28, 12);
          g.fillStyle(0x8a552b).fillRect(10, 15, 24, 18);
          g.fillStyle(0xb8793c).fillEllipse(22, 15, 25, 12);
          g.lineStyle(2, 0x5a351f).strokeEllipse(22, 15, 24, 11);
          g.lineStyle(2, 0x6a3f24).strokeCircle(22, 15, 5).strokeCircle(22, 15, 10);
          return;
        }
        if (theme.id === "spaceship") {
          g.fillStyle(0x123322).fillRect(4, 4, 36, 36);
          g.fillStyle(0x2d8f4f).fillRect(7, 7, 30, 30);
          g.lineStyle(2, 0x9effb4);
          g.strokeLineShape(new Phaser.Geom.Line(12, 8, 12, 36));
          g.strokeLineShape(new Phaser.Geom.Line(8, 18, 36, 18));
          g.strokeLineShape(new Phaser.Geom.Line(22, 8, 34, 30));
          g.fillStyle(0xffd35a).fillCircle(12, 18, 3).fillCircle(30, 29, 3);
          return;
        }
        g.fillStyle(theme.brickDark).fillRect(1, 1, 42, 42);
        g.fillStyle(theme.brick).fillRect(3, 3, 38, 36);
        g.lineStyle(3, theme.brickDark);
        g.strokeLineShape(new Phaser.Geom.Line(3, 14, 41, 14));
        g.strokeLineShape(new Phaser.Geom.Line(3, 28, 41, 28));
        g.strokeLineShape(new Phaser.Geom.Line(14, 3, 14, 14));
        g.strokeLineShape(new Phaser.Geom.Line(31, 14, 31, 28));
        g.strokeLineShape(new Phaser.Geom.Line(17, 28, 17, 41));
        g.fillStyle(theme.solid2, 0.55).fillRect(5, 5, 7, 4);
      });

      make(`${theme.id}-breakable-burning`, (g) => {
        g.fillStyle(0x5e1720).fillRect(1, 1, 42, 42);
        g.fillStyle(0xd9402d).fillRect(3, 3, 38, 36);
        g.lineStyle(3, 0x6f1920);
        g.strokeLineShape(new Phaser.Geom.Line(3, 14, 41, 14));
        g.strokeLineShape(new Phaser.Geom.Line(3, 28, 41, 28));
        g.strokeLineShape(new Phaser.Geom.Line(14, 3, 14, 14));
        g.strokeLineShape(new Phaser.Geom.Line(31, 14, 31, 28));
        g.strokeLineShape(new Phaser.Geom.Line(17, 28, 17, 41));
        g.fillStyle(0xffd35a, 0.9).fillRect(5, 5, 7, 4).fillRect(24, 18, 8, 4);
      });
    });

    make("player", (g) => {
      g.fillStyle(0x0b1326).fillEllipse(22, 28, 31, 27);
      g.fillStyle(0xf4f7ff).fillRoundedRect(8, 9, 28, 25, 10);
      g.fillStyle(0x35d9ff).fillRoundedRect(12, 13, 20, 11, 5);
      g.fillStyle(0x13213c).fillRect(15, 16, 5, 6).fillRect(25, 16, 5, 6);
      g.fillStyle(0xff9b3d).fillRect(5, 28, 7, 9).fillRect(32, 28, 7, 9);
      g.fillStyle(0xf4f7ff).fillRect(12, 32, 8, 8).fillRect(24, 32, 8, 8);
    });

    const enemyTexture = (key, body, eye, detail) =>
      make(key, (g) => {
        g.fillStyle(0x0b1326, 0.8).fillEllipse(22, 35, 32, 9);
        g.fillStyle(body).fillRoundedRect(6, 8, 32, 29, 12);
        g.fillTriangle(7, 29, 7, 41, 15, 34);
        g.fillTriangle(29, 34, 37, 41, 37, 29);
        g.fillStyle(0xffffff).fillCircle(16, 21, 6).fillCircle(28, 21, 6);
        g.fillStyle(eye).fillCircle(17, 22, 3).fillCircle(27, 22, 3);
        g.fillStyle(detail).fillRect(15, 31, 14, 3);
      });

    enemyTexture("enemy-wander", 0xffba3d, 0x1a2440, 0xd9712d);
    enemyTexture("enemy-chaser", 0xff4d6d, 0x35101b, 0x9e1837);
    enemyTexture("enemy-ghost", 0xa879ff, 0x1b1234, 0x683cad);

    make("enemy-pakunman", (g) => {
      g.fillStyle(0x0b1326, 0.75).fillEllipse(22, 35, 33, 9);
      g.fillStyle(0x35d9ff).slice(22, 22, 17, Phaser.Math.DegToRad(32), Phaser.Math.DegToRad(328), false).fillPath();
      g.fillStyle(0x7de9ff).slice(22, 22, 13, Phaser.Math.DegToRad(42), Phaser.Math.DegToRad(318), false).fillPath();
      g.fillStyle(0x07101f).fillCircle(21, 13, 3);
      g.fillStyle(0xffffff).fillCircle(22, 12, 1);
    });

    make("enemy-chevalier", (g) => {
      g.fillStyle(0x0b1326, 0.8).fillEllipse(22, 35, 32, 9);
      g.fillStyle(0xb7c7e4).fillRoundedRect(8, 9, 28, 28, 8);
      g.fillStyle(0x50638c).fillRect(11, 15, 22, 8);
      g.fillStyle(0xff4d6d).fillRect(18, 5, 8, 8);
      g.fillStyle(0x10172a).fillCircle(17, 23, 3).fillCircle(27, 23, 3);
      g.fillStyle(0xffd36b).fillRect(30, 21, 12, 4);
    });

    make("enemy-bakudaso", (g) => {
      g.fillStyle(0x0b1326, 0.8).fillEllipse(22, 35, 32, 9);
      g.fillStyle(0x262b3f).fillCircle(22, 24, 16);
      g.fillStyle(0xff4d6d).fillCircle(17, 21, 4).fillCircle(27, 21, 4);
      g.fillStyle(0xffb341).fillRect(19, 6, 8, 7);
      g.lineStyle(3, 0xffe15c).strokeCircle(31, 7, 5);
      g.fillStyle(0xffe15c).fillCircle(34, 4, 3);
    });

    make("enemy-kedama", (g) => {
      g.fillStyle(0x0b1326, 0.75).fillEllipse(22, 36, 34, 9);
      g.fillStyle(0x45b8ff).fillCircle(22, 24, 16);
      g.fillStyle(0x7bdcff).fillCircle(14, 15, 8).fillCircle(31, 17, 7);
      g.fillCircle(10, 27, 7).fillCircle(33, 29, 8);
      g.fillCircle(21, 9, 6).fillCircle(23, 38, 5);
      g.fillStyle(0xffffff).fillCircle(17, 22, 8).fillCircle(29, 22, 8);
      g.fillStyle(0x10224a).fillCircle(18, 23, 4).fillCircle(28, 23, 4);
      g.fillStyle(0xffffff).fillCircle(20, 20, 2).fillCircle(30, 20, 2);
    });

    make("enemy-kedama-burning", (g) => {
      g.fillStyle(0x0b1326, 0.75).fillEllipse(22, 36, 34, 9);
      g.fillStyle(0xff5a2f).fillCircle(22, 25, 16);
      g.fillStyle(0xffa62b).fillCircle(13, 17, 8).fillCircle(31, 18, 7);
      g.fillCircle(9, 28, 7).fillCircle(34, 30, 8);
      g.fillStyle(0xffe15c).fillCircle(21, 10, 6).fillCircle(23, 38, 5);
      g.fillStyle(0xffe15c).fillTriangle(8, 22, 16, 4, 21, 23);
      g.fillTriangle(24, 23, 31, 4, 38, 24);
      g.fillStyle(0xffffff).fillCircle(17, 23, 8).fillCircle(29, 23, 8);
      g.fillStyle(0x461015).fillCircle(19, 24, 4).fillCircle(27, 24, 4);
    });

    make("enemy-tepodon", (g) => {
      g.fillStyle(0x0b1326, 0.75).fillEllipse(22, 36, 36, 8);
      g.fillStyle(0xcfd8e8).fillRoundedRect(9, 13, 27, 17, 8);
      g.fillStyle(0xff4d38).fillTriangle(36, 13, 43, 22, 36, 30);
      g.fillStyle(0x50638c).fillTriangle(9, 13, 2, 18, 9, 22);
      g.fillTriangle(9, 30, 2, 26, 9, 22);
      g.fillStyle(0x35d9ff).fillCircle(26, 21, 4);
      g.fillStyle(0x10172a).fillRect(16, 30, 5, 8).fillRect(28, 30, 5, 8);
      g.fillStyle(0xffb341).fillRect(14, 37, 8, 4).fillRect(27, 37, 8, 4);
    });

    make("enemy-tepodon-rocket", (g) => {
      g.fillStyle(0x0b1326, 0.75).fillEllipse(22, 35, 36, 8);
      g.fillStyle(0xf6f7fb).fillRoundedRect(8, 14, 28, 16, 8);
      g.fillStyle(0xff4d38).fillTriangle(36, 14, 43, 22, 36, 30);
      g.fillStyle(0x50638c).fillTriangle(8, 14, 1, 18, 8, 22);
      g.fillTriangle(8, 30, 1, 26, 8, 22);
      g.fillStyle(0x35d9ff).fillCircle(26, 22, 4);
      g.fillStyle(0xffa62b).fillTriangle(3, 18, 3, 26, -1, 22);
      g.fillStyle(0xffe15c).fillTriangle(0, 19, 0, 25, -5, 22);
    });

    make("spear", (g) => {
      g.fillStyle(0xffd36b).fillRect(2, 18, 34, 8);
      g.fillStyle(0xf6f7fb).fillTriangle(34, 10, 43, 22, 34, 34);
      g.fillStyle(0xa56c2c).fillRect(0, 20, 8, 4);
    });

    make("bomb", (g) => {
      g.fillStyle(0x080b13).fillCircle(22, 25, 15);
      g.fillStyle(0x2b3650).fillCircle(17, 19, 6);
      g.fillStyle(0xb7c7e4).fillRect(20, 6, 8, 7);
      g.lineStyle(3, 0xffb341).strokeCircle(30, 7, 5);
      g.fillStyle(0xffe15c).fillCircle(33, 4, 3);
    });

    make("flame", (g) => {
      g.fillStyle(0xff4d38, 0.8).fillCircle(22, 22, 20);
      g.fillStyle(0xffa62b).fillCircle(22, 22, 14);
      g.fillStyle(0xfff07a).fillCircle(22, 22, 7);
      g.fillStyle(0xffd03b).fillTriangle(4, 22, 18, 14, 18, 30);
      g.fillTriangle(40, 22, 26, 14, 26, 30);
      g.fillTriangle(22, 4, 14, 18, 30, 18);
      g.fillTriangle(22, 40, 14, 26, 30, 26);
    });

    make("exit-hidden", (g) => {
      g.fillStyle(0x0b1326).fillCircle(22, 22, 17);
      g.lineStyle(4, 0x35d9ff).strokeCircle(22, 22, 14);
      g.fillStyle(0x35d9ff, 0.5).fillCircle(22, 22, 8);
      g.fillStyle(0xffffff).fillCircle(22, 22, 3);
    });
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SPACE,R,P,E,ENTER");
    this.keys.SPACE.on("down", () => this.placeBomb());
    this.keys.E.on("down", () => this.useActionPower());
    this.keys.R.on("down", () => this.restartStage());
    this.keys.P.on("down", () => this.togglePause());
    this.keys.ENTER.on("down", () => {
      if (this.overlayMode === "start") this.dismissOverlay();
      if (this.overlayMode === "gameover" || this.overlayMode === "victory") this.newGame();
    });
    this.shopKeys = this.input.keyboard.addKeys({
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });
    this.shopKeys.one.on("down", () => this.buyUpgrade(0));
    this.shopKeys.two.on("down", () => this.buyUpgrade(1));
    this.shopKeys.three.on("down", () => this.buyUpgrade(2));
    this.shopKeys.esc.on("down", () => this.advanceToNextStage());
    this.input.keyboard.on("keydown", (event) => this.handleDebugConsoleKey(event));

    document.querySelectorAll("[data-control]").forEach((button) => {
      if (button.dataset.inputBound === "true") return;
      button.dataset.inputBound = "true";
      const control = button.dataset.control;
      const press = (event) => {
        event.preventDefault();
        button.classList.add("active");
        if (control === "bomb") {
          touchState.bombQueued = true;
        } else {
          touchState[control] = true;
        }
      };
      const release = (event) => {
        event.preventDefault();
        button.classList.remove("active");
        if (control !== "bomb") touchState[control] = false;
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });
  }

  createHud() {
    this.add.rectangle(WIDTH / 2, HUD_HEIGHT / 2, WIDTH, HUD_HEIGHT, 0x0c1428);
    this.add.rectangle(WIDTH / 2, HUD_HEIGHT - 2, WIDTH, 4, 0x35d9ff, 0.4);
    this.stageText = this.add.text(18, 15, "", this.hudStyle(18));
    this.enemyText = this.add.text(WIDTH / 2, 15, "", this.hudStyle(16)).setOrigin(0.5, 0);
    this.infoText = this.add.text(WIDTH - 18, 15, "", this.hudStyle(16)).setOrigin(1, 0);
  }

  hudStyle(size) {
    return {
      fontFamily: '"Trebuchet MS", Arial, sans-serif',
      fontSize: `${size}px`,
      fontStyle: "bold",
      color: "#eff6ff",
      stroke: "#0a1020",
      strokeThickness: 4,
    };
  }

  areaForStage(index = this.stageIndex) {
    return AREAS[Math.min(AREAS.length - 1, Math.floor(index / 4))];
  }

  tileTexture(type) {
    return `${this.areaForStage().id}-${type}`;
  }

  startStage(index, showIntro = false, startImmediately = false) {
    this.stageRunId = (this.stageRunId ?? 0) + 1;
    this.stageIndex = index;
    this.stageConfig = STAGES[index];
    setStageMusicActive(false);
    this.gameActive = false;
    this.playerDeathPending = false;
    this.deathRestartAt = 0;
    this.playerInvincibleUntil = 0;
    this.nextStageAt = 0;
    this.isPaused = false;
    this.physics.world.isPaused = false;
    this.overlayMode = null;
    this.activeBombs = 0;
    this.bombLimit = 1 + this.bombLevel;
    this.blastRadius = 2 + this.fireLevel;
    this.killCombo = null;
    this.exitOpen = false;
    this.exitCell = null;
    this.lastBombAt = 0;
    this.lastBombPunchAt = 0;
    this.playerFacing = { x: 1, y: 0 };
    this.clearStageObjects();
    this.buildStage();
    this.updateHud();

    if (showIntro) {
      this.physics.world.isPaused = true;
      this.showOverlay(
        "SUPER KOMATSU MAN",
        "敵をすべて倒して\n隠された出口を探せ",
        "ENTER / TAP TO START",
        "start",
      );
    } else if (startImmediately) {
      this.physics.world.isPaused = false;
      this.gameActive = true;
    } else {
      this.showStageCard();
    }
  }

  clearStageObjects() {
    this.time.removeAllEvents();
    const names = [
      "floorGroup",
      "solidWalls",
      "breakableWalls",
      "bombs",
      "flames",
      "enemies",
      "exitSprite",
      "player",
    ];
    names.forEach((name) => {
      const object = this[name];
      if (object?.destroy) object.destroy(true);
      this[name] = null;
    });
    this.overlay?.destroy();
    this.overlay = null;
    this.pauseLabel?.destroy();
    this.pauseLabel = null;
    this.tweens.killAll();
  }

  buildStage() {
    this.floorGroup = this.add.group();
    this.solidWalls = this.physics.add.staticGroup();
    this.breakableWalls = this.physics.add.staticGroup();
    this.bombs = this.physics.add.staticGroup();
    this.flames = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemies = this.physics.add.group({ allowGravity: false });
    this.solidCells = new Set();
    this.breakableByCell = new Map();
    this.bombByCell = new Map();
    this.nextEnemyId = 1;
    this.random = mulberry32(9271 + this.stageIndex * 7919);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const x = col * TILE + TILE / 2;
        const y = HUD_HEIGHT + row * TILE + TILE / 2;
        this.floorGroup.add(this.add.image(x, y, this.tileTexture("floor")));
        const solid =
          row === 0 ||
          row === ROWS - 1 ||
          col === 0 ||
          col === COLS - 1 ||
          (row % 2 === 0 && col % 2 === 0);
        if (solid) {
          this.solidWalls.create(x, y, this.tileTexture("solid"));
          this.solidCells.add(cellKey(col, row));
        }
      }
    }

    const spawnSafe = new Set([
      cellKey(1, 1),
      cellKey(2, 1),
      cellKey(1, 2),
      cellKey(3, 1),
      cellKey(1, 3),
    ]);
    const openCells = [];

    for (let row = 1; row < ROWS - 1; row += 1) {
      for (let col = 1; col < COLS - 1; col += 1) {
        const key = cellKey(col, row);
        if (this.solidCells.has(key) || spawnSafe.has(key)) continue;
        if (this.random() < this.stageConfig.walls) {
          const wall = this.breakableWalls.create(
            col * TILE + TILE / 2,
            HUD_HEIGHT + row * TILE + TILE / 2,
            this.tileTexture("breakable"),
          );
          wall.gridCol = col;
          wall.gridRow = row;
          this.breakableByCell.set(key, wall);
        } else {
          openCells.push({ col, row });
        }
      }
    }

    const wallCells = [...this.breakableByCell.values()].filter(
      (wall) => wall.gridCol > 4 || wall.gridRow > 4,
    );
    let exitWall = wallCells[Math.floor(this.random() * wallCells.length)];
    if (!exitWall) {
      exitWall = this.breakableWalls.create(TILE * 5.5, HUD_HEIGHT + TILE * 1.5, this.tileTexture("breakable"));
      exitWall.gridCol = 5;
      exitWall.gridRow = 1;
      this.breakableByCell.set(cellKey(5, 1), exitWall);
    }
    this.exitCell = { col: exitWall.gridCol, row: exitWall.gridRow };
    this.exitSprite = this.add
      .image(
        this.exitCell.col * TILE + TILE / 2,
        HUD_HEIGHT + this.exitCell.row * TILE + TILE / 2,
        "exit-hidden",
      )
      .setDepth(1)
      .setVisible(false);

    this.player = this.physics.add
      .sprite(TILE * 1.5, HUD_HEIGHT + TILE * 1.5, "player")
      .setDepth(6);
    this.player.body.setCircle(12, 10, 10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setBoundsRectangle(
      new Phaser.Geom.Rectangle(0, HUD_HEIGHT, WIDTH, ROWS * TILE),
    );

    this.physics.add.collider(this.player, this.solidWalls);
    this.physics.add.collider(
      this.player,
      this.breakableWalls,
      undefined,
      (_player, wall) => !this.wallPass || wall.burning,
    );
    this.physics.add.overlap(this.player, this.flames, () => this.queuePlayerDeath());
    this.physics.add.overlap(this.player, this.enemies, () => this.queuePlayerDeath());

    this.spawnEnemies(openCells);
    this.physics.add.collider(this.enemies, this.solidWalls, (enemy) => this.turnEnemy(enemy));
    this.physics.add.collider(
      this.enemies,
      this.breakableWalls,
      (enemy) => this.turnEnemy(enemy),
      (enemy) => enemy.enemyType !== "ghost",
    );
    this.physics.add.collider(
      this.enemies,
      this.bombs,
      (enemy) => this.turnEnemy(enemy),
      (enemy) => enemy.enemyType !== "pakunman",
    );
    this.physics.add.overlap(this.enemies, this.bombs, (enemy, bomb) =>
      this.enemyTouchBomb(enemy, bomb),
    );
    this.physics.add.overlap(this.enemies, this.flames, (enemy, flame) =>
      this.enemyTouchFlame(enemy, flame),
    );
  }

  spawnEnemies(openCells) {
    const cells = openCells.filter(
      ({ col, row }) => Math.abs(col - 1) + Math.abs(row - 1) >= 7,
    );
    for (let i = cells.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    this.stageConfig.enemies.forEach((count, typeIndex) => {
      const type = ENEMY_TYPES[typeIndex];
      for (let i = 0; i < count && cells.length > 0; i += 1) {
        const candidateIndex = cells.findIndex(
          ({ col, row }) =>
            this.availableEnemyDirections({ enemyType: type }, col, row).length > 0,
        );
        if (candidateIndex < 0) break;
        const [cell] = cells.splice(candidateIndex, 1);
        const enemy = this.enemies.create(
          cell.col * TILE + TILE / 2,
          HUD_HEIGHT + cell.row * TILE + TILE / 2,
          `enemy-${type}`,
        );
        enemy.enemyId = this.nextEnemyId;
        this.nextEnemyId += 1;
        enemy.enemyType = type;
        enemy.maxHealth = type === "pakunman" || type === "chevalier" ? 2 : 1;
        enemy.health = enemy.maxHealth;
        enemy.moveSpeed = this.stageConfig.speed + Math.min(typeIndex, 3) * 7;
        enemy.baseMoveSpeed = enemy.moveSpeed;
        enemy.moveDirection = { x: 0, y: 0 };
        enemy.lastCenterKey = cellKey(cell.col, cell.row);
        enemy.lastMoveX = enemy.x;
        enemy.lastMoveY = enemy.y;
        enemy.stuckSince = this.time.now;
        enemy.pakunmanTurnsUntilChange = type === "pakunman" ? 2 + Math.floor(this.random() * 2) : 0;
        enemy.pakunmanBaseScale = 1;
        enemy.pendingTurn = false;
        enemy.nextRetryAt = 0;
        enemy.nextBakudasoAt = type === "bakudaso" ? this.time.now + 6500 + this.random() * 1000 : 0;
        enemy.bakudasoBombMode = false;
        enemy.bakudasoExploding = false;
        enemy.chargingUntil = 0;
        enemy.hitCooldownUntil = 0;
        enemy.kedamaBurning = false;
        enemy.kedamaExploding = false;
        enemy.tepodonMode = null;
        enemy.tepodonTurned = false;
        enemy.tepodonExploding = false;
        enemy.body.setCircle(12, 10, 11);
        enemy.setDepth(type === "ghost" ? 4 : 5);
        if (type === "ghost") enemy.setAlpha(0.82);
        this.chooseEnemyDirection(enemy, cell.col, cell.row);
      }
    });
  }

  showStageCard() {
    this.gameActive = false;
    this.physics.world.isPaused = true;
    const title = `STAGE ${String(this.stageIndex + 1).padStart(2, "0")}`;
    this.showOverlay(title, `${this.areaForStage().name}\n${this.stageConfig.name}`, "READY", "stage");
    this.time.delayedCall(1350, () => this.dismissOverlay());
  }

  showOverlay(title, subtitle, prompt, mode) {
    this.overlay?.destroy();
    this.overlayMode = mode;
    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07101f, 0.84);
    shade.setInteractive().on("pointerdown", () => {
      if (mode === "start") this.dismissOverlay();
      if (mode === "gameover" || mode === "victory") this.newGame();
    });
    const titleText = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 76, title, {
        ...this.hudStyle(42),
        color: mode === "gameover" ? "#ff4d6d" : "#35d9ff",
        align: "center",
      })
      .setOrigin(0.5);
    const subtitleText = this.add
      .text(WIDTH / 2, HEIGHT / 2, subtitle, {
        ...this.hudStyle(21),
        color: "#ffffff",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    const promptText = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 78, prompt, {
        ...this.hudStyle(14),
        color: "#ffb341",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: promptText,
      alpha: 0.25,
      duration: 560,
      yoyo: true,
      repeat: -1,
    });
    this.overlay = this.add.container(0, 0, [shade, titleText, subtitleText, promptText]).setDepth(50);
  }

  dismissOverlay() {
    if (this.overlay) {
      this.tweens.killTweensOf(this.overlay.list);
      this.overlay.destroy();
      this.overlay = null;
    }
    this.overlayMode = null;
    this.physics.world.isPaused = false;
    this.gameActive = true;
    startStageMusic(this.stageIndex);
  }

  update(time, delta) {
    if (this.playerDeathPending) {
      this.resolvePlayerDeath(time);
      return;
    }
    if (this.deathRestartAt) {
      if (time >= this.deathRestartAt) this.finishPlayerDeath();
      return;
    }
    if (this.nextStageAt) {
      if (time >= this.nextStageAt) this.showUpgradeShop();
      return;
    }
    if (touchState.bombQueued) {
      touchState.bombQueued = false;
      this.placeBomb();
    }
    if (!this.gameActive || this.isPaused || !this.player?.active) return;
    this.updatePlayer();
    this.updateEnemies(time, delta);
    this.updateBombCollision();
    this.checkExit();
  }

  updatePlayer() {
    const left = this.cursors.left.isDown || this.keys.A.isDown || touchState.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || touchState.right;
    const up = this.cursors.up.isDown || this.keys.W.isDown || touchState.up;
    const down = this.cursors.down.isDown || this.keys.S.isDown || touchState.down;
    const speed = 132 + this.speedLevel * 12;
    let vx = 0;
    let vy = 0;

    if (left) vx = -speed;
    else if (right) vx = speed;
    if (up) vy = -speed;
    else if (down) vy = speed;
    if (vx && vy) {
      vx *= 0.707;
      vy *= 0.707;
    } else if (vx !== 0) {
      const row = Phaser.Math.Clamp(
        Math.round((this.player.y - HUD_HEIGHT - TILE / 2) / TILE),
        1,
        ROWS - 2,
      );
      const centerY = HUD_HEIGHT + row * TILE + TILE / 2;
      const offsetY = centerY - this.player.y;
      if (Math.abs(offsetY) <= 13) vy = Phaser.Math.Clamp(offsetY * 10, -96, 96);
    } else if (vy !== 0) {
      const col = Phaser.Math.Clamp(
        Math.round((this.player.x - TILE / 2) / TILE),
        1,
        COLS - 2,
      );
      const centerX = col * TILE + TILE / 2;
      const offsetX = centerX - this.player.x;
      if (Math.abs(offsetX) <= 13) vx = Phaser.Math.Clamp(offsetX * 10, -96, 96);
    }
    if (vx !== 0 || vy !== 0) {
      this.playerFacing = Math.abs(vx) >= Math.abs(vy)
        ? { x: Math.sign(vx), y: 0 }
        : { x: 0, y: Math.sign(vy) };
      this.tryPunchBomb(this.playerFacing);
    }
    this.player.setVelocity(vx, vy);
    if (vx !== 0) this.player.setFlipX(vx < 0);
  }

  updateEnemies(time, delta) {
    const centerTolerance = Math.max(2, (this.stageConfig.speed * delta) / 1000 + 0.8);
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.dying) return;
      if (enemy.enemyType === "bakudaso") this.updateBakudaso(enemy, time);
      if (enemy.bakudasoBombMode) return;
      if (enemy.enemyType === "tepodon" && this.updateTepodon(enemy, time)) return;
      if (enemy.enemyType === "chevalier") this.updateChevalier(enemy, time);
      if (enemy.enemyType === "pakunman") this.pakunmanEatNearbyBomb(enemy);
      if (enemy.enemyType === "pakunman") this.animatePakunman(enemy, time);

      const col = Phaser.Math.Clamp(Math.round((enemy.x - TILE / 2) / TILE), 1, COLS - 2);
      const row = Phaser.Math.Clamp(
        Math.round((enemy.y - HUD_HEIGHT - TILE / 2) / TILE),
        1,
        ROWS - 2,
      );
      const centerX = col * TILE + TILE / 2;
      const centerY = HUD_HEIGHT + row * TILE + TILE / 2;
      const key = cellKey(col, row);

      if (enemy.enemyType === "ghost" && this.recoverStuckGhost(enemy, time, col, row, centerX, centerY)) {
        return;
      }

      if (enemy.pendingTurn) {
        const turnCol = enemy.turnCol ?? col;
        const turnRow = enemy.turnRow ?? row;
        enemy.setPosition(
          turnCol * TILE + TILE / 2,
          HUD_HEIGHT + turnRow * TILE + TILE / 2,
        );
        enemy.pendingTurn = false;
        enemy.turnCol = null;
        enemy.turnRow = null;
        enemy.lastCenterKey = cellKey(turnCol, turnRow);
        this.chooseEnemyDirection(enemy, turnCol, turnRow);
        return;
      }

      if (
        enemy.moveDirection.x === 0 &&
        enemy.moveDirection.y === 0 &&
        time >= enemy.nextRetryAt
      ) {
        enemy.setPosition(centerX, centerY);
        this.chooseEnemyDirection(enemy, col, row);
        return;
      }

      const nearCenter =
        Math.abs(enemy.x - centerX) <= centerTolerance &&
        Math.abs(enemy.y - centerY) <= centerTolerance;
      if (nearCenter && enemy.lastCenterKey !== key) {
        enemy.setPosition(centerX, centerY);
        enemy.lastCenterKey = key;
        this.chooseEnemyDirection(enemy, col, row);
      }
    });
  }

  recoverStuckGhost(enemy, time, col, row, centerX, centerY) {
    const moved = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      enemy.lastMoveX ?? enemy.x,
      enemy.lastMoveY ?? enemy.y,
    );
    if (moved > 1.4) {
      enemy.lastMoveX = enemy.x;
      enemy.lastMoveY = enemy.y;
      enemy.stuckSince = time;
      return false;
    }
    if (time - (enemy.stuckSince ?? time) < 520) return false;

    enemy.setPosition(centerX, centerY);
    enemy.pendingTurn = false;
    enemy.turnCol = null;
    enemy.turnRow = null;
    enemy.lastCenterKey = cellKey(col, row);
    enemy.lastMoveX = enemy.x;
    enemy.lastMoveY = enemy.y;
    enemy.stuckSince = time;
    this.chooseEnemyDirection(enemy, col, row, true);
    return true;
  }

  availableEnemyDirections(enemy, col, row) {
    return [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].filter(({ x, y }) => {
      const key = cellKey(col + x, row + y);
      if (this.solidCells.has(key)) return false;
      if (this.bombByCell.has(key) && enemy.enemyType !== "pakunman") return false;
      const wall = this.breakableByCell.get(key);
      if (wall?.burning && enemy.enemyType !== "ghost") return false;
      return enemy.enemyType === "ghost" || !wall;
    });
  }

  chooseEnemyDirection(enemy, col, row, forceTurn = false) {
    const available = this.availableEnemyDirections(enemy, col, row);
    if (available.length === 0) {
      enemy.moveDirection = { x: 0, y: 0 };
      enemy.setVelocity(0, 0);
      enemy.nextRetryAt = this.time.now + 300;
      return;
    }

    const canContinueForward = available.some(
      (direction) =>
        direction.x === enemy.moveDirection.x && direction.y === enemy.moveDirection.y,
    );
    if (enemy.enemyType === "wander" && canContinueForward) {
      enemy.nextRetryAt = 0;
      enemy.setVelocity(
        enemy.moveDirection.x * enemy.moveSpeed,
        enemy.moveDirection.y * enemy.moveSpeed,
      );
      return;
    }

    if (enemy.enemyType === "ghost" && canContinueForward && !forceTurn && this.random() < 0.72) {
      enemy.nextRetryAt = 0;
      enemy.setVelocity(
        enemy.moveDirection.x * enemy.moveSpeed,
        enemy.moveDirection.y * enemy.moveSpeed,
      );
      return;
    }

    const reverse = {
      x: -enemy.moveDirection.x,
      y: -enemy.moveDirection.y,
    };
    const forwardChoices = available.filter(
      (direction) => direction.x !== reverse.x || direction.y !== reverse.y,
    );
    const choices = forwardChoices.length > 0 ? forwardChoices : available;
    const bombTarget = enemy.enemyType === "pakunman" ? this.nearestBombCell(col, row) : null;
    const shouldChase =
      enemy.enemyType === "chaser" ||
      Boolean(bombTarget) ||
      (enemy.enemyType === "kedama" && enemy.kedamaBurning);

    let direction;
    if (shouldChase) {
      const playerCol = bombTarget?.col ?? Math.floor(this.player.x / TILE);
      const playerRow = bombTarget?.row ?? Math.floor((this.player.y - HUD_HEIGHT) / TILE);
      const bestDistance = Math.min(
        ...choices.map(
          (candidate) =>
            Math.abs(playerCol - (col + candidate.x)) +
            Math.abs(playerRow - (row + candidate.y)),
        ),
      );
      const bestChoices = choices.filter(
        (candidate) =>
          Math.abs(playerCol - (col + candidate.x)) +
            Math.abs(playerRow - (row + candidate.y)) ===
          bestDistance,
      );
      direction = bestChoices[Math.floor(this.random() * bestChoices.length)];
    } else if (enemy.enemyType === "pakunman" && canContinueForward && !forceTurn) {
      enemy.pakunmanTurnsUntilChange = Math.max(0, (enemy.pakunmanTurnsUntilChange ?? 2) - 1);
      if (enemy.pakunmanTurnsUntilChange > 0) {
        direction = enemy.moveDirection;
      } else {
        const turnChoices = choices.filter(
          (candidate) =>
            candidate.x !== enemy.moveDirection.x || candidate.y !== enemy.moveDirection.y,
        );
        const pakunmanChoices = turnChoices.length > 0 ? turnChoices : choices;
        direction = pakunmanChoices[Math.floor(this.random() * pakunmanChoices.length)];
        enemy.pakunmanTurnsUntilChange = 2 + Math.floor(this.random() * 2);
      }
    } else {
      direction = choices[Math.floor(this.random() * choices.length)];
    }

    enemy.moveDirection = direction;
    enemy.nextRetryAt = 0;
    enemy.setVelocity(direction.x * enemy.moveSpeed, direction.y * enemy.moveSpeed);
    if (enemy.enemyType === "tepodon") this.rotateTepodon(enemy, direction);
    if (enemy.enemyType === "pakunman") this.rotatePakunman(enemy, direction);
  }

  rotatePakunman(enemy, direction) {
    if (!direction) return;
    if (direction.x > 0) enemy.setAngle(0);
    else if (direction.x < 0) enemy.setAngle(180);
    else if (direction.y > 0) enemy.setAngle(90);
    else if (direction.y < 0) enemy.setAngle(-90);
  }

  animatePakunman(enemy, time) {
    const moving = Math.abs(enemy.body.velocity.x) + Math.abs(enemy.body.velocity.y) > 2;
    if (!moving) {
      enemy.setScale(1);
      return;
    }
    const open = (Math.sin(time * 0.022) + 1) / 2;
    enemy.setScale(0.88 + open * 0.18, 1.08 - open * 0.1);
  }

  nearestBombCell(col, row) {
    let nearest = null;
    this.bombs.children.iterate((bomb) => {
      if (!bomb?.active || bomb.exploded) return;
      const distance = Math.abs(col - bomb.gridCol) + Math.abs(row - bomb.gridRow);
      if (!nearest || distance < nearest.distance) {
        nearest = { col: bomb.gridCol, row: bomb.gridRow, distance };
      }
    });
    return nearest;
  }

  pakunmanEatNearbyBomb(enemy) {
    this.bombs.children.iterate((bomb) => {
      if (!bomb?.active || bomb.exploded) return;
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, bomb.x, bomb.y);
      if (distance <= 24) this.enemyTouchBomb(enemy, bomb);
    });
  }

  updateChevalier(enemy, time) {
    if (time < enemy.chargingUntil) return;
    const direction = enemy.moveDirection;
    if (!direction || (direction.x === 0 && direction.y === 0)) return;

    const enemyCol = Math.round((enemy.x - TILE / 2) / TILE);
    const enemyRow = Math.round((enemy.y - HUD_HEIGHT - TILE / 2) / TILE);
    const playerCol = Math.floor(this.player.x / TILE);
    const playerRow = Math.floor((this.player.y - HUD_HEIGHT) / TILE);
    const ahead =
      direction.x !== 0
        ? playerRow === enemyRow && playerCol - enemyCol === direction.x
        : playerCol === enemyCol && playerRow - enemyRow === direction.y;
    const spearAhead =
      direction.x !== 0
        ? playerRow === enemyRow && playerCol - enemyCol === direction.x * 2
        : playerCol === enemyCol && playerRow - enemyRow === direction.y * 2;

    if (ahead || spearAhead) {
      enemy.chargingUntil = time + 520;
      enemy.setVelocity(direction.x * enemy.moveSpeed * 2, direction.y * enemy.moveSpeed * 2);
      this.showChevalierSpear(enemy, direction);
      this.queuePlayerDeath();
    }
  }

  showChevalierSpear(enemy, direction) {
    const horizontal = direction.x !== 0;
    const spear = this.add
      .image(
        enemy.x + direction.x * TILE,
        enemy.y + direction.y * TILE,
        "spear",
      )
      .setDepth(7)
      .setAlpha(0.9)
      .setScale(2, 1);
    spear.setAngle(horizontal ? (direction.x < 0 ? 180 : 0) : direction.y > 0 ? 90 : -90);
    this.tweens.add({
      targets: spear,
      alpha: 0,
      duration: 260,
      onComplete: () => spear.destroy(),
    });
  }

  updateTepodon(enemy, time) {
    if (enemy.tepodonMode === "arming") return true;
    if (enemy.tepodonMode === "charging") {
      this.updateTepodonCharge(enemy);
      return true;
    }
    if (this.tepodonSeesPlayer(enemy)) {
      this.armTepodon(enemy);
      return true;
    }
    return false;
  }

  tepodonSeesPlayer(enemy) {
    const direction = enemy.moveDirection;
    if (!direction || (direction.x === 0 && direction.y === 0)) return false;
    const enemyCol = Phaser.Math.Clamp(Math.round((enemy.x - TILE / 2) / TILE), 1, COLS - 2);
    const enemyRow = Phaser.Math.Clamp(
      Math.round((enemy.y - HUD_HEIGHT - TILE / 2) / TILE),
      1,
      ROWS - 2,
    );
    const playerCol = Phaser.Math.Clamp(Math.floor(this.player.x / TILE), 1, COLS - 2);
    const playerRow = Phaser.Math.Clamp(
      Math.floor((this.player.y - HUD_HEIGHT) / TILE),
      1,
      ROWS - 2,
    );
    const sameLine =
      direction.x !== 0
        ? enemyRow === playerRow && (playerCol - enemyCol) * direction.x > 0
        : enemyCol === playerCol && (playerRow - enemyRow) * direction.y > 0;
    if (!sameLine) return false;

    const distance = direction.x !== 0
      ? Math.abs(playerCol - enemyCol)
      : Math.abs(playerRow - enemyRow);
    for (let step = 1; step < distance; step += 1) {
      const key = cellKey(enemyCol + direction.x * step, enemyRow + direction.y * step);
      if (this.solidCells.has(key) || this.breakableByCell.has(key) || this.bombByCell.has(key)) {
        return false;
      }
    }
    return true;
  }

  armTepodon(enemy) {
    enemy.tepodonMode = "arming";
    enemy.tepodonTurned = false;
    enemy.setTexture("enemy-tepodon-rocket");
    enemy.setVelocity(0, 0);
    enemy.setScale(1.08);
    this.rotateTepodon(enemy, enemy.moveDirection);
    this.tweens.add({
      targets: enemy,
      scale: 0.92,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });
    enemy.tepodonArmEvent = this.time.delayedCall(500, () => this.startTepodonCharge(enemy));
  }

  startTepodonCharge(enemy) {
    if (!enemy?.active || enemy.dying || enemy.tepodonMode !== "arming") return;
    enemy.tepodonMode = "charging";
    enemy.tepodonSpeed = Math.max(enemy.baseMoveSpeed * 3.1, this.stageConfig.speed + 170);
    enemy.setScale(1);
    this.setTepodonChargeDirection(enemy, enemy.moveDirection);
  }

  updateTepodonCharge(enemy) {
    const direction = enemy.moveDirection;
    if (!direction || (direction.x === 0 && direction.y === 0)) return;
    const axisTolerance = 10;
    const playerCol = Phaser.Math.Clamp(Math.floor(this.player.x / TILE), 1, COLS - 2);
    const playerRow = Phaser.Math.Clamp(
      Math.floor((this.player.y - HUD_HEIGHT) / TILE),
      1,
      ROWS - 2,
    );
    const playerCenterX = playerCol * TILE + TILE / 2;
    const playerCenterY = HUD_HEIGHT + playerRow * TILE + TILE / 2;

    if (!enemy.tepodonTurned) {
      if (direction.x !== 0 && Math.abs(enemy.x - playerCenterX) <= axisTolerance) {
        const turnY = Math.sign(playerCenterY - enemy.y);
        if (turnY === 0) {
          this.explodeTepodon(enemy);
          return;
        }
        if (turnY !== 0) {
          enemy.setPosition(playerCenterX, enemy.y);
          enemy.tepodonTurned = true;
          this.setTepodonChargeDirection(enemy, { x: 0, y: turnY });
        }
      } else if (direction.y !== 0 && Math.abs(enemy.y - playerCenterY) <= axisTolerance) {
        const turnX = Math.sign(playerCenterX - enemy.x);
        if (turnX === 0) {
          this.explodeTepodon(enemy);
          return;
        }
        if (turnX !== 0) {
          enemy.setPosition(enemy.x, playerCenterY);
          enemy.tepodonTurned = true;
          this.setTepodonChargeDirection(enemy, { x: turnX, y: 0 });
        }
      }
      return;
    }

    const reachedSecondAxis =
      direction.x !== 0
        ? Math.abs(enemy.x - playerCenterX) <= axisTolerance
        : Math.abs(enemy.y - playerCenterY) <= axisTolerance;
    if (reachedSecondAxis) this.explodeTepodon(enemy);
  }

  setTepodonChargeDirection(enemy, direction) {
    enemy.moveDirection = direction;
    this.rotateTepodon(enemy, direction);
    enemy.setVelocity(
      direction.x * enemy.tepodonSpeed,
      direction.y * enemy.tepodonSpeed,
    );
  }

  rotateTepodon(enemy, direction) {
    if (!direction) return;
    if (direction.x > 0) enemy.setAngle(0);
    else if (direction.x < 0) enemy.setAngle(180);
    else if (direction.y > 0) enemy.setAngle(90);
    else if (direction.y < 0) enemy.setAngle(-90);
  }

  explodeTepodon(enemy) {
    if (!enemy?.active || enemy.tepodonExploding) return;
    enemy.tepodonExploding = true;
    enemy.tepodonArmEvent?.remove(false);
    this.tweens.killTweensOf(enemy);
    const col = Phaser.Math.Clamp(Math.round((enemy.x - TILE / 2) / TILE), 1, COLS - 2);
    const row = Phaser.Math.Clamp(Math.round((enemy.y - HUD_HEIGHT - TILE / 2) / TILE), 1, ROWS - 2);
    enemy.dying = true;
    enemy.body.enable = false;
    enemy.setVelocity(0, 0);
    this.createExplosionPattern(col, row, 8, enemy);
    this.cameras.main.shake(140, 0.008);
    this.awardEnemyScore(enemy);
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 0.1,
      duration: 120,
      onComplete: () => {
        enemy.destroy();
        this.updateHud();
      },
    });
  }

  updateBakudaso(enemy, time) {
    if (enemy.bakudasoBombMode || time < enemy.nextBakudasoAt) return;
    enemy.bakudasoBombMode = true;
    enemy.setTexture("bomb");
    enemy.setVelocity(0, 0);
    enemy.moveDirection = { x: 0, y: 0 };
    enemy.bakudasoExplodeAt = time + ENEMY_BOMB_FUSE_DURATION;
    this.time.delayedCall(ENEMY_BOMB_FUSE_DURATION, () => this.explodeBakudaso(enemy));
  }

  explodeBakudaso(enemy) {
    if (!enemy?.active || !enemy.bakudasoBombMode || enemy.bakudasoExploding) return;
    enemy.bakudasoExploding = true;
    const col = Phaser.Math.Clamp(Math.round((enemy.x - TILE / 2) / TILE), 1, COLS - 2);
    const row = Phaser.Math.Clamp(Math.round((enemy.y - HUD_HEIGHT - TILE / 2) / TILE), 1, ROWS - 2);
    this.createExplosionPattern(col, row, 2, enemy);
    this.time.delayedCall(620, () => {
      if (!enemy?.active) return;
      enemy.bakudasoBombMode = false;
      enemy.bakudasoExploding = false;
      enemy.nextBakudasoAt = this.time.now + 6500 + this.random() * 1000;
      enemy.body.enable = true;
      enemy.setTexture("enemy-bakudaso");
      enemy.health = enemy.maxHealth;
      enemy.setAlpha(1).setScale(1);
      this.chooseEnemyDirection(enemy, col, row);
    });
  }

  turnEnemy(enemy) {
    if (!enemy?.active) return;
    if (enemy.enemyType === "tepodon" && enemy.tepodonMode === "charging") {
      this.explodeTepodon(enemy);
      return;
    }
    const gridX = (enemy.x - TILE / 2) / TILE;
    const gridY = (enemy.y - HUD_HEIGHT - TILE / 2) / TILE;
    enemy.turnCol = Phaser.Math.Clamp(
      enemy.moveDirection.x > 0
        ? Math.floor(gridX)
        : enemy.moveDirection.x < 0
          ? Math.ceil(gridX)
          : Math.round(gridX),
      1,
      COLS - 2,
    );
    enemy.turnRow = Phaser.Math.Clamp(
      enemy.moveDirection.y > 0
        ? Math.floor(gridY)
        : enemy.moveDirection.y < 0
          ? Math.ceil(gridY)
          : Math.round(gridY),
      1,
      ROWS - 2,
    );
    enemy.setVelocity(0, 0);
    enemy.pendingTurn = true;
  }

  placeBomb() {
    if (!this.gameActive || this.isPaused || !this.player?.active) return;
    if (this.activeBombs >= this.bombLimit || this.time.now - this.lastBombAt < 180) return;
    const col = Phaser.Math.Clamp(Math.floor(this.player.x / TILE), 1, COLS - 2);
    const row = Phaser.Math.Clamp(Math.floor((this.player.y - HUD_HEIGHT) / TILE), 1, ROWS - 2);
    const key = cellKey(col, row);
    if (this.bombByCell.has(key)) return;

    const bomb = this.bombs.create(
      col * TILE + TILE / 2,
      HUD_HEIGHT + row * TILE + TILE / 2,
      "bomb",
    );
    bomb.gridCol = col;
    bomb.gridRow = row;
    bomb.ownerClear = false;
    bomb.exploded = false;
    bomb.remote = this.remoteBomb;
    bomb.createdAt = this.time.now;
    bomb.setDepth(3);
    this.bombByCell.set(key, bomb);
    this.activeBombs += 1;
    this.lastBombAt = this.time.now;
    this.tweens.add({
      targets: bomb,
      scale: 1.14,
      duration: 240,
      yoyo: true,
      repeat: -1,
    });
    if (!this.remoteBomb) {
      bomb.fuseEvent = this.time.delayedCall(BOMB_FUSE_DURATION, () => this.explodeBomb(bomb));
    }
  }

  updateBombCollision() {
    this.bombs.children.iterate((bomb) => {
      if (!bomb?.active || bomb.ownerClear) return;
      const playerCol = Math.floor(this.player.x / TILE);
      const playerRow = Math.floor((this.player.y - HUD_HEIGHT) / TILE);
      if (playerCol !== bomb.gridCol || playerRow !== bomb.gridRow) {
        bomb.ownerClear = true;
        this.physics.add.collider(this.player, bomb);
      }
    });
  }

  explodeBomb(bomb) {
    if (!bomb?.active || bomb.exploded) return;
    bomb.exploded = true;
    bomb.fuseEvent?.remove(false);
    this.tweens.killTweensOf(bomb);
    this.bombByCell.delete(cellKey(bomb.gridCol, bomb.gridRow));
    this.activeBombs = Math.max(0, this.activeBombs - 1);
    const origin = { col: bomb.gridCol, row: bomb.gridRow };
    bomb.destroy();
    this.createExplosionPattern(origin.col, origin.row, this.blastRadius);
    this.cameras.main.shake(90, 0.004);
  }

  useActionPower() {
    if (!this.gameActive || this.isPaused || !this.player?.active) return;
    const direction = this.playerFacing ?? { x: 1, y: 0 };
    if (this.glove && this.throwAdjacentBomb(direction)) return;
    if (this.remoteBomb) this.detonateOldestRemoteBomb();
  }

  detonateOldestRemoteBomb() {
    let oldest = null;
    this.bombs.children.iterate((bomb) => {
      if (!bomb?.active || bomb.exploded || !bomb.remote) return;
      if (!oldest || (bomb.createdAt ?? 0) < (oldest.createdAt ?? 0)) oldest = bomb;
    });
    if (oldest) this.explodeBomb(oldest);
  }

  tryPunchBomb(direction) {
    if (!this.punch || this.time.now - this.lastBombPunchAt < 280) return false;
    if (!direction || (direction.x === 0 && direction.y === 0)) return false;
    const playerCol = Phaser.Math.Clamp(Math.floor(this.player.x / TILE), 1, COLS - 2);
    const playerRow = Phaser.Math.Clamp(Math.floor((this.player.y - HUD_HEIGHT) / TILE), 1, ROWS - 2);
    const bomb = this.bombByCell.get(cellKey(playerCol + direction.x, playerRow + direction.y));
    if (!bomb) return false;
    const moved = this.moveBombToCell(bomb, bomb.gridCol + direction.x, bomb.gridRow + direction.y, 90);
    if (moved) this.lastBombPunchAt = this.time.now;
    return moved;
  }

  throwAdjacentBomb(direction) {
    if (!direction || (direction.x === 0 && direction.y === 0)) return false;
    const playerCol = Phaser.Math.Clamp(Math.floor(this.player.x / TILE), 1, COLS - 2);
    const playerRow = Phaser.Math.Clamp(Math.floor((this.player.y - HUD_HEIGHT) / TILE), 1, ROWS - 2);
    const bomb = this.bombByCell.get(cellKey(playerCol + direction.x, playerRow + direction.y));
    if (!bomb) return false;

    let targetCol = bomb.gridCol;
    let targetRow = bomb.gridRow;
    for (let distance = 1; distance <= 3; distance += 1) {
      const nextCol = bomb.gridCol + direction.x * distance;
      const nextRow = bomb.gridRow + direction.y * distance;
      if (!this.canBombMoveTo(nextCol, nextRow)) break;
      targetCol = nextCol;
      targetRow = nextRow;
    }
    if (targetCol === bomb.gridCol && targetRow === bomb.gridRow) return false;
    return this.moveBombToCell(bomb, targetCol, targetRow, 180);
  }

  canBombMoveTo(col, row) {
    const key = cellKey(col, row);
    return (
      col > 0 &&
      col < COLS - 1 &&
      row > 0 &&
      row < ROWS - 1 &&
      !this.solidCells.has(key) &&
      !this.breakableByCell.has(key) &&
      !this.bombByCell.has(key)
    );
  }

  moveBombToCell(bomb, col, row, duration) {
    if (!bomb?.active || bomb.exploded || !this.canBombMoveTo(col, row)) return false;
    this.bombByCell.delete(cellKey(bomb.gridCol, bomb.gridRow));
    bomb.gridCol = col;
    bomb.gridRow = row;
    bomb.ownerClear = true;
    this.bombByCell.set(cellKey(col, row), bomb);
    this.physics.add.collider(this.player, bomb);
    this.tweens.add({
      targets: bomb,
      x: col * TILE + TILE / 2,
      y: HUD_HEIGHT + row * TILE + TILE / 2,
      duration,
      ease: "Sine.Out",
      onUpdate: () => bomb.body.updateFromGameObject(),
      onComplete: () => bomb.body.updateFromGameObject(),
    });
    return true;
  }

  createExplosionPattern(originCol, originRow, radius, sourceEnemy = null) {
    playExplosionSound();
    this.createFlame(originCol, originRow, sourceEnemy);

    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    directions.forEach(([dx, dy]) => {
      for (let distance = 1; distance <= radius; distance += 1) {
        const col = originCol + dx * distance;
        const row = originRow + dy * distance;
        const key = cellKey(col, row);
        if (this.solidCells.has(key)) break;
        this.createFlame(col, row, sourceEnemy);

        const chainedBomb = this.bombByCell.get(key);
        if (chainedBomb) this.time.delayedCall(30, () => this.explodeBomb(chainedBomb));

        const wall = this.breakableByCell.get(key);
        if (wall) {
          this.destroyWall(wall);
          if (!this.pierceBomb) break;
        }
      }
    });
  }

  createFlame(col, row, sourceEnemy = null) {
    const flame = this.flames.create(
      col * TILE + TILE / 2,
      HUD_HEIGHT + row * TILE + TILE / 2,
      "flame",
    );
    flame.sourceEnemyId = sourceEnemy?.enemyId ?? null;
    flame.body.setSize(34, 34).setOffset(5, 5);
    flame.setDepth(8).setScale(0.3);
    this.tweens.add({
      targets: flame,
      scale: 1,
      duration: 75,
      ease: "Back.Out",
    });
    this.time.delayedCall(440, () => {
      if (!flame.active) return;
      this.tweens.add({
        targets: flame,
        alpha: 0,
        scale: 0.55,
        duration: 100,
        onComplete: () => flame.destroy(),
      });
    });
  }

  destroyWall(wall) {
    if (!wall?.active || wall.burning) return;
    wall.burning = true;
    const key = cellKey(wall.gridCol, wall.gridRow);
    const wasExit = wall.gridCol === this.exitCell.col && wall.gridRow === this.exitCell.row;
    wall.setTexture(this.tileTexture("breakable-burning"));
    this.tweens.add({
      targets: wall,
      alpha: 0,
      scale: 0.15,
      angle: 25,
      delay: 390,
      duration: 150,
      onComplete: () => {
        this.breakableByCell.delete(key);
        wall.destroy();
        if (wasExit) {
          this.exitOpen = true;
          this.exitSprite.setVisible(true).setDepth(2).setScale(0.1);
          this.tweens.add({
            targets: this.exitSprite,
            scale: 1,
            duration: 300,
            ease: "Back.Out",
          });
        }
      },
    });
    this.score += 10;
    this.updateHud();
  }

  enemyTouchBomb(enemy, bomb) {
    if (enemy?.enemyType !== "pakunman" || !bomb?.active || bomb.exploded) return;
    this.removeBomb(bomb);
    enemy.setScale(1.25);
    this.tweens.add({
      targets: enemy,
      scale: 1,
      duration: 140,
      ease: "Back.Out",
    });
  }

  removeBomb(bomb) {
    if (!bomb?.active) return;
    bomb.fuseEvent?.remove(false);
    this.tweens.killTweensOf(bomb);
    this.bombByCell.delete(cellKey(bomb.gridCol, bomb.gridRow));
    this.activeBombs = Math.max(0, this.activeBombs - 1);
    bomb.destroy();
  }

  enemyTouchFlame(enemy, flame) {
    if (enemy?.enemyType === "bakudaso" && flame?.sourceEnemyId === enemy.enemyId) {
      return;
    }
    if (enemy?.enemyType === "tepodon" && flame?.sourceEnemyId === enemy.enemyId) {
      return;
    }
    if (enemy?.enemyType === "kedama" && flame?.sourceEnemyId === enemy.enemyId) {
      return;
    }
    this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (!enemy?.active || enemy.dying) return;
    if (this.time.now < (enemy.hitCooldownUntil ?? 0)) return;
    if (enemy.enemyType === "bakudaso" && enemy.bakudasoBombMode) {
      this.explodeBakudaso(enemy);
      return;
    }
    if (enemy.enemyType === "kedama") {
      this.igniteKedama(enemy);
      return;
    }
    enemy.health = (enemy.health ?? 1) - 1;
    enemy.hitCooldownUntil = this.time.now + 520;
    if (enemy.health > 0) {
      this.tweens.add({
        targets: enemy,
        alpha: 0.35,
        duration: 70,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          if (enemy?.active) enemy.setAlpha(enemy.enemyType === "ghost" ? 0.82 : 1);
        },
      });
      return;
    }

    enemy.dying = true;
    enemy.body.enable = false;
    enemy.setVelocity(0, 0);
    this.awardEnemyScore(enemy);
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 1.8,
      angle: 180,
      duration: 220,
      onComplete: () => {
        enemy.destroy();
        this.updateHud();
      },
    });
  }

  enemyScore(type) {
    return {
      wander: 100,
      chaser: 200,
      ghost: 300,
      pakunman: 250,
      chevalier: 350,
      bakudaso: 300,
      kedama: 400,
      tepodon: 500,
    }[type] ?? 100;
  }

  awardEnemyScore(enemy) {
    const now = this.time.now;
    if (!this.killCombo || now - this.killCombo.lastAt > 180) {
      this.killCombo = { count: 0, lastAt: now };
    }
    this.killCombo.count += 1;
    this.killCombo.lastAt = now;
    const multiplier = 1 + Math.max(0, this.killCombo.count - 1) * 0.5;
    const base = this.enemyScore(enemy.enemyType);
    const gained = Math.round(base * multiplier);
    this.score += gained;
    this.showScorePopup(enemy.x, enemy.y - 18, gained, multiplier);
    this.updateHud();
  }

  showScorePopup(x, y, gained, multiplier) {
    const label = multiplier > 1 ? `+${gained} x${multiplier.toFixed(1)}` : `+${gained}`;
    const popup = this.add
      .text(x, y, label, {
        ...this.hudStyle(15),
        color: multiplier > 1 ? "#ffb341" : "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: popup,
      y: y - 24,
      alpha: 0,
      scale: multiplier > 1 ? 1.25 : 1,
      duration: 680,
      ease: "Sine.Out",
      onComplete: () => popup.destroy(),
    });
  }

  igniteKedama(enemy) {
    if (!enemy?.active || enemy.kedamaBurning || enemy.kedamaExploding) return;
    enemy.kedamaBurning = true;
    enemy.hitCooldownUntil = this.time.now + 520;
    enemy.setTexture("enemy-kedama-burning");
    enemy.moveSpeed = Math.max(enemy.baseMoveSpeed * 2.35, this.stageConfig.speed + 105);
    enemy.setAlpha(1).setScale(1.08);
    enemy.pendingTurn = false;
    const col = Phaser.Math.Clamp(Math.round((enemy.x - TILE / 2) / TILE), 1, COLS - 2);
    const row = Phaser.Math.Clamp(Math.round((enemy.y - HUD_HEIGHT - TILE / 2) / TILE), 1, ROWS - 2);
    this.chooseEnemyDirection(enemy, col, row);
    this.tweens.add({
      targets: enemy,
      scale: 1.22,
      duration: 120,
      yoyo: true,
      repeat: -1,
    });
    enemy.kedamaFuseEvent = this.time.delayedCall(5000, () => this.explodeKedama(enemy));
  }

  explodeKedama(enemy) {
    if (!enemy?.active || enemy.kedamaExploding) return;
    enemy.kedamaExploding = true;
    enemy.kedamaFuseEvent?.remove(false);
    this.tweens.killTweensOf(enemy);
    const col = Phaser.Math.Clamp(Math.round((enemy.x - TILE / 2) / TILE), 1, COLS - 2);
    const row = Phaser.Math.Clamp(Math.round((enemy.y - HUD_HEIGHT - TILE / 2) / TILE), 1, ROWS - 2);
    enemy.dying = true;
    enemy.body.enable = false;
    enemy.setVelocity(0, 0);
    this.createExplosionPattern(col, row, 8, enemy);
    this.cameras.main.shake(140, 0.008);
    this.awardEnemyScore(enemy);
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 0.1,
      duration: 120,
      onComplete: () => {
        enemy.destroy();
        this.updateHud();
      },
    });
  }

  queuePlayerDeath() {
    if (
      !this.gameActive ||
      !this.player?.active ||
      this.player.dying ||
      this.time.now < this.playerInvincibleUntil
    ) {
      return;
    }
    if (this.heartCharges > 0) {
      this.heartCharges -= 1;
      this.playerInvincibleUntil = this.time.now + 1400;
      this.updateHud();
      this.tweens.add({
        targets: this.player,
        alpha: 0.25,
        duration: 80,
        yoyo: true,
        repeat: 8,
        onComplete: () => {
          if (this.player?.active) this.player.setAlpha(1);
        },
      });
      return;
    }
    this.player.dying = true;
    this.playerDeathPending = true;
    this.gameActive = false;
    this.player.setVelocity(0, 0);
  }

  resolvePlayerDeath(time) {
    if (!this.playerDeathPending) return;
    this.playerDeathPending = false;
    this.lives -= 1;
    this.clearTemporaryPowerUpsOnDeath();
    this.updateHud();
    this.player.body.enable = false;
    this.cameras.main.shake(240, 0.012);
    this.tweens.add({
      targets: this.player,
      alpha: 0,
      scale: 0.15,
      angle: 360,
      duration: 480,
      ease: "Back.In",
    });
    this.deathRestartAt = time + 520;
  }

  clearTemporaryPowerUpsOnDeath() {
    const hadRemoteBomb = this.remoteBomb;
    this.punch = false;
    this.glove = false;
    this.wallPass = false;
    this.pierceBomb = false;
    this.remoteBomb = false;

    if (!hadRemoteBomb) return;
    this.bombs.children.iterate((bomb) => {
      if (!bomb?.active || bomb.exploded || bomb.fuseEvent) return;
      bomb.remote = false;
      bomb.fuseEvent = this.time.delayedCall(
        BOMB_FUSE_DURATION,
        () => this.explodeBomb(bomb),
      );
    });
  }

  finishPlayerDeath() {
    this.deathRestartAt = 0;
    if (this.lives <= 0) {
      this.physics.world.isPaused = true;
      setStageMusicActive(false);
      this.showOverlay("GAME OVER", `SCORE  ${this.score}`, "TAP / ENTER TO RETRY", "gameover");
    } else {
      const spawnX = TILE * 1.5;
      const spawnY = HUD_HEIGHT + TILE * 1.5;
      this.player
        .setAlpha(1)
        .setScale(1)
        .setAngle(0)
        .setVisible(true);
      this.player.body.enable = true;
      this.player.body.reset(spawnX, spawnY);
      this.player.setVelocity(0, 0);
      this.player.dying = false;
      this.playerInvincibleUntil = this.time.now + 1600;
      this.gameActive = true;
      this.tweens.add({
        targets: this.player,
        alpha: 0.25,
        duration: 100,
        yoyo: true,
        repeat: 7,
        onComplete: () => {
          if (this.player?.active) this.player.setAlpha(1);
        },
      });
    }
  }

  checkExit() {
    if (!this.exitOpen || this.enemies.countActive(true) > 0) return;
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.exitSprite.x,
      this.exitSprite.y,
    );
    if (distance > 18) return;
    this.gameActive = false;
    this.physics.world.isPaused = true;
    setStageMusicActive(false);
    this.score += 1000 + this.stageIndex * 250;
    if (this.stageIndex >= STAGES.length - 1) {
      this.showOverlay(
        "ALL CLEAR!",
        `FINAL SCORE  ${this.score}\n20 STAGES COMPLETE`,
        "TAP / ENTER TO PLAY AGAIN",
        "victory",
      );
    } else {
      this.showOverlay(
        "STAGE CLEAR",
        `SCORE  ${this.score}`,
        `NEXT  STAGE ${String(this.stageIndex + 2).padStart(2, "0")}`,
        "clear",
      );
      this.nextStageAt = this.time.now + 1500;
    }
  }

  upgradeLevelCost(type, level) {
    const costs = {
      bomb: 500 + level * 300,
      fire: 600 + level * 350,
      speed: 450 + level * 250,
    };
    return costs[type] ?? 0;
  }

  upgradeMultiCost(type, amount, extra = 0) {
    const current = type === "bomb" ? this.bombLevel : type === "fire" ? this.fireLevel : this.speedLevel;
    let cost = extra;
    for (let index = 0; index < amount; index += 1) {
      cost += this.upgradeLevelCost(type, current + index);
    }
    return cost;
  }

  lifeUpgradeCost(amount) {
    return 850 * amount + Math.max(0, this.lives - 1) * 180 * amount + (amount - 1) * 450;
  }

  makeUpgradePool() {
    const speed = 132 + this.speedLevel * 12;
    const canUpgradeBomb = (amount) => this.bombLimit + amount <= POWER_MAX.bombLimit;
    const canUpgradeFire = (amount) => this.blastRadius + amount <= POWER_MAX.blastRadius;
    const canUpgradeSpeed = (amount) => this.speedLevel + amount <= POWER_MAX.speedLevel;
    const pool = [
      {
        id: "bomb1",
        rarity: "common",
        title: "BOMB +1",
        detail: `同時設置 ${this.bombLimit} > ${this.bombLimit + 1}`,
        level: this.bombLevel,
        cost: this.upgradeMultiCost("bomb", 1),
        available: canUpgradeBomb(1),
        apply: () => { this.bombLevel += 1; },
      },
      {
        id: "fire1",
        rarity: "common",
        title: "FIRE +1",
        detail: `爆風距離 ${this.blastRadius} > ${this.blastRadius + 1}`,
        level: this.fireLevel,
        cost: this.upgradeMultiCost("fire", 1),
        available: canUpgradeFire(1),
        apply: () => { this.fireLevel += 1; },
      },
      {
        id: "speed1",
        rarity: "common",
        title: "SPEED +1",
        detail: `移動速度 ${speed} > ${speed + 12}`,
        level: this.speedLevel,
        cost: this.upgradeMultiCost("speed", 1),
        available: canUpgradeSpeed(1),
        apply: () => { this.speedLevel += 1; },
      },
      {
        id: "life1",
        rarity: "common",
        title: "LIFE +1",
        detail: `残機 ${this.lives} > ${this.lives + 1}`,
        level: this.lives,
        cost: this.lifeUpgradeCost(1),
        apply: () => { this.lives += 1; },
      },
      {
        id: "bomb2",
        rarity: "rare",
        title: "BOMB +2",
        detail: `同時設置 ${this.bombLimit} > ${this.bombLimit + 2}`,
        level: this.bombLevel,
        cost: this.upgradeMultiCost("bomb", 2, 500),
        available: canUpgradeBomb(2),
        apply: () => { this.bombLevel += 2; },
      },
      {
        id: "fire2",
        rarity: "rare",
        title: "FIRE +2",
        detail: `爆風距離 ${this.blastRadius} > ${this.blastRadius + 2}`,
        level: this.fireLevel,
        cost: this.upgradeMultiCost("fire", 2, 500),
        available: canUpgradeFire(2),
        apply: () => { this.fireLevel += 2; },
      },
      {
        id: "speed2",
        rarity: "rare",
        title: "SPEED +2",
        detail: `移動速度 ${speed} > ${speed + 24}`,
        level: this.speedLevel,
        cost: this.upgradeMultiCost("speed", 2, 500),
        available: canUpgradeSpeed(2),
        apply: () => { this.speedLevel += 2; },
      },
      {
        id: "life2",
        rarity: "rare",
        title: "LIFE +2",
        detail: `残機 ${this.lives} > ${this.lives + 2}`,
        level: this.lives,
        cost: this.lifeUpgradeCost(2),
        apply: () => { this.lives += 2; },
      },
      {
        id: "bomb3",
        rarity: "epic",
        title: "BOMB +3",
        detail: `同時設置 ${this.bombLimit} > ${this.bombLimit + 3}`,
        level: this.bombLevel,
        cost: this.upgradeMultiCost("bomb", 3, 1500),
        available: canUpgradeBomb(3),
        apply: () => { this.bombLevel += 3; },
      },
      {
        id: "fire3",
        rarity: "epic",
        title: "FIRE +3",
        detail: `爆風距離 ${this.blastRadius} > ${this.blastRadius + 3}`,
        level: this.fireLevel,
        cost: this.upgradeMultiCost("fire", 3, 1500),
        available: canUpgradeFire(3),
        apply: () => { this.fireLevel += 3; },
      },
      {
        id: "speed3",
        rarity: "epic",
        title: "SPEED +3",
        detail: `移動速度 ${speed} > ${speed + 36}`,
        level: this.speedLevel,
        cost: this.upgradeMultiCost("speed", 3, 1500),
        available: canUpgradeSpeed(3),
        apply: () => { this.speedLevel += 3; },
      },
      {
        id: "punch",
        rarity: "epic",
        title: "PUNCH",
        detail: "歩いて爆弾を1マス押せる",
        level: this.punch ? "OWNED" : 0,
        cost: SINGLE_UPGRADE_COST.punch,
        owned: this.punch,
        apply: () => { this.punch = true; },
      },
      {
        id: "glove",
        rarity: "epic",
        title: "GLOVE",
        detail: "Eで隣の爆弾を3マス投げる",
        level: this.glove ? "OWNED" : 0,
        cost: SINGLE_UPGRADE_COST.glove,
        owned: this.glove,
        apply: () => { this.glove = true; },
      },
      {
        id: "wallPass",
        rarity: "epic",
        title: "WALL PASS",
        detail: "通常の壊せる壁を通過",
        level: this.wallPass ? "OWNED" : 0,
        cost: SINGLE_UPGRADE_COST.wallPass,
        owned: this.wallPass,
        apply: () => { this.wallPass = true; },
      },
      {
        id: "pierceBomb",
        rarity: "epic",
        title: "PIERCE BOMB",
        detail: "爆風が壊せる壁を貫通",
        level: this.pierceBomb ? "OWNED" : 0,
        cost: SINGLE_UPGRADE_COST.pierceBomb,
        owned: this.pierceBomb,
        apply: () => { this.pierceBomb = true; },
      },
      {
        id: "remoteBomb",
        rarity: "epic",
        title: "REMOTE",
        detail: "爆弾がEで任意起爆になる",
        level: this.remoteBomb ? "OWNED" : 0,
        cost: SINGLE_UPGRADE_COST.remoteBomb,
        owned: this.remoteBomb,
        apply: () => { this.remoteBomb = true; },
      },
      {
        id: "heart",
        rarity: "rare",
        title: "HEART",
        detail: `被弾無効 ${this.heartCharges} > ${this.heartCharges + 1}`,
        level: this.heartCharges,
        cost: 1600 + this.heartCharges * 500,
        apply: () => { this.heartCharges += 1; },
      },
      {
        id: "life3",
        rarity: "epic",
        title: "LIFE +3",
        detail: `残機 ${this.lives} > ${this.lives + 3}`,
        level: this.lives,
        cost: this.lifeUpgradeCost(3),
        apply: () => { this.lives += 3; },
      },
    ];
    return pool.filter((item) => !item.owned && item.available !== false);
  }

  rollUpgradeRarity() {
    const roll = Math.random();
    if (roll < 0.05) return "epic";
    if (roll < 0.3) return "rare";
    return "common";
  }

  generateShopItems() {
    const pool = this.makeUpgradePool();
    const selected = [];
    for (let slot = 0; slot < 3; slot += 1) {
      const rarity = this.rollUpgradeRarity();
      let choices = pool.filter(
        (item) => item.rarity === rarity && !selected.some((selectedItem) => selectedItem.id === item.id),
      );
      if (choices.length === 0) {
        choices = pool.filter(
          (item) => item.rarity === "common" && !selected.some((selectedItem) => selectedItem.id === item.id),
        );
      }
      if (choices.length === 0) {
        choices = pool.filter((item) => !selected.some((selectedItem) => selectedItem.id === item.id));
      }
      if (choices.length === 0) break;
      selected.push(choices[Math.floor(Math.random() * choices.length)]);
    }
    return selected;
  }

  showUpgradeShop() {
    this.nextStageAt = 0;
    if (this.overlay) {
      this.tweens.killTweensOf(this.overlay.list);
      this.overlay.destroy();
    }
    this.overlayMode = "shop";
    this.shopItems = this.generateShopItems();

    const shade = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07101f, 0.94);
    const title = this.add
      .text(WIDTH / 2, 105, "POWER UP SHOP", {
        ...this.hudStyle(34),
        color: "#35d9ff",
      })
      .setOrigin(0.5);
    const score = this.add
      .text(WIDTH / 2, 151, `SCORE  ${this.score}`, {
        ...this.hudStyle(18),
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const status = this.add
      .text(WIDTH / 2, 495, "1 / 2 / 3 で購入", {
        ...this.hudStyle(14),
        color: "#8fa4c7",
      })
      .setOrigin(0.5);
    const children = [shade, title, score, status];

    this.shopItems.forEach((item, index) => {
      const x = 120 + index * 210;
      const cost = item.cost;
      const affordable = this.score >= cost;
      const rarity = UPGRADE_RARITIES[item.rarity];
      const card = this.add
        .rectangle(x, 315, 182, 230, 0x17213b, 1)
        .setStrokeStyle(3, affordable ? rarity.color : 0x506080)
        .setInteractive({ useHandCursor: true });
      const keyLabel = this.add
        .text(x - 70, 218, String(index + 1), {
          ...this.hudStyle(16),
          color: affordable ? "#ffffff" : "#687895",
        })
        .setOrigin(0.5);
      const rarityLabel = this.add
        .text(x, 226, rarity.label, {
          ...this.hudStyle(11),
          color: affordable ? `#${rarity.color.toString(16).padStart(6, "0")}` : "#687895",
        })
        .setOrigin(0.5);
      const itemTitle = this.add
        .text(x, 265, item.title, {
          ...this.hudStyle(22),
          color: affordable ? `#${rarity.color.toString(16).padStart(6, "0")}` : "#687895",
          align: "center",
        })
        .setOrigin(0.5);
      const detail = this.add
        .text(x, 323, item.detail, {
          ...this.hudStyle(13),
          color: affordable ? "#eff6ff" : "#687895",
          align: "center",
        })
        .setOrigin(0.5);
      const level = this.add
        .text(x, 365, `LEVEL ${item.level}`, {
          ...this.hudStyle(12),
          color: "#8fa4c7",
        })
        .setOrigin(0.5);
      const price = this.add
        .text(x, 407, `${cost} SCORE`, {
          ...this.hudStyle(15),
          color: affordable ? "#ffb341" : "#ff4d6d",
        })
        .setOrigin(0.5);

      card.on("pointerdown", () => this.buyUpgrade(index));
      card.on("pointerover", () => {
        if (affordable) card.setFillStyle(0x263759);
      });
      card.on("pointerout", () => card.setFillStyle(0x17213b));
      children.push(card, keyLabel, rarityLabel, itemTitle, detail, level, price);
    });

    const skip = this.add
      .text(WIDTH / 2, 545, "SKIP  (ESC)", {
        ...this.hudStyle(16),
        color: "#8fa4c7",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.advanceToNextStage());
    children.push(skip);
    this.shopStatusText = status;
    this.overlay = this.add.container(0, 0, children).setDepth(50);
  }

  buyUpgrade(slot) {
    if (this.overlayMode !== "shop") return;
    const item = this.shopItems?.[slot];
    if (!item) return;
    const cost = item.cost;
    if (this.score < cost) {
      this.shopStatusText?.setText("SCORE が足りません").setColor("#ff4d6d");
      return;
    }

    this.score -= cost;
    item.apply();
    this.advanceToNextStage();
  }

  advanceToNextStage() {
    if (this.overlayMode !== "shop") return;
    this.nextStageAt = 0;
    this.scene.restart({
      stageIndex: this.stageIndex + 1,
      ...this.currentRunState(),
      showIntro: false,
      startImmediately: false,
    });
  }

  currentRunState() {
    return {
      lives: this.lives,
      score: this.score,
      bombLevel: this.bombLevel,
      fireLevel: this.fireLevel,
      speedLevel: this.speedLevel,
      punch: this.punch,
      glove: this.glove,
      wallPass: this.wallPass,
      pierceBomb: this.pierceBomb,
      remoteBomb: this.remoteBomb,
      heartCharges: this.heartCharges,
    };
  }

  handleDebugConsoleKey(event) {
    if (!event.shiftKey || !event.altKey || !event.ctrlKey || event.repeat) return;
    event.preventDefault();
    this.toggleDebugConsole();
  }

  toggleDebugConsole() {
    if (this.overlayMode === "debug") {
      this.closeDebugConsole();
      return;
    }
    if (this.overlayMode) return;
    this.showDebugConsole();
  }

  showDebugConsole() {
    this.debugWasActive = this.gameActive;
    this.debugWasPaused = this.physics.world.isPaused || this.isPaused;
    this.overlayMode = "debug";
    this.gameActive = false;
    this.physics.world.isPaused = true;
    setStageMusicActive(false);
    this.debugStageIndex = this.stageIndex;

    const shade = this.add
      .rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07101f, 0.94)
      .setInteractive();
    const title = this.add
      .text(WIDTH / 2, 42, "DEBUG CONSOLE", {
        ...this.hudStyle(24),
        color: "#ffb341",
      })
      .setOrigin(0.5);
    const help = this.add
      .text(WIDTH / 2, 72, "クリックで調整 / APPLY STAGEで指定ステージへ移動 / CLOSEで再開", {
        ...this.hudStyle(11),
        color: "#8fa4c7",
      })
      .setOrigin(0.5);
    this.debugRows = [];
    this.debugContainer = this.add.container(0, 0, [shade, title, help]).setDepth(80);
    this.renderDebugConsole();
  }

  renderDebugConsole() {
    this.debugRows.forEach((object) => object.destroy());
    this.debugRows = [];
    const add = (object) => {
      this.debugRows.push(object);
      this.debugContainer.add(object);
      return object;
    };
    const button = (x, y, label, onClick, color = "#eff6ff") =>
      add(
        this.add
          .text(x, y, label, {
            ...this.hudStyle(13),
            color,
            backgroundColor: "#17213b",
            padding: { x: 8, y: 5 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", onClick),
      );
    const valueRow = (y, label, value, minus, plus) => {
      add(
        this.add
          .text(125, y, label, {
            ...this.hudStyle(14),
            color: "#8fa4c7",
          })
          .setOrigin(0, 0.5),
      );
      button(330, y, "-", () => {
        minus();
        this.refreshDerivedPowerState();
        this.renderDebugConsole();
      });
      add(
        this.add
          .text(405, y, String(value), {
            ...this.hudStyle(15),
            color: "#ffffff",
          })
          .setOrigin(0.5),
      );
      button(480, y, "+", () => {
        plus();
        this.refreshDerivedPowerState();
        this.renderDebugConsole();
      });
    };
    const toggleRow = (y, label, prop) => {
      add(
        this.add
          .text(125, y, label, {
            ...this.hudStyle(14),
            color: "#8fa4c7",
          })
          .setOrigin(0, 0.5),
      );
      button(405, y, this[prop] ? "ON" : "OFF", () => {
        this[prop] = !this[prop];
        this.refreshDerivedPowerState();
        this.renderDebugConsole();
      }, this[prop] ? "#ffb341" : "#687895");
    };

    valueRow(115, "STAGE", this.debugStageIndex + 1, () => {
      this.debugStageIndex = Math.max(0, this.debugStageIndex - 1);
    }, () => {
      this.debugStageIndex = Math.min(STAGES.length - 1, this.debugStageIndex + 1);
    });
    valueRow(155, "SCORE", this.score, () => {
      this.score = Math.max(0, this.score - 500);
    }, () => {
      this.score += 500;
    });
    valueRow(195, "LIFE", this.lives, () => {
      this.lives = Math.max(1, this.lives - 1);
    }, () => {
      this.lives += 1;
    });
    valueRow(235, "HEART", this.heartCharges, () => {
      this.heartCharges = Math.max(0, this.heartCharges - 1);
    }, () => {
      this.heartCharges += 1;
    });
    valueRow(275, "BOMB LIMIT", this.bombLimit, () => {
      this.bombLevel = Math.max(0, this.bombLevel - 1);
    }, () => {
      this.bombLevel = Math.min(POWER_MAX.bombLimit - 1, this.bombLevel + 1);
    });
    valueRow(315, "FIRE RANGE", this.blastRadius, () => {
      this.fireLevel = Math.max(0, this.fireLevel - 1);
    }, () => {
      this.fireLevel = Math.min(POWER_MAX.blastRadius - 2, this.fireLevel + 1);
    });
    valueRow(355, "SPEED LEVEL", this.speedLevel, () => {
      this.speedLevel = Math.max(0, this.speedLevel - 1);
    }, () => {
      this.speedLevel = Math.min(POWER_MAX.speedLevel, this.speedLevel + 1);
    });

    toggleRow(405, "PUNCH", "punch");
    toggleRow(445, "GLOVE", "glove");
    toggleRow(485, "WALL PASS", "wallPass");
    toggleRow(525, "PIERCE BOMB", "pierceBomb");
    toggleRow(565, "REMOTE", "remoteBomb");

    button(165, 615, "APPLY STAGE", () => this.applyDebugStage(), "#35d9ff");
    button(360, 615, "CLOSE", () => this.closeDebugConsole(), "#ffffff");
    button(525, 615, "RESET POWER", () => {
      this.bombLevel = 0;
      this.fireLevel = 0;
      this.speedLevel = 0;
      this.punch = false;
      this.glove = false;
      this.wallPass = false;
      this.pierceBomb = false;
      this.remoteBomb = false;
      this.heartCharges = 0;
      this.refreshDerivedPowerState();
      this.renderDebugConsole();
    }, "#ff4d6d");

    this.updateHud();
  }

  refreshDerivedPowerState() {
    this.bombLevel = Phaser.Math.Clamp(this.bombLevel, 0, POWER_MAX.bombLimit - 1);
    this.fireLevel = Phaser.Math.Clamp(this.fireLevel, 0, POWER_MAX.blastRadius - 2);
    this.speedLevel = Phaser.Math.Clamp(this.speedLevel, 0, POWER_MAX.speedLevel);
    this.bombLimit = 1 + this.bombLevel;
    this.blastRadius = 2 + this.fireLevel;
  }

  closeDebugConsole() {
    this.debugContainer?.destroy();
    this.debugContainer = null;
    this.debugRows = [];
    this.overlayMode = null;
    this.refreshDerivedPowerState();
    this.updateHud();
    if (this.debugWasActive) {
      this.gameActive = true;
      this.physics.world.isPaused = this.debugWasPaused;
      setStageMusicActive(!this.debugWasPaused);
    }
    this.debugWasActive = false;
    this.debugWasPaused = false;
  }

  applyDebugStage() {
    const stageIndex = this.debugStageIndex ?? this.stageIndex;
    this.debugContainer?.destroy();
    this.debugContainer = null;
    this.debugRows = [];
    this.overlayMode = null;
    this.refreshDerivedPowerState();
    this.jumpToStage(stageIndex);
  }

  jumpToStage(stageIndex) {
    this.scene.restart({
      stageIndex,
      ...this.currentRunState(),
      showIntro: false,
      startImmediately: false,
    });
  }

  restartStage() {
    if (this.overlayMode === "start" || this.overlayMode === "victory") return;
    this.scene.restart({
      stageIndex: this.stageIndex,
      ...this.currentRunState(),
      showIntro: false,
      startImmediately: false,
    });
  }

  newGame() {
    this.scene.restart({
      stageIndex: 0,
      lives: 3,
      score: 0,
      bombLevel: 0,
      fireLevel: 0,
      speedLevel: 0,
      punch: false,
      glove: false,
      wallPass: false,
      pierceBomb: false,
      remoteBomb: false,
      heartCharges: 0,
      showIntro: false,
      startImmediately: false,
    });
  }

  togglePause() {
    if (!this.player?.active || this.overlayMode) return;
    this.isPaused = !this.isPaused;
    this.physics.world.isPaused = this.isPaused;
    if (this.isPaused) {
      setStageMusicActive(false);
      this.pauseLabel = this.add
        .text(WIDTH / 2, HEIGHT / 2, "PAUSED", this.hudStyle(40))
        .setOrigin(0.5)
        .setDepth(60);
    } else {
      setStageMusicActive(true);
      this.pauseLabel?.destroy();
      this.pauseLabel = null;
    }
  }

  updateHud() {
    if (!this.stageText) return;
    this.stageText.setText(`STAGE ${String(this.stageIndex + 1).padStart(2, "0")}`);
    this.enemyText.setText(`ENEMY  ${this.enemies?.countActive(true) ?? 0}`);
    const heart = this.heartCharges > 0 ? ` H${this.heartCharges}` : "";
    this.infoText.setText(`LIFE ${this.lives}${heart}   SCORE ${this.score}`);
  }
}

function resolveOpeningImageSource(file, folderIndex = 0) {
  return `${OPENING_IMAGE_FOLDERS[folderIndex]}/${file}`;
}

function startPhaserGame() {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-container",
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#0b1427",
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: BlastGame,
  });
}

function startDomOpening() {
  const container = document.querySelector("#game-container");
  document.querySelector("#loading-message")?.remove();
  if (!container) {
    startPhaserGame();
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "op-overlay";
  overlay.innerHTML = `
    <img class="op-image" alt="" />
    <button class="op-sound-button" type="button" aria-label="OP BGMを再生">♪</button>
    <div class="op-start-screen"></div>
    <div class="op-caption"></div>
    <div class="op-prompt" aria-hidden="true">
      <span class="op-press">PRESS</span>
      <span class="op-enter">Enter key</span>
    </div>
    <div class="op-error"></div>
  `;
  container.appendChild(overlay);

  const image = overlay.querySelector(".op-image");
  const startScreen = overlay.querySelector(".op-start-screen");
  const soundButton = overlay.querySelector(".op-sound-button");
  const caption = overlay.querySelector(".op-caption");
  const error = overlay.querySelector(".op-error");
  let slideIndex = 0;
  let timerId = null;
  let skipHoldTimerId = null;
  let openingStarted = false;
  let started = false;
  const openingBgm = new Audio(OPENING_BGM_SRC);
  openingBgm.loop = false;
  openingBgm.volume = 0.58;
  openingBgm.preload = "auto";

  const playOpeningBgm = () => {
    if (openingBgm.paused) {
      openingBgm.play().then(
        () => soundButton?.classList.add("is-playing"),
        () => soundButton?.classList.remove("is-playing"),
      );
    }
  };

  const stopOpeningBgm = () => {
    openingBgm.pause();
    openingBgm.currentTime = 0;
  };

  const clearSkipHoldTimer = () => {
    window.clearTimeout(skipHoldTimerId);
    skipHoldTimerId = null;
  };

  const startOpeningPlayback = () => {
    if (openingStarted) return;
    openingStarted = true;
    overlay.classList.remove("is-waiting");
    startScreen?.remove();
    openingBgm.currentTime = 0;
    playOpeningBgm();
    showSlide(0, true);
  };

  const startGameFromOpening = () => {
    if (started) return;
    started = true;
    window.clearTimeout(timerId);
    clearSkipHoldTimer();
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    stopOpeningBgm();
    overlay.remove();
    startPhaserGame();
  };

  const cleanupAndStart = () => {
    if (!openingStarted || slideIndex < OPENING_SLIDES.length - 1) return;
    startGameFromOpening();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    if (!skipHoldTimerId) {
      skipHoldTimerId = window.setTimeout(() => {
        if (!started) startGameFromOpening();
      }, OPENING_SKIP_HOLD_DURATION);
    }
    if (!openingStarted) {
      startOpeningPlayback();
    } else {
      cleanupAndStart();
    }
  };

  const handleKeyUp = (event) => {
    if (event.key === "Enter") clearSkipHoldTimer();
  };

  const setSlideImage = (slide, folderIndex = 0) => {
    if (folderIndex >= OPENING_IMAGE_FOLDERS.length) {
      error.textContent = `OP画像が見つかりません: ${slide.file}`;
      return;
    }

    image.onerror = () => setSlideImage(slide, folderIndex + 1);
    image.onload = () => {
      image.classList.remove("is-loading");
      error.textContent = "";
    };
    image.classList.add("is-loading");
    image.src = resolveOpeningImageSource(slide.file, folderIndex);
  };

  const openingSlideDuration = (index) => {
    const slide = OPENING_SLIDES[index];
    if (slide?.file === "12.png") return OPENING_DESCEND_MOTION_DURATION + OPENING_DESCEND_HOLD_DURATION;
    return OPENING_SLIDE_DURATIONS[index] ?? OPENING_SLIDE_DURATION;
  };

  const applySlideMotion = (index, duration) => {
    image.style.transition = "none";
    image.style.opacity = index === 0 ? "0" : "1";
    image.style.transform = "scale(1)";
    image.getBoundingClientRect();

    if (index === 0) {
      image.style.transition = `opacity ${OPENING_FADE_IN_DURATION}ms ease, transform ${duration}ms linear`;
      image.style.opacity = "1";
      image.style.transform = "scale(1.08)";
    } else if (index === 1) {
      image.style.transition = `transform ${duration}ms linear`;
      image.style.transform = "scale(1.08)";
    } else if (OPENING_SLIDES[index]?.file === "12.png") {
      image.style.transform = "translateY(-50%)";
      image.getBoundingClientRect();
      image.style.transition = `transform ${OPENING_DESCEND_MOTION_DURATION}ms linear`;
      image.style.transform = "translateY(0)";
    }
  };

  const showSlide = (index, scheduleNext = openingStarted) => {
    window.clearTimeout(timerId);
    slideIndex = index;
    const slide = OPENING_SLIDES[index];
    const duration = openingSlideDuration(index);
    overlay.classList.toggle("is-final", index === OPENING_SLIDES.length - 1);
    caption.textContent = slide.caption ?? "";
    setSlideImage(slide);
    applySlideMotion(index, duration);

    if (scheduleNext && index < OPENING_SLIDES.length - 1) {
      timerId = window.setTimeout(() => showSlide(index + 1), duration);
    }
  };

  overlay.classList.add("is-waiting");
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  soundButton?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    startOpeningPlayback();
  });
  overlay.addEventListener("pointerdown", () => {
    if (!openingStarted) {
      startOpeningPlayback();
    } else {
      cleanupAndStart();
    }
  });
  showSlide(0, false);
}

startDomOpening();
