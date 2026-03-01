// ============================================
// SUBWAY SURFERS STYLE RENDERERS
// 3D perspective · back-profile · 3 lanes
// ============================================

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// Perspective layout constants (fraction of canvas)
const VP_Y = 0.30;           // vanishing-point Y
const TRACK_W_BOT = 0.60;    // track width at bottom
const TRACK_W_TOP = 0.055;   // track width at vanishing point

// ─────────────────────────────────────────────
//  BACKGROUND  –  3D perspective track + scene
// ─────────────────────────────────────────────

export function drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scrollOffset: number = 0
) {
    const vpX = w / 2;
    const vpY = h * VP_Y;

    // ── Sky ──
    const sky = ctx.createLinearGradient(0, 0, 0, vpY + 20);
    sky.addColorStop(0, '#4FC3F7');
    sky.addColorStop(1, '#E1F5FE');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, vpY + 20);

    // ── Distant city silhouette ──
    ctx.fillStyle = '#90A4AE';
    for (let i = 0; i < 24; i++) {
        const bx = (i / 24) * w;
        const bh = 12 + Math.sin(i * 2.3) * 14 + Math.cos(i * 1.1) * 7;
        ctx.fillRect(bx, vpY - bh, w / 22, bh + 4);
    }
    ctx.fillStyle = '#78909C';
    for (let i = 0; i < 16; i++) {
        const bx = (i / 16) * w + 8;
        const bh = 6 + Math.sin(i * 3.5) * 10;
        ctx.fillRect(bx, vpY - bh, w / 18, bh + 3);
    }

    // ── Ground (sides of track) ──
    const gnd = ctx.createLinearGradient(0, vpY, 0, h);
    gnd.addColorStop(0, '#6D4C41');
    gnd.addColorStop(1, '#4E342E');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, vpY, w, h - vpY);

    // ── Track trapezoid ──
    const twBot = w * TRACK_W_BOT;
    const lBot = (w - twBot) / 2, rBot = lBot + twBot;
    const twTop = w * TRACK_W_TOP;
    const lTop = vpX - twTop / 2, rTop = vpX + twTop / 2;

    const trk = ctx.createLinearGradient(0, vpY, 0, h);
    trk.addColorStop(0, '#757575');
    trk.addColorStop(1, '#616161');
    ctx.fillStyle = trk;
    ctx.beginPath();
    ctx.moveTo(lTop, vpY);
    ctx.lineTo(rTop, vpY);
    ctx.lineTo(rBot, h);
    ctx.lineTo(lBot, h);
    ctx.fill();

    // ── Railroad ties (animated scroll) ──
    for (let i = 0; i < 32; i++) {
        const t = ((i / 32) + ((scrollOffset * 0.0004) % (1 / 32)) + 1) % 1;
        const ty = lerp(h, vpY, t);
        const lx = lerp(lBot, lTop, t);
        const rx = lerp(rBot, rTop, t);
        ctx.strokeStyle = `rgba(78,52,46,${0.15 + (1 - t) * 0.55})`;
        ctx.lineWidth = Math.max(1, (1 - t) * 4);
        ctx.beginPath();
        ctx.moveTo(lx - 4, ty);
        ctx.lineTo(rx + 4, ty);
        ctx.stroke();
    }

    // ── Lane dividers (dashed yellow) ──
    for (let lane = 1; lane <= 2; lane++) {
        const f = lane / 3;
        ctx.strokeStyle = 'rgba(255,238,88,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 14]);
        ctx.beginPath();
        ctx.moveTo(lerp(lTop, rTop, f), vpY);
        ctx.lineTo(lerp(lBot, rBot, f), h);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ── Outer rails ──
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lTop, vpY); ctx.lineTo(lBot, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rTop, vpY); ctx.lineTo(rBot, h); ctx.stroke();

    // ── Side walls with perspective ──
    for (let side = 0; side < 2; side++) {
        for (let i = 0; i < 10; i++) {
            const d1 = i / 10, d2 = (i + 1) / 10;
            const y1 = lerp(h, vpY, d1), y2 = lerp(h, vpY, d2);
            const ox = side === 0
                ? [lerp(lBot - 35, lTop - 2, d1), lerp(lBot - 35, lTop - 2, d2)]
                : [lerp(rBot + 35, rTop + 2, d1), lerp(rBot + 35, rTop + 2, d2)];
            const wh1 = (1 - d1) * 50, wh2 = (1 - d2) * 50;
            ctx.fillStyle = i % 2 === 0 ? '#795548' : '#8D6E63';
            ctx.beginPath();
            ctx.moveTo(ox[0], y1);
            ctx.lineTo(ox[1], y2);
            ctx.lineTo(ox[1], y2 - wh2);
            ctx.lineTo(ox[0], y1 - wh1);
            ctx.fill();
        }
    }
}

