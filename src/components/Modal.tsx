/**
 * @input  依赖：React, 弹窗尺寸与样式类
 * @output 导出：Modal 组件
 * @pos    通用弹窗容器（支持紧凑样式）
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import { useId, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "compact";
  className?: string;
  onClose: () => void;
}

const Modal = ({
  open,
  title,
  description,
  children,
  footer,
  size = "default",
  className,
  onClose,
}: ModalProps) => {
  if (!open) {
    return null;
  }

  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div
        className={`modal-card motion-rise-in ${
          size === "compact" ? "modal-compact" : ""
        } ${className ?? ""}`}
      >
        <header className="modal-header">
          <div>
            <div className="modal-title" id={titleId}>
              {title}
            </div>
            {description ? (
              <div className="modal-description" id={descriptionId}>
                {description}
              </div>
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
