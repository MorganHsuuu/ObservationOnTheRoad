import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdminParticipants, getAdminTeams, getPublicEvent } from "@/lib/queries";
import { teamLabel } from "@/lib/team-code";

export default async function RosterPage(props: { params: Promise<{ slug: string }> }) {
  if (!isSupabaseConfigured()) notFound();
  const { slug } = await props.params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const [teams, people] = await Promise.all([
    getAdminTeams(event.id),
    getAdminParticipants(event.id),
  ]);

  return (
    <div className="mx-auto max-w-[540px] px-4 pt-6 pb-16">
      <h1 className="text-4xl font-black">分組名單</h1>
      <p className="mt-2 mb-6 text-sm font-medium text-muted">只能查看。要換組請跟老師說。</p>
      {teams.length === 0 ? (
        <Card className="px-4 py-5">
          <p className="font-black">老師還沒開組</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const members = people
              .filter((person) => person.team_id === team.id)
              .sort((a, b) => a.student_name.localeCompare(b.student_name, "zh-Hant"));
            return (
              <Card key={team.id}>
                <div className="flex items-baseline justify-between gap-3 border-b-2 border-ink px-3.5 py-3">
                  <h2 className="text-lg font-black">{teamLabel(team)}</h2>
                  <span className="text-xs font-black text-muted">{members.length} 人</span>
                </div>
                {members.length === 0 ? (
                  <p className="px-3.5 py-4 text-sm font-medium text-muted">這組還沒有人加入</p>
                ) : (
                  <ul>
                    {members.map((person) => (
                      <li
                        key={person.id}
                        className="flex items-baseline justify-between gap-3 border-b border-[#DEDCD4] px-3.5 py-3 last:border-b-0"
                      >
                        <span className="font-black">{person.student_name}</span>
                        <span className="text-xs font-black text-muted">{person.student_id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
