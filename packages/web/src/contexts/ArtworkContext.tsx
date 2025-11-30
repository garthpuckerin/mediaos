import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ArtworkModal } from '../ui/ArtworkModal';

interface ArtworkContextType {
  openArtwork: (title: string) => void;
  closeArtwork: () => void;
}

const ArtworkContext = createContext<ArtworkContextType | undefined>(undefined);

export function ArtworkProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  const openArtwork = (t: string) => {
    setTitle(t);
    setIsOpen(true);
  };

  const closeArtwork = () => {
    setIsOpen(false);
    setTitle('');
  };

  return (
    <ArtworkContext.Provider value={{ openArtwork, closeArtwork }}>
      {children}
      {isOpen && (
        <ArtworkModal open={isOpen} onClose={closeArtwork} title={title} />
      )}
    </ArtworkContext.Provider>
  );
}

export function useArtwork() {
  const context = useContext(ArtworkContext);
  if (context === undefined) {
    throw new Error('useArtwork must be used within an ArtworkProvider');
  }
  return context;
}
