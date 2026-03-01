import { drawPlayer, drawHurdle, drawTrain, drawBackground, getLaneX, getDepthY, getDepthScale } from "./renderers";

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    }

    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBackground(scrollOffset: number = 0) {
        drawBackground(this.ctx, this.canvas.width, this.canvas.height, scrollOffset);
    }

    drawPlayer(x: number, y: number, width: number, height: number, time: number, isJumping: boolean) {
        drawPlayer(this.ctx, x, y, width, height, time, isJumping);
    }

    drawHurdle(x: number, y: number, width: number, height: number) {
        drawHurdle(this.ctx, x, y, width, height);
    }

    drawTrain(x: number, y: number, width: number, height: number) {
        drawTrain(this.ctx, x, y, width, height);
    }

    /** Get X center of a lane (0/1/2) at a given depth (0=close, 1=far) */
    getLaneX(lane: number, depth: number): number {
        return getLaneX(lane, depth, this.canvas.width);
    }

    /** Get Y position at a given depth (0=bottom, 1=vanishing point) */
    getDepthY(depth: number): number {
        return getDepthY(depth, this.canvas.height);
    }

    /** Get scale factor at a given depth */
    getDepthScale(depth: number): number {
        return getDepthScale(depth);
    }
}
