/**
 * @input  依赖：Vitest, session 模型函数, SessionConfig 类型
 * @output 导出：session 模型行为测试（客户端类型默认值/切换、默认会话目录、终端/IDE 偏好切换、boundAccountId 更新、官方登录流向与命令、项目路径解析）
 * @pos    验证会话客户端类型归一化/切换、默认目录、终端/IDE 偏好更新、官方登录流向/命令与 --cd 项目路径提取逻辑
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { describe, expect, it } from "vitest";
import {
  createSession,
  getDefaultSessionHome,
  normalizeSession,
  parseSessionProjectPath,
  resolveOfficialLoginCommand,
  resolveOfficialLoginFlow,
  setSessionBoundAccount,
  setSessionClientType,
  setSessionIdeProfile,
  setSessionTerminalProfile,
} from "./session";
import type { SessionConfig } from "../types/config";

const baseSession: SessionConfig = {
  id: "session-1",
  name: "Primary",
  codexHome: "~/.codex",
  clientType: "codex",
  loginType: "api",
  terminalProfileId: "terminal-a",
};

describe("clientType", () => {
  it("defaults to codex when missing in createSession", () => {
    const next = createSession({
      id: "session-2",
      name: "NoClientType",
      codexHome: "~/.codex_api",
      loginType: "api",
    });
    expect(next.clientType).toBe("codex");
  });

  it("falls back to codex for invalid value in normalizeSession", () => {
    const next = normalizeSession({
      id: "session-3",
      name: "InvalidClientType",
      codexHome: "~/.codex",
      loginType: "chatgpt",
      clientType: "unknown",
    });
    expect(next?.clientType).toBe("codex");
  });

  it("returns ~/.claude as default home for claude client", () => {
    expect(getDefaultSessionHome("claude")).toBe("~/.claude");
  });
});

describe("setSessionTerminalProfile", () => {
  it("updates terminalProfileId when a profile id is provided", () => {
    const next = setSessionTerminalProfile(baseSession, "terminal-b");

    expect(next.terminalProfileId).toBe("terminal-b");
    expect(next.id).toBe(baseSession.id);
    expect(next.name).toBe(baseSession.name);
  });

  it("clears terminalProfileId when profile id is empty", () => {
    const next = setSessionTerminalProfile(baseSession, "  ");

    expect(next.terminalProfileId).toBeUndefined();
  });
});

describe("setSessionIdeProfile", () => {
  it("updates ideProfileId when a profile id is provided", () => {
    const next = setSessionIdeProfile(baseSession, "ide-b");

    expect(next.ideProfileId).toBe("ide-b");
    expect(next.id).toBe(baseSession.id);
    expect(next.name).toBe(baseSession.name);
  });

  it("clears ideProfileId when profile id is empty", () => {
    const next = setSessionIdeProfile(baseSession, "");

    expect(next.ideProfileId).toBeUndefined();
  });
});

describe("setSessionClientType", () => {
  it("switches clientType to claude", () => {
    const next = setSessionClientType(baseSession, "claude");

    expect(next.clientType).toBe("claude");
    expect(next.id).toBe(baseSession.id);
    expect(next.name).toBe(baseSession.name);
  });

  it("falls back to codex when clientType is invalid", () => {
    const next = setSessionClientType(baseSession, "unknown");

    expect(next.clientType).toBe("codex");
  });
});

describe("setSessionBoundAccount", () => {
  it("updates boundAccountId when provided", () => {
    const next = setSessionBoundAccount(baseSession, "account-123");

    expect(next.boundAccountId).toBe("account-123");
    expect(next.id).toBe(baseSession.id);
    expect(next.name).toBe(baseSession.name);
  });

  it("clears boundAccountId when value is empty", () => {
    const next = setSessionBoundAccount(baseSession, "   ");

    expect(next.boundAccountId).toBeUndefined();
  });
});

describe("parseSessionProjectPath", () => {
  it("extracts --cd value from launch command", () => {
    const value = parseSessionProjectPath(
      "codex --dangerously-bypass-approvals-and-sandbox --cd /Users/demo/project"
    );
    expect(value).toBe("/Users/demo/project");
  });

  it("extracts quoted --cd value from launch command", () => {
    const value = parseSessionProjectPath(
      "codex exec --cd \"/Users/demo/My Project\" \"scan docs\""
    );
    expect(value).toBe("/Users/demo/My Project");
  });

  it("returns undefined when no --cd exists", () => {
    const value = parseSessionProjectPath("codex exec \"scan docs\"");
    expect(value).toBeUndefined();
  });
});

describe("resolveOfficialLoginFlow", () => {
  it("uses terminal flow for codex chatgpt login", () => {
    const value = resolveOfficialLoginFlow({
      ...baseSession,
      clientType: "codex",
      loginType: "chatgpt",
    });
    expect(value).toBe("terminal");
  });

  it("uses terminal flow for claude chatgpt login", () => {
    const value = resolveOfficialLoginFlow({
      ...baseSession,
      clientType: "claude",
      loginType: "chatgpt",
    });
    expect(value).toBe("terminal");
  });

  it("disables official flow for api login", () => {
    const value = resolveOfficialLoginFlow({
      ...baseSession,
      loginType: "api",
    });
    expect(value).toBe("none");
  });
});

describe("resolveOfficialLoginCommand", () => {
  it("uses codex command for codex session", () => {
    const value = resolveOfficialLoginCommand({
      ...baseSession,
      clientType: "codex",
      loginType: "chatgpt",
    });
    expect(value).toBe("codex");
  });

  it("uses claude login command for claude session", () => {
    const value = resolveOfficialLoginCommand({
      ...baseSession,
      clientType: "claude",
      loginType: "chatgpt",
    });
    expect(value).toBe("claude login");
  });

  it("returns undefined for api session", () => {
    const value = resolveOfficialLoginCommand({
      ...baseSession,
      loginType: "api",
    });
    expect(value).toBeUndefined();
  });
});
