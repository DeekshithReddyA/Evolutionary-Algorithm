/** Any object that can make decisions from game-state inputs */
export interface Brain {
    feedforward(inputs: number[]): number;
}

/** GA configuration */
export interface Config {
    populationSize: number;
    mutationRate: number;
    crossoverRate: number; 
    elitismCount: number;
    inputSize: number;
}

/** NEAT configuration */
export interface NEATConfig {
    populationSize: number;
    inputSize: number;
    outputSize: number;
    weightMutationRate: number;
    addNodeRate: number;
    addConnectionRate: number;
    compatibilityThreshold: number;
    c1: number;
    c2: number;
    c3: number;
    survivalRate: number;
}

/** PPO configuration */
export interface PPOConfig {
    nAgents: number;
    learningRate: number;
    clipEpsilon: number;
    inputSize: number;
}

/** Stats collected each generation */
export interface GenerationStats {
    generation: number;
    bestFitness: number;
    avgFitness: number;
    speciesCount?: number;
    nodeCount?: number;
    connectionCount?: number;
}
