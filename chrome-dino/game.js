var GROUND_Y = 300;
var GROUND_X_START = 100;
var GROUND_X_END = 800;
var SMALL_CACTUS_PATH = "/public/1smallCactus.png";
var BIG_CACTUS_PATH = "/public/1bigcactus.png";
var THREE_CACTUS_PATH = "/public/3cactus.png";
var DINO_Y = 250;
var JUMP_STRENGTH = -4.5;
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
            this.y = DINO_Y;
            this.jumping = false;
        }
    };
    return Dino;
}());
var cactus = /** @class */ (function () {
    function cactus(width, height, image) {
        this.x = GROUND_X_END;
        this.y = GROUND_Y;
        this.width = width;
        this.height = height;
        this.image = new Image();
        this.image.src = image;
    }
    return cactus;
}());
var Obstacle = /** @class */ (function () {
    function Obstacle() {
        var random = Math.random();
        if (random <= 0.5)
            this.obstacle = new cactus(50, 50, SMALL_CACTUS_PATH);
        else {
            var r = Math.random();
            if (r <= 0.5)
                this.obstacle = new cactus(100, 100, BIG_CACTUS_PATH);
            else
                this.obstacle = new cactus(100, 100, THREE_CACTUS_PATH);
        }
    }
    return Obstacle;
}());
var Game = /** @class */ (function () {
    function Game() {
        this.canvas = document.getElementById("myCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.dino = new Dino();
        this.dino1 = new Dino();
        this.playing = false;
        console.log("constructor called");
        this._waitForImageLoad();
        this._bindInput();
    }
    Game.prototype.start = function () {
        if (!this.playing) {
            this.playing = true;
        }
    };
    Game.prototype._loop = function () {
        var _this = this;
        var _a;
        console.log("inside loop");
        (_a = this.ctx) === null || _a === void 0 ? void 0 : _a.clearRect(0, 0, 800, 500);
        this.drawGround();
        this.dino.update();
        this.dino.draw(this.ctx);
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
    Game.prototype._bindInput = function () {
        var _this = this;
        window.addEventListener("keydown", function (e) {
            if (e.code === "Space" || e.code === "ArrowUp") {
                console.log("jump");
                e.preventDefault();
                _this.dino.jump();
            }
        });
    };
    Game.prototype._waitForImageLoad = function () {
        var _this = this;
        console.log("Waiting for image to load");
        var loaded = 0;
        var total = 2;
        var onLoad = function () {
            loaded++;
            console.log("loaded: ", loaded);
            if (loaded === total)
                _this._loop();
        };
        this.dino.image.onload = onLoad;
        this.dino1.image.onload = onLoad;
    };
    return Game;
}());
var game = new Game();
