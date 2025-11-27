import React from 'react';
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

export function IndexersSettings() {
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
