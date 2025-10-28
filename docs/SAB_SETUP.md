# SAB‑Only Setup & Smoke Checklist

This guide covers configuring a SAB‑only build, key environment options, and a quick smoke test to validate core flows.

## Prerequisites

- SABnzbd running and reachable (Base URL + API key)
- MediaOS API and Web UI running (development or deployed)

## Configure Downloads (SAB only)

1. Open Settings → Download Clients in the Web UI.
2. Under SABnzbd:
   - Enable
   - Base URL: e.g. `http://localhost:8080`
   - API Key: copy from SAB UI (Config → General)
   - Timeout (ms): 8000–15000 (optional)
   - Category: optional (e.g., `tv`)
3. Leave qBittorrent and NZBGet disabled for a SAB‑only build.
4. Click Test Connection, then Save Settings.

## (Optional) Background Features

- Auto‑verify on completion (SAB history):
  - Set `ENABLE_SAB_VERIFY_ON_COMPLETE=true` in API environment
  - Optional: `SAB_VERIFY_POLL_INTERVAL_MS=60000`
- Live download monitor (general): leave disabled for SAB‑only unless needed.

## Core Flows (Smoke Checklist)

- Item Detail → NZB Upload (SAB)
  - Choose an `.nzb` and click Upload NZB
  - Toast shows success; Last Grab panel updates
  - Activity → Queue shows the job with progress/ETA and supports Pause/Resume/Remove
- Item Detail → Re‑grab
  - Re‑grab Last enqueues again, updates Last Grab
- Activity → History
  - Shows SAB completions (recent history); "Verify again" works (best‑effort match)
- Wanted
  - Add an item to Wanted
  - Scan (or Scan & Queue) produces mixed Usenet/Torrent stubs; enqueues Usenet to SAB
- Calendar
  - Events are clickable and navigate to item detail

## Troubleshooting

- If uploads/enqueues work but queue is empty, recheck SAB Category and API key; verify no SAB pause.
- If Verify doesn’t update instantly, the item detail verify panel auto‑refreshes for ~2 minutes; for immediate results, use Verify/Verify again.
- If using the auto‑verify poller, check API logs for `SAB_VERIFY_TRIGGERED` and dedupe state in `config/monitor.json`.

## Notes

- This build intentionally focuses on SAB; NZBGet/qBittorrent features are tracked in `docs/ENHANCEMENTS.md`.
- Release process and acceptance criteria are in `docs/RELEASE.md`.
