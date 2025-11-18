import React from 'react';
import { manageArtwork } from '../../utils/artwork';

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

export function FileBrowser() {
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
