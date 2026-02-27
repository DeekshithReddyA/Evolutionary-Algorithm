import { Genome, NodeGene } from "../engine/neat";
import { GenerationStats } from "../engine/types";

/* ───────────── Fitness Graph ───────────── */

export function drawFitnessGraph(
    ctx: CanvasRenderingContext2D,
    stats: GenerationStats[],
    width: number,
    height: number,
): void {
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, width, height);

    if (stats.length === 0) {
        ctx.fillStyle = "#aaa";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No data yet", width / 2, height / 2);
        return;
    }

    const pad = { top: 22, right: 8, bottom: 22, left: 36 };
    const pw = width - pad.left - pad.right;
    const ph = height - pad.top - pad.bottom;

    const maxFit = Math.max(...stats.map((s) => s.bestFitness), 1);
    const minGen = stats[0].generation;
    const maxGen = stats[stats.length - 1].generation;
    const genRange = Math.max(maxGen - minGen, 1);

    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (ph / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + pw, y);
        ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "8px monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
        const val = maxFit * (1 - i / 4);
        ctx.fillText(val.toFixed(0), pad.left - 3, pad.top + (ph / 4) * i + 3);
    }

    // X label
    ctx.textAlign = "center";
    ctx.fillText("Generation", pad.left + pw / 2, height - 3);

    // Helper: map stat → pixel
    const toX = (gen: number) => pad.left + ((gen - minGen) / genRange) * pw;
    const toY = (fit: number) => pad.top + ph - (fit / maxFit) * ph;

    // Best fitness line (green)
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    stats.forEach((s, i) => {
        const x = toX(s.generation);
        const y = toY(s.bestFitness);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Average fitness line (blue)
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    stats.forEach((s, i) => {
        const x = toX(s.generation);
        const y = toY(s.avgFitness);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Legend
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(pad.left + 4, pad.top - 14, 8, 8);
    ctx.fillStyle = "#333";
    ctx.fillText("Best", pad.left + 15, pad.top - 6);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(pad.left + 50, pad.top - 14, 8, 8);
    ctx.fillStyle = "#333";
    ctx.fillText("Avg", pad.left + 61, pad.top - 6);
}

/* ───────────── NEAT Network Visualiser ───────────── */

const INPUT_LABELS = ["dist", "h", "w", "spd", "jmp", "dY", "vel"];
const OUTPUT_LABELS = ["stay", "jump"];

export function drawNetwork(
    ctx: CanvasRenderingContext2D,
    genome: Genome | null,
    width: number,
    height: number,
): void {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, width, height);

    if (!genome) {
        ctx.fillStyle = "#aaa";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No genome yet", width / 2, height / 2);
        return;
    }

    const pad = 24;
    const plotW = width - 2 * pad;
    const plotH = height - 2 * pad - 14; // room for bottom caption

    // Group nodes by layer
    const layerMap = new Map<number, NodeGene[]>();
    for (const n of genome.nodes) {
        if (!layerMap.has(n.layer)) layerMap.set(n.layer, []);
        layerMap.get(n.layer)!.push(n);
    }
    const sortedLayers = [...layerMap.entries()].sort((a, b) => a[0] - b[0]);
    const numLayers = sortedLayers.length;

    // Position nodes
    const pos = new Map<number, { x: number; y: number }>();
    for (let li = 0; li < numLayers; li++) {
        const [, nodes] = sortedLayers[li];
        const x = pad + (numLayers > 1 ? (li / (numLayers - 1)) * plotW : plotW / 2);
        for (let ni = 0; ni < nodes.length; ni++) {
            const y = pad + ((ni + 0.5) / nodes.length) * plotH;
            pos.set(nodes[ni].id, { x, y });
        }
    }

    // Draw connections
    for (const conn of genome.connections) {
        const from = pos.get(conn.from);
        const to = pos.get(conn.to);
        if (!from || !to) continue;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);

        if (!conn.enabled) {
            ctx.strokeStyle = "#e5e7eb";
            ctx.lineWidth = 0.4;
            ctx.setLineDash([2, 2]);
        } else {
            const intensity = Math.min(Math.abs(conn.weight) * 1.5, 1);
            ctx.strokeStyle =
                conn.weight >= 0
                    ? `rgba(34,197,94,${0.25 + intensity * 0.75})`
                    : `rgba(239,68,68,${0.25 + intensity * 0.75})`;
            ctx.lineWidth = 0.6 + intensity * 2;
            ctx.setLineDash([]);
        }
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw nodes
    const r = 7;
    for (const node of genome.nodes) {
        const p = pos.get(node.id);
        if (!p) continue;

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (node.type === "input") ctx.fillStyle = "#3b82f6";
        else if (node.type === "output") ctx.fillStyle = "#f59e0b";
        else ctx.fillStyle = "#8b5cf6";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Labels for input & output nodes
        ctx.font = "7px monospace";
        ctx.fillStyle = "#555";
        ctx.textAlign = node.type === "input" ? "right" : "left";
        if (node.type === "input") {
            const idx = node.id; // input nodes have ids 0..inputSize-1
            const label = INPUT_LABELS[idx] ?? `i${idx}`;
            ctx.fillText(label, p.x - r - 2, p.y + 3);
        } else if (node.type === "output") {
            const idx = node.id - genome.inputSize;
            const label = OUTPUT_LABELS[idx] ?? `o${idx}`;
            ctx.fillText(label, p.x + r + 2, p.y + 3);
        }
    }

    // Caption
    const nEnabled = genome.connections.filter((c) => c.enabled).length;
    ctx.fillStyle = "#888";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
        `${genome.nodes.length} nodes · ${nEnabled} connections`,
        width / 2,
        height - 4,
    );
}
