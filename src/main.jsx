import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";

import Landing from "./pages/Landing.jsx";
import Demo from "./pages/Demo.jsx";
import Wizard from "./pages/Wizard.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

import { initAnalytics } from "./lib/analytics";
initAnalytics();

const COMING_SOON = import.meta.env.VITE_COMING_SOON === "1";

const router = createBrowserRouter([
  COMING_SOON
    ? { path: "/", element: <Navigate to="/coming-soon" replace /> }
    : { path: "/", element: <Landing /> },

  { path: "/coming-soon", element: <ComingSoon /> },
  { path: "/demo", element: <Wizard /> },
  { path: "/wizard", element: <Wizard /> },
  { path: "/sample", element: <Demo /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "*", element: <Navigate to={COMING_SOON ? "/coming-soon" : "/"} replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
