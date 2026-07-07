export type BadgeVariant = "1st" | "2nd" | "3rd" | "you";

const LABELS: Record<BadgeVariant, string> = {
  "1st": "#1",
  "2nd": "#2",
  "3rd": "#3",
  you: "You",
};

export function Badge({ variant }: { variant: BadgeVariant }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-primary)]">
      {LABELS[variant]}
    </span>
  );
}
