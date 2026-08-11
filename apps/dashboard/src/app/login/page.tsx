import { LoginForm } from "./login-form";
import { dashboardConfig } from "@/server/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; reset?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className="loginShell" dir="rtl">
      <LoginForm
        authMode={dashboardConfig.FACTORY_AUTH_MODE}
        reset={query.reset === "1"}
        {...(query.error ? { error: query.error } : {})}
        {...(query.next ? { next: query.next } : {})}
      />
    </main>
  );
}
