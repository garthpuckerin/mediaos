import React, { useEffect, useState } from 'react';

import { ArtworkModal } from './ArtworkModal';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

const navItemStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  color: '#e5e7eb',
  textAlign: 'left',
  display: 'block',
  textDecoration: 'none',
};

const navContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const subNavItemStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  color: '#e5e7eb',
  display: 'inline-block',
  textDecoration: 'none',
  border: '1px solid #1f2937',
  marginRight: 8,
};

type TopKey = 'library' | 'calendar' | 'activity' | 'settings' | 'system';
type KindKey = 'series' | 'movies' | 'books' | 'music';
type Route = { top: TopKey; kind?: KindKey; page?: string };

type DownloaderSettingsResponse = {
  qbittorrent: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
  };
  nzbget: {
    enabled: boolean;
    baseUrl: string;
    username: string;
    timeoutMs: number;
    hasPassword: boolean;
  };
  sabnzbd: {
    enabled: boolean;
    baseUrl: string;
    timeoutMs: number;
    hasApiKey: boolean;
  };
};

function parseHash(): Route {
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
    return { top, kind, page };
  }
  const p = parts[1];
  const obj: Route = { top };
  if (p) obj.page = p;
  return obj;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());
  const [health, setHealth] = useState<string>('checking...');
  const [artOpen, setArtOpen] = useState(false);
  const [title] = useState('Artwork');
  const [settings, setSettings] = useState<null | DownloaderSettingsResponse>(
    null
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetch('/api/system/health')
      .then((r) => r.json())
      .then(() => setHealth('ok'))
      .catch(() => setHealth('down'));

    fetch('/api/settings/downloaders')
      .then((r) => r.json())
      .then((payload: DownloaderSettingsResponse) => setSettings(payload))
      .catch(() => setSettings(null));

    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Hash navigation handled via anchor hrefs and hashchange listener

  const libraryKinds: { key: KindKey; label: string }[] = [
    { key: 'series', label: 'Series' },
    { key: 'movies', label: 'Movies' },
    { key: 'books', label: 'Books' },
    { key: 'music', label: 'Music' },
  ];
  // Removed page-level tabs (List/Add/Import) from the subnav; Add/Import now live in the left nav.
  const activitySubs = [
    { key: 'queue', label: 'Queue' },
    { key: 'history', label: 'History' },
    { key: 'wanted', label: 'Wanted' },
  ];
  const settingsSubs = [
    { key: 'general', label: 'General' },
    { key: 'download-clients', label: 'Download Clients' },
    { key: 'indexers', label: 'Indexers' },
  ];
  const systemSubs = [
    { key: 'tasks', label: 'Tasks' },
    { key: 'backups', label: 'Backups' },
    { key: 'logs', label: 'Logs' },
  ];

  const renderSubnav = () => {
    if (route.top === 'library') {
      const currentKind: KindKey = route.kind ?? 'series';
      const currentPage: string = route.page ?? 'list';
      return (
        <>
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: '#0b0f16',
              borderBottom: '1px solid #1f2937',
              padding: '8px 0',
              zIndex: 9,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              {libraryKinds.map((k) => (
                <a
                  key={k.key}
                  href={`#/${route.top}/${k.key}/${currentPage}`}
                  style={{
                    ...subNavItemStyle,
                    background:
                      currentKind === k.key ? '#111827' : 'transparent',
                    border:
                      '1px solid ' +
                      (currentKind === k.key ? '#334155' : '#1f2937'),
                  }}
                >
                  {k.label}
                </a>
              ))}
            </div>
          </div>
          {/* Page-level tabs removed; actions moved to left nav */}
        </>
      );
    }
    const subs =
      route.top === 'activity'
        ? activitySubs
        : route.top === 'settings'
          ? settingsSubs
          : route.top === 'system'
            ? systemSubs
            : [];
    if (subs.length === 0) return null;
    const current = route.page ?? '';
    return (
      <div style={{ marginBottom: 12 }}>
        {subs.map((s) => (
          <a
            key={s.key}
            href={`#/${route.top}/${s.key}`}
            style={{
              ...subNavItemStyle,
              background: current === s.key ? '#111827' : 'transparent',
              border:
                '1px solid ' + (current === s.key ? '#334155' : '#1f2937'),
            }}
          >
            {s.label}
          </a>
        ))}
      </div>
    );
  };

  const renderLibrary = () => {
    const kind: KindKey = route.kind ?? 'series';
    const page: string = route.page ?? 'list';
    const kindLabel =
      libraryKinds.find((k) => k.key === kind)?.label ?? 'Series';
    if (page === 'add') {
      return <LibraryAdd kindLabel={kindLabel} />;
    }
    if (page === 'import') {
      return (
        <LibraryImportSection
          kindLabel={kindLabel}
          onOpenArtwork={() => setArtOpen(true)}
        />
      );
    }
    return <LibraryList kind={kind} />;
  };

  const renderCalendar = () => (
    <section>
      <h2>Calendar</h2>
      <p style={{ color: '#9aa4b2' }}>
        No upcoming episodes. Calendar view coming soon.
      </p>
    </section>
  );

  const renderActivity = () => {
    const page = route.page || 'queue';
    return (
      <section>
        <h2>Activity - {page.charAt(0).toUpperCase() + page.slice(1)}</h2>
        <p style={{ color: '#9aa4b2' }}>This is a placeholder for {page}.</p>
      </section>
    );
  };

  const renderSettings = () => {
    const page = route.page || 'general';
    if (page === 'download-clients') {
      return (
        <section>
          <h2>Settings - Download Clients</h2>
          {!settings && <p style={{ color: '#9aa4b2' }}>Loading settings...</p>}
          {settings && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingSettings(true);
                try {
                  const form = e.target as HTMLFormElement;
                  const data = new FormData(form);
                  const b = (n: string) => data.get(n) === 'on';
                  const s = (n: string) => String(data.get(n) || '').trim();
                  const n = (name: string) => {
                    const v = Number(String(data.get(name) || '').trim());
                    return Number.isFinite(v) ? Math.trunc(v) : undefined;
                  };
                  const payload = {
                    qbittorrent: {
                      enabled: b('qb.enabled'),
                      baseUrl: s('qb.baseUrl') || undefined,
                      username: s('qb.username') || undefined,
                      password: s('qb.password') || undefined,
                      timeoutMs: n('qb.timeoutMs'),
                    },
                    nzbget: {
                      enabled: b('nz.enabled'),
                      baseUrl: s('nz.baseUrl') || undefined,
                      username: s('nz.username') || undefined,
                      password: s('nz.password') || undefined,
                      timeoutMs: n('nz.timeoutMs'),
                    },
                    sabnzbd: {
                      enabled: b('sab.enabled'),
                      baseUrl: s('sab.baseUrl') || undefined,
                      apiKey: s('sab.apiKey') || undefined,
                      timeoutMs: n('sab.timeoutMs'),
                    },
                  } as any;
                  const res = await fetch('/api/settings/downloaders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  const json = await res.json();
                  setSettings(json.downloaders as DownloaderSettingsResponse);
                  alert('Saved');
                } catch (err) {
                  alert((err as Error).message);
                } finally {
                  setSavingSettings(false);
                }
              }}
              style={{ display: 'grid', gap: 16 }}
            >
              {(['qbittorrent', 'nzbget', 'sabnzbd'] as const).map((key) => {
                const label =
                  key === 'qbittorrent' ? 'qBittorrent' : key.toUpperCase();
                const s = (settings as any)[key];
                return (
                  <fieldset
                    key={key}
                    style={{
                      border: '1px solid #1f2937',
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <legend style={{ padding: '0 6px' }}>{label}</legend>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          name={`${key === 'qbittorrent' ? 'qb' : key === 'nzbget' ? 'nz' : 'sab'}.enabled`}
                          defaultChecked={s.enabled}
                        />
                        <span>Enabled</span>
                      </label>
                      <div />
                      <label>
                        <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                          Base URL
                        </div>
                        <input
                          name={`${key === 'qbittorrent' ? 'qb' : key === 'nzbget' ? 'nz' : 'sab'}.baseUrl`}
                          defaultValue={s.baseUrl || ''}
                          placeholder="http://localhost:8080"
                          style={inputStyle}
                        />
                      </label>
                      {key !== 'sabnzbd' && (
                        <label>
                          <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                            Username
                          </div>
                          <input
                            name={`${key === 'nzbget' ? 'nz' : 'qb'}.username`}
                            defaultValue={(s.username || '') as string}
                            style={inputStyle}
                          />
                        </label>
                      )}
                      {key === 'qbittorrent' && (
                        <label>
                          <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                            Password
                          </div>
                          <input
                            name="qb.password"
                            type="password"
                            placeholder={s.hasPassword ? '******' : ''}
                            style={inputStyle}
                          />
                        </label>
                      )}
                      {key === 'nzbget' && (
                        <label>
                          <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                            Password
                          </div>
                          <input
                            name="nz.password"
                            type="password"
                            placeholder={s.hasPassword ? '******' : ''}
                            style={inputStyle}
                          />
                        </label>
                      )}
                      {key === 'sabnzbd' && (
                        <label>
                          <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                            API Key
                          </div>
                          <input
                            name="sab.apiKey"
                            type="password"
                            placeholder={s.hasApiKey ? '******' : ''}
                            style={inputStyle}
                          />
                        </label>
                      )}
                      <label>
                        <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                          Timeout (ms)
                        </div>
                        <input
                          name={`${key === 'qbittorrent' ? 'qb' : key === 'nzbget' ? 'nz' : 'sab'}.timeoutMs`}
                          type="number"
                          min={1000}
                          max={60000}
                          defaultValue={s.timeoutMs}
                          style={inputStyle}
                        />
                      </label>
                    </div>
                  </fieldset>
                );
              })}
              <div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  style={buttonStyle}
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </section>
      );
    }
    return (
      <section>
        <h2>Settings - {page.charAt(0).toUpperCase() + page.slice(1)}</h2>
        <p style={{ color: '#9aa4b2' }}>
          Configure {page}. More pages coming soon.
        </p>
      </section>
    );
  };

  const renderSystem = () => {
    const page = route.page || 'tasks';
    return (
      <section>
        <h2>System - {page.charAt(0).toUpperCase() + page.slice(1)}</h2>
        <p style={{ color: '#9aa4b2' }}>System {page} coming soon.</p>
      </section>
    );
  };

  return (
    <div
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#e5e7eb',
        background: '#0b1220',
        position: 'fixed',
        inset: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 48,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #1f2937',
          background: '#0f172a',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        MediaOS{' '}
        <span style={{ fontSize: 12, color: '#9aa4b2' }}>health: {health}</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 16,
          width: '100%',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <aside
          style={{
            padding: 16,
            borderRight: '1px solid #1f2937',
            background: '#0b1220',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <div style={navContainerStyle}>
            {/* Library top-level */}
            <a
              href="#/library"
              style={{
                ...navItemStyle,
                background: route.top === 'library' ? '#111827' : 'transparent',
                border:
                  '1px solid ' +
                  (route.top === 'library' ? '#334155' : '#1f2937'),
              }}
            >
              Library
            </a>
            {/* Library nested items (visible when Library is active) */}
            {route.top === 'library' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginTop: 4,
                  marginLeft: 8,
                }}
              >
                <a
                  href="#/library"
                  style={{
                    ...navItemStyle,
                    padding: '8px 10px',
                    background:
                      (window.location.hash || '') === '#/library'
                        ? '#111827'
                        : 'transparent',
                    border:
                      '1px solid ' +
                      ((window.location.hash || '') === '#/library'
                        ? '#334155'
                        : '#1f2937'),
                  }}
                >
                  Library (main)
                </a>
                {(
                  [
                    { key: 'series', label: 'Series' },
                    { key: 'movies', label: 'Movies' },
                    { key: 'books', label: 'Books' },
                    { key: 'music', label: 'Music' },
                  ] as { key: KindKey; label: string }[]
                ).map((k) => (
                  <a
                    key={k.key}
                    href={`#/library/${k.key}/list`}
                    style={{
                      ...navItemStyle,
                      padding: '8px 10px',
                      background:
                        route.kind === k.key ? '#111827' : 'transparent',
                      border:
                        '1px solid ' +
                        (route.kind === k.key ? '#334155' : '#1f2937'),
                    }}
                  >
                    {k.label}
                  </a>
                ))}
                {(() => {
                  const currentKind: KindKey = route.kind ?? 'series';
                  const isAdd = route.page === 'add';
                  const isImport = route.page === 'import';
                  return (
                    <>
                      <a
                        href={`#/library/${currentKind}/add`}
                        style={{
                          ...navItemStyle,
                          padding: '8px 10px',
                          background: isAdd ? '#111827' : 'transparent',
                          border:
                            '1px solid ' + (isAdd ? '#334155' : '#1f2937'),
                        }}
                      >
                        Add New
                      </a>
                      <a
                        href={`#/library/${currentKind}/import`}
                        style={{
                          ...navItemStyle,
                          padding: '8px 10px',
                          background: isImport ? '#111827' : 'transparent',
                          border:
                            '1px solid ' + (isImport ? '#334155' : '#1f2937'),
                        }}
                      >
                        Library Import
                      </a>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Other sections */}
            {(
              [
                { key: 'calendar', label: 'Calendar' },
                { key: 'activity', label: 'Activity' },
                { key: 'settings', label: 'Settings' },
                { key: 'system', label: 'System' },
              ] as { key: TopKey; label: string }[]
            ).map((item) => (
              <a
                key={item.key}
                href={`#/${item.key}`}
                style={{
                  ...navItemStyle,
                  background:
                    route.top === item.key ? '#111827' : 'transparent',
                  border:
                    '1px solid ' +
                    (route.top === item.key ? '#334155' : '#1f2937'),
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </aside>
        <main style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
          {renderSubnav()}
          {route.top === 'library' && renderLibrary()}
          {route.top === 'calendar' && renderCalendar()}
          {route.top === 'activity' && renderActivity()}
          {route.top === 'settings' && renderSettings()}
          {route.top === 'system' && renderSystem()}
        </main>
      </div>
      <ArtworkModal
        open={artOpen}
        onClose={() => setArtOpen(false)}
        title={title}
      />
    </div>
  );
}

function LibraryList({ kind }: { kind: KindKey }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = React.useState<number | null>(null);

  const toSingular = (k: KindKey) =>
    k === 'movies' ? 'movie' : k === 'books' ? 'book' : k;

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/library');
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) {
          const t = await res.text();
          throw new Error(`Unexpected response (not JSON): ${t.slice(0, 120)}`);
        }
        const json = await res.json();
        const singular = toSingular(kind);
        const arr = Array.isArray(json.items) ? json.items : [];
        const filtered = arr.filter((it: any) => it && it.kind === singular);
        if (!cancelled) setItems(filtered);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  // Force 9 columns on wide screens to eliminate end-of-row gap
  React.useEffect(() => {
    const el = gridRef.current;
    const RO: any = (window as any).ResizeObserver;
    if (!el || typeof RO === 'undefined') return;
    const gap = 12; // keep in sync with grid gap
    const ro = new RO((entries: any) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      const threshold = 220 * 9 + gap * 8; // ≈ 2076 px
      setCols(w >= threshold ? 9 : null);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const SkeletonCard = () => (
    <div
      aria-hidden
      style={{
        border: '1px solid #1f2937',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#0b1220',
      }}
    >
      <div
        style={{
          height: 300,
          background:
            'linear-gradient(90deg, #111827 0%, #0f172a 50%, #111827 100%)',
        }}
      />
      <div
        style={{
          padding: 10,
          height: 16,
          background:
            'linear-gradient(90deg, #0f172a 0%, #0b1220 50%, #0f172a 100%)',
        }}
      />
    </div>
  );

  const renderCard = (it: any) => {
    const poster = typeof it.posterUrl === 'string' ? it.posterUrl : null;
    return (
      <div
        key={it.id}
        style={{
          border: '1px solid #1f2937',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0b1220',
        }}
      >
        <div
          style={{
            height: 300,
            background: poster ? 'transparent' : '#111827',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {poster ? (
            <img
              src={poster}
              alt={it.title || 'Poster'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (
                  e.currentTarget.parentElement as HTMLElement
                ).style.background = '#111827';
              }}
            />
          ) : (
            <span style={{ color: '#9aa4b2' }}>No artwork</span>
          )}
        </div>
        <div style={{ padding: 10 }}>{it.title || 'Untitled'}</div>
      </div>
    );
  };

  const skeletonCount = 10;

  return (
    <section>
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: cols
            ? `repeat(${cols}, minmax(0, 1fr))`
            : 'repeat(auto-fill, minmax(220px, 1fr))',
        }}
      >
        {loading &&
          Array.from({ length: cols ? cols * 2 : skeletonCount }).map(
            (_, i) => <SkeletonCard key={i} />
          )}
        {!loading &&
          items.length === 0 &&
          Array.from({
            length: Math.max(6, cols ? cols : skeletonCount - 2),
          }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && items.length > 0 && items.map(renderCard)}
      </div>
    </section>
  );
}

function manageArtwork(state: any, it: any) {
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
      alert('Invalid season number');
      return;
    }
    season = Math.max(0, Math.min(99, Math.trunc(n)));
  }
  const root = state.atRoot ? undefined : state.root.id;
  if (!root) {
    alert('Open a library root first');
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
      alert('Artwork set: ' + j.target);
    })
    .catch((e) => alert(String(e)));
}

function LibraryAdd({ kindLabel }: { kindLabel: string }) {
  return (
    <section>
      <h2>Add New {kindLabel}</h2>
      <p style={{ color: '#9aa4b2' }}>
        Search integration to be added. For now, paste a title and plan.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Search by title" style={inputStyle} />
        <button
          style={buttonStyle}
          onClick={() => alert('Search is not implemented yet')}
        >
          Search
        </button>
      </div>
    </section>
  );
}

function LibraryImportSection({
  kindLabel,
  onOpenArtwork,
}: {
  kindLabel: string;
  onOpenArtwork: () => void;
}) {
  return (
    <section>
      <h2>{kindLabel} - Library Import</h2>
      <p style={{ color: '#9aa4b2' }}>
        Browse folders and assign artwork or import existing media.
      </p>
      <div style={{ marginBottom: 8 }}>
        <button style={buttonStyle} onClick={onOpenArtwork}>
          Open Artwork Manager
        </button>
      </div>
      <FileBrowser />
    </section>
  );
}

function FileBrowser() {
  const [state, setState] = React.useState<
    | { atRoot: true; roots: { id: string; name: string }[] }
    | {
        atRoot: false;
        root: { id: string; name: string };
        rel: string;
        parent: string | null;
        items: {
          name: string;
          rel: string;
          type: 'dir' | 'file';
          size: number;
          mtime: string | null;
          isImage: boolean;
        }[];
      }
  >({ atRoot: true, roots: [] as any });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadRoots = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/files/browse');
      const j = await r.json();
      setState(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadPath = async (root: string, rel?: string) => {
    setLoading(true);
    setError(null);
    try {
      const u = new URL('/api/files/browse', window.location.origin);
      u.searchParams.set('root', root);
      if (rel && rel.length > 0) u.searchParams.set('rel', rel);
      const r = await fetch(u.toString());
      const j = await r.json();
      setState(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadRoots();
  }, []);

  return (
    <div>
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      {loading && <div style={{ color: '#9aa4b2' }}>Loading...</div>}
      {'atRoot' in state && state.atRoot && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ color: '#9aa4b2', fontSize: 12 }}>Library Roots</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {state.roots.map((r) => (
              <li key={r.id}>
                <button style={buttonStyle} onClick={() => loadPath(r.id)}>
                  {r.name}
                </button>
              </li>
            ))}
            {state.roots.length === 0 && (
              <li style={{ color: '#9aa4b2' }}>
                No library roots configured (set MEDIAOS_LIBRARY_ROOTS)
              </li>
            )}
          </ul>
        </div>
      )}
      {'atRoot' in state && !state.atRoot && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <strong>{state.root.name}</strong>
            <span style={{ color: '#9aa4b2', fontSize: 12 }}>
              / {state.rel || '.'}
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <button style={buttonStyle} onClick={() => loadRoots()}>
              Roots
            </button>
            {state.parent && (
              <button
                style={{ ...buttonStyle, marginLeft: 8 }}
                onClick={() => loadPath(state.root.id, state.parent!)}
              >
                Up
              </button>
            )}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {state.items.map((it) => (
              <li
                key={it.rel}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #1f2937',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {it.type === 'dir' ? 'DIR' : it.isImage ? 'IMG' : 'FILE'}{' '}
                  {it.name}
                </span>
                <span>
                  {it.type === 'dir' ? (
                    <button
                      style={buttonStyle}
                      onClick={() => loadPath(state.root.id, it.rel)}
                    >
                      Open
                    </button>
                  ) : it.isImage ? (
                    <button
                      style={buttonStyle}
                      onClick={() => manageArtwork(state, it)}
                    >
                      Manage Artwork
                    </button>
                  ) : (
                    <span style={{ color: '#9aa4b2', fontSize: 12 }}>File</span>
                  )}
                </span>
              </li>
            ))}
            {state.items.length === 0 && (
              <li style={{ color: '#9aa4b2' }}>Folder is empty.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
