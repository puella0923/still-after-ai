# Still After — Supabase Auth 설정

## 현재 정책: 이메일 인증 생략

회원가입 시 이메일 인증 없이 **바로 로그인**됩니다.
(Supabase `mailer_autoconfirm: true`)

비밀번호 재설정 메일만 발송됩니다.

---

## 자동 적용

```bash
npm run supabase:apply-auth
```

적용 내용:
- `mailer_autoconfirm: true` — 회원가입 즉시 계정 활성화
- Site URL: `https://stillafter.com`
- Redirect URLs (OAuth / 비밀번호 재설정)
- 비밀번호 재설정 이메일 템플릿

---

## Dashboard 수동 확인

**Authentication → Providers → Email**

- Confirm email: **OFF** (또는 autoconfirm ON 상태)

링크: https://supabase.com/dashboard/project/vqtsehnebtslppamubmj/auth/providers

---

## 기존 미인증 계정

이메일 인증 전에 가입한 유저는 Supabase Dashboard에서 수동 확인 필요:

**Authentication → Users** → 해당 유저 → **Confirm email**

---

## 템플릿 (비밀번호 재설정만 사용)

```
supabase/email-templates/reset-password.html
```
