import { Brain, NEATConfig } from "./types";

/* ───────────────── Innovation Tracker ───────────────── */

export class InnovationTracker {
    private counter = 0;
    private history = new Map<string, number>();

    getInnovation(from: number, to: number): number {
        const key = `${from}:${to}`;
        const existing = this.history.get(key);
        if (existing !== undefined) return existing;
        this.counter++;
        this.history.set(key, this.counter);
        return this.counter;
    }

    get current() { return this.counter; }
}

/* ───────────────── Gene Types ───────────────── */

export interface NodeGene {
    id: number;
    type: "input" | "hidden" | "output";
    layer: number; // float – used for feed-forward ordering
}

export interface ConnectionGene {
    innovation: number;
    from: number;
    to: number;
    weight: number;
    enabled: boolean;
}

/* ───────────────── Genome ───────────────── */

export class Genome implements Brain {
    nodes: NodeGene[];
    connections: ConnectionGene[];
    fitness = 0;
    inputSize: number;
    outputSize: number;
    nextNodeId: number;

    constructor(
        inputSize: number,
        outputSize: number,
        tracker: InnovationTracker,
        init = true,
    ) {
        this.inputSize = inputSize;
        this.outputSize = outputSize;
        this.nodes = [];
        this.connections = [];

        if (init) {
            // Input nodes (layer 0)
            for (let i = 0; i < inputSize; i++) {
                this.nodes.push({ id: i, type: "input", layer: 0 });
            }
            // Output nodes (layer 1)
            for (let i = 0; i < outputSize; i++) {
                this.nodes.push({ id: inputSize + i, type: "output", layer: 1 });
            }
            this.nextNodeId = inputSize + outputSize;

            // Fully connect inputs → outputs with small random weights
            for (let i = 0; i < inputSize; i++) {
                for (let j = 0; j < outputSize; j++) {
                    this.connections.push({
                        innovation: tracker.getInnovation(i, inputSize + j),
                        from: i,
                        to: inputSize + j,
                        weight: (Math.random() * 2 - 1) * 0.5,
                        enabled: true,
                    });
                }
            }
        } else {
            this.nextNodeId = inputSize + outputSize;
        }
    }

    /* ── Feed-forward ── */

    feedforward(inputs: number[]): number {
        const values = new Map<number, number>();

        // Set input values
        for (let i = 0; i < this.inputSize; i++) {
            values.set(i, inputs[i]);
        }

        // Process nodes in layer order (ascending)
        const sorted = [...this.nodes].sort((a, b) => a.layer - b.layer);

        for (const node of sorted) {
            if (node.type === "input") continue;

            let sum = 0;
            for (const conn of this.connections) {
                if (conn.to === node.id && conn.enabled) {
                    sum += (values.get(conn.from) ?? 0) * conn.weight;
                }
            }

            // ReLU for hidden, linear for output
            values.set(node.id, node.type === "hidden" ? Math.max(0, sum) : sum);
        }

        // Argmax over output nodes
        let maxVal = -Infinity;
        let maxIdx = 0;
        for (let i = 0; i < this.outputSize; i++) {
            const v = values.get(this.inputSize + i) ?? 0;
            if (v > maxVal) { maxVal = v; maxIdx = i; }
        }
        return maxIdx;
    }

    /* ── Mutations ── */

    mutateAddNode(tracker: InnovationTracker): void {
        const enabled = this.connections.filter(c => c.enabled);
        if (enabled.length === 0) return;

        const conn = enabled[Math.floor(Math.random() * enabled.length)];
        conn.enabled = false;

        const fromNode = this.nodes.find(n => n.id === conn.from)!;
        const toNode = this.nodes.find(n => n.id === conn.to)!;

        const newId = this.nextNodeId++;
        const newLayer = (fromNode.layer + toNode.layer) / 2;

        this.nodes.push({ id: newId, type: "hidden", layer: newLayer });

        // Old-source → new (weight 1 to preserve signal)
        this.connections.push({
            innovation: tracker.getInnovation(conn.from, newId),
            from: conn.from,
            to: newId,
            weight: 1.0,
            enabled: true,
        });

        // New → old-target (original weight to preserve signal)
        this.connections.push({
            innovation: tracker.getInnovation(newId, conn.to),
            from: newId,
            to: conn.to,
            weight: conn.weight,
            enabled: true,
        });
    }

    mutateAddConnection(tracker: InnovationTracker): void {
        for (let attempt = 0; attempt < 30; attempt++) {
            const from = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            const to = this.nodes[Math.floor(Math.random() * this.nodes.length)];

            if (from.id === to.id) continue;
            if (from.layer >= to.layer) continue; // feedforward only
            if (this.connections.some(c => c.from === from.id && c.to === to.id)) continue;

            this.connections.push({
                innovation: tracker.getInnovation(from.id, to.id),
                from: from.id,
                to: to.id,
                weight: (Math.random() * 2 - 1),
                enabled: true,
            });
            return;
        }
    }

