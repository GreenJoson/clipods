/**
 * @input  依赖：React, Modal, 配置类型
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
  const [envText, setEnvText] = useState(buildEnvText(session.env));

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(session.name);
    setCodexHome(session.codexHome);
    setLoginType(session.loginType);
    setTerminalProfileId(session.terminalProfileId ?? "");
    setIdeProfileId(session.ideProfileId ?? "");
    setEnvText(buildEnvText(session.env));
  }, [open, session]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      id: session.id,
      name,
      codexHome,
      loginType,
      terminalProfileId: terminalProfileId || undefined,
      ideProfileId: ideProfileId || undefined,
      env: parseEnvText(envText),
    });
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
          <button type="submit" className="btn btn-primary" form="session-form">
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
        <label className="form-field full-span">
          <span className="field-label">环境变量</span>
          <textarea
            className="field-input field-textarea"
            value={envText}
            onChange={(event) => setEnvText(event.currentTarget.value)}
            placeholder="KEY=value"
            rows={4}
          />
        </label>
      </form>
    </Modal>
  );
};

export default SessionEditor;
