import React from 'react';
import { pushToast } from '../../utils/toast';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import clsx from 'clsx';

// Icons
const IconDownload = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const IconPause = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconPlay = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconTrash = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const IconShield = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const IconExternalLink = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

const IconRefresh = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

interface QueueItem {
  title: string;
  status: string;
  progress?: number;
  speedBps?: number;
  etaSec?: number;
  eta?: string;
  client?: string;
  clientId?: string;
  clientUrl?: string;
  protocol?: string;
  category?: string;
  size?: string;
  sizeBytes?: number;
  downloadedBytes?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / 1024 / 1024).toFixed(2)} MB/s`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return '-';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function getStatusColor(status: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('download')) return 'text-emerald-400';
  if (s.includes('pause')) return 'text-amber-400';
  if (s.includes('error') || s.includes('fail')) return 'text-red-400';
  if (s.includes('queue')) return 'text-blue-400';
  if (s.includes('complete')) return 'text-emerald-400';
  return 'text-gray-400';
}

function getProgressColor(progress: number): string {
  if (progress >= 1) return 'bg-emerald-500';
  if (progress >= 0.5) return 'bg-indigo-500';
  if (progress >= 0.25) return 'bg-blue-500';
  return 'bg-blue-500';
}

export function ActivityQueue() {
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const fetchQueue = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/activity/live');
      let j = await r.json();
      if (!j?.ok) {
        const r2 = await fetch('/api/activity/queue');
        j = await r2.json();
      }
      setItems(Array.isArray(j.items) ? j.items : []);
      setLastUpdated(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchQueue();
    const id = setInterval(fetchQueue, 10000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  const handleVerify = async (item: QueueItem) => {
    try {
      const libRes = await fetch('/api/library');
      const lib = await libRes.json();
      const items = Array.isArray(lib.items) ? lib.items : [];
      const sanitize = (s: string) =>
        String(s || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
      const titleSan = sanitize(String(item.title || ''));
      const candidate = items.find((x: any) =>
        titleSan.includes(sanitize(String(x.title || '')))
      );
      if (!candidate) throw new Error('No matching library item');
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
      pushToast('error', (e as Error).message || 'Verify failed');
    }
  };

  const handleAction = async (
    item: QueueItem,
    op: 'pause' | 'resume' | 'delete'
  ) => {
    try {
      const r = await fetch('/api/activity/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: item.client,
          op,
          id: item.clientId,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || `${op}_failed`);
      pushToast(
        'success',
        op === 'pause' ? 'Paused' : op === 'resume' ? 'Resumed' : 'Removed'
      );
      fetchQueue();
    } catch (e) {
      pushToast('error', (e as Error).message || `${op} failed`);
    }
  };

  // Summary stats
  const totalItems = items.length;
  const activeDownloads = items.filter((it) =>
    (it.status || '').toLowerCase().includes('download')
  ).length;
  const totalSpeed = items.reduce((sum, it) => sum + (it.speedBps || 0), 0);

  return (
    <section className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <IconDownload />
            Activity Queue
          </h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={fetchQueue} disabled={loading}>
          <IconRefresh />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-gray-800 bg-gray-900/30">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-white">{totalItems}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                In Queue
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-800 bg-gray-900/30">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {activeDownloads}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Downloading
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-800 bg-gray-900/30">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-indigo-400">
                {formatSpeed(totalSpeed)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Total Speed
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && <p className="mb-4 text-red-400">{error}</p>}

      {loading && items.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-gray-900 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card className="border-dashed border-gray-700">
          <CardContent className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
              <IconDownload />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Queue is Empty
            </h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              When you add items to download, they will appear here. You can
              search for releases from any item's detail page.
            </p>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((it, i) => {
            const progress =
              typeof it.progress === 'number'
                ? Math.max(0, Math.min(1, it.progress))
                : undefined;
            const progressPercent =
              progress !== undefined ? (progress * 100).toFixed(1) : null;
            const speed =
              typeof it.speedBps === 'number' ? formatSpeed(it.speedBps) : null;
            const eta =
              typeof it.etaSec === 'number' && it.etaSec > 0
                ? formatEta(it.etaSec)
                : it.eta || null;

            return (
              <Card
                key={i}
                className="border-gray-800 bg-gray-900/30 overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* Progress Bar at Top */}
                  {typeof progress === 'number' && (
                    <div className="h-1 w-full bg-gray-800">
                      <div
                        className={clsx(
                          'h-full transition-all duration-500',
                          getProgressColor(progress)
                        )}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="p-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        {/* Client/Protocol Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-gray-800 text-gray-400">
                            {it.client || 'client'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-500">
                            {it.protocol || '-'}
                          </span>
                          {it.category && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-500">
                              {it.category}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3
                          className="text-lg font-semibold text-white truncate"
                          title={it.title}
                        >
                          {it.title}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={clsx(
                          'px-3 py-1 rounded-lg text-sm font-medium shrink-0',
                          getStatusColor(it.status || ''),
                          'bg-gray-800'
                        )}
                      >
                        {it.status || 'Unknown'}
                      </div>
                    </div>

                    {/* Progress Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      {/* Progress */}
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Progress
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {progressPercent !== null
                            ? `${progressPercent}%`
                            : '-'}
                        </div>
                      </div>

                      {/* Speed */}
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Speed
                        </div>
                        <div className="text-lg font-semibold text-emerald-400">
                          {speed || '-'}
                        </div>
                      </div>

                      {/* ETA */}
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          ETA
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {eta || '-'}
                        </div>
                      </div>

                      {/* Size */}
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Size
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {it.size ||
                            (it.sizeBytes ? formatBytes(it.sizeBytes) : '-')}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-800">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleVerify(it)}
                        title="Verify quality"
                      >
                        <IconShield />
                        Verify
                      </Button>

                      {String(it.client || '') === 'sabnzbd' &&
                        it.clientUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              try {
                                window.open(String(it.clientUrl), '_blank');
                              } catch (_) {
                                /* ignore */
                              }
                            }}
                            title="Open in download client"
                          >
                            <IconExternalLink />
                            Open
                          </Button>
                        )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction(it, 'pause')}
                        title="Pause download"
                      >
                        <IconPause />
                        Pause
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction(it, 'resume')}
                        title="Resume download"
                      >
                        <IconPlay />
                        Resume
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => {
                          if (!window.confirm('Remove from client queue?'))
                            return;
                          handleAction(it, 'delete');
                        }}
                        title="Remove from queue"
                      >
                        <IconTrash />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
