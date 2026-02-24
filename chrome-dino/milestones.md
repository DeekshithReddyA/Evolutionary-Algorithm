# Genetic Algorithm for Chrome Dino — Milestones

## Milestone 1: Extract Constants & Refactor Game Structure
**Goal:** Clean up the codebase so it's ready for multi-agent support.

- [ ] Create `constants.ts` — move all `const` values from `game.ts` into it
- [ ] Import constants back into `game.ts`, verify game still works
- [ ] Add new GA constants to `constants.ts`:
  ```
  POPULATION_SIZE = 50
  MUTATION_RATE = 0.1
  ELITISM_COUNT = 5
  TOURNAMENT_SIZE = 3
  JUMP_THRESHOLD = 0.5
  INPUT_COUNT = 5
  ```
- [ ] Verify: game runs exactly as before (no behavior change)

**What you'll learn:** Module organization, ES module imports/exports in TypeScript.

---

## Milestone 2: Build the Neural Network (the "Brain")
**Goal:** Create a simple feed-forward neural network that takes inputs and outputs a decision.

- [ ] Create `neural-network.ts`
- [ ] Implement `NeuralNetwork` class with:
  - `weights: number[]` — flat array (5 inputs × 1 output + 1 bias = 6 weights)
  - `constructor(weights?: number[])` — random init if no weights given
  - `predict(inputs: number[]): number` — weighted sum → sigmoid → output
  - `clone(): NeuralNetwork` — deep copy
- [ ] Write a quick manual test: create a NN, feed it 5 random numbers, log the output
- [ ] Verify: output is always between 0 and 1 (sigmoid works)

**What you'll learn:** How neural networks make decisions, sigmoid activation, weighted sums.

**Key concept — sigmoid function:**
```
sigmoid(x) = 1 / (1 + e^(-x))
```
Maps any number to a value between 0 and 1 — perfect for a "jump or not" decision.

---

## Milestone 3: Create the Agent (AI-Controlled Dino)
**Goal:** Wrap a `Dino` + `NeuralNetwork` into an `Agent` that can think for itself.

- [ ] Create `agent.ts`
- [ ] Implement `Agent` class with:
  - `dino: Dino`
  - `brain: NeuralNetwork`
  - `alive: boolean`
  - `fitness: number`
- [ ] Implement `think(nextObstacle, speed)`:
  - Build normalized input array:
    - `distanceX = (obstacle.x - dino.x) / GROUND_X_END`
    - `obstacleHeight = obstacle.height / 50`
    - `obstacleWidth = obstacle.width / 50`
    - `currentSpeed = speed / OBSTACLE_MAX_SPEED`
    - `dinoY = dino.y / GROUND_Y`
  - Call `brain.predict(inputs)`
  - If output > 0.5 → `dino.jump()`
- [ ] Test: create one Agent, run it in the game loop instead of manual dino
- [ ] Verify: the agent makes random (but automatic) jump decisions

**What you'll learn:** Feature normalization (why 0–1 range matters), connecting a NN to game logic.

---

## Milestone 4: Run a Population of Agents
**Goal:** Run N agents simultaneously in the same game world.

- [ ] Modify `Game` class:
  - Replace `dino: Dino` with `agents: Agent[]`
  - Add `aliveCount: number`
  - Initialize 50 agents with random brains
- [ ] Modify `_loop()`:
  - Find the **next obstacle** (closest one ahead of dinos)
  - For each alive agent:
    - Call `agent.think(nextObstacle, speed)`
    - Call `agent.dino.update()`
    - Check collision → if hit: mark `agent.alive = false`, store `agent.fitness = score`
    - Draw agent (use transparency for dead agents)
  - If all dead → stop round
- [ ] Remove manual keyboard jump (keep Space for restart or fast-forward)
- [ ] Update UI: show alive count
- [ ] Verify: 50 dinos run simultaneously, most die quickly, a few survive longer

**What you'll learn:** Parallel simulation, managing entity state, why random brains mostly fail.

---

## Milestone 5: Implement Fitness Evaluation
**Goal:** Score each agent so we know who performed best.

- [ ] When an agent dies, set `agent.fitness = this.score` (current game score)
- [ ] At end of round, sort agents by fitness (descending)
- [ ] Display in UI:
  - Best fitness this generation
  - Generation number
- [ ] Log top 5 agent fitnesses to console
- [ ] Verify: agents that survive longer consistently have higher fitness

**What you'll learn:** Fitness functions — the core signal that drives evolution.

---

## Milestone 6: Selection — Picking the Best Parents
**Goal:** Implement tournament selection to choose which agents reproduce.

- [ ] Create `genetic-algorithm.ts`
- [ ] Implement `GeneticAlgorithm` class with:
  - `populationSize`, `mutationRate`, `elitismCount`, `generation`
  - `agents: Agent[]`
- [ ] Implement `tournamentSelect(agents, k=3): Agent`:
  - Pick `k` random agents
  - Return the one with highest fitness
- [ ] Test: run selection on a mock population, verify it favors higher-fitness agents
- [ ] Verify: selected parents are consistently among the better performers

**What you'll learn:** Selection pressure — how evolution "chooses" good genes without being greedy.

**Why tournament > roulette?** Tournament selection works well even when fitness values have very different scales. It's simple and effective.

---

## Milestone 7: Crossover — Combining Parent Brains
**Goal:** Mix two parent neural networks to create a child.

- [ ] Add `crossover(partner: NeuralNetwork): NeuralNetwork` to `NeuralNetwork`:
  - Pick a random split point in the weights array
  - Child gets `weights[0..split]` from parent1, `weights[split+1..end]` from parent2
