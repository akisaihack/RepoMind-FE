import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectSelectPage } from '../pages/ProjectSelectPage'
import { ProjectWorkspacePage } from '../pages/ProjectWorkspacePage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/projects" replace />,
      },
      {
        path: '/projects',
        element: <ProjectSelectPage />,
      },
      {
        path: '/projects/:projectId',
        element: <ProjectWorkspacePage />,
      },
      {
        path: '/projects/:projectId/conversations/:conversationId',
        element: <ProjectWorkspacePage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
