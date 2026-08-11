"use server";

import { redirect } from "next/navigation";
import { createPasswordReset } from "@/server/password-resets";

export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase().slice(0, 320) : "";
  if (email) await createPasswordReset(email);
  redirect("/forgot-password?sent=1");
}
