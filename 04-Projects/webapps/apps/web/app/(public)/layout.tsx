export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // No auth gate — every page in this route group is viewable without signing in (FR-008,
  // FR-009). Shared nav chrome comes from the root layout (Phase 4's AppNav); this layout exists
  // to hold public-route-group-specific structure as the route group grows.
  return <>{children}</>;
}
