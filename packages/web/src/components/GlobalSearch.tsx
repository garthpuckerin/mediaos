import React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

// Icons
const IconSearch = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const IconX = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const IconTv = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const IconFilm = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
    />
  </svg>
);

const IconBook = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

const IconMusic = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
    />
  </svg>
);

const IconCommand = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z"
    />
  </svg>
);

interface LibraryItem {
  id: string;
  title: string;
  kind: string;
  posterUrl?: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<LibraryItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [allItems, setAllItems] = React.useState<LibraryItem[]>([]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Load library items once
  React.useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/library');
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setAllItems(data.items);
        }
      } catch {
        // Ignore
      }
    };
    fetchItems();
  }, []);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when modal opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter results based on query
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchQuery = query.toLowerCase().trim();

    // Simple client-side filtering
    const filtered = allItems
      .filter((item) => item.title.toLowerCase().includes(searchQuery))
      .slice(0, 10);

    setResults(filtered);
    setSelectedIndex(0);
    setLoading(false);
  }, [query, allItems]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        navigateToItem(results[selectedIndex]);
      }
    }
  };

  const navigateToItem = (item: LibraryItem) => {
    const plural =
      item.kind === 'movie'
        ? 'movies'
        : item.kind === 'book'
          ? 'books'
          : item.kind;
    navigate(`/library/${plural}/item/${encodeURIComponent(item.id)}`);
    setIsOpen(false);
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'movie':
        return <IconFilm />;
      case 'series':
        return <IconTv />;
      case 'book':
        return <IconBook />;
      case 'music':
        return <IconMusic />;
      default:
        return <IconFilm />;
    }
  };

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'movie':
        return 'text-pink-400';
      case 'series':
        return 'text-indigo-400';
      case 'book':
        return 'text-amber-400';
      case 'music':
        return 'text-emerald-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 hover:bg-gray-800 transition-colors text-gray-400 text-sm"
      >
        <IconSearch />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 ml-2 rounded bg-gray-700/50 text-gray-500 text-xs font-mono">
          <IconCommand />K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            ref={modalRef}
            className="relative w-full max-w-xl bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              <IconSearch />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search library..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-lg"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <IconX />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && (
                <div className="px-4 py-8 text-center text-gray-500">
                  Searching...
                </div>
              )}

              {!loading && query && results.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  No results found for "{query}"
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="py-2">
                  {results.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => navigateToItem(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        index === selectedIndex
                          ? 'bg-indigo-500/20 text-white'
                          : 'text-gray-300 hover:bg-gray-800/50'
                      )}
                    >
                      {/* Poster Thumbnail */}
                      <div className="w-10 h-14 shrink-0 rounded-md overflow-hidden bg-gray-800 border border-gray-700">
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            {getKindIcon(item.kind)}
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.title}</h4>
                        <p
                          className={clsx(
                            'text-xs capitalize flex items-center gap-1',
                            getKindColor(item.kind)
                          )}
                        >
                          {getKindIcon(item.kind)}
                          {item.kind}
                        </p>
                      </div>

                      {/* Enter hint */}
                      {index === selectedIndex && (
                        <kbd className="px-2 py-1 rounded bg-gray-800 text-gray-500 text-xs">
                          Enter
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!loading && !query && (
                <div className="px-4 py-6 text-center text-gray-500">
                  <p className="mb-3">Type to search your library</p>
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                        ↑
                      </kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                        ↓
                      </kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                        Enter
                      </kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                        Esc
                      </kbd>
                      Close
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
