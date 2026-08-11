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
  const activeReset = await findActivePasswordReset(token);
  const error = (await searchParams).error;
  if (!activeReset) {
    return (
      <main className="loginShell" dir="rtl">
        <section className="panel loginCard authCard">
          <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
          <p className="eyebrow">بوابة لوحة التحكم</p>
          <h1>رابط الاستعادة غير صالح</h1>
          <p>
            انتهت صلاحية الرابط أو تم استبداله بطلب أحدث. اطلب رابطًا جديدًا، ثم افتح الرابط الكامل
            من أحدث رسالة تصلك.
          </p>
          <a className="textLink loginRecoveryLink" href="/forgot-password">
            طلب رابط استعادة جديد
          </a>
        </section>
      </main>
    );
  }
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
