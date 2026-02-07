/**
 * @input  依赖：React
 * @output 导出：SegmentTabs 组件
 * @pos    顶部导航分段切换
 *
 * ⚠️ 一旦本文件被更新，务必更新以上注释
 */
import type { ReactNode } from "react";

export interface SegmentTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface SegmentTabsProps {
  items: SegmentTabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

const SegmentTabs = ({ items, activeId, onChange }: SegmentTabsProps) => (
  <div className="segment-tabs" role="tablist">
    {items.map((item) => {
      const isActive = item.id === activeId;
      const tabId = `${item.id}-tab`;
      const panelId = `${item.id}-panel`;
      return (
        <button
          key={item.id}
          id={tabId}
          type="button"
          className={`segment-tab ${isActive ? "is-active" : ""}`}
          role="tab"
          aria-selected={isActive}
          aria-controls={panelId}
          tabIndex={isActive ? 0 : -1}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
          {typeof item.count === "number" ? ` ${item.count}` : ""}
        </button>
      );
    })}
  </div>
);

export default SegmentTabs;
