import { useEffect, useState } from "react"

export const Canvas = ()=>{

    const [isGameRunning, setIsGameRunning] = useState<boolean>(false);

    useEffect(()=>{
        if(!isGameRunning){
            renderCanvas();
        }
        // play button to start the game

        // if game is started, then start the game loop and update the canvas accordingly
    },[]);


    const renderCanvas = ()=>{

        const canvas = document.getElementById("myCanvas") as HTMLCanvasElement
        const ctx = canvas.getContext("2d")
        if(ctx){
            // Straight line representing land
            ctx.beginPath();
            ctx.moveTo(0, 100);
            ctx.lineTo(500, 100);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw a simple dinosaur (a rectangle for the body and a smaller rectangle for the head)
            ctx.fillStyle = "green";
            ctx.fillRect(50, 50, 40, 30); // Body
            ctx.fillRect(80, 40, 20, 20); // Head

            // Obstacles (cacti)
            ctx.fillStyle = "brown";
            ctx.fillRect(200, 80, 10, 20); // Cactus 1
            ctx.fillRect(300, 70, 10, 30); // Cactus 2

            
        }   
    }
    return(
        <div>

            <canvas id="myCanvas" width="500" height="500" className="border border-black">
            </canvas>
        </div>
    )
}