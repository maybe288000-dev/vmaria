import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------- Public reads ----------
export const listPublicVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("videos")
    .select("id, drive_file_id, title, thumbnail_url, duration_sec, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listVideos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ anon_id: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: videos, error } = await supabaseAdmin
      .from("videos")
      .select("id, drive_file_id, title, description, thumbnail_url, duration_sec, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return videos ?? [];
  });

export const getContinueWatching = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ anon_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sessions } = await supabaseAdmin
      .from("view_sessions")
      .select("video_id, seconds_watched, updated_at, completed")
      .eq("anon_id", data.anon_id)
      .gte("seconds_watched", 10)
      .order("updated_at", { ascending: false })
      .limit(30);
    const list = sessions ?? [];
    if (list.length === 0) return [];
    const seen = new Set<string>();
    const dedup: any[] = [];
    for (const s of list) {
      if (seen.has(s.video_id)) continue;
      seen.add(s.video_id);
      dedup.push(s);
      if (dedup.length >= 6) break;
    }
    const ids = dedup.map((s) => s.video_id);
    const { data: videos } = await supabaseAdmin
      .from("videos")
      .select("id, drive_file_id, title, thumbnail_url, duration_sec")
      .in("id", ids);
    const byId = new Map((videos ?? []).map((v: any) => [v.id, v]));
    return dedup
      .map((s) => {
        const v = byId.get(s.video_id);
        if (!v) return null;
        const dur = v.duration_sec || 0;
        const progress = dur ? Math.min(100, Math.round((s.seconds_watched / dur) * 100)) : 0;
        return { video: v, last_sec: s.seconds_watched, completed: s.completed, progress };
      })
      .filter(Boolean);
  });

export const getRandomClips = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(20) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clips } = await supabaseAdmin
      .from("clips")
      .select("id, video_id, title, start_sec, tags")
      .limit(200);
    const list = clips ?? [];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    const sliced = list.slice(0, data.limit);
    if (sliced.length === 0) return [];
    const vids = await supabaseAdmin
      .from("videos")
      .select("id, title, thumbnail_url, drive_file_id")
      .in("id", sliced.map((c: any) => c.video_id));
    const byId = new Map((vids.data ?? []).map((v: any) => [v.id, v]));
    return sliced
      .map((c: any) => {
        const v = byId.get(c.video_id);
        if (!v) return null;
        return { ...c, video: v };
      })
      .filter(Boolean);
  });

export const getTrailers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(10) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: videos } = await supabaseAdmin
      .from("videos")
      .select("id, drive_file_id, title, description, thumbnail_url, duration_sec, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    const list = videos ?? [];
    if (list.length === 0) return [];
    const ids = list.map((v: any) => v.id);
    const { data: clips } = await supabaseAdmin
      .from("clips")
      .select("video_id, start_sec, order_index")
      .in("video_id", ids)
      .order("order_index");
    const firstClipByVid = new Map<string, number>();
    for (const c of clips ?? []) {
      if (!firstClipByVid.has(c.video_id)) firstClipByVid.set(c.video_id, c.start_sec);
    }
    return list.map((v: any) => ({
      ...v,
      start_sec: firstClipByVid.get(v.id) ?? 0,
    }));
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
    const [video, clips, comments] = await Promise.all([
      supabaseAdmin.from("videos").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("clips").select("*").eq("video_id", data.id).order("order_index"),
      supabaseAdmin
        .from("comments")
        .select("*")
        .eq("video_id", data.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (video.error) throw new Error(video.error.message);
    return {
      video: video.data,
      clips: clips.data ?? [],
      comments: comments.data ?? [],
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
    };
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

// ---------- Resume point ----------
export const getResumePoint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ anon_id: z.string().uuid(), video_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("view_sessions")
      .select("seconds_watched, completed, updated_at")
      .eq("anon_id", data.anon_id)
      .eq("video_id", data.video_id)
      .order("updated_at", { ascending: false })
      .limit(1);
    const row = rows?.[0];
    if (!row) return { seconds: 0, completed: false };
    return { seconds: row.seconds_watched ?? 0, completed: !!row.completed };
  });

// ---------- Admin: AI description generation ----------
export const generateVideoDescription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY غير مهيّأ");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: video } = await supabaseAdmin
      .from("videos")
      .select("id, title")
      .eq("id", data.video_id)
      .maybeSingle();
    if (!video) throw new Error("الفيديو غير موجود");

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "أنت محرر منصة أفلام عربية. اكتب وصفاً جذاباً من سطرين إلى ثلاثة أسطر بالعربية الواضحة، ويمكن استخدام لمسة عراقية خفيفة. اعتمد على العنوان فقط ولا تخترع أحداثاً مؤكدة أو أسماء شخصيات غير معروفة. إذا كان العنوان يوحي بموضوع ناضج، اذكر ذلك بعبارة عامة ومحترمة مثل (يتضمن موضوعات ناضجة) دون وصف جنسي صريح أو تفصيلي. لا مقدمات ولا عناوين، فقط الوصف مباشرة بدون علامات اقتباس.",
          },
          { role: "user", content: `عنوان الفيلم: ${video.title}` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("الكثير من الطلبات، حاول لاحقاً");
    if (res.status === 402) throw new Error("نفد رصيد الذكاء الاصطناعي");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`فشل التوليد: ${t.slice(0, 150)}`);
    }
    const json = (await res.json()) as any;
    const description: string =
      json.choices?.[0]?.message?.content?.trim().replace(/^["'«»\s]+|["'«»\s]+$/g, "") || "";
    if (!description) throw new Error("لم يتم توليد وصف");
    await supabaseAdmin
      .from("videos")
      .update({ description, updated_at: new Date().toISOString() })
      .eq("id", data.video_id);
    return { description };
  });

