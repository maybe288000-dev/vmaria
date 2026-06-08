import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { isUserAuthed } from "@/lib/auth-gate";

export function useRequireAuth() {
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isUserAuthed()) {
      navigate({ to: "/login", search: { redirect: location.href }, replace: true });
    }
  }, [navigate, location.href]);
}

