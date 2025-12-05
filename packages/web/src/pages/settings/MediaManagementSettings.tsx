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

interface NamingConfig {
  series: {
    folderFormat: string;
    seasonFolderFormat: string;
    fileFormat: string;
  };
  movies: {
    folderFormat: string;
    fileFormat: string;
  };
  music: {
    artistFolderFormat: string;
    albumFolderFormat: string;
    fileFormat: string;
  };
  books: {
    authorFolderFormat: string;
    fileFormat: string;
  };
}

interface OrganizerConfig {
  destinations: {
    series?: string;
    movies?: string;
    music?: string;
    books?: string;
  };
  defaultOperation: 'move' | 'copy' | 'hardlink';
  conflictResolution: 'skip' | 'overwrite' | 'rename';
  cleanupEmptyFolders: boolean;
  namingConfig: NamingConfig;
}

interface ScanProgress {
  status: 'idle' | 'scanning' | 'completed' | 'failed';
  totalFiles: number;
  scannedFiles: number;
  currentPath: string | null;
  foundItems: number;
  errors: string[];
}

interface OrganizeProgress {
  status: 'idle' | 'organizing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  skipCount: number;
  errorCount: number;
  currentFile: string | null;
}

const DEFAULT_NAMING: NamingConfig = {
  series: {
    folderFormat: '{Series.CleanTitle}',
    seasonFolderFormat: 'Season {Season:00}',
    fileFormat:
      '{Series.CleanTitle} - S{Season:00}E{Episode:00} - {Episode.Title}{Quality}{Extension}',
  },
  movies: {
    folderFormat: '{Movie.CleanTitle} ({Year})',
    fileFormat: '{Movie.CleanTitle} ({Year}){Quality}{Extension}',
  },
  music: {
    artistFolderFormat: '{Artist.CleanName}',
    albumFolderFormat: '{Album.CleanName}',
    fileFormat: '{Track:00} - {Title}{Extension}',
  },
  books: {
    authorFolderFormat: '{Author.CleanName}',
    fileFormat: '{Title.CleanTitle}{Extension}',
  },
};

