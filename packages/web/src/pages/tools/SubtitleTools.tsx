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

interface SubtitleTrack {
  index: number;
  language?: string;
  title?: string;
  codec: string;
  forced?: boolean;
  default?: boolean;
}

interface SyncAnalysis {
  ok: boolean;
  offsetMs: number;
  confidence: number;
  method: string;
  recommendation: string;
}

interface GenerationJob {
  jobId: string;
  status: 'pending' | 'extracting' | 'transcribing' | 'complete' | 'error';
  progress: number;
  currentStep?: string;
  error?: string;
  videoPath: string;
}

export function SubtitleTools() {
  const [activeTab, setActiveTab] = React.useState<
    'sync' | 'generate' | 'extract'
  >('sync');

  // Sync state
  const [videoPath, setVideoPath] = React.useState('');
  const [subtitlePath, setSubtitlePath] = React.useState('');
  const [analyzing, setAnalyzing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<SyncAnalysis | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [manualOffset, setManualOffset] = React.useState('');

  // Generate state
  const [genVideoPath, setGenVideoPath] = React.useState('');
  const [genLanguage, setGenLanguage] = React.useState('');
  const [genModel, setGenModel] = React.useState<
    'tiny' | 'base' | 'small' | 'medium' | 'large'
  >('base');
  const [whisperAvailable, setWhisperAvailable] = React.useState<
    boolean | null
  >(null);
  const [activeJobs, setActiveJobs] = React.useState<GenerationJob[]>([]);
  const [generating, setGenerating] = React.useState(false);

  // Extract state
  const [extractVideoPath, setExtractVideoPath] = React.useState('');
  const [tracks, setTracks] = React.useState<SubtitleTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = React.useState(false);
  const [extracting, setExtracting] = React.useState(false);

  // Check Whisper availability on mount
  React.useEffect(() => {
    fetch('/api/subtitles/generate/check')
      .then((r) => r.json())
      .then((data) => setWhisperAvailable(data.available))
      .catch(() => setWhisperAvailable(false));
  }, []);

  // Poll active jobs
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/subtitles/generate/jobs');
        const data = await res.json();
        if (data.ok) {
          setActiveJobs(data.jobs);
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // Sync Handlers
  // ==========================================

  const handleAnalyzeSync = async () => {
    if (!videoPath.trim() || !subtitlePath.trim()) {
      pushToast('error', 'Enter video and subtitle paths');
      return;
    }

    setAnalyzing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/subtitles/sync/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath, subtitlePath }),
      });
      const data = await res.json();
      setSyncResult(data);

      if (data.ok && Math.abs(data.offsetMs) < 100) {
        pushToast('success', 'Subtitles appear to be in sync!');
      } else if (data.ok) {
        pushToast('info', `Detected offset: ${data.offsetMs}ms`);
      } else {
        pushToast('warning', data.recommendation || 'Analysis failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAutoSync = async () => {
    if (!videoPath.trim() || !subtitlePath.trim()) {
      pushToast('error', 'Enter video and subtitle paths');
      return;
    }

    setSyncing(true);

    try {
      const res = await fetch('/api/subtitles/sync/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath, subtitlePath }),
      });
      const data = await res.json();

      if (data.ok) {
        pushToast(
          'success',
          `Synced! Adjusted by ${data.offsetMs}ms. Saved to: ${data.outputPath}`
        );
      } else {
        pushToast('error', data.error || 'Sync failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualAdjust = async () => {
    if (!subtitlePath.trim()) {
      pushToast('error', 'Enter subtitle path');
      return;
    }

    const offset = parseInt(manualOffset, 10);
    if (isNaN(offset)) {
      pushToast('error', 'Enter a valid offset in milliseconds');
      return;
    }

    setSyncing(true);

    try {
      const res = await fetch('/api/subtitles/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitlePath, offsetMs: offset }),
      });
      const data = await res.json();

      if (data.ok) {
        pushToast(
          'success',
          `Adjusted ${data.entriesAdjusted} entries. Saved to: ${data.outputPath}`
        );
      } else {
        pushToast('error', data.error || 'Adjustment failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  // ==========================================
  // Generate Handlers
  // ==========================================

  const handleGenerate = async () => {
    if (!genVideoPath.trim()) {
      pushToast('error', 'Enter video path');
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch('/api/subtitles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: genVideoPath,
          language: genLanguage || undefined,
          model: genModel,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        pushToast('success', `Started generation job: ${data.jobId}`);
      } else {
        pushToast('error', data.error || 'Generation failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // ==========================================
  // Extract Handlers
  // ==========================================

  const handleLoadTracks = async () => {
    if (!extractVideoPath.trim()) {
      pushToast('error', 'Enter video path');
      return;
    }

    setLoadingTracks(true);
    setTracks([]);

    try {
      const res = await fetch(
        `/api/subtitles/tracks?path=${encodeURIComponent(extractVideoPath)}`
      );
      const data = await res.json();

      if (data.ok) {
        setTracks(data.tracks);
        if (data.tracks.length === 0) {
          pushToast('info', 'No embedded subtitles found');
        } else {
          pushToast('success', `Found ${data.tracks.length} subtitle track(s)`);
        }
      } else {
        pushToast('error', data.error || 'Failed to load tracks');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleExtractTrack = async (trackIndex: number) => {
    setExtracting(true);

    try {
      const res = await fetch('/api/subtitles/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath: extractVideoPath, trackIndex }),
      });
      const data = await res.json();

      if (data.ok) {
        pushToast('success', `Extracted to: ${data.outputPath}`);
      } else {
        pushToast('error', data.error || 'Extraction failed');
      }
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <section className="max-w-5xl">
      <h2 className="mb-2 text-2xl font-bold text-white">Subtitle Tools</h2>
      <p className="mb-6 text-gray-400">
        Sync, generate, and manage subtitles for your media files.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {(['sync', 'generate', 'extract'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'sync' && '🔄 Sync Detection'}
            {tab === 'generate' && '🤖 AI Generation'}
            {tab === 'extract' && '📤 Extract'}
          </button>
        ))}
      </div>

      {/* Sync Tab */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subtitle Sync Detection & Correction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Analyze video audio and subtitle timing to detect and fix sync
                issues. Uses speech detection to find the optimal offset.
              </p>

              <div className="space-y-3">
                <label className="space-y-1.5 block">
                  <div className="text-sm text-gray-300">Video File</div>
                  <Input
                    value={videoPath}
                    onChange={(e) => setVideoPath(e.target.value)}
                    placeholder="C:\Videos\Movie.mkv"
                  />
                </label>

                <label className="space-y-1.5 block">
                  <div className="text-sm text-gray-300">Subtitle File</div>
                  <Input
                    value={subtitlePath}
                    onChange={(e) => setSubtitlePath(e.target.value)}
                    placeholder="C:\Videos\Movie.srt"
                  />
                </label>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleAnalyzeSync} disabled={analyzing}>
                    {analyzing ? 'Analyzing...' : 'Analyze Sync'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleAutoSync}
                    disabled={syncing}
                  >
                    {syncing ? 'Syncing...' : 'Auto-Sync'}
                  </Button>
                </div>
              </div>

              {/* Sync Result */}
              {syncResult && (
                <div
                  className={`mt-4 p-4 rounded-lg border ${
                    syncResult.ok && Math.abs(syncResult.offsetMs) < 100
                      ? 'bg-green-900/30 border-green-700'
                      : syncResult.ok
                        ? 'bg-yellow-900/30 border-yellow-700'
                        : 'bg-red-900/30 border-red-700'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-400">
                        Offset Detected
                      </div>
                      <div className="text-xl font-bold">
                        {syncResult.offsetMs > 0 ? '+' : ''}
                        {syncResult.offsetMs}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Confidence</div>
                      <div className="text-xl font-bold">
                        {Math.round(syncResult.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Method:</span>{' '}
                    {syncResult.method}
                  </div>
                  <div className="text-sm mt-1">
                    {syncResult.recommendation}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Adjustment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Manually shift subtitle timing by a specific offset.
              </p>

              <div className="flex gap-4 items-end">
                <label className="space-y-1.5 flex-1">
                  <div className="text-sm text-gray-300">Offset (ms)</div>
                  <Input
                    type="number"
                    value={manualOffset}
                    onChange={(e) => setManualOffset(e.target.value)}
                    placeholder="-500 (earlier) or 500 (later)"
                  />
                </label>
                <Button onClick={handleManualAdjust} disabled={syncing}>
                  Apply Offset
                </Button>
              </div>

              <div className="text-xs text-gray-500">
                <strong>Negative</strong> = subtitles appear earlier |{' '}
                <strong>Positive</strong> = subtitles appear later
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Subtitle Generation (Whisper)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Whisper Status */}
              <div
                className={`p-3 rounded-lg ${
                  whisperAvailable === null
                    ? 'bg-gray-800'
                    : whisperAvailable
                      ? 'bg-green-900/30 border border-green-700'
                      : 'bg-red-900/30 border border-red-700'
                }`}
              >
                {whisperAvailable === null && (
                  <div className="text-gray-400">
                    Checking Whisper status...
                  </div>
                )}
                {whisperAvailable === true && (
                  <div className="text-green-400">
                    ✓ Whisper is available and ready to generate subtitles
                  </div>
                )}
                {whisperAvailable === false && (
                  <div>
                    <div className="text-red-400 mb-2">
                      ✗ Whisper is not installed
                    </div>
                    <div className="text-sm text-gray-400">
                      Install with:{' '}
                      <code className="bg-gray-800 px-2 py-0.5 rounded">
                        pip install openai-whisper
                      </code>
                      <br />
                      Or faster version:{' '}
                      <code className="bg-gray-800 px-2 py-0.5 rounded">
                        pip install faster-whisper
                      </code>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-400">
                Generate subtitles automatically by transcribing the audio using
                OpenAI's Whisper model. Supports 99+ languages.
              </p>

              <div className="space-y-3">
                <label className="space-y-1.5 block">
                  <div className="text-sm text-gray-300">Video File</div>
                  <Input
                    value={genVideoPath}
                    onChange={(e) => setGenVideoPath(e.target.value)}
                    placeholder="C:\Videos\Movie.mkv"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <div className="text-sm text-gray-300">
                      Language (optional)
                    </div>
                    <Input
                      value={genLanguage}
                      onChange={(e) => setGenLanguage(e.target.value)}
                      placeholder="Auto-detect (or: en, es, fr, ja...)"
                    />
                  </label>

                  <label className="space-y-1.5 block">
                    <div className="text-sm text-gray-300">Model</div>
                    <select
                      value={genModel}
                      onChange={(e) => setGenModel(e.target.value as any)}
                      className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                    >
                      <option value="tiny">
                        Tiny (fastest, least accurate)
                      </option>
                      <option value="base">Base (balanced)</option>
                      <option value="small">Small (better accuracy)</option>
                      <option value="medium">Medium (high accuracy)</option>
                      <option value="large">Large (best, slowest)</option>
                    </select>
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !whisperAvailable}
                  >
                    {generating ? 'Starting...' : 'Generate Subtitles'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generation Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div
                      key={job.jobId}
                      className={`p-3 rounded-lg border ${
                        job.status === 'complete'
                          ? 'bg-green-900/30 border-green-700'
                          : job.status === 'error'
                            ? 'bg-red-900/30 border-red-700'
                            : 'bg-gray-800 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-white truncate flex-1">
                          {job.videoPath.split(/[/\\]/).pop()}
                        </div>
                        <div
                          className={`text-xs px-2 py-0.5 rounded ${
                            job.status === 'complete'
                              ? 'bg-green-800 text-green-300'
                              : job.status === 'error'
                                ? 'bg-red-800 text-red-300'
                                : 'bg-blue-800 text-blue-300'
                          }`}
                        >
                          {job.status}
                        </div>
                      </div>

                      {job.status === 'transcribing' && (
                        <div className="mb-2">
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {job.currentStep}
                          </div>
                        </div>
                      )}

                      {job.error && (
                        <div className="text-sm text-red-400">{job.error}</div>
                      )}

                      {job.status === 'complete' && (
                        <div className="text-sm text-green-400">
                          {job.currentStep}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Model Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Tiny</span>
                  <span className="text-gray-500">~1GB RAM, fastest</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Base</span>
                  <span className="text-gray-500">~1GB RAM, good balance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Small</span>
                  <span className="text-gray-500">
                    ~2GB RAM, better accuracy
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Medium</span>
                  <span className="text-gray-500">~5GB RAM, high accuracy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Large</span>
                  <span className="text-gray-500">
                    ~10GB RAM, best accuracy
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Extract Tab */}
      {activeTab === 'extract' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Extract Embedded Subtitles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Extract subtitle tracks that are embedded in video files (MKV,
                MP4, etc.) to separate SRT files.
              </p>

              <div className="flex gap-4 items-end">
                <label className="space-y-1.5 flex-1">
                  <div className="text-sm text-gray-300">Video File</div>
                  <Input
                    value={extractVideoPath}
                    onChange={(e) => setExtractVideoPath(e.target.value)}
                    placeholder="C:\Videos\Movie.mkv"
                  />
                </label>
                <Button onClick={handleLoadTracks} disabled={loadingTracks}>
                  {loadingTracks ? 'Loading...' : 'Load Tracks'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tracks List */}
          {tracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Embedded Subtitle Tracks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tracks.map((track) => (
                    <div
                      key={track.index}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-white">
                          Track #{track.index}
                          {track.title && ` - ${track.title}`}
                        </div>
                        <div className="text-sm text-gray-400">
                          {track.language || 'Unknown language'} • {track.codec}
                          {track.default && ' • Default'}
                          {track.forced && ' • Forced'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleExtractTrack(track.index)}
                        disabled={extracting}
                      >
                        Extract
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tracks.length === 0 && extractVideoPath && !loadingTracks && (
            <div className="text-center py-8 border border-dashed border-gray-700 rounded-xl">
              <div className="text-gray-500">
                No embedded subtitles found in this video
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
