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

const fieldsetStyle: React.CSSProperties = {
  border: '1px solid #1f2937',
  borderRadius: 8,
  padding: 8,
};

type TopKey = 'library' | 'calendar' | 'activity' | 'settings' | 'system';
type KindKey = 'series' | 'movies' | 'books' | 'music';
type Route = { top: TopKey; kind?: KindKey; page?: string; id?: string };

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
    const obj: Route = { top, kind, page };
    if (page === 'item' && parts[3]) (obj as any).id = parts[3];
    return obj;
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
  const [artTitle, setArtTitle] = useState<string | null>(null);
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
    { key: 'quality', label: 'Quality' },
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
    if (page === 'item') {
      return (
        <LibraryItemDetail
          kind={kind}
          id={route.id || ''}
          onOpenArtwork={(t) => {
            setArtTitle(t);
            setArtOpen(true);
          }}
        />
      );
    }
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
    return (
      <LibraryList
        kind={kind}
        onOpenArtwork={(t) => {
          setArtTitle(t);
          setArtOpen(true);
        }}
      />
    );
  };

  const renderCalendar = () => <CalendarPage />;

  const renderActivity = () => {
    const page = route.page || 'queue';
    if (page === 'wanted') {
      return <WantedPage />;
    }
    return (
      <section>
        <h2>Activity - {page.charAt(0).toUpperCase() + page.slice(1)}</h2>
        <p style={{ color: '#9aa4b2' }}>This is a placeholder for {page}.</p>
      </section>
    );
  };

  const renderSettings = () => {
    const page = route.page || 'general';
    if (page === 'indexers') {
      return <IndexersSettings />;
    }
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
                const doTest = async (
                  e: React.MouseEvent<HTMLButtonElement>
                ) => {
                  e.preventDefault();
                  const form = (e.currentTarget as HTMLButtonElement)
                    .form as HTMLFormElement;
                  const data = new FormData(form);
                  const b = (n: string) => data.get(n) === 'on';
                  const str = (n: string) => String(data.get(n) || '').trim();
                  const num = (n: string) => {
                    const v = Number(String(data.get(n) || '').trim());
                    return Number.isFinite(v) ? Math.trunc(v) : undefined;
                  };
                  const payload: any =
                    key === 'qbittorrent'
                      ? {
                          enabled: b('qb.enabled'),
                          baseUrl: str('qb.baseUrl') || undefined,
                          username: str('qb.username') || undefined,
                          password: str('qb.password') || undefined,
                          timeoutMs: num('qb.timeoutMs'),
                        }
                      : key === 'nzbget'
                        ? {
                            enabled: b('nz.enabled'),
                            baseUrl: str('nz.baseUrl') || undefined,
                            username: str('nz.username') || undefined,
                            password: str('nz.password') || undefined,
                            timeoutMs: num('nz.timeoutMs'),
                          }
                        : {
                            enabled: b('sab.enabled'),
                            baseUrl: str('sab.baseUrl') || undefined,
                            apiKey: str('sab.apiKey') || undefined,
                            timeoutMs: num('sab.timeoutMs'),
                          };
                  try {
                    const r = await fetch('/api/settings/downloaders/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ client: key, settings: payload }),
                    });
                    const j = await r.json();
                    if (j.ok)
                      alert(
                        `${label} reachable${j.status ? ` (status ${j.status})` : ''}`
                      );
                    else
                      alert(`${label} failed: ${j.error || 'unknown error'}`);
                  } catch (err) {
                    alert((err as Error).message);
                  }
                };
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
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        style={buttonStyle}
                        onClick={doTest}
                      >
                        Test Connection
                      </button>
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
    if (page === 'quality') {
      return <QualitySettings />;
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
        title={artTitle || ''}
      />
    </div>
  );
}

