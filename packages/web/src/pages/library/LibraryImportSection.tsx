import React from 'react';
import { useParams } from 'react-router-dom';
import { useArtwork } from '../../contexts/ArtworkContext';
import { FileBrowser } from './FileBrowser';

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

export function LibraryImportSection() {
  const { kind: kindParam } = useParams<{ kind: string }>();
  const kind = kindParam || 'series';
  const { openArtwork } = useArtwork();

  const kindLabel =
    kind === 'movies'
      ? 'Movie'
      : kind === 'series'
        ? 'Series'
        : kind === 'books'
          ? 'Book'
          : 'Music';

  const handleOpenArtwork = () => {
    // Open artwork manager for general management or specific item?
    // The original code just passed onOpenArtwork.
    // Assuming it opens the manager without a specific title if none provided?
    // ArtworkContext expects a title.
    // Maybe we just pass an empty string or a placeholder?
    openArtwork('');
  };
  return (
    <section>
      <h2>{kindLabel} - Library Import</h2>
      <p style={{ color: '#9aa4b2' }}>
        Browse folders and assign artwork or import existing media.
      </p>
      <div style={{ marginBottom: 8 }}>
        <button style={buttonStyle} onClick={handleOpenArtwork}>
          Open Artwork Manager
        </button>
      </div>
      <FileBrowser />
    </section>
  );
}
