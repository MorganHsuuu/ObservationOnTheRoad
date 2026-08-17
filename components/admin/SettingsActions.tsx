"use client";

import { useState } from "react";
import { closeAllTasks, setEventFlag, setEventStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui";
import type { EventRow } from "@/lib/types";

export function SettingsActions({ event }: { event: EventRow }) {
  const [showOn, setShowOn] = useState(event.show_public);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggleShow(value: boolean) {
    setBusy(true);
    setError("");
    const result = await setEventFlag(event.slug, "show_public", value);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowOn(value);
  }

  return (
    <div className="mt-10 space-y-8">
      <section className="space-y-3 border-t-2 border-ink pt-6">
        <h2 className="text-xl font-black">展覽</h2>
        <p className="text-sm font-medium text-muted">
          成果牆一直開著。展覽是最後投影用的，要開再開。
        </p>
        {error ? <p className="bg-danger px-3 py-2 text-sm font-black text-white">{error}</p> : null}
        <Button
          variant={showOn ? "yellow" : "ghost"}
          disabled={busy}
          onClick={() => void toggleShow(!showOn)}
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
