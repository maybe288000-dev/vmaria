import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------- Public reads ----------
export const listVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("id, drive_file_id, title, description, thumbnail_url, duration_sec, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, icon")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [video, clips, comments, categories] = await Promise.all([
      supabaseAdmin.from("videos").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("clips").select("*").eq("video_id", data.id).order("order_index"),
      supabaseAdmin
        .from("comments")
        .select("*")
        .eq("video_id", data.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("video_categories")
        .select("category_id, categories(id, name, slug, icon)")
        .eq("video_id", data.id),
    ]);
    if (video.error) throw new Error(video.error.message);
    return {
      video: video.data,
      clips: clips.data ?? [],
      comments: comments.data ?? [],
      categories: (categories.data ?? []).map((r: any) => r.categories).filter(Boolean),
    };
  });

export const listVideoStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [reactions, sessions] = await Promise.all([
      supabaseAdmin
        .from("reactions")
        .select("kind")
        .eq("target_type", "video")
        .eq("target_id", data.video_id),
      supabaseAdmin
        .from("view_sessions")
        .select("seconds_watched, completed, anon_id")
        .eq("video_id", data.video_id),
    ]);
    const r = reactions.data ?? [];
    const s = sessions.data ?? [];
    const unique = new Set(s.map((x: any) => x.anon_id));
    return {
      likes: r.filter((x: any) => x.kind === "like").length,
      dislikes: r.filter((x: any) => x.kind === "dislike").length,
      saves: r.filter((x: any) => x.kind === "save").length,
      views: s.length,
      unique_viewers: unique.size,
      total_seconds: s.reduce((a: number, x: any) => a + (x.seconds_watched || 0), 0),
      completions: s.filter((x: any) => x.completed).length,
    };
  });

// ---------- Interests ----------
export const getUserInterests = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ anon_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("user_interests")
      .select("category_id")
      .eq("anon_id", data.anon_id);
    return (rows ?? []).map((r: any) => r.category_id as string);
  });

export const setUserInterests = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        anon_id: z.string().uuid(),
        category_ids: z.array(z.string().uuid()).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_interests").delete().eq("anon_id", data.anon_id);
    if (data.category_ids.length > 0) {
      const rows = data.category_ids.map((category_id) => ({
        anon_id: data.anon_id,
        category_id,
      }));
      const { error } = await supabaseAdmin.from("user_interests").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------- Reactions ----------
export const toggleReaction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        anon_id: z.string().uuid(),
        target_type: z.enum(["video", "clip"]),
        target_id: z.string().uuid(),
        kind: z.enum(["like", "dislike", "save"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin
      .from("reactions")
      .select("id")
      .eq("anon_id", data.anon_id)
      .eq("target_type", data.target_type)
      .eq("target_id", data.target_id)
      .eq("kind", data.kind)
      .maybeSingle();
    if (existing.data) {
      await supabaseAdmin.from("reactions").delete().eq("id", existing.data.id);
      return { active: false };
    }
    // If like/dislike, remove the opposite
    if (data.kind === "like" || data.kind === "dislike") {
      const opposite = data.kind === "like" ? "dislike" : "like";
      await supabaseAdmin
        .from("reactions")
        .delete()
        .eq("anon_id", data.anon_id)
        .eq("target_type", data.target_type)
        .eq("target_id", data.target_id)
        .eq("kind", opposite);
    }
    await supabaseAdmin.from("reactions").insert({
      anon_id: data.anon_id,
      target_type: data.target_type,
      target_id: data.target_id,
      kind: data.kind,
    });
    return { active: true };
  });

export const getMyReactions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        anon_id: z.string().uuid(),
        target_type: z.enum(["video", "clip"]),
        target_ids: z.array(z.string().uuid()).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.target_ids.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("reactions")
      .select("target_id, kind")
      .eq("anon_id", data.anon_id)
      .eq("target_type", data.target_type)
      .in("target_id", data.target_ids);
    return rows ?? [];
  });

export const listSavedVideos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ anon_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rxs } = await supabaseAdmin
      .from("reactions")
      .select("target_id")
      .eq("anon_id", data.anon_id)
      .eq("target_type", "video")
      .eq("kind", "save");
    const ids = (rxs ?? []).map((r: any) => r.target_id);
    if (ids.length === 0) return [];
    const { data: vids } = await supabaseAdmin
      .from("videos")
      .select("id, drive_file_id, title, thumbnail_url, duration_sec")
      .in("id", ids);
    return vids ?? [];
  });

