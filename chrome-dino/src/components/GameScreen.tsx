import { useEffect, useRef, useState, useCallback } from "react";
import { Game, Dino } from "../engine/game";
import { NeuralNetwork } from "../engine/nn";
import { Genome, InnovationTracker } from "../engine/neat";
import { GAMode } from "../modes/GA";
import { NEATMode } from "../modes/NEAT";
import { PPOMode } from "../modes/PPO";
import { PPOBrain, PPOTrainer } from "../engine/ppo";
import { GenerationStats } from "../engine/types";
import { drawFitnessGraph, drawNetwork } from "../utils/canvasUtils";

interface GameScreenProps {
    mode: string;
    onBack: () => void;
}

const MODE_LABELS: Record<string, string> = {
    user: "User",
    neural: "Neural Network (GA)",
    neat: "NEAT",
    rl: "PPO",
};

/* ── Default configs ── */

const defaultGAConfig = () => ({
    populationSize: 150,
    mutationRate: 0.15,
    crossoverRate: 0.7,
    elitismCount: 10,
    inputSize: 7,
});

const defaultNEATConfig = () => ({
    populationSize: 150,
    inputSize: 7,
    outputSize: 2,
    weightMutationRate: 0.8,
    addNodeRate: 0.03,
    addConnectionRate: 0.05,
    compatibilityThreshold: 3.0,
    c1: 1.0,
    c2: 1.0,
    c3: 0.4,
    survivalRate: 0.3,
});

const defaultPPOConfig = () => ({
    nAgents: 20,
    learningRate: 3e-4,
    clipEpsilon: 0.2,
    inputSize: 7,
});

/* ── Helpers ── */

