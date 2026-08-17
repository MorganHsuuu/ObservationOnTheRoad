import { redirect } from "next/navigation";
import { EventForm } from "@/components/admin/EventForm";
import { isAdminAuthed } from "@/lib/auth";

export default async function NewEventPage() {
  if (!(await isAdminAuthed())) redirect("/admin");
  return (
    <div className="mx-auto max-w-[640px] px-4 pt-10 pb-8">
      <h1 className="text-4xl font-black">新增場次</h1>
      <div className="mt-6">
        <EventForm />
      </div>
    </div>
  );
}
