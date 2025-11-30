import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { MainLayout } from './MainLayout';

// Pages
import { CalendarPage } from '../pages/CalendarPage';
import { LibraryList } from '../pages/library/LibraryList';
import { LibraryItemDetail } from '../pages/library/LibraryItemDetail';
import { LibraryAdd } from '../pages/library/LibraryAdd';
import { LibraryImportSection } from '../pages/library/LibraryImportSection';
import { ActivityQueue } from '../pages/activity/ActivityQueue';
import { ActivityHistory } from '../pages/activity/ActivityHistory';
import { WantedPage } from '../pages/activity/WantedPage';
import { IndexersSettings } from '../pages/settings/IndexersSettings';
import { QualitySettings } from '../pages/settings/QualitySettings';
import { VerifySettings } from '../pages/settings/VerifySettings';
import { DownloadClientsSettings } from '../pages/settings/DownloadClientsSettings';

// Placeholder for Dashboard (No Stubs policy - using Library as default for now)
// Placeholder for Dashboard (No Stubs policy - using Library as default for now)
const Dashboard = () => <Navigate to="/library/series" replace />;

import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
import { PluginsSettings } from '../pages/settings/PluginsSettings';

const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'library',
        children: [
          { index: true, element: <Navigate to="series" replace /> },
          { path: ':kind', element: <LibraryList /> }, // Default to list
          { path: ':kind/list', element: <LibraryList /> },
          { path: ':kind/item/:id', element: <LibraryItemDetail /> },
          { path: ':kind/add', element: <LibraryAdd /> },
          { path: ':kind/import', element: <LibraryImportSection /> },
        ],
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
      },
      {
        path: 'activity',
        children: [
          { index: true, element: <Navigate to="queue" replace /> },
          { path: 'queue', element: <ActivityQueue /> },
          { path: 'history', element: <ActivityHistory /> },
          { path: 'wanted', element: <WantedPage /> },
        ],
      },
      {
        path: 'settings',
        children: [
          { index: true, element: <Navigate to="general" replace /> },
          {
            path: 'general',
            element: <div>General Settings (Coming Soon)</div>,
          },
          { path: 'download-clients', element: <DownloadClientsSettings /> },
          { path: 'indexers', element: <IndexersSettings /> },
          { path: 'quality', element: <QualitySettings /> },
          { path: 'verification', element: <VerifySettings /> },
          { path: 'plugins', element: <PluginsSettings /> },
        ],
      },
    ],
  },
]);

import { ArtworkProvider } from '../contexts/ArtworkContext';

export default function App() {
  return (
    <ArtworkProvider>
      <RouterProvider router={router} />
    </ArtworkProvider>
  );
}
