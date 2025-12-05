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

interface ContentVerifyResult {
  ok: boolean;
  passed: boolean;
  issues: Array<{
    type: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    details?: Record<string, unknown>;
  }>;
  securityIssues: Array<{
    type: string;
    severity: 'warning' | 'danger' | 'critical';
    message: string;
    file?: string;
    details?: Record<string, unknown>;
  }>;
  metadata: {
    duration?: number;
    width?: number;
    height?: number;
    aspectRatio?: string;
    bitrate?: number;
    codec?: string;
    container?: string;
    audioTracks?: number;
    subtitleTracks?: number;
    fileSize?: number;
  };
  checks: {
    securityCheck: 'pass' | 'fail' | 'skip';
    durationCheck: 'pass' | 'fail' | 'skip';
    aspectRatioCheck: 'pass' | 'fail' | 'skip';
    bitrateCheck: 'pass' | 'fail' | 'skip';
    qualityCheck: 'pass' | 'fail' | 'skip';
    corruptionCheck: 'pass' | 'fail' | 'skip';
  };
}

export function VerifySettings() {
  const [settings, setSettings] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    'thresholds' | 'precheck' | 'automation'
  >('thresholds');

  // Pre-check state
  const [testPath, setTestPath] = React.useState('');
  const [expectedQuality, setExpectedQuality] = React.useState('');
  const [expectedDuration, setExpectedDuration] = React.useState('');
  const [checkCorruption, setCheckCorruption] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyResult, setVerifyResult] =
    React.useState<ContentVerifyResult | null>(null);

  React.useEffect(() => {
    fetch('/api/settings/verify')
      .then((r) => r.json())
      .then((j) => setSettings(j.settings || {}))
      .catch(() => setSettings({}));
  }, []);

  const toNum = (v: string) => {
    const n = Number(String(v || '').trim());
    return Number.isFinite(n) ? Math.trunc(n) : undefined;
  };

  const current = settings || {};
  const bitrate = current.minBitrateKbpsByHeight || {};

  const handleVerify = async () => {
    if (!testPath.trim()) {
      pushToast('error', 'Please enter a file path');
      return;
    }

    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/verify/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: testPath,
          expectedQuality: expectedQuality || undefined,
          expectedDurationMin: toNum(expectedDuration),
          checkCorruption,
          checkSecurity: true, // Always check for malware
        }),
      });
      const data = await res.json();
      setVerifyResult(data);

      const totalIssues =
        (data.issues?.length || 0) + (data.securityIssues?.length || 0);
      if (data.passed) {
        pushToast('success', 'File passed all checks!');
      } else {
        const hasSecurityIssue = data.securityIssues?.some(
          (i: any) => i.severity === 'critical' || i.severity === 'danger'
        );
        if (hasSecurityIssue) {
          pushToast(
            'error',
            `⚠️ SECURITY THREAT DETECTED - ${totalIssues} issue(s)`
          );
        } else {
          pushToast('warning', `File has ${totalIssues} issue(s)`);
        }
      }
    } catch (err) {
      pushToast('error', 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
      case 'danger':
      case 'critical':
        return 'text-red-400 bg-red-900/30 border-red-800';
      case 'warning':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
      default:
        return 'text-blue-400 bg-blue-900/30 border-blue-800';
    }
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <span className="text-green-400">✓</span>;
      case 'fail':
        return <span className="text-red-400">✗</span>;
      default:
        return <span className="text-gray-500">—</span>;
    }
  };

  return (
    <section className="max-w-5xl">
      <h2 className="mb-2 text-2xl font-bold text-white">
        Content Verification
      </h2>
      <p className="mb-6 text-gray-400">
        Verify downloaded files before adding them to your library. Detect fake
        files, quality mismatches, and corruption.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {(['thresholds', 'precheck', 'automation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'thresholds' && 'Quality Thresholds'}
            {tab === 'precheck' && 'Pre-Import Check'}
            {tab === 'automation' && 'Automation'}
          </button>
        ))}
      </div>

      {/* Thresholds Tab */}
      {activeTab === 'thresholds' && (
        <>
          {!settings && <p className="text-gray-400">Loading…</p>}
          {settings && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  const f = e.target as HTMLFormElement;
                  const d = new FormData(f);
                  const allowed = String(d.get('allowedContainers') || '')
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean);
                  const payload: any = {
                    minDurationSec: toNum(
                      String(d.get('minDurationSec') || '')
                    ),
                    minBitrateKbpsByHeight: {
                      '480': toNum(String(d.get('br480') || '')),
                      '720': toNum(String(d.get('br720') || '')),
                      '1080': toNum(String(d.get('br1080') || '')),
                      '2160': toNum(String(d.get('br2160') || '')),
                    },
                    allowedContainers: allowed.length > 0 ? allowed : undefined,
                  };
                  const res = await fetch('/api/settings/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  const j = await res.json();
                  setSettings(j.settings || {});
                  pushToast('success', 'Saved');
                } catch (err) {
                  pushToast('error', (err as Error).message || 'Save failed');
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Basics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="space-y-1.5 block">
                    <div className="text-xs text-gray-400">
                      Min Duration (sec)
                    </div>
                    <Input
                      name="minDurationSec"
                      type="number"
                      min={1}
                      defaultValue={current.minDurationSec}
                    />
                    <div className="text-xs text-gray-500">
                      Files shorter than this are flagged (catches
                      samples/trailers)
                    </div>
                  </label>
                  <label className="space-y-1.5 block">
                    <div className="text-xs text-gray-400">
                      Allowed Containers (comma-separated)
                    </div>
                    <Input
                      name="allowedContainers"
                      defaultValue={(current.allowedContainers || []).join(
                        ', '
                      )}
                      placeholder="mp4, mkv, avi"
                    />
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Min Bitrate (kbps) by Resolution</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 mb-4">
                    Files below these bitrates for their resolution are flagged
                    as potentially low quality or mislabeled.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="space-y-1.5 block">
                      <div className="text-xs text-gray-400">480p</div>
                      <Input
                        name="br480"
                        type="number"
                        defaultValue={bitrate['480']}
                        placeholder="500"
                      />
                    </label>
                    <label className="space-y-1.5 block">
                      <div className="text-xs text-gray-400">720p</div>
                      <Input
                        name="br720"
                        type="number"
                        defaultValue={bitrate['720']}
                        placeholder="1500"
                      />
                    </label>
                    <label className="space-y-1.5 block">
                      <div className="text-xs text-gray-400">1080p</div>
                      <Input
                        name="br1080"
                        type="number"
                        defaultValue={bitrate['1080']}
                        placeholder="2500"
                      />
                    </label>
                    <label className="space-y-1.5 block">
                      <div className="text-xs text-gray-400">2160p (4K)</div>
                      <Input
                        name="br2160"
                        type="number"
                        defaultValue={bitrate['2160']}
                        placeholder="8000"
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Verification Settings'}
                </Button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Pre-check Tab */}
      {activeTab === 'precheck' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verify File Before Import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Check a downloaded file for issues before adding it to your
                library. Detects:
              </p>
              <ul className="text-sm text-gray-400 list-disc list-inside space-y-1 mb-4">
                <li>
                  <span className="text-red-400">Double/split screens</span> -
                  Fake files with two videos side-by-side
                </li>
                <li>
                  <span className="text-yellow-400">Quality mismatch</span> -
                  File labeled 1080p but actually 480p
                </li>
                <li>
                  <span className="text-yellow-400">Low bitrate</span> -
                  Over-compressed files that look bad
                </li>
                <li>
                  <span className="text-red-400">Sample/trailer</span> - Short
                  clips instead of full content
                </li>
                <li>
                  <span className="text-red-400">Corruption</span> - Damaged or
                  incomplete downloads
                </li>
              </ul>

              <div className="space-y-3">
                <label className="space-y-1.5 block">
                  <div className="text-sm text-gray-300">File Path</div>
                  <Input
                    value={testPath}
                    onChange={(e) => setTestPath(e.target.value)}
                    placeholder="C:\Downloads\Movie.2024.1080p.BluRay.mkv"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <div className="text-sm text-gray-300">
                      Expected Quality (optional)
                    </div>
                    <select
                      value={expectedQuality}
                      onChange={(e) => setExpectedQuality(e.target.value)}
                      className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                    >
                      <option value="">Auto-detect</option>
                      <option value="2160p">4K / 2160p</option>
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                      <option value="480p">480p</option>
                    </select>
                  </label>

                  <label className="space-y-1.5 block">
                    <div className="text-sm text-gray-300">
                      Min Duration (minutes, optional)
                    </div>
                    <Input
                      type="number"
                      value={expectedDuration}
                      onChange={(e) => setExpectedDuration(e.target.value)}
                      placeholder="e.g., 80 for movies"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkCorruption}
                    onChange={(e) => setCheckCorruption(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <span className="text-sm text-gray-300">
                    Deep corruption check (slower, uses ffmpeg)
                  </span>
                </label>

                <div className="pt-2">
                  <Button onClick={handleVerify} disabled={verifying}>
                    {verifying ? 'Verifying...' : 'Verify File'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {verifyResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      verifyResult.passed
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    {verifyResult.passed ? '✓ PASSED' : '✗ FAILED'}
                  </span>
                  Verification Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Checks Summary */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Checks Performed
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(verifyResult.checks).map(
                      ([check, status]) => (
                        <div
                          key={check}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded"
                        >
                          {getCheckIcon(status)}
                          <span className="text-xs text-gray-300">
                            {check.replace('Check', '')}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    File Metadata
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {verifyResult.metadata.duration && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-500">Duration</div>
                        <div className="text-white font-medium">
                          {formatDuration(verifyResult.metadata.duration)}
                        </div>
                      </div>
                    )}
                    {verifyResult.metadata.width &&
                      verifyResult.metadata.height && (
                        <div className="bg-gray-800 rounded p-3">
                          <div className="text-xs text-gray-500">
                            Resolution
                          </div>
                          <div className="text-white font-medium">
                            {verifyResult.metadata.width}x
                            {verifyResult.metadata.height}
                          </div>
                        </div>
                      )}
                    {verifyResult.metadata.bitrate && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-500">Bitrate</div>
                        <div className="text-white font-medium">
                          {verifyResult.metadata.bitrate} kbps
                        </div>
                      </div>
                    )}
                    {verifyResult.metadata.codec && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-500">Codec</div>
                        <div className="text-white font-medium">
                          {verifyResult.metadata.codec}
                        </div>
                      </div>
                    )}
                    {verifyResult.metadata.container && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-500">Container</div>
                        <div className="text-white font-medium">
                          {verifyResult.metadata.container}
                        </div>
                      </div>
                    )}
                    {verifyResult.metadata.fileSize && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-500">File Size</div>
                        <div className="text-white font-medium">
                          {formatBytes(verifyResult.metadata.fileSize)}
                        </div>
                      </div>
                    )}
                    {verifyResult.metadata.audioTracks !== undefined && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-500">
                          Audio Tracks
                        </div>
                        <div className="text-white font-medium">
                          {verifyResult.metadata.audioTracks}
                        </div>
                      </div>
                    )}
                    {verifyResult.metadata.subtitleTracks !== undefined && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs text-gray-500">Subtitles</div>
                        <div className="text-white font-medium">
                          {verifyResult.metadata.subtitleTracks}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Issues */}
                {verifyResult.securityIssues &&
                  verifyResult.securityIssues.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        Security Threats ({verifyResult.securityIssues.length})
                      </h4>
                      <div className="space-y-2">
                        {verifyResult.securityIssues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded border ${
                              issue.severity === 'critical'
                                ? 'bg-red-900/50 border-red-600 text-red-200'
                                : issue.severity === 'danger'
                                  ? 'bg-orange-900/50 border-orange-600 text-orange-200'
                                  : 'bg-yellow-900/50 border-yellow-600 text-yellow-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold uppercase text-xs mt-0.5 px-2 py-0.5 bg-black/30 rounded">
                                {issue.severity}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {issue.message}
                                </div>
                                {issue.file && (
                                  <div className="text-xs opacity-75 mt-1">
                                    File: {issue.file}
                                  </div>
                                )}
                                {issue.details && (
                                  <div className="text-xs opacity-75 mt-1">
                                    {JSON.stringify(issue.details)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded text-sm text-red-300">
                        <strong>⚠️ Warning:</strong> This file may be malicious.
                        Do NOT open or execute it. Consider deleting it
                        immediately.
                      </div>
                    </div>
                  )}

                {/* Content Issues */}
                {verifyResult.issues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Content Issues ({verifyResult.issues.length})
                    </h4>
                    <div className="space-y-2">
                      {verifyResult.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded border ${getSeverityColor(issue.severity)}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-medium uppercase text-xs mt-0.5">
                              {issue.severity}
                            </span>
                            <div>
                              <div className="font-medium">{issue.message}</div>
                              {issue.details && (
                                <div className="text-xs opacity-75 mt-1">
                                  {JSON.stringify(issue.details)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {verifyResult.issues.length === 0 &&
                  (!verifyResult.securityIssues ||
                    verifyResult.securityIssues.length === 0) && (
                    <div className="text-center py-4 text-green-400">
                      <svg
                        className="w-12 h-12 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="font-medium">
                        No issues detected - file looks good!
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Configure when content should be automatically verified.
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                  <input
                    type="checkbox"
                    defaultChecked={current.verifyOnImport}
                    className="rounded border-gray-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Verify on Manual Import
                    </div>
                    <div className="text-xs text-gray-400">
                      Run verification when files are manually imported
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                  <input
                    type="checkbox"
                    defaultChecked={current.verifyOnDownloadComplete}
                    className="rounded border-gray-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Verify on Download Complete
                    </div>
                    <div className="text-xs text-gray-400">
                      Run verification when downloads finish
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                  <input
                    type="checkbox"
                    defaultChecked={current.blockFailedImports}
                    className="rounded border-gray-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Block Failed Imports
                    </div>
                    <div className="text-xs text-gray-400">
                      Don't add files to library if verification fails (errors
                      only, warnings allowed)
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                  <input
                    type="checkbox"
                    defaultChecked={current.deepCorruptionCheck}
                    className="rounded border-gray-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      Deep Corruption Check
                    </div>
                    <div className="text-xs text-gray-400">
                      Run ffmpeg decode test (slower but detects more issues)
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    pushToast(
                      'info',
                      'Automation settings saved (UI only - backend integration coming soon)'
                    );
                  }}
                >
                  Save Automation Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What Gets Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-red-900/30 border-2 border-red-600 rounded">
                  <h5 className="font-medium text-red-400 mb-2">
                    🛡️ Security Threats (NEW)
                  </h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Executables (.exe, .bat, .msi)</li>
                    <li>• Scripts (.ps1, .vbs, .js)</li>
                    <li>• Double extensions (movie.mkv.exe)</li>
                    <li>• Archives with executables</li>
                    <li>• Autorun files</li>
                    <li>• Disguised executables</li>
                  </ul>
                </div>

                <div className="p-4 bg-red-900/20 border border-red-800 rounded">
                  <h5 className="font-medium text-red-400 mb-2">
                    🚫 Fake/Suspicious Files
                  </h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Double/split screen layouts (32:9 ratio)</li>
                    <li>• Sample or trailer files (&lt;5 min)</li>
                    <li>• CAM, TS, screener releases</li>
                    <li>• Corrupted/incomplete files</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded">
                  <h5 className="font-medium text-yellow-400 mb-2">
                    ⚠️ Quality Issues
                  </h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Mislabeled resolution (says 1080p, is 480p)</li>
                    <li>• Extremely low bitrate for resolution</li>
                    <li>• Missing audio tracks</li>
                    <li>• Unusual aspect ratios</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
