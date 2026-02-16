import { useEffect, useRef, useState } from "react";

export const Canvas = () => {
  const catWidth = 120;
  const catHeight = 110;
  const groundY = 260; //set this acc to the height of canvas

  const smallDogWidth = 40;
  const smallDogHeight = 40;
  const bigDogWidth = 60;
  const bigDogHeight = 60;
  let dogWidth = 60;
  let dogHeight = 60;
  
  const minTime = 500; // minimum time between dog spawns in ms
  const maxTime = 3000; // maximum time between dog spawns in ms
  
  const isPlaying = useRef<boolean>(false);
  const catImgRef = useRef<HTMLImageElement | null>(null);
  const dogImgRef = useRef<HTMLImageElement | null>(null);
  const yRef = useRef(groundY - catHeight); // initial y position of cat on track
  const dogXRef = useRef(1150); // initial x position of dog on track (off-screen to the right)
  const isJumpingRef = useRef(false); // using refs because the rendering/animation logic is being handled by requestAnimationFrame of canvas api (60 times persec    )
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const velocityRef = useRef(0); //this handles how velocity of cat decreases when reaching top
  const lastSpawnTimeRef = useRef(0); // to track last spawn time of dog
  
  /* Reduced the values to smoothen the jumping.
      Higher values = less frames
      Lower values = more frames (visually smooth)
      low delta = low change hence number of re-renders increased, making the car smooth*/
  const jumpStrength = -1.5; // how far we want it to jump when key is pressed, negative means its going up -y means up +y means down
  const gravity = 0.01;

  useEffect(() => {
    const img = new Image();
    img.src = "/car.png"; // make sure the path is correct

    img.onload = () => {
      catImgRef.current = img;
      requestAnimationFrame(renderCanvas); // start the loop
    };

    const dogImg = new Image();
    dogImg.src = "/bonk_dog.png"; // make sure the path is correct

    dogImg.onload = () => {
      dogImgRef.current = dogImg;
      requestAnimationFrame(renderCanvas); // start the loop
    };

    const keyPressed = (e: KeyboardEvent) => {
      if (
        (e.code === "Space" || e.code === "ArrowUp") &&
        !isJumpingRef.current
      ) {
        isJumpingRef.current = true;
        velocityRef.current = jumpStrength; // start jump
      }
    };
    window.addEventListener("keydown", keyPressed);
    return () => {
      window.removeEventListener("keydown", keyPressed);
    };
  }, []);

  function spawnDog() : number {
    // logic to spawn dog at random intervals and positions
      const randomTime = Math.random() * (maxTime - minTime) + minTime;

      console.log("Random time for next spawn: ", randomTime);

      if (Date.now() - lastSpawnTimeRef.current > randomTime) {
        lastSpawnTimeRef.current = Date.now();
        return Math.random() < 0.5 ? 0 : 1; // randomly return 0 or 1 for dog type
      }
      return -1; // no spawn

  }

  function renderCanvas() {
    console.log("Rendering frame");
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !catImgRef.current || !dogImgRef.current) return;

    // clear canvas
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);

    // draw ground
    ctx.beginPath();
    ctx.moveTo(300, canvas!.height / 2);
    ctx.lineTo(1150, canvas!.height / 2);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    //movement logic
    if (isJumpingRef.current) {
      velocityRef.current += gravity;
      yRef.current += velocityRef.current;
      console.log("velocity: ", velocityRef.current, "y: ", yRef.current);
      // landing check
      if (yRef.current >= groundY - catHeight) {
        yRef.current = groundY - catHeight;
        isJumpingRef.current = false;
        velocityRef.current = 0;
      }
    }
    console.log("isPlaying: ", isPlaying.current);
    if(isPlaying.current) {

      console.log("Checking for dog spawn...");
      const type: number = spawnDog();
      if(type !== -1) {
        // draw dog based on type
        if(type === 0) {
          // draw small dog
          dogHeight = smallDogHeight;
          dogWidth = smallDogWidth; 

        } else {
          dogHeight = bigDogHeight;
          dogWidth = bigDogWidth;
        }
      }

        // move dog to left
        dogXRef.current -= 1; // adjust speed here

        // reset dog position if it goes off screen
        if (dogXRef.current < 150) {
          dogXRef.current = 1150; // reset to start position
          // optionally, you can also randomize the next spawn time here
        }
    }
    
    ctx.drawImage(dogImgRef.current, dogXRef.current + 100, groundY - dogHeight, dogWidth, dogHeight); // x, y, width, height

    // draw image
    ctx.drawImage(catImgRef.current, 305, yRef.current, catWidth, catHeight); // x, y, width, height

    requestAnimationFrame(renderCanvas); // loop
  }

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="flex justify-center items-center pt-20 md:pr-50">
        <canvas
          ref={canvasRef}
          id="myCanvas"
          width="1200"
          height="500"
        ></canvas>
      </div>
      <div onClick={() => isPlaying.current = !isPlaying.current} className="cursor-pointer bg-slate-300 p-2 rounded-xl">
        {isPlaying.current   ? ("Stop") : "Start"}
      </div>
    </div>
  );
};
