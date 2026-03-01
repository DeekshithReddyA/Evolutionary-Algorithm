import { useEffect, useRef } from 'react';
import { Game } from '../game';

export const GameScreen = ({ mode, onBack } : { mode : string, onBack : () => void }) => {
    const gameRef = useRef<Game | null>(null);

    useEffect(() => {
        const game = new Game();
        gameRef.current = game;

        let animFrame = 0;
        let time = 0;

        const render = () => {
            time += 0.016;
            game.clear();

            // 3D perspective background with scrolling ties
            game.drawBackground(time * 600);

            // ── Obstacles (drawn first, further back) ──

            // Train in right lane at depth 0.35
            const trainDepth = 0.35;
            const trainScale = game.getDepthScale(trainDepth);
            const trainW = 120 * trainScale;
            const trainH = 160 * trainScale;
            const trainCX = game.getLaneX(2, trainDepth);
            const trainY = game.getDepthY(trainDepth) - trainH;
            game.drawTrain(trainCX - trainW / 2, trainY, trainW, trainH);

            // Hurdle in left lane at depth 0.25
            const hurdleDepth = 0.25;
            const hurdleScale = game.getDepthScale(hurdleDepth);
            const hurdleW = 130 * hurdleScale;
            const hurdleH = 55 * hurdleScale;
            const hurdleCX = game.getLaneX(0, hurdleDepth);
            const hurdleY = game.getDepthY(hurdleDepth) - hurdleH;
            game.drawHurdle(hurdleCX - hurdleW / 2, hurdleY, hurdleW, hurdleH);

            // ── Player (center lane, close to camera) ──
            const playerDepth = 0.05;
            const playerScale = game.getDepthScale(playerDepth);
            const playerW = 60 * playerScale;
            const playerH = 110 * playerScale;
            const playerCX = game.getLaneX(1, playerDepth);
            const playerY = game.getDepthY(playerDepth) - playerH;
            game.drawPlayer(playerCX - playerW / 2, playerY, playerW, playerH, time, false);

            animFrame = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animFrame);
            gameRef.current = null;
        };
    }, []);

    return (
        <div className="flex flex-col items-center">
            {/* Top bar with back button, scores, and mode label */}
            <div className="flex items-center justify-between w-[900px] pt-6">
                <button 
                    onClick={onBack} 
                    className="cursor-pointer bg-transparent border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-[#535353] font-sans hover:bg-slate-100 hover:border-[#535353]"
                >
                    ← Back
                </button>
                
                <div className="flex gap-8 font-mono text-[1.1rem]">
                    <div>Score: <span>0</span></div>
                    <div>High Score: <span>0</span></div>
                </div>
                
                <div className="font-['Courier_New',monospace] text-[0.95rem] text-[#535353] bg-slate-100 px-3 py-1.5 rounded-lg">
                    {mode.toUpperCase()}
                </div>
            </div>

            {/* Game Area (canvas + side panels) */}
            <div className="flex items-start gap-3 pt-3">
                {/* Left Panel */}
                <div className="w-[230px] min-h-[280px] bg-[#fafafa] border border-gray-200 rounded-[0.6rem] p-2 flex flex-col items-center">
                    <div className="font-['Courier_New',monospace] text-xs text-[#535353] mb-1 tracking-wider uppercase">
                        Vision
                    </div>
                    <canvas className="border border-gray-200 rounded bg-[#fafafa]" width="210" height="210"></canvas>
                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 font-mono text-xs text-[#444] mt-1.5 w-full px-1.5 py-1">
                        <div><b className="text-[#888] font-semibold mr-1">X:</b>0</div>
                        <div><b className="text-[#888] font-semibold mr-1">Y:</b>0</div>
                    </div>
                </div>

                {/* Main Canvas */}
                <div className="flex justify-center items-center">
                    <canvas id="gameCanvas" width="800" height="600" className="border-2 border-gray-300"></canvas>
                </div>

                {/* Right Panel */}
                <div className="w-[230px] min-h-[280px] bg-[#fafafa] border border-gray-200 rounded-[0.6rem] p-2 flex flex-col items-center">
                    <div className="font-['Courier_New',monospace] text-xs text-[#535353] mb-1 tracking-wider uppercase">
                        Network
                    </div>
                    <canvas className="border border-gray-200 rounded bg-[#fafafa]" width="210" height="210"></canvas>
                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 font-mono text-xs text-[#444] mt-1.5 w-full px-1.5 py-1">
                        <div><b className="text-[#888] font-semibold mr-1">Gen:</b>0</div>
                        <div><b className="text-[#888] font-semibold mr-1">Pop:</b>0</div>
                    </div>
                </div>
            </div>

            {/* Controls bar */}
            <div className="flex flex-col items-center gap-2 mt-2.5 w-[900px]">
                {/* Button row */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button className="cursor-pointer border border-gray-300 rounded-lg px-2.5 py-1.5 text-[0.82rem] bg-gray-50 text-[#333] font-sans transition-all duration-150 ease-in-out select-none hover:bg-gray-200 hover:border-gray-400">
                        Start
                    </button>
                    <button className="cursor-pointer border border-gray-300 rounded-lg px-2.5 py-1.5 text-[0.82rem] bg-gray-50 text-[#333] font-sans transition-all duration-150 ease-in-out select-none hover:bg-gray-200 hover:border-gray-400">
                        Pause
                    </button>
                    <button className="cursor-pointer border border-gray-300 rounded-lg px-2.5 py-1.5 text-[0.82rem] bg-gray-50 text-[#333] font-sans transition-all duration-150 ease-in-out select-none hover:bg-gray-200 hover:border-gray-400">
                        Reset
                    </button>
                    
                    <span className="inline-block w-px h-[22px] bg-gray-300 mx-1"></span>
                    
                    <button className="cursor-pointer border-green-300 rounded-lg px-2.5 py-1.5 text-[0.82rem] bg-green-100 text-[#333] font-sans font-semibold transition-all duration-150 ease-in-out select-none hover:bg-green-200">
                        Train
                    </button>
                    <button className="cursor-pointer border-blue-300 rounded-lg px-2.5 py-1.5 text-[0.82rem] bg-blue-100 text-[#333] font-sans font-semibold transition-all duration-150 ease-in-out select-none hover:bg-blue-200">
                        Infer
                    </button>
                    
                    <span className="inline-block w-px h-[22px] bg-gray-300 mx-1"></span>
                    
                    <button className="cursor-pointer border border-gray-300 rounded-lg px-2.5 py-1.5 text-[0.82rem] bg-gray-50 text-[#333] font-sans transition-all duration-150 ease-in-out select-none hover:bg-gray-200 hover:border-gray-400">
                        Save
                    </button>
                    <button className="cursor-pointer border border-gray-300 rounded-lg px-2.5 py-1.5 text-[0.82rem] bg-gray-50 text-[#333] font-sans transition-all duration-150 ease-in-out select-none hover:bg-gray-200 hover:border-gray-400">
                        Load
                    </button>
                </div>

                {/* Config row */}
                <div className="flex gap-3 flex-wrap justify-center items-center">
                    <label className="font-mono text-xs text-[#555] flex flex-col items-center gap-0.5">
                        <span>Speed</span>
                        <input type="number" defaultValue={1} className="w-[72px] px-1 py-0.5 text-xs font-mono border border-gray-300 rounded text-center bg-white" />
                    </label>
                    <label className="font-mono text-xs text-[#555] flex flex-col items-center gap-0.5">
                        <span>Population</span>
                        <input type="number" defaultValue={50} className="w-[72px] px-1 py-0.5 text-xs font-mono border border-gray-300 rounded text-center bg-white" />
                    </label>
                    <label className="font-mono text-xs text-[#555] flex flex-col items-center gap-0.5">
                        <span>Mutation</span>
                        <input type="number" defaultValue={0.1} step={0.01} className="w-[72px] px-1 py-0.5 text-xs font-mono border border-gray-300 rounded text-center bg-white" />
                    </label>
                </div>
            </div>
        </div>
    )
}