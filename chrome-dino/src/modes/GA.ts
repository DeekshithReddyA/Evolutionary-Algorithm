import { GA } from "../engine/brain";
import { Dino, Game } from "../engine/game";
import { NeuralNetwork } from "../engine/nn";
import { Config, GenerationStats } from "../engine/types";

export class GAMode{
    engine: Game
    ga: GA | null;
    isRunning: boolean;
    bestFitnessAllTime: number;
    stats: GenerationStats[];
    bestModel: NeuralNetwork | null;
    onStatsUpdate: ((stat: GenerationStats) => void) | null;
    
    constructor(engine: Game){
        this.engine = engine;
        this.ga = null;
        
        this.isRunning = false;
        this.bestFitnessAllTime = 0;
        this.stats = [];
        this.bestModel = null;
        this.onStatsUpdate = null;
    }

    startTraining(config: Config) {
        this.ga = new GA(config);
        this.isRunning = true;
        this.stats = [];
        this.bestFitnessAllTime = 0;
        this.bestModel = null;

        // Initialize the population
        this._startGeneration(this.ga._initPopulation());

    }

    _startGeneration(brains: NeuralNetwork[]) {
        const dinos = brains.map((brain) => {
            const dino = new Dino();
            dino.brain = brain;
            return dino;
        })
        this.engine.dinos = dinos;

        this.engine.onAllDead = () => this._endGeneration();
    }
    
    _endGeneration() {
        if(!this.isRunning || !this.ga) return;

        // Build fitness array matching population order using brain references
        const fitnesses = this.ga.population.map((nn) => {
            const dino = this.engine.deadDinos.find(d => d.brain === nn);
            return dino ? dino.score : 0;
        });

        // Update best fitness
        const maxFitness = Math.max(...fitnesses);
        const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

        if (maxFitness > this.bestFitnessAllTime) {
            this.bestFitnessAllTime = maxFitness;
            this.bestModel = this.ga.getBest().clone();
        }

        const stat: GenerationStats = {
            generation: this.ga.generation,
            bestFitness: maxFitness,
            avgFitness,
        };
        this.stats.push(stat);
        if (this.onStatsUpdate) this.onStatsUpdate(stat);

        console.log(`Generation ${this.ga.generation} - Best: ${maxFitness.toFixed(2)}, All-time: ${this.bestFitnessAllTime.toFixed(2)}`);
        
        const nextGen = this.ga.evolve(fitnesses);
        this._startGeneration(nextGen);
        // Restart the game with new generation
        this.engine.start();
    }

    stopTraining() {
        this.isRunning = false;
    }
}
