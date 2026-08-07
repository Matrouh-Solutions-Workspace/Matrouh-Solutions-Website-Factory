import { LoginForm } from "./login-form";
import { dashboardConfig } from "@/server/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const invalid = query.error === "invalid";
  return (
    <main className="loginShell" dir="rtl">
      <LoginForm authMode={dashboardConfig.FACTORY_AUTH_MODE} invalid={invalid} next={query.next} />
    </main>
  );
}
