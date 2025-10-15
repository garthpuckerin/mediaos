# MediaOS Quality Verification Plan (Backlog)

Purpose: Detect poor or wrong media at three levels — downloader, Arr orchestration, and player — to reduce wasted bandwidth/time and improve library quality.

Phases

1) Downloader-Level Checks (pre-import)
- Verify fetched artifact quickly before import.
- Heuristics: filename/title mismatch, container/codec sanity, duration > 0, basic stream counts, magnet/NZB metadata anomalies.
- Outcome: mark download as suspect; optionally requeue alternative.

2) Arr-Level Checks (post-import, pre-library)
- Deeper analysis using ffprobe-like metadata inspection once file is available in staging.
- Heuristics: duplicate/blank frames (spot-check), extreme compression indicators (bitrate-by-resolution), invalid aspect ratio, multi-audio mismatch, missing/unsynced subtitles, language policy mismatches.
- Outcome: accept with issues, replace, or flag to Wanted.

3) Player-Level Feedback (runtime)
- Collect passive quality signals from playback: stuttering/high frame drops, audio desync, color banding, reported corruption.
- Outcome: feed telemetry back to Arr layer to trigger replacement if consistent.

MVP Scope (incremental)
- Schema for a verification result with issues and severity.
- API endpoint to request a verification run (stub now; real checks later).
- Store minimal verification settings (thresholds) for later tuning.
- UI affordance to trigger verification from Item Detail and show a basic result summary.

Data Model (initial)
- Issue kinds: wrong_content, duplicate_frames_suspected, encoding_low_bitrate, ar_mismatch, audio_channels_mismatch, subtitles_missing, container_unsupported, unknown.
- Severity: info | warn | error.

API (initial)
- POST /api/verify/check { phase?: 'downloader'|'arr'|'player'|'all', kind, id, title? }
  -> { ok, result: { phase, issues: Issue[], analyzedAt } }
- GET /api/settings/verify -> thresholds (placeholder)

UI (initial)
- “Verify Quality” button in Item Detail → calls /api/verify/check and displays a simple summary (number of issues and top severity).

Next Steps
- Integrate ffprobe (or similar) in a worker to gather stream metadata.
- Add heuristics and per-kind thresholds.
- Persist last verification result per item and surface in Library/Wanted.
- Add background job to verify new imports and items in Wanted.

