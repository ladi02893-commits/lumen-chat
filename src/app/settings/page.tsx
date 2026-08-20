'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge/client';
import { getOrCreateCurrentUserProfile } from '@/lib/insforge/profile';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Shield,
  Clock,
  Eye,
  LogOut,
  Sparkles,
  Smartphone,
  Check,
} from 'lucide-react';

export default function Page() {
  const [showPresence, setShowPresence] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { profile } = await getOrCreateCurrentUserProfile();
      if (profile) {
        const { data } = await insforge.database
          .from('user_settings')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (data) {
          setShowPresence(data.show_presence ?? true);
          setShowLastSeen(data.show_last_seen ?? true);
        }
      }
    })();
  }, []);

  const updateSetting = async (key: 'show_presence' | 'show_last_seen', value: boolean) => {
    try {
      const { profile } = await getOrCreateCurrentUserProfile();
      if (!profile) return;

      if (key === 'show_presence') setShowPresence(value);
      if (key === 'show_last_seen') setShowLastSeen(value);

      const { error } = await insforge.database
        .from('user_settings')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', profile.id);

      if (error) throw error;
      toast.success('Settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update setting');
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href="/chats"
          className="inline-flex gap-2 text-sm text-muted items-center hover:text-ink transition"
        >
          <ArrowLeft size={16} /> Back to chats
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-ink">Settings</h1>
          <p className="text-muted text-sm mt-1">Manage your privacy and experience on Lumen.</p>
        </div>

        {/* Privacy & Presence */}
        <section className="rounded-3xl bg-surface border border-line p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 text-brand font-semibold text-sm border-b border-line/60 pb-3">
            <Shield size={18} />
            <span>Privacy & Presence</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm text-ink">Show Online Presence</p>
              <p className="text-xs text-muted">Allow friends to see when you are active</p>
            </div>
            <button
              onClick={() => updateSetting('show_presence', !showPresence)}
              className={`size-6 rounded-lg border grid place-items-center transition ${
                showPresence ? 'bg-brand border-brand text-white' : 'border-line bg-background'
              }`}
            >
              {showPresence && <Check size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-line/40">
            <div>
              <p className="font-medium text-sm text-ink">Show Last Seen</p>
              <p className="text-xs text-muted">Display your last active timestamp to friends</p>
            </div>
            <button
              onClick={() => updateSetting('show_last_seen', !showLastSeen)}
              className={`size-6 rounded-lg border grid place-items-center transition ${
                showLastSeen ? 'bg-brand border-brand text-white' : 'border-line bg-background'
              }`}
            >
              {showLastSeen && <Check size={14} />}
            </button>
          </div>
        </section>

        {/* Mobile & Media features */}
        <section className="rounded-3xl bg-surface border border-line p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-brand font-semibold text-sm border-b border-line/60 pb-3">
            <Smartphone size={18} />
            <span>Mobile & Rich Messaging</span>
          </div>

          <div className="text-xs text-muted space-y-2 leading-relaxed">
            <p>• <b>Voice Notes:</b> Record high-fidelity audio messages with live waveform preview.</p>
            <p>• <b>Media Sharing:</b> Share photos, high-definition videos, and documents.</p>
            <p>• <b>Auto-Delete Timers:</b> Set 24h, 12h, 3h, 5m after view, or instant disappearing messages inside any chat.</p>
            <p>• <b>Live Location:</b> Share GPS coordinates directly linked with OpenStreetMap.</p>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={async () => {
            await insforge.auth.signOut();
            location.assign('/login');
          }}
          className="w-full h-12 rounded-2xl border border-danger/40 text-danger hover:bg-danger/10 font-semibold text-sm flex items-center justify-center gap-2 transition"
        >
          <LogOut size={17} /> Sign out from Lumen
        </button>
      </div>
    </main>
  );
}
