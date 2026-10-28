import { createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import AcceptInvitationPage from "./pages/AcceptInvitationPage.jsx";
import ProjectWorkspacePage from "./pages/ProjectWorkspacePage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPasswordPage />,
  },
  {
    path: "/invitations/accept",
    element: <AcceptInvitationPage />,
  },
  {
    path: "/invitations/:token",
    element: <AcceptInvitationPage />,
  },
  {
    path: "/projects/:projectId",
    element: <ProjectWorkspacePage />,
  },
  {
    path: "*",
    element: <App />,
  },
]);
