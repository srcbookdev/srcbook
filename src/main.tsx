import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout, { loader as layoutLoader } from './Layout';
import './index.css';
import Home, { loader as homeLoader, action as homeAction } from './routes/home';
import Open, { loader as openLoader, action as openAction } from './routes/open';
import Session, { loader as sessionLoader } from './routes/session';
import Settings, { loader as settingsLoader, action as settingsAction } from './routes/settings';
import Secrets from './routes/secrets';
import ErrorPage from './error';

const router = createBrowserRouter([
  {
    path: '/',
    loader: layoutLoader,
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <Home />,
        loader: homeLoader,
        action: homeAction,
        errorElement: <ErrorPage />,
      },
      {
        path: '/open',
        loader: openLoader,
        element: <Open />,
        action: openAction,
        errorElement: <ErrorPage />,
      },
      {
        path: 'sessions/:id',
        loader: sessionLoader,
        element: <Session />,
        errorElement: <ErrorPage />,
      },
      {
        path: '/secrets',
        loader: Secrets.loader,
        action: Secrets.action,
        element: <Secrets />,
        errorElement: <ErrorPage />,
      },
      {
        path: '/settings',
        element: <Settings />,
        loader: settingsLoader,
        action: settingsAction,
        errorElement: <ErrorPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
