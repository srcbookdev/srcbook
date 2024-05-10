import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './Layout';
import './index.css';
import Home, { loader as homeLoader } from './routes/home';
import Session, { loader as sessionLoader } from './routes/session';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        loader: homeLoader,
        element: <Home />,
      },
      {
        path: 'sessions/:id',
        loader: sessionLoader,
        element: <Session />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
