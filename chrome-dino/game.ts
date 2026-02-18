const GROUND_Y: number = 300;
const GROUND_X_START: number = 100;
const GROUND_X_END: number = 800;

const DINO_Y = 250;

const JUMP_STRENGTH = -4.5;

class Dino{
    x: number = 105;
    y: number = DINO_Y;
    width: number = 50;
    height: number = 50;
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
            this.y = DINO_Y;
            this.jumping = false;
        }
    }
}


class Game{    
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    dino: Dino;
    playing: boolean;
    dino1: Dino;
    constructor(){
        this.canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d");
        this.dino = new Dino();
        this.dino1 = new Dino();
        this.playing = false;

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
        const total = 2;
        const onLoad = () => {
            loaded++;
            console.log("loaded: ", loaded);
            if(loaded === total) this._loop();
        };

        this.dino.image.onload = onLoad;
        this.dino1.image.onload = onLoad;
    }
}

const game = new Game();