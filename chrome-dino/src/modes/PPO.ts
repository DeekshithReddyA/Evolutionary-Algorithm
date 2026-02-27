import { PPOBrain, PPOTrainer } from "../engine/ppo";
import { Dino, Game } from "../engine/game";
import { GenerationStats, PPOConfig } from "../engine/types";

export class PPOMode {
    engine: Game;
    trainer: PPOTrainer | null = null;
    isRunning = false;
    episode = 0;
    stats: GenerationStats[] = [];
    bestScoreAllTime = 0;
    onStatsUpdate: ((stat: GenerationStats) => void) | null = null;

    constructor(engine: Game) {
        this.engine = engine;
    }

    startTraining(config: PPOConfig) {
        this.trainer = new PPOTrainer(config);
        this.isRunning = true;
        this.episode = 0;
        this.stats = [];
        this.bestScoreAllTime = 0;
        this._startEpisode();
    }

    _startEpisode() {
        if (!this.trainer) return;

        const agents = this.trainer.createAgents();
        const dinos = agents.map((agent) => {
            const dino = new Dino();
            dino.brain = agent;
            return dino;
        });
        this.engine.dinos = dinos;
        this.engine.onAllDead = () => this._endEpisode();
    }

    _endEpisode() {
        if (!this.isRunning || !this.trainer) return;

        // Collect brains from dead dinos
        const brains = this.engine.deadDinos
            .map((d) => d.brain as PPOBrain)
            .filter((b) => b && b.states.length > 0);

        // Compute scores for stats
        const scores = this.engine.deadDinos.map((d) => d.score);
        const maxScore = Math.max(...scores, 0);
        const avgScore =
            scores.length > 0
                ? scores.reduce((a, b) => a + b, 0) / scores.length
                : 0;

        if (maxScore > this.bestScoreAllTime) {
            this.bestScoreAllTime = maxScore;
        }

        // Run PPO update
        this.trainer.update(brains);

        this.episode++;

        const stat: GenerationStats = {
            generation: this.episode,
            bestFitness: maxScore,
            avgFitness: avgScore,
        };
        this.stats.push(stat);
        if (this.onStatsUpdate) this.onStatsUpdate(stat);

        console.log(
            `PPO Ep ${this.episode} — Best: ${maxScore.toFixed(2)}, Avg: ${avgScore.toFixed(2)}, ` +
                `P.Loss: ${this.trainer.lastPolicyLoss.toFixed(4)}, Entropy: ${this.trainer.lastEntropy.toFixed(4)}`,
        );

        // Start next episode
        this._startEpisode();
        this.engine.start();
    }

    stopTraining() {
        this.isRunning = false;
    }
}
