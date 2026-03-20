/**
 * @input  依赖：配置类型、session 模型、TOML 工具、路径工具、读取工具
 * @output 导出：configService API 与序列化函数
 * @pos    配置加载与保存的核心服务（含 Codex/Claude 配置隔离与 legacy 回退）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type {
  AppConfig,
  AuthAccount,
  AuthAccountType,
  IdeProfile,
  TerminalProfile,
} from "../types/config";
import { normalizeSession } from "../models/session";
import { buildConfigFilePath, CONFIG_FILE_NAME } from "../utils/paths";
import { parseToml, stringifyToml, type TomlData } from "../utils/toml";

export interface ConfigFileClient {
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, contents: string) => Promise<void>;
  ensureDir: (path: string) => Promise<void>;
}

export interface ConfigPathProvider {
  getAppConfigDir: () => Promise<string>;
}

export interface ConfigService {
  load: () => Promise<AppConfig>;
  save: (config: AppConfig) => Promise<void>;
  getConfigPath: () => Promise<string>;
}

export type ConfigScope = "codex" | "claude";

export interface ConfigServiceOptions {
  scope?: ConfigScope;
}

const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  sessions: [],
  terminalProfiles: [],
  ideProfiles: [],
  accounts: [],
};

const DEFAULT_SCOPE: ConfigScope = "codex";
const SCOPE_FILE_MAP: Record<ConfigScope, string> = {
  codex: "config.codex.toml",
  claude: "config.claude.toml",
};

const createDefaultConfig = (): AppConfig => ({
  version: DEFAULT_CONFIG.version,
  sessions: [],
  terminalProfiles: [],
  ideProfiles: [],
  accounts: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringOptional = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

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

const normalizeTerminalProfile = (value: unknown): TerminalProfile | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = readStringOptional(value.id);
  const name = readStringOptional(value.name);
  const command = readStringOptional(value.command);

  if (!id || !name || !command) {
    return null;
  }

  return {
    id,
    name,
    command,
    args: readStringArray(value.args),
    env: readStringRecord(value.env),
  };
};

const normalizeIdeProfile = (value: unknown): IdeProfile | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = readStringOptional(value.id);
  const name = readStringOptional(value.name);
  const command = readStringOptional(value.command);

  if (!id || !name || !command) {
    return null;
  }

  return {
    id,
    name,
    command,
    args: readStringArray(value.args),
  };
};

const readArray = <T>(
  value: unknown,
  normalize: (entry: unknown) => T | null
): T[] =>
  Array.isArray(value)
    ? value
        .map(normalize)
        .filter((entry): entry is T => entry !== null)
    : [];

const stripUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((entry) => entry !== undefined);
  }

  if (!isRecord(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      continue;
    }

    const normalized = stripUndefined(entry);
    if (normalized === undefined) {
      continue;
    }

    result[key] = normalized;
  }

  return result;
};

const readAccountType = (value: unknown): AuthAccountType | undefined => {
  if (value === "chatgpt" || value === "api" || value === "api-key") {
    return value === "api-key" ? "api" : value;
  }
  if (value === "apikey") {
    return "api";
  }
  return undefined;
};

const readAccountName = (value: Record<string, unknown>): string | undefined => {
  const name = readStringOptional(value.name);
  if (name) {
    return name;
  }
  return readStringOptional(value.label);
};

const normalizeAccount = (value: unknown): AuthAccount | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = readStringOptional(value.id);
  const type = readAccountType(value.type);
  const name = readAccountName(value);
  if (!id || !type || !name) {
    return null;
  }

  if (type === "chatgpt") {
    const authJson = readStringOptional(value.authJson);
    if (!authJson) {
      return null;
    }
    return {
      id,
      name,
      type,
      authJson,
    };
  }

  const apiKey = readStringOptional(value.apiKey);
  if (!apiKey) {
    return null;
  }

  return {
    id,
    name,
    type,
    apiKey,
    baseUrl: readStringOptional(value.baseUrl),
    model: readStringOptional(value.model),
    organization: readStringOptional(value.organization),
    project: readStringOptional(value.project),
  };
};

const normalizeConfig = (value: TomlData): AppConfig => ({
  version: readNumber(value.version, DEFAULT_CONFIG.version),
  sessions: readArray(value.sessions, normalizeSession),
  terminalProfiles: readArray(value.terminalProfiles, normalizeTerminalProfile),
  ideProfiles: readArray(value.ideProfiles, normalizeIdeProfile),
  accounts: readArray(value.accounts, normalizeAccount),
  defaultSessionId: readStringOptional(value.defaultSessionId),
});

const sanitizeConfig = (config: AppConfig): TomlData =>
  stripUndefined(config) as TomlData;

export const parseConfig = (source: string): AppConfig =>
  normalizeConfig(parseToml(source));

export const serializeConfig = (config: AppConfig): string =>
  stringifyToml(sanitizeConfig(config));

export const createConfigService = (
  fileClient: ConfigFileClient,
  pathProvider: ConfigPathProvider,
  options?: ConfigServiceOptions
): ConfigService => {
  const scope = options?.scope ?? DEFAULT_SCOPE;

  const getScopedConfigPath = async (): Promise<string> => {
    const appConfigDir = await pathProvider.getAppConfigDir();
    return buildConfigFilePath(appConfigDir, SCOPE_FILE_MAP[scope]);
  };

  const getLegacyConfigPath = async (): Promise<string> => {
    const appConfigDir = await pathProvider.getAppConfigDir();
    return buildConfigFilePath(appConfigDir, CONFIG_FILE_NAME);
  };

  const getConfigPath = async (): Promise<string> => {
    return getScopedConfigPath();
  };

  const load = async (): Promise<AppConfig> => {
    try {
      const configPath = await getScopedConfigPath();
      const contents = await fileClient.readTextFile(configPath);
      if (contents.trim().length === 0) {
        return createDefaultConfig();
      }
      return parseConfig(contents);
    } catch (error) {
      if (scope === "codex") {
        try {
          const legacyConfigPath = await getLegacyConfigPath();
          const legacyContents = await fileClient.readTextFile(legacyConfigPath);
          if (legacyContents.trim().length === 0) {
            return createDefaultConfig();
          }
          return parseConfig(legacyContents);
        } catch {
          return createDefaultConfig();
        }
      }
      return createDefaultConfig();
    }
  };

  const save = async (config: AppConfig): Promise<void> => {
    const appConfigDir = await pathProvider.getAppConfigDir();
    await fileClient.ensureDir(appConfigDir);
    const configPath = buildConfigFilePath(appConfigDir, SCOPE_FILE_MAP[scope]);
    await fileClient.writeTextFile(configPath, serializeConfig(config));
  };

  return {
    load,
    save,
    getConfigPath,
  };
};
