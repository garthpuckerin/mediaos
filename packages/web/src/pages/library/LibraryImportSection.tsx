import React from 'react';
import { FileBrowser } from './FileBrowser';

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

export function LibraryImportSection({
  kindLabel,
  onOpenArtwork,
}: {
  kindLabel: string;
  onOpenArtwork: () => void;
}) {
  return (
    <section>
      <h2>{kindLabel} - Library Import</h2>
      <p style={{ color: '#9aa4b2' }}>
        Browse folders and assign artwork or import existing media.
      </p>
      <div style={{ marginBottom: 8 }}>
        <button style={buttonStyle} onClick={onOpenArtwork}>
          Open Artwork Manager
        </button>
      </div>
      <FileBrowser />
    </section>
  );
}
