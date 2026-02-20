const GROUND_Y: number = 300;
const GROUND_X_START: number = 80;
const GROUND_X_END: number = 840;

const SMALL_CACTUS_PATH = "/1smallCactus.png"
const BIG_CACTUS_PATH = "/1bigcactus.png"
const THREE_CACTUS_PATH = "/3cactus.png"

const OBSTACLE_SPEED = 1.5;
const OBSTACLE_SPEED_INCREMENT = 0.1;

const MIN_OBSTACLE_GAP = 150;
const MAX_OBSTACLE_GAP = 250;


const JUMP_STRENGTH = -4.5;

const SPAWN_MIN_MS = 500;
const SPAWN_MAX_MS = 1200;

class Dino {
    width: number = 50;
    height: number = 50;
    x: number = 105;
    y: number = GROUND_Y - this.height;
    image: HTMLImageElement;
    velocity: number = 0; // negative for upward direction, positive for downward direction
    gravity: number = 0.1; // small intervals to show more re-renders leading to more fps, more fps = more smoothness
    jumping: boolean = false;

    constructor() {
        this.image = new Image();
        this.image.src = "/dino.png";
    }

    draw(ctx: CanvasRenderingContext2D | null) {
        if (ctx) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }


    jump() {
        if (!this.jumping) {
            this.jumping = true;
            this.velocity = JUMP_STRENGTH;
        }
        console.log(this.y);
    }

    update() {
        if (!this.jumping) return;
        this.velocity += this.gravity;
        this.y += this.velocity;

        if (this.y >= GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.jumping = false;
        }
    }
}

class cactus {
    x: number;
    y: number;

    width: number;
    height: number;

    image: HTMLImageElement;

    constructor(width: number, height: number, image: HTMLImageElement , x? : number) {
        this.x = x ?? GROUND_X_END + 300;
        this.width = width;
        this.height = height;
        this.y = GROUND_Y - this.height;
        this.image = image;
    }
}

class Obstacle {
    cactus: cactus
    constructor(smallCactusImg: HTMLImageElement,
        bigCactusImg: HTMLImageElement,
        threeCactusImg: HTMLImageElement,
        spawnX?: number) {
        const random = Math.random();
        if (random <= 0.5) this.cactus = new cactus(25, 25, smallCactusImg,spawnX);
        else {
            const r = Math.random();

            if (r <= 0.5) this.cactus = new cactus(50, 50, bigCactusImg,spawnX);
            else this.cactus = new cactus(50, 50, threeCactusImg,spawnX);
        }
    }

    draw(ctx: CanvasRenderingContext2D | null) {
        if (ctx) {
            ctx.drawImage(this.cactus.image, this.cactus.x, this.cactus.y, this.cactus.width, this.cactus.height);
        }
    }

    update(speed: number) {
        this.cactus.x -= speed;
    }

    isOffScreen() {
        if (this.cactus.x + this.cactus.width < GROUND_X_START) return true;

        return false;
    }


}


class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    startBtn: HTMLButtonElement;
    dino: Dino;
    playing: boolean;
    obstacles: Obstacle[];
    speed: number;

    smallCactusImage: HTMLImageElement;
    bigCactusImage: HTMLImageElement;
    threeCactusImage: HTMLImageElement;

    nextSpawnGap: number;

    constructor() {
        this.canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d");
        this.startBtn = document.getElementById("startBtn") as HTMLButtonElement;
        this.dino = new Dino();
        this.obstacles = [];
        this.playing = false;
        this.speed = OBSTACLE_SPEED;


        this.nextSpawnGap = MIN_OBSTACLE_GAP;

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

    start() {
        this.obstacles = [];
        this.playing = true;
    }
    stop() {
        if (this.playing) {
            this.playing = false;
        }
    }

    _loop() {
        console.log("inside loop");
        this.ctx?.clearRect(0, 0, 800, 500);
        this.drawGround();


        if (this.playing) {
            this.speed += 0.0005; //adding speed in game loop to avoid jump in speed wrt every obstacle appearing which wont help in NN training        
            this._trySpawnObject();

            for (const obs of this.obstacles) {
                obs.update(this.speed);
            }

            this.obstacles = this.obstacles.filter((obs) => !obs.isOffScreen());
        }

        this.dino.update();
        this.dino.draw(this.ctx);

        for (const obs of this.obstacles) {
            obs.draw(this.ctx);
        }


        requestAnimationFrame(() => this._loop());
    }

    drawGround() {
        if (this.ctx) {
            // ctx.lineWidth = 5;

            this.ctx.beginPath();
            this.ctx.strokeStyle = 'black'
            this.ctx.moveTo(GROUND_X_START, GROUND_Y);
            this.ctx.lineTo(GROUND_X_END, GROUND_Y);
            this.ctx.stroke();

        }
    }

    _trySpawnObject() {
        console.log("object spawned");
        const lastCacti = this.obstacles[this.obstacles.length - 1];
        if (!lastCacti) {
            this.obstacles.push(new Obstacle(
                this.smallCactusImage,
                this.bigCactusImage,
                this.threeCactusImage
            ));
            this.nextSpawnGap = MIN_OBSTACLE_GAP + Math.random() * (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP)  ;
            return;
        }
        const distance = lastCacti.cactus.x - this.dino.x;

        if (distance < this.nextSpawnGap) return;

        const spawnX = lastCacti.cactus.x + this.nextSpawnGap;
        //  new obstacle
        this.obstacles.push(
            new Obstacle(
                this.smallCactusImage,
                this.bigCactusImage,
                this.threeCactusImage,
                spawnX
            )
        );

        //next random gap
        this.nextSpawnGap =
            MIN_OBSTACLE_GAP +
            Math.random() * (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP);
    


}


togglePlay() {
    if (this.playing) {
        this.stop();
    } else {
        this.start();
    }
}


_bindInput() {
    window.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
            console.log("jump");
            e.preventDefault();
            this.dino.jump();
        }
    });

    this.startBtn.addEventListener("click", () => this.togglePlay());
}

_waitForImageLoad() {
    console.log("Waiting for image to load");
    let loaded = 0;
    const total = 4;
    const onLoad = () => {
        loaded++;
        console.log("loaded: ", loaded);
        if (loaded === total) this._loop();
    };

    this.dino.image.onload = onLoad;
    this.smallCactusImage.onload = onLoad;
    this.bigCactusImage.onload = onLoad;
    this.threeCactusImage.onload = onLoad;
}
}

const game = new Game();