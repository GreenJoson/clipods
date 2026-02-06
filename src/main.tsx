/**
 * @input  依赖：React, ReactDOM, App, ./index.css
 * @output 导出：无（渲染入口）
 * @pos    前端应用启动与挂载
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
