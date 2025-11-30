import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { clsx } from 'clsx';
import { apiClient } from '../../api/client';

interface Folder {
  path: string;
  type: 'movies' | 'series';
}

interface FolderSelectionStepProps {
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  onNext: () => void;
  onBack: () => void;
}

interface Directory {
  name: string;
  path: string;
  type: 'directory';
}

interface BrowseResponse {
  ok: boolean;
  currentPath?: string;
  parentPath?: string | null;
  directories?: Directory[];
  error?: string;
}

export function FolderSelectionStep({
  folders,
  setFolders,
  onNext,
  onBack,
}: FolderSelectionStepProps) {
  const [path, setPath] = useState('');
  const [type, setType] = useState<'movies' | 'series'>('movies');
  const [showBrowser, setShowBrowser] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addFolder = () => {
    if (path) {
      setFolders([...folders, { path, type }]);
      setPath('');
    }
  };

  const removeFolder = (index: number) => {
    setFolders(folders.filter((_, i) => i !== index));
  };

  const browsePath = async (browsePath?: string) => {
    setLoading(true);
    setError('');
    try {
      const response: BrowseResponse = await apiClient.post(
        '/api/onboarding/browse',
        {
          path: browsePath,
        }
      );

      if (response.ok) {
        setCurrentPath(response.currentPath || '');
        setParentPath(response.parentPath || null);
        setDirectories(response.directories || []);
      } else {
        setError(response.error || 'Failed to browse directory');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to browse directory');
    } finally {
      setLoading(false);
    }
  };

  const openBrowser = () => {
    setShowBrowser(true);
    browsePath(); // Start from home directory
  };

  const selectDirectory = () => {
    setPath(currentPath);
    setShowBrowser(false);
  };

  const openSystemExplorer = async () => {
    if (!currentPath) return;

    try {
      await apiClient.post('/api/onboarding/open-explorer', {
        path: currentPath,
      });
    } catch (err) {
      setError((err as Error).message || 'Failed to open file explorer');
    }
  };

  const openNativeFolderPicker = async () => {
    setError('');
    try {
      const response: { ok: boolean; path?: string; error?: string } =
        await apiClient.post('/api/onboarding/pick-folder', {
          startPath: currentPath || undefined,
        });

      if (response.ok && response.path) {
        setPath(response.path);
        setShowBrowser(false);
      } else if (!response.ok) {
        // User likely cancelled, don't show error
        if (response.error && response.error !== 'No folder selected') {
          setError(response.error);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to open folder picker');
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Add Media Folders</CardTitle>
        <p className="text-gray-400 text-sm">
          Tell MediaOS where your media is located. We'll scan these folders for
          content.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="e.g., /data/media/movies"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant="ghost"
              onClick={openBrowser}
              title="Browse folders"
            >
              📁
            </Button>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'movies' | 'series')}
              className="bg-gray-900 border border-gray-800 rounded-md px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="movies">Movies</option>
              <option value="series">Series</option>
            </select>
            <Button onClick={addFolder} disabled={!path}>
              Add
            </Button>
          </div>

          {/* Folder List */}
          <div className="space-y-2">
            {folders.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-lg text-gray-500 text-sm">
                No folders added yet.
              </div>
            ) : (
              folders.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded flex items-center justify-center text-xs font-bold uppercase',
                        f.type === 'movies'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      )}
                    >
                      {f.type[0]}
                    </div>
                    <span className="text-sm font-mono text-gray-300">
                      {f.path}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFolder(i)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={folders.length === 0}>
            Next: Scan Library
          </Button>
        </div>
      </CardContent>

      {/* File Browser Modal */}
      {showBrowser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">Browse Folders</h3>
              <button
                onClick={() => setShowBrowser(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Current Path */}
            <div className="p-3 bg-gray-950 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Current:</span>
                <code className="text-sm text-gray-300 font-mono flex-1 truncate">
                  {currentPath || 'Loading...'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openSystemExplorer}
                  disabled={!currentPath}
                  title="Open in system file explorer"
                  className="shrink-0"
                >
                  🗂️
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/20 border-b border-red-900/50">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Directory List */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  Loading...
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Parent Directory */}
                  {parentPath && (
                    <button
                      onClick={() => browsePath(parentPath)}
                      className="w-full p-3 rounded-lg hover:bg-gray-800 text-left flex items-center gap-3 transition-colors"
                    >
                      <span className="text-lg">⬆️</span>
                      <span className="text-sm text-gray-400">
                        Parent Directory
                      </span>
                    </button>
                  )}

                  {/* Directories */}
                  {directories.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      No subdirectories found
                    </div>
                  ) : (
                    directories.map((dir) => (
                      <button
                        key={dir.path}
                        onClick={() => browsePath(dir.path)}
                        className="w-full p-3 rounded-lg hover:bg-gray-800 text-left flex items-center gap-3 transition-colors"
                      >
                        <span className="text-lg">📁</span>
                        <span className="text-sm text-gray-300">
                          {dir.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex justify-between items-center gap-2">
              <Button variant="ghost" onClick={() => setShowBrowser(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={openNativeFolderPicker}
                  title="Open system folder picker dialog"
                >
                  Browse with System Dialog
                </Button>
                <Button onClick={selectDirectory} disabled={!currentPath}>
                  Select This Folder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
