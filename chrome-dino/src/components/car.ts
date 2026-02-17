const ASPECT_RATIO = 50 / 30;
const BASE_SIZE = 30;
const SIZE_INCREMENT = 20;

export class Car {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;

    constructor(id: number, x: number, y: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        const scale = BASE_SIZE + id * SIZE_INCREMENT;
        this.width = scale * ASPECT_RATIO;
        this.height = scale;
    }

    draw(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
    }
}