/**
 * @input  依赖：React, ReactDOM, App, ./index.css, ./utils/globalShim, 开发错误提示
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

const ERROR_OVERLAY_ID = "dev-error-overlay";

const showDevErrorOverlay = (title: string, message: string) => {
  if (!import.meta.env.DEV) {
    return;
  }
  let overlay = document.getElementById(ERROR_OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = ERROR_OVERLAY_ID;
    overlay.className = "dev-error-overlay";
    const card = document.createElement("div");
    card.className = "dev-error-card";
    const titleEl = document.createElement("div");
    titleEl.className = "dev-error-title";
    const bodyEl = document.createElement("pre");
    bodyEl.className = "dev-error-body";
    const tipEl = document.createElement("div");
    tipEl.className = "dev-error-tip";
    tipEl.textContent = "请查看终端或控制台的错误信息。";
    card.append(titleEl, bodyEl, tipEl);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }
  const titleEl = overlay.querySelector(".dev-error-title");
  const bodyEl = overlay.querySelector(".dev-error-body");
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (bodyEl) {
    bodyEl.textContent = message;
  }
};

const installDevErrorOverlay = () => {
  if (!import.meta.env.DEV) {
    return;
  }
  window.addEventListener("error", (event) => {
    const error = event.error as Error | undefined;
    const details = error?.stack ?? error?.message ?? event.message;
    showDevErrorOverlay("前端运行时错误", details || "未知错误");
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const details =
      reason instanceof Error
        ? reason.stack ?? reason.message
        : String(reason ?? "未知错误");
    showDevErrorOverlay("Promise 未处理", details);
  });
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    showDevErrorOverlay("界面渲染出错", error.stack ?? error.message);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    const error = this.state.error;
    return (
      <div className="dev-error-fallback">
        <div className="dev-error-card">
          <div className="dev-error-title">界面渲染出错</div>
          <pre className="dev-error-body">
            {error?.stack ?? error?.message}
          </pre>
          <div className="dev-error-tip">
            请检查终端输出，修复后重新运行。
          </div>
        </div>
      </div>
    );
  }
}

installDevErrorOverlay();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
