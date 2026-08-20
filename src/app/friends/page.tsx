'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge/client';
import { getOrCreateCurrentUserProfile } from '@/lib/insforge/profile';
import type { Profile } from '@/types/chat';
import { toast } from 'sonner';
import { ArrowLeft, Search, UserPlus, Loader2 } from 'lucide-react';
import { initials } from '@/lib/utils';

export default function Page() {
  const [term, setTerm] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { profile } = await getOrCreateCurrentUserProfile();
      if (profile) setMe(profile);
    })();
  }, []);

  useEffect(() => {
    if (term.trim().length < 2) {
      setUsers([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const { data, error } = await insforge.database
          .from('profiles')
          .select('*')
          .ilike('username', `%${term.trim()}%`)
          .limit(20);

        if (error) {
          toast.error(error.message);
          setUsers([]);
        } else {
          // Filter out myself
          const results = (data || []).filter((u: any) => u.id !== me?.id) as Profile[];
          setUsers(results);
        }
      } catch (err: any) {
        toast.error(err.message || 'Search failed');
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [term, me]);

  const sendRequest = async (userId: string) => {
    setSendingMap((prev) => ({ ...prev, [userId]: true }));
    try {
      const { error } = await insforge.database.rpc('send_friend_request', {
        receiver: userId,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Friend request sent!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send friend request');
    } finally {
      setSendingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <main className="min-h-screen bg-background p-5 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/chats"
          className="inline-flex gap-2 text-sm text-muted items-center hover:text-ink transition"
        >
          <ArrowLeft size={16} /> Back to chats
        </Link>
        <h1 className="text-3xl font-semibold mt-6">Find your people</h1>
        <p className="text-muted text-sm mt-1">
          Search by username. Once they accept your friend request, you can chat privately.
        </p>

        <label className="mt-6 h-12 rounded-xl bg-surface border border-line px-3.5 flex items-center gap-2.5 shadow-xs focus-within:border-brand">
          <Search size={18} className="text-muted" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by username (e.g. alex)"
            className="w-full bg-transparent outline-none text-sm placeholder:text-muted"
          />
          {searching && <Loader2 size={16} className="animate-spin text-muted" />}
        </label>

        <div className="mt-5 space-y-2.5">
          {term.trim().length >= 2 && users.length === 0 && !searching && (
            <p className="text-center text-sm text-muted py-8">No users found matching &quot;{term}&quot;.</p>
          )}

          {users.map((u) => (
            <article
              key={u.id}
              className="rounded-2xl bg-surface border border-line p-4 flex gap-3.5 items-center shadow-xs"
            >
              <span className="size-11 rounded-full bg-brand/15 text-brand grid place-items-center font-bold text-xs shrink-0">
                {initials(u.full_name || 'User')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{u.full_name}</p>
                <p className="text-xs text-muted truncate">
                  @{u.username}
                  {u.bio ? ` · ${u.bio}` : ''}
                </p>
              </div>
              <button
                disabled={sendingMap[u.id]}
                onClick={() => sendRequest(u.id)}
                className="rounded-xl border border-line p-2.5 text-brand hover:bg-brand hover:text-white transition disabled:opacity-50"
                title="Add friend"
                aria-label="Add friend"
              >
                {sendingMap[u.id] ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <UserPlus size={18} />
                )}
              </button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
