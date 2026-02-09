/**
 * @input  依赖：React, Modal, 配置类型, 表单辅助, 启动命令构建器, 环境变量快捷填充, 高级 TOML, 提示弹层
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

interface SessionEditorProps {
  open: boolean;
  session: SessionConfig;
  isNew: boolean;
  terminalProfiles: TerminalProfile[];
  ideProfiles: IdeProfile[];
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

const MODE_HINTS: Record<LaunchMode, ModeHint> = {
  interactive: {
    title: "交互模式",
    description:
      "进入交互会话（无子命令），可叠加 --cd、--dangerously-bypass-approvals-and-sandbox 等参数。",
    example: "codex --cd /path/to/project",
  },
  resume: {
    title: "恢复会话",
    description:
      "继续已有会话，可配 --last / --all 直接定位最近或全部会话。",
    example: "codex resume <session-id>",
  },
  exec: {
    title: "一次性执行",
    description: "执行一条指令后退出，不进入持续对话。",
    example: "codex exec \"你的指令\"",
  },
  "exec-resume": {
    title: "执行并恢复",
    description:
      "在已有会话上下文中执行一次性指令，可配 --last / --all。",
    example: "codex exec resume <session-id> \"你的指令\"",
  },
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
  onSave,
  onCancel,
  onDelete,
}: SessionEditorProps) => {
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

  const modeHint = MODE_HINTS[builderMode];

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
      title={isNew ? "新建会话" : "编辑会话"}
      description="为每个账号配置独立的登录方式与启动参数。"
      onClose={onCancel}
      footer={
        <div className="modal-footer-actions">
          {onDelete ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onDelete(session.id)}
            >
              删除
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveClick}
          >
            保存
          </button>
        </div>
      }
    >
      <form id="session-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="form-field">
          <span className="field-label">会话名称</span>
          <input
            className="field-input"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="例如：ChatGPT 主账号"
            required
          />
        </label>
        <label className="form-field">
          <span className="field-label">CODEX_HOME</span>
          <input
            className="field-input"
            value={codexHome}
            onChange={(event) => setCodexHome(event.currentTarget.value)}
            placeholder="~/.codex"
            required
          />
        </label>
        <label className="form-field">
          <span className="field-label">登录方式</span>
          <select
            className="field-input"
            value={loginType}
            onChange={(event) =>
              setLoginType(event.currentTarget.value as SessionAuthType)
            }
          >
            <option value="chatgpt">官方登录</option>
            <option value="api">API 登录</option>
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">终端配置</span>
          <select
            className="field-input"
            value={terminalProfileId}
            onChange={(event) => setTerminalProfileId(event.currentTarget.value)}
          >
            <option value="">不指定</option>
            {terminalProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">IDE 配置</span>
          <select
            className="field-input"
            value={ideProfileId}
            onChange={(event) => setIdeProfileId(event.currentTarget.value)}
          >
            <option value="">不指定</option>
            {ideProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="field-label">启动命令（会话级）</span>
          <input
            className="field-input"
            value={launchCommand}
            onChange={(event) => setLaunchCommand(event.currentTarget.value)}
            placeholder="codex --dangerously-bypass-approvals-and-sandbox resume <session-id>"
          />
          <span className="field-help">
            点击“打开终端”时会自动执行该命令，已注入本会话的
            <span className="mono">CODEX_HOME</span> 与环境变量。
          </span>
        </label>
        <div className="form-field full-span command-builder">
          <span className="field-label">命令快捷生成</span>
          <div className="command-grid">
            <label className="form-field">
              <span className="field-label field-label-row">
                启动模式
                <span className="help-anchor">
                  <button
                    type="button"
                    className="help-icon"
                    aria-label="查看启动模式说明"
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
                <option value="interactive">交互模式</option>
                <option value="resume">恢复会话</option>
                <option value="exec">一次性执行</option>
                <option value="exec-resume">执行并恢复</option>
              </select>
            </label>
            <label className="form-field">
              <span className="field-label">提示词 / 指令</span>
              <input
                className="field-input"
                value={builderPrompt}
                onChange={(event) => setBuilderPrompt(event.currentTarget.value)}
                placeholder="例如：总结当前目录代码"
              />
            </label>
            {(builderMode === "resume" || builderMode === "exec-resume") && (
              <label className="form-field">
                <span className="field-label">会话 ID</span>
                <input
                  className="field-input"
                  value={builderResumeId}
                  onChange={(event) =>
                    setBuilderResumeId(event.currentTarget.value)
                  }
                  placeholder="例如：019b8051-e853-7ac1-a58a-4b686e139b1c"
                />
              </label>
            )}
            {(builderMode === "resume" || builderMode === "exec-resume") && (
              <div className="form-field">
                <span className="field-label">恢复选项</span>
                <div className="toggle-group">
                  <label className="toggle-line">
                    <input
                      type="checkbox"
                      checked={builderUseLast}
                      onChange={(event) =>
                        setBuilderUseLast(event.currentTarget.checked)
                      }
                    />
                    使用 --last
                  </label>
                  <label className="toggle-line">
                    <input
                      type="checkbox"
                      checked={builderUseAll}
                      onChange={(event) =>
                        setBuilderUseAll(event.currentTarget.checked)
                      }
                    />
                    使用 --all
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="command-grid">
            <label className="form-field">
              <span className="field-label">--profile</span>
              <input
                className="field-input"
                value={builderProfile}
                onChange={(event) => setBuilderProfile(event.currentTarget.value)}
                placeholder="默认账号"
              />
            </label>
            <label className="form-field">
              <span className="field-label">--model</span>
              <input
                className="field-input"
                value={builderModel}
                onChange={(event) => setBuilderModel(event.currentTarget.value)}
                placeholder="例如：gpt-5"
              />
            </label>
            <label className="form-field">
              <span className="field-label">--sandbox</span>
              <select
                className="field-input"
                value={builderSandbox}
                onChange={(event) => setBuilderSandbox(event.currentTarget.value)}
              >
                <option value="">不指定</option>
                <option value="read-only">read-only</option>
                <option value="workspace-write">workspace-write</option>
                <option value="danger-full-access">danger-full-access</option>
              </select>
            </label>
            <label className="form-field">
              <span className="field-label">--ask-for-approval</span>
              <select
                className="field-input"
                value={builderApproval}
                onChange={(event) => setBuilderApproval(event.currentTarget.value)}
              >
                <option value="">不指定</option>
                <option value="untrusted">untrusted</option>
                <option value="on-failure">on-failure</option>
                <option value="on-request">on-request</option>
                <option value="never">never</option>
              </select>
            </label>
          </div>
          <div className="command-grid">
            <div className="form-field">
              <span className="field-label">开关选项</span>
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
              <span className="field-label">--add-dir（多行）</span>
              <textarea
                className="field-input field-textarea"
                value={builderAddDirs}
                onChange={(event) => setBuilderAddDirs(event.currentTarget.value)}
                placeholder="/path/to/lib"
                rows={2}
              />
            </label>
            <label className="form-field">
              <span className="field-label">-c 配置覆盖（多行）</span>
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
            <span className="field-label">预览命令</span>
            <div className="command-preview-box mono">
              {commandPreview || "codex"}
            </div>
            <div className="command-preview-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setLaunchCommand(commandPreview)}
              >
                填入启动命令
              </button>
            </div>
          </div>
          <span className="field-help">
            支持将多个参数组合后写入启动命令，依旧可以手动修改。
          </span>
        </div>
        {loginType === "api" ? (
          <>
            <label className="form-field full-span">
              <span className="field-label">常用环境变量</span>
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
                      插入
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
                      插入
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
                      插入
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
                      插入
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
                      插入
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
                  写入全部
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleReadEnvFromCustom}
                >
                  从自定义读取
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleResetApiDefaults}
                >
                  恢复默认
                </button>
              </div>
              <span className="field-help">
                常用环境变量会写入到下方自定义输入框，可继续手动补充或修改。
              </span>
            </label>
            <label className="form-field full-span">
              <span className="field-label">环境变量</span>
              <textarea
                className="field-input field-textarea"
                value={envText}
                onChange={(event) => setEnvText(event.currentTarget.value)}
                placeholder="KEY=value"
                rows={4}
              />
              <span className="field-help">格式：KEY=VALUE，每行一个。</span>
            </label>
            <label className="form-field full-span">
              <span className="field-label">高级自定义 TOML（可选）</span>
              <textarea
                className="field-input field-textarea"
                value={extraConfigToml}
                onChange={(event) =>
                  setExtraConfigToml(event.currentTarget.value)
                }
                placeholder='[features]\ncollab = true'
                rows={6}
              />
              <span className="field-help">
                会追加到自动生成的 config.toml 末尾，用于 features、mcp_servers
                等高级配置。
              </span>
            </label>
          </>
        ) : (
          <>
            <div className="form-field full-span">
              <span className="field-label">环境变量</span>
              <span className="field-help">
                官方登录不需要 API 环境变量。可在会话卡片点击“官方登录”触发浏览器登录。
              </span>
            </div>
            <label className="form-field full-span">
              <span className="field-label">高级自定义 TOML（可选）</span>
              <textarea
                className="field-input field-textarea"
                value={extraConfigToml}
                onChange={(event) =>
                  setExtraConfigToml(event.currentTarget.value)
                }
                placeholder='[features]\ncollab = true'
                rows={6}
              />
              <span className="field-help">
                会追加到自动生成的 config.toml 末尾，用于 features、mcp_servers
                等高级配置。
              </span>
            </label>
          </>
        )}
      </form>
    </Modal>
  );
};

export default SessionEditor;
