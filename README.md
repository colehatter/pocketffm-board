# Launch Coordination Board

This repository publishes a sanitized, static coordination board. Git is the only write mechanism. The generated `board.json` and `index.html` contain no private operational data.

## Commands

```bash
npm test
npm run validate
npm run build
npm run scan
```

Atomic source records live under `src/`. The build generates `board.json`, `index.html`, and the deployable `dist/` directory.

