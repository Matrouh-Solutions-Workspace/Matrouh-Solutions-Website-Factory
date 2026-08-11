import { notFound } from "next/navigation";
import { findActivePasswordReset } from "@/server/password-resets";
import { resetPasswordAction } from "./actions";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  if (!(await findActivePasswordReset(token))) notFound();
  const error = (await searchParams).error;
  return (
    <main className="loginShell" dir="rtl">
      <form action={resetPasswordAction} className="panel loginCard authCard">
        <input name="token" type="hidden" value={token} />
        <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
        <p className="eyebrow">بوابة لوحة التحكم</p>
        <h1>كلمة مرور جديدة</h1>
        <p>اختر كلمة مرور لا تقل عن 10 أحرف لحماية حسابك.</p>
        {error ? (
          <p role="alert">
            {error === "password"
              ? "كلمتا المرور غير متطابقتين أو قصيرتان جدًا."
              : "تعذر تحديث كلمة المرور. اطلب رابطًا جديدًا وحاول مرة أخرى."}
          </p>
        ) : null}
        <label htmlFor="password">كلمة المرور الجديدة</label>
        <input
          autoComplete="new-password"
          id="password"
          minLength={10}
          name="password"
          required
          type="password"
        />
        <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
        <input
          autoComplete="new-password"
          id="confirmPassword"
          minLength={10}
          name="confirmPassword"
          required
          type="password"
        />
        <button type="submit">حفظ كلمة المرور</button>
      </form>
    </main>
  );
}
