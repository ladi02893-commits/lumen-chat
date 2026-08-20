'use client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema } from '@/lib/validation/schemas';
import { insforge, isInsForgeConfigured } from '@/lib/insforge/client';
import { getOrCreateCurrentUserProfile } from '@/lib/insforge/profile';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

type Props = { mode: 'login' | 'register' };
type Form = z.infer<typeof registerSchema>;

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const schema = mode === 'login' ? loginSchema : registerSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema as any) });

  const submit = async (v: Form) => {
    if (!isInsForgeConfigured) {
      return toast.error('Add your InsForge project URL to .env.local first.');
    }

    if (mode === 'login') {
      const r = await insforge.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });
      if (r.error) return toast.error(r.error.message);

      // Ensure profile exists
      await getOrCreateCurrentUserProfile();
      toast.success('Welcome back!');
      router.push('/chats');
    } else {
      // Register mode
      const r = await insforge.auth.signUp({
        email: v.email,
        password: v.password,
        name: v.fullName,
        redirectTo: `${location.origin}/login`,
      });

      if (r.error) {
        return toast.error(r.error.message);
      }

      // Try automatic sign in
      const signInRes = await insforge.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });

      if (!signInRes.error) {
        const { error: profErr } = await getOrCreateCurrentUserProfile({
          fullName: v.fullName,
          username: v.username,
        });

        if (profErr) {
          console.warn('Profile init warning:', profErr);
        }

        toast.success('Account created successfully!');
        router.push('/chats');
        return;
      }

      toast.success('Account created! Please check your email or sign in.');
      router.push('/login');
    }
  };

  const google = async () => {
    if (!isInsForgeConfigured) return toast.error('InsForge is not configured.');
    const { error } = await insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: `${location.origin}/chats`,
    });
    if (error) toast.error(error.message);
  };

  const label = mode === 'login' ? 'Welcome back' : 'Create your account';

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex p-14 flex-col justify-between bg-[#26205e] text-white">
        <div className="flex gap-2 items-center font-bold text-xl">
          <span className="grid size-9 place-items-center rounded-xl bg-white text-[#635bff]">
            <Sparkles size={19} />
          </span>
          Lumen
        </div>
        <div>
          <p className="text-sm uppercase tracking-[.2em] text-indigo-200">Private by design</p>
          <h1 className="text-5xl leading-tight font-semibold mt-4">
            Conversations that feel close, without feeling exposed.
          </h1>
        </div>
        <p className="text-indigo-200">Friend-first messages. Built for calm.</p>
      </section>

      <section className="grid place-items-center p-6">
        <form onSubmit={handleSubmit(submit)} className="w-full max-w-md space-y-5">
          <div>
            <div className="lg:hidden flex gap-2 items-center font-bold text-xl mb-10">
              <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
                <Sparkles size={19} />
              </span>
              Lumen
            </div>
            <h2 className="text-3xl font-semibold">{label}</h2>
            <p className="text-muted mt-2">
              {mode === 'login'
                ? 'Sign in to your private space.'
                : 'A calmer way to stay in touch.'}
            </p>
          </div>

          {mode === 'register' && (
            <Field label="Full name" error={errors.fullName?.message}>
              <input {...register('fullName')} placeholder="Ayesha Khan" />
            </Field>
          )}

          {mode === 'register' && (
            <Field label="Username" error={errors.username?.message}>
              <input {...register('username')} placeholder="ayesha_k" />
            </Field>
          )}

          <Field label="Email" error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>

          {mode === 'login' && (
            <Link className="text-sm text-brand hover:underline" href="/forgot-password">
              Forgot password?
            </Link>
          )}

          <button
            disabled={isSubmitting}
            className="focus-ring h-11 w-full rounded-xl bg-brand text-white font-medium hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : mode === 'login' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>

          <div className="flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            OR
          </div>

          <button
            type="button"
            onClick={google}
            className="focus-ring h-11 w-full rounded-xl border border-line font-medium hover:bg-black/5"
          >
            Continue with Google
          </button>

          <p className="text-center text-sm text-muted">
            {mode === 'login' ? (
              <>
                New to Lumen?{' '}
                <Link className="text-brand font-medium" href="/register">
                  Create account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link className="text-brand font-medium" href="/login">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="mt-1.5 block [&_input]:w-full [&_input]:h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-line [&_input]:bg-surface [&_input]:px-3 [&_input]:outline-none [&_input:focus]:border-brand">
        {children}
      </span>
      {error && <span className="text-red-600 text-xs mt-1 block">{error}</span>}
    </label>
  );
}
