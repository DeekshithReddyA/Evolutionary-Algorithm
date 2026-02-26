import { AI, NEAT, GA, RL } from "./brain";
import { NeuralNetwork } from "./nn";

const GROUND_Y: number = 300;
const GROUND_X_START: number = 80;
const GROUND_X_END: number = 800;

const SMALL_CACTUS_PATH = "/1smallCactus.png"
const BIG_CACTUS_PATH = "/1bigcactus.png"
const THREE_CACTUS_PATH = "/3cactus.png"

const OBSTACLE_SPEED = 1.6;
const OBSTACLE_SPEED_INCREMENT = 0.00045;
const OBSTACLE_MAX_SPEED = 5;

const SCORE_INCREMENT = 0.05;

const MIN_OBSTACLE_GAP = 150;
const MAX_OBSTACLE_GAP = 400;

const COLLISION_MARGIN = 5; // Pixels to shrink collision box for tighter detection

const JUMP_STRENGTH = -5;


//Factory method
class AIFactory {
    getAI(aiType: string, config?: any): AI {
        if (aiType === "GA") return new GA(config);
        else if (aiType === "NEAT") return new NEAT();
        else return new RL();
    }
}


export class Dino {
    width: number = 50;
    height: number = 50;
    x: number = 90;
    y: number = GROUND_Y - this.height;
    image: HTMLImageElement;
    velocity: number = 0; // negative for upward direction, positive for downward direction
    gravity: number = 0.12; // small intervals to show more re-renders leading to more fps, more fps = more smoothness
    jumping: boolean = false;
    brain: NeuralNetwork | null = null;
    score: number = 0;

