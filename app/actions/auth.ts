"use server";

import { redirect } from "next/navigation";
import {
  clearAdminCookie,
  setAdminCookie,
  verifyAdminPassword,
} from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function loginAdmin(password: string): Promise<ActionResult> {
  if (!process.env.ADMIN_PASSWORD) {
    return { ok: false, error: "伺服器尚未設定管理密碼" };
  }
  if (!verifyAdminPassword(password)) {
    return { ok: false, error: "密碼不對，再試一次" };
  }
  await setAdminCookie();
  return { ok: true, data: undefined };
}

export async function logoutAdmin() {
  await clearAdminCookie();
  redirect("/admin");
}
