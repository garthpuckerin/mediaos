import React from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

export function WantedPage() {
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
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">Activity - Wanted</h2>
      {error && <p className="mb-4 text-red-400">{error}</p>}

      <div className="flex gap-4 mb-8">
        <Button disabled={scanning} onClick={() => handleScan(false)}>
          {scanning ? 'Scanning...' : 'Scan Wanted'}
        </Button>
        <Button
          variant="secondary"
          disabled={scanning}
          onClick={() => handleScan(true)}
        >
          {scanning ? 'Scanning...' : 'Scan & Queue'}
        </Button>
      </div>

      {scanSummary && (
        <Card className="mb-8 border-indigo-500/30 bg-indigo-950/10">
          <CardContent className="p-4">
            <div className="text-xs text-gray-400 mb-2">
              Last scan: {new Date(scanSummary.scannedAt).toLocaleString()}
            </div>
            {scanSummary.results.length === 0 && (
              <div className="text-gray-400">Nothing found.</div>
            )}
            {scanSummary.results.length > 0 && (
              <ul className="space-y-1 text-gray-200">
                {scanSummary.results.map((row) => (
                  <li key={row.key} className="text-sm">
                    <strong className="font-medium">{row.key}</strong>{' '}
                    <span className="text-gray-500">
                      — Found {row.found}, Queued {row.grabbed}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && items.length === 0 && (
        <div className="text-gray-500 text-center py-12 border border-dashed border-gray-800 rounded-xl">
          Nothing in Wanted list.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((it) => (
            <Card key={`${it.kind}:${it.id}`}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">
                    {it.kind}
                  </div>
                  <div className="text-lg font-semibold text-white truncate">
                    {it.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {it.lastScan
                      ? `Last scan ${new Date(it.lastScan.at).toLocaleString()} — Found ${it.lastScan.found}, Queued ${it.lastScan.grabbed}`
                      : 'Not scanned yet'}
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeItem(it.kind, it.id)}
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
