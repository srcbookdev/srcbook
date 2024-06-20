import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './Layout';
import './index.css';
import Home from './routes/home';
import Session from './routes/session';
import Settings from './routes/settings';
import Secrets from './routes/secrets';
import ErrorPage from './error';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <Home />,
        loader: Home.loader,
        action: Home.action,
        errorElement: <ErrorPage />,
      },
      {
        path: '/sessions/:id',
        loader: Session.loader,
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
        loader: Settings.loader,
        action: Settings.action,
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