function IndexersSettings() {
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/indexers');
      const j = await r.json();
      setList(j.indexers || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <section>
      <h2>Settings - Indexers</h2>
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.target as HTMLFormElement;
            const d = new FormData(f);
            const name = String(d.get('name') || '').trim();
            const type = String(d.get('type') || 'torrent') as
              | 'torrent'
              | 'usenet';
            const url = String(d.get('url') || '').trim();
            if (!name) return;
            try {
              const r = await fetch('/api/indexers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type, url: url || undefined }),
              });
              if (!r.ok) throw new Error(await r.text());
              await r.json();
              f.reset();
              await load();
            } catch (e) {
              alert((e as Error).message);
            }
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 1fr auto',
            gap: 8,
          }}
        >
          <input name="name" placeholder="Name" style={inputStyle} />
          <select name="type" style={inputStyle as any} defaultValue="torrent">
            <option value="torrent">Torrent</option>
            <option value="usenet">Usenet</option>
          </select>
          <input
            name="url"
            placeholder="Base URL (optional)"
            style={inputStyle}
          />
          <button style={buttonStyle}>Add</button>
        </form>
      </div>
      {loading && <div style={{ color: '#9aa4b2' }}>Loading…</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map((ix) => (
          <div
            key={ix.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 1fr auto auto',
              gap: 8,
              alignItems: 'center',
              border: '1px solid #1f2937',
              borderRadius: 10,
              padding: 10,
            }}
          >
            <strong>{ix.name}</strong>
            <span style={{ color: '#9aa4b2' }}>{ix.type}</span>
            <span style={{ color: '#9aa4b2' }}>{ix.url || ''}</span>
            <button
              style={buttonStyle}
              onClick={async () => {
                await fetch(`/api/indexers/${ix.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ enabled: !ix.enabled }),
                });
                await load();
              }}
            >
              {ix.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              style={buttonStyle}
              onClick={async () => {
                if (!confirm('Delete indexer?')) return;
                await fetch(`/api/indexers/${ix.id}`, { method: 'DELETE' });
                await load();
              }}
            >
              Delete
            </button>
          </div>
        ))}
        {list.length === 0 && !loading && (
          <div style={{ color: '#9aa4b2' }}>No indexers added yet.</div>
        )}
      </div>
    </section>
  );
}

function QualitySettings() {
  const [profiles, setProfiles] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/settings/quality')
      .then((r) => r.json())
      .then((j) => setProfiles(j.profiles || {}))
      .catch(() => setProfiles({}));
  }, []);

  const kinds: { key: KindKey; label: string }[] = [
    { key: 'series', label: 'Series' },
    { key: 'movies', label: 'Movies' },
    { key: 'books', label: 'Books' },
    { key: 'music', label: 'Music' },
  ];

  return (
    <section>
      <h2>Settings - Quality</h2>
      {!profiles && <p style={{ color: '#9aa4b2' }}>Loading...</p>}
      {profiles && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const form = e.target as HTMLFormElement;
              const data = new FormData(form);
              const toArray = (s: string) =>
                s
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean);
              const payload: any = { profiles: {} };
              for (const k of kinds) {
                const allowed = String(data.get(`q.${k.key}.allowed`) || '');
                const cutoff = String(data.get(`q.${k.key}.cutoff`) || '').trim();
                if (allowed || cutoff) {
                  payload.profiles[k.key] = {
                    allowed: toArray(allowed),
                    cutoff,
                  };
                }
              }
              const res = await fetch('/api/settings/quality', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error(await res.text());
              const j = await res.json();
              setProfiles(j.profiles || {});
              alert('Saved');
            } catch (err) {
              alert((err as Error).message);
            } finally {
              setSaving(false);
            }
          }}
          style={{ display: 'grid', gap: 16 }}
        >
          {kinds.map((k) => {
            const p = (profiles as any)[k.key] || { allowed: [], cutoff: '' };
            return (
              <fieldset key={k.key} style={fieldsetStyle}>
                <legend style={{ padding: '0 6px' }}>{k.label}</legend>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label>
                    <div style={{ fontSize: 12, color: '#9aa4b2' }}>Allowed (comma-separated)</div>
                    <input
                      name={`q.${k.key}.allowed`}
                      defaultValue={(p.allowed || []).join(', ')}
                      placeholder="720p, 1080p, 2160p"
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: 12, color: '#9aa4b2' }}>Cutoff</div>
                    <input
                      name={`q.${k.key}.cutoff`}
                      defaultValue={p.cutoff || ''}
                      placeholder="1080p"
                      style={inputStyle}
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}
          <div>
            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? 'Saving...' : 'Save Quality'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function WantedPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    fetch('/api/wanted')
      .then((r) => r.json())
      .then((j) => setItems(Array.isArray(j.items) ? j.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const removeItem = async (kind: string, id: string) => {
    try {
      const res = await fetch(`/api/wanted/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const j = await res.json();
      if (j.ok) setItems(Array.isArray(j.items) ? j.items : []);
    } catch (_e) {
      // ignore
    }
  };

  return (
    <section>
      <h2>Activity - Wanted</h2>
      {loading && <p style={{ color: '#9aa4b2' }}>Loading…</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>Nothing in Wanted.</p>
      )}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it) => (
            <div
              key={`${it.kind}:${it.id}`}
              style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 8 }}
            >
              <div style={{ color: '#9aa4b2', fontSize: 12 }}>{it.kind}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>{it.title}</div>
                <button style={buttonStyle} onClick={() => removeItem(it.kind, it.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CalendarPage() {
  const [events, setEvents] = React.useState<any[]>([]);
  const [loadingCal, setLoadingCal] = React.useState(false);
  React.useEffect(() => {
    setLoadingCal(true);
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((j) => setEvents(Array.isArray(j.events) ? j.events : []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingCal(false));
  }, []);
  return (
    <section>
      <h2>Calendar</h2>
      {loadingCal && <p style={{ color: '#9aa4b2' }}>Loading…</p>}
      {!loadingCal && events.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>No upcoming episodes.</p>
      )}
      {!loadingCal && events.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {events.map((ev, i) => (
            <div
              key={i}
              style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 8 }}
            >
              <div style={{ color: '#9aa4b2', fontSize: 12 }}>{ev.date}</div>
              <div>{ev.title}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LibraryList({
  kind,
  onOpenArtwork,
}: {
  kind: KindKey;
  onOpenArtwork: (title: string) => void;
}) {
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

  // Refresh list when artwork changes
  React.useEffect(() => {
    const handler = (e: any) => {
      try {
        const d = e.detail || {};
        if (!d || !d.title) return;
        setItems((prev) =>
          prev.map((it) =>
            it.title === d.title
              ? {
                  ...it,
                  ...(d.tab === 'poster' ? { posterUrl: d.url } : {}),
                  ...(d.tab === 'background' ? { backgroundUrl: d.url } : {}),
                }
              : it
          )
        );
      } catch (_e) {
        /* ignore */
      }
    };
    window.addEventListener('library:changed', handler as any);
    return () => window.removeEventListener('library:changed', handler as any);
  }, []);

  // Compute an estimated column count based on container width
  React.useEffect(() => {
    const el = gridRef.current;
    const RO: any = (window as any).ResizeObserver;
    if (!el || typeof RO === 'undefined') return;
    const gap = 12; // keep in sync with grid gap
    const minCard = 220; // minimum card width
    const ro = new RO((entries: any) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      const c = Math.max(1, Math.floor((w + gap) / (minCard + gap)));
      setCols(c);
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
    const detailHref = `#/library/${kind}/item/${encodeURIComponent(
      it.id || it.title || ''
    )}`;
    return (
      <div key={it.id} style={{ position: 'relative' }}>
        {/* Action icons overlay */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 6,
            zIndex: 2,
          }}
        >
          <button
            type="button"
            title="Manage Artwork"
            aria-label={`Manage artwork for ${it.title || 'item'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenArtwork(it.title || '');
            }}
            style={{
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid #1f2937',
              background: '#0b1220',
              color: '#e5e7eb',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🖼️
          </button>
        </div>
        {/* Card link */}
        <a
          href={detailHref}
          style={{
            display: 'block',
            width: '100%',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
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
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = 'none';
                    const parent = img.parentElement;
                    if (parent) (parent as HTMLElement).style.background = '#111827';
                  }}
                />
              ) : (
                <span style={{ color: '#9aa4b2' }}>No artwork</span>
              )}
            </div>
            <div style={{ padding: 10 }}>{it.title || 'Untitled'}</div>
          </div>
        </a>
      </div>
    );
  };

  // skeletons will use estimated column count

  return (
    <section>
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {loading &&
          Array.from({ length: (cols || 6) * 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        {!loading &&
          items.length === 0 &&
          Array.from({ length: Math.max(6, cols || 6) }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        {!loading && items.length > 0 && items.map(renderCard)}
      </div>
    </section>
  );
}

function LibraryItemDetail({
  kind,
  id,
  onOpenArtwork,
}: {
  kind: KindKey;
  id: string;
  onOpenArtwork: (title: string) => void;
}) {
  const [item, setItem] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [lastVerify, setLastVerify] = React.useState<any | null>(null);
  const [profiles, setProfiles] = React.useState<any | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/library/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'not_found');
        if (!cancelled) setItem(json.item);
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
  }, [id]);

  React.useEffect(() => {
    fetch('/api/settings/quality')
      .then((r) => r.json())
      .then((j) => setProfiles(j.profiles || {}))
      .catch(() => setProfiles({}));
  }, []);

  React.useEffect(() => {
    fetch(`/api/verify/last?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => setLastVerify(j.result || null))
      .catch(() => setLastVerify(null));
  }, [kind, id]);

  const title = item?.title || 'Item';
  const poster = item?.posterUrl || null;

  const qualityRank: Record<string, number> = {
    '2160p': 4,
    '1080p': 3,
    '720p': 2,
    '480p': 1,
    sd: 1,
  };

  const detectQuality = (t: string): string | null => {
    const s = (t || '').toLowerCase();
    let best: string | null = null;
    for (const q of Object.keys(qualityRank)) {
      if (s.includes(q)) {
        const curRank = best ? (qualityRank[best] ?? -Infinity) : -Infinity;
        const qRank = (qualityRank as any)[q] ?? -Infinity;
        if (qRank > curRank) best = q;
      }
    }
    return best;
  };

  return (
    <section>
      {error && <div style={{ color: '#f87171' }}>{error}</div>}
      {loading && <div style={{ color: '#9aa4b2' }}>Loading…</div>}
      {!loading && (
        <div
          style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}
        >
          <div>
            <div
              style={{
                width: '100%',
                border: '1px solid #1f2937',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#0b1220',
                height: 360,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {poster ? (
                <img
                  src={poster}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#9aa4b2' }}>No artwork</span>
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button style={buttonStyle} onClick={() => onOpenArtwork(title)}>
                Manage Artwork
              </button>
              <button
                style={buttonStyle}
                onClick={() => alert('Manual Search coming soon')}
              >
                Manual Search
              </button>
              <button
                style={buttonStyle}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/verify/check', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kind, id, title }),
                    });
                    const j = await res.json();
                    if (j.ok) {
                      const count = Array.isArray(j.result?.issues)
                        ? j.result.issues.length
                        : 0;
                      alert(`Verification complete: ${count} issues`);
                    } else {
                      alert('Verification failed');
                    }
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                Verify Quality
              </button>
              <button
                style={buttonStyle}
                onClick={async () => {
                  try {
                    const res = await fetch('/api/wanted', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kind, id, title }),
                    });
                    const j = await res.json();
                    if (j.ok) alert('Added to Wanted');
                    else alert('Failed to add to Wanted');
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                Add to Wanted
              </button>
            </div>
          </div>
          <div>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <div style={{ color: '#9aa4b2', marginBottom: 12 }}>
              Kind: {kind}
            </div>
            <div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Quality Verification</strong>
                <span style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {lastVerify?.analyzedAt ? new Date(lastVerify.analyzedAt).toLocaleString() : 'No result'}
                </span>
              </div>
              <div style={{ color: '#9aa4b2', marginTop: 6 }}>
                {lastVerify
                  ? `${(lastVerify.issues || []).length} issues — top severity: ${lastVerify.topSeverity || 'none'}`
                  : 'Run Verify Quality to generate a report.'}
              </div>
              {lastVerify && Array.isArray(lastVerify.issues) && lastVerify.issues.length > 0 && (
                <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                  {lastVerify.issues.map((it: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: 6,
                          marginRight: 6,
                          fontSize: 12,
                          color: '#e5e7eb',
                          background:
                            it.severity === 'error'
                              ? '#b91c1c'
                              : it.severity === 'warn'
                                ? '#b45309'
                                : '#374151',
                        }}
                      >
                        {String(it.severity || 'info').toUpperCase()}
                      </span>
                      <strong style={{ marginRight: 6 }}>{String(it.kind || 'unknown')}</strong>
                      <span style={{ color: '#9aa4b2' }}>{String(it.message || '')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div
              style={{
                borderTop: '1px solid #1f2937',
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <h3>Manual Search</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!query || query.trim().length < 2) return;
                  setSearching(true);
                  try {
                    const r = await fetch('/api/indexers/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ q: query.trim() }),
                    });
                    const j = await r.json();
                    setResults(Array.isArray(j.results) ? j.results : []);
                  } catch (e2) {
                    alert((e2 as Error).message);
                  } finally {
                    setSearching(false);
                  }
                }}
                style={{ display: 'flex', gap: 8, marginBottom: 8 }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search releases for ${title}`}
                  style={inputStyle}
                />
                <button style={buttonStyle} disabled={searching}>
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </form>
              <div style={{ border: '1px solid #1f2937', borderRadius: 8 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 100px 100px',
                    gap: 8,
                    padding: 8,
                    borderBottom: '1px solid #1f2937',
                    color: '#9aa4b2',
                    fontSize: 12,
                  }}
                >
                  <div>Title</div>
                  <div>Size</div>
                  <div>Seeders</div>
                  <div>Action</div>
                </div>
                <div>
                  {results.map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 100px 100px',
                        gap: 8,
                        padding: 8,
                        borderBottom: '1px solid #1f2937',
                      }}
                    >
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {(() => {
                          const t = r.title || 'N/A';
                          const q = detectQuality(String(t));
                          const prof = (profiles || {})[kind as any] || {
                            allowed: [],
                            cutoff: '',
                          };
                          const allowedList = Array.isArray(prof.allowed)
                            ? prof.allowed.map((x: any) => String(x).toLowerCase())
                            : [];
                          const cutoff = String(prof.cutoff || '').toLowerCase();
                          const allowed =
                            allowedList.length === 0 ||
                            (q ? allowedList.includes(q) : false);
                          const meetsCutoff = q && cutoff
                            ? (qualityRank[q] || 0) >= (qualityRank[cutoff] || 0)
                            : true;
                          return (
                            <>
                              {t}
                              {q && (
                                <span style={{ color: '#9aa4b2', marginLeft: 6 }}>
                                  [{q.toUpperCase()}]
                                </span>
                              )}
                              {allowed && q && cutoff && !meetsCutoff && (
                                <span style={{ color: '#f59e0b', marginLeft: 8 }}>
                                  below cutoff
                                </span>
                              )}
                              {!allowed && (
                                <span style={{ color: '#ef4444', marginLeft: 8 }}>
                                  not allowed
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ color: '#9aa4b2' }}>{r.size || '-'}</div>
                      <div style={{ color: '#9aa4b2' }}>
                        {typeof r.seeders === 'number' ? r.seeders : '-'}
                      </div>
                      <div>
                        <button
                          style={buttonStyle}
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/downloads/grab', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  kind,
                                  id: '',
                                  title: r.title,
                                  link: (r as any).link,
                                  protocol: (r as any).protocol || 'torrent',
                                }),
                              });
                              const j = await res.json();
                              if (j.ok) alert('Queued for download');
                              else alert('Grab failed: ' + (j.error || 'unknown'));
                            } catch (e) {
                              alert((e as Error).message);
                            }
                          }}
                          disabled={(() => {
                            const t = r.title || '';
                            const q = detectQuality(String(t));
                            const prof = (profiles || {})[kind as any] || {
                              allowed: [],
                              cutoff: '',
                            };
                            const allowedList = Array.isArray(prof.allowed)
                              ? prof.allowed.map((x: any) => String(x).toLowerCase())
                              : [];
                            if (allowedList.length === 0) return false;
                            return !(q && allowedList.includes(q));
                          })()}
                        >
                          Grab
                        </button>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <div style={{ padding: 12, color: '#9aa4b2' }}>
                      No results.
                    </div>
                  )}
                </div>
              </div>
            </div>
            {kind === 'series' && (
              <div>
                <h3>Seasons</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      style={{
                        border: '1px solid #1f2937',
                        borderRadius: 8,
                        padding: 8,
                      }}
                    >
                      Season {s} — Episodes (placeholder)
                    </div>
                  ))}
                </div>
              </div>
            )}
            {kind === 'movies' && (
              <div>
                <h3>Releases</h3>
                <div style={{ color: '#9aa4b2' }}>
                  Releases list (placeholder)
                </div>
              </div>
            )}
            {kind === 'music' && (
              <div>
                <h3>Albums / Tracks</h3>
                <div style={{ color: '#9aa4b2' }}>
                  Albums/tracks (placeholder)
                </div>
              </div>
            )}
            {kind === 'books' && (
              <div>
                <h3>Volumes / Chapters</h3>
                <div style={{ color: '#9aa4b2' }}>
                  Volumes/chapters (placeholder)
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
