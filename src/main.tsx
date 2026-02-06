/**
 * @input  依赖：React, ReactDOM, App
 * @output 导出：无（渲染入口）
 * @pos    前端应用启动与挂载
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