/**
 * Get the X center of a lane (0=left, 1=center, 2=right) at a given
 * depth (0=bottom / close, 1=vanishing-point / far).
 */
export function getLaneX(lane: number, depth: number, canvasWidth: number): number {
    const vpX = canvasWidth / 2;
    const twBot = canvasWidth * TRACK_W_BOT;
    const lBot = (canvasWidth - twBot) / 2;
    const twTop = canvasWidth * TRACK_W_TOP;
    const lTop = vpX - twTop / 2;
    const rTop = vpX + twTop / 2;
    const rBot = lBot + twBot;
    const laneFrac = (lane + 0.5) / 3; // center of lane
    const topX = lerp(lTop, rTop, laneFrac);
    const botX = lerp(lBot, rBot, laneFrac);
    return lerp(botX, topX, depth);
}

/**
 * Get the Y position at a given depth (0=bottom, 1=vanishing-point).
 */
export function getDepthY(depth: number, canvasHeight: number): number {
    return lerp(canvasHeight, canvasHeight * VP_Y, depth);
}

/**
 * Get the perspective scale at a given depth (0=close=1.0, 1=far≈0.08).
 */
export function getDepthScale(depth: number): number {
    return 1 - depth * 0.92;
}

// ─────────────────────────────────────────────
//  PLAYER  –  back-profile (Subway Surfers)
// ─────────────────────────────────────────────