// ---------- Comments ----------
export const addComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        anon_id: z.string().uuid(),
        video_id: z.string().uuid(),
        body: z.string().min(1).max(2000),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        display_name: z.string().max(80).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, data: row } = await supabaseAdmin
      .from("comments")
      .insert({
        anon_id: data.anon_id,
        video_id: data.video_id,
        body: data.body,
        rating: data.rating ?? null,
        display_name: data.display_name ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- View tracking ----------
export const startViewSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        anon_id: z.string().uuid(),
        video_id: z.string().uuid(),
        device: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("view_sessions")
      .insert({
        anon_id: data.anon_id,
        video_id: data.video_id,
        device: data.device ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { session_id: row.id as string };
  });

export const heartbeatViewSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        session_id: z.string().uuid(),
        seconds_watched: z.number().int().min(0).max(86400),
        completed: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("view_sessions")
      .update({
        seconds_watched: data.seconds_watched,
        completed: data.completed ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.session_id);
    return { ok: true };
  });

// ---------- Admin: Drive ----------
export const getAdminSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_settings").select("*").eq("id", 1).maybeSingle();
  const [videosCount, clipsCount] = await Promise.all([
    supabaseAdmin.from("videos").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("clips").select("id", { count: "exact", head: true }),
  ]);
  return {
    settings: data,
    videos_count: videosCount.count ?? 0,
    clips_count: clipsCount.count ?? 0,
  };
});

