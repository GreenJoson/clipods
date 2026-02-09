/**
 * @input  依赖：React, Modal, 配置类型, 拖拽事件 payload, Tauri 窗口事件, 终端模板, 表单说明文本, 终端应用安装检测
 * @output 导出：ProfileEditor 组件
 * @pos    终端与 IDE 配置编辑弹窗
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Modal from "./Modal";
import type { IdeProfile, TerminalProfile } from "../types/config";

export type ProfileKind = "terminal" | "ide";

interface TerminalTemplate {
  id: string;
  label: string;
  name: string;
  command: string;
  args?: string[];
}

interface ProfileEditorProps {
  open: boolean;
  kind: ProfileKind;
  profile: TerminalProfile | IdeProfile;
  onSave: (profile: TerminalProfile | IdeProfile) => void;
  onCancel: () => void;
  onDelete?: (profileId: string) => void;
}

const buildArgsText = (args?: string[]): string => (args ? args.join("\n") : "");

const TERMINAL_TEMPLATES: TerminalTemplate[] = [
  { id: "custom", label: "自定义", name: "", command: "" },
  {
    id: "terminal",
    label: "Terminal（内置）",
    name: "Terminal",
    command: "Terminal",
  },
  {
    id: "iterm2",
    label: "iTerm2（内置）",
    name: "iTerm2",
    command: "iTerm2",
  },
  {
    id: "wave",
    label: "Wave（wsh 自动执行）",
    name: "Wave",
    command: "Wave",
  },
];

const detectTerminalTemplate = (command: string): string => {
  const normalized = command.toLowerCase();
  if (normalized.includes("wave")) {
    return "wave";
  }
  if (normalized.includes("iterm")) {
    return "iterm2";
  }
  if (normalized.includes("terminal")) {
    return "terminal";
  }
  return "custom";
};

const parseArgsText = (value: string): string[] | undefined => {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return entries.length ? entries : undefined;
};

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

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

const ProfileEditor = ({
  open,
  kind,
  profile,
  onSave,
  onCancel,
  onDelete,
}: ProfileEditorProps) => {
  const [name, setName] = useState(profile.name);
  const [command, setCommand] = useState(profile.command);
  const [argsText, setArgsText] = useState(buildArgsText(profile.args));
  const [templateId, setTemplateId] = useState(
    kind === "terminal" ? detectTerminalTemplate(profile.command) : "custom"
  );
  const [envText, setEnvText] = useState(
    kind === "terminal" ? buildEnvText((profile as TerminalProfile).env) : ""
  );
  const [appCheckState, setAppCheckState] = useState<
    "idle" | "checking" | "installed" | "missing"
  >("idle");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(profile.name);
    setCommand(profile.command);
    setArgsText(buildArgsText(profile.args));
    setTemplateId(
      kind === "terminal" ? detectTerminalTemplate(profile.command) : "custom"
    );
    setEnvText(
      kind === "terminal" ? buildEnvText((profile as TerminalProfile).env) : ""
    );
    setAppCheckState("idle");
  }, [open, profile, kind]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    let unlisten: (() => void) | undefined;
    let active = true;
    getCurrentWindow()
      .onDragDropEvent((event) => {
        const payload = event.payload;
        if (!active || payload.type !== "drop" || !payload.paths?.length) {
          return;
        }
        const droppedPath = payload.paths[0];
        if (droppedPath) {
          setCommand(droppedPath);
        }
      })
      .then((stop) => {
        if (!active) {
          stop();
          return;
        }
        unlisten = stop;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setAppCheckState("idle");
      return undefined;
    }
    const trimmed = command.trim();
    if (!trimmed) {
      setAppCheckState("idle");
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!active) {
        return;
      }
      setAppCheckState("checking");
      try {
        const installed = await invoke<boolean>("check_app_installed", {
          app: trimmed,
        });
        if (active) {
          setAppCheckState(installed ? "installed" : "missing");
        }
      } catch (error) {
        if (active) {
          setAppCheckState("missing");
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, command]);

  const appCheckTone =
    appCheckState === "installed"
      ? "success"
      : appCheckState === "missing"
        ? "error"
        : "warning";
  const appCheckLabel =
    appCheckState === "installed"
      ? "已检测到应用"
      : appCheckState === "missing"
        ? "未检测到应用"
        : "检测中";

  const handleCommandDrop = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    const filePath = "path" in file ? (file as File & { path?: string }).path : undefined;
    const value = filePath ?? file.name;
    if (value) {
      setCommand(value);
    }
  };

  const handleCommandDragOver = (event: DragEvent<HTMLInputElement>) => {
    event.preventDefault();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const args = parseArgsText(argsText);
    if (kind === "terminal") {
      onSave({
        id: profile.id,
        name,
        command,
        args,
        env: parseEnvText(envText),
      });
      return;
    }

    onSave({
      id: profile.id,
      name,
      command,
      args,
    });
  };

  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    if (value === "custom") {
      return;
    }
    const template = TERMINAL_TEMPLATES.find((item) => item.id === value);
    if (!template) {
      return;
    }
    setName(template.name);
    setCommand(template.command);
    setArgsText(buildArgsText(template.args));
  };

  return (
    <Modal
      open={open}
      title={kind === "terminal" ? "终端配置" : "IDE 配置"}
      description="设置启动命令与参数。"
      onClose={onCancel}
      footer={
        <div className="modal-footer-actions">
          {onDelete ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onDelete(profile.id)}
            >
              删除
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="btn btn-primary" form="profile-form">
            保存
          </button>
        </div>
      }
    >
      <form id="profile-form" className="form-grid" onSubmit={handleSubmit}>
        {kind === "terminal" ? (
          <label className="form-field">
            <span className="field-label">终端模板</span>
            <select
              className="field-input"
              value={templateId}
              onChange={(event) => handleTemplateChange(event.currentTarget.value)}
            >
              {TERMINAL_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
            <span className="field-help">
              选择模板会自动填充名称/启动命令/参数，仍可自行修改。
            </span>
          </label>
        ) : null}
        <label className="form-field">
          <span className="field-label">名称</span>
          <input
            className="field-input"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder={kind === "terminal" ? "iTerm2" : "VS Code"}
            required
          />
        </label>
        <label className="form-field">
          <span className="field-label">启动命令（可拖拽 .app）</span>
          <input
            className="field-input"
            value={command}
            onChange={(event) => setCommand(event.currentTarget.value)}
            onDrop={handleCommandDrop}
            onDragOver={handleCommandDragOver}
            placeholder={
              kind === "terminal"
                ? "Terminal 或 /Applications/iTerm.app"
                : "Visual Studio Code 或 /Applications/Cursor.app"
            }
            required
          />
          <span className="field-help">
            支持应用名（如 Terminal、iTerm2、Wave）或 .app 路径；内部使用
            <span className="mono">open -a</span> 启动。
            可在“启动参数”里使用
            <span className="mono">{"{command}"}</span> 与
            <span className="mono">{"{cwd}"}</span> 占位符。
            Wave 会优先使用
            <span className="mono">wsh run</span> 执行命令，通常无需填写参数。
          </span>
          {appCheckState !== "idle" ? (
            <span className="field-help">
              <span className={`status-pill status-pill-${appCheckTone}`}>
                {appCheckLabel}
              </span>
              {appCheckState === "missing"
                ? " 请确认应用已安装或修改启动命令。"
                : null}
            </span>
          ) : null}
        </label>
        <label className="form-field full-span">
          <span className="field-label">启动参数（每行一个）</span>
          <textarea
            className="field-input field-textarea"
            value={argsText}
            onChange={(event) => setArgsText(event.currentTarget.value)}
            rows={3}
            placeholder="--reuse-window"
          />
          <span className="field-help">
            每行一个参数，等价于
            <span className="mono">open -a 应用 --args 参数1 参数2</span>。
            示例：<span className="mono">--command {"{command}"}</span>
          </span>
        </label>
        {kind === "terminal" ? (
          <label className="form-field full-span">
            <span className="field-label">环境变量</span>
            <textarea
              className="field-input field-textarea"
              value={envText}
              onChange={(event) => setEnvText(event.currentTarget.value)}
              rows={3}
              placeholder="PATH=/usr/local/bin"
            />
            <span className="field-help">格式：KEY=VALUE，每行一个。</span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
};

export default ProfileEditor;