export function drawPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    time: number,
    isJumping: boolean
) {
    ctx.save();
    ctx.translate(x + width / 2, y + height); // anchor at bottom-center

    const s = width / 60; // scale factor (designed around 60px width)

    // animation
    const rc = isJumping ? 0 : time * 12;
    const legAng = isJumping ? 0.25 : Math.sin(rc) * 0.55;
    const armAng = isJumping ? -0.7 : Math.sin(rc) * 0.45;
    const bob = isJumping ? 0 : Math.abs(Math.sin(rc)) * 2.5 * s;

    // part dimensions
    const headR = 13 * s;
    const bodyW = 28 * s, bodyH = 26 * s;
    const legW = 9 * s,   legH = 26 * s;
    const armW = 7.5 * s,  armH = 22 * s;
    const shoeH = 5 * s,  neckH = 3.5 * s;
    const total = headR * 2 + neckH + bodyH + legH + shoeH;
    const oy = -total + bob; // y-offset so feet sit at anchor

    // ── ground shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyW * 0.65, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── LEFT LEG (behind body — moves front/back via Y offset + foreshortening) ──
    ctx.save();
    const lLegYOff = -legAng * legH * 0.35;   // negative = leg forward (higher)
    const lLegScale = 1 - legAng * 0.15;       // slightly shorter when forward
    ctx.translate(-6.5 * s, oy + headR * 2 + neckH + bodyH + lLegYOff);
    ctx.scale(1, lLegScale);
    ctx.fillStyle = '#1565C0'; // dark blue jeans
    ctx.beginPath();
    ctx.roundRect(-legW / 2, 0, legW, legH, 3 * s);
    ctx.fill();
    ctx.fillStyle = '#E53935'; // red sneaker
    ctx.beginPath();
    ctx.roundRect(-legW / 2 - 1, legH - 1, legW + 2, shoeH, 2 * s);
    ctx.fill();
    ctx.restore();

    // ── RIGHT LEG (opposite phase) ──
    ctx.save();
    const rLegYOff = legAng * legH * 0.35;    // opposite to left leg
    const rLegScale = 1 + legAng * 0.15;
    ctx.translate(6.5 * s, oy + headR * 2 + neckH + bodyH + rLegYOff);
    ctx.scale(1, rLegScale);
    ctx.fillStyle = '#1565C0';
    ctx.beginPath();
    ctx.roundRect(-legW / 2, 0, legW, legH, 3 * s);
    ctx.fill();
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.roundRect(-legW / 2 - 1, legH - 1, legW + 2, shoeH, 2 * s);
    ctx.fill();
    ctx.restore();

    // ── LEFT ARM (behind body — swings front/back opposite to right leg) ──
    ctx.save();
    const lArmYOff = armAng * armH * 0.3;     // arm goes forward when opposite leg goes back
    const lArmScale = 1 + armAng * 0.12;
    ctx.translate(-bodyW / 2 - armW * 0.2, oy + headR * 2 + neckH + 3 * s + lArmYOff);
    ctx.scale(1, lArmScale);
    ctx.fillStyle = '#43A047'; // green hoodie sleeve
    ctx.beginPath();
    ctx.roundRect(-armW / 2, 0, armW, armH * 0.6, 3 * s);
    ctx.fill();
    ctx.fillStyle = '#FFCC80'; // skin – hand
    ctx.beginPath();
    ctx.roundRect(-armW / 2 + 1, armH * 0.55, armW - 2, armH * 0.22, 3 * s);
    ctx.fill();
    ctx.restore();

    // ── BODY / HOODIE ──
    const bodyY = oy + headR * 2 + neckH;
    ctx.fillStyle = '#388E3C'; // green hoodie
    ctx.beginPath();
    ctx.roundRect(-bodyW / 2, bodyY, bodyW, bodyH, 4 * s);
    ctx.fill();
    // center seam
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(0, bodyY + 3 * s);
    ctx.lineTo(0, bodyY + bodyH - 3 * s);
    ctx.stroke();
    // hood bump at neckline
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.ellipse(0, bodyY, bodyW * 0.35, 5 * s, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // ── BACKPACK ──
    const bpW = bodyW * 0.5, bpH = bodyH * 0.6;
    const bpY = bodyY + bodyH * 0.18;
    ctx.fillStyle = '#F44336'; // red backpack
    ctx.beginPath();
    ctx.roundRect(-bpW / 2, bpY, bpW, bpH, 3.5 * s);
    ctx.fill();
    // straps
    ctx.strokeStyle = '#D32F2F';
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(-bpW / 2 + 2.5 * s, bpY - 1); ctx.lineTo(-bpW / 2 + 2.5 * s, bpY + bpH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( bpW / 2 - 2.5 * s, bpY - 1); ctx.lineTo( bpW / 2 - 2.5 * s, bpY + bpH); ctx.stroke();
    // pocket
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.roundRect(-bpW / 2 + 3 * s, bpY + bpH * 0.52, bpW - 6 * s, bpH * 0.3, 2 * s);
    ctx.fill();

    // ── RIGHT ARM (in front — swings front/back opposite to left leg) ──
    ctx.save();
    const rArmYOff = -armAng * armH * 0.3;    // opposite to left arm
    const rArmScale = 1 - armAng * 0.12;
    ctx.translate(bodyW / 2 + armW * 0.2, oy + headR * 2 + neckH + 3 * s + rArmYOff);
    ctx.scale(1, rArmScale);
    ctx.fillStyle = '#43A047';
    ctx.beginPath();
    ctx.roundRect(-armW / 2, 0, armW, armH * 0.6, 3 * s);
    ctx.fill();
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.roundRect(-armW / 2 + 1, armH * 0.55, armW - 2, armH * 0.22, 3 * s);
    ctx.fill();
    ctx.restore();

    // ── NECK ──
    ctx.fillStyle = '#FFCC80';
    ctx.fillRect(-4.5 * s, oy + headR * 2, 9 * s, neckH + 1);

    // ── HEAD (back view – no face visible) ──
    const hcy = oy + headR;
    // hair / back of head
    ctx.fillStyle = '#4E342E'; // dark brown hair
    ctx.beginPath();
    ctx.arc(0, hcy, headR, 0, Math.PI * 2);
    ctx.fill();
    // backwards cap – dome on top, brim faces camera
    ctx.fillStyle = '#F44336'; // red cap
    ctx.beginPath();
    ctx.arc(0, hcy - 1 * s, headR + 0.5, Math.PI * 0.82, Math.PI * 0.18, true);
    ctx.fill();
    // cap brim (at back, facing us)
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.ellipse(0, hcy + headR * 0.65, headR * 0.5, 3.5 * s, 0, 0, Math.PI);
    ctx.fill();
    // cap button on top
    ctx.fillStyle = '#B71C1C';
    ctx.beginPath();
    ctx.arc(0, hcy - headR + 1 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    // ears (poke out on sides)
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.ellipse(-headR + 1.5 * s, hcy + 2 * s, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headR - 1.5 * s, hcy + 2 * s, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ─────────────────────────────────────────────
//  HURDLE  –  low jump barrier (3D look)
// ─────────────────────────────────────────────

export function drawHurdle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
) {
    ctx.save();
    ctx.translate(x, y);

    const postW = width * 0.1;
    const barH = height * 0.35;
    const topD = height * 0.12; // visible top-face depth (3D)

    // ── 3D top face (seen from above) ──
    ctx.fillStyle = '#FFF176';
    ctx.beginPath();
    ctx.moveTo(postW, topD);
    ctx.lineTo(postW + width * 0.03, 0);
    ctx.lineTo(width - postW - width * 0.03, 0);
    ctx.lineTo(width - postW, topD);
    ctx.closePath();
    ctx.fill();

    // ── Front barrier plank ──
    ctx.fillStyle = '#FDD835';
    ctx.fillRect(postW, topD, width - postW * 2, barH);

    // hazard stripes
    ctx.fillStyle = '#212121';
    const sCount = 6;
    const sW = (width - postW * 2) / (sCount * 2);
    for (let i = 0; i < sCount; i++) {
        const sx = postW + i * sW * 2;
        ctx.beginPath();
        ctx.moveTo(sx, topD);
        ctx.lineTo(sx + sW, topD);
        ctx.lineTo(sx + sW - barH * 0.3, topD + barH);
        ctx.lineTo(sx - barH * 0.3, topD + barH);
        ctx.fill();
    }

    // ── Posts ──
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(0, 0, postW, height);
    ctx.fillRect(width - postW, 0, postW, height);
    // highlight
    ctx.fillStyle = '#BDBDBD';
    ctx.fillRect(1, 0, postW * 0.35, height);
    ctx.fillRect(width - postW + 1, 0, postW * 0.35, height);
    // base plates
    ctx.fillStyle = '#757575';
    ctx.fillRect(-2, height - height * 0.07, postW + 4, height * 0.07);
    ctx.fillRect(width - postW - 2, height - height * 0.07, postW + 4, height * 0.07);

    ctx.restore();
}

// ─────────────────────────────────────────────
//  TRAIN  –  front-view subway car
// ─────────────────────────────────────────────

export function drawTrain(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
) {
    ctx.save();
    ctx.translate(x, y);

    // ── Drop shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.roundRect(4, 4, width, height, width * 0.06);
    ctx.fill();

    // ── Main body ──
    const bodyGrad = ctx.createLinearGradient(0, 0, width, 0);
    bodyGrad.addColorStop(0, '#1565C0');
    bodyGrad.addColorStop(0.5, '#1976D2');
    bodyGrad.addColorStop(1, '#1565C0');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, width * 0.06);
    ctx.fill();

    // ── Roof ──
    ctx.fillStyle = '#B0BEC5';
    ctx.beginPath();
    ctx.roundRect(width * 0.06, -height * 0.04, width * 0.88, height * 0.08, width * 0.04);
    ctx.fill();

    // ── Windshield ──
    const wsY = height * 0.08;
    const wsH = height * 0.28;
    ctx.fillStyle = '#0D47A1';
    ctx.beginPath();
    ctx.roundRect(width * 0.12, wsY, width * 0.76, wsH, width * 0.03);
    ctx.fill();
    // reflection streak
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(width * 0.18, wsY + wsH);
    ctx.lineTo(width * 0.4, wsY);
    ctx.lineTo(width * 0.52, wsY);
    ctx.lineTo(width * 0.3, wsY + wsH);
    ctx.fill();

    // ── Route plate ──
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.roundRect(width * 0.35, wsY + wsH + height * 0.04, width * 0.3, height * 0.1, 3);
    ctx.fill();
    ctx.fillStyle = '#0D47A1';
    ctx.font = `bold ${Math.max(8, height * 0.07)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('S42', width * 0.5, wsY + wsH + height * 0.12);

    // ── Horizontal trim ──
    ctx.strokeStyle = '#0D47A1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.05, height * 0.48);
    ctx.lineTo(width * 0.95, height * 0.48);
    ctx.stroke();

    // ── Headlights ──
    const lR = width * 0.07;
    const lY = height * 0.75;
    // glow
    ctx.fillStyle = 'rgba(255,235,59,0.25)';
    ctx.beginPath(); ctx.arc(width * 0.18, lY, lR * 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width * 0.82, lY, lR * 2, 0, Math.PI * 2); ctx.fill();
    // bulb
    ctx.fillStyle = '#FFEE58';
    ctx.beginPath(); ctx.arc(width * 0.18, lY, lR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width * 0.82, lY, lR, 0, Math.PI * 2); ctx.fill();
    // hot center
    ctx.fillStyle = '#FFF9C4';
    ctx.beginPath(); ctx.arc(width * 0.18, lY, lR * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width * 0.82, lY, lR * 0.45, 0, Math.PI * 2); ctx.fill();

    // ── Bumper / grill ──
    ctx.fillStyle = '#546E7A';
    const gY = lY + lR + 3;
    ctx.fillRect(width * 0.25, gY, width * 0.5, height * 0.1);
    ctx.strokeStyle = '#37474F';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
        const gx = width * 0.25 + (width * 0.5 / 4) * i;
        ctx.beginPath();
        ctx.moveTo(gx, gY);
        ctx.lineTo(gx, gY + height * 0.1);
        ctx.stroke();
    }

    ctx.restore();
}
