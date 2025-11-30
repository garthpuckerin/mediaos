import React from 'react';
import { pushToast } from '../../utils/toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';

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
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">
        Settings - Indexers
      </h2>
      {error && <div className="mb-4 text-red-400">{error}</div>}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Indexer</CardTitle>
        </CardHeader>
        <CardContent>
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
                pushToast('success', 'Indexer added');
              } catch (e) {
                pushToast('error', (e as Error).message || 'Failed');
              }
            }}
            className="grid grid-cols-1 md:grid-cols-[1fr_140px_1fr_auto] gap-4 items-end"
          >
            <label className="space-y-1.5 w-full">
              <div className="text-xs text-gray-400">Name</div>
              <Input name="name" placeholder="Name" />
            </label>
            <label className="space-y-1.5 w-full">
              <div className="text-xs text-gray-400">Type</div>
              <select
                name="type"
                defaultValue="torrent"
                className="flex h-10 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              >
                <option value="torrent">Torrent</option>
                <option value="usenet">Usenet</option>
              </select>
            </label>
            <label className="space-y-1.5 w-full">
              <div className="text-xs text-gray-400">Base URL (optional)</div>
              <Input name="url" placeholder="https://tracker.example.com" />
            </label>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Configured Indexers
        </h3>
        {loading && <div className="text-gray-400">Loading…</div>}

        <div className="grid gap-4">
          {list.map((ix) => (
            <Card key={ix.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {ix.name}
                  </div>
                  <div className="text-xs text-gray-500 flex gap-2">
                    <span className="uppercase">{ix.type}</span>
                    {ix.url && (
                      <span className="truncate opacity-75">— {ix.url}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
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
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('Delete indexer?')) return;
                      await fetch(`/api/indexers/${ix.id}`, {
                        method: 'DELETE',
                      });
                      await load();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {list.length === 0 && !loading && (
            <div className="text-gray-500 text-center py-8 border border-dashed border-gray-800 rounded-xl">
              No indexers added yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
