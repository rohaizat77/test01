import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import { SessionProvider } from "./lib/session";
import { LangProvider } from "./lib/i18n";
import { applyTheme, watchSystemTheme } from "./lib/theme";

applyTheme();
watchSystemTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <LangProvider>
          <App />
        </LangProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
