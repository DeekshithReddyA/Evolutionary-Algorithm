# Chrome Dino — Genetic Algorithm Milestones

---

## High-Level Design (HLD)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           GAME ENGINE                              │
│  ┌───────────┐   ┌────────────┐   ┌──────────┐   ┌────────────┐   │
│  │  Renderer  │   │  Physics   │   │ Collision │   │  Scoring   │   │
│  └───────────┘   └────────────┘   └──────────┘   └────────────┘   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │  game state (inputs)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI LAYER (Strategy)                         │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    AIFactory (Factory)                       │   │
│   │         creates the correct AI based on mode                │   │
│   └──────┬──────────────────┬───────────────────┬───────────────┘   │
│          ▼                  ▼                   ▼                   │
│   ┌─────────────┐   ┌─────────────┐    ┌──────────────┐           │
│   │  UserInput   │   │  GA + NN    │    │    NEAT      │           │
│   │ (keyboard)   │   │ (Milestone  │    │ (Milestone   │           │
│   │              │   │   2, 3, 4)  │    │    5, 6)     │           │
│   └─────────────┘   └──────┬──────┘    └──────┬───────┘           │
│                             │                  │                    │
│                             ▼                  ▼                    │
│                    ┌──────────────────────────────────┐             │
│                    │     Neural Network (Brain)       │             │
│                    │   Inputs → Hidden → Outputs      │             │
│                    └──────────────────────────────────┘             │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              GeneticAlgorithm (Orchestrator)                │   │
│   │  Population → Evaluate → Select → Crossover → Mutate       │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Decisions

| Concern | Pattern | Why |
|---|---|---|
| AI mode selection | **Factory** (`AIFactory`) | Decouple game loop from AI implementation; swap modes at runtime |
| AI behaviour contract | **Strategy** (`AI` interface) | Every AI mode exposes the same `decide(inputs)` method; game doesn't care which |
| Shared NN utilities | **Template Method** inside `GeneticAlgorithm` | GA and NEAT share selection/mutation skeleton but differ in crossover & topology |
| Single game loop controlling many dinos | **Observer / Mediator** | `Population` mediator tells each `Agent` to act; game observes alive count |
| Serialisation of best brain | **Memento** | Save/restore the best NN weights as JSON snapshots |

### Data Flow (one frame)

```
1.  Game collects sensor inputs for each alive agent:
      • distanceToNextObstacle
      • obstacleWidth
      • obstacleHeight
      • currentSpeed
      • dinoY (vertical position)

2.  Each Agent.brain.feedForward(inputs) → [jumpScore, duckScore, nothingScore]

3.  Agent picks argmax → Dino.jump() / Dino.duck() / no-op

4.  Game advances physics, checks collisions, marks dead agents

5.  When all agents dead → generation ends:
      a. Assign fitness = score (or time survived)
      b. GeneticAlgorithm.evolve(population) → next generation
      c. Reset game, spawn new dinos, repeat
```

---

## Low-Level Design (LLD)

### Core Interfaces & Classes

```
AI (interface)
├── decide(inputs: number[]): Action
├── reset(): void
└── clone(): AI

NeuralNetwork
├── layers: number[]            // e.g. [5, 6, 3]
├── weights: number[][][]
├── biases: number[][]
├── feedForward(inputs: number[]): number[]
├── clone(): NeuralNetwork
├── mutate(rate: number): void
├── toJSON(): object
└── static fromJSON(json: object): NeuralNetwork

Agent
├── dino: Dino
├── brain: NeuralNetwork
├── fitness: number
├── alive: boolean
├── decide(inputs: number[]): Action
└── reset(): void

Population
├── agents: Agent[]
├── generation: number
├── bestFitness: number
├── bestBrain: NeuralNetwork | null
└── getAliveCount(): number

GeneticAlgorithm
├── populationSize: number
├── mutationRate: number
├── elitismCount: number
├── createInitialPopulation(): Population
├── evolve(pop: Population): Population
├── selection(pop: Population): Agent[]        // tournament / roulette
├── crossover(a: NN, b: NN): NN               // single-point / uniform
├── mutate(nn: NN): void
└── getBest(pop: Population): Agent

AIFactory
├── static create(mode: string): AI
│     "user"   → UserInputAI
│     "neural" → GeneticAlgorithmAI (GA + NN)
│     "neat"   → NEATAI
│     "rl"     → placeholder

UserInputAI implements AI
├── decide(): Action   // reads keyboard state

GeneticAlgorithmAI implements AI
├── ga: GeneticAlgorithm
├── population: Population
├── decide(inputs): Action          // delegates to current agent
├── onAgentDied(agent): void
├── onGenerationEnd(): Population   // triggers evolve
└── reset(): void

NEATAI implements AI
├── (extends GA concepts with topology mutation)
├── genome: Genome
├── species: Species[]
└── ...
```

