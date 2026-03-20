/**
 * @input  依赖：React, 配置类型, 绑定账号展示, 启动配置, 登录入口, 登录状态, Codex/Claude 客户端切换与展示, Codex.app 启动参数展示, session 项目路径解析工具, 会话内终端/IDE 快速切换, 紧凑布局, i18n
 * @output 导出：SessionCard 组件
 * @pos    会话卡片展示与操作（含客户端/终端/IDE 快速切换、绑定账号摘要、Codex.app 调试信息与项目路径展示）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type {
  AuthAccount,
  IdeProfile,
  SessionClientType,
  SessionConfig,
  TerminalProfile,
} from "../types/config";
import { useI18n } from "../i18n";
import { parseSessionProjectPath } from "../models/session";

const isCodexSession = (session: SessionConfig): boolean =>
  (session.clientType ?? "codex") === "codex";

const buildCodexAppUserDataDir = (session: SessionConfig): string | null => {
  if (!session.codexAppEnabled) {
    return null;
  }
  const explicit = session.codexAppUserDataDir?.trim();
  if (explicit) {
    return explicit;
  }
  if (!session.codexAppAllowMultiple) {
    return null;
  }
  const base = session.codexHome.replace(/\/+$/u, "");
  const safeSessionId = session.id.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `${base}/app_data/${safeSessionId}`;
};

const buildCodexAppLaunchArgs = (
  session: SessionConfig,
  userDataDir: string | null
): string | null => {
  if (!session.codexAppEnabled) {
    return null;
  }
  const appPath = session.codexAppPath?.trim() || "/Applications/Codex.app";
  const openPrefix = session.codexAppAllowMultiple ? "open -n -a" : "open -a";
  if (!userDataDir) {
    return `${openPrefix} ${appPath}`;
  }
  return `${openPrefix} ${appPath} --args --user-data-dir ${userDataDir}`;
};

interface SessionCardProps {
  session: SessionConfig;
  boundAccount?: AuthAccount;
  loginStatus?: "missing" | "api" | "chatgpt";
  terminalProfile?: TerminalProfile;
  terminalProfiles: TerminalProfile[];
  ideProfile?: IdeProfile;
  ideProfiles: IdeProfile[];
  isDefault?: boolean;
  delayMs?: number;
  onLaunchTerminal: (session: SessionConfig, profile?: TerminalProfile) => void;
  onLaunchIde: (session: SessionConfig, profile?: IdeProfile) => void;
  onLaunchCodexApp: (session: SessionConfig) => void;
  onLogin: (session: SessionConfig, profile?: TerminalProfile) => void;
  onRevealHome: (session: SessionConfig) => void;
  onEdit: (session: SessionConfig) => void;
  onDuplicate: (session: SessionConfig) => void;
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

const SessionCard = ({
  session,
  boundAccount,
  loginStatus,
  terminalProfile,
  terminalProfiles,
  ideProfile,
  ideProfiles,
  isDefault,
  delayMs,
  onLaunchTerminal,
  onLaunchIde,
  onLaunchCodexApp,
  onLogin,
  onRevealHome,
  onEdit,
  onDuplicate,
  onSwitchClientType,
  onSwitchTerminalProfile,
  onSwitchIdeProfile,
}: SessionCardProps) => {
  const { t } = useI18n();
  const codexClient = isCodexSession(session);
  const effectiveLoginType = boundAccount?.type ?? session.loginType;
  const loginStatusLabel = (() => {
    if (boundAccount) {
      return t("session.value.loginStatus.bound");
    }
    if (effectiveLoginType === "chatgpt") {
      if (loginStatus === "chatgpt") return t("session.value.loginStatus.loggedIn");
      return t("session.value.loginStatus.notLoggedIn");
    }
    if (loginStatus === "api") return t("session.value.loginStatus.configured");
    return t("session.value.loginStatus.notConfigured");
  })();

  const loginStatusTone = (() => {
    if (boundAccount) {
      return "success";
    }
    if (effectiveLoginType === "chatgpt") {
      if (loginStatus === "chatgpt") return "success";
      return "error";
    }
    if (loginStatus === "api") return "success";
    return "warning";
  })();

  const codexAppStatus = session.codexAppEnabled
    ? t("session.value.codexApp.enabled")
    : t("session.value.codexApp.disabled");
  const codexAppDetail = session.codexAppEnabled
    ? session.codexAppAllowMultiple
      ? t("session.value.codexApp.multi")
      : t("session.value.codexApp.single")
    : "";
  const codexAppUserDataDir = buildCodexAppUserDataDir(session);
  const codexAppLaunchArgs = buildCodexAppLaunchArgs(
    session,
    codexAppUserDataDir
  );

  return (
    <div
      className="session-card motion-rise-in"
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="session-meta">
        <div className="session-title">
          {session.name}
          {isDefault ? (
            <span className="badge badge-accent">{t("common.default")}</span>
          ) : null}
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={() => onDuplicate(session)}
            title={t("session.action.duplicate")}
            aria-label={t("session.action.duplicate")}
            style={{ marginLeft: "auto" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.5 4.5V2.5C5.5 1.94772 5.94772 1.5 6.5 1.5H13.5C14.0523 1.5 14.5 1.94772 14.5 2.5V9.5C14.5 10.0523 14.0523 10.5 13.5 10.5H11.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect
                x="1.5"
                y="5.5"
                width="9"
                height="9"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
        <div className="session-path">{session.codexHome}</div>
      </div>
      <div className="session-kv-grid">
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.client")}</span>
          <span className="session-kv-value">
            <select
              className="field-input session-inline-select"
              value={session.clientType ?? "codex"}
              onChange={(event) =>
                onSwitchClientType(
                  session,
                  event.target.value === "claude" ? "claude" : "codex"
                )
              }
              aria-label={t("session.action.switchClient")}
            >
              <option value="codex">{t("session.value.client.codex")}</option>
              <option value="claude">{t("session.value.client.claude")}</option>
            </select>
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.loginMethod")}</span>
          <span className="session-kv-value">
            {effectiveLoginType === "chatgpt"
              ? boundAccount
                ? boundAccount.type === "chatgpt"
                  ? t("session.value.loginMethod.chatgpt")
                  : t("session.value.loginMethod.api")
                : codexClient
                  ? t("session.value.loginMethod.chatgpt")
                  : t("session.value.loginMethod.claude")
              : t("session.value.loginMethod.api")}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.loginStatus")}</span>
          <span className={`status-pill status-pill-${loginStatusTone}`}>
            {loginStatusLabel}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.account")}</span>
          <span className="session-kv-value">
            {boundAccount?.name ?? t("session.value.account.none")}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.terminal")}</span>
          <span className="session-kv-value">
            <select
              className="field-input session-inline-select"
              value={session.terminalProfileId ?? ""}
              onChange={(event) =>
                onSwitchTerminalProfile(session, event.target.value || undefined)
              }
              aria-label={t("session.action.switchTerminal")}
            >
              <option value="">{t("common.notSet")}</option>
              {terminalProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.ide")}</span>
          <span className="session-kv-value">
            <select
              className="field-input session-inline-select"
              value={session.ideProfileId ?? ""}
              onChange={(event) =>
                onSwitchIdeProfile(session, event.target.value || undefined)
              }
              aria-label={t("session.action.switchIde")}
            >
              <option value="">{t("common.notSet")}</option>
              {ideProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.launcher")}</span>
          <span className="session-kv-value">
            {terminalProfile?.command ?? "open -a Terminal"}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.env")}</span>
          <span className="session-kv-value">
            {effectiveLoginType === "api"
              ? boundAccount
                ? t("session.value.env.accountManaged")
                : session.env
                  ? t("session.value.env.items", {
                      count: Object.keys(session.env).length,
                    })
                  : t("session.value.env.none")
              : boundAccount
                ? t("session.value.env.accountManaged")
                : t("session.value.env.noneRequired")}
          </span>
        </div>
        {codexClient ? (
          <div className="session-kv-item">
            <span className="session-kv-label">{t("session.label.codexApp")}</span>
            <span className="session-kv-value">
              {codexAppStatus}
              {codexAppDetail ? ` / ${codexAppDetail}` : ""}
            </span>
          </div>
        ) : null}
        {codexClient && session.codexAppEnabled ? (
          <div className="session-kv-item">
            <span className="session-kv-label">{t("session.label.appPath")}</span>
            <span className="session-kv-value">
              {session.codexAppPath ?? t("session.value.appPath.default")}
            </span>
          </div>
        ) : null}
        {codexClient && session.codexAppEnabled ? (
          <div className="session-kv-item">
            <span className="session-kv-label">
              {t("session.label.codexAppUserDataDir")}
            </span>
            <span className="session-kv-value session-kv-mono">
              {codexAppUserDataDir ??
                t("session.value.codexAppUserDataDir.default")}
            </span>
          </div>
        ) : null}
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.projectPath")}</span>
          <span className="session-kv-value">
            {parseSessionProjectPath(session.launchCommand) ??
              t("session.value.projectPath.default")}
          </span>
        </div>
        {codexClient && session.codexAppEnabled ? (
          <div className="session-kv-item session-kv-wide">
            <span className="session-kv-label">
              {t("session.label.codexAppArgs")}
            </span>
            <span
              className="session-kv-value session-kv-mono"
              title={
                codexAppLaunchArgs ??
                t("session.value.codexAppArgs.default")
              }
            >
              {codexAppLaunchArgs ??
                t("session.value.codexAppArgs.default")}
            </span>
          </div>
        ) : null}
        <div className="session-kv-item session-kv-wide">
          <span className="session-kv-label">{t("session.label.launchCommand")}</span>
          <span
            className="session-kv-value session-kv-mono"
            title={
              session.launchCommand ?? t("session.value.launchCommand.default")
            }
          >
            {session.launchCommand ?? t("session.value.launchCommand.default")}
          </span>
        </div>
      </div>
      <div className="session-actions">
      {effectiveLoginType === "chatgpt" && !boundAccount ? (
        <button
          type="button"
          className="btn"
          onClick={() => onLogin(session, terminalProfile)}
        >
          {t("session.action.login")}
        </button>
      ) : null}
      {codexClient && session.codexAppEnabled ? (
        <button
          type="button"
          className="btn"
          onClick={() => onLaunchCodexApp(session)}
        >
          {t("session.action.openCodexApp")}
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onLaunchTerminal(session, terminalProfile)}
      >
        {t("session.action.openTerminal")}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => onLaunchIde(session, ideProfile)}
      >
        {t("session.action.openIde")}
      </button>
      <button type="button" className="btn" onClick={() => onEdit(session)}>
        {t("session.action.edit")}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => onRevealHome(session)}
      >
        {t("session.action.openDir")}
      </button>
      </div>
    </div>
  );
};

export default SessionCard;
