export class Player {
    x: number;
    y: number;
    width: number;
    height: number;
    image: HTMLImageElement;

    constructor(image: HTMLImageElement) {
        this.x = 50;
        this.y = 50;
        this.width = 20;
        this.height = 20;
        this.image = image;
    }

    update() {
        // Update player position and state
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "blue";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}