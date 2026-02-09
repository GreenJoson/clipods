/**
 * @input  依赖：React, i18n 文案
 * @output 导出：ProfileToolbar 组件
 * @pos    终端与 IDE 配置工具栏
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
interface ProfileToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  actionLabel: string;
  onCreate: () => void;
  labels: {
    searchPlaceholder: string;
    searchAria: string;
    total: string;
    filtered: string;
  };
}

const ProfileToolbar = ({
  searchValue,
  onSearchChange,
  actionLabel,
  onCreate,
  labels,
}: ProfileToolbarProps) => (
  <div className="toolbar surface">
    <div className="toolbar-left">
      <input
        className="search-input"
        value={searchValue}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        placeholder={labels.searchPlaceholder}
        aria-label={labels.searchAria}
      />
      <span className="kpi-pill">{labels.total}</span>
      <span className="kpi-pill">{labels.filtered}</span>
    </div>
    <div className="toolbar-actions">
      <button type="button" className="btn btn-primary" onClick={onCreate}>
        {actionLabel}
      </button>
    </div>
  </div>
);

export default ProfileToolbar;
