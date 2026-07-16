import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from "./App";
import { store } from "./app/store";
import { theme } from "./theme";
import "./index.css";

const root = createRoot(document.getElementById("root"));
const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

// The real-time engine owns Web Workers, pointer-lock listeners, and a fixed-step
// simulation. Avoiding StrictMode's development-only double mount prevents a
// second worker/game-loop startup when running `npm start`.
root.render(
  <Provider store={store}>
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Router>
  </Provider>
);
