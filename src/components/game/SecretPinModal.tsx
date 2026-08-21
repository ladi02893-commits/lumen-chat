'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '@/components/stealth/VaultContext';
import { ludoAudio } from './LudoSoundEffects';
import { ludoOnline } from './ludoOnline';
import {
  KeyRound,
  Dices,
  Plus,
  Users,
  Copy,
  Check,
  X,
  Loader2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface SecretPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessVault?: () => void;
  onJoinOnlineRoom?: (roomCode: string, isHost: boolean) => void;
}

export function SecretPinModal({
  isOpen,
  onClose,
  onSuccessVault,
  onJoinOnlineRoom,
}: SecretPinModalProps) {
  const { unlockVault, vaultPin } = useVault();
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isWaitingForFriend, setIsWaitingForFriend] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // Submit Join Action
  const handleJoinSubmit = async () => {
    if (!pin) return;
    setLoading(true);

    const isSecretVault = unlockVault(pin);

    if (isSecretVault) {
      setTimeout(() => {
        setLoading(false);
        ludoAudio.playSecretUnlock();
        if (onSuccessVault) onSuccessVault();
        onClose();
      }, 400);
      return;
    }

    // Otherwise, attempt joining as a real Ludo game room with friend
    try {
      const res = await ludoOnline.joinRoom(pin, 'Friend');
      setLoading(false);
      if (res.success) {
        toast.success(`Connected to Table #${pin}! Starting 2-Player match...`);
        if (onJoinOnlineRoom) onJoinOnlineRoom(pin, false);
        onClose();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        toast.error(`Room #${pin} not found or expired.`);
        setPin('');
      }
    } catch {
      setLoading(false);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error(`Room #${pin} not found.`);
      setPin('');
    }
  };

  // Create Room Action
  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const { roomCode } = await ludoOnline.createRoom('You (Host)');
      setCreatedRoomCode(roomCode);
      setIsWaitingForFriend(true);
      setLoading(false);

      // Listen for friend joining
      const unsubscribe = ludoOnline.subscribe((action) => {
        if (action.type === 'JOIN' && action.roomCode === roomCode) {
          toast.success(`${action.senderName || 'Your friend'} has joined the table!`);
          if (onJoinOnlineRoom) onJoinOnlineRoom(roomCode, true);
          unsubscribe();
          onClose();
        }
      });
    } catch (e: any) {
      setLoading(false);
      toast.error('Failed to create room. Please try again.');
    }
  };

  // Copy room link / code
  const copyRoomCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard.writeText(createdRoomCode);
    setCopied(true);
    toast.success(`Room Code ${createdRoomCode} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className={`relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 text-white shadow-2xl overflow-hidden ${
            shake ? 'animate-shake' : ''
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="mx-auto size-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Dices size={26} className="text-white" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Private Game Table</h2>
            <p className="text-xs text-slate-400">Play 2-Player Ludo with Friend or Enter Code</p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 my-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('join');
                setIsWaitingForFriend(false);
              }}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                tab === 'join'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound size={13} />
              <span>Join Room</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('create');
                if (!createdRoomCode) handleCreateRoom();
              }}
              className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                tab === 'create'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={13} />
              <span>Create 2P Room</span>
            </button>
          </div>

          {/* TAB 1: JOIN ROOM / ENTER CODE */}
          {tab === 'join' && (
            <div>
              {/* PIN Display Boxes */}
              <div className="flex justify-center gap-2.5 my-4">
                {[0, 1, 2, 3].map((idx) => {
                  const char = pin[idx];
                  return (
                    <div
                      key={idx}
                      className={`size-11 rounded-2xl border-2 flex items-center justify-center text-lg font-mono font-bold transition-all ${
                        char
                          ? 'border-rose-500 bg-rose-500/10 text-white shadow-sm shadow-rose-500/30'
                          : 'border-slate-700 bg-slate-800/60 text-slate-500'
                      }`}
                    >
                      {char ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-[250px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') setPin('');
                      else if (k === '⌫') handleBackspace();
                      else handleKeyPress(k);
                    }}
                    className={`h-11 rounded-2xl font-semibold text-base transition-all active:scale-95 flex items-center justify-center ${
                      k === 'C'
                        ? 'text-xs text-rose-400 bg-slate-800/40 hover:bg-slate-800'
                        : k === '⌫'
                        ? 'text-sm text-slate-400 bg-slate-800/40 hover:bg-slate-800'
                        : 'bg-slate-800 text-white hover:bg-slate-700/80 shadow-sm'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Submit Action */}
              <button
                type="button"
                disabled={pin.length < 4 || loading}
                onClick={handleJoinSubmit}
                className={`w-full mt-4 h-11 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  pin.length >= 4 && !loading
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/25 hover:opacity-95 active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>Enter Table / PIN</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: CREATE 2-PLAYER ROOM */}
          {tab === 'create' && (
            <div className="text-center py-2 space-y-4">
              {loading ? (
                <div className="py-8 space-y-2">
                  <Loader2 size={28} className="animate-spin mx-auto text-amber-400" />
                  <p className="text-xs text-slate-400">Generating Private Table...</p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      Your Private Room Code
                    </span>
                    <div className="text-3xl font-mono font-bold tracking-widest text-amber-400">
                      {createdRoomCode || '----'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Send this 4-digit code to your friend to join the match.
                    </p>
                  </div>

                  {/* Copy & Share Button */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyRoomCode}
                      className="flex-1 h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy Room Code'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (createdRoomCode && navigator.share) {
                          navigator.share({
                            title: 'Join my Ludo Arena Game',
                            text: `Join my private 2-player Ludo match! Code: ${createdRoomCode}`,
                          });
                        } else {
                          copyRoomCode();
                        }
                      }}
                      className="size-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>

                  {/* Waiting pulse */}
                  <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Waiting for your friend to enter code...</span>
                  </div>

                  {/* Direct Start Option */}
                  <button
                    type="button"
                    onClick={() => {
                      if (createdRoomCode && onJoinOnlineRoom) {
                        onJoinOnlineRoom(createdRoomCode, true);
                        onClose();
                      }
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline underline-offset-4"
                  >
                    Start match on this board anyway
                  </button>
                </>
              )}
            </div>
          )}

          {/* Footer note */}
          <div className="mt-3 text-center">
            <span className="text-[10px] text-slate-500">
              Default Secret PIN: 1234 • Fast Cloak: Esc x 2
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
