import { Brain, PPOConfig } from "./types";

/* ───────────────── Utility Functions ───────────────── */

function softmax(logits: number[]): number[] {
    const max = Math.max(...logits);
    const exps = logits.map((l) => Math.exp(l - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
}

function sampleCategorical(probs: number[]): number {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
        cum += probs[i];
        if (r < cum) return i;
    }
    return probs.length - 1;
}

function shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

/* ───────────────── Dense Layer with Adam ───────────────── */

class DenseLayer {
    inputSize: number;
    outputSize: number;
    weights: number[][]; // [outputSize][inputSize]
    biases: number[];
    activation: "relu" | "tanh" | "linear";

    // Cached activations for backprop
    private _input: number[] = [];
    private _preAct: number[] = [];
    private _output: number[] = [];

    // Accumulated gradients
    dWeights: number[][];
    dBiases: number[];

    // Adam optimizer state
    private _mW: number[][];
    private _vW: number[][];
    private _mB: number[];
    private _vB: number[];

    constructor(
        inputSize: number,
        outputSize: number,
        activation: "relu" | "tanh" | "linear",
        initScale?: number,
    ) {
        this.inputSize = inputSize;
        this.outputSize = outputSize;
        this.activation = activation;

        const scale = initScale ?? Math.sqrt(2 / inputSize); // He init

        this.weights = [];
        this.dWeights = [];
        this._mW = [];
        this._vW = [];

        for (let i = 0; i < outputSize; i++) {
            this.weights[i] = [];
            this.dWeights[i] = [];
            this._mW[i] = [];
            this._vW[i] = [];
            for (let j = 0; j < inputSize; j++) {
                this.weights[i][j] = (Math.random() * 2 - 1) * scale;
                this.dWeights[i][j] = 0;
                this._mW[i][j] = 0;
                this._vW[i][j] = 0;
            }
        }

        this.biases = new Array(outputSize).fill(0);
        this.dBiases = new Array(outputSize).fill(0);
        this._mB = new Array(outputSize).fill(0);
        this._vB = new Array(outputSize).fill(0);
    }

    forward(input: number[]): number[] {
        this._input = input;
        this._preAct = new Array(this.outputSize);
        this._output = new Array(this.outputSize);

        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.biases[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += this.weights[i][j] * input[j];
            }
            this._preAct[i] = sum;

            switch (this.activation) {
                case "relu":
                    this._output[i] = sum > 0 ? sum : 0;
                    break;
                case "tanh":
                    this._output[i] = Math.tanh(sum);
                    break;
                case "linear":
                    this._output[i] = sum;
                    break;
            }
        }

        return this._output;
    }

    backward(gradOutput: number[]): number[] {
        const gradInput = new Array(this.inputSize).fill(0);

        for (let i = 0; i < this.outputSize; i++) {
            let g = gradOutput[i];

            // Activation derivative
            switch (this.activation) {
                case "relu":
                    g *= this._preAct[i] > 0 ? 1 : 0;
                    break;
                case "tanh": {
                    const t = this._output[i];
                    g *= 1 - t * t;
                    break;
                }
                case "linear":
                    break;
            }

            // Accumulate gradients
            this.dBiases[i] += g;
            for (let j = 0; j < this.inputSize; j++) {
                this.dWeights[i][j] += g * this._input[j];
                gradInput[j] += g * this.weights[i][j];
            }
        }

        return gradInput;
    }

    zeroGrad(): void {
        for (let i = 0; i < this.outputSize; i++) {
            this.dBiases[i] = 0;
            for (let j = 0; j < this.inputSize; j++) {
                this.dWeights[i][j] = 0;
            }
        }
    }

    adamStep(lr: number, beta1: number, beta2: number, eps: number, t: number): void {
        const bc1 = 1 - Math.pow(beta1, t);
        const bc2 = 1 - Math.pow(beta2, t);

        for (let i = 0; i < this.outputSize; i++) {
            // Biases
            this._mB[i] = beta1 * this._mB[i] + (1 - beta1) * this.dBiases[i];
            this._vB[i] = beta2 * this._vB[i] + (1 - beta2) * this.dBiases[i] * this.dBiases[i];
            this.biases[i] -= lr * (this._mB[i] / bc1) / (Math.sqrt(this._vB[i] / bc2) + eps);

            // Weights
            for (let j = 0; j < this.inputSize; j++) {
                const g = this.dWeights[i][j];
                this._mW[i][j] = beta1 * this._mW[i][j] + (1 - beta1) * g;
                this._vW[i][j] = beta2 * this._vW[i][j] + (1 - beta2) * g * g;
                this.weights[i][j] -= lr * (this._mW[i][j] / bc1) / (Math.sqrt(this._vW[i][j] / bc2) + eps);
            }
        }
    }
}

