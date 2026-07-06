import Link from "next/link";

export function GameCard({
  name,
  bannerUrl,
  href,
}: {
  name: string;
  bannerUrl: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <img src={bannerUrl} alt={name} className="aspect-video w-full object-cover" />
      <span className="p-3 text-sm font-medium text-[var(--color-text-primary)]">{name}</span>
    </Link>
  );
}