### NeuralNetwork Internals

```
Architecture:  5 inputs → 6 hidden (ReLU) → 3 outputs (softmax)

Inputs (normalised 0-1):
  [0] distToObstacle / GROUND_X_END
  [1] obstacleWidth  / 50
  [2] obstacleHeight / 50
  [3] speed          / OBSTACLE_MAX_SPEED
  [4] dinoY          / GROUND_Y

Outputs:
  [0] jump
  [1] duck      (future — can ignore initially)
  [2] nothing

Action = argmax(outputs)
```

### Genetic Algorithm Flow

```
          ┌──────────────────────────┐
          │  Initialise Population   │
          │  (random NN weights)     │
          └────────────┬─────────────┘
                       ▼
          ┌──────────────────────────┐
    ┌────►│   Run Game Simulation    │◄──── each agent plays
    │     │   until all agents die   │      simultaneously
    │     └────────────┬─────────────┘
    │                  ▼
    │     ┌──────────────────────────┐
    │     │   Calculate Fitness      │
    │     │   fitness = score        │
    │     └────────────┬─────────────┘
    │                  ▼
    │     ┌──────────────────────────┐
    │     │   Selection              │
    │     │   (tournament k=3)       │
    │     └────────────┬─────────────┘
    │                  ▼
    │     ┌──────────────────────────┐
    │     │   Crossover              │
    │     │   (uniform crossover)    │
    │     └────────────┬─────────────┘
    │                  ▼
    │     ┌──────────────────────────┐
    │     │   Mutation               │
    │     │   (gaussian noise, 10%)  │
    │     └────────────┬─────────────┘
    │                  ▼
    │     ┌──────────────────────────┐
    │     │   Elitism                │
    │     │   (top 2 pass through)  │
    │     └────────────┬─────────────┘
    │                  │
    └──────────────────┘  next generation
```

### File Structure (Target)

```
chrome-dino/
├── index.html
├── style.css
├── game.ts              # Game, Dino, Obstacle (rendering + physics)
├── brain.ts             # AI interface, AIFactory, UserInputAI
├── nn.ts                # NeuralNetwork class (feedforward, mutate, clone, serialise)
├── ga.ts                # GeneticAlgorithm, Population, Agent
├── neat.ts              # NEAT-specific: Genome, Gene, Species, NEATAlgorithm
├── types.ts             # shared types/enums: Action, GameInputs, Config constants
├── utils.ts             # math helpers: gaussian, argmax, normalize
└── milestones.md
```

---

## Milestones (Incremental, Learning-Oriented)

---

### Milestone 1 — Foundations: Types, Utilities & Refactor Game for Multi-Agent

**Goal:** Set up shared types and refactor the game so it can support *N* dinos running simultaneously (required for GA).

**Tasks:**
- [ ] Create `types.ts` — define `Action` enum (`JUMP | DUCK | NOTHING`), `GameInputs` interface, config constants
- [ ] Create `utils.ts` — `argmax()`, `normalize()`, `gaussianRandom()`
- [ ] Refactor `Dino` so each instance is independent (no singleton assumptions)
- [ ] Refactor `Game` to hold an array of `Dino[]` instead of a single `Dino`
- [ ] Game loop iterates over all dinos: update, draw, collision-check each
- [ ] Add `alive: boolean` to `Dino`; skip dead dinos in update/draw
- [ ] Extract `getInputsForDino(dino, obstacles, speed): GameInputs` helper in game
- [ ] User mode still works exactly as before (single dino, keyboard)

