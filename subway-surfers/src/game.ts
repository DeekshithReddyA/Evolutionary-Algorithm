export class Game {
    canvas: HTMLCanvasElement;
    ctx : CanvasRenderingContext2D;
    constructor(){
        this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    }

    
}