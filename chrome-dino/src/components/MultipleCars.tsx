import { useCallback, useEffect, useRef } from "react";
import { Car } from "./car";

export const Canvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const carsRef = useRef<Car[]>([]);
    const carImgRef = useRef<HTMLImageElement | null>(null);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        const img = carImgRef.current;
        if (!canvas || !ctx || !img) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        carsRef.current.forEach(car => car.draw(ctx, img));
    }, []);

    const addCar = useCallback(() => {
        const id = carsRef.current.length;
        carsRef.current.push(new Car(id, 100 + id * 20, 100 + id * 30));
        redraw();
    }, [redraw]);

    useEffect(() => {
        const img = new Image();
        img.src = "/car.png";
        img.onload = () => {
            carImgRef.current = img;
            redraw();
        };
    }, [redraw]);

    return (
        <div className="flex justify-center items-center h-screen">
            <canvas ref={canvasRef} width={600} height={400} className="border border-black" />
            <div className="p-2 bg-slate-400 rounded m-2 cursor-pointer" onClick={addCar}>
                Add more cars
            </div>
        </div>
    );
};