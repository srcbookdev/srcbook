import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import './index.css';
import Layout, { loader as configLoader } from './Layout';
import LayoutNavbar from './LayoutNavbar';
import Home, { loader as homeLoader } from './routes/home';
import { AppContext, AppProviders } from './routes/apps/context';
import AppPreview from './routes/apps/preview';
import AppFiles from './routes/apps/files';
import AppFilesShow from './routes/apps/files-show';
import {
  index as appIndex,
  preview as appPreview,
  filesShow as appFilesShow,
} from './routes/apps/loaders';
import Session from './routes/session';
import Settings from './routes/settings';
import Secrets from './routes/secrets';
import ErrorPage from './error';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { DragAndDropSrcmdModal } from './components/drag-and-drop-srcmd-modal';

import { AuthProvider } from './AuthContext';

posthog.init('phc_bQjmPYXmbl76j8gW289Qj9XILuu1STRnIfgCSKlxdgu', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
});

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <DragAndDropSrcmdModal>
        <Layout>
          <LayoutNavbar>
            <Home />
          </LayoutNavbar>
        </Layout>
      </DragAndDropSrcmdModal>
    ),
    errorElement: <ErrorPage />,
    loader: homeLoader,
  },
  {
    path: '/',
    element: (
      <Layout>
        <Outlet />
      </Layout>
    ),
    errorElement: <ErrorPage />,
    loader: configLoader,
    children: [
      {
        path: '/srcbooks/:id',
        loader: Session.loader,
        element: <Session />,
        errorElement: <ErrorPage />,
      },
      {
        path: '/apps/:id',
        loader: appIndex,
        element: <AppContext />,
        errorElement: <ErrorPage />,
        children: [
          {
            path: '',
            loader: appPreview,
            element: (
              <AppProviders>
                <AppPreview />
              </AppProviders>
            ),
          },
          {
            path: '/apps/:id/files',
            loader: appPreview,
            element: (
              <AppProviders>
                <AppFiles />
              </AppProviders>
            ),
          },
          {
            path: '/apps/:id/files/:path',
            loader: appFilesShow,
            element: (
              <AppProviders>
                <AppFilesShow />
              </AppProviders>
            ),
          },
        ],
      },
      {
        path: '/',
        element: (
          <LayoutNavbar>
            <Outlet />
          </LayoutNavbar>
        ),
        loader: configLoader,
        children: [
          {
            path: '/secrets',
            loader: Secrets.loader,
            element: <Secrets />,
            errorElement: <ErrorPage />,
          },
          {
            path: '/settings',
            element: <Settings />,
            errorElement: <ErrorPage />,
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PostHogProvider>
  </React.StrictMode>,
);
