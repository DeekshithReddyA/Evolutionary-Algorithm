const GROUND_Y: number = 300;
const GROUND_X_START: number = 100;
const GROUND_X_END: number = 800;

const SMALL_CACTUS_PATH = "/public/1smallCactus.png"
const BIG_CACTUS_PATH = "/public/1bigcactus.png"
const THREE_CACTUS_PATH = "/public/3cactus.png"

const OBSTACLE_SPEED = 1;
const OBSTACLE_SPEED_INCREMENT = 0.01;

const JUMP_STRENGTH = -4.5;

class Dino{
    width: number = 50;
    height: number = 50;
    x: number = 105;
    y: number = GROUND_Y - this.height;
    image: HTMLImageElement;
    velocity: number = 0; // negative for upward direction, positive for downward direction
    gravity: number = 0.1; // small intervals to show more re-renders leading to more fps, more fps = more smoothness
    jumping: boolean = false;

    constructor(){
        this.image = new Image();
        this.image.src = "/public/dino.png";
    }

    draw(ctx: CanvasRenderingContext2D | null){
        if(ctx){
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }

    
    jump(){
        if(!this.jumping){
            this.jumping = true;
            this.velocity = JUMP_STRENGTH;
        }     
        console.log(this.y);   
    }

    update(){
        if(!this.jumping) return;
        this.velocity += this.gravity;
        this.y += this.velocity;

        if(this.y >= GROUND_Y - this.height){
            this.y = GROUND_Y - this.height;
            this.jumping = false;
        }
    }
}

class cactus{
    x: number;
    y: number;

    width: number;
    height: number;

    image: HTMLImageElement;

    constructor(width: number, height: number, image: HTMLImageElement){
        this.x = GROUND_X_END;
        this.y = GROUND_Y;
        
        this.width = width;
        this.height = height;

        this.image = image;
    }
}

class Obstacle{
    cactus: cactus
    constructor(smallCactusImg: HTMLImageElement,
                bigCactusImg: HTMLImageElement,
                threeCactusImg: HTMLImageElement){
        const random = Math.random();
        if(random <= 0.5) this.cactus = new cactus(50,50, smallCactusImg);
        else {
            const r = Math.random();

            if(r <= 0.5) this.cactus = new cactus(100,100, bigCactusImg);
            else this.cactus = new cactus(100, 100, threeCactusImg);
        }
    }

    update(){
        this.cactus.x -= OBSTACLE_SPEED * OBSTACLE_SPEED_INCREMENT; 
    }

    isOffScreen(){
        if(this.cactus.x < GROUND_X_START) return true;

        return false;
    }


}


class Game{    
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    dino: Dino;
    playing: boolean;
    osbstacles: Obstacle[];

    smallCactusImage: HTMLImageElement;
    bigCactusImage: HTMLImageElement;
    threeCactusImage: HTMLImageElement;

    constructor(){
        this.canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d");
        this.dino = new Dino();
        this.osbstacles = [];
        this.playing = false;

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

    start(){
        if(!this.playing){
            this.playing = true;
        }
    }
    
    _loop(){
        console.log("inside loop");
        this.ctx?.clearRect(0,0,800,500);
        this.drawGround();
        this.dino.update();
        this.dino.draw(this.ctx);
        requestAnimationFrame(()=>this._loop());
    }
    
    drawGround(){
        if(this.ctx){
            // ctx.lineWidth = 5;
            
            // ctx.beginPath();
            this.ctx.moveTo(GROUND_X_START,GROUND_Y);
            this.ctx.lineTo(GROUND_X_END, GROUND_Y);
            this.ctx.stroke();            
            
        }
    }


    _bindInput(){
        window.addEventListener("keydown", (e) => {
            if(e.code === "Space" || e.code === "ArrowUp"){
                console.log("jump");
                e.preventDefault();
                this.dino.jump();
            }
        });
    }
    
    _waitForImageLoad(){
        console.log("Waiting for image to load");
        let loaded = 0;
        const total = 4;
        const onLoad = () => {
            loaded++;
            console.log("loaded: ", loaded);
            if(loaded === total) this._loop();
        };

        this.dino.image.onload = onLoad;
        this.smallCactusImage.onload = onLoad;
        this.bigCactusImage.onload = onLoad;
        this.threeCactusImage.onload = onLoad;
    }
}

const game = new Game();