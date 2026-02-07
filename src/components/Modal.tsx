/**
 * @input  依赖：React
 * @output 导出：Modal 组件
 * @pos    通用弹窗容器
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

const Modal = ({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: ModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card motion-rise-in">
        <header className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {description ? (
              <div className="modal-description">{description}</div>
            ) : null}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