- [ ] Add to `GeneticAlgorithm`:
  - Select two parents via tournament
  - Create child via crossover
- [ ] Test: cross two known weight arrays, verify child has parts of both
- [ ] Verify: child weights are a mix of both parents

**What you'll learn:** Genetic crossover — how two good solutions combine to (hopefully) make a better one.

---

## Milestone 8: Mutation — Adding Randomness
**Goal:** Slightly alter child brains to explore new strategies.

- [ ] Add `mutate(rate: number): void` to `NeuralNetwork`:
  - For each weight: if `Math.random() < rate` → add small gaussian noise
  - Gaussian noise: `Math.random() * 2 - 1` (simple) or Box-Muller transform (better)
- [ ] Apply mutation to all children after crossover
- [ ] Verify: weights change slightly after mutation, not dramatically

**What you'll learn:** Mutation prevents the population from getting stuck. Too much = chaos, too little = stagnation.

**Tuning tip:** Start with `mutationRate = 0.1` and noise magnitude `0.5`. Adjust if evolution is too slow or unstable.

---

## Milestone 9: Create Next Generation (Full GA Loop)
**Goal:** Wire everything together into a complete evolution cycle.

- [ ] Implement `createNextGeneration()` in `GeneticAlgorithm`:
  1. Sort agents by fitness
  2. **Elitism:** copy top 5 agents unchanged into new population
  3. **Fill remaining slots:** tournament select → crossover → mutate
  4. Return new `Agent[]` array
- [ ] Modify `Game`:
  - When all agents die → call `ga.createNextGeneration()`
  - Reset obstacles, score, speed
  - Increment generation counter
  - Start new round automatically
- [ ] Verify: game auto-restarts with new generation, generation counter increments

**What you'll learn:** The full evolutionary loop. This is where the magic happens.

---

## Milestone 10: Observe & Tune Evolution
**Goal:** Watch your AI evolve and tweak parameters.

- [ ] Run for 20+ generations, observe improvement
- [ ] Add UI panel showing:
  - Current generation
  - Best fitness (this gen)
  - All-time best fitness
  - Alive count
- [ ] Experiment with hyperparameters:
  - Population size: try 20, 50, 100
  - Mutation rate: try 0.05, 0.1, 0.2
  - Elitism count: try 1, 5, 10
  - Tournament size: try 2, 3, 5
- [ ] Document what works best in this file
- [ ] Verify: AI consistently improves across generations

**What you'll learn:** Hyperparameter tuning — the art of making evolution work well.

---

## Milestone 11: Fast-Forward Mode
**Goal:** Speed up training by skipping rendering.

- [ ] Add a "Fast Forward" toggle button (or press `F` key)
- [ ] When active: run multiple game steps per animation frame (e.g., 10x)
- [ ] Optionally skip drawing (only draw every Nth frame)
- [ ] Show a visual indicator that fast mode is on
- [ ] Verify: evolution runs 5–10x faster, results are the same

**What you'll learn:** Simulation vs. rendering decoupling — essential for any AI training.

---

## Milestone 12: Save & Load Best Brain
**Goal:** Persist the best neural network so you don't lose progress.

- [ ] Add "Save Best" button → serialize best agent's weights to `localStorage`
- [ ] Add "Load Best" button → deserialize and create an agent with saved weights
- [ ] Add "Watch Best" mode → run a single saved agent (no evolution)
- [ ] Verify: save after 50 generations, reload page, load brain, it still plays well

**What you'll learn:** Serialization, persistence, separating training from inference.

---

## Bonus Milestones (After Core GA Works)

### Bonus A: Add a Hidden Layer
- Change NN architecture from `5→1` to `5→6→1`
- More weights = more complex strategies
- See if it learns faster or better

### Bonus B: Add Ducking
- Add a second output neuron: `output[0]` = jump, `output[1]` = duck
- Add flying obstacles (pterodactyls) that require ducking
- Inputs: add obstacle type (ground vs. air)

### Bonus C: Visualize the Neural Network
- Draw the NN of the best agent on screen
- Show connection weights as line thickness/color
- Watch the network "light up" as it makes decisions

### Bonus D: Implement NEAT
- NeuroEvolution of Augmenting Topologies
- Networks evolve their own structure (add/remove neurons & connections)
- Much more powerful but significantly more complex

---

## Quick Reference: What Each File Does

| File | Purpose |
|---|---|
| `constants.ts` | All game + GA constants |
| `neural-network.ts` | Feed-forward NN (predict, clone, crossover, mutate) |
| `agent.ts` | Wraps Dino + NN, implements `think()` |
| `genetic-algorithm.ts` | Selection, crossover, mutation, next generation |
| `game.ts` | Game loop, rendering, multi-agent simulation |

## Progress Tracker

| Milestone | Status | Date Completed | Notes |
|---|---|---|---|
| 1. Extract Constants | ⬜ | | |
| 2. Neural Network | ⬜ | | |
| 3. Agent Class | ⬜ | | |
| 4. Run Population | ⬜ | | |
| 5. Fitness Evaluation | ⬜ | | |
| 6. Selection | ⬜ | | |
| 7. Crossover | ⬜ | | |
| 8. Mutation | ⬜ | | |
| 9. Full GA Loop | ⬜ | | |
| 10. Observe & Tune | ⬜ | | |
| 11. Fast-Forward | ⬜ | | |
| 12. Save & Load | ⬜ | | |
