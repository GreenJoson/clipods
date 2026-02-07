/**
 * @input  依赖：React, 配置类型
 * @output 导出：SessionCard 组件
 * @pos    会话卡片展示与操作
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { IdeProfile, SessionConfig, TerminalProfile } from "../types/config";

interface SessionCardProps {
  session: SessionConfig;
  terminalProfile?: TerminalProfile;
  ideProfile?: IdeProfile;
  isDefault?: boolean;
  delayMs?: number;
  onLaunchTerminal: (session: SessionConfig) => void;
  onLaunchIde: (session: SessionConfig, profile?: IdeProfile) => void;
  onEnsureHome: (session: SessionConfig) => void;
  onRevealHome: (session: SessionConfig) => void;
}

const SessionCard = ({
  session,
  terminalProfile,
  ideProfile,
  isDefault,
  delayMs,
  onLaunchTerminal,
  onLaunchIde,
  onEnsureHome,
  onRevealHome,
}: SessionCardProps) => (
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
      <div className="session-meta">
        <span className="badge">{session.loginType.toUpperCase()}</span>
        <span className="badge">
          终端 {terminalProfile?.name ?? "未设置"}
        </span>
        <span className="badge">IDE {ideProfile?.name ?? "未设置"}</span>
      </div>
    </div>
    <div className="session-meta">
      <div className="badge">启动方式</div>
      <div className="session-path">
        {terminalProfile?.command ?? "open -a Terminal"}
      </div>
    </div>
    <div className="session-meta">
      <div className="badge">环境变量</div>
      <div className="session-path">
        {session.env ? `${Object.keys(session.env).length} 项` : "无"}
      </div>
    </div>
    <div className="session-actions">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onLaunchTerminal(session)}
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
      <button type="button" className="btn" onClick={() => onEnsureHome(session)}>
        登录准备
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => onRevealHome(session)}>
        打开目录
      </button>
    </div>
  </div>
);

export default SessionCard;
