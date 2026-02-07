/**
 * @input  依赖：React, 配置类型
 * @output 导出：ProfileCard 组件
 * @pos    终端与 IDE 配置展示
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { IdeProfile, TerminalProfile } from "../types/config";

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
}: ProfileCardProps) => (
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
        参数 {profile.args ? profile.args.length : 0}
      </div>
    </div>
    <div className="session-actions">
      <button type="button" className="btn" onClick={onEdit}>
        编辑
      </button>
      <button type="button" className="btn btn-ghost" onClick={onDelete}>
        删除
      </button>
    </div>
  </div>
);

export default ProfileCard;
