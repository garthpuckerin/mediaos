import React from 'react';
import { useParams } from 'react-router-dom';
import { pushToast } from '../../utils/toast';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b1220',
  color: '#e5e7eb',
};

export function LibraryAdd() {
  const { kind: kindParam } = useParams<{ kind: string }>();
  const kind = kindParam || 'series';
  const kindLabel =
    kind === 'movies'
      ? 'Movie'
      : kind === 'series'
        ? 'Series'
        : kind === 'books'
          ? 'Book'
          : 'Music';
  return (
    <section>
      <h2>Add New {kindLabel}</h2>
      <p style={{ color: '#9aa4b2' }}>
        Search integration to be added. For now, paste a title and plan.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Search by title" style={inputStyle} />
        <button
          style={buttonStyle}
          onClick={() => pushToast('info', 'Search is not implemented yet')}
        >
          Search
        </button>
      </div>
    </section>
  );
}
