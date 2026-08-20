'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge/client';
import { getOrCreateCurrentUserProfile } from '@/lib/insforge/profile';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, Loader2, UserCheck } from 'lucide-react';
import { initials } from '@/lib/utils';

export default function Page() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    try {
      const { profile } = await getOrCreateCurrentUserProfile();
      if (!profile) {
        setLoading(false);
        return;
      }

      const { data, error } = await insforge.database
        .from('friend_requests')
        .select('*, sender:profiles!friend_requests_sender_id_fkey(full_name, username, avatar_url)')
        .eq('receiver_id', profile.id)
        .eq('status', 'pending');

      if (error) {
        // Fallback without explicit fkey if postgrest syntax differs
        const { data: fallbackData } = await insforge.database
          .from('friend_requests')
          .select('*, sender:sender_id(full_name, username, avatar_url)')
          .eq('receiver_id', profile.id)
          .eq('status', 'pending');

        setRequests(fallbackData || []);
      } else {
        setRequests(data || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const act = async (id: string, accept: boolean) => {
    const { error } = await insforge.database.rpc('respond_friend_request', {
      request_id: id,
      accept,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setRequests((x) => x.filter((r) => r.id !== id));
      toast.success(accept ? 'Friend request accepted! You can now chat.' : 'Request declined.');
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
        <h1 className="text-3xl font-semibold mt-6">Friend requests</h1>
        <p className="text-muted text-sm mt-1">
          Review connection requests from other people on Lumen.
        </p>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="p-12 grid place-items-center">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-surface border border-line">
              <UserCheck className="mx-auto text-muted mb-2" size={32} />
              <p className="text-muted text-sm">No pending friend requests.</p>
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-surface border border-line p-4 flex items-center gap-3 shadow-xs"
              >
                <span className="size-11 rounded-full bg-brand/15 text-brand grid place-items-center font-bold text-xs shrink-0">
                  {initials(r.sender?.full_name || 'User')}
                </span>
                <div className="flex-1 min-w-0">
                  <b className="truncate block">{r.sender?.full_name || 'User'}</b>
                  <p className="text-sm text-muted truncate">
                    @{r.sender?.username || 'user'} wants to connect
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => act(r.id, false)}
                    className="p-2.5 rounded-xl border border-line hover:bg-background text-muted hover:text-ink transition"
                    title="Decline"
                    aria-label="Decline"
                  >
                    <X size={17} />
                  </button>
                  <button
                    onClick={() => act(r.id, true)}
                    className="p-2.5 rounded-xl bg-brand text-white hover:opacity-90 transition"
                    title="Accept"
                    aria-label="Accept"
                  >
                    <Check size={17} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
