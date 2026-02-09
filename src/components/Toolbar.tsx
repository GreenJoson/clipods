/**
 * @input  依赖：React, i18n 文案
 * @output 导出：Toolbar 组件
 * @pos    搜索与快捷操作区
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onImport: () => void;
  onExport: () => void;
  onCreateSession: () => void;
  onRevealConfig: () => void;
  labels: {
    searchPlaceholder: string;
    searchAria: string;
    total: string;
    filtered: string;
    openConfig: string;
    import: string;
    export: string;
    createSession: string;
  };
}

const Toolbar = ({
  searchValue,
  onSearchChange,
  onImport,
  onExport,
  onCreateSession,
  onRevealConfig,
  labels,
}: ToolbarProps) => (
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
      <button type="button" className="btn btn-ghost" onClick={onRevealConfig}>
        {labels.openConfig}
      </button>
      <button type="button" className="btn" onClick={onImport}>
        {labels.import}
      </button>
      <button type="button" className="btn" onClick={onExport}>
        {labels.export}
      </button>
      <button type="button" className="btn btn-primary" onClick={onCreateSession}>
        {labels.createSession}
      </button>
    </div>
  </div>
);

export default Toolbar;
