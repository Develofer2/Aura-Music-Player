/** Application entry point: mounts the React tree into #root. Copyright (c) 2026 Develofer2. MIT License. */
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "@fontsource-variable/manrope"
import "@fontsource-variable/space-grotesk"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
