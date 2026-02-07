/**
 * @input  依赖：React
 * @output 导出：Toolbar 组件
 * @pos    搜索与快捷操作区
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
  onImport: () => void;
  onExport: () => void;
  onCreateSession: () => void;
  onRevealConfig: () => void;
}

const Toolbar = ({
  searchValue,
  onSearchChange,
  totalCount,
  filteredCount,
  onImport,
  onExport,
  onCreateSession,
  onRevealConfig,
}: ToolbarProps) => (
  <div className="toolbar surface">
    <div className="toolbar-left">
      <input
        className="search-input"
        value={searchValue}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        placeholder="搜索会话或路径"
        aria-label="搜索会话"
      />
      <span className="kpi-pill">总数 {totalCount}</span>
      <span className="kpi-pill">显示 {filteredCount}</span>
    </div>
    <div className="toolbar-actions">
      <button type="button" className="btn btn-ghost" onClick={onRevealConfig}>
        打开配置目录
      </button>
      <button type="button" className="btn" onClick={onImport}>
        导入
      </button>
      <button type="button" className="btn" onClick={onExport}>
        导出
      </button>
      <button type="button" className="btn btn-primary" onClick={onCreateSession}>
        新建会话
      </button>
    </div>
  </div>
);

export default Toolbar;
