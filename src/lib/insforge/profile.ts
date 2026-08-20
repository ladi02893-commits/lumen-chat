import { insforge } from './client';
import type { Profile } from '@/types/chat';

export async function getOrCreateCurrentUserProfile(initialData?: {
  fullName?: string;
  username?: string;
}): Promise<{ profile: Profile | null; error: Error | null }> {
  try {
    const { data: userData, error: userError } = await insforge.auth.getCurrentUser();
    if (userError || !userData?.user) {
      return { profile: null, error: userError || new Error('No authenticated user') };
    }

    const user = userData.user;

    // 1. Try to fetch existing profile
    const { data: existing, error: selectError } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (existing) {
      return { profile: existing as Profile, error: null };
    }

    // 2. Build default values
    const email = user.email || '';
    const emailPrefix = email.split('@')[0] || 'user';
    const cleanPrefix = emailPrefix.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 18);
    const validPrefix = cleanPrefix.length < 3 ? (cleanPrefix + '_usr').slice(0, 20) : cleanPrefix;

    const chosenUsername = initialData?.username?.trim()
      ? initialData.username.trim().toLowerCase()
      : `${validPrefix}_${Math.floor(100 + Math.random() * 900)}`;

    const chosenFullName = initialData?.fullName?.trim()
      ? initialData.fullName.trim()
      : ((user.profile as any)?.name || emailPrefix || 'User');

    // 3. Insert new profile
    const { data: inserted, error: insertError } = await insforge.database
      .from('profiles')
      .insert([
        {
          auth_user_id: user.id,
          full_name: chosenFullName.slice(0, 80),
          username: chosenUsername.slice(0, 24),
          email: email,
          avatar_url: (user.profile as any)?.avatar_url || null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      // If username collision happened, retry with random suffix
      if (insertError.message?.includes('username') || insertError.message?.includes('unique')) {
        const fallbackUsername = `${validPrefix}_${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: retryInserted, error: retryError } = await insforge.database
          .from('profiles')
          .insert([
            {
              auth_user_id: user.id,
              full_name: chosenFullName.slice(0, 80),
              username: fallbackUsername.slice(0, 24),
              email: email,
              avatar_url: (user.profile as any)?.avatar_url || null,
            },
          ])
          .select()
          .single();

        if (retryError) throw retryError;
        if (retryInserted) {
          await insforge.database.from('user_settings').insert([{ user_id: retryInserted.id }]);
          return { profile: retryInserted as Profile, error: null };
        }
      }
      throw insertError;
    }

    if (inserted) {
      await insforge.database.from('user_settings').insert([{ user_id: inserted.id }]);
      return { profile: inserted as Profile, error: null };
    }

    return { profile: null, error: new Error('Failed to create profile') };
  } catch (err: any) {
    return { profile: null, error: err };
  }
}
