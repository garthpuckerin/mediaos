import React from 'react';
import { useParams } from 'react-router-dom';
import { useArtwork } from '../../contexts/ArtworkContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { pushToast } from '../../utils/toast';

interface VerifyResult {
  passed: boolean;
  issues: Array<{
    type: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
  }>;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    bitrate?: number;
  };
}

interface ParsedFile {
  path: string;
  filename: string;
  parsed: {
    title?: string;
    year?: number;
    season?: number;
    episode?: number;
    episodeTitle?: string;
    quality?: string;
    source?: string;
    codec?: string;
    artist?: string;
    album?: string;
    track?: number;
    author?: string;
    type: string;
  };
  size: number;
  selected: boolean;
  matchedItem?: { id: string; title: string };
  verifyResult?: VerifyResult;
  verifying?: boolean;
}

interface LibraryItem {
  id: string;
  title: string;
  year?: number;
}

export function LibraryImportSection() {
  const { kind: kindParam } = useParams<{ kind: string }>();
  const kind = kindParam || 'series';
  const { openArtwork } = useArtwork();

  const [scanPath, setScanPath] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const [files, setFiles] = React.useState<ParsedFile[]>([]);
  const [libraryItems, setLibraryItems] = React.useState<LibraryItem[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [filterUnmatched, setFilterUnmatched] = React.useState(false);

  const kindLabel =
    kind === 'movies'
      ? 'Movie'
      : kind === 'series'
        ? 'Series'
        : kind === 'books'
          ? 'Book'
          : 'Music';

  // Load library items for matching
  React.useEffect(() => {
    fetch(`/api/library/${kind}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.items)) {
          setLibraryItems(
            data.items.map((it: any) => ({
              id: it.id,
              title: it.title,
              year: it.year,
            }))
          );
        }
      })
      .catch(() => {});
  }, [kind]);

  const handleScan = async () => {
    if (!scanPath.trim()) {
      pushToast('error', 'Enter a path to scan');
      return;
    }

    setScanning(true);
    try {
      const res = await fetch('/api/scanner/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: scanPath, kind }),
      });
      const data = await res.json();

      if (data.ok && Array.isArray(data.files)) {
        const parsed: ParsedFile[] = data.files.map((f: any) => ({
          path: f.path,
          filename: f.filename,
          parsed: f.parsed || {},
          size: f.size || 0,
          selected: true,
          matchedItem: autoMatch(f.parsed, libraryItems),
        }));
        setFiles(parsed);
        pushToast('success', `Found ${parsed.length} files`);
      } else {
        pushToast('error', data.error || 'Scan failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  // Auto-match parsed file to library item
  const autoMatch = (
    parsed: ParsedFile['parsed'],
    items: LibraryItem[]
  ): { id: string; title: string } | undefined => {
    if (!parsed?.title) return undefined;

    const normalizedTitle = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    for (const item of items) {
      const itemTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (itemTitle === normalizedTitle) {
        // Check year if available
        if (parsed.year && item.year && parsed.year !== item.year) {
          continue;
        }
        return { id: item.id, title: item.title };
      }
    }

    // Fuzzy match - check if one contains the other
    for (const item of items) {
      const itemTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        itemTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(itemTitle)
      ) {
        return { id: item.id, title: item.title };
      }
    }

    return undefined;
  };

  const handleToggleSelect = (index: number) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleSelectAll = () => {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: true })));
  };

  const handleSelectNone = () => {
    setFiles((prev) => prev.map((f) => ({ ...f, selected: false })));
  };

  const handleMatchChange = (index: number, itemId: string) => {
    const item = libraryItems.find((it) => it.id === itemId);
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              matchedItem: item
                ? { id: item.id, title: item.title }
                : undefined,
            }
          : f
      )
    );
  };

  const handleImport = async () => {
    const toImport = files.filter((f) => f.selected && f.matchedItem);
    if (toImport.length === 0) {
      pushToast('error', 'No files selected with valid matches');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/scanner/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          files: toImport.map((f) => ({
            path: f.path,
            itemId: f.matchedItem?.id,
            parsed: f.parsed,
          })),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        pushToast('success', `Imported ${data.count || toImport.length} files`);
        // Remove imported files from list
        setFiles((prev) =>
          prev.filter((f) => !toImport.some((imp) => imp.path === f.path))
        );
      } else {
        pushToast('error', data.error || 'Import failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Verify a single file
  const handleVerifyFile = async (index: number) => {
    const file = files[index];
    if (!file) return;

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, verifying: true } : f))
    );

    try {
      const res = await fetch('/api/verify/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: file.path,
          expectedQuality: file.parsed.quality,
        }),
      });
      const data = await res.json();

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                verifying: false,
                verifyResult: {
                  passed: data.passed,
                  issues: data.issues || [],
                  metadata: data.metadata,
                },
              }
            : f
        )
      );

      if (data.passed) {
        pushToast('success', `${file.filename} passed verification`);
      } else {
        pushToast(
          'warning',
          `${file.filename} has ${data.issues?.length || 0} issue(s)`
        );
      }
    } catch (e) {
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, verifying: false } : f))
      );
      pushToast('error', 'Verification failed');
    }
  };

  // Verify all selected files
  const handleVerifyAll = async () => {
    const selectedIndices = files
      .map((f, i) => (f.selected ? i : -1))
      .filter((i) => i >= 0);

    if (selectedIndices.length === 0) {
      pushToast('error', 'No files selected');
      return;
    }

    pushToast('info', `Verifying ${selectedIndices.length} files...`);

    for (const idx of selectedIndices) {
      await handleVerifyFile(idx);
    }

    const results = files.filter((f) => f.selected && f.verifyResult);
    const passed = results.filter((f) => f.verifyResult?.passed).length;
    const failed = results.length - passed;

    pushToast(
      failed > 0 ? 'warning' : 'success',
      `Verification complete: ${passed} passed, ${failed} failed`
    );
  };

  const filteredFiles = filterUnmatched
    ? files.filter((f) => !f.matchedItem)
    : files;

  const selectedCount = files.filter((f) => f.selected).length;
  const matchedCount = files.filter((f) => f.matchedItem).length;
  const verifiedCount = files.filter((f) => f.verifyResult).length;
  const passedCount = files.filter((f) => f.verifyResult?.passed).length;
  const failedCount = files.filter(
    (f) => f.verifyResult && !f.verifyResult.passed
  ).length;

  return (
    <section className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {kindLabel} - Manual Import
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Scan folders to find media files and match them to your library
          </p>
        </div>
        <Button variant="secondary" onClick={() => openArtwork('')}>
          Artwork Manager
        </Button>
      </div>

      {/* Scan Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Scan Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                value={scanPath}
                onChange={(e) => setScanPath(e.target.value)}
                placeholder="/path/to/downloads or C:\Downloads"
              />
            </div>
            <Button onClick={handleScan} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Scan'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter the path to scan for {kindLabel.toLowerCase()} files. Files
            will be parsed to extract metadata.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {files.length > 0 && (
        <>
          {/* Stats & Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-400">
                {files.length} files • {matchedCount} matched • {selectedCount}{' '}
                selected
              </span>
              {verifiedCount > 0 && (
                <span className="text-sm">
                  <span className="text-green-400">{passedCount} passed</span>
                  {failedCount > 0 && (
                    <>
                      {' • '}
                      <span className="text-red-400">{failedCount} failed</span>
                    </>
                  )}
                </span>
              )}
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={filterUnmatched}
                  onChange={(e) => setFilterUnmatched(e.target.checked)}
                  className="rounded border-gray-600"
                />
                Show unmatched only
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                Select None
              </Button>
              <Button
                variant="secondary"
                onClick={handleVerifyAll}
                disabled={selectedCount === 0}
              >
                Verify Selected
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
              >
                {importing ? 'Importing...' : `Import ${selectedCount} Files`}
              </Button>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-3">
            {filteredFiles.map((file, idx) => (
              <Card
                key={file.path}
                className={`transition-colors ${
                  file.selected ? 'border-cyan-800' : 'opacity-60'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={file.selected}
                      onChange={() => handleToggleSelect(idx)}
                      className="mt-1 rounded border-gray-600"
                    />

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {file.filename}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {file.path}
                      </div>

                      {/* Parsed Metadata */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {file.parsed.title && (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-800 text-gray-300">
                            {file.parsed.title}
                          </span>
                        )}
                        {file.parsed.year && (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-800 text-gray-300">
                            {file.parsed.year}
                          </span>
                        )}
                        {file.parsed.season !== undefined && (
                          <span className="px-2 py-0.5 text-xs rounded bg-blue-900/50 text-blue-300">
                            S{String(file.parsed.season).padStart(2, '0')}
                            {file.parsed.episode !== undefined &&
                              `E${String(file.parsed.episode).padStart(2, '0')}`}
                          </span>
                        )}
                        {file.parsed.quality && (
                          <span className="px-2 py-0.5 text-xs rounded bg-purple-900/50 text-purple-300">
                            {file.parsed.quality}
                          </span>
                        )}
                        {file.parsed.source && (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-900/50 text-green-300">
                            {file.parsed.source}
                          </span>
                        )}
                        {file.parsed.codec && (
                          <span className="px-2 py-0.5 text-xs rounded bg-orange-900/50 text-orange-300">
                            {file.parsed.codec}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-400">
                          {formatSize(file.size)}
                        </span>
                      </div>
                    </div>

                    {/* Verify Button */}
                    <div className="shrink-0">
                      <button
                        onClick={() => handleVerifyFile(files.indexOf(file))}
                        disabled={file.verifying}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          file.verifyResult
                            ? file.verifyResult.passed
                              ? 'border-green-700 bg-green-900/20 text-green-400'
                              : 'border-red-700 bg-red-900/20 text-red-400'
                            : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-cyan-600'
                        }`}
                      >
                        {file.verifying
                          ? '...'
                          : file.verifyResult
                            ? file.verifyResult.passed
                              ? '✓ OK'
                              : `✗ ${file.verifyResult.issues.length}`
                            : 'Verify'}
                      </button>
                      {file.verifyResult &&
                        !file.verifyResult.passed &&
                        file.verifyResult.issues.length > 0 && (
                          <div
                            className="text-xs text-red-400 mt-1 max-w-[100px] truncate"
                            title={file.verifyResult.issues
                              .map((i) => i.message)
                              .join('\n')}
                          >
                            {file.verifyResult.issues[0].message}
                          </div>
                        )}
                    </div>

                    {/* Match Selector */}
                    <div className="w-64 shrink-0">
                      <select
                        value={file.matchedItem?.id || ''}
                        onChange={(e) => handleMatchChange(idx, e.target.value)}
                        className={`w-full text-sm rounded-md border px-2 py-1.5 ${
                          file.matchedItem
                            ? 'border-green-700 bg-green-900/20 text-green-300'
                            : 'border-yellow-700 bg-yellow-900/20 text-yellow-300'
                        }`}
                      >
                        <option value="">-- Select {kindLabel} --</option>
                        {libraryItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                            {item.year ? ` (${item.year})` : ''}
                          </option>
                        ))}
                      </select>
                      {file.matchedItem && (
                        <div className="text-xs text-green-400 mt-1">
                          ✓ Matched
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFiles.length === 0 && filterUnmatched && (
            <div className="text-center py-8 text-gray-500">
              All files are matched! Uncheck "Show unmatched only" to see all.
            </div>
          )}
        </>
      )}

      {files.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
          <div className="text-gray-500 mb-2">No files scanned yet</div>
          <div className="text-gray-600 text-sm">
            Enter a path above and click Scan to find {kindLabel.toLowerCase()}{' '}
            files
          </div>
        </div>
      )}
    </section>
  );
}
