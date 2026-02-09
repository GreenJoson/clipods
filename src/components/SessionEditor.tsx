/**
 * @input  依赖：React, Modal, 配置类型, 表单辅助, 启动命令构建器, 环境变量快捷填充, 高级 TOML, Codex.app 设置, 提示弹层, 终端配置引导, i18n
 * @output 导出：SessionEditor 组件
 * @pos    会话创建与编辑弹窗
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useEffect, useState, type FormEvent } from "react";
import Modal from "./Modal";
import type {
  IdeProfile,
  SessionAuthType,
  SessionConfig,
  TerminalProfile,
} from "../types/config";
import { useI18n } from "../i18n";

interface SessionEditorProps {
  open: boolean;
  session: SessionConfig;
  isNew: boolean;
  terminalProfiles: TerminalProfile[];
  ideProfiles: IdeProfile[];
  onCreateTerminalProfile: () => void;
  onSave: (session: SessionConfig) => void;
  onCancel: () => void;
  onDelete?: (sessionId: string) => void;
}

const buildEnvText = (env?: Record<string, string>): string => {
  if (!env) {
    return "";
  }
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
};

const parseEnvText = (value: string): Record<string, string> | undefined => {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim()] as const;
    })
    .filter(([key, envValue]) => key.length > 0 && envValue.length > 0);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

type LaunchMode = "interactive" | "resume" | "exec" | "exec-resume";

interface CommandBuilderState {
  mode: LaunchMode;
  profile: string;
  model: string;
  sandbox: string;
  approval: string;
  fullAuto: boolean;
  dangerous: boolean;
  search: boolean;
  cdPath: string;
  addDirs: string;
  configs: string;
  prompt: string;
  resumeId: string;
  useLast: boolean;
  useAll: boolean;
}

type ModeHint = {
  title: string;
  description: string;
  example: string;
};

const splitLines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const mergeEnvText = (
  currentText: string,
  updates: Record<string, string>
): string => {
  const lines = currentText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const indexByKey = new Map<string, number>();

  lines.forEach((line, index) => {
    const [rawKey] = line.split("=");
    const key = rawKey?.trim();
    if (key) {
      indexByKey.set(key, index);
    }
  });

  const output = [...lines];
  Object.entries(updates).forEach(([key, value]) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }
    const line = `${key}=${trimmedValue}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      output.push(line);
    } else {
      output[existingIndex] = line;
    }
  });

  return output.join("\n");
};

const quoteArg = (value: string): string => {
  if (!value) {
    return value;
  }
  if (!/[\s"]/u.test(value)) {
    return value;
  }
  return `"${value.replace(/["\\]/gu, "\\$&")}"`;
};

const buildLaunchCommand = (state: CommandBuilderState): string => {
  const parts: string[] = ["codex"];

  if (state.mode === "exec") {
    parts.push("exec");
  }

  if (state.mode === "exec-resume") {
    parts.push("exec", "resume");
  }

  if (state.mode === "resume") {
    parts.push("resume");
  }

  const profile = state.profile.trim();
  if (profile) {
    parts.push("--profile", quoteArg(profile));
  }

  const model = state.model.trim();
  if (model) {
    parts.push("--model", quoteArg(model));
  }

  if (state.fullAuto) {
    parts.push("--full-auto");
  }

  if (state.dangerous) {
    parts.push("--dangerously-bypass-approvals-and-sandbox");
  }

  const approval = state.approval.trim();
  if (approval) {
    parts.push("--ask-for-approval", approval);
  }

  const sandbox = state.sandbox.trim();
  if (sandbox) {
    parts.push("--sandbox", sandbox);
  }

  if (state.search) {
    parts.push("--search");
  }

  const cdPath = state.cdPath.trim();
  if (cdPath) {
    parts.push("--cd", quoteArg(cdPath));
  }

  splitLines(state.addDirs).forEach((dir) => {
    parts.push("--add-dir", quoteArg(dir));
  });

  splitLines(state.configs).forEach((entry) => {
    parts.push("-c", quoteArg(entry));
  });

  if (state.useLast) {
    parts.push("--last");
  }

  if (state.useAll) {
    parts.push("--all");
  }

  const resumeId = state.resumeId.trim();
  if ((state.mode === "resume" || state.mode === "exec-resume") && resumeId) {
    parts.push(quoteArg(resumeId));
  }

  const prompt = state.prompt.trim();
  if (prompt) {
    parts.push(quoteArg(prompt));
  }

  return parts.join(" ");
};

const isBuilderDirty = (state: CommandBuilderState): boolean =>
  state.mode !== "interactive" ||
  state.profile.trim().length > 0 ||
  state.model.trim().length > 0 ||
  state.sandbox.trim().length > 0 ||
  state.approval.trim().length > 0 ||
  state.fullAuto ||
  state.dangerous ||
  state.search ||
  state.cdPath.trim().length > 0 ||
  state.addDirs.trim().length > 0 ||
  state.configs.trim().length > 0 ||
  state.prompt.trim().length > 0 ||
  state.resumeId.trim().length > 0 ||
  state.useLast ||
  state.useAll;

const SessionEditor = ({
  open,
  session,
  isNew,
  terminalProfiles,
  ideProfiles,
  onCreateTerminalProfile,
  onSave,
  onCancel,
  onDelete,
}: SessionEditorProps) => {
  const { t } = useI18n();
  const [name, setName] = useState(session.name);
  const [codexHome, setCodexHome] = useState(session.codexHome);
  const [loginType, setLoginType] = useState<SessionAuthType>(session.loginType);
  const [terminalProfileId, setTerminalProfileId] = useState(
    session.terminalProfileId ?? ""
  );
  const [ideProfileId, setIdeProfileId] = useState(session.ideProfileId ?? "");
  const [launchCommand, setLaunchCommand] = useState(
    session.launchCommand ?? ""
  );
  const [codexAppEnabled, setCodexAppEnabled] = useState(
    session.codexAppEnabled ?? false
  );
  const [codexAppPath, setCodexAppPath] = useState(
    session.codexAppPath ?? ""
  );
  const [codexAppUserDataDir, setCodexAppUserDataDir] = useState(
    session.codexAppUserDataDir ?? ""
  );
  const [codexAppAllowMultiple, setCodexAppAllowMultiple] = useState(
    session.codexAppAllowMultiple ?? false
  );
  const [envText, setEnvText] = useState(buildEnvText(session.env));
  const [builderMode, setBuilderMode] = useState<LaunchMode>("interactive");
  const [builderProfile, setBuilderProfile] = useState("");
  const [builderModel, setBuilderModel] = useState("");
  const [builderSandbox, setBuilderSandbox] = useState("");
  const [builderApproval, setBuilderApproval] = useState("");
  const [builderFullAuto, setBuilderFullAuto] = useState(false);
  const [builderDangerous, setBuilderDangerous] = useState(false);
  const [builderSearch, setBuilderSearch] = useState(false);
  const [builderCdPath, setBuilderCdPath] = useState("");
  const [builderAddDirs, setBuilderAddDirs] = useState("");
  const [builderConfigs, setBuilderConfigs] = useState("");
  const [builderPrompt, setBuilderPrompt] = useState("");
  const [builderResumeId, setBuilderResumeId] = useState("");
  const [builderUseLast, setBuilderUseLast] = useState(false);
  const [builderUseAll, setBuilderUseAll] = useState(false);
  const [envApiKey, setEnvApiKey] = useState("");
  const [envBaseUrl, setEnvBaseUrl] = useState("");
  const [envModel, setEnvModel] = useState("");
  const [envOrg, setEnvOrg] = useState("");
  const [envProject, setEnvProject] = useState("");
  const [extraConfigToml, setExtraConfigToml] = useState(
    session.extraConfigToml ?? ""
  );
  const [showModeHelp, setShowModeHelp] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(session.name);
    setCodexHome(session.codexHome);
    setLoginType(session.loginType);
    setTerminalProfileId(session.terminalProfileId ?? "");
    setIdeProfileId(session.ideProfileId ?? "");
    setLaunchCommand(session.launchCommand ?? "");
    setCodexAppEnabled(session.codexAppEnabled ?? false);
    setCodexAppPath(session.codexAppPath ?? "");
    setCodexAppUserDataDir(session.codexAppUserDataDir ?? "");
    setCodexAppAllowMultiple(session.codexAppAllowMultiple ?? false);
    setEnvText(buildEnvText(session.env));
    setBuilderMode("interactive");
    setBuilderProfile("");
    setBuilderModel("");
    setBuilderSandbox("");
    setBuilderApproval("");
    setBuilderFullAuto(false);
    setBuilderDangerous(false);
    setBuilderSearch(false);
    setBuilderCdPath("");
    setBuilderAddDirs("");
    setBuilderConfigs("");
    setBuilderPrompt("");
    setBuilderResumeId("");
    setBuilderUseLast(false);
    setBuilderUseAll(false);
    const initialEnv = session.env ?? parseEnvText(buildEnvText(session.env));
    setEnvApiKey(initialEnv?.OPENAI_API_KEY ?? "");
    setEnvBaseUrl(
      initialEnv?.OPENAI_BASE_URL ?? initialEnv?.BASE_URL ?? ""
    );
    setEnvModel(initialEnv?.OPENAI_MODEL ?? initialEnv?.MODEL ?? "");
    setEnvOrg(
      initialEnv?.OPENAI_ORGANIZATION ?? initialEnv?.OPENAI_ORG_ID ?? ""
    );
    setEnvProject(initialEnv?.OPENAI_PROJECT ?? "");
    setExtraConfigToml(session.extraConfigToml ?? "");
    setShowModeHelp(false);
  }, [open, session]);

  useEffect(() => {
    if (!showModeHelp) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setShowModeHelp(false);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [showModeHelp, builderMode]);

  const commandPreview = buildLaunchCommand({
    mode: builderMode,
    profile: builderProfile,
    model: builderModel,
    sandbox: builderSandbox,
    approval: builderApproval,
    fullAuto: builderFullAuto,
    dangerous: builderDangerous,
    search: builderSearch,
    cdPath: builderCdPath,
    addDirs: builderAddDirs,
    configs: builderConfigs,
    prompt: builderPrompt,
    resumeId: builderResumeId,
    useLast: builderUseLast,
    useAll: builderUseAll,
  });

  const builderState: CommandBuilderState = {
    mode: builderMode,
    profile: builderProfile,
    model: builderModel,
    sandbox: builderSandbox,
    approval: builderApproval,
    fullAuto: builderFullAuto,
    dangerous: builderDangerous,
    search: builderSearch,
    cdPath: builderCdPath,
    addDirs: builderAddDirs,
    configs: builderConfigs,
    prompt: builderPrompt,
    resumeId: builderResumeId,
    useLast: builderUseLast,
    useAll: builderUseAll,
  };

  const modeHints: Record<LaunchMode, ModeHint> = {
    interactive: {
      title: t("modeHint.interactive.title"),
      description: t("modeHint.interactive.desc"),
      example: t("modeHint.interactive.example"),
    },
    resume: {
      title: t("modeHint.resume.title"),
      description: t("modeHint.resume.desc"),
      example: t("modeHint.resume.example"),
    },
    exec: {
      title: t("modeHint.exec.title"),
      description: t("modeHint.exec.desc"),
      example: t("modeHint.exec.example"),
    },
    "exec-resume": {
      title: t("modeHint.execResume.title"),
      description: t("modeHint.execResume.desc"),
      example: t("modeHint.execResume.example"),
    },
  };

  const modeHint = modeHints[builderMode];

  const resolveLaunchCommand = (): string | undefined => {
    const trimmed = launchCommand.trim();
    if (trimmed) {
      return trimmed;
    }
    if (isBuilderDirty(builderState) && commandPreview !== "codex") {
      return commandPreview;
    }
    return undefined;
  };

  const resolveEnv = (): Record<string, string> | undefined => {
    const base = parseEnvText(envText) ?? {};
    if (loginType === "api") {
      if (envApiKey.trim()) {
        base.OPENAI_API_KEY = envApiKey.trim();
      }
      if (envBaseUrl.trim()) {
        base.OPENAI_BASE_URL = envBaseUrl.trim();
      }
      if (envModel.trim()) {
        base.OPENAI_MODEL = envModel.trim();
      }
      if (envOrg.trim()) {
        base.OPENAI_ORGANIZATION = envOrg.trim();
      }
      if (envProject.trim()) {
        base.OPENAI_PROJECT = envProject.trim();
      }
    }
    return Object.keys(base).length ? base : undefined;
  };

  const buildSession = (): SessionConfig => ({
    id: session.id,
    name,
    codexHome,
    loginType,
    terminalProfileId: terminalProfileId || undefined,
    ideProfileId: ideProfileId || undefined,
    launchCommand: resolveLaunchCommand(),
    env: resolveEnv(),
    extraConfigToml: extraConfigToml.trim() ? extraConfigToml : undefined,
    codexAppEnabled: codexAppEnabled ? true : undefined,
    codexAppPath: codexAppPath.trim() ? codexAppPath.trim() : undefined,
    codexAppUserDataDir: codexAppUserDataDir.trim()
      ? codexAppUserDataDir.trim()
      : undefined,
    codexAppAllowMultiple:
      codexAppEnabled && codexAppAllowMultiple ? true : undefined,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(buildSession());
  };

  const handleSaveClick = () => {
    onSave(buildSession());
  };

  const handleInsertEnv = (updates: Record<string, string>) => {
    setEnvText((prev) => mergeEnvText(prev, updates));
  };

  const handleApplyCommonEnv = () => {
    handleInsertEnv({
      OPENAI_API_KEY: envApiKey,
      OPENAI_BASE_URL: envBaseUrl,
      OPENAI_MODEL: envModel,
      OPENAI_ORGANIZATION: envOrg,
      OPENAI_PROJECT: envProject,
    });
  };

  const handleReadEnvFromCustom = () => {
    const parsed = parseEnvText(envText) ?? {};
    setEnvApiKey(parsed.OPENAI_API_KEY ?? "");
    setEnvBaseUrl(parsed.OPENAI_BASE_URL ?? parsed.BASE_URL ?? "");
    setEnvModel(parsed.OPENAI_MODEL ?? parsed.MODEL ?? "");
    setEnvOrg(parsed.OPENAI_ORGANIZATION ?? parsed.OPENAI_ORG_ID ?? "");
    setEnvProject(parsed.OPENAI_PROJECT ?? "");
  };

  const handleResetApiDefaults = () => {
    setEnvApiKey("");
    setEnvBaseUrl("");
    setEnvModel("");
    setEnvOrg("");
    setEnvProject("");
    setEnvText("");
    setExtraConfigToml("");
  };

  return (
    <Modal
      open={open}
      title={
        isNew ? t("sessionEditor.title.new") : t("sessionEditor.title.edit")
      }
      description={t("sessionEditor.desc")}
      onClose={onCancel}
      footer={
        <div className="modal-footer-actions">
          {onDelete ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onDelete(session.id)}
            >
              {t("common.delete")}
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveClick}
          >
            {t("common.save")}
          </button>
        </div>
      }
    >
      <form id="session-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="form-field">
          <span className="field-label">{t("sessionEditor.field.name")}</span>
          <input
            className="field-input"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder={t("sessionEditor.placeholder.name")}
            required
          />
        </label>
        <label className="form-field">
          <span className="field-label">
            {t("sessionEditor.field.codexHome")}
          </span>
          <input
            className="field-input"
            value={codexHome}
            onChange={(event) => setCodexHome(event.currentTarget.value)}
            placeholder={t("sessionEditor.placeholder.codexHome")}
            required
          />
        </label>
        <label className="form-field">
          <span className="field-label">{t("sessionEditor.field.loginType")}</span>
          <select
            className="field-input"
            value={loginType}
            onChange={(event) =>
              setLoginType(event.currentTarget.value as SessionAuthType)
            }
          >
            <option value="chatgpt">{t("sessionEditor.option.login.chatgpt")}</option>
            <option value="api">{t("sessionEditor.option.login.api")}</option>
          </select>
        </label>
        <label className="form-field">
          <span className="field-label field-label-row">
            {t("sessionEditor.field.terminal")}
            {terminalProfiles.length === 0 ? (
              <button
                type="button"
                className="inline-link inline-link-danger"
                onClick={onCreateTerminalProfile}
              >
                {t("sessionEditor.field.terminal.empty")}
              </button>
            ) : null}
          </span>
          <select
            className="field-input"
            value={terminalProfileId}
            onChange={(event) => setTerminalProfileId(event.currentTarget.value)}
          >
            <option value="">{t("sessionEditor.option.unset")}</option>
            {terminalProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">{t("sessionEditor.field.ide")}</span>
          <select
            className="field-input"
            value={ideProfileId}
            onChange={(event) => setIdeProfileId(event.currentTarget.value)}
          >
            <option value="">{t("sessionEditor.option.unset")}</option>
            {ideProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-field full-span">
          <span className="field-label">{t("sessionEditor.field.codexApp")}</span>
          <div className="toggle-group">
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={codexAppEnabled}
                onChange={(event) =>
                  setCodexAppEnabled(event.currentTarget.checked)
                }
              />
              {t("sessionEditor.field.codexApp.enable")}
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={codexAppAllowMultiple}
                onChange={(event) =>
                  setCodexAppAllowMultiple(event.currentTarget.checked)
                }
                disabled={!codexAppEnabled}
              />
              {t("sessionEditor.field.codexApp.multi")}
            </label>
          </div>
          <div className="command-grid">
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.field.codexApp.path")}</span>
              <input
                className="field-input"
                value={codexAppPath}
                onChange={(event) => setCodexAppPath(event.currentTarget.value)}
                placeholder="/Applications/Codex.app"
                disabled={!codexAppEnabled}
              />
            </label>
            <label className="form-field">
              <span className="field-label">
                {t("sessionEditor.field.codexApp.userDataDir")}
              </span>
              <input
                className="field-input"
                value={codexAppUserDataDir}
                onChange={(event) =>
                  setCodexAppUserDataDir(event.currentTarget.value)
                }
                placeholder={t("sessionEditor.field.codexApp.userDataDir.placeholder")}
                disabled={!codexAppEnabled}
              />
            </label>
          </div>
          <span className="field-help">{t("sessionEditor.field.codexApp.help")}</span>
        </div>
        <label className="form-field">
          <span className="field-label">{t("sessionEditor.field.launchCommand")}</span>
          <input
            className="field-input"
            value={launchCommand}
            onChange={(event) => setLaunchCommand(event.currentTarget.value)}
            placeholder={t("sessionEditor.placeholder.launchCommand")}
          />
          <span className="field-help">
            {t("sessionEditor.field.launchCommand.helpPrefix")}
            <span className="mono">CODEX_HOME</span>
            {t("sessionEditor.field.launchCommand.helpSuffix")}
          </span>
        </label>
        <div className="form-field full-span command-builder">
          <span className="field-label">{t("sessionEditor.builder.title")}</span>
          <div className="command-grid">
            <label className="form-field">
              <span className="field-label field-label-row">
                {t("sessionEditor.builder.mode")}
                <span className="help-anchor">
                  <button
                    type="button"
                    className="help-icon"
                    aria-label={t("sessionEditor.builder.mode.help")}
                    aria-expanded={showModeHelp}
                    onClick={() => setShowModeHelp((prev) => !prev)}
                  >
                    ?
                  </button>
                  {showModeHelp ? (
                    <div className="mode-help-pop">
                      <div className="mode-help-caret" />
                      <div className="mode-help-card">
                        <div className="mode-help-title">{modeHint.title}</div>
                        <div className="mode-help-desc">{modeHint.description}</div>
                        <div className="mode-help-example mono">
                          {modeHint.example}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </span>
              </span>
              <select
                className="field-input"
                value={builderMode}
                onChange={(event) =>
                  setBuilderMode(event.currentTarget.value as LaunchMode)
                }
              >
                <option value="interactive">
                  {t("sessionEditor.builder.mode.interactive")}
                </option>
                <option value="resume">
                  {t("sessionEditor.builder.mode.resume")}
                </option>
                <option value="exec">
                  {t("sessionEditor.builder.mode.exec")}
                </option>
                <option value="exec-resume">
                  {t("sessionEditor.builder.mode.execResume")}
                </option>
              </select>
            </label>
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.builder.prompt")}</span>
              <input
                className="field-input"
                value={builderPrompt}
                onChange={(event) => setBuilderPrompt(event.currentTarget.value)}
                placeholder={t("sessionEditor.builder.prompt.placeholder")}
              />
            </label>
            {(builderMode === "resume" || builderMode === "exec-resume") && (
              <label className="form-field">
                <span className="field-label">{t("sessionEditor.builder.sessionId")}</span>
                <input
                  className="field-input"
                  value={builderResumeId}
                  onChange={(event) =>
                    setBuilderResumeId(event.currentTarget.value)
                  }
                  placeholder={t("sessionEditor.builder.sessionId.placeholder")}
                />
              </label>
            )}
            {(builderMode === "resume" || builderMode === "exec-resume") && (
              <div className="form-field">
                <span className="field-label">{t("sessionEditor.builder.resumeOptions")}</span>
                <div className="toggle-group">
                  <label className="toggle-line">
                    <input
                      type="checkbox"
                      checked={builderUseLast}
                      onChange={(event) =>
                        setBuilderUseLast(event.currentTarget.checked)
                      }
                    />
                    {t("sessionEditor.builder.useLast")}
                  </label>
                  <label className="toggle-line">
                    <input
                      type="checkbox"
                      checked={builderUseAll}
                      onChange={(event) =>
                        setBuilderUseAll(event.currentTarget.checked)
                      }
                    />
                    {t("sessionEditor.builder.useAll")}
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="command-grid">
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.builder.profile")}</span>
              <input
                className="field-input"
                value={builderProfile}
                onChange={(event) => setBuilderProfile(event.currentTarget.value)}
                placeholder={t("sessionEditor.builder.profile.placeholder")}
              />
            </label>
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.builder.model")}</span>
              <input
                className="field-input"
                value={builderModel}
                onChange={(event) => setBuilderModel(event.currentTarget.value)}
                placeholder={t("sessionEditor.builder.model.placeholder")}
              />
            </label>
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.builder.sandbox")}</span>
              <select
                className="field-input"
                value={builderSandbox}
                onChange={(event) => setBuilderSandbox(event.currentTarget.value)}
              >
                <option value="">{t("sessionEditor.option.unset")}</option>
                <option value="read-only">read-only</option>
                <option value="workspace-write">workspace-write</option>
                <option value="danger-full-access">danger-full-access</option>
              </select>
            </label>
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.builder.approval")}</span>
              <select
                className="field-input"
                value={builderApproval}
                onChange={(event) => setBuilderApproval(event.currentTarget.value)}
              >
                <option value="">{t("sessionEditor.option.unset")}</option>
                <option value="untrusted">untrusted</option>
                <option value="on-failure">on-failure</option>
                <option value="on-request">on-request</option>
                <option value="never">never</option>
              </select>
            </label>
          </div>
          <div className="command-grid">
            <div className="form-field">
              <span className="field-label">{t("sessionEditor.builder.switches")}</span>
              <div className="toggle-group">
                <label className="toggle-line">
                  <input
                    type="checkbox"
                    checked={builderFullAuto}
                    onChange={(event) =>
                      setBuilderFullAuto(event.currentTarget.checked)
                    }
                  />
                  --full-auto
                </label>
                <label className="toggle-line">
                  <input
                    type="checkbox"
                    checked={builderDangerous}
                    onChange={(event) =>
                      setBuilderDangerous(event.currentTarget.checked)
                    }
                  />
                  --dangerously-bypass-approvals-and-sandbox
                </label>
                <label className="toggle-line">
                  <input
                    type="checkbox"
                    checked={builderSearch}
                    onChange={(event) =>
                      setBuilderSearch(event.currentTarget.checked)
                    }
                  />
                  --search
                </label>
              </div>
            </div>
            <label className="form-field">
              <span className="field-label">--cd</span>
              <input
                className="field-input"
                value={builderCdPath}
                onChange={(event) => setBuilderCdPath(event.currentTarget.value)}
                placeholder="/path/to/project"
              />
            </label>
          </div>
          <div className="command-grid">
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.builder.addDir")}</span>
              <textarea
                className="field-input field-textarea"
                value={builderAddDirs}
                onChange={(event) => setBuilderAddDirs(event.currentTarget.value)}
                placeholder="/path/to/lib"
                rows={2}
              />
            </label>
            <label className="form-field">
              <span className="field-label">{t("sessionEditor.builder.configs")}</span>
              <textarea
                className="field-input field-textarea"
                value={builderConfigs}
                onChange={(event) => setBuilderConfigs(event.currentTarget.value)}
                placeholder="key=value"
                rows={2}
              />
            </label>
          </div>
          <div className="command-preview">
            <span className="field-label">{t("sessionEditor.builder.preview")}</span>
            <div className="command-preview-box mono">
              {commandPreview || "codex"}
            </div>
            <div className="command-preview-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setLaunchCommand(commandPreview)}
              >
                {t("sessionEditor.builder.fillCommand")}
              </button>
            </div>
          </div>
          <span className="field-help">{t("sessionEditor.builder.help")}</span>
        </div>
        {loginType === "api" ? (
          <>
            <label className="form-field full-span">
              <span className="field-label">{t("sessionEditor.env.common")}</span>
              <div className="env-grid">
                <div className="env-item">
                  <span className="field-label">OPENAI_API_KEY</span>
                  <div className="env-inline">
                    <input
                      className="field-input"
                      value={envApiKey}
                      onChange={(event) =>
                        setEnvApiKey(event.currentTarget.value)
                      }
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        handleInsertEnv({ OPENAI_API_KEY: envApiKey })
                      }
                    >
                      {t("sessionEditor.env.insert")}
                    </button>
                  </div>
                </div>
                <div className="env-item">
                  <span className="field-label">OPENAI_BASE_URL</span>
                  <div className="env-inline">
                    <input
                      className="field-input"
                      value={envBaseUrl}
                      onChange={(event) =>
                        setEnvBaseUrl(event.currentTarget.value)
                      }
                      placeholder="https://api.openai.com/v1"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        handleInsertEnv({ OPENAI_BASE_URL: envBaseUrl })
                      }
                    >
                      {t("sessionEditor.env.insert")}
                    </button>
                  </div>
                </div>
                <div className="env-item">
                  <span className="field-label">OPENAI_MODEL</span>
                  <div className="env-inline">
                    <input
                      className="field-input"
                      value={envModel}
                      onChange={(event) =>
                        setEnvModel(event.currentTarget.value)
                      }
                      placeholder="gpt-5"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        handleInsertEnv({ OPENAI_MODEL: envModel })
                      }
                    >
                      {t("sessionEditor.env.insert")}
                    </button>
                  </div>
                </div>
                <div className="env-item">
                  <span className="field-label">OPENAI_ORGANIZATION</span>
                  <div className="env-inline">
                    <input
                      className="field-input"
                      value={envOrg}
                      onChange={(event) =>
                        setEnvOrg(event.currentTarget.value)
                      }
                      placeholder="org_..."
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        handleInsertEnv({
                          OPENAI_ORGANIZATION: envOrg,
                        })
                      }
                    >
                      {t("sessionEditor.env.insert")}
                    </button>
                  </div>
                </div>
                <div className="env-item">
                  <span className="field-label">OPENAI_PROJECT</span>
                  <div className="env-inline">
                    <input
                      className="field-input"
                      value={envProject}
                      onChange={(event) =>
                        setEnvProject(event.currentTarget.value)
                      }
                      placeholder="proj_..."
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        handleInsertEnv({ OPENAI_PROJECT: envProject })
                      }
                    >
                      {t("sessionEditor.env.insert")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="env-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleApplyCommonEnv}
                >
                  {t("sessionEditor.env.writeAll")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleReadEnvFromCustom}
                >
                  {t("sessionEditor.env.readCustom")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleResetApiDefaults}
                >
                  {t("sessionEditor.env.reset")}
                </button>
              </div>
              <span className="field-help">{t("sessionEditor.env.commonHelp")}</span>
            </label>
            <label className="form-field full-span">
              <span className="field-label">{t("sessionEditor.env.custom")}</span>
              <textarea
                className="field-input field-textarea"
                value={envText}
                onChange={(event) => setEnvText(event.currentTarget.value)}
                placeholder="KEY=value"
                rows={4}
              />
              <span className="field-help">{t("sessionEditor.env.customHelp")}</span>
            </label>
            <label className="form-field full-span">
              <span className="field-label">{t("sessionEditor.env.advanced")}</span>
              <textarea
                className="field-input field-textarea"
                value={extraConfigToml}
                onChange={(event) =>
                  setExtraConfigToml(event.currentTarget.value)
                }
                placeholder='[features]\ncollab = true'
                rows={6}
              />
              <span className="field-help">{t("sessionEditor.env.advancedHelp")}</span>
            </label>
          </>
        ) : (
          <>
            <div className="form-field full-span">
              <span className="field-label">{t("sessionEditor.env.custom")}</span>
              <span className="field-help">{t("sessionEditor.env.chatgptHelp")}</span>
            </div>
            <label className="form-field full-span">
              <span className="field-label">{t("sessionEditor.env.advanced")}</span>
              <textarea
                className="field-input field-textarea"
                value={extraConfigToml}
                onChange={(event) =>
                  setExtraConfigToml(event.currentTarget.value)
                }
                placeholder='[features]\ncollab = true'
                rows={6}
              />
              <span className="field-help">{t("sessionEditor.env.advancedHelp")}</span>
            </label>
          </>
        )}
      </form>
    </Modal>
  );
};

export default SessionEditor;
