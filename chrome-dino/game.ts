
class Dino{
    x: number = 105;
    y: number = 250;
    width: number = 50;
    height: number = 50;
    image: HTMLImageElement;

    // have to add image to this constructor
    constructor(){

        this.image = new Image();
        this.image.src = "/public/dino.png";
    }

    draw(ctx: CanvasRenderingContext2D){
        this.image.onload = () => {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }
}



const canvas: HTMLCanvasElement | null = document.getElementById("myCanvas") as HTMLCanvasElement || null;
const ctx = canvas!.getContext("2d");

if(ctx){
    // ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(100,300);
    ctx.lineTo(800, 300);

    // ctx.closePath();
    ctx.stroke();

    const dino1 = new Dino();

    dino1.draw(ctx);
}
