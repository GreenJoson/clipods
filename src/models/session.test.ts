/**
 * @input  依赖：Vitest, session 模型函数, SessionConfig 类型
 * @output 导出：session 模型行为测试（终端/IDE 偏好切换、项目路径解析）
 * @pos    验证会话终端/IDE 偏好更新与 --cd 项目路径提取逻辑
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { describe, expect, it } from "vitest";
import {
  parseSessionProjectPath,
  setSessionIdeProfile,
  setSessionTerminalProfile,
} from "./session";
import type { SessionConfig } from "../types/config";

const baseSession: SessionConfig = {
  id: "session-1",
  name: "Primary",
  codexHome: "~/.codex",
  loginType: "api",
  terminalProfileId: "terminal-a",
};

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
