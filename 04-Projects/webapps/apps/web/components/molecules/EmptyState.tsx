export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm text-[var(--color-text-secondary)]">{message}</p>
  );
}
