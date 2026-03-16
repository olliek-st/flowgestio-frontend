import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import './index.css'  // This line must be present
import Landing from "./pages/Landing.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import ResearchTester from "./pages/ResearchTester.jsx";
import WizardV2 from "./pages/WizardV2.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/coming-soon", element: <ComingSoon /> },
  { path: "/research-tester", element: <ResearchTester /> },

  // ✅ NEW: `/wizard` now shows the new wizard
  { path: "/wizard", element: <WizardV2 /> },

  // (optional) keep old wizard available
  
  { path: "*", element: <Navigate to="/coming-soon" replace /> },
]);


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

