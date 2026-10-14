# Path Puzzle Prototype: Build Brief for Claude Code

Working title: **Pathline** (placeholder; do not use "Zip" or "LinkedIn" anywhere in code, copy, or assets).

## 1. Goal

Build an unthemed, playable prototype of a number-path logic puzzle in one week. The only question this prototype answers:

> Does dragging the path feel good enough that people keep playing without being asked?

Everything not required to answer that question is out of scope.

## 2. Game rules

- The board is an N x N grid of cells. Some cells hold numbered checkpoints, 1 through K.
- The player draws one continuous path starting at 1.
- The path moves only up, down, left, or right. No diagonals.
- The path must pass through the checkpoints in ascending order.
- The path may not cross or reuse a cell.
- The puzzle is solved when the path ends on K and every cell in the grid is filled.
- Every puzzle has exactly one solution.

## 3. Stack and constraints

- Expo (current stable SDK), TypeScript strict mode, iOS first.
- Check the current Expo docs for the recommended versions of every library before installing. Do not rely on remembered version numbers.
- Gesture input: react-native-gesture-handler. Animation: react-native-reanimated. Path rendering: @shopify/react-native-skia, or plain Views if Skia adds setup friction. Pick one, state why, move on.
- Haptics: expo-haptics. Local storage: AsyncStorage.
- No backend, no auth, no network calls of any kind.
- The puzzle engine is pure TypeScript with zero React or React Native imports, so it can be unit tested and reused later.

## 4. Out of scope (do not build, do not scaffold, do not leave TODO stubs)

- Theme, characters, art, sound, music
- Auth, accounts, backend, sync, leaderboards
- Ads, purchases, paywalls, RevenueCat
- Daily puzzle, streaks, sharing
- Onboarding flow, settings screen, tutorial beyond one line of text
- Android and tablet layout polish

If something on this list seems necessary, stop and ask.

## 5. Project layout

```
/engine        pure TS: types, rng, generator, solver, difficulty
/engine/__tests__
/levels        generated JSON level pack
/scripts       level generation script (node)
/app           Expo screens
/components    Board, Cell, PathLayer
/lib           event log, storage helpers
```

## 6. Phases and gates

Work one phase at a time. At each gate: stop, summarize what was built, list anything that deviates from this brief, and wait for approval before starting the next phase.

### Phase 0: Scaffold

- Create the Expo app with TypeScript, linting, and Jest.
- Confirm it runs in Expo Go or a dev build on an iPhone.

**Gate 0:** App boots to a blank screen on device. Tests run with one passing placeholder test.

### Phase 1: Engine

Build in `/engine`:

1. **Seeded RNG.** A small deterministic generator (for example mulberry32). Same seed must always produce the same puzzle.
2. **Full-grid path generator.** Produce a random path that visits every cell exactly once. Suggested approach: start from a zigzag path and apply a few hundred random "backbite" moves. Another approach is fine if it is fast and produces varied shapes.
3. **Checkpoint placement.** Put 1 on the first cell and K on the last. Place intermediate checkpoints along the path.
4. **Solver.** Depth-first search that counts solutions and stops at 2. Must include pruning (for example, abandon a branch when unvisited cells become unreachable, or when the next checkpoint is cut off).
5. **Uniqueness loop.** Start with few checkpoints. If the solver finds more than one solution, add a checkpoint and retry until the solution is unique.
6. **Difficulty score.** A number derived from grid size, checkpoint count, and solver search effort. It only needs to rank puzzles sensibly, not be perfect.

Tests must cover:

- Generated path visits every cell exactly once and only moves orthogonally.
- Every generated puzzle has exactly one solution according to the solver.
- Same seed gives identical output.
- Solver correctly reports 0, 1, and 2+ solutions on hand-built fixtures.
- Generation of a 7x7 puzzle completes in under 2 seconds on a laptop.

**Gate 1:** All tests pass. Print three sample puzzles (5x5, 6x6, 7x7) as ASCII in the summary so they can be checked by eye.

### Phase 2: Board and input

- Render the grid, checkpoints, and the player's path.
- Drag from cell 1 to begin. Dragging into an orthogonally adjacent empty cell extends the path.
- Dragging back onto the previous cell removes the last step.
- Tapping any cell already on the path truncates the path to that cell.
- Entering checkpoint n is blocked unless checkpoint n-1 is already on the path.
- Fast drags that skip over a cell should fill the cells in between when the route is unambiguous (same row or column, all empty).
- Board scales to fit screen width with comfortable margins. Cells must be easy to hit with a thumb on a 7x7 grid.

**Gate 2:** One hardcoded puzzle is fully playable on device. Input never produces an illegal path. No dropped frames while dragging.

### Phase 3: Levels and flow

- Write `/scripts/generate-levels` to produce 20 levels into `/levels/pack.json`, ordered by difficulty score:
  - Levels 1 to 5: 5x5
  - Levels 6 to 14: 6x6
  - Levels 15 to 20: 7x7
- Screens: a level list (number, completed or not) and the game screen. Nothing else.
- Game screen has: level number, a reset button, an undo button, and a "next level" button on win.
- Persist completed levels locally.

**Gate 3:** All 20 levels are playable start to finish. Every level in the pack is verified unique by the solver inside the generation script.

### Phase 4: Feel and measurement

- Light haptic tick when the path enters a cell. Stronger haptic on reaching a checkpoint. Success haptic on win.
- Path draws with rounded joins and a short ease as it extends.
- Win state: brief fill animation across the path, then the next-level button.
- Local event log, appended to AsyncStorage:
  - `level_start` (level, timestamp)
  - `level_complete` (level, seconds, steps_removed, resets)
  - `level_abandon` (level, seconds, percent_filled) when leaving an unsolved level
- A hidden debug action (long-press the level list title) that shares the event log as JSON.

**Gate 4:** Prototype is ready to hand to testers. Summary includes how to export the event log.

## 7. Working rules

- Ask before adding any dependency not named in this brief.
- Prefer boring, readable code over clever code. This is a prototype that may be thrown away.
- Keep the engine free of UI concerns and the UI free of puzzle logic.
- Commit at the end of each phase with a message naming the phase.
- If a requirement here is ambiguous or seems wrong, say so at the gate instead of guessing silently.

## 8. After the build: the test this prototype exists for

Hand the phone to 5 people with no explanation beyond "connect the numbers in order and fill the grid." Then export the log and check:

- How many finished at least 10 levels in one sitting without prompting?
- Where do abandons cluster? (A spike at one level means a difficulty problem, not a fun problem.)
- Median seconds per level by grid size.
- Did anyone ask to keep playing or ask what the app is called?

**Continue** to theme, daily puzzle, and monetization only if most testers pass 10 levels unprompted. **Stop or rethink** if they put it down before level 5.
