# Vantage (PWA) — Dusk Lavender v2

Dark purple design, floating bottom pill nav (Home, Earnings, Trading, Budget, Learn; Planner and Profile open from Home), candlestick charts. The old teal v1 is backed up in /workspace/vantage-app-backup-v1.

Plain HTML/CSS/JS, no build step. Deploy this folder as-is to any static host over HTTPS.

- Run locally: `python3 -m http.server 8080` then open http://localhost:8080
- Data: all personal data lives in the phone's localStorage (key `vantage.v1`). Profile → Export backup to save a copy.
- Trading (practice portfolio): read-only, loads `data/desk.json`, a snapshot of /workspace/paper-trading. Refresh it with `python3 tools/bundle_desk.py` and redeploy.
- Icons: `tools/make_icons.py`; screenshots: `tools/screenshots.py`; smoke test: `tools/test_flow.py` (need playwright + Chrome).
- When you change any file, bump `VERSION` in `sw.js` so installed copies update.
