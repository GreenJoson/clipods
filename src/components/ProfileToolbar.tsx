/**
 * @input  依赖：React
 * @output 导出：ProfileToolbar 组件
 * @pos    终端与 IDE 配置工具栏
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
interface ProfileToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
  actionLabel: string;
  onCreate: () => void;
}

const ProfileToolbar = ({
  searchValue,
  onSearchChange,
  totalCount,
  filteredCount,
  actionLabel,
  onCreate,
}: ProfileToolbarProps) => (
  <div className="toolbar surface">
    <div className="toolbar-left">
      <input
        className="search-input"
        value={searchValue}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        placeholder="搜索名称或命令"
        aria-label="搜索配置"
      />
      <span className="kpi-pill">总数 {totalCount}</span>
      <span className="kpi-pill">显示 {filteredCount}</span>
    </div>
    <div className="toolbar-actions">
      <button type="button" className="btn btn-primary" onClick={onCreate}>
        {actionLabel}
      </button>
    </div>
  </div>
);

export default ProfileToolbar;
