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
        if(!this.isRunning) return;

        const fitnesses = this.engine.dinos.map(d => d.score);

        // Save the best one for alanysis TODO
        
        if(this.ga){
            this.ga?.evolve(fitnesses);
            this._startGeneration(this.ga?.population);
        }

    }
}