**Learn:**
- How to structure shared types in TS
- Preparing a game loop for multi-agent simulation

---

### Milestone 2 — Neural Network from Scratch

**Goal:** Implement a fully-connected feedforward neural network class that can be used as a "brain" for each dino.

**Tasks:**
- [ ] Create `nn.ts` with class `NeuralNetwork`
- [ ] Constructor takes layer sizes: `new NeuralNetwork([5, 6, 3])`
- [ ] Initialise weights with random values in [-1, 1]
- [ ] Implement `feedForward(inputs: number[]): number[]`
  - Hidden layers: ReLU activation
  - Output layer: softmax (or just raw, use argmax)
- [ ] Implement `clone(): NeuralNetwork` — deep copy weights & biases
- [ ] Implement `mutate(rate: number, strength: number): void` — add gaussian noise to each weight with probability `rate`
- [ ] Implement `toJSON()` and `static fromJSON()` for serialisation
- [ ] **Unit-test**: create a NN, feed dummy inputs, verify output shape is `[3]`

**Learn:**
- How a feedforward NN works (forward pass, activations)
- Matrix operations without a library
- Why we need clone & mutate for GA later

---

### Milestone 3 — Genetic Algorithm Core

**Goal:** Implement the GA loop: population → fitness → selection → crossover → mutation → next gen.

**Tasks:**
- [ ] Create `ga.ts`
- [ ] Define `Agent { dino, brain: NeuralNetwork, fitness, alive }`
- [ ] Define `Population { agents[], generation, bestFitness, bestBrain }`
- [ ] Implement `GeneticAlgorithm` class:
  - `createInitialPopulation(size): Population` — random NNs
  - `calculateFitness(agent)` — simply `agent.fitness = agent.dino.score` (or time alive)
  - `selection(pop): Agent[]` — **tournament selection** (pick k=3 random, return fittest)
  - `crossover(parentA: NN, parentB: NN): NN` — **uniform crossover** (for each weight, 50/50 from A or B)
  - `mutate(nn: NN)` — delegates to `nn.mutate(rate, strength)`
  - `evolve(pop): Population` — full pipeline: rank → elitism → select+crossover+mutate → new pop
- [ ] Elitism: top N agents pass to next generation unchanged
- [ ] **Unit-test**: create population of 10, run evolve, verify new pop size is same, generation incremented

**Learn:**
- Core GA concepts: selection pressure, crossover, mutation, elitism
- Tournament vs roulette selection trade-offs
- Why elitism prevents losing the best solution

---

### Milestone 4 — Integration: GA + NN Playing the Game

**Goal:** Wire GA into the game loop. See 50+ dinos running, dying, evolving, and gradually getting better.

**Tasks:**
- [ ] Implement `AI` interface in `brain.ts`: `decide(inputs: GameInputs): Action`
- [ ] Implement `UserInputAI` (wraps keyboard state, returns Action)
- [ ] Implement `GeneticAlgorithmAI` that holds `GeneticAlgorithm` + `Population`
  - On game start: creates initial population, spawns N dinos
  - Each frame: for each alive agent, calls `brain.feedForward(inputs)` → action
  - When agent collides: mark dead, record fitness
  - When all dead: call `ga.evolve()`, reset game, spawn new gen
- [ ] Update `AIFactory` to return correct AI based on mode string
- [ ] `Game` class changes:
  - Accept an `AI` from the factory
  - In user mode: single dino, keyboard
  - In neural mode: N dinos, AI-controlled, auto-restart generations
- [ ] Add HUD overlay: generation #, alive count, best fitness
- [ ] Draw all dinos (use transparency for dead ones or hide them)
- [ ] **Test**: run GA mode, watch dinos improve over 10+ generations

**Learn:**
- Strategy pattern: game loop doesn't know/care which AI is running
- Factory pattern: one line to switch AI modes
- Observing emergent behaviour from random → trained

---

### Milestone 5 — Save/Load Best Brain & Analytics

**Goal:** Persist the best neural network and display training analytics.

