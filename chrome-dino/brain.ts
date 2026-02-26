import { NeuralNetwork } from "./nn";
import { Config } from "./types";

export class AI{
    
}

export class GA implements AI{
    populationSize: number;
    mutationRate: number;
    crossoverRate: number; 
    elitismCount: number;
    inputSize: number;

    population: NeuralNetwork[];
    generation: number;
    constructor(config: Config){
        this.populationSize = config.populationSize || 50;
        this.mutationRate = config.mutationRate || 0.1;
        this.crossoverRate = config.crossoverRate || 0.8;
        this.elitismCount = config.elitismCount || 6;
        this.inputSize = config.inputSize || 10;

        this.population = [];
        this.generation = 0;
    }

    _initPopulation(): NeuralNetwork[] {
        for(let i = 0; i < this.populationSize; i++){
            const nn = new NeuralNetwork([this.inputSize, 5, 1]);
            this.population.push(nn);
        }

        return this.population
    }

    evolve(fitnesses: number[]): NeuralNetwork[] {
        // Sort population by fitness
        const rated = this.population
        .map((nn, i) => ({nn, fitness: fitnesses[i]}))
        .sort((a, b) => b.fitness - a.fitness);

        const next = [];

        // Elitism (Pick top N)
        // Top performers are directly copied to the next generation without modification.
        const eliteCount = Math.min(this.elitismCount, this.populationSize);
        for(let i = 0; i < eliteCount; i++){
            next.push(rated[i].nn.clone());
        }

        // Crossover and Mutate (Choose top 25% as parents to breed)
        // Crossover means combining the weights and biases of two parent neural networks to create a child network.

        // Mutate means randomly altering some of the weights and biases in the child network to introduce variation.
        //  This helps prevent the population from becoming too similar and getting stuck in local optima.
        const parentCount = Math.max(2, Math.ceil(this.populationSize / 4));
        const parents = rated.slice(0, parentCount).map(r => r.nn);

        while(next.length < this.populationSize){
            const parentA = parents[Math.floor(Math.random() * parents.length)];
            const parentB = parents[Math.floor(Math.random() * parents.length)];

            let child: NeuralNetwork;
            if(Math.random() < this.crossoverRate){
                child = parentA.crossover(parentB);
            } else {
                child = parentA.clone();
            }

            child.mutate(this.mutationRate, 0.1);
            next.push(child);
        }

        this.population = next;
        this.generation++;

        return this.population;
    }

    getBest(): NeuralNetwork {
        return this.population[0];
    }

}

export class NEAT implements AI{

}

export class RL implements AI{

}
