'use client';

import React, { useState } from 'react';
import { Clock, ShieldAlert, Trash2, X, Check, Flame } from 'lucide-react';
import { insforge } from '@/lib/insforge/client';
import { toast } from 'sonner';

interface Props {
  conversationId: string;
  currentMode: string;
  currentSeconds: number | null;
  onClose: () => void;
  onUpdated: (mode: string, secs: number | null) => void;
  onClearChat: () => void;
}

const MODES = [
  {
    id: 'never',
    title: 'Never (Default)',
    desc: 'Keep message history permanently.',
    badge: 'Standard',
  },
  {
    id: '24h',
    title: '24 Hours',
    desc: 'Messages automatically expire after 1 day.',
    badge: '24h',
  },
  {
    id: '12h',
    title: '12 Hours',
    desc: 'Messages automatically expire after half a day.',
    badge: '12h',
  },
  {
    id: '3h',
    title: '3 Hours',
    desc: 'Messages automatically expire after 3 hours.',
    badge: '3h',
  },
  {
    id: '5m_after_view',
    title: '5 Minutes after view',
    desc: 'Starts countdown once the recipient reads the message.',
    badge: '5m View',
  },
  {
    id: 'instant_after_view',
    title: 'Burn after reading (Instant)',
    desc: 'Message disappears seconds after being viewed.',
    badge: '🔥 Instant',
  },
  {
    id: 'custom',
    title: 'Custom timer',
    desc: 'Set your own custom expiration time.',
    badge: 'Custom',
  },
];

export function AutoDeleteModal({
  conversationId,
  currentMode,
  currentSeconds,
  onClose,
  onUpdated,
  onClearChat,
}: Props) {
  const [selectedMode, setSelectedMode] = useState(currentMode || 'never');
  const [customMinutes, setCustomMinutes] = useState(
    currentSeconds ? Math.max(1, Math.round(currentSeconds / 60)) : 30
  );
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const secs = selectedMode === 'custom' ? customMinutes * 60 : null;
      const { error } = await insforge.database.rpc('set_conversation_auto_delete', {
        c: conversationId,
        mode: selectedMode,
        secs: secs,
      });

      if (error) throw error;

      onUpdated(selectedMode, secs);
      toast.success('Disappearing message settings updated!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update auto-delete settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear your chat history for this conversation?')) return;
    setClearing(true);
    try {
      const { error } = await insforge.database.rpc('clear_conversation', {
        c: conversationId,
      });

      if (error) throw error;

      toast.success('Chat history cleared!');
      onClearChat();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear chat');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-brand/15 text-brand">
              <Clock size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-lg">Disappearing Messages</h2>
              <p className="text-xs text-muted">Auto-delete messages after a specified time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted hover:text-ink hover:bg-background transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {MODES.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMode(m.id)}
                className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 ${
                  isSelected
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-line/70 hover:border-line hover:bg-background text-muted'
                }`}
              >
                <div
                  className={`size-5 rounded-full border grid place-items-center shrink-0 ${
                    isSelected ? 'border-brand bg-brand text-white' : 'border-line'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-ink">{m.title}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-line text-muted">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Minutes Input */}
        {selectedMode === 'custom' && (
          <div className="p-4 rounded-2xl bg-background border border-line space-y-2">
            <label className="text-xs font-medium text-muted block">Custom Expiration (Minutes):</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={10080}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value)))}
                className="w-full h-10 px-3 bg-surface rounded-xl border border-line outline-none text-sm focus:border-brand"
              />
              <span className="text-xs text-muted shrink-0">min ({Math.round((customMinutes / 60) * 10) / 10}h)</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-line flex flex-col gap-2">
          <button
            disabled={saving}
            onClick={handleSave}
            className="h-11 w-full rounded-xl bg-brand text-white font-medium hover:bg-brand-light transition shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving changes…' : 'Apply settings'}
          </button>

          <button
            disabled={clearing}
            onClick={handleClear}
            className="h-10 w-full rounded-xl border border-danger/40 text-danger hover:bg-danger/10 text-xs font-medium flex items-center justify-center gap-2 transition"
          >
            <Trash2 size={15} /> Clear conversation history for me
          </button>
        </div>
      </div>
    </div>
  );
}
