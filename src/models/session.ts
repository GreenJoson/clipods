/**
 * @input  依赖：SessionConfig 类型
 * @output 导出：session 规范化与构建工具（含启动命令、Codex.app 与高级 TOML）
 * @pos    Session 配置模型的处理层
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { SessionAuthType, SessionConfig } from "../types/config";

const DEFAULT_LOGIN_TYPE: SessionAuthType = "chatgpt";

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

const readBoolOptional = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const createSession = (
  input: Partial<SessionConfig> & Pick<SessionConfig, "id" | "name">
): SessionConfig => ({
  id: input.id,
  name: input.name,
  codexHome: input.codexHome ?? "",
  loginType: input.loginType ?? DEFAULT_LOGIN_TYPE,
  terminalProfileId: input.terminalProfileId,
  ideProfileId: input.ideProfileId,
  launchCommand: input.launchCommand,
  env: input.env && Object.keys(input.env).length > 0 ? { ...input.env } : undefined,
  extraConfigToml:
    input.extraConfigToml && input.extraConfigToml.trim()
      ? input.extraConfigToml
      : undefined,
  codexAppEnabled: input.codexAppEnabled,
  codexAppPath: input.codexAppPath,
  codexAppUserDataDir: input.codexAppUserDataDir,
  codexAppAllowMultiple: input.codexAppAllowMultiple,
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
    loginType: readLoginType(value.loginType),
    terminalProfileId: readStringOptional(value.terminalProfileId),
    ideProfileId: readStringOptional(value.ideProfileId),
    launchCommand: readStringOptional(value.launchCommand),
    env: readStringRecord(value.env),
    extraConfigToml: readStringOptional(value.extraConfigToml),
    codexAppEnabled: readBoolOptional(value.codexAppEnabled),
    codexAppPath: readStringOptional(value.codexAppPath),
    codexAppUserDataDir: readStringOptional(value.codexAppUserDataDir),
    codexAppAllowMultiple: readBoolOptional(value.codexAppAllowMultiple),
  });
};
