'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge/client';
import { getOrCreateCurrentUserProfile } from '@/lib/insforge/profile';
import { useVault } from '@/components/stealth/VaultContext';
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
  KeyRound,
  Dices,
  Lock,
} from 'lucide-react';

export default function Page() {
  const [showPresence, setShowPresence] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [saving, setSaving] = useState(false);

  // Stealth Vault settings from context
  const {
    vaultPin,
    updatePin,
    autoLockMinutes,
    setAutoLockMinutes,
    lockOnTabLeave,
    setLockOnTabLeave,
    lockVault,
  } = useVault();

  const [newPin, setNewPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

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

  const handleSavePin = () => {
    if (!newPin.trim()) {
      toast.error('Please enter a PIN');
      return;
    }
    const success = updatePin(newPin);
    if (success) {
      setNewPin('');
      setIsChangingPin(false);
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
          <h1 className="text-3xl font-bold text-ink">Settings & Privacy</h1>
          <p className="text-muted text-sm mt-1">
            Manage your stealth game disguise, secret PIN, and privacy controls.
          </p>
        </div>

        {/* 🎲 Stealth & Vault Security (Ghost Mode) */}
        <section className="rounded-3xl bg-surface border border-line p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-line/60 pb-3">
            <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
              <Dices size={18} />
              <span>Ghost Mode (Ludo Game Disguise)</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 font-medium">
              Active Disguise
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Your chat is fully disguised as an authentic Ludo Game. Unlock it using your secret PIN
            in the &quot;Private Room&quot; popup or by tapping the center star 5 times.
          </p>

          {/* Change PIN Box */}
          <div className="p-3.5 rounded-2xl bg-background border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-ink flex items-center gap-1.5">
                  <KeyRound size={14} className="text-brand" /> Secret Vault PIN
                </p>
                <p className="text-[11px] text-muted">
                  Current PIN:{' '}
                  <span className="font-mono text-ink font-semibold">
                    {vaultPin.replace(/./g, '•')}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingPin((prev) => !prev)}
                className="px-3 py-1 rounded-xl bg-surface border border-line text-xs text-ink hover:text-brand transition font-medium"
              >
                {isChangingPin ? 'Cancel' : 'Change PIN'}
              </button>
            </div>

            {isChangingPin && (
              <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                <input
                  type="password"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="New 4-8 digit PIN"
                  className="flex-1 bg-surface border border-line rounded-xl px-3 py-1.5 text-xs text-ink placeholder:text-muted outline-none focus:border-brand font-mono"
                />
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-light transition"
                >
                  Save PIN
                </button>
              </div>
            )}
          </div>

          {/* Auto Lock Timer */}
          <div className="flex items-center justify-between py-2 border-t border-line/40">
            <div>
              <p className="font-medium text-sm text-ink flex items-center gap-1.5">
                <Clock size={15} className="text-muted" /> Auto-Lock on Inactivity
              </p>
              <p className="text-xs text-muted">Automatically returns to Ludo game when idle</p>
            </div>
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="bg-background border border-line rounded-xl px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand"
            >
              <option value={1}>1 minute</option>
              <option value={3}>3 minutes</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={0}>Disabled</option>
            </select>
          </div>

          {/* Lock on tab leave */}
          <div className="flex items-center justify-between py-2 border-t border-line/40">
            <div>
              <p className="font-medium text-sm text-ink">Lock when leaving browser tab</p>
              <p className="text-xs text-muted">Instantly cloaks if you switch apps or minimize</p>
            </div>
            <button
              onClick={() => setLockOnTabLeave(!lockOnTabLeave)}
              className={`size-6 rounded-lg border grid place-items-center transition ${
                lockOnTabLeave ? 'bg-brand border-brand text-white' : 'border-line bg-background'
              }`}
            >
              {lockOnTabLeave && <Check size={14} />}
            </button>
          </div>

          {/* Panic Lock Button */}
          <button
            type="button"
            onClick={lockVault}
            className="w-full h-11 rounded-2xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Lock size={15} />
            <span>Test Panic Lock (Switch to Ludo Game Now)</span>
          </button>
        </section>

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
            <span>Rich Messaging Features</span>
          </div>

          <div className="text-xs text-muted space-y-2 leading-relaxed">
            <p>• <b>Voice Notes:</b> High-fidelity audio messages with waveform preview.</p>
            <p>• <b>Media Sharing:</b> Photos, HD videos, and documents.</p>
            <p>• <b>Disappearing Messages:</b> 24h, 12h, 3h, 5m after view, or instant burn.</p>
            <p>• <b>Live Location:</b> GPS coordinates linked with OpenStreetMap.</p>
            <p>• <b>Panic Hotkey:</b> Double tap <b>Escape</b> at any time to instantly lock to Ludo Game.</p>
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
