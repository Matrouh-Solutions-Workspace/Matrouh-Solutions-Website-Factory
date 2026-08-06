import { LoginForm } from "./login-form";
import { dashboardConfig } from "@/server/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const invalid = (await searchParams).error === "invalid";
  return (
    <main className="loginShell" dir="rtl">
      <LoginForm authMode={dashboardConfig.FACTORY_AUTH_MODE} invalid={invalid} />
    </main>
  );
}
