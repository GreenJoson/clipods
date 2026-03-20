/**
 * @input  依赖：EmptyState, AccountCard, 账号类型, i18n
 * @output 导出：AccountBoard 区块
 * @pos    可复用账号列表布局与空态控制
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import EmptyState from "../components/EmptyState";
import AccountCard from "../components/AccountCard";
import type { AuthAccount } from "../types/config";
import { useI18n } from "../i18n";

interface AccountBoardProps {
  accounts: AuthAccount[];
  onCreateAccount: () => void;
  onEditAccount: (account: AuthAccount) => void;
  onDeleteAccount: (account: AuthAccount) => void;
}

const AccountBoard = ({
  accounts,
  onCreateAccount,
  onEditAccount,
  onDeleteAccount,
}: AccountBoardProps) => {
  const { t } = useI18n();

  if (accounts.length === 0) {
    return (
      <EmptyState
        title={t("empty.accounts.title")}
        description={t("empty.accounts.desc")}
        actionLabel={t("empty.accounts.action")}
        onAction={onCreateAccount}
      />
    );
  }

  return (
    <div className="profile-grid">
      {accounts.map((account, index) => (
        <AccountCard
          key={account.id}
          account={account}
          delayMs={index * 70}
          onEdit={() => onEditAccount(account)}
          onDelete={() => onDeleteAccount(account)}
        />
      ))}
    </div>
  );
};

export default AccountBoard;
