import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "./app/App";
import "./styles.css";
import "@fontsource-variable/golos-text";
import "@fontsource/jetbrains-mono/400.css";
import "./product.css";
import "./refinements.css";
import "./projects.css";
import "./light-theme.css";
const Router = import.meta.env.MODE === "github" ? HashRouter : BrowserRouter;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
