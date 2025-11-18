import React, { useEffect, useState } from 'react';

import { ProtectedRoute } from '../components/ProtectedRoute';
import { UserMenu } from '../components/UserMenu';
import { useApiClient } from '../api/client';
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
    category?: string;
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
    category?: string;
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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
    const onToast = (e: Event) => {
      const ev = e as CustomEvent<ToastItem>;
      const t = ev.detail;
      if (!t) return;
      setToasts((prev) => [...prev, t]);
      const ttl = t.kind === 'error' ? 6000 : 3500;
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, ttl);
    };
    window.addEventListener('toast:push', onToast as any);
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
    { key: 'verification', label: 'Verification' },
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
          settings={settings}
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
    if (page === 'wanted') return <WantedPage />;
    if (page === 'queue') return <ActivityQueue />;
    if (page === 'history') return <ActivityHistory />;
    return (
      <section>
        <h2>Activity - {page.charAt(0).toUpperCase() + page.slice(1)}</h2>
        <p style={{ color: '#9aa4b2' }}>No content.</p>
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
                      category: s('qb.category') || undefined,
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
                      category: s('sab.category') || undefined,
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
                  pushToast('success', 'Settings saved');
                } catch (err) {
                  pushToast('error', (err as Error).message || 'Save failed');
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
                          category: str('qb.category') || undefined,
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
                            category: str('sab.category') || undefined,
                          };
                  try {
                    const r = await fetch('/api/settings/downloaders/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ client: key, settings: payload }),
                    });
                    const j = await r.json();
                    if (j.ok)
                      pushToast(
                        'success',
                        `${label} reachable${j.status ? ` (status ${j.status})` : ''}`
                      );
                    else
                      pushToast(
                        'error',
                        `${label} failed: ${j.error || 'unknown error'}`
                      );
                  } catch (err) {
                    pushToast('error', (err as Error).message || 'Test failed');
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
                      {key === 'qbittorrent' && (
                        <label>
                          <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                            Category
                          </div>
                          <input
                            name="qb.category"
                            placeholder="tv"
                            defaultValue={s.category || ''}
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
                      {key === 'sabnzbd' && (
                        <label>
                          <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                            Category
                          </div>
                          <input
                            name="sab.category"
                            placeholder="tv"
                            defaultValue={s.category || ''}
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
    if (page === 'verification') {
      return <VerifySettings />;
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
      {/* Toasts */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          display: 'grid',
          gap: 8,
          zIndex: 50,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setToasts((prev) => prev.filter((x) => x.id !== t.id));
              }
            }}
            style={{
              minWidth: 240,
              maxWidth: 360,
              borderRadius: 8,
              border: '1px solid #1f2937',
              padding: '8px 10px',
              cursor: 'pointer',
              background:
                t.kind === 'success'
                  ? '#064e3b'
                  : t.kind === 'error'
                    ? '#7f1d1d'
                    : '#111827',
              color: '#e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {t.title && (
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, color: '#e5e7eb' }}>{t.message}</div>
              {t.actionLabel && t.onAction && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      t.onAction && t.onAction();
                    } finally {
                      setToasts((prev) => prev.filter((x) => x.id !== t.id));
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #334155',
                    background: '#0b1220',
                    color: '#e5e7eb',
                    fontSize: 12,
                  }}
                >
                  {t.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
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
              pushToast('error', (e as Error).message || 'Failed');
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
                const cutoff = String(
                  data.get(`q.${k.key}.cutoff`) || ''
                ).trim();
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
              pushToast('success', 'Saved');
            } catch (err) {
              pushToast('error', (err as Error).message || 'Save failed');
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
                    <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                      Allowed (comma-separated)
                    </div>
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

function VerifySettings() {
  const [settings, setSettings] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/settings/verify')
      .then((r) => r.json())
      .then((j) => setSettings(j.settings || {}))
      .catch(() => setSettings({}));
  }, []);

  const toNum = (v: string) => {
    const n = Number(String(v || '').trim());
    return Number.isFinite(n) ? Math.trunc(n) : undefined;
  };

  const current = settings || {};
  const bitrate = current.minBitrateKbpsByHeight || {};

  return (
    <section>
      <h2>Settings - Verification</h2>
      {!settings && <p style={{ color: '#9aa4b2' }}>Loading…</p>}
      {settings && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const f = e.target as HTMLFormElement;
              const d = new FormData(f);
              const allowed = String(d.get('allowedContainers') || '')
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean);
              const payload: any = {
                minDurationSec: toNum(String(d.get('minDurationSec') || '')),
                minBitrateKbpsByHeight: {
                  '480': toNum(String(d.get('br480') || '')),
                  '720': toNum(String(d.get('br720') || '')),
                  '1080': toNum(String(d.get('br1080') || '')),
                  '2160': toNum(String(d.get('br2160') || '')),
                },
                allowedContainers: allowed.length > 0 ? allowed : undefined,
              };
              const res = await fetch('/api/settings/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error(await res.text());
              const j = await res.json();
              setSettings(j.settings || {});
              pushToast('success', 'Saved');
            } catch (err) {
              pushToast('error', (err as Error).message || 'Save failed');
            } finally {
              setSaving(false);
            }
          }}
          style={{ display: 'grid', gap: 16, maxWidth: 520 }}
        >
          <fieldset style={fieldsetStyle}>
            <legend style={{ padding: '0 6px' }}>Basics</legend>
            <label>
              <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                Min Duration (sec)
              </div>
              <input
                name="minDurationSec"
                type="number"
                min={1}
                defaultValue={current.minDurationSec}
                style={inputStyle}
              />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                Allowed Containers (comma-separated)
              </div>
              <input
                name="allowedContainers"
                defaultValue={(current.allowedContainers || []).join(', ')}
                placeholder="mp4, mkv"
                style={inputStyle}
              />
            </label>
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend style={{ padding: '0 6px' }}>
              Min Bitrate (kbps) by Height
            </legend>
            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: '1fr 1fr',
              }}
            >
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>480p</div>
                <input
                  name="br480"
                  type="number"
                  defaultValue={bitrate['480']}
                  style={inputStyle}
                />
              </label>
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>720p</div>
                <input
                  name="br720"
                  type="number"
                  defaultValue={bitrate['720']}
                  style={inputStyle}
                />
              </label>
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>1080p</div>
                <input
                  name="br1080"
                  type="number"
                  defaultValue={bitrate['1080']}
                  style={inputStyle}
                />
              </label>
              <label>
                <div style={{ fontSize: 12, color: '#9aa4b2' }}>2160p</div>
                <input
                  name="br2160"
                  type="number"
                  defaultValue={bitrate['2160']}
                  style={inputStyle}
                />
              </label>
            </div>
          </fieldset>

          <div>
            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? 'Saving…' : 'Save Verification Settings'}
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
  const [error, setError] = React.useState<string | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [scanSummary, setScanSummary] = React.useState<{
    scannedAt: string;
    results: Array<{ key: string; found: number; grabbed: number }>;
  } | null>(null);
  const loadWanted = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wanted');
      const j = await res.json();
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setItems([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadWanted();
  }, [loadWanted]);

  const removeItem = async (kind: string, id: string) => {
    try {
      const res = await fetch(
        `/api/wanted/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        }
      );
      const j = await res.json();
      if (j.ok) setItems(Array.isArray(j.items) ? j.items : []);
    } catch (_e) {
      // ignore
    }
  };

  const handleScan = async (enqueue = false) => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/wanted/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enqueue ? { enqueue: true } : {}),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'scan_failed');
      setScanSummary({
        scannedAt: j.scannedAt || new Date().toISOString(),
        results: Array.isArray(j.results)
          ? j.results.map((r: any) => ({
              key: String(r.key || ''),
              found: Number(r.found || 0),
              grabbed: Number(r.grabbed || 0),
            }))
          : [],
      });
      await loadWanted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <section>
      <h2>Activity - Wanted</h2>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          style={buttonStyle}
          disabled={scanning}
          onClick={() => handleScan(false)}
        >
          {scanning ? 'Scanning...' : 'Scan Wanted'}
        </button>
        <button
          style={buttonStyle}
          disabled={scanning}
          onClick={() => handleScan(true)}
        >
          {scanning ? 'Scanning...' : 'Scan & Queue'}
        </button>
      </div>
      {scanSummary && (
        <div
          style={{
            border: '1px solid #1f2937',
            borderRadius: 8,
            padding: 8,
            marginBottom: 12,
            background: '#0b1220',
          }}
        >
          <div style={{ color: '#9aa4b2', fontSize: 12 }}>
            Last scan: {new Date(scanSummary.scannedAt).toLocaleString()}
          </div>
          {scanSummary.results.length === 0 && (
            <div style={{ color: '#9aa4b2' }}>Nothing found.</div>
          )}
          {scanSummary.results.length > 0 && (
            <ul
              style={{ margin: 0, padding: '8px 0 0 18px', color: '#e5e7eb' }}
            >
              {scanSummary.results.map((row) => (
                <li key={row.key} style={{ marginBottom: 4 }}>
                  <strong>{row.key}</strong>{' '}
                  <span style={{ color: '#9aa4b2' }}>
                    Found {row.found} - Queued {row.grabbed}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {loading && <p style={{ color: '#9aa4b2' }}>Loading.</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>Nothing in Wanted.</p>
      )}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it) => (
            <div
              key={`${it.kind}:${it.id}`}
              style={{
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div style={{ color: '#9aa4b2', fontSize: 12 }}>{it.kind}</div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>{it.title}</div>
                <button
                  style={buttonStyle}
                  onClick={() => removeItem(it.kind, it.id)}
                >
                  Remove
                </button>
              </div>
              <div style={{ marginTop: 6, color: '#9aa4b2', fontSize: 12 }}>
                {it.lastScan
                  ? `Last scan ${new Date(it.lastScan.at).toLocaleString()} - Found ${it.lastScan.found} - Queued ${it.lastScan.grabbed}`
                  : 'Not scanned yet'}
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
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingCal(true);
      setError(null);
      try {
        const res = await fetch('/api/calendar');
        const j = await res.json();
        if (!cancelled) setEvents(Array.isArray(j.events) ? j.events : []);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoadingCal(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingSoon = React.useMemo(
    () =>
      events.filter(
        (ev: any) => typeof ev?.daysUntil === 'number' && ev.daysUntil <= 3
      ),
    [events]
  );

  const formatDay = (value?: string) => {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <section>
      <h2>Calendar</h2>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {upcomingSoon.length > 0 && (
        <div
          style={{
            border: '1px solid #1f2937',
            borderRadius: 8,
            padding: 8,
            marginBottom: 12,
            background: '#0b1220',
          }}
        >
          <div style={{ color: '#9aa4b2', fontSize: 12 }}>Coming up soon</div>
          <ul style={{ margin: 0, padding: '6px 0 0 18px' }}>
            {upcomingSoon.map((ev) => (
              <li
                key={ev.key || ev.day || ev.title}
                style={{ color: '#e5e7eb', marginBottom: 4 }}
              >
                {ev.title}{' '}
                <span style={{ color: '#9aa4b2' }}>
                  in {ev.daysUntil} day{ev.daysUntil === 1 ? '' : 's'} (
                  {formatDay(ev.day || ev.date)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {loadingCal && <p style={{ color: '#9aa4b2' }}>Loading.</p>}
      {!loadingCal && events.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>No upcoming episodes.</p>
      )}
      {!loadingCal && events.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {events.map((ev) => {
            const highlight =
              typeof ev?.daysUntil === 'number' && ev.daysUntil <= 3;
            return (
              <div
                key={ev.key || `${ev.day}-${ev.title}`}
                style={{
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: 10,
                  background: highlight ? '#132952' : '#0b1220',
                  boxShadow: highlight
                    ? '0 0 0 1px rgba(59,130,246,0.4)'
                    : 'none',
                }}
              >
                <div style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {formatDay(ev.day || ev.date)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  <a
                    href={`#/library/${String(ev.kind || 'series') === 'movie' ? 'movies' : String(ev.kind || 'series') === 'book' ? 'books' : String(ev.kind || 'series')}/item/${encodeURIComponent(ev.itemId || '')}`}
                    style={{ color: '#e5e7eb', textDecoration: 'none' }}
                  >
                    {ev.title}
                  </a>
                </div>
                <div style={{ color: '#9aa4b2', fontSize: 12, marginTop: 4 }}>
                  {ev.kind ? ev.kind.toUpperCase() : 'item'} - in {ev.daysUntil}{' '}
                  day{ev.daysUntil === 1 ? '' : 's'}
                </div>
                {ev.lastScan && (
                  <div style={{ color: '#9aa4b2', fontSize: 12, marginTop: 4 }}>
                    Last scan {new Date(ev.lastScan.at).toLocaleString()} -
                    Found {ev.lastScan.found}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActivityQueue() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch('/api/activity/live');
        let j = await r.json();
        if (!j?.ok) {
          const r2 = await fetch('/api/activity/queue');
          j = await r2.json();
        }
        if (!cancelled) setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const id = setInterval(() => void run(), 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  // const toPlural = (k: string) =>
  //   k === 'movie' ? 'movies' : k === 'book' ? 'books' : k;
  return (
    <section>
      <h2>Activity - Queue</h2>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {loading && <p style={{ color: '#9aa4b2' }}>Loading.</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>Queue is empty.</p>
      )}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it: any, i: number) => {
            const progress =
              typeof it.progress === 'number'
                ? Math.max(0, Math.min(1, it.progress))
                : undefined;
            const speed =
              typeof it.speedBps === 'number'
                ? `${(it.speedBps / 1024).toFixed(0)} KB/s`
                : '';
            const eta =
              typeof it.etaSec === 'number' && it.etaSec > 0
                ? `${Math.floor(it.etaSec / 60)}m`
                : it.eta || '';
            return (
              <div
                key={i}
                style={{
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <div style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {it.client || 'client'} • {it.protocol || '-'}{' '}
                  {it.category ? `• ${it.category}` : ''}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.title}
                  </div>
                  <div
                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    {/* Verify (best-effort) */}
                    <button
                      style={buttonStyle}
                      onClick={async () => {
                        try {
                          const libRes = await fetch('/api/library');
                          const lib = await libRes.json();
                          const items = Array.isArray(lib.items)
                            ? lib.items
                            : [];
                          const sanitize = (s: string) =>
                            String(s || '')
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, ' ')
                              .trim();
                          const titleSan = sanitize(String(it.title || ''));
                          const candidate = items.find((x: any) =>
                            titleSan.includes(sanitize(String(x.title || '')))
                          );
                          if (!candidate)
                            throw new Error('No matching library item');
                          const r = await fetch('/api/verify/jobs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              kind: candidate.kind,
                              id: candidate.id,
                              title: candidate.title,
                              phase: 'all',
                            }),
                          });
                          const j = await r.json();
                          if (!j.ok)
                            throw new Error(j.error || 'verify_failed');
                          pushToast('success', 'Verify started');
                        } catch (e) {
                          pushToast(
                            'error',
                            (e as Error).message || 'Verify failed'
                          );
                        }
                      }}
                    >
                      Verify
                    </button>
                    {/* Open in SAB */}
                    {String(it.client || '') === 'sabnzbd' && it.clientUrl && (
                      <button
                        style={buttonStyle}
                        onClick={() => {
                          try {
                            window.open(String(it.clientUrl), '_blank');
                          } catch (_) {
                            /* ignore */
                          }
                        }}
                      >
                        Open
                      </button>
                    )}
                    <button
                      style={buttonStyle}
                      onClick={async () => {
                        try {
                          const r = await fetch('/api/activity/action', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              client: it.client,
                              op: 'pause',
                              id: it.clientId,
                            }),
                          });
                          const j = await r.json();
                          if (!j.ok) throw new Error(j.error || 'pause_failed');
                          pushToast('success', 'Paused');
                        } catch (e) {
                          pushToast(
                            'error',
                            (e as Error).message || 'Pause failed'
                          );
                        }
                      }}
                    >
                      Pause
                    </button>
                    <button
                      style={buttonStyle}
                      onClick={async () => {
                        try {
                          const r = await fetch('/api/activity/action', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              client: it.client,
                              op: 'resume',
                              id: it.clientId,
                            }),
                          });
                          const j = await r.json();
                          if (!j.ok)
                            throw new Error(j.error || 'resume_failed');
                          pushToast('success', 'Resumed');
                        } catch (e) {
                          pushToast(
                            'error',
                            (e as Error).message || 'Resume failed'
                          );
                        }
                      }}
                    >
                      Resume
                    </button>
                    <button
                      style={{
                        ...buttonStyle,
                        borderColor: '#7f1d1d',
                        color: '#f87171',
                      }}
                      onClick={async () => {
                        if (!window.confirm('Remove from client queue?'))
                          return;
                        try {
                          const r = await fetch('/api/activity/action', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              client: it.client,
                              op: 'delete',
                              id: it.clientId,
                            }),
                          });
                          const j = await r.json();
                          if (!j.ok)
                            throw new Error(j.error || 'delete_failed');
                          pushToast('success', 'Removed');
                        } catch (e) {
                          pushToast(
                            'error',
                            (e as Error).message || 'Remove failed'
                          );
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 8, color: '#9aa4b2', fontSize: 12 }}>
                  <span>{it.status || ''}</span>
                  {speed && <span> • {speed}</span>}
                  {eta && <span> • ETA {eta}</span>}
                </div>
                {typeof progress === 'number' && (
                  <div
                    style={{
                      marginTop: 6,
                      height: 6,
                      borderRadius: 999,
                      background: '#111827',
                    }}
                  >
                    <div
                      style={{
                        width: `${(progress * 100).toFixed(0)}%`,
                        height: 6,
                        borderRadius: 999,
                        background: '#2563eb',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActivityHistory() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch('/api/activity/history');
        const j = await r.json();
        if (!cancelled) setItems(Array.isArray(j.items) ? j.items : []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const id = setInterval(() => void run(), 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  const toPlural = (k: string) =>
    k === 'movie' ? 'movies' : k === 'book' ? 'books' : k;
  return (
    <section>
      <h2>Activity - History</h2>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {loading && <p style={{ color: '#9aa4b2' }}>Loading.</p>}
      {!loading && items.length === 0 && (
        <p style={{ color: '#9aa4b2' }}>History is empty.</p>
      )}
      {!loading && items.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div style={{ color: '#9aa4b2', fontSize: 12 }}>
                {new Date(it.at || Date.now()).toLocaleString()} •{' '}
                {it.kind || '-'} • {it.client || 'client'}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {it.title}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={buttonStyle}
                    onClick={async () => {
                      try {
                        const libRes = await fetch('/api/library');
                        const lib = await libRes.json();
                        const arr = Array.isArray(lib.items) ? lib.items : [];
                        const sanitize = (s: string) =>
                          String(s || '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, ' ')
                            .trim();
                        const titleSan = sanitize(String(it.title || ''));
                        const candidate = arr.find((x: any) =>
                          titleSan.includes(sanitize(String(x.title || '')))
                        );
                        if (!candidate)
                          throw new Error('No matching library item');
                        const r = await fetch('/api/verify/jobs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            kind: candidate.kind,
                            id: candidate.id,
                            title: candidate.title,
                            phase: 'all',
                          }),
                        });
                        const j = await r.json();
                        if (!j.ok) throw new Error(j.error || 'verify_failed');
                        pushToast('success', 'Verify started');
                      } catch (e) {
                        pushToast(
                          'error',
                          (e as Error).message || 'Verify failed'
                        );
                      }
                    }}
                  >
                    Verify again
                  </button>
                  {it.id && it.kind && (
                    <a
                      href={`#/library/${toPlural(String(it.kind))}/item/${encodeURIComponent(it.id)}`}
                      style={
                        {
                          ...buttonStyle,
                          textDecoration: 'none',
                          display: 'inline-block',
                        } as any
                      }
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
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
  const [statusMap, setStatusMap] = React.useState<
    Record<string, { lastGrab?: any; lastVerify?: any }>
  >({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState<string>('');
  const [editKind, setEditKind] = React.useState<
    'movie' | 'series' | 'book' | 'music'
  >('series');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (!items || items.length === 0) {
      setStatusMap({});
      return;
    }
    let cancelled = false;
    const singular = toSingular(kind);
    const run = async () => {
      const updates: Record<string, { lastGrab?: any; lastVerify?: any }> = {};
      await Promise.all(
        items.map(async (it) => {
          const key = it.id || it.title;
          if (!key) return;
          try {
            const [lastGrab, lastVerify] = await Promise.all([
              fetch(
                `/api/downloads/last?kind=${encodeURIComponent(
                  singular
                )}&id=${encodeURIComponent(key)}`
              )
                .then((r) => r.json())
                .catch(() => ({ last: null })),
              fetch(
                `/api/verify/last?kind=${encodeURIComponent(
                  singular
                )}&id=${encodeURIComponent(key)}`
              )
                .then((r) => r.json())
                .catch(() => ({ result: null })),
            ]);
            updates[key] = {
              lastGrab: lastGrab?.last || null,
              lastVerify: lastVerify?.result || null,
            };
          } catch (_e) {
            // ignore status fetch errors per item
          }
        })
      );
      if (!cancelled) setStatusMap(updates);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [items, kind]);

  React.useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e.detail || {};
        if (!detail || !detail.id) return;
        if (detail.kind && toSingular(kind) !== detail.kind) return;
        setStatusMap((prev) => {
          const current = prev[detail.id] || {};
          return {
            ...prev,
            [detail.id]: {
              lastGrab:
                detail.lastGrab !== undefined
                  ? detail.lastGrab
                  : current.lastGrab,
              lastVerify:
                detail.lastVerify !== undefined
                  ? detail.lastVerify
                  : current.lastVerify,
            },
          };
        });
      } catch (_e) {
        // ignore
      }
    };
    window.addEventListener('library:status', handler as any);
    return () => window.removeEventListener('library:status', handler as any);
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

  const onEditStart = (it: any) => {
    const id = it.id || it.title;
    if (!id) return;
    setEditingId(String(id));
    setEditTitle(String(it.title || ''));
    const k = String(it.kind || 'series');
    setEditKind(
      k === 'movie' || k === 'series' || k === 'book' || k === 'music'
        ? (k as any)
        : 'series'
    );
  };
  const onEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
    setEditKind('series');
    setSavingEdit(false);
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onEditSave = async (it: any) => {
    try {
      setSavingEdit(true);
      const payload: any = {};
      if (editTitle && editTitle.trim() !== String(it.title || ''))
        payload.title = editTitle.trim();
      if (editKind && editKind !== String(it.kind || ''))
        payload.kind = editKind;
      const id = it.id || it.title;
      const res = await fetch(
        `/api/library/${encodeURIComponent(String(id))}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'update_failed');
      setItems((prev) => {
        const next = prev.map((x) =>
          x.id === it.id ? { ...x, ...j.item } : x
        );
        const singular = toSingular(kind);
        return next.filter((x) => x.kind === singular);
      });
      pushToast('success', 'Item updated');
      onEditCancel();
    } catch (e) {
      pushToast('error', (e as Error).message || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };
  const onDelete = async (it: any) => {
    try {
      const id = it.id || it.title;
      if (!id) return;
      if (!window.confirm('Delete this item from Library?')) return;
      setDeletingId(String(id));
      const res = await fetch(
        `/api/library/${encodeURIComponent(String(id))}`,
        { method: 'DELETE' }
      );
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'delete_failed');
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      const removed = j.item;
      pushToast('success', 'Item deleted', undefined, {
        label: 'Undo',
        run: async () => {
          try {
            const r = await fetch('/api/library', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: removed?.id,
                kind: removed?.kind,
                title: removed?.title,
                posterUrl: removed?.posterUrl,
                backgroundUrl: removed?.backgroundUrl,
              }),
            });
            const jj = await r.json();
            if (jj?.ok && jj.item) {
              setItems((prev) => [jj.item, ...prev]);
              pushToast('success', 'Item restored');
            } else {
              pushToast('error', 'Restore failed');
            }
          } catch (_e) {
            pushToast('error', 'Restore failed');
          }
        },
      });
    } catch (e) {
      pushToast('error', (e as Error).message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const renderCard = (it: any) => {
    const poster = typeof it.posterUrl === 'string' ? it.posterUrl : null;
    const itemKey = it.id || it.title || '';
    const status = itemKey ? statusMap[itemKey] || {} : {};
    const grabFailed = status.lastGrab && status.lastGrab.ok === false;
    const verifySeverity = status.lastVerify?.topSeverity;
    const verifyWarn = verifySeverity === 'warn' || verifySeverity === 'error';
    const detailHref = `#/library/${kind}/item/${encodeURIComponent(
      it.id || it.title || ''
    )}`;
    return (
      <div key={it.id || it.title} style={{ position: 'relative' }}>
        {/* Status badges & actions overlay */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'grid',
            gap: 6,
            justifyItems: 'end',
            zIndex: 2,
          }}
        >
          {grabFailed && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 999,
                fontSize: 11,
                background: '#7f1d1d',
                color: '#f87171',
              }}
            >
              Grab Failed
            </span>
          )}
          {verifyWarn && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 999,
                fontSize: 11,
                background: verifySeverity === 'error' ? '#7f1d1d' : '#78350f',
                color: '#fcd34d',
              }}
            >
              Verify {String(verifySeverity || '').toUpperCase()}
            </span>
          )}
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
            Art
          </button>
          <button
            type="button"
            title="Edit"
            aria-label={`Edit ${it.title || 'item'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditStart(it);
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
            Edit
          </button>
          <button
            type="button"
            title="Delete"
            aria-label={`Delete ${it.title || 'item'}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onDelete(it);
            }}
            disabled={deletingId === String(it.id || it.title)}
            style={{
              padding: '4px 6px',
              borderRadius: 8,
              border: '1px solid #7f1d1d',
              background: '#0b1220',
              color: '#f87171',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {deletingId === String(it.id || it.title) ? 'Del…' : 'Del'}
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
                    if (parent)
                      (parent as HTMLElement).style.background = '#111827';
                  }}
                />
              ) : (
                <span style={{ color: '#9aa4b2' }}>No artwork</span>
              )}
            </div>
            <div style={{ padding: 10 }}>
              <div>{it.title || 'Untitled'}</div>
              {(grabFailed || verifyWarn) && (
                <div style={{ color: '#9aa4b2', fontSize: 12, marginTop: 6 }}>
                  {grabFailed && (
                    <span>
                      Last grab failed
                      {status.lastGrab?.at
                        ? ` - ${new Date(status.lastGrab.at).toLocaleDateString()}`
                        : ''}
                    </span>
                  )}
                  {grabFailed && verifyWarn && <span> - </span>}
                  {verifyWarn && (
                    <span>
                      Verify {String(verifySeverity || '').toUpperCase()}
                      {status.lastVerify?.analyzedAt
                        ? ` - ${new Date(status.lastVerify.analyzedAt).toLocaleDateString()}`
                        : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
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
  settings,
  onOpenArtwork,
}: {
  kind: KindKey;
  id: string;
  settings: any;
  onOpenArtwork: (title: string) => void;
}) {
  const [item, setItem] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [serverFilter, setServerFilter] = React.useState(false);
  // const [protoFilter, setProtoFilter] = React.useState<
  //   'any' | 'torrent' | 'usenet'
  // >('any');
  // const [minSeeders, setMinSeeders] = React.useState<string>('');
  // const [minSize, setMinSize] = React.useState<string>('');
  // const [maxSize, setMaxSize] = React.useState<string>('');
  const [lastVerify, setLastVerify] = React.useState<any | null>(null);
  const [verifyJob, setVerifyJob] = React.useState<{
    id: string;
    status: string;
  } | null>(null);
  const [profiles, setProfiles] = React.useState<any | null>(null);
  const [lastGrab, setLastGrab] = React.useState<any | null>(null);
  const [nzbFile, setNzbFile] = React.useState<File | null>(null);
  const [nzbUploading, setNzbUploading] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newKind, setNewKind] = React.useState<
    'movie' | 'series' | 'book' | 'music'
  >('series');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const singularKind =
    kind === 'movies' ? 'movie' : kind === 'books' ? 'book' : kind;
  const refreshLastGrab = React.useCallback(() => {
    fetch(
      `/api/downloads/last?kind=${encodeURIComponent(
        singularKind
      )}&id=${encodeURIComponent(id)}`
    )
      .then((r) => r.json())
      .then((j) => {
        const next = j.last || null;
        setLastGrab(next);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastGrab: next ?? null },
          })
        );
      })
      .catch(() => {
        setLastGrab(null);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastGrab: null },
          })
        );
      });
  }, [singularKind, id]);

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
        if (!cancelled) {
          setItem(json.item);
          setNewTitle(String(json.item?.title || ''));
          const k = String(json.item?.kind || 'series');
          setNewKind(
            k === 'movie' || k === 'series' || k === 'book' || k === 'music'
              ? (k as any)
              : 'series'
          );
        }
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
    fetch(
      `/api/verify/last?kind=${encodeURIComponent(
        singularKind
      )}&id=${encodeURIComponent(id)}`
    )
      .then((r) => r.json())
      .then((j) => {
        const next = j.result || null;
        setLastVerify(next);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastVerify: next ?? null },
          })
        );
      })
      .catch(() => {
        setLastVerify(null);
        window.dispatchEvent(
          new CustomEvent('library:status', {
            detail: { kind: singularKind, id, lastVerify: null },
          })
        );
      });
    // Auto-refresh a few times to catch background verify completions
    let cancelled = false;
    let ticks = 0;
    const maxTicks = 8;
    const poll = async () => {
      try {
        const r = await fetch(
          `/api/verify/last?kind=${encodeURIComponent(singularKind)}&id=${encodeURIComponent(id)}`
        );
        const j = await r.json();
        if (!cancelled) setLastVerify(j.result || null);
      } catch {
        /* ignore */
      }
    };
    const int = setInterval(async () => {
      if (cancelled) return;
      ticks++;
      await poll();
      if (ticks >= maxTicks) clearInterval(int);
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(int);
    };
  }, [singularKind, id]);

  React.useEffect(() => {
    refreshLastGrab();
  }, [refreshLastGrab]);

  const title = item?.title || 'Item';
  const poster = item?.posterUrl || null;
  const toPlural = (k: string) =>
    k === 'movie' ? 'movies' : k === 'book' ? 'books' : k;
  const onSaveEdit = async () => {
    if (!item) return;
    setSavingEdit(true);
    try {
      const payload: any = {};
      if (newTitle && newTitle.trim() !== String(item.title || ''))
        payload.title = newTitle.trim();
      if (newKind && newKind !== String(item.kind || ''))
        payload.kind = newKind;
      if (Object.keys(payload).length === 0) {
        setEditMode(false);
        return;
      }
      const res = await fetch(`/api/library/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'update_failed');
      setItem(j.item);
      setEditMode(false);
      pushToast('success', 'Item updated');
      if (payload.kind && toPlural(payload.kind) !== kind) {
        // Navigate to new kind path with same id
        window.location.hash = `#/library/${toPlural(payload.kind)}/item/${encodeURIComponent(id)}`;
      }
    } catch (e) {
      pushToast('error', (e as Error).message || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };
  const onDelete = async () => {
    if (!item || deleting) return;
    // simple confirm for destructive action
    if (!window.confirm('Delete this item? This removes it from Library.'))
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'delete_failed');
      const removed = j.item;
      pushToast('success', 'Item deleted', undefined, {
        label: 'Undo',
        run: async () => {
          try {
            await fetch('/api/library', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: removed?.id,
                kind: removed?.kind,
                title: removed?.title,
                posterUrl: removed?.posterUrl,
                backgroundUrl: removed?.backgroundUrl,
              }),
            });
            pushToast('success', 'Item restored');
          } catch (_e) {
            pushToast('error', 'Restore failed');
          }
        },
      });
      // Navigate back to the list for current kind
      window.location.hash = `#/library/${kind}/list`;
    } catch (e) {
      pushToast('error', (e as Error).message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

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

  const handleRegrab = async () => {
    if (!lastGrab || !lastGrab.link) return;
    try {
      const res = await fetch('/api/downloads/grab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          id,
          title: lastGrab.title || title,
          link: lastGrab.link,
          protocol: lastGrab.protocol || 'torrent',
        }),
      });
      const j = await res.json();
      if (j.ok) {
        pushToast('success', 'Re-grab queued');
        refreshLastGrab();
      } else {
        pushToast('error', 'Re-grab failed: ' + (j.error || 'unknown'));
      }
    } catch (e) {
      pushToast('error', (e as Error).message || 'Re-grab failed');
    }
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
                onClick={() => pushToast('info', 'Manual search coming soon')}
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
                      pushToast(
                        'success',
                        `Verification complete: ${count} issues`
                      );
                    } else {
                      pushToast('error', 'Verification failed');
                    }
                  } catch (e) {
                    pushToast(
                      'error',
                      (e as Error).message || 'Verification failed'
                    );
                  }
                }}
              >
                Verify Quality
              </button>
              <button
                style={buttonStyle}
                disabled={
                  !!verifyJob &&
                  verifyJob.status !== 'completed' &&
                  verifyJob.status !== 'failed'
                }
                onClick={async () => {
                  try {
                    setVerifyJob({ id, status: 'queued' });
                    const res = await fetch('/api/verify/jobs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kind, id, title, phase: 'all' }),
                    });
                    const j = await res.json();
                    if (!j.ok) throw new Error(j.error || 'failed');
                    const jobId = j.jobId as string;
                    setVerifyJob({ id: jobId, status: 'queued' });
                    const start = Date.now();
                    const poll = async () => {
                      try {
                        const r2 = await fetch(
                          `/api/verify/jobs/${encodeURIComponent(jobId)}`
                        );
                        const j2 = await r2.json();
                        if (j2.ok && j2.job) {
                          setVerifyJob({ id: jobId, status: j2.job.status });
                          if (
                            j2.job.status === 'completed' ||
                            j2.job.status === 'failed'
                          ) {
                            // refresh last verify panel
                            const r3 = await fetch(
                              `/api/verify/last?kind=${encodeURIComponent(singularKind)}&id=${encodeURIComponent(id)}`
                            );
                            const j3 = await r3.json();
                            const nextVerify = j3.result || null;
                            setLastVerify(nextVerify);
                            window.dispatchEvent(
                              new CustomEvent('library:status', {
                                detail: {
                                  kind: singularKind,
                                  id,
                                  lastVerify: nextVerify ?? null,
                                },
                              })
                            );
                            return;
                          }
                        }
                      } catch (_e) {
                        void 0;
                      }
                      if (Date.now() - start < 15000) setTimeout(poll, 1000);
                      else
                        setVerifyJob((v) =>
                          v ? { ...v, status: 'failed' } : v
                        );
                    };
                    setTimeout(poll, 500);
                  } catch (e) {
                    pushToast('error', (e as Error).message || 'Failed');
                  }
                }}
              >
                {verifyJob &&
                verifyJob.status !== 'completed' &&
                verifyJob.status !== 'failed'
                  ? 'Verifying...'
                  : 'Verify (Async)'}
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
                    if (j.ok) pushToast('success', 'Added to Wanted');
                    else pushToast('error', 'Failed to add to Wanted');
                  } catch (e) {
                    pushToast('error', (e as Error).message || 'Failed to add');
                  }
                }}
              >
                Add to Wanted
              </button>
            </div>
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <h2 style={{ marginTop: 0 }}>{title}</h2>
              {!editMode && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={buttonStyle} onClick={() => setEditMode(true)}>
                    Edit
                  </button>
                  <button
                    style={{
                      ...buttonStyle,
                      borderColor: '#7f1d1d',
                      color: '#f87171',
                    }}
                    disabled={deleting}
                    onClick={onDelete}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
            {editMode && (
              <div
                style={{
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 180px',
                    gap: 8,
                  }}
                >
                  <label>
                    <div style={{ fontSize: 12, color: '#9aa4b2' }}>Title</div>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: 12, color: '#9aa4b2' }}>Kind</div>
                    <select
                      value={newKind}
                      onChange={(e) => setNewKind(e.target.value as any)}
                      style={{ ...inputStyle, padding: '6px 10px' }}
                    >
                      <option value="series">Series</option>
                      <option value="movie">Movie</option>
                      <option value="book">Book</option>
                      <option value="music">Music</option>
                    </select>
                  </label>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button
                    style={buttonStyle}
                    disabled={savingEdit}
                    onClick={onSaveEdit}
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    style={buttonStyle}
                    onClick={() => {
                      setEditMode(false);
                      setNewTitle(String(item?.title || ''));
                      setNewKind(String(item?.kind || 'series') as any);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div style={{ color: '#9aa4b2', marginBottom: 12 }}>
              Kind: {kind}
            </div>
            <div
              style={{
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Quality Verification</strong>
                <span style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {lastVerify?.analyzedAt
                    ? new Date(lastVerify.analyzedAt).toLocaleString()
                    : 'No result'}
                </span>
              </div>
              <div style={{ color: '#9aa4b2', marginTop: 6 }}>
                {lastVerify
                  ? `${(lastVerify.issues || []).length} issues — top severity: ${lastVerify.topSeverity || 'none'}`
                  : 'Run Verify Quality to generate a report.'}
              </div>
              {lastVerify &&
                Array.isArray(lastVerify.issues) &&
                lastVerify.issues.length > 0 && (
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
                        <strong style={{ marginRight: 6 }}>
                          {String(it.kind || 'unknown')}
                        </strong>
                        <span style={{ color: '#9aa4b2' }}>
                          {String(it.message || '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <div
              style={{
                border: '1px solid #1f2937',
                borderRadius: 8,
                padding: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Last Grab</strong>
                <span style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {lastGrab?.at
                    ? new Date(lastGrab.at).toLocaleString()
                    : 'No grab yet'}
                </span>
              </div>
              <div style={{ color: '#9aa4b2', marginTop: 6 }}>
                {lastGrab
                  ? `Client: ${lastGrab.client || 'unknown'} - Protocol: ${lastGrab.protocol || '-'}`
                  : 'Once a grab is queued, details will appear here.'}
              </div>
              {lastGrab && (
                <div
                  style={{
                    marginTop: 6,
                    display: 'flex',
                    gap: 8,
                    color: lastGrab.ok ? '#34d399' : '#f87171',
                  }}
                >
                  <span>{lastGrab.ok ? 'Success' : 'Failed'}</span>
                  {lastGrab.status && (
                    <span style={{ color: '#9aa4b2' }}>
                      Status: {lastGrab.status}
                    </span>
                  )}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <button
                  style={buttonStyle}
                  disabled={!lastGrab || !lastGrab.link}
                  onClick={handleRegrab}
                >
                  Re-grab Last
                </button>
                {lastGrab &&
                  String(lastGrab.client || '') === 'sabnzbd' &&
                  settings?.sabnzbd?.baseUrl && (
                    <button
                      style={{ ...buttonStyle, marginLeft: 8 }}
                      onClick={() => {
                        try {
                          window.open(
                            String(settings?.sabnzbd?.baseUrl || ''),
                            '_blank'
                          );
                        } catch (_) {
                          /* ignore */
                        }
                      }}
                    >
                      Open in SAB
                    </button>
                  )}
              </div>
            </div>
            <div
              style={{
                borderTop: '1px solid #1f2937',
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <h3>NZB Upload (SAB)</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="file"
                  accept=".nzb,application/x-nzb"
                  onChange={(e) =>
                    setNzbFile(
                      e.target.files && e.target.files[0]
                        ? e.target.files[0]
                        : null
                    )
                  }
                  style={{ ...inputStyle, padding: 6 }}
                />
                <button
                  style={buttonStyle}
                  disabled={!nzbFile || nzbUploading}
                  onClick={async () => {
                    if (!nzbFile) return;
                    setNzbUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append('kind', singularKind);
                      fd.append('id', id);
                      fd.append('title', title);
                      fd.append('protocol', 'usenet');
                      fd.append('nzbUpload', nzbFile);
                      const r = await fetch('/api/downloads/grab', {
                        method: 'POST',
                        body: fd,
                      });
                      const j = await r.json();
                      if (!j.ok) throw new Error(j.error || 'upload_failed');
                      pushToast(
                        'success',
                        j.queued ? 'Uploaded and queued' : 'Uploaded'
                      );
                      setNzbFile(null);
                      refreshLastGrab();
                    } catch (e) {
                      pushToast(
                        'error',
                        (e as Error).message || 'Upload failed'
                      );
                    } finally {
                      setNzbUploading(false);
                    }
                  }}
                >
                  {nzbUploading ? 'Uploading...' : 'Upload NZB'}
                </button>
              </div>

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
                      body: JSON.stringify({
                        q: query.trim(),
                        kind,
                        serverFilter,
                      }),
                    });
                    const j = await r.json();
                    setResults(Array.isArray(j.results) ? j.results : []);
                  } catch (e2) {
                    pushToast(
                      'error',
                      (e2 as Error).message || 'Search failed'
                    );
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
              <div style={{ margin: '4px 0 8px' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={serverFilter}
                    onChange={(e) => setServerFilter(e.target.checked)}
                  />
                  <span style={{ color: '#9aa4b2' }}>
                    Server filter by Quality
                  </span>
                </label>
              </div>
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
                            ? prof.allowed.map((x: any) =>
                                String(x).toLowerCase()
                              )
                            : [];
                          const cutoff = String(
                            prof.cutoff || ''
                          ).toLowerCase();
                          const allowed =
                            allowedList.length === 0 ||
                            (q ? allowedList.includes(q) : false);
                          const meetsCutoff =
                            q && cutoff
                              ? (qualityRank[q] || 0) >=
                                (qualityRank[cutoff] || 0)
                              : true;
                          return (
                            <>
                              {t}
                              {q && (
                                <span
                                  style={{ color: '#9aa4b2', marginLeft: 6 }}
                                >
                                  [{q.toUpperCase()}]
                                </span>
                              )}
                              {allowed && q && cutoff && !meetsCutoff && (
                                <span
                                  style={{ color: '#f59e0b', marginLeft: 8 }}
                                >
                                  below cutoff
                                </span>
                              )}
                              {!allowed && (
                                <span
                                  style={{ color: '#ef4444', marginLeft: 8 }}
                                >
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
                                  id,
                                  title: r.title,
                                  link: (r as any).link,
                                  protocol: (r as any).protocol || 'torrent',
                                }),
                              });
                              const j = await res.json();
                              if (j.ok)
                                pushToast('success', 'Queued for download');
                              else
                                pushToast(
                                  'error',
                                  'Grab failed: ' + (j.error || 'unknown')
                                );
                              if (j.ok) refreshLastGrab();
                            } catch (e) {
                              pushToast(
                                'error',
                                (e as Error).message || 'Grab failed'
                              );
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
                              ? prof.allowed.map((x: any) =>
                                  String(x).toLowerCase()
                                )
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
          onClick={() => pushToast('info', 'Search is not implemented yet')}
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
// Lightweight toast helpers
type ToastKind = 'success' | 'error' | 'info';
type ToastItem = {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};
function pushToast(
  kind: ToastKind,
  message: string,
  title?: string,
  action?: { label: string; run: () => void }
) {
  try {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const detail: ToastItem = {
      id,
      kind,
      message,
      ...(title !== undefined && { title }),
      ...(action?.label !== undefined && { actionLabel: action.label }),
      ...(action?.run !== undefined && { onAction: action.run }),
    };
    window.dispatchEvent(new CustomEvent('toast:push', { detail }));
  } catch {
    // fallback if events fail
    // eslint-disable-next-line no-alert
    alert(message);
  }
}
