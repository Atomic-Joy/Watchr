import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AuthPage } from '../features/auth/AuthPage';
import { Dashboard } from '../features/dashboard/Dashboard';
import { Search } from '../features/search/Search';
import { Statistics } from '../features/statistics/Statistics';
import { MediaDetail } from '../features/media/MediaDetail';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'search',
        element: <Search />,
      },
      {
        path: 'stats',
        element: <Statistics />,
      },
      {
        path: 'media/:type/:id',
        element: <MediaDetail />,
      }
    ],
  },
]);
