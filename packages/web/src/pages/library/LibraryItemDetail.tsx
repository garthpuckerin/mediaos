import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { KindKey } from '../../utils/routing';
import { pushToast } from '../../utils/toast';
import { useArtwork } from '../../contexts/ArtworkContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';

export function LibraryItemDetail() {
  const { kind: kindParam, id: idParam } = useParams<{
    kind: string;
    id: string;
  }>();
  const kind = (kindParam || 'series') as KindKey;
  const id = idParam || '';
  const navigate = useNavigate();
  const { openArtwork } = useArtwork();

  const [settings, setSettings] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/settings/downloaders')
      .then((r) => r.json())
      .then((j) => setSettings(j.downloaders || {}))
      .catch(() => {});
  }, []);
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
        navigate(
          `/library/${toPlural(payload.kind)}/item/${encodeURIComponent(id)}`,
          { replace: true }
        );
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
      navigate(`/library/${kind}/list`);
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
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-4">
            <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-gray-800 bg-gray-950 relative group">
              {poster ? (
                <img
                  src={poster}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No artwork
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={() => openArtwork(title)}>
                Manage Artwork
              </Button>
              <Button
                variant="secondary"
                onClick={() => pushToast('info', 'Manual search coming soon')}
              >
                Manual Search
              </Button>
              <Button
                variant="secondary"
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
              </Button>
              <Button
                variant="secondary"
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
              </Button>
              <Button
                variant="secondary"
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
              </Button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white m-0">{title}</h2>
              {!editMode && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    disabled={deleting}
                    onClick={onDelete}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              )}
            </div>
            {editMode && (
              <Card className="mb-6">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-[1fr_180px] gap-4">
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">Title</div>
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <div className="text-xs text-gray-400">Kind</div>
                      <select
                        value={newKind}
                        onChange={(e) => setNewKind(e.target.value as any)}
                        className="flex h-10 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      >
                        <option value="series">Series</option>
                        <option value="movie">Movie</option>
                        <option value="book">Book</option>
                        <option value="music">Music</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={savingEdit} onClick={onSaveEdit}>
                      {savingEdit ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditMode(false);
                        setNewTitle(String(item?.title || ''));
                        setNewKind(String(item?.kind || 'series') as any);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="text-gray-400 mb-6 capitalize">Kind: {kind}</div>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <strong className="text-white">Quality Verification</strong>
                  <span className="text-xs text-gray-400">
                    {lastVerify?.analyzedAt
                      ? new Date(lastVerify.analyzedAt).toLocaleString()
                      : 'No result'}
                  </span>
                </div>
                <div className="text-gray-400 mb-4">
                  {lastVerify
                    ? `${(lastVerify.issues || []).length} issues — top severity: ${lastVerify.topSeverity || 'none'}`
                    : 'Run Verify Quality to generate a report.'}
                </div>
                {lastVerify &&
                  Array.isArray(lastVerify.issues) &&
                  lastVerify.issues.length > 0 && (
                    <ul className="pl-4 space-y-1">
                      {lastVerify.issues.map((it: any, idx: number) => (
                        <li key={idx} className="text-sm">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-xs mr-2 text-gray-200 ${
                              it.severity === 'error'
                                ? 'bg-red-700'
                                : it.severity === 'warn'
                                  ? 'bg-amber-700'
                                  : 'bg-gray-700'
                            }`}
                          >
                            {String(it.severity || 'info').toUpperCase()}
                          </span>
                          <strong className="mr-2 text-gray-300">
                            {String(it.kind || 'unknown')}
                          </strong>
                          <span className="text-gray-400">
                            {String(it.message || '')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <strong className="text-white">Last Grab</strong>
                  <span className="text-xs text-gray-400">
                    {lastGrab?.at
                      ? new Date(lastGrab.at).toLocaleString()
                      : 'No grab yet'}
                  </span>
                </div>
                <div className="text-gray-400 mb-4">
                  {lastGrab
                    ? `Client: ${lastGrab.client || 'unknown'} - Protocol: ${lastGrab.protocol || '-'}`
                    : 'Once a grab is queued, details will appear here.'}
                </div>
                {lastGrab && (
                  <div className="flex gap-4 mb-4">
                    <span
                      className={
                        lastGrab.ok ? 'text-emerald-400' : 'text-red-400'
                      }
                    >
                      {lastGrab.ok ? 'Success' : 'Failed'}
                    </span>
                    {lastGrab.status && (
                      <span className="text-gray-400">
                        Status: {lastGrab.status}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={!lastGrab || !lastGrab.link}
                    onClick={handleRegrab}
                  >
                    Re-grab Last
                  </Button>
                  {lastGrab &&
                    String(lastGrab.client || '') === 'sabnzbd' &&
                    settings?.sabnzbd?.baseUrl && (
                      <Button
                        variant="secondary"
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
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
            <div className="mt-8 pt-6 border-t border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">
                NZB Upload (SAB)
              </h3>
              <div className="flex gap-4 mb-6">
                <Input
                  type="file"
                  accept=".nzb,application/x-nzb"
                  onChange={(e) =>
                    setNzbFile(
                      e.target.files && e.target.files[0]
                        ? e.target.files[0]
                        : null
                    )
                  }
                  className="p-1 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
                <Button
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
                </Button>
              </div>

              <h3 className="text-lg font-semibold text-white mb-4">
                Manual Search
              </h3>
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
                className="flex gap-4 mb-4"
              >
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search releases for ${title}`}
                />
                <Button disabled={searching}>
                  {searching ? 'Searching…' : 'Search'}
                </Button>
              </form>
              <div className="mb-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serverFilter}
                    onChange={(e) => setServerFilter(e.target.checked)}
                    className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500/50"
                  />
                  <span className="text-sm text-gray-400">
                    Server filter by Quality
                  </span>
                </label>
              </div>
              <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950">
                <div className="grid grid-cols-[1fr_120px_100px_100px] gap-4 p-3 border-b border-gray-800 text-xs text-gray-400 font-medium">
                  <div>Title</div>
                  <div>Size</div>
                  <div>Seeders</div>
                  <div>Action</div>
                </div>
                <div className="divide-y divide-gray-800">
                  {results.map((r, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_120px_100px_100px] gap-4 p-3 items-center hover:bg-gray-900/50 transition-colors"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-300">
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
                              <span title={t}>{t}</span>
                              {q && (
                                <span className="text-gray-500 ml-2 text-xs">
                                  [{q.toUpperCase()}]
                                </span>
                              )}
                              {allowed && q && cutoff && !meetsCutoff && (
                                <span className="text-amber-500 ml-2 text-xs">
                                  below cutoff
                                </span>
                              )}
                              {!allowed && (
                                <span className="text-red-500 ml-2 text-xs">
                                  not allowed
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {r.size || '-'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {typeof r.seeders === 'number' ? r.seeders : '-'}
                      </div>
                      <div>
                        <Button
                          size="sm"
                          variant="secondary"
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
                        </Button>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      No results found.
                    </div>
                  )}
                </div>
              </div>
            </div>
            {kind === 'series' && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Seasons
                </h3>
                <div className="space-y-2">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className="border border-gray-800 rounded-lg p-4 bg-gray-900/30 text-gray-400"
                    >
                      Season {s} — Episodes (placeholder)
                    </div>
                  ))}
                </div>
              </div>
            )}
            {kind === 'movies' && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Releases
                </h3>
                <div className="text-gray-500">Releases list (placeholder)</div>
              </div>
            )}
            {kind === 'music' && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Albums / Tracks
                </h3>
                <div className="text-gray-500">Albums/tracks (placeholder)</div>
              </div>
            )}
            {kind === 'books' && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Volumes / Chapters
                </h3>
                <div className="text-gray-500">
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
