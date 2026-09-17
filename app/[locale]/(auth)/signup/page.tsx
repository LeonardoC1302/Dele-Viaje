import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <SignupForm />
    </main>
  );
}
