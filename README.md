# Pathline prototype

A number-path puzzle prototype. Draw one line from 1 through every numbered
checkpoint in order so that it fills the whole grid. It exists to answer one
question: does dragging the path feel good enough that people keep playing
without being asked?

## Run it on an iPhone

```
npm install
npx expo start
```

Scan the QR code with Expo Go. Every native library used is bundled in Expo Go,
so no development build is needed.

## Checks

```
npm test          # engine, board, screen, and log tests
npm run lint
npm run typecheck
```

## Levels

`levels/pack.json` holds 20 levels: 5 at 5x5, 9 at 6x6, 6 at 7x7, ordered by
difficulty inside each band. Regenerate it with:

```
npm run generate-levels
```

Every level is re-verified by the solver inside the script before it is written.

## Running the playtest

Hand the phone over with one sentence: "connect the numbers in order and fill
the grid." Say nothing else.

Afterwards, on the level list, long-press the "Levels" title for about half a
second. The share sheet opens with the event log as JSON. AirDrop it to a Mac or
save it to Files, then:

```
npm run summarize-log -- path/to/events.json
```

This prints levels completed, whether the tester reached 10, median seconds per
completed level by grid size, and where abandons cluster. A level that was
started but has no end event means the app was closed on it and is counted as
an abandon.

The log is one JSON array of events:

| event | fields |
| --- | --- |
| `level_start` | level, timestamp |
| `level_complete` | level, seconds, steps_removed, resets, timestamp |
| `level_abandon` | level, seconds, percent_filled, timestamp |

The log is never cleared by the app. To start fresh for a new tester, delete and
reinstall the app in Expo Go, or use a different phone.

## Layout

```
engine/       pure TypeScript: types, rng, path generator, solver, difficulty, path rules
levels/       generated level pack
scripts/      level generation and log summary (node)
app/          screens
components/   Board, Cell, PathLayer
lib/          level loader, storage, event log, log summary
```
