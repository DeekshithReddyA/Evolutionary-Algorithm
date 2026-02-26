import { useEffect, useRef } from 'react';
import { Game } from '../engine/game';
import { GAMode } from '../modes/GA';

interface GameScreenProps {
    mode: string;
    onBack: () => void;
}

const MODE_LABELS: Record<string, string> = {
    user: 'User',
    neural: 'Neural Network',
    neat: 'NEAT',
    rl: 'RL',
};

export default function GameScreen({ mode, onBack }: GameScreenProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const startBtnRef = useRef<HTMLButtonElement>(null);
    const scoreRef = useRef<HTMLElement>(null);
    const highScoreRef = useRef<HTMLElement>(null);
    const gameRef = useRef<Game | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const startBtn = startBtnRef.current!;
        const scoreEl = scoreRef.current!;
        const highScoreEl = highScoreRef.current!;

        const game = new Game(canvas, startBtn, scoreEl, highScoreEl);
        gameRef.current = game;

        // Initialize GA mode if neural network mode is selected
        if (mode === 'neural') {
            game.gaMode = new GAMode(game);
            game.gaMode.startTraining({
                populationSize: 150,
                mutationRate: 0.15,
                crossoverRate: 0.7,
                elitismCount: 10,
                inputSize: 7, // Must match the number of inputs in _getGameState
            });
            // Auto-start the game in training mode
            setTimeout(() => game.start(), 100);
        }

        return () => {
            game.destroy();
            gameRef.current = null;
        };
    }, [mode]);

    const handleBack = () => {
        if (gameRef.current) {
            gameRef.current.stop();
        }
        onBack();
    };

    return (
        <div className="container">
            <div className="top-bar">
                <button className="back-btn" onClick={handleBack}>
                    ← Back
                </button>
                <div className="score-bar">
                    <span>
                        Score: <strong ref={scoreRef}>0</strong>
                    </span>
                    <span>
                        High Score: <strong ref={highScoreRef}>0</strong>
                    </span>
                </div>
                <span className="mode-display">Mode: {MODE_LABELS[mode]}</span>
            </div>
            <div className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    width={900}
                    height={500}
                    style={{ border: '1px solid black' }}
                />
            </div>
            <button ref={startBtnRef} className="start-btn">
                Start
            </button>
        </div>
    );
}
