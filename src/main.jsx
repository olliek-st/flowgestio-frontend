// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Landing from "./pages/Landing.jsx";
import Demo from "./pages/Demo.jsx";
// If you created these pages, keep the imports & routes below.
// If not, delete the imports and their route entries.
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
// src/main.jsx (or App.jsx)
import { initAnalytics } from "./lib/analytics";
initAnalytics();
import Wizard from "./pages/Wizard.jsx";
const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/demo", element: <Wizard /> },
  { path: "/wizard", element: <Wizard /> },
  { path: "/sample", element: <Demo /> },
  { path: "/login", element: <Login /> },   // remove if you don't have this file yet
  { path: "/signup", element: <Signup /> }, // remove if you don't have this file yet
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
