import { Genome, NEATPopulation } from "../engine/neat";
import { Dino, Game } from "../engine/game";
import { GenerationStats, NEATConfig } from "../engine/types";

export class NEATMode {
    engine: Game;
    neat: NEATPopulation | null = null;
    isRunning = false;
    bestFitnessAllTime = 0;
    stats: GenerationStats[] = [];
    bestGenome: Genome | null = null;
    onStatsUpdate: ((stat: GenerationStats, bestGenome: Genome) => void) | null = null;

    constructor(engine: Game) {
        this.engine = engine;
    }

    startTraining(config: NEATConfig) {
        this.neat = new NEATPopulation(config);
        this.isRunning = true;
        this.stats = [];
        this.bestFitnessAllTime = 0;
        this.bestGenome = null;
        this._startGeneration(this.neat.genomes);
    }

    _startGeneration(genomes: Genome[]) {
        const dinos = genomes.map((g) => {
            const dino = new Dino();
            dino.brain = g; // Genome implements Brain
            return dino;
        });
        this.engine.dinos = dinos;
        this.engine.onAllDead = () => this._endGeneration();
    }

    _endGeneration() {
        if (!this.isRunning || !this.neat) return;

        const fitnesses = this.neat.genomes.map((g) => {
            const dino = this.engine.deadDinos.find((d) => d.brain === g);
            return dino ? dino.score : 0;
        });

        const maxFitness = Math.max(...fitnesses);
        const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

        // Track the best genome before evolve() mutates references
        const currentBest = this.neat.getBest();
        if (maxFitness > this.bestFitnessAllTime) {
            this.bestFitnessAllTime = maxFitness;
            this.bestGenome = currentBest.clone(this.neat.tracker);
        }

        const stat: GenerationStats = {
            generation: this.neat.generation,
            bestFitness: maxFitness,
            avgFitness,
            speciesCount: this.neat.species.length,
            nodeCount: currentBest.nodes.length,
            connectionCount: currentBest.connections.filter((c) => c.enabled).length,
        };
        this.stats.push(stat);

        // Callback with current best (for visualization)
        if (this.onStatsUpdate) {
            this.onStatsUpdate(stat, currentBest.clone(this.neat.tracker));
        }

        console.log(
            `NEAT Gen ${this.neat.generation} — Best: ${maxFitness.toFixed(2)}, Avg: ${avgFitness.toFixed(2)}, Species: ${this.neat.species.length}, Nodes: ${currentBest.nodes.length}`,
        );

        const nextGen = this.neat.evolve(fitnesses);
        this._startGeneration(nextGen);
        this.engine.start();
    }

    stopTraining() {
        this.isRunning = false;
    }
}
