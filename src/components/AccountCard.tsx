/**
 * @input  依赖：React, 账号类型, i18n
 * @output 导出：AccountCard 组件
 * @pos    可复用账号短卡片展示（含类型、绑定能力与紧凑操作入口）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { AuthAccount } from "../types/config";
import { useI18n } from "../i18n";

interface AccountCardProps {
  account: AuthAccount;
  delayMs?: number;
  onEdit: () => void;
  onDelete: () => void;
}

const AccountCard = ({
  account,
  delayMs,
  onEdit,
  onDelete,
}: AccountCardProps) => {
  const { t } = useI18n();
  const detail =
    account.type === "chatgpt"
      ? t("accountCard.type.chatgpt")
      : account.baseUrl?.trim() || t("accountCard.type.api");

  return (
    <div
      className="account-card motion-rise-in"
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="account-card-main">
        <div className="account-card-heading">
          <div className="account-card-title-row">
            <div className="session-title account-card-title">{account.name}</div>
            <span className="badge badge-accent">
              {account.type === "chatgpt"
                ? t("accountCard.badge.chatgpt")
                : t("accountCard.badge.api")}
            </span>
          </div>
          <div className="session-path account-card-detail">{detail}</div>
        </div>
        <div className="badge account-card-capability">
          {account.type === "chatgpt"
            ? t("accountCard.authJsonReady")
            : t("accountCard.apiKeyReady")}
        </div>
      </div>
      <div className="session-actions account-card-actions">
        <button type="button" className="btn account-card-button" onClick={onEdit}>
          {t("accountCard.edit")}
        </button>
        <button
          type="button"
          className="btn btn-ghost account-card-button"
          onClick={onDelete}
        >
          {t("accountCard.delete")}
        </button>
      </div>
    </div>
  );
};

export default AccountCard;
