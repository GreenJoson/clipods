/**
 * @input  依赖：React, Tauri invoke, 文件选择/读取, Modal, 账号类型, i18n
 * @output 导出：AccountEditor 组件
 * @pos    可复用账号编辑弹窗（支持 ChatGPT auth.json 当前/文件导入与 API 凭据）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import Modal from "./Modal";
import type { AuthAccount, AuthAccountType } from "../types/config";
import { useI18n } from "../i18n";
import { parseToml } from "../utils/toml";

interface AccountEditorProps {
  open: boolean;
  account: AuthAccount;
  isNew: boolean;
  allowChatGPT: boolean;
  onSave: (account: AuthAccount) => void;
  onCancel: () => void;
  onDelete?: (accountId: string) => void;
}

interface ImportedAccountDraft {
  type: AuthAccountType;
  authJson?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const readTomlString = (
  value: Record<string, unknown> | undefined,
  key: string
): string | undefined => (value ? readString(value[key]) : undefined);

const parseImportedAccountDraft = (source: string): ImportedAccountDraft | null => {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("{")) {
    return trimmed.startsWith("sk-")
      ? {
          type: "api",
          apiKey: trimmed,
        }
      : null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return null;
    }

    const apiKey = readString(parsed.OPENAI_API_KEY);
    const tokens = parsed.tokens;
    if (isRecord(tokens) && readString(tokens.access_token)) {
      return {
        type: "chatgpt",
        authJson: trimmed,
      };
    }

    if (apiKey) {
      return {
        type: "api",
        apiKey,
      };
    }
  } catch {
    return null;
  }

  return null;
};

const parseImportedCodexConfig = (
  source: string
): Pick<ImportedAccountDraft, "baseUrl" | "model"> => {
  try {
    const parsed = parseToml(source) as Record<string, unknown>;
    const providerName = readString(parsed.model_provider);
    const model = readString(parsed.model);
    const providers = isRecord(parsed.model_providers)
      ? parsed.model_providers
      : undefined;

    const customProvider =
      providers && isRecord(providers.custom)
        ? (providers.custom as Record<string, unknown>)
        : undefined;
    const openaiProvider =
      providers && isRecord(providers.openai)
        ? (providers.openai as Record<string, unknown>)
        : undefined;

    const baseUrl =
      (providerName === "custom"
        ? readTomlString(customProvider, "base_url")
        : undefined) ??
      readTomlString(openaiProvider, "base_url");

    return {
      baseUrl,
      model,
    };
  } catch {
    return {};
  }
};

const AccountEditor = ({
  open,
  account,
  isNew,
  allowChatGPT,
  onSave,
  onCancel,
  onDelete,
}: AccountEditorProps) => {
  const { t } = useI18n();
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AuthAccountType>(account.type);
  const [authJson, setAuthJson] = useState(
    account.type === "chatgpt" ? account.authJson : ""
  );
  const [apiKey, setApiKey] = useState(account.type === "api" ? account.apiKey : "");
  const [baseUrl, setBaseUrl] = useState(
    account.type === "api" ? account.baseUrl ?? "" : ""
  );
  const [model, setModel] = useState(account.type === "api" ? account.model ?? "" : "");
  const [organization, setOrganization] = useState(
    account.type === "api" ? account.organization ?? "" : ""
  );
  const [project, setProject] = useState(
    account.type === "api" ? account.project ?? "" : ""
  );
  const [importingAuthJson, setImportingAuthJson] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(account.name);
    setType(account.type);
    setAuthJson(account.type === "chatgpt" ? account.authJson : "");
    setApiKey(account.type === "api" ? account.apiKey : "");
    setBaseUrl(account.type === "api" ? account.baseUrl ?? "" : "");
    setModel(account.type === "api" ? account.model ?? "" : "");
    setOrganization(account.type === "api" ? account.organization ?? "" : "");
    setProject(account.type === "api" ? account.project ?? "" : "");
  }, [account, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (type === "chatgpt") {
      onSave({
        id: account.id,
        name: name.trim(),
        type,
        authJson: authJson.trim(),
      });
      return;
    }

    onSave({
      id: account.id,
      name: name.trim(),
      type,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined,
      model: model.trim() || undefined,
      organization: organization.trim() || undefined,
      project: project.trim() || undefined,
    });
  };

  const applyImportedDraft = (draft: ImportedAccountDraft) => {
    setType(draft.type);
    if (draft.type === "chatgpt") {
      setAuthJson(draft.authJson ?? "");
      return;
    }

    setApiKey(draft.apiKey ?? "");
    setBaseUrl(draft.baseUrl ?? "");
    setModel(draft.model ?? "");
  };

  const handleImportCurrentAuth = async () => {
    setImportingAuthJson(true);
    try {
      const [authContents, configContents] = await Promise.allSettled([
        invoke<string>("read_codex_auth"),
        invoke<string>("read_codex_config"),
      ]);
      const authText =
        authContents.status === "fulfilled" ? authContents.value : "";
      const imported = parseImportedAccountDraft(authText);
      if (imported) {
        const configDraft =
          imported.type === "api" && configContents.status === "fulfilled"
            ? parseImportedCodexConfig(configContents.value)
            : {};
        applyImportedDraft({ ...imported, ...configDraft });
      }
    } finally {
      setImportingAuthJson(false);
    }
  };

  const handleImportAuthFile = async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    setImportingAuthJson(true);
    try {
      const contents = await readTextFile(selected);
      const imported = parseImportedAccountDraft(contents);
      if (imported) {
        applyImportedDraft(imported);
      }
    } finally {
      setImportingAuthJson(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isNew ? t("accountEditor.title.new") : t("accountEditor.title.edit")}
      description={t("accountEditor.desc")}
      onClose={onCancel}
      footer={
        <div className="modal-footer-actions">
          {onDelete ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onDelete(account.id)}
            >
              {t("common.delete")}
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button type="submit" form="account-editor-form" className="btn btn-primary">
            {t("common.save")}
          </button>
        </div>
      }
    >
      <form id="account-editor-form" className="modal-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span className="field-label">{t("accountEditor.field.name")}</span>
          <input
            className="field-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("accountEditor.placeholder.name")}
            required
          />
        </label>
        <label className="form-field">
          <span className="field-label">{t("accountEditor.field.type")}</span>
          <select
            className="field-input"
            value={type}
            onChange={(event) =>
              setType(event.target.value === "chatgpt" ? "chatgpt" : "api")
            }
          >
            {allowChatGPT ? (
              <option value="chatgpt">{t("accountEditor.type.chatgpt")}</option>
            ) : null}
            <option value="api">{t("accountEditor.type.api")}</option>
          </select>
        </label>

        {type === "chatgpt" ? (
          <label className="form-field">
            <span className="field-label">{t("accountEditor.field.authJson")}</span>
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  handleImportCurrentAuth().catch(() => undefined);
                }}
                disabled={importingAuthJson}
              >
                {t("accountEditor.action.importCurrent")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  handleImportAuthFile().catch(() => undefined);
                }}
                disabled={importingAuthJson}
              >
                {t("accountEditor.action.importFile")}
              </button>
            </div>
            <textarea
              className="field-input field-textarea"
              value={authJson}
              onChange={(event) => setAuthJson(event.target.value)}
              placeholder={t("accountEditor.placeholder.authJson")}
              rows={9}
              required
            />
            <span className="field-help">{t("accountEditor.help.authJson")}</span>
          </label>
        ) : (
          <>
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  handleImportCurrentAuth().catch(() => undefined);
                }}
                disabled={importingAuthJson}
              >
                {t("accountEditor.action.importCurrent")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  handleImportAuthFile().catch(() => undefined);
                }}
                disabled={importingAuthJson}
              >
                {t("accountEditor.action.importFile")}
              </button>
            </div>
            <label className="form-field">
              <span className="field-label">{t("accountEditor.field.apiKey")}</span>
              <input
                className="field-input"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={t("accountEditor.placeholder.apiKey")}
                required
              />
            </label>
            <label className="form-field">
              <span className="field-label">{t("accountEditor.field.baseUrl")}</span>
              <input
                className="field-input"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder={t("accountEditor.placeholder.baseUrl")}
              />
            </label>
            <label className="form-field">
              <span className="field-label">{t("accountEditor.field.model")}</span>
              <input
                className="field-input"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={t("accountEditor.placeholder.model")}
              />
            </label>
            {allowChatGPT ? (
              <>
                <label className="form-field">
                  <span className="field-label">
                    {t("accountEditor.field.organization")}
                  </span>
                  <input
                    className="field-input"
                    value={organization}
                    onChange={(event) => setOrganization(event.target.value)}
                    placeholder={t("accountEditor.placeholder.organization")}
                  />
                </label>
                <label className="form-field">
                  <span className="field-label">{t("accountEditor.field.project")}</span>
                  <input
                    className="field-input"
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                    placeholder={t("accountEditor.placeholder.project")}
                  />
                </label>
              </>
            ) : null}
            <span className="field-help">{t("accountEditor.help.api")}</span>
          </>
        )}
      </form>
    </Modal>
  );
};

export default AccountEditor;
