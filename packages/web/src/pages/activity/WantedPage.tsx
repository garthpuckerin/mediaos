import React from 'react';

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

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
