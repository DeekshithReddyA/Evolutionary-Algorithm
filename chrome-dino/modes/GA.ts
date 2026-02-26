import { GA } from "../brain";
import { Dino, Game } from "../game";
import { NeuralNetwork } from "../nn";
import { Config } from "../types";

export class GAMode{
    engine: Game
    ga: GA | null;
    isRunning: boolean;
    bestFitnessAllTime: number;
    
    constructor(engine: Game){
        this.engine = engine;
        this.ga = null;
        
        this.isRunning = false;
        this.bestFitnessAllTime = 0;
    }

    startTraining(config: Config) {
        this.ga = new GA(config);
        this.isRunning = true;

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
        if (maxFitness > this.bestFitnessAllTime) {
            this.bestFitnessAllTime = maxFitness;
        }

        console.log(`Generation ${this.ga.generation} - Best: ${maxFitness.toFixed(2)}, All-time: ${this.bestFitnessAllTime.toFixed(2)}`);
        
        const nextGen = this.ga.evolve(fitnesses);
        this._startGeneration(nextGen);
        // Restart the game with new generation
        this.engine.start();
    }
}