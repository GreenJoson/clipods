/**
 * @input  依赖：React, Modal, 配置类型
 * @output 导出：ProfileEditor 组件
 * @pos    终端与 IDE 配置编辑弹窗
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useEffect, useState, type FormEvent } from "react";
import Modal from "./Modal";
import type { IdeProfile, TerminalProfile } from "../types/config";

export type ProfileKind = "terminal" | "ide";

interface ProfileEditorProps {
  open: boolean;
  kind: ProfileKind;
  profile: TerminalProfile | IdeProfile;
  onSave: (profile: TerminalProfile | IdeProfile) => void;
  onCancel: () => void;
  onDelete?: (profileId: string) => void;
}

const buildArgsText = (args?: string[]): string => (args ? args.join("\n") : "");

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
  const [envText, setEnvText] = useState(
    kind === "terminal" ? buildEnvText((profile as TerminalProfile).env) : ""
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(profile.name);
    setCommand(profile.command);
    setArgsText(buildArgsText(profile.args));
    setEnvText(
      kind === "terminal" ? buildEnvText((profile as TerminalProfile).env) : ""
    );
  }, [open, profile, kind]);

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
          <span className="field-label">启动命令</span>
          <input
            className="field-input"
            value={command}
            onChange={(event) => setCommand(event.currentTarget.value)}
            placeholder={kind === "terminal" ? "Terminal" : "Visual Studio Code"}
            required
          />
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
          </label>
        ) : null}
      </form>
    </Modal>
  );
};

export default ProfileEditor;