**Tasks:**
- [ ] After each generation, if new best → save to `localStorage` as JSON
- [ ] "Load Best" button: loads saved NN, plays with single dino in inference mode
- [ ] Display analytics panel:
  - Fitness over generations (line chart — use simple canvas drawing or a tiny lib)
  - Current generation, mutation rate, population size
  - Best score ever
- [ ] Allow user to **intervene during inference**: press a key to override AI decision
- [ ] Export/import brain as `.json` file download

**Learn:**
- Memento pattern for save/restore
- Importance of persistence in evolutionary training
- How to visualise training progress

---

### Milestone 6 — NEAT (NeuroEvolution of Augmenting Topologies)

**Goal:** Implement NEAT — the network topology itself evolves, not just the weights.

**Tasks:**
- [ ] Create `neat.ts`
- [ ] Define `Gene { inNode, outNode, weight, enabled, innovation }`
- [ ] Define `Genome { genes: Gene[], nodes: NodeGene[], fitness }`
- [ ] Global innovation counter (tracks structural mutations across population)
- [ ] Implement mutations:
  - **Weight mutation** — perturb existing weights
  - **Add connection** — new gene between two unconnected nodes
  - **Add node** — split an existing connection, insert a node
- [ ] Implement **crossover**: align genes by innovation number, inherit from fitter parent
- [ ] Implement **speciation**: group genomes by compatibility distance
  - δ = c1·E/N + c2·D/N + c3·W̄
  - Genomes in same species compete only with each other
- [ ] Implement **adjusted fitness**: fitness / species_size (prevents one species dominating)
- [ ] Implement feedforward for arbitrary topology (topological sort of nodes)
- [ ] Integrate as `NEATAI implements AI` via the same factory
- [ ] **Test**: run NEAT mode, compare learning speed vs fixed-topology GA

**Learn:**
- Why topology matters (NEAT paper concepts)
- Innovation numbers for meaningful crossover
- Speciation to protect innovation
- Difference between fixed-topology GA and topology-evolving NEAT

---

### Milestone 7 — Polish, Comparison & Documentation

**Goal:** Clean up, compare all modes, and document findings.

**Tasks:**
- [ ] Side-by-side comparison mode: GA vs NEAT running simultaneously
- [ ] Record and display: generations to solve, best fitness curve, avg fitness
- [ ] Tune hyperparameters: population size, mutation rate, elitism %, crossover strategy
- [ ] Add `duck` mechanic to Dino (crouch under flying obstacles) — extends input/output space
- [ ] Write `README.md` with architecture diagram, usage, and results
- [ ] (Optional) Add RL placeholder that can be implemented later

**Learn:**
- Hyperparameter tuning in evolutionary algorithms
- Empirical comparison of GA vs NEAT
- Scientific documentation of experiments

---

## Design Patterns Summary

| Pattern | Where | Purpose |
|---|---|---|
| **Factory** | `AIFactory.create(mode)` | Instantiate correct AI without `if/else` in game |
| **Strategy** | `AI.decide(inputs)` | Game loop is agnostic to AI implementation |
| **Template Method** | `GeneticAlgorithm.evolve()` | GA & NEAT share evolve skeleton, override selection/crossover |
| **Observer** | Game notifies AI when agent dies | Loose coupling between game events and AI logic |
| **Memento** | `NeuralNetwork.toJSON/fromJSON` | Save/restore brain state |
| **Mediator** | `Population` coordinates agents | Centralises agent lifecycle management |

---

## Quick Reference: Hyperparameters to Start With

| Parameter | Value | Notes |
|---|---|---|
| Population size | 50 | Visible on screen; bump to 200 if needed |
| NN architecture | [5, 6, 3] | 5 inputs, 6 hidden, 3 outputs |
| Mutation rate | 0.1 (10%) | Probability each weight is mutated |
| Mutation strength | 0.5 | Std dev of gaussian noise |
| Elitism | 2 | Top 2 pass unchanged |
| Tournament size | 3 | For tournament selection |
| Crossover | Uniform | 50/50 per weight from each parent |
| Max generations | ∞ | Stop manually or when fitness plateaus |

---

*Start with Milestone 1. Each milestone builds on the previous. Do not skip ahead.*
