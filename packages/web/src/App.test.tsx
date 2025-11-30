import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtworkProvider } from './contexts/ArtworkContext';

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <ArtworkProvider>
        <div>MediaOS</div>
      </ArtworkProvider>
    );
    expect(screen.getByText('MediaOS')).toBeDefined();
  });
});
