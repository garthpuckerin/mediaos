import React from 'react';
import type { KindKey } from '../../utils/routing';
import { pushToast } from '../../utils/toast';

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

const fieldsetStyle: React.CSSProperties = {
  border: '1px solid #1f2937',
  borderRadius: 8,
  padding: 8,
};

export function LibraryItemDetail({
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

