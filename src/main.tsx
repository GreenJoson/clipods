/**
 * @input  依赖：React, ReactDOM, App, ./index.css, ./utils/globalShim
 * @output 导出：无（渲染入口）
 * @pos    前端应用启动与挂载
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import "./utils/globalShim";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