/* ───────────────── Feed-Forward Network ───────────────── */

export class PPONetwork {
    layers: DenseLayer[];
    private _sizes: number[];
    private _activations: ("relu" | "tanh" | "linear")[];
    private _initScales?: (number | undefined)[];

    constructor(
        sizes: number[],
        activations: ("relu" | "tanh" | "linear")[],
        initScales?: (number | undefined)[],
    ) {
        this._sizes = [...sizes];
        this._activations = [...activations];
        this._initScales = initScales ? [...initScales] : undefined;
        this.layers = [];

        for (let i = 0; i < sizes.length - 1; i++) {
            this.layers.push(
                new DenseLayer(sizes[i], sizes[i + 1], activations[i], initScales?.[i]),
            );
        }
    }

    forward(input: number[]): number[] {
        let x = input;
        for (const layer of this.layers) {
            x = layer.forward(x);
        }
        return x;
    }

    backward(gradOutput: number[]): void {
        let g = gradOutput;
        for (let i = this.layers.length - 1; i >= 0; i--) {
            g = this.layers[i].backward(g);
        }
    }

    zeroGrad(): void {
        for (const layer of this.layers) layer.zeroGrad();
    }

    /** Clip accumulated gradient norms to prevent explosion */
    clipGradients(maxNorm: number): void {
        let totalNorm = 0;
        for (const layer of this.layers) {
            for (let i = 0; i < layer.outputSize; i++) {
                totalNorm += layer.dBiases[i] ** 2;
                for (let j = 0; j < layer.inputSize; j++) {
                    totalNorm += layer.dWeights[i][j] ** 2;
                }
            }
        }
        totalNorm = Math.sqrt(totalNorm);

        if (totalNorm > maxNorm) {
            const scale = maxNorm / totalNorm;
            for (const layer of this.layers) {
                for (let i = 0; i < layer.outputSize; i++) {
                    layer.dBiases[i] *= scale;
                    for (let j = 0; j < layer.inputSize; j++) {
                        layer.dWeights[i][j] *= scale;
                    }
                }
            }
        }
    }

    adamStep(lr: number, t: number): void {
        for (const layer of this.layers) {
            layer.adamStep(lr, 0.9, 0.999, 1e-8, t);
        }
    }

    clone(): PPONetwork {
        const net = new PPONetwork(this._sizes, this._activations, this._initScales);
        for (let l = 0; l < this.layers.length; l++) {
            const src = this.layers[l];
            const dst = net.layers[l];
            for (let i = 0; i < src.outputSize; i++) {
                dst.biases[i] = src.biases[i];
                for (let j = 0; j < src.inputSize; j++) {
                    dst.weights[i][j] = src.weights[i][j];
                }
            }
        }
        return net;
    }

    toJSON(): object {
        return {
            sizes: this._sizes,
            activations: this._activations,
            layers: this.layers.map((l) => ({
                weights: l.weights.map((row) => [...row]),
                biases: [...l.biases],
            })),
        };
    }

    static fromJSON(data: any): PPONetwork {
        const net = new PPONetwork(data.sizes, data.activations);
        for (let l = 0; l < data.layers.length; l++) {
            const src = data.layers[l];
            const dst = net.layers[l];
            for (let i = 0; i < dst.outputSize; i++) {
                dst.biases[i] = src.biases[i];
                for (let j = 0; j < dst.inputSize; j++) {
                    dst.weights[i][j] = src.weights[i][j];
                }
            }
        }
        return net;
    }
}

/* ───────────────── PPO Brain (implements Brain) ───────────────── */

export class PPOBrain implements Brain {
    policyNet: PPONetwork;
    valueNet: PPONetwork;
    training: boolean;

    // Episode trajectory buffers
    states: number[][] = [];
    actions: number[] = [];
    logProbs: number[] = [];
    values: number[] = [];

    constructor(policyNet: PPONetwork, valueNet: PPONetwork, training = true) {
        this.policyNet = policyNet;
        this.valueNet = valueNet;
        this.training = training;
    }

    feedforward(inputs: number[]): number {
        const logits = this.policyNet.forward(inputs);
        const probs = softmax(logits);
        const value = this.valueNet.forward(inputs)[0];

        let action: number;
        if (this.training) {
            action = sampleCategorical(probs);
        } else {
            // Greedy (argmax) for inference
            action = probs[0] >= probs[1] ? 0 : 1;
        }

        const logProb = Math.log(Math.max(probs[action], 1e-8));

        if (this.training) {
            this.states.push([...inputs]);
            this.actions.push(action);
            this.logProbs.push(logProb);
            this.values.push(value);
        }

        return action;
    }

    reset(): void {
        this.states = [];
        this.actions = [];
        this.logProbs = [];
        this.values = [];
    }
}

/* ───────────────── Transition (internal) ───────────────── */

