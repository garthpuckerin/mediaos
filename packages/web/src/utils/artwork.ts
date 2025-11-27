// Artwork management utilities

import { pushToast } from './toast';

export function manageArtwork(state: any, it: any) {
  const kind = window.prompt(
    'Set artwork type: poster, background, banner, season',
    'poster'
  );
  if (!kind) return;
  let season: number | undefined = undefined;
  if (kind === 'season') {
    const s = window.prompt('Season number (0-99)', '1');
    if (!s) return;
    const n = Number(s);
    if (!Number.isFinite(n)) {
      pushToast('error', 'Invalid season number');
      return;
    }
    season = Math.max(0, Math.min(99, Math.trunc(n)));
  }
  const root = state.atRoot ? undefined : state.root.id;
  if (!root) {
    pushToast('error', 'Open a library root first');
    return;
  }
  fetch('/api/files/artwork/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ root, rel: it.rel, kind, season, overwrite: true }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    })
    .then((j) => {
      pushToast('success', 'Artwork set: ' + j.target);
    })
    .catch((e) => pushToast('error', String(e)));
}
