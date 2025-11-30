import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

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

  useEffect(() => {
    // Simulate scanning process
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 5;
      if (p > 100) p = 100;
      setProgress(p);

      // Add fake log entry
      if (p < 100 && Math.random() > 0.7) {
        const files = [
          'Inception.mkv',
          'Breaking Bad S01E01.mp4',
          'The Matrix.avi',
          'Stranger Things S04.mkv',
        ];
        const file = files[Math.floor(Math.random() * files.length)];
        setLog((prev) => [`Found ${file}...`, ...prev].slice(0, 5));
      }

      if (p >= 100) {
        clearInterval(interval);
        setIsComplete(true);
        setLog((prev) => ['Scan complete!', ...prev]);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <CardHeader>
        <CardTitle>Scanning Library</CardTitle>
        <p className="text-gray-400 text-sm">
          Please wait while we index your media files...
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Log Window */}
        <div className="bg-black/50 rounded-lg p-4 h-32 overflow-hidden border border-gray-800 font-mono text-xs space-y-1">
          {log.map((line, i) => (
            <div key={i} className={i === 0 ? 'text-white' : 'text-gray-500'}>
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