interface Transition {
    state: number[];
    action: number;
    oldLogProb: number;
    advantage: number;
    returnValue: number;
}

/* ───────────────── PPO Trainer ───────────────── */

/** Internal config with defaults filled in */
interface FullPPOConfig extends PPOConfig {
    gamma: number;
    lambda: number;
    epochs: number;
    minibatchSize: number;
    entropyCoeff: number;
    valueCoeff: number;
    maxGradNorm: number;
}

export class PPOTrainer {
    policyNet: PPONetwork;
    valueNet: PPONetwork;
    config: FullPPOConfig;
    private _step = 1;

    // Metrics from last update (readable by UI)
    lastPolicyLoss = 0;
    lastValueLoss = 0;
    lastEntropy = 0;

    constructor(config: PPOConfig) {
        this.config = {
            gamma: 0.99,
            lambda: 0.95,
            epochs: 4,
            minibatchSize: 64,
            entropyCoeff: 0.04,
            valueCoeff: 0.5,
            maxGradNorm: 0.5,
            ...config,
        };

        const input = config.inputSize;

        // Policy: input → 64 (relu) → 32 (relu) → 2 (linear, softmax applied externally)
        // Small output init scale → near-uniform initial policy (high exploration)
        this.policyNet = new PPONetwork(
            [input, 64, 32, 2],
            ["relu", "relu", "linear"],
            [undefined, undefined, 0.01],
        );

        // Value: input → 64 (relu) → 32 (relu) → 1 (linear)
        this.valueNet = new PPONetwork(
            [input, 64, 32, 1],
            ["relu", "relu", "linear"],
        );
    }

    /** Create N training agents that share the current policy & value networks */
    createAgents(): PPOBrain[] {
        const agents: PPOBrain[] = [];
        for (let i = 0; i < this.config.nAgents; i++) {
            agents.push(new PPOBrain(this.policyNet, this.valueNet, true));
        }
        return agents;
    }

    /** Create a single inference agent (greedy, no trajectory recording) */
    createInferenceAgent(): PPOBrain {
        return new PPOBrain(this.policyNet, this.valueNet, false);
    }

