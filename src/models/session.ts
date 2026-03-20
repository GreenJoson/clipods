/**
 * @input  依赖：SessionConfig 类型
 * @output 导出：session 规范化与构建工具（含客户端类型、默认会话目录、官方登录流向与命令、启动命令项目路径解析、Codex.app、Claude 配置写入开关与终端/IDE/客户端偏好切换）
 * @pos    Session 配置模型的处理层（含会话终端/IDE/客户端偏好更新、默认目录、官方登录流向/命令、Claude 配置写入字段与 --cd 解析）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type {
  SessionAuthType,
  SessionClientType,
  SessionConfig,
} from "../types/config";

const DEFAULT_LOGIN_TYPE: SessionAuthType = "chatgpt";
const DEFAULT_CLIENT_TYPE: SessionClientType = "codex";
export type OfficialLoginFlow = "terminal" | "browser" | "none";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const readStringOptional = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const readStringRecord = (
  value: unknown
): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

const readLoginType = (value: unknown): SessionAuthType =>
  value === "chatgpt" || value === "api" ? value : DEFAULT_LOGIN_TYPE;

const readClientType = (value: unknown): SessionClientType =>
  value === "codex" || value === "claude" ? value : DEFAULT_CLIENT_TYPE;

const readBoolOptional = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const createSession = (
  input: Partial<SessionConfig> & Pick<SessionConfig, "id" | "name">
): SessionConfig => ({
  id: input.id,
  name: input.name,
  codexHome: input.codexHome ?? "",
  clientType: input.clientType ?? DEFAULT_CLIENT_TYPE,
  loginType: input.loginType ?? DEFAULT_LOGIN_TYPE,
  terminalProfileId: input.terminalProfileId,
  ideProfileId: input.ideProfileId,
  launchCommand: input.launchCommand,
  env: input.env && Object.keys(input.env).length > 0 ? { ...input.env } : undefined,
  extraConfigToml:
    input.extraConfigToml && input.extraConfigToml.trim()
      ? input.extraConfigToml
      : undefined,
  claudeSettingsEnabled: input.claudeSettingsEnabled,
  claudeSettingsJson:
    input.claudeSettingsJson && input.claudeSettingsJson.trim()
      ? input.claudeSettingsJson
      : undefined,
  claudeJsonEnabled: input.claudeJsonEnabled,
  claudeJson:
    input.claudeJson && input.claudeJson.trim() ? input.claudeJson : undefined,
  codexAppEnabled: input.codexAppEnabled,
  codexAppPath: input.codexAppPath,
  codexAppUserDataDir: input.codexAppUserDataDir,
  codexAppAllowMultiple: input.codexAppAllowMultiple,
  boundAccountId: input.boundAccountId,
});

export const normalizeSession = (value: unknown): SessionConfig | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = readStringOptional(value.id);
  const name = readStringOptional(value.name);

  if (!id || !name) {
    return null;
  }

  return createSession({
    id,
    name,
    codexHome: readString(value.codexHome, ""),
    clientType: readClientType(value.clientType),
    loginType: readLoginType(value.loginType),
    terminalProfileId: readStringOptional(value.terminalProfileId),
    ideProfileId: readStringOptional(value.ideProfileId),
    launchCommand: readStringOptional(value.launchCommand),
    env: readStringRecord(value.env),
    extraConfigToml: readStringOptional(value.extraConfigToml),
    claudeSettingsEnabled: readBoolOptional(value.claudeSettingsEnabled),
    claudeSettingsJson: readStringOptional(value.claudeSettingsJson),
    claudeJsonEnabled: readBoolOptional(value.claudeJsonEnabled),
    claudeJson: readStringOptional(value.claudeJson),
    codexAppEnabled: readBoolOptional(value.codexAppEnabled),
    codexAppPath: readStringOptional(value.codexAppPath),
    codexAppUserDataDir: readStringOptional(value.codexAppUserDataDir),
    codexAppAllowMultiple: readBoolOptional(value.codexAppAllowMultiple),
    boundAccountId: readStringOptional(value.boundAccountId),
  });
};

export const setSessionTerminalProfile = (
  session: SessionConfig,
  terminalProfileId?: string
): SessionConfig => {
  const trimmed = terminalProfileId?.trim();
  return {
    ...session,
    terminalProfileId: trimmed ? trimmed : undefined,
  };
};

export const setSessionIdeProfile = (
  session: SessionConfig,
  ideProfileId?: string
): SessionConfig => {
  const trimmed = ideProfileId?.trim();
  return {
    ...session,
    ideProfileId: trimmed ? trimmed : undefined,
  };
};

export const setSessionClientType = (
  session: SessionConfig,
  clientType?: string
): SessionConfig => ({
  ...session,
  clientType: readClientType(clientType),
});

export const setSessionBoundAccount = (
  session: SessionConfig,
  accountId?: string
): SessionConfig => {
  const trimmed = accountId?.trim();
  return {
    ...session,
    boundAccountId: trimmed ? trimmed : undefined,
  };
};

export const resolveOfficialLoginFlow = (
  session: SessionConfig
): OfficialLoginFlow => {
  if (session.loginType !== "chatgpt") {
    return "none";
  }
  return "terminal";
};

export const resolveOfficialLoginCommand = (
  session: SessionConfig
): string | undefined => {
  if (session.loginType !== "chatgpt") {
    return undefined;
  }
  if ((session.clientType ?? DEFAULT_CLIENT_TYPE) === "claude") {
    return "claude login";
  }
  return "codex";
};

export const getDefaultSessionHome = (
  clientType: SessionClientType = DEFAULT_CLIENT_TYPE
): string => (clientType === "claude" ? "~/.claude" : "~/.codex");

export const parseSessionProjectPath = (command?: string): string | undefined => {
  if (!command) {
    return undefined;
  }
  const match = command.match(/--cd(?:=|\s+)(?:(["'])(.*?)\1|([^\s]+))/u);
  const value = match?.[2] ?? match?.[3];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
