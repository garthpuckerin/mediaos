export type VerifyPhase = 'downloader' | 'arr' | 'player' | 'all';
export type Issue = {
  kind: string;
  severity: 'info' | 'warn' | 'error';
  message?: string;
};
export type VerifyInput = {
  phase: VerifyPhase;
  kind: string;
  id: string;
  title?: string;
  settings?: any;
};
export type VerifyResult = {
  phase: VerifyPhase;
  issues: Issue[];
  analyzedAt: string;
  topSeverity: 'info' | 'warn' | 'error' | 'none';
};

function computeTopSeverity(issues: Issue[]): VerifyResult['topSeverity'] {
  let level: VerifyResult['topSeverity'] = 'none';
  for (const it of issues) {
    if (it.severity === 'error') return 'error';
    if (it.severity === 'warn' && level !== 'error') level = 'warn';
    if (it.severity === 'info' && level === 'none') level = 'info';
  }
  return level;
}

export function runVerify(input: VerifyInput): VerifyResult {
  const issues: Issue[] = [];
  const t = (input.title || '').toLowerCase();
  if (t.includes('sample')) {
    issues.push({ kind: 'wrong_content', severity: 'error', message: 'Title contains "sample"' });
  }
  if (t.includes('camrip') || t.includes('tsrip')) {
    issues.push({ kind: 'encoding_low_quality', severity: 'warn', message: 'Potential cam/TS rip' });
  }
  const analyzedAt = new Date().toISOString();
  const topSeverity = computeTopSeverity(issues);
  return { phase: input.phase, issues, analyzedAt, topSeverity };
}

