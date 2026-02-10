/**
 * @input  依赖：React, 配置类型, 启动配置, 登录入口, 登录状态, Codex.app 启动参数展示, session 项目路径解析工具, 会话内终端/IDE 快速切换, 紧凑布局, i18n
 * @output 导出：SessionCard 组件
 * @pos    会话卡片展示与操作（含 Codex.app 调试信息、项目路径展示与终端/IDE 偏好记忆）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { IdeProfile, SessionConfig, TerminalProfile } from "../types/config";
import { useI18n } from "../i18n";
import { parseSessionProjectPath } from "../models/session";

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
  onSwitchTerminalProfile: (
    session: SessionConfig,
    terminalProfileId?: string
  ) => void;
  onSwitchIdeProfile: (session: SessionConfig, ideProfileId?: string) => void;
}

const SessionCard = ({
  session,
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
  onSwitchTerminalProfile,
  onSwitchIdeProfile,
}: SessionCardProps) => {
  const { t } = useI18n();
  const loginStatusLabel = (() => {
    if (session.loginType === "chatgpt") {
      if (loginStatus === "chatgpt") return t("session.value.loginStatus.loggedIn");
      return t("session.value.loginStatus.notLoggedIn");
    }
    if (loginStatus === "api") return t("session.value.loginStatus.configured");
    return t("session.value.loginStatus.notConfigured");
  })();

  const loginStatusTone = (() => {
    if (session.loginType === "chatgpt") {
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
        </div>
        <div className="session-path">{session.codexHome}</div>
      </div>
      <div className="session-kv-grid">
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.loginMethod")}</span>
          <span className="session-kv-value">
            {session.loginType === "chatgpt"
              ? t("session.value.loginMethod.chatgpt")
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
            {session.loginType === "api"
              ? session.env
                ? t("session.value.env.items", {
                    count: Object.keys(session.env).length,
                  })
                : t("session.value.env.none")
              : t("session.value.env.noneRequired")}
          </span>
        </div>
        <div className="session-kv-item">
          <span className="session-kv-label">{t("session.label.codexApp")}</span>
          <span className="session-kv-value">
            {codexAppStatus}
            {codexAppDetail ? ` / ${codexAppDetail}` : ""}
          </span>
        </div>
        {session.codexAppEnabled ? (
          <div className="session-kv-item">
            <span className="session-kv-label">{t("session.label.appPath")}</span>
            <span className="session-kv-value">
              {session.codexAppPath ?? t("session.value.appPath.default")}
            </span>
          </div>
        ) : null}
        {session.codexAppEnabled ? (
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
        {session.codexAppEnabled ? (
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
      {session.loginType === "chatgpt" ? (
        <button
          type="button"
          className="btn"
          onClick={() => onLogin(session, terminalProfile)}
        >
          {t("session.action.login")}
        </button>
      ) : null}
      {session.codexAppEnabled ? (
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
