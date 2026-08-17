"use client";

import { useState } from "react";
import { closeAllTasks, setEventFlag, setEventStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui";
import type { EventRow } from "@/lib/types";

export function SettingsActions({ event }: { event: EventRow }) {
  const [galleryOn, setGalleryOn] = useState(event.gallery_public);
  const [showOn, setShowOn] = useState(event.show_public);
  const [busy, setBusy] = useState<"gallery" | "show" | null>(null);
  const [error, setError] = useState("");

  async function toggle(flag: "gallery_public" | "show_public", value: boolean) {
    setBusy(flag === "gallery_public" ? "gallery" : "show");
    setError("");
    const result = await setEventFlag(event.slug, flag, value);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (flag === "gallery_public") setGalleryOn(value);
    else setShowOn(value);
  }

  return (
    <div className="mt-10 space-y-8">
      <section className="space-y-3 border-t-2 border-ink pt-6">
        <h2 className="text-xl font-black">學生看得到什麼</h2>
        <p className="text-sm font-medium text-muted">
          成果牆給現場看大家拍了什麼。展覽是最後投影用的。
        </p>
        {error ? <p className="bg-danger px-3 py-2 text-sm font-black text-white">{error}</p> : null}
        <Button
          variant={galleryOn ? "yellow" : "ghost"}
          disabled={busy === "gallery"}
          onClick={() => void toggle("gallery_public", !galleryOn)}
        >
          {galleryOn ? "成果牆：開放中" : "成果牆：關閉中"}
        </Button>
        <Button
          variant={showOn ? "yellow" : "ghost"}
          disabled={busy === "show"}
          onClick={() => void toggle("show_public", !showOn)}
        >
          {showOn ? "展覽：開放中" : "展覽：關閉中"}
        </Button>
      </section>

      <section className="space-y-3 border-t-2 border-ink pt-6">
        <h2 className="text-xl font-black">破壞性動作</h2>
        <Button
          variant="ghost"
          onClick={async () => {
            if (confirm("確定截止全部已發布任務？")) await closeAllTasks(event.slug);
          }}
        >
          截止全部任務
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (confirm("確定把活動改成封存？學生就不能再上傳。")) {
              await setEventStatus(event.slug, "archived");
            }
          }}
        >
          結束活動
        </Button>
      </section>
    </div>
  );
}
