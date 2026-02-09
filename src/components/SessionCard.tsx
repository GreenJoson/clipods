/**
 * @input  依赖：React, 配置类型, 启动配置, 登录入口, 登录状态, 项目路径正则解析, 紧凑布局
 * @output 导出：SessionCard 组件
 * @pos    会话卡片展示与操作
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { IdeProfile, SessionConfig, TerminalProfile } from "../types/config";

const parseProjectPath = (command?: string): string | null => {
  if (!command) {
    return null;
  }
  const match = command.match(/--cd(?:=|\s+)(?:(["'])(.*?)\1|([^\s]+))/u);
  if (!match) {
    return null;
  }
  return match[2] ?? match[3] ?? null;
};

interface SessionCardProps {
  session: SessionConfig;
  loginStatus?: "missing" | "api" | "chatgpt";
  terminalProfile?: TerminalProfile;
  ideProfile?: IdeProfile;
  isDefault?: boolean;
  delayMs?: number;
  onLaunchTerminal: (session: SessionConfig, profile?: TerminalProfile) => void;
  onLaunchIde: (session: SessionConfig, profile?: IdeProfile) => void;
  onLogin: (session: SessionConfig, profile?: TerminalProfile) => void;
  onRevealHome: (session: SessionConfig) => void;
  onEdit: (session: SessionConfig) => void;
}

const SessionCard = ({
  session,
  loginStatus,
  terminalProfile,
  ideProfile,
  isDefault,
  delayMs,
  onLaunchTerminal,
  onLaunchIde,
  onLogin,
  onRevealHome,
  onEdit,
}: SessionCardProps) => {
  const loginStatusLabel = (() => {
    if (session.loginType === "chatgpt") {
      if (loginStatus === "chatgpt") return "已登录";
      return "未登录";
    }
    if (loginStatus === "api") return "已配置";
    return "未配置";
  })();

  const loginStatusTone = (() => {
    if (session.loginType === "chatgpt") {
      if (loginStatus === "chatgpt") return "success";
      return "error";
    }
    if (loginStatus === "api") return "success";
    return "warning";
  })();

  return (
    <div
      className="session-card motion-rise-in"
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="session-meta">
        <div className="session-title">
          {session.name}
          {isDefault ? <span className="badge badge-accent">默认</span> : null}
        </div>
        <div className="session-path">{session.codexHome}</div>
      </div>
      <div className="session-kv-grid">
        <div className="session-kv-item">
          <span className="session-kv-label">登录方式</span>
          <span className="session-kv-value">
            {session.loginType === "chatgpt" ? "官方登录" : "API 登录"}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">登录状态</span>
          <span className={`status-pill status-pill-${loginStatusTone}`}>
            {loginStatusLabel}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">终端</span>
          <span className="session-kv-value">
            {terminalProfile?.name ?? "未设置"}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">IDE</span>
          <span className="session-kv-value">{ideProfile?.name ?? "未设置"}</span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">启动方式</span>
          <span className="session-kv-value">
            {terminalProfile?.command ?? "open -a Terminal"}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">环境变量</span>
          <span className="session-kv-value">
            {session.loginType === "api"
              ? session.env
                ? `${Object.keys(session.env).length} 项`
                : "无"
              : "无需"}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">项目路径</span>
          <span className="session-kv-value">
            {parseProjectPath(session.launchCommand) ?? "未设置"}
          </span>
        </div>
        <div className="session-kv-item session-kv-wide">
          <span className="session-kv-label">启动命令</span>
          <span
            className="session-kv-value session-kv-mono"
            title={session.launchCommand ?? "未设置"}
          >
            {session.launchCommand ?? "未设置"}
          </span>
        </div>
      </div>
      <div className="session-actions">
      {session.loginType === "chatgpt" ? (
        <button
          type="button"
          className="btn"
          onClick={() => onLogin(session, terminalProfile)}
        >
          官方登录
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onLaunchTerminal(session, terminalProfile)}
      >
        打开终端
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => onLaunchIde(session, ideProfile)}
      >
        打开 IDE
      </button>
      <button type="button" className="btn" onClick={() => onEdit(session)}>
        编辑
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => onRevealHome(session)}
      >
        打开目录
      </button>
      </div>
    </div>
  );
};

export default SessionCard;
