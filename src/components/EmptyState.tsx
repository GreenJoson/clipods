/**
 * @input  依赖：React
 * @output 导出：EmptyState 组件
 * @pos    空状态占位
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <div className="empty-state motion-fade-in">
    <div className="empty-title">{title}</div>
    <p className="empty-copy">{description}</p>
    {actionLabel && onAction ? (
      <button type="button" className="btn btn-primary" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </div>
);

export default EmptyState;
