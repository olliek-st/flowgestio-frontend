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
import Wizard from "./pages/Wizard.jsx"; // <-- lives in src/pages per your screenshot
import WizardV2 from "./pages/WizardV2.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/coming-soon", element: <ComingSoon /> },
  { path: "/research-tester", element: <ResearchTester /> },
  { path: "/wizard", element: <Wizard /> },         // your old demo wizard (kept)
  { path: "/wizard-v2", element: <WizardV2 /> },    // ← new research wizard
  { path: "*", element: <Navigate to="/coming-soon" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
