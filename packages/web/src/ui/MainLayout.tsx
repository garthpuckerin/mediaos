import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';
import { GlobalSearch } from '../components/GlobalSearch';
import clsx from 'clsx';

// Icons
const IconDashboard = () => (
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
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);

const IconLibrary = () => (
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
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const IconCalendar = () => (
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
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const IconActivity = () => (
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
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const IconSettings = () => (
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
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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

const IconQueue = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const IconHistory = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconWanted = () => (
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
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);

const IconGeneral = () => (
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
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
    />
  </svg>
);

const IconMediaManagement = () => (
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
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const IconDownloadClient = () => (
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
      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
    />
  </svg>
);

const IconIndexer = () => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const IconQuality = () => (
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
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
);

const IconVerify = () => (
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
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const IconPlugins = () => (
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
      d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
    />
  </svg>
);

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function MainLayout() {
  const location = useLocation();
  const path = location.pathname;

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: <IconDashboard />, exact: true },
    { label: 'Library', href: '/library', icon: <IconLibrary /> },
    { label: 'Calendar', href: '/calendar', icon: <IconCalendar /> },
    { label: 'Activity', href: '/activity/queue', icon: <IconActivity /> },
    { label: 'Settings', href: '/settings/general', icon: <IconSettings /> },
  ];

  const librarySubItems: SubNavItem[] = [
    { label: 'Series', href: '/library/series', icon: <IconTv /> },
    { label: 'Movies', href: '/library/movies', icon: <IconFilm /> },
    { label: 'Books', href: '/library/books', icon: <IconBook /> },
    { label: 'Music', href: '/library/music', icon: <IconMusic /> },
  ];

  const activitySubItems: SubNavItem[] = [
    { label: 'Queue', href: '/activity/queue', icon: <IconQueue /> },
    { label: 'History', href: '/activity/history', icon: <IconHistory /> },
    { label: 'Wanted', href: '/activity/wanted', icon: <IconWanted /> },
  ];

  const settingsSubItems: SubNavItem[] = [
    { label: 'General', href: '/settings/general', icon: <IconGeneral /> },
    {
      label: 'Media Management',
      href: '/settings/media-management',
      icon: <IconMediaManagement />,
    },
    {
      label: 'Download Clients',
      href: '/settings/download-clients',
      icon: <IconDownloadClient />,
    },
    { label: 'Indexers', href: '/settings/indexers', icon: <IconIndexer /> },
    { label: 'Quality', href: '/settings/quality', icon: <IconQuality /> },
    {
      label: 'Verification',
      href: '/settings/verification',
      icon: <IconVerify />,
    },
    { label: 'Plugins', href: '/settings/plugins', icon: <IconPlugins /> },
  ];

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return path === item.href;
    }
    const segment = item.href.split('/')[1];
    return segment ? path.startsWith(`/${segment}`) : false;
  };

  const isSubActive = (href: string) => path.includes(href);

  return (
    <div className="min-h-screen bg-[#0b0f16] text-gray-200 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-800 bg-[#0b0f16]/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            {/* Logo */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <h1 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors">
              MediaOS
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <GlobalSearch />
          <UserMenu />
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-800 bg-[#0b1220] overflow-y-auto">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 -ml-[1px]'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  )}
                >
                  <span
                    className={active ? 'text-indigo-400' : 'text-gray-500'}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sub-navigation based on active section */}
          {path.startsWith('/library') && (
            <div className="px-3 pb-3">
              <div className="border-t border-gray-800 pt-3">
                <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  Library
                </h3>
                <nav className="space-y-0.5">
                  {librarySubItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={clsx(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isSubActive(item.href)
                          ? 'bg-gray-800/50 text-white'
                          : 'text-gray-500 hover:bg-gray-800/30 hover:text-gray-300'
                      )}
                    >
                      <span
                        className={
                          isSubActive(item.href)
                            ? 'text-gray-300'
                            : 'text-gray-600'
                        }
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {path.startsWith('/activity') && (
            <div className="px-3 pb-3">
              <div className="border-t border-gray-800 pt-3">
                <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  Activity
                </h3>
                <nav className="space-y-0.5">
                  {activitySubItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={clsx(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isSubActive(item.href)
                          ? 'bg-gray-800/50 text-white'
                          : 'text-gray-500 hover:bg-gray-800/30 hover:text-gray-300'
                      )}
                    >
                      <span
                        className={
                          isSubActive(item.href)
                            ? 'text-gray-300'
                            : 'text-gray-600'
                        }
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {path.startsWith('/settings') && (
            <div className="px-3 pb-3">
              <div className="border-t border-gray-800 pt-3">
                <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  Settings
                </h3>
                <nav className="space-y-0.5">
                  {settingsSubItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={clsx(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isSubActive(item.href)
                          ? 'bg-gray-800/50 text-white'
                          : 'text-gray-500 hover:bg-gray-800/30 hover:text-gray-300'
                      )}
                    >
                      <span
                        className={
                          isSubActive(item.href)
                            ? 'text-gray-300'
                            : 'text-gray-600'
                        }
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Footer in sidebar */}
          <div className="absolute bottom-0 left-0 w-64 p-3 border-t border-gray-800 bg-[#0b1220]">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0b0f16] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
