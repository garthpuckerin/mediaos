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

interface IndexerConfig {
  id: string;
  name: string;
  type: 'prowlarr' | 'jackett' | 'manual';
  protocol: 'torrent' | 'usenet' | 'both';
  enabled: boolean;
  baseUrl?: string;
  priority?: number;
}

interface IndexerSettings {
  prowlarr?: {
    enabled: boolean;
    baseUrl?: string;
    hasApiKey: boolean;
    syncEnabled?: boolean;
  };
  jackett?: {
    enabled: boolean;
    baseUrl?: string;
    hasApiKey: boolean;
  };
  indexers: IndexerConfig[];
}

export function IndexersSettings() {
  const [settings, setSettings] = React.useState<IndexerSettings | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    'indexers' | 'prowlarr' | 'jackett'
  >('indexers');

  // Form states for Prowlarr/Jackett config
  const [prowlarrForm, setProwlarrForm] = React.useState({
    enabled: false,
    baseUrl: '',
    apiKey: '',
    syncEnabled: true,
  });
  const [jackettForm, setJackettForm] = React.useState({
    enabled: false,
    baseUrl: '',
    apiKey: '',
  });
  const [testing, setTesting] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/indexers');
      const j = await r.json();
      setSettings(j);

      // Initialize form states
      if (j.prowlarr) {
        setProwlarrForm({
          enabled: j.prowlarr.enabled || false,
          baseUrl: j.prowlarr.baseUrl || '',
          apiKey: '',
          syncEnabled: j.prowlarr.syncEnabled ?? true,
        });
      }
      if (j.jackett) {
        setJackettForm({
          enabled: j.jackett.enabled || false,
          baseUrl: j.jackett.baseUrl || '',
          apiKey: '',
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const handleTestProwlarr = async () => {
    if (!prowlarrForm.baseUrl || !prowlarrForm.apiKey) {
      pushToast('error', 'Base URL and API Key required');
      return;
    }
    setTesting('prowlarr');
    try {
      const r = await fetch('/api/indexers/prowlarr/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: prowlarrForm.baseUrl,
          apiKey: prowlarrForm.apiKey,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        pushToast('success', `Prowlarr connected (v${j.version || 'unknown'})`);
      } else {
        pushToast('error', `Connection failed: ${j.error}`);
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setTesting(null);
    }
  };

  const handleSaveProwlarr = async () => {
    try {
      const r = await fetch('/api/indexers/prowlarr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: prowlarrForm.enabled,
          baseUrl: prowlarrForm.baseUrl || undefined,
          apiKey: prowlarrForm.apiKey || undefined,
          syncEnabled: prowlarrForm.syncEnabled,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      pushToast('success', 'Prowlarr settings saved');
      await load();
    } catch (e) {
      pushToast('error', (e as Error).message);
    }
  };

  const handleSyncProwlarr = async () => {
    setSyncing('prowlarr');
    try {
      const r = await fetch('/api/indexers/prowlarr/sync', { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        pushToast('success', `Synced ${j.count} indexers from Prowlarr`);
        await load();
      } else {
        pushToast('error', `Sync failed: ${j.error}`);
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  const handleTestJackett = async () => {
    if (!jackettForm.baseUrl || !jackettForm.apiKey) {
      pushToast('error', 'Base URL and API Key required');
      return;
    }
    setTesting('jackett');
    try {
      const r = await fetch('/api/indexers/jackett/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: jackettForm.baseUrl,
          apiKey: jackettForm.apiKey,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        pushToast('success', `Jackett connected (v${j.version || 'unknown'})`);
      } else {
        pushToast('error', `Connection failed: ${j.error}`);
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setTesting(null);
    }
  };

  const handleSaveJackett = async () => {
    try {
      const r = await fetch('/api/indexers/jackett', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: jackettForm.enabled,
          baseUrl: jackettForm.baseUrl || undefined,
          apiKey: jackettForm.apiKey || undefined,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      pushToast('success', 'Jackett settings saved');
      await load();
    } catch (e) {
      pushToast('error', (e as Error).message);
    }
  };

  const handleSyncJackett = async () => {
    setSyncing('jackett');
    try {
      const r = await fetch('/api/indexers/jackett/sync', { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        pushToast('success', `Synced ${j.count} indexers from Jackett`);
        await load();
      } else {
        pushToast('error', `Sync failed: ${j.error}`);
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  if (!settings) {
    return (
      <section className="max-w-4xl">
        <h2 className="mb-6 text-2xl font-bold text-white">
          Settings - Indexers
        </h2>
        {loading && <p className="text-gray-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}
      </section>
    );
  }

  return (
    <section className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-white">
        Settings - Indexers
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {(['indexers', 'prowlarr', 'jackett'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Indexers Tab */}
      {activeTab === 'indexers' && (
        <div className="space-y-6">
          {/* Add Manual Indexer */}
          <Card>
            <CardHeader>
              <CardTitle>Add Manual Indexer</CardTitle>
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
                      body: JSON.stringify({
                        name,
                        type,
                        url: url || undefined,
                      }),
                    });
                    if (!r.ok) throw new Error(await r.text());
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
                    className="flex h-10 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200"
                  >
                    <option value="torrent">Torrent</option>
                    <option value="usenet">Usenet</option>
                  </select>
                </label>
                <label className="space-y-1.5 w-full">
                  <div className="text-xs text-gray-400">
                    Base URL (optional)
                  </div>
                  <Input name="url" placeholder="https://tracker.example.com" />
                </label>
                <Button type="submit">Add</Button>
              </form>
            </CardContent>
          </Card>

          {/* Configured Indexers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Configured Indexers
            </h3>
            {loading && <div className="text-gray-400">Loading…</div>}

            <div className="grid gap-4">
              {settings.indexers.map((ix) => (
                <Card key={ix.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate flex items-center gap-2">
                        {ix.name}
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            ix.type === 'prowlarr'
                              ? 'bg-purple-900/50 text-purple-300'
                              : ix.type === 'jackett'
                                ? 'bg-orange-900/50 text-orange-300'
                                : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {ix.type}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        <span className="uppercase">{ix.protocol}</span>
                        {ix.baseUrl && (
                          <span className="truncate opacity-75">
                            — {ix.baseUrl}
                          </span>
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
                      {ix.type === 'manual' && (
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {settings.indexers.length === 0 && !loading && (
                <div className="text-gray-500 text-center py-8 border border-dashed border-gray-800 rounded-xl">
                  No indexers configured. Add a manual indexer or sync from
                  Prowlarr/Jackett.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prowlarr Tab */}
      {activeTab === 'prowlarr' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Prowlarr</span>
                {settings.prowlarr?.enabled && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-300">
                    Connected
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Prowlarr is an indexer manager that integrates with Sonarr,
                Radarr, and other *arr apps. Connect to Prowlarr to
                automatically sync your indexers.
              </p>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prowlarrForm.enabled}
                  onChange={(e) =>
                    setProwlarrForm({
                      ...prowlarrForm,
                      enabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"
                />
                <span className="text-sm text-gray-300">Enable Prowlarr</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <div className="text-xs text-gray-400">Base URL</div>
                  <Input
                    value={prowlarrForm.baseUrl}
                    onChange={(e) =>
                      setProwlarrForm({
                        ...prowlarrForm,
                        baseUrl: e.target.value,
                      })
                    }
                    placeholder="http://localhost:9696"
                  />
                </label>
                <label className="space-y-1.5">
                  <div className="text-xs text-gray-400">API Key</div>
                  <Input
                    type="password"
                    value={prowlarrForm.apiKey}
                    onChange={(e) =>
                      setProwlarrForm({
                        ...prowlarrForm,
                        apiKey: e.target.value,
                      })
                    }
                    placeholder={
                      settings.prowlarr?.hasApiKey ? '••••••••' : 'API Key'
                    }
                  />
                </label>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prowlarrForm.syncEnabled}
                  onChange={(e) =>
                    setProwlarrForm({
                      ...prowlarrForm,
                      syncEnabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"
                />
                <span className="text-sm text-gray-300">
                  Auto-sync indexers on save
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveProwlarr}>Save</Button>
                <Button
                  variant="secondary"
                  onClick={handleTestProwlarr}
                  disabled={testing === 'prowlarr'}
                >
                  {testing === 'prowlarr' ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSyncProwlarr}
                  disabled={
                    !settings.prowlarr?.enabled || syncing === 'prowlarr'
                  }
                >
                  {syncing === 'prowlarr' ? 'Syncing...' : 'Sync Indexers'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jackett Tab */}
      {activeTab === 'jackett' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Jackett</span>
                {settings.jackett?.enabled && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-300">
                    Connected
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Jackett works as a proxy server for torrent trackers. Connect to
                Jackett to search across multiple trackers.
              </p>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={jackettForm.enabled}
                  onChange={(e) =>
                    setJackettForm({
                      ...jackettForm,
                      enabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"
                />
                <span className="text-sm text-gray-300">Enable Jackett</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <div className="text-xs text-gray-400">Base URL</div>
                  <Input
                    value={jackettForm.baseUrl}
                    onChange={(e) =>
                      setJackettForm({
                        ...jackettForm,
                        baseUrl: e.target.value,
                      })
                    }
                    placeholder="http://localhost:9117"
                  />
                </label>
                <label className="space-y-1.5">
                  <div className="text-xs text-gray-400">API Key</div>
                  <Input
                    type="password"
                    value={jackettForm.apiKey}
                    onChange={(e) =>
                      setJackettForm({ ...jackettForm, apiKey: e.target.value })
                    }
                    placeholder={
                      settings.jackett?.hasApiKey ? '••••••••' : 'API Key'
                    }
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveJackett}>Save</Button>
                <Button
                  variant="secondary"
                  onClick={handleTestJackett}
                  disabled={testing === 'jackett'}
                >
                  {testing === 'jackett' ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSyncJackett}
                  disabled={!settings.jackett?.enabled || syncing === 'jackett'}
                >
                  {syncing === 'jackett' ? 'Syncing...' : 'Sync Indexers'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
