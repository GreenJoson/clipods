/**
 * @input  依赖：TypeScript 类型系统
 * @output 导出：配置相关类型定义（含会话客户端类型、可复用账号、启动命令、Codex.app 启动、高级 TOML 与 Claude 配置写入开关）
 * @pos    配置模型的类型入口（含会话绑定账号与账号池）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
export type SessionAuthType = "chatgpt" | "api";
export type SessionClientType = "codex" | "claude";
export type AuthAccountType = SessionAuthType;

export interface SessionConfig {
  id: string;
  name: string;
  codexHome: string;
  clientType?: SessionClientType;
  loginType: SessionAuthType;
  terminalProfileId?: string;
  ideProfileId?: string;
  boundAccountId?: string;
  launchCommand?: string;
  env?: Record<string, string>;
  extraConfigToml?: string;
  claudeSettingsEnabled?: boolean;
  claudeSettingsJson?: string;
  claudeJsonEnabled?: boolean;
  claudeJson?: string;
  codexAppEnabled?: boolean;
  codexAppPath?: string;
  codexAppUserDataDir?: string;
  codexAppAllowMultiple?: boolean;
}

interface AuthAccountBase {
  id: string;
  name: string;
  type: AuthAccountType;
}

export interface ChatGPTAccount extends AuthAccountBase {
  type: "chatgpt";
  authJson: string;
}

export interface ApiAccount extends AuthAccountBase {
  type: "api";
  apiKey: string;
  baseUrl?: string;
  model?: string;
  organization?: string;
  project?: string;
}

export type AuthAccount = ChatGPTAccount | ApiAccount;

export interface TerminalProfile {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface IdeProfile {
  id: string;
  name: string;
  command: string;
  args?: string[];
}

export interface AppConfig {
  version: number;
  sessions: SessionConfig[];
  terminalProfiles: TerminalProfile[];
  ideProfiles: IdeProfile[];
  accounts: AuthAccount[];
  defaultSessionId?: string;
}