    constructor() {
        this.image = new Image();
        this.image.src = "/dino.png";
        this.score = 0;
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

export class cactus {
    x: number;
    y: number;

    width: number;
    height: number;

    image: HTMLImageElement;

    constructor(width: number, height: number, image: HTMLImageElement, x?: number) {
        this.x = GROUND_X_END;
        this.width = width;
        this.height = height;
        this.y = GROUND_Y - this.height;
        this.image = image;
    }
}

export class Obstacle {
    cactus: cactus
    constructor(smallCactusImg: HTMLImageElement,
        bigCactusImg: HTMLImageElement,
        threeCactusImg: HTMLImageElement,
        spawnX?: number) {
        const random = Math.random();
        if (random <= 0.5) this.cactus = new cactus(20, 25, smallCactusImg, spawnX);
        else {
            const r = Math.random();

            if (r <= 0.5) this.cactus = new cactus(40, 50, bigCactusImg, spawnX);
            else this.cactus = new cactus(50, 50, threeCactusImg, spawnX);
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


export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    startBtn: HTMLButtonElement;
    dinos: Dino[];
    playing: boolean;
    obstacles: Obstacle[];
    speed: number;
    score: number;
    scoreElement: HTMLDivElement;
    highScoreElement: HTMLDivElement;

    smallCactusImage: HTMLImageElement;
    bigCactusImage: HTMLImageElement;
    threeCactusImage: HTMLImageElement;

    onAllDead: (() => void) | null;

    nextSpawnGap: number;

    constructor() {
        this.canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d");
        this.startBtn = document.getElementById("startBtn") as HTMLButtonElement;
        this.scoreElement = document.getElementById("score") as HTMLDivElement;
        this.highScoreElement = document.getElementById("highScore") as HTMLDivElement;
        this.dinos = [new Dino()];
        this.obstacles = [];
        this.playing = false;
        this.speed = OBSTACLE_SPEED;
        this.score = 0;

        this.onAllDead = null;

        this.nextSpawnGap = MIN_OBSTACLE_GAP;

        this.smallCactusImage = new Image();
        this.smallCactusImage.src = SMALL_CACTUS_PATH;

        this.bigCactusImage = new Image();
        this.bigCactusImage.src = BIG_CACTUS_PATH;

        this.threeCactusImage = new Image();
        this.threeCactusImage.src = THREE_CACTUS_PATH;


        this._waitForImageLoad();
        this._bindInput();
    }

    start() {
        this.obstacles = [];
        this.playing = true;
        this.startBtn.innerText = "Stop";
        this.score = 0;
        this.speed = OBSTACLE_SPEED;
        this.dinos = [new Dino()];
    }
    stop() {
        if (this.playing) {
            this.playing = false;
            this.startBtn.innerText = "Start";
            const highScore = parseInt(this.highScoreElement.innerText);
            this.highScoreElement.innerText = Math.trunc(Math.max(highScore, this.score)).toString();
        }
    }

    _loop() {
        this.ctx?.clearRect(0, 0, 900, 500);
        this.drawGround();


        if (this.playing) {
            if (this.speed < OBSTACLE_MAX_SPEED)
                this.speed += OBSTACLE_SPEED_INCREMENT;

            this.score += this.speed * SCORE_INCREMENT;
            this.scoreElement.innerText = Math.trunc(this.score).toString();

            // console.log(this.score);
            console.log(this.speed);

            this._trySpawnObject();

            for (const obs of this.obstacles) {
                obs.update(this.speed);
            }
            for (const obs of this.obstacles) {
                for(const dino of this.dinos){
                    dino.score = this.score;
                    if (this._isColliding(dino, obs)) {
                        this.dinos = this.dinos.filter((d) => d !== dino)
                    }
                }
                if(this.dinos.length === 0){
                    console.log("GAME OVER");
                    this.stop();
                    break;
                }
            }

            this.obstacles = this.obstacles.filter((obs) => !obs.isOffScreen());
        }
        for(const dino of this.dinos){
            dino.update();
            dino.draw(this.ctx);
        }

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
            this.ctx.closePath();
            this.ctx.stroke();

        }
    }
    // Spawn gap based on speed. 
    _trySpawnObject() {
        const lastCacti = this.obstacles[this.obstacles.length - 1];
        if (!lastCacti) {
            this.obstacles.push(new Obstacle(
                this.smallCactusImage,
                this.bigCactusImage,
                this.threeCactusImage
            ));
            const speedRatio = this.speed / OBSTACLE_SPEED;
            this.nextSpawnGap = speedRatio * (MIN_OBSTACLE_GAP + Math.random() * (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP));
            return;
        }
        const distance = GROUND_X_END - lastCacti.cactus.x;

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

        //next random gap (scaled by speed)
        const speedRatio = this.speed / OBSTACLE_SPEED;
        this.nextSpawnGap =
            speedRatio * (MIN_OBSTACLE_GAP +
                Math.random() * (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP));
    }

    _isColliding(dino: Dino, obs: Obstacle): boolean {
        return (
                dino.x + COLLISION_MARGIN < obs.cactus.x + obs.cactus.width - COLLISION_MARGIN &&
                dino.x + dino.width - COLLISION_MARGIN > obs.cactus.x + COLLISION_MARGIN &&
                dino.y + COLLISION_MARGIN < obs.cactus.y + obs.cactus.height - COLLISION_MARGIN &&
                dino.y + dino.height - COLLISION_MARGIN > obs.cactus.y + COLLISION_MARGIN
            );
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
                for(const dino of this.dinos){
                    dino.jump();
                }
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

        this.dinos[0].image.onload = onLoad;
        this.smallCactusImage.onload = onLoad;
        this.bigCactusImage.onload = onLoad;
        this.threeCactusImage.onload = onLoad;
    }
}

// --- Home / Game screen navigation ---
const homeScreen = document.getElementById("homeScreen") as HTMLDivElement;
const gameScreen = document.getElementById("gameScreen") as HTMLDivElement;
const modeDisplay = document.getElementById("modeDisplay") as HTMLSpanElement;
const backBtn = document.getElementById("backBtn") as HTMLButtonElement;

let selectedMode: string = "user";
let game: Game | null = null;

const MODE_LABELS: Record<string, string> = {
    user: "User",
    neural: "Neural Network",
    neat: "NEAT",
    rl: "RL",
};

document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        selectedMode = (btn as HTMLElement).dataset.mode || "user";
        modeDisplay.textContent = `Mode: ${MODE_LABELS[selectedMode]}`;
        homeScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");

        // Create the game instance only when entering the game screen
        if (!game) {
            game = new Game();
        }
    });
});

backBtn.addEventListener("click", () => {
    if (game) {
        game.stop();
    }
    gameScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
});