import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { apiClient } from '../../api/client';

interface ScanProgressStepProps {
  folders: { path: string; type: 'movies' | 'series' }[];
  onComplete: () => void;
}

export function ScanProgressStep({
  folders,
  onComplete,
}: ScanProgressStepProps) {
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    let pollInterval: NodeJS.Timeout | null = null;

    const startSetup = async () => {
      try {
        // Step 1: Save folders
        setLog((prev) => ['Saving folder configuration...', ...prev]);
        await apiClient.post('/api/onboarding/setup', { folders });

        if (cancelled) return;
        setLog((prev) => ['Configuration saved', ...prev]);
        setProgress(20);

        // Step 2: Start scan
        setLog((prev) => ['Starting library scan...', ...prev]);
        await apiClient.post('/api/onboarding/scan');

        if (cancelled) return;
        setLog((prev) => ['Scan initiated', ...prev]);
        setProgress(40);

        // Step 3: Poll for scan status
        pollInterval = setInterval(async () => {
          try {
            const status: {
              scanning: boolean;
              progress: number;
              currentFile: string | null;
            } = await apiClient.get('/api/onboarding/status');

            if (status.scanning) {
              setProgress(40 + status.progress * 0.6); // Scale progress to 40-100%
              if (status.currentFile) {
                setLog((prev) =>
                  [`Scanning: ${status.currentFile}`, ...prev].slice(0, 8)
                );
              }
            } else {
              // Scan complete
              setProgress(100);
              setLog((prev) => ['Library scan complete!', ...prev]);
              setIsComplete(true);
              if (pollInterval) clearInterval(pollInterval);
            }
          } catch (err) {
            console.error('Status poll error:', err);
          }
        }, 1000);
      } catch (err) {
        setError((err as Error).message || 'Setup failed');
        setLog((prev) => [`Error: ${(err as Error).message}`, ...prev]);
        setIsComplete(true); // Allow user to continue despite error
      }
    };

    void startSetup();

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [folders]);

  return (
    <>
      <CardHeader>
        <CardTitle>Scanning Library</CardTitle>
        <p className="text-gray-400 text-sm">
          {error
            ? 'Setup encountered an error'
            : 'Please wait while we index your media files...'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ease-out ${
                error ? 'bg-red-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Log Window */}
        <div className="bg-black/50 rounded-lg p-4 h-32 overflow-auto border border-gray-800 font-mono text-xs space-y-1">
          {log.length === 0 && (
            <div className="text-gray-500">Initializing...</div>
          )}
          {log.map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith('Error:')
                  ? 'text-red-400'
                  : i === 0
                    ? 'text-white'
                    : 'text-gray-500'
              }
            >
              {line}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onComplete} disabled={!isComplete}>
            {isComplete ? 'Finish' : 'Scanning...'}
          </Button>
        </div>
      </CardContent>
    </>
  );
}
