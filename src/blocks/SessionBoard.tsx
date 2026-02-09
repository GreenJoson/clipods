/**
 * @input  依赖：SessionCard, EmptyState, 配置类型, 启动配置, 登录入口, 登录状态
 * @output 导出：SessionBoard 区块
 * @pos    会话列表布局与空态控制
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import EmptyState from "../components/EmptyState";
import SessionCard from "../components/SessionCard";
import type { IdeProfile, SessionConfig, TerminalProfile } from "../types/config";

interface SessionBoardProps {
  sessions: SessionConfig[];
  terminalProfiles: TerminalProfile[];
  ideProfiles: IdeProfile[];
  defaultSessionId?: string;
  loginStatusMap: Record<string, "missing" | "api" | "chatgpt">;
  onCreateSession: () => void;
  onLaunchTerminal: (session: SessionConfig, profile?: TerminalProfile) => void;
  onLaunchIde: (session: SessionConfig, profile?: IdeProfile) => void;
  onLogin: (session: SessionConfig, profile?: TerminalProfile) => void;
  onRevealHome: (session: SessionConfig) => void;
  onEditSession: (session: SessionConfig) => void;
}

const SessionBoard = ({
  sessions,
  terminalProfiles,
  ideProfiles,
  defaultSessionId,
  loginStatusMap,
  onCreateSession,
  onLaunchTerminal,
  onLaunchIde,
  onLogin,
  onRevealHome,
  onEditSession,
}: SessionBoardProps) => {
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="先建一个会话"
        description="创建会话后，你可以为每个账号配置独立的 CODEX_HOME 与启动方式。"
        actionLabel="创建会话"
        onAction={onCreateSession}
      />
    );
  }

  const terminalMap = new Map(
    terminalProfiles.map((profile) => [profile.id, profile])
  );
  const ideMap = new Map(ideProfiles.map((profile) => [profile.id, profile]));

  return (
    <div className="session-grid">
      {sessions.map((session, index) => (
        <SessionCard
          key={session.id}
          session={session}
          loginStatus={loginStatusMap[session.id]}
          terminalProfile={
            session.terminalProfileId
              ? terminalMap.get(session.terminalProfileId)
              : undefined
          }
          ideProfile={
            session.ideProfileId ? ideMap.get(session.ideProfileId) : undefined
          }
          isDefault={session.id === defaultSessionId}
          delayMs={index * 80}
          onLaunchTerminal={onLaunchTerminal}
          onLaunchIde={onLaunchIde}
          onLogin={onLogin}
          onRevealHome={onRevealHome}
          onEdit={onEditSession}
        />
      ))}
    </div>
  );
};

export default SessionBoard;
