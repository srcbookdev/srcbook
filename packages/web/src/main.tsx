import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import './index.css';
import Layout, { loader as configLoader } from './Layout';
import LayoutNavbar from './LayoutNavbar';
import Home, { loader as homeLoader } from './routes/home';
import Apps from './routes/apps';
import Session from './routes/session';
import Settings from './routes/settings';
import Secrets from './routes/secrets';
import ErrorPage from './error';
import { DragAndDropSrcmdModal } from './components/drag-and-drop-srcmd-modal';

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
        loader: Apps.loader,
        element: <Apps />,
        errorElement: <ErrorPage />,
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
    <RouterProvider router={router} />
  </React.StrictMode>,
);