export function MediaManagementSettings() {
  const [config, setConfig] = React.useState<OrganizerConfig | null>(null);
  const [scanProgress, setScanProgress] = React.useState<ScanProgress | null>(
    null
  );
  const [organizeProgress, setOrganizeProgress] =
    React.useState<OrganizeProgress | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    'destinations' | 'naming' | 'scanner'
  >('destinations');

  // Load config on mount
  React.useEffect(() => {
    fetch('/api/organizer/config')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setConfig(j.config);
        }
      })
      .catch(() => {
        setConfig({
          destinations: {},
          defaultOperation: 'hardlink',
          conflictResolution: 'skip',
          cleanupEmptyFolders: true,
          namingConfig: DEFAULT_NAMING,
        });
      });
  }, []);

  // Poll for scan/organize progress
  React.useEffect(() => {
    const pollProgress = async () => {
      try {
        const [scanRes, orgRes] = await Promise.all([
          fetch('/api/scanner/status'),
          fetch('/api/organizer/status'),
        ]);
        const scanData = await scanRes.json();
        const orgData = await orgRes.json();
        if (scanData.ok !== false) setScanProgress(scanData);
        if (orgData.ok !== false) setOrganizeProgress(orgData);
      } catch {
        // Ignore polling errors
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/organizer/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(await res.text());
      pushToast('success', 'Settings saved');
    } catch (err) {
      pushToast('error', (err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStartScan = async () => {
    try {
      const res = await fetch('/api/scanner/start', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        pushToast('success', 'Scan started');
      } else {
        pushToast('error', data.error || 'Failed to start scan');
      }
    } catch (err) {
      pushToast('error', (err as Error).message);
    }
  };

  const handleStopScan = async () => {
    try {
      await fetch('/api/scanner/stop', { method: 'POST' });
      pushToast('info', 'Scan stop requested');
    } catch {
      // Ignore
    }
  };

  const handleOrganize = async (dryRun: boolean) => {
    try {
      const res = await fetch('/api/organizer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (data.ok) {
        pushToast(
          'success',
          dryRun ? 'Preview started' : 'Organization started'
        );
      } else {
        pushToast('error', data.error || 'Failed to start');
      }
    } catch (err) {
      pushToast('error', (err as Error).message);
    }
  };

  if (!config) {
    return (
      <section className="max-w-5xl">
        <h2 className="mb-6 text-2xl font-bold text-white">Media Management</h2>
        <p className="text-gray-400">Loading...</p>
      </section>
    );
  }

  const isScanning = scanProgress?.status === 'scanning';
  const isOrganizing = organizeProgress?.status === 'organizing';

  return (
    <section className="max-w-5xl">
      <h2 className="mb-6 text-2xl font-bold text-white">Media Management</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {(['destinations', 'naming', 'scanner'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'destinations' && 'Root Folders'}
            {tab === 'naming' && 'Naming Templates'}
            {tab === 'scanner' && 'Scanner'}
          </button>
        ))}
      </div>

      {/* Destinations Tab */}
      {activeTab === 'destinations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Root Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">
                Set the destination folders where organized media will be
                placed.
              </p>
              {(['series', 'movies', 'music', 'books'] as const).map((type) => (
                <div key={type}>
                  <label className="block text-sm font-medium text-gray-300 mb-1 capitalize">
                    {type}
                  </label>
                  <Input
                    value={config.destinations[type] || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        destinations: {
                          ...config.destinations,
                          [type]: e.target.value,
                        },
                      })
                    }
                    placeholder={`/media/${type}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Default Operation
                </label>
                <select
                  value={config.defaultOperation}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultOperation: e.target.value as any,
                    })
                  }
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                >
                  <option value="hardlink">Hardlink (recommended)</option>
                  <option value="copy">Copy</option>
                  <option value="move">Move</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hardlink saves space by creating a link to the original file.
                  Falls back to copy if on different drives.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Conflict Resolution
                </label>
                <select
                  value={config.conflictResolution}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      conflictResolution: e.target.value as any,
                    })
                  }
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                >
                  <option value="skip">Skip existing files</option>
                  <option value="rename">Rename with number</option>
                  <option value="overwrite">Overwrite</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cleanup"
                  checked={config.cleanupEmptyFolders}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cleanupEmptyFolders: e.target.checked,
                    })
                  }
                  className="rounded border-gray-600 bg-gray-800"
                />
                <label htmlFor="cleanup" className="text-sm text-gray-300">
                  Clean up empty folders after moving
                </label>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}

      {/* Naming Templates Tab */}
      {activeTab === 'naming' && (
        <div className="space-y-6">
          {/* Series Naming */}
          <Card>
            <CardHeader>
              <CardTitle>Series Naming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Series Folder Format
                </label>
                <Input
                  value={config.namingConfig.series.folderFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        series: {
                          ...config.namingConfig.series,
                          folderFormat: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="{Series.CleanTitle}"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Season Folder Format
                </label>
                <Input
                  value={config.namingConfig.series.seasonFolderFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        series: {
                          ...config.namingConfig.series,
                          seasonFolderFormat: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="Season {Season:00}"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Episode File Format
                </label>
                <Input
                  value={config.namingConfig.series.fileFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        series: {
                          ...config.namingConfig.series,
                          fileFormat: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  Available tokens: {'{Series.Title}'}, {'{Series.CleanTitle}'},{' '}
                  {'{Season}'}, {'{Season:00}'}, {'{Episode}'}, {'{Episode:00}'}
                  , {'{Episode.Title}'}, {'{Quality}'}, {'{Extension}'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Movies Naming */}
          <Card>
            <CardHeader>
              <CardTitle>Movie Naming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Movie Folder Format
                </label>
                <Input
                  value={config.namingConfig.movies.folderFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        movies: {
                          ...config.namingConfig.movies,
                          folderFormat: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="{Movie.CleanTitle} ({Year})"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Movie File Format
                </label>
                <Input
                  value={config.namingConfig.movies.fileFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        movies: {
                          ...config.namingConfig.movies,
                          fileFormat: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="text-xs text-gray-500">
                <p>
                  Available tokens: {'{Movie.Title}'}, {'{Movie.CleanTitle}'},{' '}
                  {'{Year}'}, {'{Quality}'}, {'{Source}'}, {'{Codec}'},{' '}
                  {'{Extension}'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Music Naming */}
          <Card>
            <CardHeader>
              <CardTitle>Music Naming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Artist Folder Format
                </label>
                <Input
                  value={config.namingConfig.music.artistFolderFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        music: {
                          ...config.namingConfig.music,
                          artistFolderFormat: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Album Folder Format
                </label>
                <Input
                  value={config.namingConfig.music.albumFolderFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        music: {
                          ...config.namingConfig.music,
                          albumFolderFormat: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Track File Format
                </label>
                <Input
                  value={config.namingConfig.music.fileFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        music: {
                          ...config.namingConfig.music,
                          fileFormat: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="text-xs text-gray-500">
                <p>
                  Available tokens: {'{Artist}'}, {'{Artist.CleanName}'},{' '}
                  {'{Album}'}, {'{Album.CleanName}'}, {'{Track}'},{' '}
                  {'{Track:00}'}, {'{Title}'}, {'{Extension}'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Books Naming */}
          <Card>
            <CardHeader>
              <CardTitle>Book Naming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Author Folder Format
                </label>
                <Input
                  value={config.namingConfig.books.authorFolderFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        books: {
                          ...config.namingConfig.books,
                          authorFolderFormat: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Book File Format
                </label>
                <Input
                  value={config.namingConfig.books.fileFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      namingConfig: {
                        ...config.namingConfig,
                        books: {
                          ...config.namingConfig.books,
                          fileFormat: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="text-xs text-gray-500">
                <p>
                  Available tokens: {'{Author}'}, {'{Author.CleanName}'},{' '}
                  {'{Title}'}, {'{Title.CleanTitle}'}, {'{Extension}'}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setConfig({
                  ...config,
                  namingConfig: DEFAULT_NAMING,
                })
              }
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      )}

      {/* Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          {/* Scan Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Library Scanner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Scan your media folders to detect files. After scanning, you can
                preview and organize them.
              </p>

              {/* Progress Display */}
              {scanProgress && scanProgress.status !== 'idle' && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">
                      Status: {scanProgress.status}
                    </span>
                    <span className="text-sm text-cyan-400">
                      {scanProgress.foundItems} items found
                    </span>
                  </div>

                  {scanProgress.totalFiles > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>
                          {scanProgress.scannedFiles} /{' '}
                          {scanProgress.totalFiles}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                          style={{
                            width: `${(scanProgress.scannedFiles / scanProgress.totalFiles) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {scanProgress.currentPath && (
                    <p className="text-xs text-gray-500 truncate">
                      Scanning: {scanProgress.currentPath}
                    </p>
                  )}

                  {scanProgress.errors.length > 0 && (
                    <div className="text-xs text-red-400">
                      {scanProgress.errors.length} error(s)
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleStartScan}
                  disabled={isScanning || isOrganizing}
                >
                  {isScanning ? 'Scanning...' : 'Start Scan'}
                </Button>
                {isScanning && (
                  <Button variant="secondary" onClick={handleStopScan}>
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Organize */}
          <Card>
            <CardHeader>
              <CardTitle>File Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                After scanning, organize files into the proper folder structure
                using your naming templates.
              </p>

              {/* Organize Progress */}
              {organizeProgress && organizeProgress.status !== 'idle' && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">
                      Status: {organizeProgress.status}
                    </span>
                    <div className="text-sm space-x-3">
                      <span className="text-green-400">
                        ✓ {organizeProgress.successCount}
                      </span>
                      <span className="text-yellow-400">
                        ○ {organizeProgress.skipCount}
                      </span>
                      <span className="text-red-400">
                        ✗ {organizeProgress.errorCount}
                      </span>
                    </div>
                  </div>

                  {organizeProgress.totalFiles > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>
                          {organizeProgress.processedFiles} /{' '}
                          {organizeProgress.totalFiles}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                          style={{
                            width: `${(organizeProgress.processedFiles / organizeProgress.totalFiles) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {organizeProgress.currentFile && (
                    <p className="text-xs text-gray-500 truncate">
                      Processing: {organizeProgress.currentFile}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => handleOrganize(true)}
                  disabled={
                    isScanning ||
                    isOrganizing ||
                    !scanProgress ||
                    scanProgress.foundItems === 0
                  }
                >
                  Preview Changes
                </Button>
                <Button
                  onClick={() => handleOrganize(false)}
                  disabled={
                    isScanning ||
                    isOrganizing ||
                    !scanProgress ||
                    scanProgress.foundItems === 0
                  }
                >
                  {isOrganizing ? 'Organizing...' : 'Organize Files'}
                </Button>
              </div>

              {(!scanProgress || scanProgress.foundItems === 0) && (
                <p className="text-xs text-gray-500">
                  Run a scan first to detect files.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