    mutateWeights(rate: number, strength: number): void {
        for (const conn of this.connections) {
            if (Math.random() < rate) {
                if (Math.random() < 0.1) {
                    conn.weight = (Math.random() * 2 - 1); // full reset
                } else {
                    conn.weight += (Math.random() * 2 - 1) * strength; // perturb
                }
            }
        }
    }

    mutateToggle(): void {
        if (this.connections.length === 0) return;
        const conn = this.connections[Math.floor(Math.random() * this.connections.length)];
        conn.enabled = !conn.enabled;
    }

    /* ── Clone ── */

    clone(tracker: InnovationTracker): Genome {
        const g = new Genome(this.inputSize, this.outputSize, tracker, false);
        g.nodes = this.nodes.map(n => ({ ...n }));
        g.connections = this.connections.map(c => ({ ...c }));
        g.nextNodeId = this.nextNodeId;
        g.fitness = 0;
        return g;
    }

    /* ── Crossover (better × worse) ── */

    static crossover(better: Genome, worse: Genome, tracker: InnovationTracker): Genome {
        const child = new Genome(better.inputSize, better.outputSize, tracker, false);
        child.nextNodeId = Math.max(better.nextNodeId, worse.nextNodeId);

        const worseMap = new Map<number, ConnectionGene>();
        for (const c of worse.connections) worseMap.set(c.innovation, c);

        for (const bc of better.connections) {
            const wc = worseMap.get(bc.innovation);
            if (wc) {
                // Matching gene – pick randomly
                const chosen = Math.random() < 0.5 ? { ...bc } : { ...wc };
                // Re-enable chance
                if (!bc.enabled || !wc.enabled) {
                    if (Math.random() < 0.25) chosen.enabled = true;
                }
                child.connections.push(chosen);
            } else {
                // Disjoint/excess from fitter parent
                child.connections.push({ ...bc });
            }
        }

        // Gather required node IDs
        const nodeIds = new Set<number>();
        for (const c of child.connections) { nodeIds.add(c.from); nodeIds.add(c.to); }
        // Always include all input & output nodes
        for (const n of better.nodes) {
            if (n.type === "input" || n.type === "output") nodeIds.add(n.id);
        }

        const betterNodes = new Map(better.nodes.map(n => [n.id, n]));
        const worseNodes = new Map(worse.nodes.map(n => [n.id, n]));

        for (const id of nodeIds) {
            const node = betterNodes.get(id) ?? worseNodes.get(id);
            if (node) child.nodes.push({ ...node });
        }

        return child;
    }

    /* ── Compatibility distance ── */

    static compatibilityDistance(
        g1: Genome,
        g2: Genome,
        c1: number,
        c2: number,
        c3: number,
    ): number {
        const map1 = new Map<number, ConnectionGene>();
        const map2 = new Map<number, ConnectionGene>();
        for (const c of g1.connections) map1.set(c.innovation, c);
        for (const c of g2.connections) map2.set(c.innovation, c);

        const max1 = g1.connections.length > 0 ? Math.max(...g1.connections.map(c => c.innovation)) : 0;
        const max2 = g2.connections.length > 0 ? Math.max(...g2.connections.map(c => c.innovation)) : 0;
        const boundary = Math.min(max1, max2);

        let excess = 0;
        let disjoint = 0;
        let weightSum = 0;
        let matching = 0;

        const all = new Set([...map1.keys(), ...map2.keys()]);

        for (const innov of all) {
            const in1 = map1.has(innov);
            const in2 = map2.has(innov);

            if (in1 && in2) {
                matching++;
                weightSum += Math.abs(map1.get(innov)!.weight - map2.get(innov)!.weight);
            } else if (innov > boundary) {
                excess++;
            } else {
                disjoint++;
            }
        }

        const N = Math.max(g1.connections.length, g2.connections.length, 1);
        const avgW = matching > 0 ? weightSum / matching : 0;

        return (c1 * excess) / N + (c2 * disjoint) / N + c3 * avgW;
    }

    /* ── Serialisation ── */

    toJSON(): object {
        return {
            inputSize: this.inputSize,
            outputSize: this.outputSize,
            nextNodeId: this.nextNodeId,
            nodes: this.nodes,
            connections: this.connections,
        };
    }

    static fromJSON(data: any, tracker: InnovationTracker): Genome {
        const g = new Genome(data.inputSize, data.outputSize, tracker, false);
        g.nodes = data.nodes.map((n: any) => ({ ...n }));
        g.connections = data.connections.map((c: any) => ({ ...c }));
        g.nextNodeId = data.nextNodeId;
        // Rebuild innovation history so future mutations stay consistent
        for (const c of g.connections) {
            tracker.getInnovation(c.from, c.to);
        }
        return g;
    }
}

/* ───────────────── Species ───────────────── */

export class Species {
    members: Genome[] = [];
    representative: Genome;
    bestFitness = 0;
    staleness = 0;
    adjustedFitnessSum = 0;

    constructor(representative: Genome) {
        this.representative = representative;
        this.members = [representative];
    }

