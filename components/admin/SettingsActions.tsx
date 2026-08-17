"use client";

import { closeAllTasks, setEventStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui";

export function SettingsActions({ slug }: { slug: string }) {
  return (
    <div className="mt-10 space-y-3 border-t-2 border-ink pt-6">
      <h2 className="text-xl font-black">破壞性動作</h2>
      <Button
        variant="ghost"
        onClick={async () => {
          if (confirm("確定截止全部已發布任務？")) await closeAllTasks(slug);
        }}
      >
        截止全部任務
      </Button>
      <Button
        variant="ghost"
        onClick={async () => {
          if (confirm("確定把活動改成封存？學生就不能再上傳。")) {
            await setEventStatus(slug, "archived");
          }
        }}
      >
        結束活動
      </Button>
    </div>
  );
}
