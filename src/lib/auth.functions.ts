import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";

const ADMIN_PASSWORD = "6969";

function assertAdmin(pw: string) {
  // constant-time-ish comparison
  if (pw.length !== ADMIN_PASSWORD.length) throw new Error("غير مصرّح");
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ ADMIN_PASSWORD.charCodeAt(i);
  if (diff !== 0) throw new Error("غير مصرّح");
}

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9_.-]+$/);

// ---------- User-facing auth ----------
export const userLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        username: usernameSchema,
        password: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, display_name, password_hash, blocked")
      .eq("username", data.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("بيانات الدخول غير صحيحة");
    if (row.blocked) throw new Error("هذا الحساب موقوف. تواصل مع الإدارة.");
    const ok = await bcrypt.compare(data.password, row.password_hash);
    if (!ok) throw new Error("بيانات الدخول غير صحيحة");
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("app_users")
      .update({ last_login_at: now, last_seen_at: now })
      .eq("id", row.id);
    return { id: row.id, username: row.username, display_name: row.display_name };
  });

export const userPing = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, blocked")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!row) return { ok: false as const, reason: "missing" as const };
    if (row.blocked) return { ok: false as const, reason: "blocked" as const };
    await supabaseAdmin
      .from("app_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true as const };
  });

// ---------- Admin ops ----------
const adminPasswordSchema = z.string().min(1).max(64);

export const adminCreateUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        admin_password: adminPasswordSchema,
        username: usernameSchema,
        password: z.string().min(4).max(200),
        display_name: z.string().trim().max(64).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.admin_password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await bcrypt.hash(data.password, 10);
    const { data: row, error } = await supabaseAdmin
      .from("app_users")
      .insert({
        username: data.username,
        display_name: data.display_name || null,
        password_hash: hash,
      })
      .select("id, username, display_name, created_at, blocked")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("اسم المستخدم مأخوذ");
      throw new Error(error.message);
    }
    return row;
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        admin_password: adminPasswordSchema,
        user_id: z.string().uuid(),
        new_password: z.string().min(4).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.admin_password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await bcrypt.hash(data.new_password, 10);
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ password_hash: hash })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetBlocked = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        admin_password: adminPasswordSchema,
        user_id: z.string().uuid(),
        blocked: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.admin_password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ blocked: data.blocked })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteAppUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ admin_password: adminPasswordSchema, user_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.admin_password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Also wipe their activity records
    await supabaseAdmin.from("view_sessions").delete().eq("anon_id", data.user_id);
    await supabaseAdmin.from("chat_messages").delete().eq("anon_id", data.user_id);
    await supabaseAdmin.from("reactions").delete().eq("anon_id", data.user_id);
    const { error } = await supabaseAdmin.from("app_users").delete().eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListAppUsers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ admin_password: adminPasswordSchema }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.admin_password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [usersRes, sessionsRes, messagesRes, videosRes] = await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id, username, display_name, blocked, created_at, last_login_at, last_seen_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("view_sessions")
        .select("anon_id, video_id, seconds_watched, updated_at, completed"),
      supabaseAdmin.from("chat_messages").select("anon_id"),
      supabaseAdmin.from("videos").select("id, title, thumbnail_url"),
    ]);
    if (usersRes.error) throw new Error(usersRes.error.message);
    const videoById = new Map((videosRes.data ?? []).map((v: any) => [v.id, v]));
    const stats = new Map<string, any>();
    for (const s of sessionsRes.data ?? []) {
      const cur = stats.get(s.anon_id) ?? {
        total_seconds: 0,
        sessions: 0,
        messages: 0,
        last_video: null as any,
        last_at: null as string | null,
      };
      cur.total_seconds += s.seconds_watched || 0;
      cur.sessions += 1;
      if (!cur.last_at || s.updated_at > cur.last_at) {
        cur.last_at = s.updated_at;
        cur.last_video = videoById.get(s.video_id) ?? null;
      }
      stats.set(s.anon_id, cur);
    }
    for (const m of messagesRes.data ?? []) {
      const cur = stats.get(m.anon_id) ?? {
        total_seconds: 0,
        sessions: 0,
        messages: 0,
        last_video: null,
        last_at: null,
      };
      cur.messages += 1;
      stats.set(m.anon_id, cur);
    }
    const now = Date.now();
    return (usersRes.data ?? []).map((u: any) => {
      const st = stats.get(u.id) ?? {
        total_seconds: 0,
        sessions: 0,
        messages: 0,
        last_video: null,
        last_at: null,
      };
      const lastSeenMs = u.last_seen_at ? new Date(u.last_seen_at).getTime() : 0;
      const lastActivityMs = st.last_at ? new Date(st.last_at).getTime() : 0;
      const recent = Math.max(lastSeenMs, lastActivityMs);
      return {
        ...u,
        total_seconds: st.total_seconds,
        sessions: st.sessions,
        messages: st.messages,
        last_video: st.last_video,
        last_activity_at: st.last_at,
        online: recent > 0 && now - recent < 60_000,
      };
    });
  });

export const adminUserDetail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ admin_password: adminPasswordSchema, user_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.admin_password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [user, sessions, messages] = await Promise.all([
      supabaseAdmin
        .from("app_users")
        .select("id, username, display_name, blocked, created_at, last_login_at, last_seen_at")
        .eq("id", data.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from("view_sessions")
        .select("video_id, seconds_watched, updated_at, completed, device")
        .eq("anon_id", data.user_id)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("anon_id", data.user_id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const videoIds = Array.from(new Set((sessions.data ?? []).map((s: any) => s.video_id)));
    let videos: any[] = [];
    if (videoIds.length) {
      const { data: vs } = await supabaseAdmin
        .from("videos")
        .select("id, title, thumbnail_url")
        .in("id", videoIds);
      videos = vs ?? [];
    }
    const byId = new Map(videos.map((v: any) => [v.id, v]));
    return {
      user: user.data,
      sessions: (sessions.data ?? []).map((s: any) => ({ ...s, video: byId.get(s.video_id) ?? null })),
      messages: messages.data ?? [],
    };
  });