    adjustFitness(): void {
        const size = this.members.length;
        this.adjustedFitnessSum = 0;
        for (const g of this.members) {
            g.fitness = g.fitness / size; // fitness sharing
            this.adjustedFitnessSum += g.fitness;
        }
    }
}

/* ───────────────── NEAT Population ───────────────── */

export class NEATPopulation {
    genomes: Genome[];
    species: Species[] = [];
    generation = 0;
    config: NEATConfig;
    tracker: InnovationTracker;

    constructor(config: NEATConfig) {
        this.config = config;
        this.tracker = new InnovationTracker();
        this.genomes = [];

        for (let i = 0; i < config.populationSize; i++) {
            const g = new Genome(config.inputSize, config.outputSize, this.tracker);
            g.mutateWeights(1.0, 0.5); // initial weight diversity
            this.genomes.push(g);
        }
    }

    /* ── Speciation ── */

    private speciate(): void {
        // Clear members (keep representatives)
        for (const s of this.species) s.members = [];

        for (const genome of this.genomes) {
            let placed = false;
            for (const species of this.species) {
                const dist = Genome.compatibilityDistance(
                    genome,
                    species.representative,
                    this.config.c1,
                    this.config.c2,
                    this.config.c3,
                );
                if (dist < this.config.compatibilityThreshold) {
                    species.members.push(genome);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                this.species.push(new Species(genome));
            }
        }

        // Prune empty species
        this.species = this.species.filter(s => s.members.length > 0);

        // Update representatives
        for (const s of this.species) {
            s.representative = s.members[Math.floor(Math.random() * s.members.length)];
        }
    }

    /* ── Evolve ── */

    evolve(fitnesses: number[]): Genome[] {
        // 1. Assign raw fitnesses
        for (let i = 0; i < this.genomes.length; i++) {
            this.genomes[i].fitness = fitnesses[i];
        }

        // 2. Speciate
        this.speciate();

        // 3. Staleness & adjusted fitness
        for (const s of this.species) {
            const best = Math.max(...s.members.map(g => g.fitness));
            if (best > s.bestFitness) {
                s.bestFitness = best;
                s.staleness = 0;
            } else {
                s.staleness++;
            }
            s.adjustFitness();
        }

        // Remove very stale species (keep at least 1)
        if (this.species.length > 1) {
            this.species = this.species.filter(s => s.staleness < 20);
            if (this.species.length === 0) {
                // Shouldn't happen, but safeguard
                this.species.push(new Species(this.genomes[0]));
            }
        }

        // 4. Calculate offspring allocation
        const totalAdj = this.species.reduce((s, sp) => s + sp.adjustedFitnessSum, 0);
        const nextGen: Genome[] = [];

        for (const species of this.species) {
            // Sort best-first
            species.members.sort((a, b) => b.fitness - a.fitness);

            let nOffspring: number;
            if (totalAdj > 0) {
                nOffspring = Math.max(
                    1,
                    Math.floor((species.adjustedFitnessSum / totalAdj) * this.config.populationSize),
                );
            } else {
                nOffspring = Math.max(1, Math.floor(this.config.populationSize / this.species.length));
            }

            // Elitism: keep champion
            nextGen.push(species.members[0].clone(this.tracker));
            nOffspring--;

            // Parents = top survivors
            const nSurvivors = Math.max(1, Math.ceil(species.members.length * this.config.survivalRate));
            const parents = species.members.slice(0, nSurvivors);

            for (let i = 0; i < nOffspring; i++) {
                let child: Genome;

                if (parents.length === 1 || Math.random() < 0.25) {
                    child = parents[Math.floor(Math.random() * parents.length)].clone(this.tracker);
                } else {
                    const p1 = parents[Math.floor(Math.random() * parents.length)];
                    const p2 = parents[Math.floor(Math.random() * parents.length)];
                    child =
                        p1.fitness >= p2.fitness
                            ? Genome.crossover(p1, p2, this.tracker)
                            : Genome.crossover(p2, p1, this.tracker);
                }

                // Mutate
                child.mutateWeights(this.config.weightMutationRate, 0.2);
                if (Math.random() < this.config.addNodeRate) child.mutateAddNode(this.tracker);
                if (Math.random() < this.config.addConnectionRate) child.mutateAddConnection(this.tracker);

                nextGen.push(child);
            }
        }

        // Fill / trim to exact population size
        while (nextGen.length < this.config.populationSize) {
            const sp = this.species[Math.floor(Math.random() * this.species.length)];
            const parent = sp.members[Math.floor(Math.random() * sp.members.length)];
            const child = parent.clone(this.tracker);
            child.mutateWeights(this.config.weightMutationRate, 0.2);
            nextGen.push(child);
        }
        while (nextGen.length > this.config.populationSize) nextGen.pop();

        this.genomes = nextGen;
        this.generation++;
        return this.genomes;
    }

    /* ── Helpers ── */

    getBest(): Genome {
        let best = this.genomes[0];
        for (const g of this.genomes) {
            if (g.fitness > best.fitness) best = g;
        }
        return best;
    }
}