function downloadJSON(data: object, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadCSV(stats: GenerationStats[], filename: string) {
    const headers = ["generation", "bestFitness", "avgFitness", "speciesCount", "nodeCount", "connectionCount"];
    const rows = stats.map((s) =>
        [s.generation, s.bestFitness.toFixed(2), s.avgFitness.toFixed(2), s.speciesCount ?? "", s.nodeCount ?? "", s.connectionCount ?? ""].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════════ */

export default function GameScreen({ mode, onBack }: GameScreenProps) {
    /* ── Refs ── */
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const startBtnRef = useRef<HTMLButtonElement>(null);
    const scoreRef = useRef<HTMLElement>(null);
    const highScoreRef = useRef<HTMLElement>(null);
    const graphRef = useRef<HTMLCanvasElement>(null);
    const nnRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const gameRef = useRef<Game | null>(null);
    const gaModeRef = useRef<GAMode | null>(null);
    const neatModeRef = useRef<NEATMode | null>(null);
    const ppoModeRef = useRef<PPOMode | null>(null);

    /* ── State ── */
    const [phase, setPhase] = useState<"idle" | "training" | "inference">("idle");
    const [stats, setStats] = useState<GenerationStats[]>([]);
    const [bestGenomeViz, setBestGenomeViz] = useState<Genome | null>(null);
    const [latestStat, setLatestStat] = useState<GenerationStats | null>(null);
    const [hasBestModel, setHasBestModel] = useState(false);

    // Config state (GA)
    const [gaPopulation, setGaPopulation] = useState(150);
    const [gaMutRate, setGaMutRate] = useState(0.15);
    const [gaCrossRate, setGaCrossRate] = useState(0.7);
    const [gaElitism, setGaElitism] = useState(10);

    // Config state (NEAT)
    const [neatPopulation, setNeatPopulation] = useState(150);
    const [neatWeightMut, setNeatWeightMut] = useState(0.8);
    const [neatAddNode, setNeatAddNode] = useState(0.03);
    const [neatAddConn, setNeatAddConn] = useState(0.05);
    const [neatCompat, setNeatCompat] = useState(3.0);

    // Config state (PPO)
    const [ppoAgents, setPpoAgents] = useState(20);
    const [ppoLR, setPpoLR] = useState(3e-4);
    const [ppoClip, setPpoClip] = useState(0.2);

    // PPO metrics
    const [ppoMetrics, setPpoMetrics] = useState<{ policyLoss: number; valueLoss: number; entropy: number } | null>(null);

    const isAI = mode === "neural" || mode === "neat" || mode === "rl";

    /* ── Create Game on mount ── */
    useEffect(() => {
        const canvas = canvasRef.current!;
        const startBtn = startBtnRef.current!;
        const scoreEl = scoreRef.current!;
        const highScoreEl = highScoreRef.current!;

        const game = new Game(canvas, startBtn, scoreEl, highScoreEl);
        gameRef.current = game;

        return () => {
            game.destroy();
            gameRef.current = null;
            gaModeRef.current = null;
            neatModeRef.current = null;
            ppoModeRef.current = null;
        };
    }, [mode]);

    /* ── Redraw fitness graph when stats change ── */
    useEffect(() => {
        const ctx = graphRef.current?.getContext("2d");
        if (!ctx) return;
        drawFitnessGraph(ctx, stats, graphRef.current!.width, graphRef.current!.height);
    }, [stats]);

    /* ── Redraw network viz when best genome changes ── */
    useEffect(() => {
        const ctx = nnRef.current?.getContext("2d");
        if (!ctx) return;
        drawNetwork(ctx, bestGenomeViz, nnRef.current!.width, nnRef.current!.height);
    }, [bestGenomeViz]);

    /* ── Training ── */
    const startTraining = useCallback(() => {
        const game = gameRef.current;
        if (!game) return;

        setStats([]);
        setLatestStat(null);
        setBestGenomeViz(null);
        setHasBestModel(false);
        setPpoMetrics(null);

        if (mode === "neural") {
            const gaMode = new GAMode(game);
            gaModeRef.current = gaMode;
            gaMode.onStatsUpdate = (stat) => {
                setStats((prev) => [...prev, stat]);
                setLatestStat(stat);
                setHasBestModel(true);
            };
            gaMode.startTraining({
                ...defaultGAConfig(),
                populationSize: gaPopulation,
                mutationRate: gaMutRate,
                crossoverRate: gaCrossRate,
                elitismCount: gaElitism,
            });
            setTimeout(() => game.start(), 80);
        } else if (mode === "neat") {
            const neatMode = new NEATMode(game);
            neatModeRef.current = neatMode;
            neatMode.onStatsUpdate = (stat, genome) => {
                setStats((prev) => [...prev, stat]);
                setLatestStat(stat);
                setBestGenomeViz(genome);
                setHasBestModel(true);
            };
            neatMode.startTraining({
                ...defaultNEATConfig(),
                populationSize: neatPopulation,
                weightMutationRate: neatWeightMut,
                addNodeRate: neatAddNode,
                addConnectionRate: neatAddConn,
                compatibilityThreshold: neatCompat,
            });
            setTimeout(() => game.start(), 80);
        } else if (mode === "rl") {
            const ppoMode = new PPOMode(game);
            ppoModeRef.current = ppoMode;
            ppoMode.onStatsUpdate = (stat) => {
                setStats((prev) => [...prev, stat]);
                setLatestStat(stat);
                setHasBestModel(true);
                setPpoMetrics({
                    policyLoss: ppoMode.trainer?.lastPolicyLoss ?? 0,
                    valueLoss: ppoMode.trainer?.lastValueLoss ?? 0,
                    entropy: ppoMode.trainer?.lastEntropy ?? 0,
                });
            };
            ppoMode.startTraining({
                ...defaultPPOConfig(),
                nAgents: ppoAgents,
                learningRate: ppoLR,
                clipEpsilon: ppoClip,
            });
            setTimeout(() => game.start(), 80);
        }

        setPhase("training");
    }, [mode, gaPopulation, gaMutRate, gaCrossRate, gaElitism, neatPopulation, neatWeightMut, neatAddNode, neatAddConn, neatCompat, ppoAgents, ppoLR, ppoClip]);

    const stopTraining = useCallback(() => {
        gaModeRef.current?.stopTraining();
        neatModeRef.current?.stopTraining();
        ppoModeRef.current?.stopTraining();
        gameRef.current?.stop();
        // Reset dinos so the game is clean
        if (gameRef.current) {
            gameRef.current.dinos = [new Dino()];
            gameRef.current.onAllDead = null;
        }
        setPhase("idle");
    }, []);

    /* ── Inference ── */
    const startInference = useCallback(() => {
        const game = gameRef.current;
        if (!game) return;

        let brain: NeuralNetwork | Genome | PPOBrain | null = null;

        if (mode === "neural") {
            brain = gaModeRef.current?.bestModel ?? null;
        } else if (mode === "neat") {
            brain = neatModeRef.current?.bestGenome ?? null;
        } else if (mode === "rl") {
            brain = ppoModeRef.current?.trainer?.createInferenceAgent() ?? null;
        }

        if (!brain) {
            alert("No trained model available. Train first or import a model.");
            return;
        }

        const dino = new Dino();
        dino.brain = brain;
        game.dinos = [dino];
        game.onAllDead = null;
        game.start();
        setPhase("inference");
    }, [mode]);

    const stopInference = useCallback(() => {
        gameRef.current?.stop();
        if (gameRef.current) {
            gameRef.current.dinos = [new Dino()];
            gameRef.current.onAllDead = null;
        }
        setPhase("idle");
    }, []);

    /* ── Export / Import ── */
    const exportModel = useCallback(() => {
        if (mode === "neural") {
            const model = gaModeRef.current?.bestModel;
            if (!model) return alert("No model to export.");
            downloadJSON(JSON.parse(model.toJson()), `ga-model-gen${stats.length}.json`);
        } else if (mode === "neat") {
            const genome = neatModeRef.current?.bestGenome;
            if (!genome) return alert("No genome to export.");
            downloadJSON(genome.toJSON(), `neat-genome-gen${stats.length}.json`);
        } else if (mode === "rl") {
            const trainer = ppoModeRef.current?.trainer;
            if (!trainer) return alert("No model to export.");
            downloadJSON(trainer.toJSON(), `ppo-model-ep${stats.length}.json`);
        }
    }, [mode, stats.length]);

    const exportStats = useCallback(() => {
        if (stats.length === 0) return alert("No stats to export.");
        downloadCSV(stats, `${mode}-stats.csv`);
    }, [stats, mode]);

    const importModel = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileImport = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);

                    if (mode === "neural") {
                        const nn = NeuralNetwork.fromJson(JSON.stringify(data));
                        if (!gaModeRef.current) {
                            gaModeRef.current = new GAMode(gameRef.current!);
                        }
                        gaModeRef.current.bestModel = nn;
                        setHasBestModel(true);
                    } else if (mode === "neat") {
                        const tracker = new InnovationTracker();
                        const genome = Genome.fromJSON(data, tracker);
                        if (!neatModeRef.current) {
                            neatModeRef.current = new NEATMode(gameRef.current!);
                        }
                        neatModeRef.current.bestGenome = genome;
                        setBestGenomeViz(genome);
                        setHasBestModel(true);
                    } else if (mode === "rl") {
                        const trainer = PPOTrainer.fromJSON(data, {
                            ...defaultPPOConfig(),
                            nAgents: ppoAgents,
                            learningRate: ppoLR,
                            clipEpsilon: ppoClip,
                        });
                        if (!ppoModeRef.current) {
                            ppoModeRef.current = new PPOMode(gameRef.current!);
                        }
                        ppoModeRef.current.trainer = trainer;
                        setHasBestModel(true);
                    }
                } catch (err) {
                    alert("Invalid model file.");
                    console.error(err);
                }
            };
            reader.readAsText(file);
            // Reset so the same file can be re-selected
            e.target.value = "";
        },
        [mode, ppoAgents, ppoLR, ppoClip],
    );

    /* ── Back ── */
    const handleBack = () => {
        stopTraining();
        stopInference();
        onBack();
    };

    /* ═══════════════════════ RENDER ═══════════════════════ */

    return (
        <div className="container">
            {/* ── Top bar ── */}
            <div className="top-bar">
                <button className="back-btn" onClick={handleBack}>← Back</button>
                <div className="score-bar">
                    <span>Score: <strong ref={scoreRef}>0</strong></span>
                    <span>High Score: <strong ref={highScoreRef}>0</strong></span>
                </div>
                <span className="mode-display">Mode: {MODE_LABELS[mode]}</span>
            </div>

            {/* ── Main area: panels + canvas ── */}
            <div className="game-area">
                {/* Left panel – fitness graph + stats */}
                {isAI && (
                    <div className="side-panel left-panel">
                        <h4 className="panel-title">Fitness</h4>
                        <canvas ref={graphRef} width={220} height={180} className="panel-canvas" />
                        {latestStat && (
                            <div className="stat-box">
                                <div><b>Gen</b> {latestStat.generation}</div>
                                <div><b>Best</b> {latestStat.bestFitness.toFixed(1)}</div>
                                <div><b>Avg</b> {latestStat.avgFitness.toFixed(1)}</div>
                                {latestStat.speciesCount != null && (
                                    <div><b>Species</b> {latestStat.speciesCount}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Game canvas */}
                <div className="canvas-wrapper">
                    <canvas ref={canvasRef} width={900} height={500} style={{ border: "1px solid black" }} />
                </div>

                {/* Right panel – NN visualiser (NEAT only) */}
                {mode === "neat" && (
                    <div className="side-panel right-panel">
                        <h4 className="panel-title">Network</h4>
                        <canvas ref={nnRef} width={220} height={220} className="panel-canvas" />
                    </div>
                )}

                {/* Right panel placeholder for GA */}
                {mode === "neural" && (
                    <div className="side-panel right-panel">
                        <h4 className="panel-title">GA Info</h4>
                        <div className="stat-box" style={{ marginTop: 8 }}>
                            {latestStat ? (
                                <>
                                    <div><b>Generation</b> {latestStat.generation}</div>
                                    <div><b>All-Time Best</b> {gaModeRef.current?.bestFitnessAllTime.toFixed(1) ?? "—"}</div>
                                    <div><b>Pop Size</b> {gaPopulation}</div>
                                </>
                            ) : (
                                <div style={{ color: "#aaa", fontSize: 12 }}>Start training…</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Right panel – PPO metrics */}
                {mode === "rl" && (
                    <div className="side-panel right-panel">
                        <h4 className="panel-title">PPO Info</h4>
                        <div className="stat-box" style={{ marginTop: 8 }}>
                            {latestStat ? (
                                <>
                                    <div><b>Episode</b> {latestStat.generation}</div>
                                    <div><b>Best</b> {ppoModeRef.current?.bestScoreAllTime.toFixed(1) ?? "—"}</div>
                                    {ppoMetrics && (
                                        <>
                                            <div><b>P.Loss</b> {ppoMetrics.policyLoss.toFixed(4)}</div>
                                            <div><b>V.Loss</b> {ppoMetrics.valueLoss.toFixed(4)}</div>
                                            <div><b>Entropy</b> {ppoMetrics.entropy.toFixed(3)}</div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div style={{ color: "#aaa", fontSize: 12 }}>Start training…</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Controls ── */}
            {isAI && (
                <div className="controls-bar">
                    {/* Training / Inference buttons */}
                    <div className="btn-row">
                        <button
                            className="ctrl-btn train-btn"
                            disabled={phase === "inference"}
                            onClick={phase === "training" ? stopTraining : startTraining}
                        >
                            {phase === "training" ? "⏹ Stop Training" : "▶ Train"}
                        </button>
                        <button
                            className="ctrl-btn infer-btn"
                            disabled={phase === "training" || !hasBestModel}
                            onClick={phase === "inference" ? stopInference : startInference}
                        >
                            {phase === "inference" ? "⏹ Stop" : "▶ Run Best"}
                        </button>

                        <span className="separator" />

                        <button className="ctrl-btn" onClick={exportModel} disabled={!hasBestModel}>
                            💾 Export Model
                        </button>
                        <button className="ctrl-btn" onClick={importModel}>
                            📂 Import Model
                        </button>
                        <button className="ctrl-btn" onClick={exportStats} disabled={stats.length === 0}>
                            📊 Export Stats
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            style={{ display: "none" }}
                            onChange={handleFileImport}
                        />
                    </div>

                    {/* Config */}
                    <div className="config-row">
                        {mode === "neural" && (
                            <>
                                <label>Population <input type="number" value={gaPopulation} min={10} max={500} onChange={(e) => setGaPopulation(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Mutation Rate <input type="number" value={gaMutRate} step={0.01} min={0} max={1} onChange={(e) => setGaMutRate(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Crossover Rate <input type="number" value={gaCrossRate} step={0.01} min={0} max={1} onChange={(e) => setGaCrossRate(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Elitism <input type="number" value={gaElitism} min={0} max={100} onChange={(e) => setGaElitism(+e.target.value)} disabled={phase !== "idle"} /></label>
                            </>
                        )}
                        {mode === "neat" && (
                            <>
                                <label>Population <input type="number" value={neatPopulation} min={10} max={500} onChange={(e) => setNeatPopulation(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Weight Mut <input type="number" value={neatWeightMut} step={0.05} min={0} max={1} onChange={(e) => setNeatWeightMut(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Add Node <input type="number" value={neatAddNode} step={0.01} min={0} max={0.5} onChange={(e) => setNeatAddNode(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Add Conn <input type="number" value={neatAddConn} step={0.01} min={0} max={0.5} onChange={(e) => setNeatAddConn(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Compat Thresh <input type="number" value={neatCompat} step={0.1} min={0.5} max={10} onChange={(e) => setNeatCompat(+e.target.value)} disabled={phase !== "idle"} /></label>
                            </>
                        )}
                        {mode === "rl" && (
                            <>
                                <label>Agents <input type="number" value={ppoAgents} min={5} max={100} onChange={(e) => setPpoAgents(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Learning Rate <input type="number" value={ppoLR} step={0.0001} min={0.00001} max={0.01} onChange={(e) => setPpoLR(+e.target.value)} disabled={phase !== "idle"} /></label>
                                <label>Clip ε <input type="number" value={ppoClip} step={0.05} min={0.05} max={0.5} onChange={(e) => setPpoClip(+e.target.value)} disabled={phase !== "idle"} /></label>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden start button (required by Game constructor, hidden for AI modes) */}
            <button
                ref={startBtnRef}
                className="start-btn"
                style={isAI ? { display: "none" } : undefined}
            >
                Start
            </button>
        </div>
    );
}
