/**
 * @input  依赖：SessionCard, EmptyState, 配置类型, 账号池, 启动配置, 登录入口, 登录状态, Codex.app 启动, 会话客户端/终端/IDE 快速切换, i18n
 * @output 导出：SessionBoard 区块
 * @pos    会话列表布局与空态控制（含绑定账号透传、客户端/终端/IDE 偏好透传）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import EmptyState from "../components/EmptyState";
import SessionCard from "../components/SessionCard";
import type {
  AuthAccount,
  IdeProfile,
  SessionClientType,
  SessionConfig,
  TerminalProfile,
} from "../types/config";
import { useI18n } from "../i18n";

interface SessionBoardProps {
  sessions: SessionConfig[];
  accounts: AuthAccount[];
  terminalProfiles: TerminalProfile[];
  ideProfiles: IdeProfile[];
  defaultSessionId?: string;
  loginStatusMap: Record<string, "missing" | "api" | "chatgpt">;
  onCreateSession: () => void;
  onLaunchTerminal: (session: SessionConfig, profile?: TerminalProfile) => void;
  onLaunchIde: (session: SessionConfig, profile?: IdeProfile) => void;
  onLaunchCodexApp: (session: SessionConfig) => void;
  onLogin: (session: SessionConfig, profile?: TerminalProfile) => void;
  onRevealHome: (session: SessionConfig) => void;
  onEditSession: (session: SessionConfig) => void;
  onDuplicateSession: (session: SessionConfig) => void;
  onSwitchClientType: (
    session: SessionConfig,
    clientType: SessionClientType
  ) => void;
  onSwitchTerminalProfile: (
    session: SessionConfig,
    terminalProfileId?: string
  ) => void;
  onSwitchIdeProfile: (session: SessionConfig, ideProfileId?: string) => void;
}

const SessionBoard = ({
  sessions,
  accounts,
  terminalProfiles,
  ideProfiles,
  defaultSessionId,
  loginStatusMap,
  onCreateSession,
  onLaunchTerminal,
  onLaunchIde,
  onLaunchCodexApp,
  onLogin,
  onRevealHome,
  onEditSession,
  onDuplicateSession,
  onSwitchClientType,
  onSwitchTerminalProfile,
  onSwitchIdeProfile,
}: SessionBoardProps) => {
  const { t } = useI18n();
  if (sessions.length === 0) {
    return (
      <EmptyState
        title={t("empty.sessions.title")}
        description={t("empty.sessions.desc")}
        actionLabel={t("empty.sessions.action")}
        onAction={onCreateSession}
      />
    );
  }

  const terminalMap = new Map(
    terminalProfiles.map((profile) => [profile.id, profile])
  );
  const ideMap = new Map(ideProfiles.map((profile) => [profile.id, profile]));
  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  return (
    <div className="session-grid">
      {sessions.map((session, index) => (
        <SessionCard
          key={session.id}
          session={session}
          boundAccount={
            session.boundAccountId
              ? accountMap.get(session.boundAccountId)
              : undefined
          }
          loginStatus={loginStatusMap[session.id]}
          terminalProfile={
            session.terminalProfileId
              ? terminalMap.get(session.terminalProfileId)
              : undefined
          }
          terminalProfiles={terminalProfiles}
          ideProfile={
            session.ideProfileId ? ideMap.get(session.ideProfileId) : undefined
          }
          ideProfiles={ideProfiles}
          isDefault={session.id === defaultSessionId}
          delayMs={index * 80}
          onLaunchTerminal={onLaunchTerminal}
          onLaunchIde={onLaunchIde}
          onLaunchCodexApp={onLaunchCodexApp}
          onLogin={onLogin}
          onRevealHome={onRevealHome}
          onEdit={onEditSession}
          onDuplicate={onDuplicateSession}
          onSwitchClientType={onSwitchClientType}
          onSwitchTerminalProfile={onSwitchTerminalProfile}
          onSwitchIdeProfile={onSwitchIdeProfile}
        />
      ))}
    </div>
  );
};

export default SessionBoard;
