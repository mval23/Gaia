# Gaia

A calm daily planner: Group → Category → Task, with a drag-and-drop 24-hour timeline.

## Run it

**Easiest:** double-click **Gaia** on your desktop (or `Start Gaia.bat` in this folder). It installs what it needs the first time, starts the app, and opens it in your browser. Keep the small terminal window open while you use Gaia; close it to stop.

**From a terminal:**

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Requires [Node.js](https://nodejs.org) 18 or newer. Your tasks are saved in the browser on this computer.

## Other commands

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests |
| `npm run build` | Type-checks and builds a production version into `dist/` |
| `npm run art` | Regenerates the Monet crops and logo/icon files from `monet/` and `ideas/logo.png` |
