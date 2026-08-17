import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { isAdminAuthed } from "@/lib/auth";

export default async function AdminPage() {
  if (await isAdminAuthed()) redirect("/admin/events");
  return <AdminLogin />;
}
