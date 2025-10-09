import path from 'path';

export function getLibraryRoots(): string[] {
  const raw = process.env['MEDIAOS_LIBRARY_ROOTS'] ?? './media';
  const sep = raw.includes(';') ? ';' : ',';
  const parts = raw
    .split(sep)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const roots = parts.length > 0 ? parts : ['./media'];
  return roots.map((p) => path.resolve(process.cwd(), p));
}