    /**
     * Run PPO update on collected trajectories.
     * Call after all agents finish an episode (all dinos dead).
     */
    update(brains: PPOBrain[]): void {
        const {
            gamma,
            lambda,
            epochs,
            minibatchSize,
            clipEpsilon,
            learningRate,
            entropyCoeff,
            valueCoeff,
            maxGradNorm,
        } = this.config;

        /* ── 1. Collect transitions from all agents ── */
        const transitions: Transition[] = [];

        for (const brain of brains) {
            const T = brain.states.length;
            if (T === 0) continue;

            // Shaped rewards from stored state data
            const rewards: number[] = new Array(T);
            for (let t = 0; t < T; t++) {
                const distToFirst = brain.states[t][0]; // normalized distance to first obstacle
                const isJumping = brain.states[t][4];   // 1 if dino is jumping, 0 if on ground
                const action = brain.actions[t];         // 0 = no-op, 1 = jump

                let r = 1.0; // base survival reward

                // Penalty for initiating a jump when obstacles are far away
                if (action === 1 && isJumping < 0.5 && distToFirst > 0.3) {
                    r -= 0.5;
                }

                // Bonus for surviving near an obstacle
                if (distToFirst < 0.15) {
                    r += 1.5;
                }

                rewards[t] = r;
            }

            // Death penalty on the terminal step
            rewards[T - 1] = -5.0;

            // GAE (Generalized Advantage Estimation)
            const advantages: number[] = new Array(T).fill(0);
            const returns: number[] = new Array(T).fill(0);

            let lastAdv = 0;
            for (let t = T - 1; t >= 0; t--) {
                const nextValue = t < T - 1 ? brain.values[t + 1] : 0; // terminal bootstrap = 0
                const nextNonTerminal = t < T - 1 ? 1 : 0;
                const delta = rewards[t] + gamma * nextValue * nextNonTerminal - brain.values[t];
                lastAdv = delta + gamma * lambda * nextNonTerminal * lastAdv;
                advantages[t] = lastAdv;
                returns[t] = advantages[t] + brain.values[t];
            }

            for (let t = 0; t < T; t++) {
                transitions.push({
                    state: brain.states[t],
                    action: brain.actions[t],
                    oldLogProb: brain.logProbs[t],
                    advantage: advantages[t],
                    returnValue: returns[t],
                });
            }
        }

        if (transitions.length === 0) return;

        /* ── 2. Normalize advantages ── */
        const mean = transitions.reduce((s, t) => s + t.advantage, 0) / transitions.length;
        const variance =
            transitions.reduce((s, t) => s + (t.advantage - mean) ** 2, 0) / transitions.length;
        const std = Math.sqrt(variance) + 1e-8;
        for (const t of transitions) {
            t.advantage = (t.advantage - mean) / std;
        }

        /* ── 3. PPO update epochs ── */
        let totalPolicyLoss = 0;
        let totalValueLoss = 0;
        let totalEntropy = 0;
        let nUpdates = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            shuffle(transitions);

            for (let start = 0; start < transitions.length; start += minibatchSize) {
                const batch = transitions.slice(start, start + minibatchSize);
                const batchLen = batch.length;

                this.policyNet.zeroGrad();
                this.valueNet.zeroGrad();

                let batchPolicyLoss = 0;
                let batchValueLoss = 0;
                let batchEntropy = 0;

                for (const trans of batch) {
                    // ── Forward passes ──
                    const logits = this.policyNet.forward(trans.state);
                    const probs = softmax(logits);
                    const newLogProb = Math.log(Math.max(probs[trans.action], 1e-8));
                    const newValue = this.valueNet.forward(trans.state)[0];

                    // ── Ratio & clipped objective ──
                    const ratio = Math.exp(newLogProb - trans.oldLogProb);
                    const surr1 = ratio * trans.advantage;
                    const clipped = Math.max(
                        Math.min(ratio, 1 + clipEpsilon),
                        1 - clipEpsilon,
                    );
                    const surr2 = clipped * trans.advantage;
                    const policyLoss = -Math.min(surr1, surr2);

                    // ── Entropy ──
                    const entropy = -probs.reduce(
                        (s, p) => s + p * Math.log(Math.max(p, 1e-8)),
                        0,
                    );

                    // ── Value loss (MSE) ──
                    const valueLoss = 0.5 * (newValue - trans.returnValue) ** 2;

                    batchPolicyLoss += policyLoss;
                    batchValueLoss += valueLoss;
                    batchEntropy += entropy;

                    // ── Policy gradient (d/d logits) ──
                    const policyGrad = new Array(probs.length).fill(0);
                    const nActions = probs.length;

                    // Gradient flows through surr1 when it's the binding (smaller) term
                    if (surr1 <= surr2) {
                        // d(-ratio * advantage) / d(logits_k) = -adv * ratio * (δ_{k,a} - p_k)
                        for (let k = 0; k < nActions; k++) {
                            const dLogProb = (k === trans.action ? 1 : 0) - probs[k];
                            policyGrad[k] += -trans.advantage * ratio * dLogProb;
                        }
                    }
                    // else: clipped → gradient = 0 (no policy update)

                    // Entropy bonus gradient: maximize entropy → minimize -entropy
                    // d(-entropy)/d(z_k) = p_k * (log(p_k) + H)
                    // Total contribution: -entropyCoeff * d(entropy)/d(z_k) = entropyCoeff * p_k * (log p_k + H)
                    for (let k = 0; k < nActions; k++) {
                        policyGrad[k] +=
                            entropyCoeff * probs[k] * (Math.log(Math.max(probs[k], 1e-8)) + entropy);
                    }

                    // Scale by 1 / batchSize
                    const scale = 1 / batchLen;
                    for (let k = 0; k < nActions; k++) {
                        policyGrad[k] *= scale;
                    }

                    this.policyNet.backward(policyGrad);

                    // ── Value gradient ──
                    // d(0.5 * (V - R)^2) / dV = (V - R)
                    const valueGrad = [(newValue - trans.returnValue) * valueCoeff * scale];
                    this.valueNet.backward(valueGrad);
                }

                // Gradient clipping
                this.policyNet.clipGradients(maxGradNorm);
                this.valueNet.clipGradients(maxGradNorm);

                // Adam step
                this.policyNet.adamStep(learningRate, this._step);
                this.valueNet.adamStep(learningRate, this._step);
                this._step++;

                nUpdates++;
                totalPolicyLoss += batchPolicyLoss / batchLen;
                totalValueLoss += batchValueLoss / batchLen;
                totalEntropy += batchEntropy / batchLen;
            }
        }

        // Store averaged metrics for UI
        if (nUpdates > 0) {
            this.lastPolicyLoss = totalPolicyLoss / nUpdates;
            this.lastValueLoss = totalValueLoss / nUpdates;
            this.lastEntropy = totalEntropy / nUpdates;
        }
    }

    /* ── Serialisation ── */

    toJSON(): object {
        return {
            policyNet: this.policyNet.toJSON(),
            valueNet: this.valueNet.toJSON(),
            step: this._step,
        };
    }

    static fromJSON(data: any, config: PPOConfig): PPOTrainer {
        const trainer = new PPOTrainer(config);
        trainer.policyNet = PPONetwork.fromJSON(data.policyNet);
        trainer.valueNet = PPONetwork.fromJSON(data.valueNet);
        trainer._step = data.step || 1;
        return trainer;
    }
}
