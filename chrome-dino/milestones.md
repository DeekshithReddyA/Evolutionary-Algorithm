## 🎯 Milestone 1: Blank Canvas & Ground Line
**Goal:** Get the canvas rendering with a static ground line.

- Create index.html with a `<canvas>` element (1200×500)
- Create style.css to center everything
- Create game.js — get the canvas context (`ctx`)
- Draw a horizontal line at y=260 from x=300 to x=1150 using `ctx.beginPath()`, `moveTo()`, `lineTo()`, `stroke()`

**✅ You should see:** A centered canvas with a ground line.

---

## 🎯 Milestone 2: Draw the Dino (Static)
**Goal:** Load an image and draw it on the ground.

- Create a `Dino` class with properties: `x`, `y`, `width`, `height`, `image`
- In the constructor, set `x=330`, `width=120`, `height=110`, `y = GROUND_Y - height`
- Load the image with `new Image()` and set `.src`
- Add a `draw(ctx)` method that calls `ctx.drawImage()`
- Call `dino.draw(ctx)` after drawing the ground

**✅ You should see:** The dino sitting on the ground line.

---

## 🎯 Milestone 3: Game Loop
**Goal:** Replace one-time draw with a continuous render loop.

- Create a `Game` class that owns the canvas, ctx, and dino
- Add a `_loop()` method that:
  1. Clears the canvas with `ctx.clearRect()`
  2. Draws the ground
  3. Draws the dino
  4. Calls `requestAnimationFrame(() => this._loop())`
- Start the loop only after the image has loaded (`image.onload`)

**✅ You should see:** Same as before, but now it's a live loop (verify by logging frame count).

---

## 🎯 Milestone 4: Jumping
**Goal:** Press Space/ArrowUp to make the dino jump.

- Add to `Dino`: `velocity`, `jumping` (boolean)
- Add a `jump()` method — sets `velocity = -4.5` and `jumping = true` (only if not already jumping)
- Add an `update()` method — applies gravity (`velocity += 0.1`), updates `y += velocity`, and lands when `y >= GROUND_Y - height`
- Add a `reset()` method to restore initial state
- Listen for `keydown` in the `Game` class, call `dino.jump()`
- Call `dino.update()` each frame in `_loop()`
- Don't forget `e.preventDefault()` to stop the page from scrolling

**✅ You should see:** Dino jumps with an arc and lands back on the ground.

---

## 🎯 Milestone 5: Obstacles Spawning
**Goal:** Obstacles appear from the right edge and move left.

- Create an `Obstacle` class with `x`, `y`, `width`, `height`
- Randomly pick small (40×40) or big (60×60) on creation
- Start at `x = canvas width`, `y = GROUND_Y - height`
- Add an `update()` method that moves `x -= speed`
- Add `isOffScreen()` — returns true when fully past the left boundary
- Load one shared image (static property on the class)
- In `Game`, keep an `obstacles[]` array. Each frame: create new ones on a timer, update all, filter out off-screen ones, draw all

**✅ You should see:** Obstacles scrolling across the ground at random intervals.

---

## 🎯 Milestone 6: Collision Detection
**Goal:** Game stops when dino hits an obstacle.

- Write a pure function `rectsOverlap(a, b)` — standard AABB rectangle collision:
  ```
  a.x < b.x + b.w  &&  a.x + a.w > b.x  &&
  a.y < b.y + b.h  &&  a.y + a.h > b.y
  ```
- Each frame, check dino rect vs every obstacle rect
- On collision → set `playing = false`

**✅ You should see:** Game freezes when dino touches an obstacle.

---

## 🎯 Milestone 7: Start/Stop & Restart
**Goal:** Button to start, stop, and restart the game cleanly.

- Add a `<button id="startBtn">Start</button>` to HTML
- `Game.start()` — resets dino, clears obstacles, sets `playing = true`
- `Game.stop()` — sets `playing = false`
- `togglePlay()` — wired to button click
- Only spawn/move obstacles and check collisions when `playing === true`
- Always update/draw dino (so mid-air jumps finish gracefully after game over)

**✅ You should see:** Full start → play → die → restart cycle working.

---

## 🎯 Milestone 8: Score & High Score
**Goal:** Track and display score.

- Add `<span id="score">` and `<span id="highScore">` to HTML
- In `Game`: `score`, `highScore`, `frameCount`
- Increment `frameCount` each playing frame; every 10 frames, increment `score`
- On game over, update `highScore` if beaten
- Update the DOM elements each time score changes

**✅ You should see:** Score counting up during play, high score persisting across rounds.

---

## 🧭 Suggested Order of Constants

Define these at the top as you go — pull them out of classes to keep things tunable:

| Constant | Value | Purpose |
|---|---|---|
| `GROUND_Y` | 260 | Where the ground line sits |
| `JUMP_STRENGTH` | -4.5 | Initial upward velocity |
| `GRAVITY` | 0.1 | Downward acceleration per frame |
| `OBSTACLE_SPEED` | 3 | Pixels per frame obstacles move |
| `SPAWN_MIN_MS` | 1200 | Minimum gap between spawns |
| `SPAWN_MAX_MS` | 3500 | Maximum gap between spawns |

---

## 💡 Key Design Principles to Practice

1. **Single Responsibility** — `Dino` only knows about the dino. `Obstacle` only knows about one obstacle. `Game` orchestrates.
2. **Encapsulation** — Each class owns its own state and has methods to manipulate it. No reaching into another object's internals.
3. **No globals** — Everything lives inside class instances. Only one `const game = new Game(...)` at the top level.
4. **Shared resources** — Load the obstacle image once as a static property, not per-instance.
5. **Pure functions** — `rectsOverlap()` takes data in, returns a boolean. No side effects.

Work through milestones 1–8 in order. Each one builds on the last, and you'll always have something visible on screen to verify your progress. Good luck! 🦕