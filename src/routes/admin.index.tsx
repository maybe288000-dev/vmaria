import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAdminSettings, syncDriveFolder } from "@/lib/video.functions";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

const DEFAULT_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1opTNzcGHQ5lMbNWMv-PLAw83aA0He6i-?usp=sharing";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => getAdminSettings() });
  const [url, setUrl] = useState(DEFAULT_DRIVE_FOLDER_URL);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.data?.settings?.drive_folder_url) setUrl(q.data.settings.drive_folder_url);
  }, [q.data]);

  const sync = async () => {
    if (!url.trim()) return toast.error("أدخل رابط المجلد");
    setBusy(true);
    try {
      const r = await syncDriveFolder({ data: { folder_url: url.trim() } });
      toast.success(`تمت المزامنة: ${r.synced} من ${r.total_files} ملف`);
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold mb-2">مصدر الفيديوهات</h2>
        <p className="text-sm text-muted-foreground mb-4">
          الصق رابط مجلد Google Drive يحتوي على الفيديوهات. تأكد أن المجلد متاح بصلاحية «أي شخص لديه
          الرابط».
        </p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm mb-3"
          dir="ltr"
        />
        <button
          onClick={sync}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          {busy ? "جارٍ المزامنة..." : "مزامنة الآن"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="إجمالي الفيديوهات" value={q.data?.videos_count ?? 0} />
        <Stat label="إجمالي اللقطات" value={q.data?.clips_count ?? 0} />
      </div>
      {q.data?.settings?.last_synced_at && (
        <p className="text-xs text-muted-foreground text-center">
          آخر مزامنة: {new Date(q.data.settings.last_synced_at).toLocaleString("ar")}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
