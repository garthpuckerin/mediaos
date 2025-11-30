import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';
import clsx from 'clsx';

export function MainLayout() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: 'Library', href: '/library' },
    { label: 'Calendar', href: '/calendar' },
    { label: 'Activity', href: '/activity/queue' },
    { label: 'Settings', href: '/settings/general' },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f16] text-gray-200 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-800 bg-[#0b0f16] px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-100">MediaOS</h1>
        </div>
        <UserMenu />
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-800 bg-[#0b1220] p-4 overflow-y-auto">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = path.startsWith(
                item.href.split('/')[1]
                  ? `/${item.href.split('/')[1]}`
                  : item.href
              );
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={clsx(
                    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Sub-navigation based on active section */}
          {path.startsWith('/library') && (
            <div className="mt-6">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Library
              </h3>
              <nav className="flex flex-col gap-1">
                {[
                  { label: 'Series', href: '/library/series' },
                  { label: 'Movies', href: '/library/movies' },
                  { label: 'Books', href: '/library/books' },
                  { label: 'Music', href: '/library/music' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={clsx(
                      'block rounded-md px-3 py-1.5 text-sm transition-colors',
                      path.includes(item.href)
                        ? 'bg-gray-800/50 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {path.startsWith('/activity') && (
            <div className="mt-6">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Activity
              </h3>
              <nav className="flex flex-col gap-1">
                {[
                  { label: 'Queue', href: '/activity/queue' },
                  { label: 'History', href: '/activity/history' },
                  { label: 'Wanted', href: '/activity/wanted' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={clsx(
                      'block rounded-md px-3 py-1.5 text-sm transition-colors',
                      path.includes(item.href)
                        ? 'bg-gray-800/50 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {path.startsWith('/settings') && (
            <div className="mt-6">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Settings
              </h3>
              <nav className="flex flex-col gap-1">
                {[
                  { label: 'General', href: '/settings/general' },
                  {
                    label: 'Download Clients',
                    href: '/settings/download-clients',
                  },
                  { label: 'Indexers', href: '/settings/indexers' },
                  { label: 'Quality', href: '/settings/quality' },
                  { label: 'Verification', href: '/settings/verification' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={clsx(
                      'block rounded-md px-3 py-1.5 text-sm transition-colors',
                      path.includes(item.href)
                        ? 'bg-gray-800/50 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0b0f16] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
