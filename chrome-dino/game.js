// ──────────────────────────────────────────────
//  Chrome Dino – clean class-based rewrite
// ──────────────────────────────────────────────

// ── Constants ────────────────────────────────
const CANVAS_W = 1200;
const CANVAS_H = 500;
const GROUND_Y = 260;
const GROUND_X_START = 300;
const GROUND_X_END = 1150;

const JUMP_STRENGTH = -5;
const GRAVITY = 0.1;
const OBSTACLE_SPEED = 3;

const SPAWN_MIN_MS = 1200;
const SPAWN_MAX_MS = 3500;

// ── Dino (player) ────────────────────────────
class Dino {
  constructor() {
    this.width = 120;
    this.height = 110;
    this.x = 330;
    this.y = GROUND_Y - this.height;

    this.velocity = 0;
    this.jumping = false;

    this.image = new Image();
    this.image.src = "/public/dino.jpeg";
  }

  jump() {
    if (this.jumping) return;
    this.jumping = true;
    this.velocity = JUMP_STRENGTH;
  }

  update() {
    if (!this.jumping) return;

    this.velocity += GRAVITY;
    this.y += this.velocity;

    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.velocity = 0;
      this.jumping = false;
    }
  }

  reset() {
    this.y = GROUND_Y - this.height;
    this.velocity = 0;
    this.jumping = false;
  }

  draw(ctx) {
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
  }
}

// ── Obstacle ─────────────────────────────────
class Obstacle {
  static SMALL = { w: 40, h: 40 };
  static BIG = { w: 60, h: 60 };
  static sharedImage = null;

  constructor() {
    const small = Math.random() < 0.5;
    this.width = small ? Obstacle.SMALL.w : Obstacle.BIG.w;
    this.height = small ? Obstacle.SMALL.h : Obstacle.BIG.h;
    this.x = CANVAS_W;
    this.y = GROUND_Y - this.height;
  }

  update() {
    this.x -= OBSTACLE_SPEED;
  }

  isOffScreen() {
    return this.x + this.width < GROUND_X_START;
  }

  draw(ctx) {
    if (Obstacle.sharedImage) {
      ctx.drawImage(Obstacle.sharedImage, this.x, this.y, this.width, this.height);
    }
  }
}

// ── Collision helper ─────────────────────────
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ── Game ─────────────────────────────────────
class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.dino = new Dino();
    this.obstacles = [];
    this.nextSpawnTime = 0;

    this.score = 0;
    this.highScore = 0;
    this.playing = false;
    this.frameCount = 0;

    // DOM
    this.startBtn = document.getElementById("startBtn");
    this.scoreEl = document.getElementById("score");
    this.highScoreEl = document.getElementById("highScore");

    // Load shared obstacle image
    Obstacle.sharedImage = new Image();
    Obstacle.sharedImage.src = "/public/bonk_dog.png";

    this._bindInput();
    this._waitForImages();
  }

  // ── input ──────────────────────────────────
  _bindInput() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (this.playing) this.dino.jump();
      }
    });

    this.startBtn.addEventListener("click", () => this.togglePlay());
  }

  // ── start / stop ──────────────────────────
  togglePlay() {
    if (this.playing) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    this.dino.reset();
    this.obstacles = [];
    this.score = 0;
    this.frameCount = 0;
    this.nextSpawnTime = Date.now();
    this.playing = true;
    this.startBtn.textContent = "Stop";
    this._updateScoreDisplay();
  }

  stop() {
    this.playing = false;
    this.startBtn.textContent = "Start";
  }

  // ── spawning ──────────────────────────────
  _trySpawnObstacle() {
    const now = Date.now();
    if (now < this.nextSpawnTime) return;

    this.obstacles.push(new Obstacle());
    this.nextSpawnTime = now + SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
  }

  // ── collision ─────────────────────────────
  _checkCollisions() {
    const d = {
      x: this.dino.x,
      y: this.dino.y,
      w: this.dino.width,
      h: this.dino.height,
    };

    for (const obs of this.obstacles) {
      if (rectsOverlap(d, { x: obs.x, y: obs.y, w: obs.width, h: obs.height })) {
        this._onGameOver();
        return;
      }
    }
  }

  _onGameOver() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.stop();
    this._updateScoreDisplay();
  }

  // ── score ─────────────────────────────────
  _updateScoreDisplay() {
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
  }

  // ── drawing helpers ───────────────────────
  _drawGround() {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(GROUND_X_START, GROUND_Y);
    ctx.lineTo(GROUND_X_END, GROUND_Y);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ── main loop ─────────────────────────────
  _loop() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this._drawGround();

    if (this.playing) {
      // spawn & move obstacles
      this._trySpawnObstacle();

      for (const obs of this.obstacles) {
        obs.update();
      }
      this.obstacles = this.obstacles.filter((o) => !o.isOffScreen());

      // score: +1 every 10 frames
      this.frameCount++;
      if (this.frameCount % 10 === 0) {
        this.score++;
        this._updateScoreDisplay();
      }

      // collision
      this._checkCollisions();
    }

    // always update & draw dino (so jump finishes even after stop)
    this.dino.update();
    this.dino.draw(ctx);

    // draw obstacles
    for (const obs of this.obstacles) {
      obs.draw(ctx);
    }

    requestAnimationFrame(() => this._loop());
  }

  // ── boot ──────────────────────────────────
  _waitForImages() {
    let loaded = 0;
    const total = 2;
    const onLoad = () => {
      loaded++;
      if (loaded === total) this._loop();
    };
    this.dino.image.onload = onLoad;
    Obstacle.sharedImage.onload = onLoad;
  }
}

// ── Kick off ─────────────────────────────────
const game = new Game("myCanvas");
