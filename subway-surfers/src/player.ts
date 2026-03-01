import { drawPlayer } from './renderers';

export class Player {
    x: number;
    y: number;
    width: number;
    height: number;
    lane: number; // 0=left, 1=center, 2=right
    image: HTMLImageElement;
    time: number = 0;
    isJumping: boolean = false;

    constructor(image: HTMLImageElement) {
        this.x = 0;
        this.y = 0;
        this.width = 60;
        this.height = 110;
        this.lane = 1; // start in center lane
        this.image = image;
    }

    update() {
        this.time += 0.016; // ~60fps
    }

    draw(ctx: CanvasRenderingContext2D) {
        drawPlayer(ctx, this.x, this.y, this.width, this.height, this.time, this.isJumping);
    }
}