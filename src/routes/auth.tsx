import { createFileRoute, redirect } from "@tanstack/react-router";

// Back-compat: old links to /auth now go to /login
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/login", search: { redirect: search.redirect } });
  },
});