// ---------- Admin: settings + sync ----------
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upsert settings + folder
    await supabaseAdmin.from("admin_settings").upsert({
      id: 1,
      drive_folder_id: folderId,
      drive_folder_url: data.folder_url,
      updated_at: new Date().toISOString(),
    });

    const fields = encodeURIComponent(
      "nextPageToken,files(id,name,description,mimeType,size,thumbnailLink,videoMediaMetadata(durationMillis))",
    );
    const q = encodeURIComponent(
      `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
    );

    let pageToken: string | undefined = undefined;
    let totalFiles = 0;
    let synced = 0;
    let pages = 0;
    const maxPages = 50; // safety cap = up to 50k files

    do {
      const url = `${GATEWAY}/files?q=${q}&fields=${fields}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      }`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": driveKey,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`فشل قراءة المجلد (${res.status}): ${body.slice(0, 300)}`);
      }
      const json = (await res.json()) as { files?: any[]; nextPageToken?: string };
      const files = json.files ?? [];
      totalFiles += files.length;

      // Batch upsert
      const rows = files.map((f: any) => ({
        drive_file_id: f.id,
        title: (f.name ?? "بدون عنوان").replace(/\.[a-zA-Z0-9]+$/, ""),
        description: f.description ?? null,
        thumbnail_url:
          f.thumbnailLink ?? `https://drive.google.com/thumbnail?id=${f.id}&sz=w800`,
        duration_sec: f.videoMediaMetadata?.durationMillis
          ? Math.round(parseInt(f.videoMediaMetadata.durationMillis, 10) / 1000)
          : null,
        mime_type: f.mimeType ?? null,
        size_bytes: f.size ? parseInt(f.size, 10) : null,
        updated_at: new Date().toISOString(),
      }));

      // Batch insert in chunks of 500
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await supabaseAdmin
          .from("videos")
          .upsert(chunk, { onConflict: "drive_file_id" });
        if (!error) synced += chunk.length;
      }

      pageToken = json.nextPageToken;
      pages += 1;
      if (pages >= maxPages) break;
    } while (pageToken);

    await supabaseAdmin
      .from("admin_settings")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return { folder_id: folderId, total_files: totalFiles, synced, pages };
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
            "أنت محرر فهرسة أفلام. أعد JSON فقط بالشكل { clips: [{ title, description, start_sec, end_sec, tags }] } بين 4 و 8 لقطات، موزعة بانتظام على مدة الفيديو. اكتب العنوان والوصف بالعربية الواضحة أو بلهجة عراقية خفيفة، واجعل الوصف يشرح نوع اللحظة دون ادعاء مشاهدة الفيديو. استخدم وسوماً قصيرة. إذا كانت اللقطة ذات موضوع ناضج، اذكر (موضوع ناضج) أو (رومانسية) بشكل غير صريح ومحترم، ولا تنتج أي وصف جنسي تفصيلي أو إباحي أو يتضمن قاصرين.",
        },
        {
          role: "user",
          content: `العنوان: ${video.title}\nالوصف: ${video.description ?? "لا يوجد"}\nالمدة بالثواني: ${dur}`,
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
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
    if (rows.length > 0) await supabaseAdmin.from("clips").insert(rows);
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

export const deleteVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("videos").delete().eq("id", data.id);
    return { ok: true };
  });

