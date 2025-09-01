import React from "react";
import { Link } from "react-router-dom";

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>FlowGestio</h1>
      <p>Welcome! Use the link below to try the research endpoint.</p>
      <p>
        <Link to="/research-tester" style={{ color: "#06c" }}>
          Open Research Tester →
        </Link>
      </p>
    </div>
  );
}
