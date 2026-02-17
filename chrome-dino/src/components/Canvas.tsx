import { useEffect, useRef } from "react";

export const Canvas = () => {
    const catWidth = 120;
    const catHeight = 110;
    const groundY = 260; //set this acc to the height of canvas
    const catX = 330;

    const smallDogWidth = 40;
    const smallDogHeight = 40;
    const bigDogWidth = 60;
    const bigDogHeight = 60;

    type Dog = {
        xAxis: number,
        width: number,
        height: number
    }
    const dogsRef = useRef<Dog[]>([]); // having an array of dogs because in chrome dino we have multiple cacti on the ground not just a single cacti going from right to left.

    const nextSpawnTimeRef = useRef(Date.now());
    const lastSpawnTimeRef = useRef(0); // to track last spawn time of dog


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

    const scoreRef = useRef(0);
    const highScoreRef = useRef(0);
    const lastFrameTimeRef = useRef(Date.now()); //this was introduced for scoring acc to distance, 


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


    function spawnDog() {
        const now = Date.now();

        if (now >= nextSpawnTimeRef.current) {
            // decide next spawn time FIRST
            const nextDelay = Math.random() * (maxTime - minTime) + minTime;
            nextSpawnTimeRef.current = now + nextDelay;

            // deciding dog type
            const isSmall = Math.random() < 0.5;

            const newDog = {
                xAxis: 1200,       //starting off really far can adjust
                width: isSmall ? smallDogWidth : bigDogWidth,
                height: isSmall ? smallDogHeight : bigDogHeight,
            };

            dogsRef.current.push(newDog);
        }
    }



    function isColliding(
        catX: number,
        catY: number,
        catW: number,
        catH: number,
        dogX: number,
        dogY: number,
        dogW: number,
        dogH: number
    ) {
        return (
            catX < dogX + dogW &&
            catX + catW > dogX &&
            catY < dogY + dogH &&
            catY + catH > dogY
        );
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

        if (isPlaying.current) {
            spawnDog();

            dogsRef.current.forEach((dog) => {
                dog.xAxis -= 1; // speed
            });

            // remove off-screen dogs
            dogsRef.current = dogsRef.current.filter((dog) => dog.xAxis > 280);
        }

        for (let dog of dogsRef.current) {
            const dogY = groundY - dog.height;
            const catY = yRef.current;
            if (isColliding(
                catX,
                catY,
                catWidth,
                catHeight,
                dog.xAxis,
                dogY,
                dog.width,
                dog.height
            )
            ) {
                console.log("boom");

                isPlaying.current = false;

                break;
            }
        }


        dogsRef.current.forEach((dog) => {
            ctx.drawImage(
                dogImgRef.current!,
                dog.xAxis,
                groundY - dog.height,
                dog.width,
                dog.height
            );
        });


        // draw image
        ctx.drawImage(catImgRef.current, catX, yRef.current, catWidth, catHeight); // x, y, width, height

        requestAnimationFrame(renderCanvas); // loop
    }

    return (
        <div className="flex flex-col justify-center items-center">
            <div className="flex justify-center items-center pt-40 md:pr-50">
                <canvas
                    ref={canvasRef}
                    id="myCanvas"
                    width="1200"
                    height="500"
                ></canvas>
            </div>
            <div onClick={() => isPlaying.current = !isPlaying.current} className="cursor-pointer bg-slate-300 p-2 rounded-xl">
                {isPlaying.current ? ("Stop") : "Start"}
            </div>
        </div>
    );
};
