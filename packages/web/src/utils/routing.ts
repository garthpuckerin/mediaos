// Routing utilities

export type KindKey = 'series' | 'movies' | 'books' | 'music';
export type TopKey = 'library' | 'calendar' | 'activity' | 'settings' | 'system';

export interface Route {
  top: TopKey;
  kind?: KindKey;
  page?: string;
  id?: string;
}

export function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  let top: TopKey = 'library';
  const allowed: TopKey[] = [
    'library',
    'calendar',
    'activity',
    'settings',
    'system',
  ];
  if (parts[0] && allowed.includes(parts[0] as TopKey)) {
    top = parts[0] as TopKey;
  }
  if (top === 'library') {
    const kindRaw = (parts[1] as KindKey) || 'series';
    const kind: KindKey = (
      ['series', 'movies', 'books', 'music'] as const
    ).includes(kindRaw as KindKey)
      ? (kindRaw as KindKey)
      : 'series';
    const page = parts[2] || 'list';
    const obj: Route = { top, kind, page };
    if (page === 'item' && parts[3]) (obj as any).id = parts[3];
    return obj;
  }
  const p = parts[1];
  const obj: Route = { top };
  if (p) obj.page = p;
  return obj;
}
