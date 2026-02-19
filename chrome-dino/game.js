var GROUND_Y = 300;
var GROUND_X_START = 100;
var GROUND_X_END = 800;
var SMALL_CACTUS_PATH = "/public/1smallCactus.png";
var BIG_CACTUS_PATH = "/public/1bigcactus.png";
var THREE_CACTUS_PATH = "/public/3cactus.png";
var OBSTACLE_SPEED = 1.5;
var OBSTACLE_SPEED_INCREMENT = 0.1;
var JUMP_STRENGTH = -4.5;
var SPAWN_MIN_MS = 500;
var SPAWN_MAX_MS = 1200;
var Dino = /** @class */ (function () {
    function Dino() {
        this.width = 50;
        this.height = 50;
        this.x = 105;
        this.y = GROUND_Y - this.height;
        this.velocity = 0; // negative for upward direction, positive for downward direction
        this.gravity = 0.1; // small intervals to show more re-renders leading to more fps, more fps = more smoothness
        this.jumping = false;
        this.image = new Image();
        this.image.src = "/public/dino.png";
    }
    Dino.prototype.draw = function (ctx) {
        if (ctx) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    };
    Dino.prototype.jump = function () {
        if (!this.jumping) {
            this.jumping = true;
            this.velocity = JUMP_STRENGTH;
        }
        console.log(this.y);
    };
    Dino.prototype.update = function () {
        if (!this.jumping)
            return;
        this.velocity += this.gravity;
        this.y += this.velocity;
        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.jumping = false;
        }
    };
    return Dino;
}());
var cactus = /** @class */ (function () {
    function cactus(width, height, image) {
        this.x = GROUND_X_END;
        this.width = width;
        this.height = height;
        this.y = GROUND_Y - this.height;
        this.image = image;
    }
    return cactus;
}());
var Obstacle = /** @class */ (function () {
    function Obstacle(smallCactusImg, bigCactusImg, threeCactusImg) {
        var random = Math.random();
        if (random <= 0.5)
            this.cactus = new cactus(25, 25, smallCactusImg);
        else {
            var r = Math.random();
            if (r <= 0.5)
                this.cactus = new cactus(50, 50, bigCactusImg);
            else
                this.cactus = new cactus(50, 50, threeCactusImg);
        }
    }
    Obstacle.prototype.draw = function (ctx) {
        if (ctx) {
            ctx.drawImage(this.cactus.image, this.cactus.x, this.cactus.y, this.cactus.width, this.cactus.height);
        }
    };
    Obstacle.prototype.update = function (speed) {
        this.cactus.x -= speed;
    };
    Obstacle.prototype.isOffScreen = function () {
        if (this.cactus.x < GROUND_X_START)
            return true;
        return false;
    };
    return Obstacle;
}());
var Game = /** @class */ (function () {
    function Game() {
        this.nextSpawnTime = 0;
        this.canvas = document.getElementById("myCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.startBtn = document.getElementById("startBtn");
        this.dino = new Dino();
        this.osbstacles = [];
        this.playing = false;
        this.speed = OBSTACLE_SPEED;
        this.nextSpawnTime = 0;
        this.smallCactusImage = new Image();
        this.smallCactusImage.src = SMALL_CACTUS_PATH;
        this.bigCactusImage = new Image();
        this.bigCactusImage.src = BIG_CACTUS_PATH;
        this.threeCactusImage = new Image();
        this.threeCactusImage.src = THREE_CACTUS_PATH;
        console.log("constructor called");
        this._waitForImageLoad();
        this._bindInput();
    }
    Game.prototype.start = function () {
        this.nextSpawnTime = Date.now();
        this.osbstacles = [];
        this.playing = true;
    };
    Game.prototype.stop = function () {
        if (this.playing) {
            this.playing = false;
        }
    };
    Game.prototype._loop = function () {
        var _this = this;
        var _a;
        console.log("inside loop");
        (_a = this.ctx) === null || _a === void 0 ? void 0 : _a.clearRect(0, 0, 800, 500);
        this.drawGround();
        if (this.playing) {
            this._trySpawnObject();
            for (var _i = 0, _b = this.osbstacles; _i < _b.length; _i++) {
                var obs = _b[_i];
                obs.update(this.speed);
            }
            this.osbstacles = this.osbstacles.filter(function (obs) { return !obs.isOffScreen(); });
        }
        this.dino.update();
        this.dino.draw(this.ctx);
        for (var _c = 0, _d = this.osbstacles; _c < _d.length; _c++) {
            var obs = _d[_c];
            obs.draw(this.ctx);
        }
        requestAnimationFrame(function () { return _this._loop(); });
    };
    Game.prototype.drawGround = function () {
        if (this.ctx) {
            // ctx.lineWidth = 5;
            // ctx.beginPath();
            this.ctx.moveTo(GROUND_X_START, GROUND_Y);
            this.ctx.lineTo(GROUND_X_END, GROUND_Y);
            this.ctx.stroke();
        }
    };
    Game.prototype._trySpawnObject = function () {
        console.log("object spawned");
        var now = Date.now();
        if (now < this.nextSpawnTime)
            return;
        this.speed += OBSTACLE_SPEED_INCREMENT;
        this.osbstacles.push(new Obstacle(this.smallCactusImage, this.bigCactusImage, this.threeCactusImage));
        this.nextSpawnTime = now + SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
    };
    Game.prototype.togglePlay = function () {
        if (this.playing) {
            this.stop();
        }
        else {
            this.start();
        }
    };
    Game.prototype._bindInput = function () {
        var _this = this;
        window.addEventListener("keydown", function (e) {
            if (e.code === "Space" || e.code === "ArrowUp") {
                console.log("jump");
                e.preventDefault();
                _this.dino.jump();
            }
        });
        this.startBtn.addEventListener("click", function () { return _this.togglePlay(); });
    };
    Game.prototype._waitForImageLoad = function () {
        var _this = this;
        console.log("Waiting for image to load");
        var loaded = 0;
        var total = 4;
        var onLoad = function () {
            loaded++;
            console.log("loaded: ", loaded);
            if (loaded === total)
                _this._loop();
        };
        this.dino.image.onload = onLoad;
        this.smallCactusImage.onload = onLoad;
        this.bigCactusImage.onload = onLoad;
        this.threeCactusImage.onload = onLoad;
    };
    return Game;
}());
var game = new Game();
