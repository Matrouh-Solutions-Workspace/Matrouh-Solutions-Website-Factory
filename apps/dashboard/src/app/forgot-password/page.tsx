import { requestPasswordResetAction } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const sent = (await searchParams).sent === "1";
  return (
    <main className="loginShell" dir="rtl">
      <form action={requestPasswordResetAction} className="panel loginCard authCard">
        <img alt="Matrouh Solutions" className="loginLogo" src="/matrouh-logo.png" />
        <p className="eyebrow">بوابة لوحة التحكم</p>
        <h1>استعادة كلمة المرور</h1>
        <p>أدخل بريدك الإلكتروني، وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.</p>
        {sent ? (
          <p className="authSuccess" role="status">
            إذا كان هذا البريد مسجلًا، أرسلنا إليه رابط استعادة كلمة المرور.
          </p>
        ) : null}
        <label htmlFor="email">البريد الإلكتروني</label>
        <input autoComplete="email" autoFocus id="email" name="email" required type="email" />
        <button type="submit">إرسال رابط الاستعادة</button>
        <a className="textLink loginRecoveryLink" href="/login">
          العودة لتسجيل الدخول
        </a>
      </form>
    </main>
  );
}
