"use client";

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
}: {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-2 border-b border-[var(--color-border)]">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              isActive
                ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
