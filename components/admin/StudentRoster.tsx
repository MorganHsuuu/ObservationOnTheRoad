"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminRoom } from "@/app/actions/admin";
import { Card } from "@/components/ui";
import { isStudentOnline } from "@/lib/broadcast";
import { liveTaskCode, shortTaskTitle } from "@/lib/task-utils";
import { teamLabel } from "@/lib/team-code";
import type { ParticipantRow, SubmissionWithMeta, TaskRow, TeamRow } from "@/lib/types";

export function StudentRoster({
  slug,
  eventId,
  teams,
  tasks,
  submissions,
  refreshToken,
}: {
  slug: string;
  eventId: string;
  teams: TeamRow[];
  tasks: TaskRow[];
  submissions: SubmissionWithMeta[];
  refreshToken?: string;
}) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<ParticipantRow[]>([]);

  const load = useCallback(async () => {
    const result = await getAdminRoom(slug);
    if (!result.ok) return;
    setPeople(result.data.participants);
  }, [slug]);

  useEffect(() => {
    const start = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), 20000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(poll);
    };
  }, [eventId, load, refreshToken]);

  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const released = useMemo(
    () => tasks.filter((task) => task.status === "published" || task.status === "closed"),
    [tasks],
  );
  const doneByStudent = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of submissions) {
      if (!item.student_id) continue;
      const set = map.get(item.student_id) ?? new Set<string>();
      set.add(item.task_id);
      map.set(item.student_id, set);
    }
    return map;
  }, [submissions]);

  const rows = useMemo(
    () =>
      [...people].sort((a, b) => {
        const aOn = Number(isStudentOnline(a.last_seen_at));
        const bOn = Number(isStudentOnline(b.last_seen_at));
        if (bOn !== aOn) return bOn - aOn;
        const aTeam = teamMap.get(a.team_id)?.code ?? "";
        const bTeam = teamMap.get(b.team_id)?.code ?? "";
        if (aTeam !== bTeam) return aTeam.localeCompare(bTeam);
        return a.student_name.localeCompare(b.student_name, "zh-Hant");
      }),
    [people, teamMap],
  );

  const onlineCount = rows.filter((item) => isStudentOnline(item.last_seen_at)).length;

  return (
    <Card className="mt-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-[13px] font-black tracking-[0.2em] text-muted">學生</span>
        <span className="text-[13px] font-black">
          在線 {onlineCount} / {rows.length}
          <span className="ml-2 text-muted">{open ? "收合" : "展開"}</span>
        </span>
      </button>
      {open ? (
        rows.length === 0 ? (
          <p className="border-t-2 border-ink px-4 py-5 text-sm font-medium text-muted">
            學生加入組別後會出現在這裡。
          </p>
        ) : (
          <div className="border-t-2 border-ink">
            <div className="flex gap-3 border-b-2 border-ink px-3.5 py-2 text-[11px] font-black tracking-[0.2em] text-muted">
              <span className="w-2.5 shrink-0" />
              <span className="w-[4.5rem] shrink-0">組別</span>
              <span className="flex-1">學生</span>
            </div>
            {rows.map((person) => {
              const team = teamMap.get(person.team_id);
              const done = doneByStudent.get(person.student_id) ?? new Set<string>();
              const online = isStudentOnline(person.last_seen_at);
              return (
                <div key={person.id} className="flex items-start gap-3 border-b-2 border-ink px-3.5 py-3 last:border-b-0">
                  <span
                    className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                      online ? "bg-[#1B8A3A]" : "bg-[#DEDCD4]"
                    }`}
                    title={online ? "在線" : "離線"}
                  />
                  <span className="w-[4.5rem] shrink-0 pt-0.5 text-xs font-black">{teamLabel(team)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-black">{person.student_name}</span>
                      <span className="text-xs font-black text-muted">{person.student_id}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {released.length === 0 ? (
                        <span className="text-xs font-medium text-muted">還沒有發布任務</span>
                      ) : (
                        released.map((task) => {
                          const got = done.has(task.id);
                          return (
                            <span
                              key={task.id}
                              className={`border-2 border-ink px-1.5 py-0.5 text-[11px] font-black ${
                                got ? "bg-ink text-paper" : "bg-card text-muted"
                              }`}
                              title={shortTaskTitle(task.title)}
                            >
                              {liveTaskCode(task.id, tasks)}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}
    </Card>
  );
}
