import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./immersive.css";

// Stable loader: the 3D viewer is fetched only when the player opens the preview.
const loadSpacecraftViewer = () => import("./ui/FableViewerBridge");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App loadSpacecraftViewer={loadSpacecraftViewer} />
  </React.StrictMode>,
);
