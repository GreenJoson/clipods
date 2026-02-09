/**
 * @input  依赖：TypeScript 类型系统
 * @output 导出：配置相关类型定义（含会话启动命令、Codex.app 启动与高级 TOML）
 * @pos    配置模型的类型入口
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
export type SessionAuthType = "chatgpt" | "api";

export interface SessionConfig {
  id: string;
  name: string;
  codexHome: string;
  loginType: SessionAuthType;
  terminalProfileId?: string;
  ideProfileId?: string;
  launchCommand?: string;
  env?: Record<string, string>;
  extraConfigToml?: string;
  codexAppEnabled?: boolean;
  codexAppPath?: string;
  codexAppUserDataDir?: string;
  codexAppAllowMultiple?: boolean;
}

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
  defaultSessionId?: string;
}
