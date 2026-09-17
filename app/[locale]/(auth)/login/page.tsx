import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <LoginForm />
    </main>
  );
}
