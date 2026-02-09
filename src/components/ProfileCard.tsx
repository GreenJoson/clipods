/**
 * @input  依赖：React, 配置类型, i18n
 * @output 导出：ProfileCard 组件
 * @pos    终端与 IDE 配置展示
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { IdeProfile, TerminalProfile } from "../types/config";
import { useI18n } from "../i18n";

interface ProfileCardProps {
  profile: TerminalProfile | IdeProfile;
  kindLabel: string;
  delayMs?: number;
  onEdit: () => void;
  onDelete: () => void;
}

const ProfileCard = ({
  profile,
  kindLabel,
  delayMs,
  onEdit,
  onDelete,
}: ProfileCardProps) => {
  const { t } = useI18n();
  return (
    <div
      className="profile-card motion-rise-in"
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="profile-meta">
        <div className="session-title">
          {profile.name}
          <span className="badge badge-accent">{kindLabel}</span>
        </div>
        <div className="session-path">{profile.command}</div>
      </div>
      <div className="profile-meta">
        <div className="badge">
          {t("profileCard.args", {
            count: profile.args ? profile.args.length : 0,
          })}
        </div>
      </div>
      <div className="session-actions">
        <button type="button" className="btn" onClick={onEdit}>
          {t("profileCard.edit")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDelete}>
          {t("profileCard.delete")}
        </button>
      </div>
    </div>
  );
};

export default ProfileCard;
