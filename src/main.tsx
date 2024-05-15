import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './Layout';
import './index.css';
import Home, { loader as homeLoader } from './routes/home';
import Session, { loader as sessionLoader } from './routes/session';
import Secrets, { loader as secretsLoader } from './routes/secrets';
import ErrorPage from './error';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        loader: homeLoader,
        element: <Home />,
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
        loader: secretsLoader,
        element: <Secrets />,
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