export const syncDriveFolder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ folder_url: z.string().min(3) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { extractFolderId } = await import("@/lib/drive");
    const folderId = extractFolderId(data.folder_url);
    if (!folderId) throw new Error("رابط المجلد غير صالح");

    const lovableKey = process.env.LOVABLE_API_KEY;
    const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY غير مهيّأ");
    if (!driveKey) throw new Error("GOOGLE_DRIVE_API_KEY غير مهيّأ - يجب ربط Google Drive");

    const q = encodeURIComponent(
      `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
    );
    const fields = encodeURIComponent(
      "files(id,name,description,mimeType,size,thumbnailLink,videoMediaMetadata(durationMillis))",
    );
    const url = `${GATEWAY}/files?q=${q}&fields=${fields}&pageSize=200`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": driveKey,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`فشل قراءة المجلد (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { files?: any[] };
    const files = json.files ?? [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let added = 0;
    for (const f of files) {
      const durationSec = f.videoMediaMetadata?.durationMillis
        ? Math.round(parseInt(f.videoMediaMetadata.durationMillis, 10) / 1000)
        : null;
      const { error } = await supabaseAdmin.from("videos").upsert(
        {
          drive_file_id: f.id,
          title: f.name?.replace(/\.[a-zA-Z0-9]+$/, "") || "بدون عنوان",
          description: f.description ?? null,
          thumbnail_url: f.thumbnailLink ?? `https://drive.google.com/thumbnail?id=${f.id}&sz=w800`,
          duration_sec: durationSec,
          mime_type: f.mimeType ?? null,
          size_bytes: f.size ? parseInt(f.size, 10) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "drive_file_id" },
      );
      if (!error) added++;
    }

    await supabaseAdmin
      .from("admin_settings")
      .update({
        drive_folder_id: folderId,
        drive_folder_url: data.folder_url,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return { folder_id: folderId, total_files: files.length, synced: added };
  });

// ---------- Admin: AI clip suggestions ----------
export const generateClipsAI = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: video } = await supabaseAdmin
      .from("videos")
      .select("id, title, description, duration_sec")
      .eq("id", data.video_id)
      .maybeSingle();
    if (!video) throw new Error("الفيديو غير موجود");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY غير مهيّأ");
    const dur = video.duration_sec || 600;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد لاقتراح لقطات (Chapters) لفيديو بناءً على عنوانه ومدته. أعد JSON فقط بالشكل { clips: [{ title, description, start_sec, end_sec, tags }] } بين 4 و 8 لقطات، بالعربية، موزعة بانتظام على مدة الفيديو، مع وسوم قصيرة ذات صلة.",
        },
        {
          role: "user",
          content: `العنوان: ${video.title}\nالوصف: ${video.description ?? "لا يوجد"}\nالمدة بالثواني: ${dur}\nاقترح لقطات تقديرية.`,
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`فشل توليد اللقطات (${res.status}): ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as any;
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { clips?: any[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    const clips = (parsed.clips ?? []).slice(0, 10);

    // Replace existing clips
    await supabaseAdmin.from("clips").delete().eq("video_id", data.video_id);

    const rows = clips.map((c: any, i: number) => ({
      video_id: data.video_id,
      title: String(c.title ?? `لقطة ${i + 1}`).slice(0, 200),
      description: c.description ? String(c.description).slice(0, 1000) : null,
      start_sec: Math.max(0, Math.min(dur, parseInt(c.start_sec, 10) || 0)),
      end_sec: c.end_sec ? Math.max(0, Math.min(dur, parseInt(c.end_sec, 10))) : null,
      tags: Array.isArray(c.tags) ? c.tags.map(String).slice(0, 10) : [],
      order_index: i,
    }));
    if (rows.length > 0) {
      await supabaseAdmin.from("clips").insert(rows);
    }
    await supabaseAdmin
      .from("videos")
      .update({ ai_processed: true, updated_at: new Date().toISOString() })
      .eq("id", data.video_id);

    return { count: rows.length };
  });

export const updateClip = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).nullable().optional(),
        start_sec: z.number().int().min(0),
        end_sec: z.number().int().min(0).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clips")
      .update({
        title: data.title,
        description: data.description ?? null,
        start_sec: data.start_sec,
        end_sec: data.end_sec ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClip = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("clips").delete().eq("id", data.id);
    return { ok: true };
  });

export const setVideoCategories = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        video_id: z.string().uuid(),
        category_ids: z.array(z.string().uuid()).max(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("video_categories").delete().eq("video_id", data.video_id);
    if (data.category_ids.length > 0) {
      await supabaseAdmin
        .from("video_categories")
        .insert(data.category_ids.map((cid) => ({ video_id: data.video_id, category_id: cid })));
    }
    return { ok: true };
  });

export const getAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [videos, sessions, reactions, comments] = await Promise.all([
    supabaseAdmin.from("videos").select("id, title, thumbnail_url"),
    supabaseAdmin.from("view_sessions").select("video_id, anon_id, seconds_watched, completed"),
    supabaseAdmin.from("reactions").select("target_type, target_id, kind"),
    supabaseAdmin.from("comments").select("video_id, rating"),
  ]);
  const vs = videos.data ?? [];
  const ss = sessions.data ?? [];
  const rs = reactions.data ?? [];
  const cs = comments.data ?? [];

  const perVideo = vs.map((v: any) => {
    const sv = ss.filter((x: any) => x.video_id === v.id);
    const rv = rs.filter((x: any) => x.target_type === "video" && x.target_id === v.id);
    const cv = cs.filter((x: any) => x.video_id === v.id);
    const ratings = cv.map((x: any) => x.rating).filter((x: any) => x != null);
    return {
      id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      views: sv.length,
      unique_viewers: new Set(sv.map((x: any) => x.anon_id)).size,
      total_seconds: sv.reduce((a: number, x: any) => a + (x.seconds_watched || 0), 0),
      completions: sv.filter((x: any) => x.completed).length,
      likes: rv.filter((x: any) => x.kind === "like").length,
      dislikes: rv.filter((x: any) => x.kind === "dislike").length,
      saves: rv.filter((x: any) => x.kind === "save").length,
      comments: cv.length,
      avg_rating: ratings.length
        ? Number((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(2))
        : null,
    };
  });
  return {
    totals: {
      videos: vs.length,
      views: ss.length,
      unique_viewers: new Set(ss.map((x: any) => x.anon_id)).size,
      total_seconds: ss.reduce((a: number, x: any) => a + (x.seconds_watched || 0), 0),
    },
    per_video: perVideo.sort((a, b) => b.views - a.views),
  };
});

export const deleteVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("videos").delete().eq("id", data.id);
    return { ok: true };
  });
