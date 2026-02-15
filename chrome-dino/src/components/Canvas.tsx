import { useEffect, useRef } from "react";

export const Canvas = () => {
    const catWidth = 120;
    const catHeight = 120;
    const groundY = 250; //set this acc to the height of canvas

    const imgRef = useRef<HTMLImageElement | null>(null);
    const yRef = useRef(groundY - catHeight); // initial y position of cat on track
    const isJumpingRef = useRef(false); // using refs because the rendering/animation logic is being handled by requestAnimationFrame of canvas api (60 times persec    )
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const velocityRef = useRef(0); //this handles how velocity of cat decreases when reaching top 


    const jumpStrength = -12; // how far we want it to jump when key is pressed, negative means its going up -y means up +y means down
    const gravity = 0.6;

    useEffect(() => {
        const img = new Image();
        img.src = "/car.png"; // make sure the path is correct

        img.onload = () => {
            imgRef.current = img;
            requestAnimationFrame(renderCanvas); // start the loop
        };

        const keyPressed = (e: KeyboardEvent) => {
            if ((e.code === "Space" || e.code === "ArrowUp") && !isJumpingRef.current) {
                isJumpingRef.current = true;
                velocityRef.current = jumpStrength; // start jump
            }
        };
        window.addEventListener("keydown", keyPressed);
        return () => {
            window.removeEventListener("keydown", keyPressed);
        };

    }, []);


    function renderCanvas() {
        console.log("Rendering frame")
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !imgRef.current) return;

        // clear canvas
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);

        // draw ground
        ctx.beginPath();
        ctx.moveTo(0, canvas!.height / 2);
        ctx.lineTo(1200, canvas!.height / 2);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();

        //movement logic
        if(isJumpingRef.current){
            velocityRef.current += gravity
            yRef.current += velocityRef.current;

            // landing check
            if (yRef.current >= groundY - catHeight) {
                yRef.current = groundY - catHeight;
                isJumpingRef.current = false;
                velocityRef.current = 0;
            }
        }
        

        // draw image
        ctx.drawImage(imgRef.current, 50, yRef.current, catWidth, catHeight); // x, y, width, height

        requestAnimationFrame(renderCanvas); // loop
    }

    return (
        <div className="flex justify-center items-center pt-20">
            
            <canvas
                ref={canvasRef}
                id="myCanvas"
                width="1200"
                height="500"
            ></canvas>
        </div>
    );
};
