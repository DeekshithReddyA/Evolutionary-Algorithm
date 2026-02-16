import { useEffect, useRef, useCallback, useState } from "react";

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 250;
const GROUND_Y = 200;
const FPS = 60;
const FRAME_DURATION = 1000 / FPS;

// Dino
const DINO_WIDTH = 40;
const DINO_HEIGHT = 50;
const DINO_X = 60;
const JUMP_VELOCITY = -10;
const GRAVITY = 0.6;

// Obstacles
const OBSTACLE_WIDTH = 20;
const MIN_OBSTACLE_HEIGHT = 30;
const MAX_OBSTACLE_HEIGHT = 55;
const OBSTACLE_GAP_MIN = 250;
const OBSTACLE_GAP_MAX = 500;

// Game speed
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.0002;
const MAX_SPEED = 14;

interface Obstacle {
  x: number;
  height: number;
  passed: boolean;
}

interface GameState {
  dinoY: number;
  velocityY: number;
  isJumping: boolean;
  obstacles: Obstacle[];
  speed: number;
  score: number;
  highScore: number;
  isRunning: boolean;
  isGameOver: boolean;
  legToggle: boolean;
  legTimer: number;
  groundOffset: number;
}

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    dinoY: GROUND_Y - DINO_HEIGHT,
    velocityY: 0,
    isJumping: false,
    obstacles: [],
    speed: INITIAL_SPEED,
    score: 0,
    highScore: 0,
    isRunning: false,
    isGameOver: false,
    legToggle: false,
    legTimer: 0,
    groundOffset: 0,
  });
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // --- Spawn obstacle ---
  const spawnObstacle = useCallback((startX: number): Obstacle => {
    const height =
      MIN_OBSTACLE_HEIGHT +
      Math.random() * (MAX_OBSTACLE_HEIGHT - MIN_OBSTACLE_HEIGHT);
    return { x: startX, height, passed: false };
  }, []);

  // --- Reset game ---
  const resetGame = useCallback(() => {
    const gs = gameStateRef.current;
    gs.dinoY = GROUND_Y - DINO_HEIGHT;
    gs.velocityY = 0;
    gs.isJumping = false;
    gs.obstacles = [];
    gs.speed = INITIAL_SPEED;
    gs.score = 0;
    gs.isGameOver = false;
    gs.legToggle = false;
    gs.legTimer = 0;
    gs.groundOffset = 0;

    // Seed initial obstacles
    let x = CANVAS_WIDTH + 100;
    for (let i = 0; i < 3; i++) {
      gs.obstacles.push(spawnObstacle(x));
      x += OBSTACLE_GAP_MIN + Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN);
    }
  }, [spawnObstacle]);

  // --- Draw helpers ---
  const drawGround = (ctx: CanvasRenderingContext2D, offset: number) => {
    ctx.strokeStyle = "#535353";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Dashed ground texture
    ctx.lineWidth = 0.5;
    for (let x = -offset % 20; x < CANVAS_WIDTH; x += 20) {
      const y = GROUND_Y + 5 + Math.random() * 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6 + Math.random() * 4, y);
      ctx.stroke();
    }
  };

  const drawDino = (
    ctx: CanvasRenderingContext2D,
    y: number,
    isJumping: boolean,
    legToggle: boolean
  ) => {
    const x = DINO_X;
    ctx.fillStyle = "#535353";

    // Head
    ctx.fillRect(x + 18, y, 22, 18);
    // Eye (white dot)
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 32, y + 4, 4, 4);
    ctx.fillStyle = "#535353";

    // Body
    ctx.fillRect(x + 6, y + 16, 28, 24);

    // Arm
    ctx.fillRect(x + 30, y + 22, 8, 4);

    // Tail
    ctx.fillRect(x, y + 16, 8, 6);
    ctx.fillRect(x - 4, y + 14, 6, 6);

    // Legs (animate when running on ground)
    if (isJumping) {
      ctx.fillRect(x + 10, y + 40, 6, 10);
      ctx.fillRect(x + 24, y + 40, 6, 10);
    } else if (legToggle) {
      ctx.fillRect(x + 10, y + 40, 6, 10);
      ctx.fillRect(x + 24, y + 40, 6, 6);
    } else {
      ctx.fillRect(x + 10, y + 40, 6, 6);
      ctx.fillRect(x + 24, y + 40, 6, 10);
    }
  };

  const drawObstacle = (
    ctx: CanvasRenderingContext2D,
    obs: Obstacle
  ) => {
    const x = obs.x;
    const h = obs.height;
    const y = GROUND_Y - h;
    ctx.fillStyle = "#535353";

    // Cactus trunk
    ctx.fillRect(x + 4, y, 12, h);

    // Arms on larger cacti
    if (h > 35) {
      ctx.fillRect(x, y + 10, 6, 14);
      ctx.fillRect(x, y + 10, 6, 4);
      ctx.fillRect(x + 14, y + 16, 6, 12);
      ctx.fillRect(x + 14, y + 16, 6, 4);
    }
  };

  const drawScore = (ctx: CanvasRenderingContext2D, sc: number, hi: number) => {
    ctx.fillStyle = "#535353";
    ctx.font = "16px monospace";
    ctx.textAlign = "right";
    const scoreStr = String(Math.floor(sc)).padStart(5, "0");
    const hiStr = String(Math.floor(hi)).padStart(5, "0");
    ctx.fillText(`HI ${hiStr}  ${scoreStr}`, CANVAS_WIDTH - 20, 30);
  };

  // --- Collision detection ---
  const checkCollision = (gs: GameState): boolean => {
    const dinoLeft = DINO_X + 6;
    const dinoRight = DINO_X + DINO_WIDTH;
    const dinoTop = gs.dinoY + 4;
    const dinoBottom = gs.dinoY + DINO_HEIGHT;

    for (const obs of gs.obstacles) {
      const obsLeft = obs.x + 2;
      const obsRight = obs.x + OBSTACLE_WIDTH - 2;
      const obsTop = GROUND_Y - obs.height;
      const obsBottom = GROUND_Y;

      if (
        dinoRight > obsLeft &&
        dinoLeft < obsRight &&
        dinoBottom > obsTop &&
        dinoTop < obsBottom
      ) {
        return true;
      }
    }
    return false;
  };

  // --- Game loop ---
  const gameLoop = useCallback(
    (timestamp: number) => {
      const gs = gameStateRef.current;
      if (!gs.isRunning || gs.isGameOver) return;

      const delta = timestamp - lastTimeRef.current;
      if (delta < FRAME_DURATION) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      lastTimeRef.current = timestamp - (delta % FRAME_DURATION);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      // --- Update ---
      // Dino physics
      gs.velocityY += GRAVITY;
      gs.dinoY += gs.velocityY;
      if (gs.dinoY >= GROUND_Y - DINO_HEIGHT) {
        gs.dinoY = GROUND_Y - DINO_HEIGHT;
        gs.velocityY = 0;
        gs.isJumping = false;
      }

      // Leg animation timer
      gs.legTimer += delta;
      if (gs.legTimer > 100) {
        gs.legToggle = !gs.legToggle;
        gs.legTimer = 0;
      }

      // Move obstacles
      for (const obs of gs.obstacles) {
        obs.x -= gs.speed;
        if (!obs.passed && obs.x + OBSTACLE_WIDTH < DINO_X) {
          obs.passed = true;
          gs.score += 1;
        }
      }

      // Remove off-screen & spawn new
      if (gs.obstacles.length > 0 && gs.obstacles[0].x < -OBSTACLE_WIDTH) {
        gs.obstacles.shift();
      }
      const last = gs.obstacles[gs.obstacles.length - 1];
      if (!last || last.x < CANVAS_WIDTH - OBSTACLE_GAP_MIN) {
        const gap =
          OBSTACLE_GAP_MIN +
          Math.random() * (OBSTACLE_GAP_MAX - OBSTACLE_GAP_MIN);
        gs.obstacles.push(
          spawnObstacle(last ? last.x + gap : CANVAS_WIDTH + 100)
        );
      }

      // Increase speed
      gs.speed = Math.min(INITIAL_SPEED + gs.score * SPEED_INCREMENT * 50, MAX_SPEED);

      // Ground scroll
      gs.groundOffset += gs.speed;

      // Score increments by distance
      gs.score += gs.speed * 0.01;

      // Collision
      if (checkCollision(gs)) {
        gs.isGameOver = true;
        gs.isRunning = false;
        if (gs.score > gs.highScore) {
          gs.highScore = gs.score;
          setHighScore(Math.floor(gs.score));
        }
        setScore(Math.floor(gs.score));
        setIsRunning(false);
        setIsGameOver(true);
      }

      // --- Draw ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawGround(ctx, gs.groundOffset);
      drawDino(ctx, gs.dinoY, gs.isJumping, gs.legToggle);
      for (const obs of gs.obstacles) {
        drawObstacle(ctx, obs);
      }
      drawScore(ctx, gs.score, gs.highScore);

      setScore(Math.floor(gs.score));

      if (!gs.isGameOver) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
      }
    },
    [spawnObstacle]
  );

  // --- Jump handler ---
  const handleJump = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs.isJumping && gs.isRunning && !gs.isGameOver) {
      gs.velocityY = JUMP_VELOCITY;
      gs.isJumping = true;
    }
  }, []);

  // --- Keyboard & touch events ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleJump]);

  // --- Draw idle screen ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!isRunning && !isGameOver) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawGround(ctx, 0);
      drawDino(ctx, GROUND_Y - DINO_HEIGHT, false, false);
      drawScore(ctx, 0, gameStateRef.current.highScore);
    }
  }, [isRunning, isGameOver]);

  // --- Start / Restart ---
  const startGame = useCallback(() => {
    resetGame();
    const gs = gameStateRef.current;
    gs.isRunning = true;
    setIsRunning(true);
    setIsGameOver(false);
    setScore(0);
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [resetGame, gameLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // --- Game Over overlay ---
  const drawGameOver = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#535353";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("G A M E   O V E R", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
  };

  useEffect(() => {
    if (isGameOver) drawGameOver();
  }, [isGameOver]);

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Score display */}
      <div className="flex gap-8 font-mono text-lg text-gray-700">
        <span>Score: <b>{String(score).padStart(5, "0")}</b></span>
        <span>HI: <b>{String(highScore).padStart(5, "0")}</b></span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-300 rounded bg-white cursor-pointer"
        onClick={handleJump}
      />

      {/* Play / Restart button */}
      {!isRunning && (
        <button
          onClick={startGame}
          className="px-8 py-3 text-lg font-bold text-white bg-gray-700 rounded-lg hover:bg-gray-600 active:bg-gray-800 transition-colors cursor-pointer"
        >
          {isGameOver ? "🔄 Play Again" : "▶ Play"}
        </button>
      )}

      {/* Instructions */}
      {isRunning && (
        <p className="text-sm text-gray-500">
          Press <kbd className="px-1.5 py-0.5 border rounded text-xs">Space</kbd> / <kbd className="px-1.5 py-0.5 border rounded text-xs">↑</kbd> or tap canvas to jump
        </p>
      )}
    </div>
  );
};