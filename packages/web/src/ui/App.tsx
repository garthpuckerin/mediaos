import React, { useEffect, useState } from 'react';

import { ArtworkModal } from './ArtworkModal';
import { parseHash } from '../utils/routing';
import { pushToast, type ToastItem } from '../utils/toast';
import { manageArtwork } from '../utils/artwork';
import { IndexersSettings } from '../pages/settings/IndexersSettings';
import { QualitySettings } from '../pages/settings/QualitySettings';
import { VerifySettings } from '../pages/settings/VerifySettings';
import { ActivityQueue } from '../pages/activity/ActivityQueue';
import { ActivityHistory } from '../pages/activity/ActivityHistory';
import { WantedPage } from '../pages/activity/WantedPage';
import { LibraryList } from '../pages/library/LibraryList';
import { LibraryItemDetail } from '../pages/library/LibraryItemDetail';
import { LibraryAdd } from '../pages/library/LibraryAdd';
import { LibraryImportSection } from '../pages/library/LibraryImportSection';
import { CalendarPage } from '../pages/CalendarPage';

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
