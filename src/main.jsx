// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";

import ComingSoon from "./pages/ComingSoon.jsx";

import { initAnalytics } from "./lib/analytics";
initAnalytics();

const COMING_SOON = import.meta.env.VITE_COMING_SOON === "1";

let router;

if (COMING_SOON) {
  // Only expose Coming Soon
  router = createBrowserRouter([
    { path: "/coming-soon", element: <ComingSoon /> },
    { path: "*", element: <Navigate to="/coming-soon" replace /> },
  ]);
} else {
  // Lazy routes only when the gate is open
  const Landing = React.lazy(() => import("./pages/Landing.jsx"));
  const Demo    = React.lazy(() => import("./pages/Demo.jsx"));
  const Wizard  = React.lazy(() => import("./pages/Wizard.jsx"));
  const Login   = React.lazy(() => import("./pages/Login.jsx"));
  const Signup  = React.lazy(() => import("./pages/Signup.jsx"));

  router = createBrowserRouter([
    { path: "/", element: <Landing /> },
    { path: "/sample", element: <Demo /> },
    { path: "/wizard", element: <Wizard /> },
    { path: "/demo", element: <Wizard /> }, // keep or remove if redundant
    { path: "/login", element: <Login /> },
    { path: "/signup", element: <Signup /> },
    { path: "/coming-soon", element: <ComingSoon /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <RouterProvider router={router} />
    </React.Suspense>
  </React.StrictMode>
);
