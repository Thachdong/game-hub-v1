import { Button } from "@/components/atoms/Button";

/** Page-number control for the standings list (FR-003). */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <Button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Prev
      </Button>
      <span className="text-sm text-[var(--color-text-secondary)]">
        Page {page} of {totalPages}
      </span>
      <Button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}
