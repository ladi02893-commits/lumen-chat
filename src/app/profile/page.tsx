'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '@/lib/validation/schemas';
import { insforge } from '@/lib/insforge/client';
import { getOrCreateCurrentUserProfile } from '@/lib/insforge/profile';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import type { z } from 'zod';

type Form = z.infer<typeof profileSchema>;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<Form>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    (async () => {
      const { profile } = await getOrCreateCurrentUserProfile();
      if (profile) {
        reset({
          full_name: profile.full_name,
          username: profile.username,
          bio: profile.bio || '',
          status_text: profile.status_text || '',
        });
      }
      setLoading(false);
    })();
  }, [reset]);

  const onSave = async (v: Form) => {
    try {
      const { data: u } = await insforge.auth.getCurrentUser();
      if (!u?.user?.id) {
        return toast.error('You are not signed in.');
      }

      const { error } = await insforge.database
        .from('profiles')
        .update({
          full_name: v.full_name.trim(),
          username: v.username.trim().toLowerCase(),
          bio: v.bio?.trim() || null,
          status_text: v.status_text?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_user_id', u.user.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Profile updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  return (
    <main className="min-h-screen bg-background p-5 md:p-8">
      <div className="max-w-xl mx-auto">
        <Link
          href="/chats"
          className="inline-flex gap-2 text-sm text-muted items-center hover:text-ink transition"
        >
          <ArrowLeft size={16} /> Back to chats
        </Link>
        <h1 className="text-3xl font-semibold mt-6">Your profile</h1>
        <p className="text-muted text-sm mt-1">
          Customize how your friends see you across Lumen.
        </p>

        {loading ? (
          <div className="p-12 grid place-items-center">
            <Loader2 className="animate-spin text-brand" size={24} />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSave)}
            className="rounded-2xl bg-surface border border-line p-6 mt-6 space-y-4 shadow-xs"
          >
            <label className="block text-sm font-medium">
              Full name
              <input
                {...register('full_name')}
                placeholder="Ayesha Khan"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-background px-3 outline-none focus:border-brand"
              />
              {errors.full_name && (
                <span className="text-red-600 text-xs mt-1 block">
                  {errors.full_name.message}
                </span>
              )}
            </label>

            <label className="block text-sm font-medium">
              Username
              <input
                {...register('username')}
                placeholder="ayesha_k"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-background px-3 outline-none focus:border-brand"
              />
              {errors.username && (
                <span className="text-red-600 text-xs mt-1 block">
                  {errors.username.message}
                </span>
              )}
            </label>

            <label className="block text-sm font-medium">
              Bio
              <textarea
                {...register('bio')}
                rows={2}
                placeholder="A short note about you…"
                className="mt-1.5 w-full rounded-xl border border-line bg-background p-3 outline-none focus:border-brand resize-none"
              />
              {errors.bio && (
                <span className="text-red-600 text-xs mt-1 block">{errors.bio.message}</span>
              )}
            </label>

            <label className="block text-sm font-medium">
              Status message
              <input
                {...register('status_text')}
                placeholder="Available / In a meeting"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-background px-3 outline-none focus:border-brand"
              />
              {errors.status_text && (
                <span className="text-red-600 text-xs mt-1 block">
                  {errors.status_text.message}
                </span>
              )}
            </label>

            <button
              disabled={isSubmitting}
              className="h-11 rounded-xl bg-brand text-white px-6 font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mx-auto" size={18} />
              ) : (
                'Save changes'
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