export const getAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [videos, sessions, reactions, comments] = await Promise.all([
    supabaseAdmin.from("videos").select("id, title, thumbnail_url").limit(500),
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

// ---------- Chat with Maria ----------
const MARIA_BIRTHDAY = new Date("2002-06-05T00:00:00Z"); // 24 years on 2026-06-05

function mariaAgeYears(): number {
  const now = Date.now();
  const diff = now - MARIA_BIRTHDAY.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const MARIA_SYSTEM = () => `أنتِ "ماريا"، رفيقة سينمائية داخل موقع ماريا. تتحدثين بلهجة عراقية بغدادية حيوية وقريبة ودافئة، بأسلوب جريء وممتع لكن غير صريح. مهمتك مساعدة المستخدم على اكتشاف الأفلام واللقطات الموجودة في كتالوج الموقع، والتعليق على الجو والمشاهد والممثلين حسب البيانات المتوفرة فقط. إذا كان هناك "فيلم يعمل الآن" فاعتبري نفسك تشاهدينه معه وعلّقي عليه وعلى المشهد القريب من وقته الحالي. لا تخترعي أفلاماً أو أحداثاً غير موجودة في الكتالوج، وإذا لم تجدي المعلومة قولي: "ما عندي معلومة عنها بكتالوج ماريا". يمكنك مناقشة الرومانسية والموضوعات الناضجة بجرأة أدبية عامة، لكن لا تقدمي وصفاً جنسياً صريحاً أو لعب أدوار إباحياً، ولا أي محتوى يتضمن قاصرين أو محارم أو استغلالاً؛ عند مثل هذه الطلبات حوّلي الحديث بلطف إلى الأفلام والأجواء.`;

async function callChatModel(messages: Array<{ role: string; content: string }>) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (openRouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "X-Title": "Maria",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
          messages,
        }),
      });
      if (res.status === 401) throw new Error("مفتاح OpenRouter غير صالح");
      if (res.status === 402) throw new Error("نفد رصيد OpenRouter");
      if (res.status === 429) throw new Error("الكثير من الطلبات على OpenRouter، حاول لاحقاً");
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenRouter فشل: ${body.slice(0, 150)}`);
      }
      const json = (await res.json()) as any;
      const reply: string | undefined = json.choices?.[0]?.message?.content?.trim();
      if (reply) return reply;
      throw new Error("OpenRouter رجّع رداً فارغاً");
    } catch (error: any) {
      console.error("OpenRouter failed, falling back to Lovable AI:", error?.message);
    }
  }

  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI غير مهيّأ");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }),
  });
  if (res.status === 429) throw new Error("الكثير من الطلبات، حاول لاحقاً");
  if (res.status === 402) throw new Error("نفدت رصيد الذكاء الاصطناعي");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`فشل: ${body.slice(0, 150)}`);
  }
  const json = (await res.json()) as any;
  return (json.choices?.[0]?.message?.content?.trim() as string) || "اعذرني، ما گدرت أرد هسه.";
}

export const chatWithMaria = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        anon_id: z.string().uuid(),
        message: z.string().min(1).max(2000),
        video_id: z.string().uuid().optional(),
        t: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!process.env.OPENROUTER_API_KEY && !process.env.LOVABLE_API_KEY) {
      throw new Error("AI غير مهيّأ");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: catalog }, { data: clips }] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select("id, title, description, duration_sec")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("clips")
        .select("video_id, title, description, start_sec, tags")
        .limit(500),
    ]);
    const catalogContext = (catalog ?? [])
      .map((video: any) => {
        const related = (clips ?? [])
          .filter((clip: any) => clip.video_id === video.id)
          .slice(0, 8)
          .map((clip: any) => `${clip.title} (${clip.start_sec}s): ${clip.description ?? "بدون شرح"}`)
          .join(" | ");
        return `فيلم: ${video.title}\nالوصف: ${video.description ?? "بدون وصف"}\nالمدة: ${video.duration_sec ?? "غير معروفة"} ثانية\nاللقطات: ${related || "لا توجد لقطات مفهرسة"}`;
      })
      .join("\n---\n");
    const allowedTitles = (catalog ?? []).map((video: any) => video.title).filter(Boolean).join("، ");

    // Check blocked
    const blocked = await supabaseAdmin
      .from("blocked_users")
      .select("anon_id")
      .eq("anon_id", data.anon_id)
      .maybeSingle();
    if (blocked.data) throw new Error("الحساب موقوف");

    // Load last 20 messages for context
    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("anon_id", data.anon_id)
      .order("created_at", { ascending: false })
      .limit(20);
    const ctx = (history ?? []).reverse();

    // Save user message
    await supabaseAdmin.from("chat_messages").insert({
      anon_id: data.anon_id,
      role: "user",
      content: data.message,
    });

    const messages = [
      {
        role: "system",
        content: `${MARIA_SYSTEM()}\n\nكتالوج ماريا الحالي — المصدر الوحيد للإجابة:\n${catalogContext || "الكتالوج فارغ حالياً."}`,
      },
      ...ctx.map((m: any) => ({ role: m.role, content: m.content })),
      {
        role: "system",
        content: `تعليمات نهائية لا يجوز تجاوزها: أجيبي عن كتالوج ماريا فقط. العناوين المسموح ذكرها هي: ${allowedTitles || "لا توجد عناوين"}. لا تقترحي أي عنوان آخر حتى لو ورد في سجل المحادثة أو طلبه المستخدم. عند عدم وجود تطابق، قولي: ما عندي معلومة عنها بكتالوج ماريا. لا تذكري أنكِ نجمة أفلام أو شخصية حقيقية؛ أنتِ مساعدة الموقع.`,
      },
      { role: "user", content: data.message },
    ];

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (res.status === 429) throw new Error("الكثير من الطلبات، حاول لاحقاً");
    if (res.status === 402) throw new Error("نفدت رصيد الذكاء الاصطناعي");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`فشل: ${t.slice(0, 150)}`);
    }
    const json = (await res.json()) as any;
    const reply: string =
      json.choices?.[0]?.message?.content?.trim() || "اعذرني، ما گدرت أرد هسه.";

    await supabaseAdmin.from("chat_messages").insert({
      anon_id: data.anon_id,
      role: "assistant",
      content: reply,
    });

    return { reply };
  });

export const getChatHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ anon_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("anon_id", data.anon_id)
      .order("created_at", { ascending: true })
      .limit(200);
    return rows ?? [];
  });

export const clearChatHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ anon_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("chat_messages").delete().eq("anon_id", data.anon_id);
    return { ok: true };
  });

// ---------- Admin: user monitoring ----------
export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [sessions, chats, blocked] = await Promise.all([
    supabaseAdmin
      .from("view_sessions")
      .select("anon_id, video_id, seconds_watched, updated_at, device")
      .order("updated_at", { ascending: false })
      .limit(2000),
    supabaseAdmin.from("chat_messages").select("anon_id, created_at"),
    supabaseAdmin.from("blocked_users").select("anon_id"),
  ]);
  const ss = sessions.data ?? [];
  const cs = chats.data ?? [];
  const blockedSet = new Set((blocked.data ?? []).map((b: any) => b.anon_id));

  const map = new Map<string, any>();
  for (const s of ss) {
    if (!map.has(s.anon_id)) {
      map.set(s.anon_id, {
        anon_id: s.anon_id,
        last_seen: s.updated_at,
        last_device: s.device,
        total_seconds: 0,
        sessions: 0,
        messages: 0,
        blocked: blockedSet.has(s.anon_id),
      });
    }
    const u = map.get(s.anon_id);
    u.total_seconds += s.seconds_watched || 0;
    u.sessions += 1;
    if (new Date(s.updated_at).getTime() > new Date(u.last_seen).getTime()) {
      u.last_seen = s.updated_at;
      u.last_device = s.device;
    }
  }
  for (const c of cs) {
    if (!map.has(c.anon_id)) {
      map.set(c.anon_id, {
        anon_id: c.anon_id,
        last_seen: c.created_at,
        last_device: null,
        total_seconds: 0,
        sessions: 0,
        messages: 0,
        blocked: blockedSet.has(c.anon_id),
      });
    }
    map.get(c.anon_id).messages += 1;
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime(),
  );
});

export const getUserDetail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ anon_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [sessions, messages] = await Promise.all([
      supabaseAdmin
        .from("view_sessions")
        .select("video_id, seconds_watched, started_at, updated_at, completed, device")
        .eq("anon_id", data.anon_id)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("anon_id", data.anon_id)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);
    const ss = sessions.data ?? [];
    const vids = await supabaseAdmin
      .from("videos")
      .select("id, title, thumbnail_url")
      .in("id", ss.map((s: any) => s.video_id));
    const byId = new Map((vids.data ?? []).map((v: any) => [v.id, v]));
    return {
      sessions: ss.map((s: any) => ({ ...s, video: byId.get(s.video_id) })),
      messages: messages.data ?? [],
    };
  });

export const blockUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ anon_id: z.string().uuid(), block: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.block) {
      await supabaseAdmin.from("blocked_users").upsert({ anon_id: data.anon_id });
    } else {
      await supabaseAdmin.from("blocked_users").delete().eq("anon_id", data.anon_id);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ anon_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all([
      supabaseAdmin.from("chat_messages").delete().eq("anon_id", data.anon_id),
      supabaseAdmin.from("view_sessions").delete().eq("anon_id", data.anon_id),
      supabaseAdmin.from("reactions").delete().eq("anon_id", data.anon_id),
      supabaseAdmin.from("comments").delete().eq("anon_id", data.anon_id),
      supabaseAdmin.from("user_interests").delete().eq("anon_id", data.anon_id),
      supabaseAdmin.from("blocked_users").delete().eq("anon_id", data.anon_id),
    ]);
    return { ok: true };
  });
