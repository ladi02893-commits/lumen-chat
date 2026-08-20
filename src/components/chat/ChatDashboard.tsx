'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { insforge, isInsForgeConfigured } from '@/lib/insforge/client';
import { getOrCreateCurrentUserProfile } from '@/lib/insforge/profile';
import type { Conversation, Message, Profile } from '@/types/chat';
import { formatTime, initials } from '@/lib/utils';
import { messageSchema, locationSchema, validateFile } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import {
  Search,
  Send,
  Paperclip,
  Mic,
  MapPin,
  MoreVertical,
  ArrowLeft,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Smile,
  FileText,
  Loader2,
  Clock,
  Trash2,
  Download,
  Flame,
  CheckCheck,
  Check,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { EmojiPickerTray } from './EmojiPickerTray';
import { AudioPlayer } from './AudioPlayer';
import { VoiceRecorder } from './VoiceRecorder';
import { AutoDeleteModal } from './AutoDeleteModal';
import { MediaViewerModal } from './MediaViewerModal';
import { getStorageFileUrl } from '@/lib/insforge/storage';

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>();
  (existing || []).forEach((m) => {
    if (m && m.id) map.set(m.id, m);
  });
  (incoming || []).forEach((m) => {
    if (m && m.id) {
      const prev = map.get(m.id);
      map.set(m.id, {
        ...prev,
        ...m,
        attachments: m.attachments?.length ? m.attachments : prev?.attachments,
      });
    }
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function ChatDashboard() {
  const [me, setMe] = useState<Profile | null>(null);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: 'image' | 'video'; fileName?: string } | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // Load user profile and conversation list
  const loadConversations = async (myProfile: Profile) => {
    try {
      const { data: m, error: memErr } = await insforge.database
        .from('conversation_members')
        .select('conversation_id, cleared_at, conversations(*)')
        .eq('user_id', myProfile.id);

      if (memErr) throw memErr;

      const rawConvos = (m || [])
        .map((x: any) => ({
          ...x.conversations,
          cleared_at: x.cleared_at,
        }))
        .filter(Boolean) as (Conversation & { cleared_at?: string | null })[];

      if (rawConvos.length === 0) {
        setConvos([]);
        return;
      }

      const convoIds = rawConvos.map((c) => c.id);

      // Fetch other members for each conversation
      const { data: allMembers } = await insforge.database
        .from('conversation_members')
        .select('conversation_id, user_id, profiles(*)')
        .in('conversation_id', convoIds)
        .neq('user_id', myProfile.id);

      // Fetch latest messages
      const { data: latestMsgs } = await insforge.database
        .from('messages')
        .select('*')
        .in('conversation_id', convoIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const memberMap = new Map<string, Profile>();
      (allMembers || []).forEach((row: any) => {
        if (row.profiles) {
          memberMap.set(row.conversation_id, row.profiles as Profile);
        }
      });

      const lastMsgMap = new Map<string, Message>();
      (latestMsgs || []).forEach((msg: any) => {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, msg as Message);
        }
      });

      const enriched: Conversation[] = rawConvos.map((c) => ({
        ...c,
        other: memberMap.get(c.id),
        last_message: lastMsgMap.get(c.id),
      }));

      enriched.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.updated_at;
        const timeB = b.last_message?.created_at || b.updated_at;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      setConvos(enriched);
    } catch (err: any) {
      console.error('Error loading conversations:', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isInsForgeConfigured) {
        setLoading(false);
        return;
      }

      const { profile, error } = await getOrCreateCurrentUserProfile();
      if (error || !profile) {
        if (mounted) {
          setLoading(false);
          location.assign('/login');
        }
        return;
      }

      if (mounted) {
        setMe(profile);
        await loadConversations(profile);
        setLoading(false);

        // Update online presence
        await insforge.database.rpc('update_presence', { online: true });
      }
    })();

    // Background presence interval
    const presenceInterval = setInterval(() => {
      insforge.database.rpc('update_presence', { online: true });
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(presenceInterval);
      insforge.database.rpc('update_presence', { online: false });
    };
  }, []);

  // Fetch and poll messages for the active conversation
  useEffect(() => {
    if (!active || !me) return;

    let isSubscribed = true;

    const fetchMessages = async () => {
      try {
        const { data, error } = await insforge.database
          .from('messages')
          .select('*, message_attachments(*)')
          .eq('conversation_id', active.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!isSubscribed) return;
        if (error) return;

        const now = new Date().getTime();
        const validMsgs = (data || []).filter((x: any) => {
          if (x.deleted_at) return false;
          if (x.expires_at && new Date(x.expires_at).getTime() <= now) return false;
          return true;
        }) as Message[];

        setMessages((prev) => mergeMessages(prev, validMsgs));

        // Mark unviewed messages from friend as viewed & read
        const unreadFromOther = validMsgs.filter((x) => x.sender_id !== me.id && !x.viewed_at);
        for (const msg of unreadFromOther) {
          insforge.database.rpc('mark_message_viewed', { m_id: msg.id });
        }

        // Check if other user is typing
        const { data: typingData } = await insforge.database
          .from('typing_status')
          .select('is_typing, updated_at')
          .eq('conversation_id', active.id)
          .neq('user_id', me.id)
          .maybeSingle();

        if (typingData) {
          const diff = now - new Date(typingData.updated_at).getTime();
          setIsOtherTyping(Boolean(typingData.is_typing && diff < 5000));
        } else {
          setIsOtherTyping(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();

    // 1. Realtime subscription
    try {
      insforge.realtime.subscribe(`conversation:${active.id}`).then((r: any) => {
        if (r && r.ok !== false) {
          insforge.realtime.on('INSERT', (event: any) => {
            if (!isSubscribed) return;
            if (event.new?.conversation_id === active.id) {
              setMessages((old) => mergeMessages(old, [event.new]));
            }
          });
        }
      });
    } catch {}

    // 2. Mobile smart polling fallback (every 2.5 seconds)
    const pollTimer = setInterval(fetchMessages, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(pollTimer);
      try {
        insforge.realtime.disconnect();
      } catch {}
    };
  }, [active, me]);

  const filtered = useMemo(
    () =>
      convos.filter((c) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          c.other?.full_name?.toLowerCase().includes(q) ||
          c.other?.username?.toLowerCase().includes(q)
        );
      }),
    [convos, query]
  );

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-brand size-9 mx-auto" />
          <p className="text-xs text-muted font-medium">Opening Lumen…</p>
        </div>
      </main>
    );
  }

  if (!isInsForgeConfigured) return <ConfigNeeded />;

  return (
    <main className="h-dvh w-full p-0 md:p-4 bg-background select-none">
      <div className="h-full max-w-[1600px] mx-auto rounded-none md:rounded-3xl bg-surface border border-line grid md:grid-cols-[380px_1fr] overflow-hidden shadow-2xl">
        {/* Left Conversation List Sidebar */}
        <aside
          className={`${
            active ? 'hidden md:flex' : 'flex'
          } flex-col border-r border-line min-w-0 h-full bg-surface`}
        >
          {/* Sidebar Top Header */}
          <div className="p-4 md:p-5 flex items-center justify-between border-b border-line/60">
            <div className="flex gap-2.5 items-center font-bold text-lg text-ink">
              <span className="grid place-items-center size-9 rounded-2xl bg-brand text-white shadow-md shadow-brand/30 text-base font-black">
                ✦
              </span>
              <span>Lumen</span>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/friends"
                title="Find Friends"
                className="p-2 text-muted hover:text-brand rounded-xl hover:bg-background transition"
              >
                <UserPlus size={19} />
              </Link>
              <button
                onClick={async () => {
                  await insforge.auth.signOut();
                  location.assign('/login');
                }}
                aria-label="Log out"
                title="Log out"
                className="p-2 text-muted hover:text-danger rounded-xl hover:bg-background transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="px-4 py-3">
            <label className="h-10 bg-background rounded-2xl flex items-center gap-2.5 px-3.5 text-muted border border-line/80 focus-within:border-brand transition">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent outline-none w-full text-sm placeholder:text-muted"
                placeholder="Search conversations…"
              />
            </label>
          </div>

          {/* Quick Nav Bar */}
          <nav className="px-3 pb-3 grid grid-cols-3 gap-1.5 text-xs text-muted border-b border-line/60">
            <Link
              href="/friends"
              className="rounded-2xl p-2 hover:bg-background border border-transparent hover:border-line text-center transition"
            >
              <Users size={17} className="mx-auto mb-1 text-brand" />
              Friends
            </Link>
            <Link
              href="/requests"
              className="rounded-2xl p-2 hover:bg-background border border-transparent hover:border-line text-center transition"
            >
              <UserPlus size={17} className="mx-auto mb-1 text-brand" />
              Requests
            </Link>
            <Link
              href="/settings"
              className="rounded-2xl p-2 hover:bg-background border border-transparent hover:border-line text-center transition"
            >
              <Settings size={17} className="mx-auto mb-1 text-brand" />
              Settings
            </Link>
          </nav>

          {/* Conversation List */}
          <div className="overflow-y-auto flex-1 divide-y divide-line/40">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted space-y-3">
                <p>No active conversations.</p>
                <Link
                  href="/friends"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand/10 text-brand text-xs font-medium hover:bg-brand/20 transition"
                >
                  <UserPlus size={15} /> Find friends to chat
                </Link>
              </div>
            ) : (
              filtered.map((c) => {
                const isOnline = c.other?.is_online;
                const autoDeleteBadge =
                  c.auto_delete_mode === '24h'
                    ? '24h'
                    : c.auto_delete_mode === '12h'
                    ? '12h'
                    : c.auto_delete_mode === '3h'
                    ? '3h'
                    : c.auto_delete_mode === '5m_after_view'
                    ? '5m view'
                    : c.auto_delete_mode === 'instant_after_view'
                    ? '🔥 instant'
                    : c.auto_delete_mode === 'custom'
                    ? 'custom'
                    : null;

                return (
                  <button
                    key={c.id}
                    onClick={() => setActive(c)}
                    className={`w-full text-left p-3.5 md:p-4 flex gap-3.5 items-center hover:bg-background/70 transition relative ${
                      active?.id === c.id ? 'bg-background font-medium' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar p={c.other} />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 size-3 rounded-full bg-mint ring-2 ring-surface" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm truncate text-ink">
                          {c.other?.full_name || 'Private conversation'}
                        </span>
                        {c.last_message && (
                          <span className="text-[10px] text-muted shrink-0 ml-1">
                            {formatTime(c.last_message.created_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted truncate">
                          {c.last_message?.message_type === 'LOCATION'
                            ? '📍 Shared location'
                            : c.last_message?.message_type === 'IMAGE'
                            ? '📷 Photo'
                            : c.last_message?.message_type === 'VIDEO'
                            ? '🎥 Video'
                            : c.last_message?.message_type === 'AUDIO'
                            ? '🎤 Voice note'
                            : c.last_message?.message_type === 'DOCUMENT'
                            ? '📄 Document'
                            : c.last_message?.content || 'Tap to start conversation'}
                        </p>

                        {autoDeleteBadge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 shrink-0 ml-1.5">
                            ⏱️ {autoDeleteBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Current User Profile Footer */}
          <Link
            href="/profile"
            className="border-t border-line p-3.5 flex gap-3 items-center hover:bg-background transition shrink-0"
          >
            <Avatar p={me} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-ink">{me?.full_name}</p>
              <p className="text-xs text-muted truncate">@{me?.username}</p>
            </div>
            <span className="text-xs text-brand font-medium">Edit</span>
          </Link>
        </aside>

        {/* Right Active Chat Window */}
        <section
          className={`${
            !active ? 'hidden md:flex' : 'flex'
          } min-w-0 flex-col bg-background h-full relative overflow-hidden`}
        >
          {active && me ? (
            <ChatView
              convo={active}
              me={me}
              messages={messages}
              setMessages={setMessages}
              back={() => setActive(null)}
              onOpenAutoDelete={() => setShowAutoDeleteModal(true)}
              onOpenMedia={(url, type, fileName) => setMediaViewer({ url, type, fileName })}
              isOtherTyping={isOtherTyping}
            />
          ) : (
            <div className="m-auto max-w-sm text-center p-8 space-y-4">
              <div className="size-16 rounded-3xl bg-brand/10 text-brand text-3xl grid place-items-center mx-auto shadow-inner">
                ✦
              </div>
              <h1 className="font-bold text-2xl text-ink">Private, Intentional Chat</h1>
              <p className="text-muted text-sm leading-relaxed">
                Connect with accepted friends. All messages, voice notes, photos, and files are protected.
              </p>
              <Link
                href="/friends"
                className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm text-white font-semibold shadow-lg shadow-brand/25 hover:bg-brand-light transition"
              >
                <UserPlus size={17} /> Find friends
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Auto-Delete Settings Modal */}
      {showAutoDeleteModal && active && (
        <AutoDeleteModal
          conversationId={active.id}
          currentMode={active.auto_delete_mode || 'never'}
          currentSeconds={active.auto_delete_seconds || null}
          onClose={() => setShowAutoDeleteModal(false)}
          onUpdated={(mode, secs) => {
            setActive((prev) => (prev ? { ...prev, auto_delete_mode: mode as any, auto_delete_seconds: secs } : null));
            setConvos((old) =>
              old.map((c) => (c.id === active.id ? { ...c, auto_delete_mode: mode as any, auto_delete_seconds: secs } : c))
            );
          }}
          onClearChat={() => {
            setMessages([]);
          }}
        />
      )}

      {/* Full-screen Media Lightbox Viewer */}
      {mediaViewer && (
        <MediaViewerModal
          url={mediaViewer.url}
          type={mediaViewer.type}
          fileName={mediaViewer.fileName}
          onClose={() => setMediaViewer(null)}
        />
      )}
    </main>
  );
}

function ConfigNeeded() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="max-w-md rounded-3xl bg-surface border border-line p-8 shadow-2xl text-center space-y-3">
        <h1 className="text-xl font-bold text-ink">Connect Lumen to InsForge</h1>
        <p className="text-muted text-sm">
          Add <code>NEXT_PUBLIC_INSFORGE_URL</code> and <code>NEXT_PUBLIC_INSFORGE_ANON_KEY</code> to <code>.env.local</code> to begin.
        </p>
      </div>
    </main>
  );
}

function Avatar({ p }: { p?: Profile | null }) {
  return p?.avatar_url ? (
    <img
      className="size-10 rounded-full object-cover border border-line shrink-0"
      src={p.avatar_url}
      alt={p.full_name}
    />
  ) : (
    <span className="size-10 rounded-full grid place-items-center shrink-0 bg-brand/15 text-brand text-xs font-bold border border-brand/25">
      {initials(p?.full_name || 'User')}
    </span>
  );
}

function ChatView({
  convo,
  me,
  messages,
  setMessages,
  back,
  onOpenAutoDelete,
  onOpenMedia,
  isOtherTyping,
}: {
  convo: Conversation;
  me: Profile;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  back: () => void;
  onOpenAutoDelete: () => void;
  onOpenMedia: (url: string, type: 'image' | 'video', fileName?: string) => void;
  isOtherTyping: boolean;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isOtherTyping]);

  // Send broadcast when user is typing
  const handleTyping = (val: string) => {
    setText(val);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    insforge.database.rpc('set_typing', { c: convo.id, typing: true });

    typingTimeoutRef.current = setTimeout(() => {
      insforge.database.rpc('set_typing', { c: convo.id, typing: false });
    }, 2000);
  };

  const sendText = async () => {
    const v = messageSchema.safeParse({ content: text });
    if (!v.success) return;
    setSending(true);

    const isEmoji = /^\p{Extended_Pictographic}+$/u.test(v.data.content.trim());
    const isLink = /^(https?:\/\/[^\s]+)$/i.test(v.data.content.trim());
    const kind = isEmoji ? 'EMOJI' : isLink ? 'LINK' : 'TEXT';

    const { data, error } = await insforge.database.rpc('create_message', {
      c: convo.id,
      kind: kind,
      body: v.data.content,
    });

    setSending(false);
    if (error) return toast.error(error.message);

    setText('');
    setShowEmojiPicker(false);

    if (data) {
      const newMsg: Message = {
        id: data as string,
        conversation_id: convo.id,
        sender_id: me.id,
        message_type: kind,
        content: v.data.content,
        created_at: new Date().toISOString(),
        viewed_at: null,
        deleted_at: null,
        expires_at: null,
        reply_to_message_id: null,
      };
      setMessages((old) => mergeMessages(old, [newMsg]));
    }
  };

  // Upload file attachment (Image, Video, Audio, Document)
  const uploadAttachment = async (file: File) => {
    try {
      validateFile(file);
      setSending(true);
      setShowAttachMenu(false);

      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const isAud = file.type.startsWith('audio/');
      const kind = isImg ? 'IMAGE' : isVid ? 'VIDEO' : isAud ? 'AUDIO' : 'DOCUMENT';

      // 1. Create message row
      const msg = await insforge.database.rpc('create_message', {
        c: convo.id,
        kind: kind,
        body: null,
      });

      if (msg.error) throw msg.error;

      // 2. Upload file to storage
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${convo.id}/${msg.data}/${Date.now()}-${cleanName}`;

      const up = await insforge.storage.from('chat-files').upload(storageKey, file);
      if (up.error) throw up.error;

      // 3. Save attachment metadata
      const r = await insforge.database.from('message_attachments').insert([
        {
          message_id: msg.data,
          storage_path: storageKey,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        },
      ]);

      if (r.error) throw r.error;

      const newMsg: Message = {
        id: msg.data as string,
        conversation_id: convo.id,
        sender_id: me.id,
        message_type: kind,
        content: null,
        created_at: new Date().toISOString(),
        viewed_at: null,
        deleted_at: null,
        expires_at: null,
        reply_to_message_id: null,
        attachments: [
          {
            id: crypto.randomUUID(),
            storage_path: storageKey,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            thumbnail_path: null,
          },
        ],
      };
      setMessages((old) => mergeMessages(old, [newMsg]));

      toast.success('Sent successfully!');
    } catch (e: any) {
      toast.error(e.message || 'File send failed');
    } finally {
      setSending(false);
    }
  };

  const shareLocation = () => {
    setShowAttachMenu(false);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const v = locationSchema.parse({
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          });

          const { data, error } = await insforge.database.rpc('create_message', {
            c: convo.id,
            kind: 'LOCATION',
            body: 'Shared live location',
            lat: v.latitude,
            lng: v.longitude,
          });

          if (error) throw error;

          if (data) {
            const newMsg: Message = {
              id: data as string,
              conversation_id: convo.id,
              sender_id: me.id,
              message_type: 'LOCATION',
              content: 'Shared live location',
              location_lat: v.latitude,
              location_lng: v.longitude,
              created_at: new Date().toISOString(),
              viewed_at: null,
              deleted_at: null,
              expires_at: null,
              reply_to_message_id: null,
            } as any;
            setMessages((old) => mergeMessages(old, [newMsg]));
            toast.success('Location sent!');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to share location');
        }
      },
      () => toast.error('Location permission was denied.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const autoDeleteLabel =
    convo.auto_delete_mode === '24h'
      ? '24h'
      : convo.auto_delete_mode === '12h'
      ? '12h'
      : convo.auto_delete_mode === '3h'
      ? '3h'
      : convo.auto_delete_mode === '5m_after_view'
      ? '5m view'
      : convo.auto_delete_mode === 'instant_after_view'
      ? '🔥 Instant'
      : convo.auto_delete_mode === 'custom'
      ? `${Math.round((convo.auto_delete_seconds || 0) / 60)}m`
      : 'Off';

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Chat Header */}
      <header className="h-16 px-4 md:px-5 border-b border-line flex items-center justify-between bg-surface/90 backdrop-blur-md shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="md:hidden p-1.5 -ml-1 text-muted hover:text-ink rounded-xl"
            onClick={back}
            aria-label="Back to conversations"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="relative shrink-0">
            <Avatar p={convo.other} />
            {convo.other?.is_online && (
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-mint ring-2 ring-surface" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-sm truncate text-ink">
              {convo.other?.full_name || 'Private conversation'}
            </h2>
            <p className="text-[11px] text-muted truncate flex items-center gap-1">
              {isOtherTyping ? (
                <span className="text-brand font-medium animate-pulse">typing…</span>
              ) : convo.other?.is_online ? (
                <span className="text-mint font-medium">Online</span>
              ) : (
                `@${convo.other?.username || 'user'}`
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Disappearing Timer Button */}
          <button
            onClick={onOpenAutoDelete}
            title="Auto-delete message settings"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 border border-brand/25 text-brand text-xs font-semibold transition"
          >
            <Clock size={14} />
            <span className="hidden sm:inline">{autoDeleteLabel}</span>
          </button>

          <button
            onClick={onOpenAutoDelete}
            title="Conversation options"
            className="p-2 text-muted hover:text-ink rounded-xl hover:bg-background transition"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Message Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted space-y-2">
            <span className="text-4xl">👋</span>
            <p className="font-medium text-sm text-ink">Say hello to {convo.other?.full_name || 'your friend'}</p>
            <p className="text-xs max-w-xs">
              Messages and media in this conversation are strictly private and end-to-end authorized.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMine = m.sender_id === me.id;
            return (
              <MessageBubble
                key={m.id || `msg-${idx}`}
                msg={m}
                isMine={isMine}
                onOpenMedia={onOpenMedia}
              />
            );
          })
        )}

        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-surface border border-line rounded-2xl rounded-bl-xs px-4 py-2.5 flex items-center gap-1.5 shadow-xs">
              <span className="size-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="size-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="size-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadAttachment(e.target.files[0])}
      />

      {/* Quick Emoji Picker Tray */}
      {showEmojiPicker && (
        <EmojiPickerTray
          onSelect={(emoji) => {
            setText((t) => t + emoji);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Attachment Tray Menu */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-4 z-40 bg-surface border border-line rounded-2xl p-2 shadow-2xl space-y-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 w-48">
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.setAttribute('accept', 'image/*');
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-ink hover:bg-background transition"
          >
            <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
              <ImageIcon size={16} />
            </span>
            Photos & Images
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.setAttribute('accept', 'video/*');
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-ink hover:bg-background transition"
          >
            <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
              <Film size={16} />
            </span>
            Videos
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.removeAttribute('accept');
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-ink hover:bg-background transition"
          >
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <FileText size={16} />
            </span>
            Documents & Files
          </button>

          <button
            type="button"
            onClick={shareLocation}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-ink hover:bg-background transition"
          >
            <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <MapPin size={16} />
            </span>
            Share Location
          </button>
        </div>
      )}

      {/* Input Bar & Controls */}
      <div className="p-2.5 md:p-3 border-t border-line bg-surface/90 backdrop-blur-md shrink-0">
        {isRecording ? (
          <VoiceRecorder
            onRecorded={(audioFile) => {
              setIsRecording(false);
              uploadAttachment(audioFile);
            }}
            onCancel={() => setIsRecording(false)}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendText();
            }}
            className="flex items-end gap-2"
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => setShowAttachMenu((v) => !v)}
              className={`p-2.5 rounded-xl transition ${
                showAttachMenu ? 'bg-brand text-white' : 'text-muted hover:text-ink hover:bg-background'
              }`}
              title="Add attachment"
              aria-label="Add attachment"
            >
              <Paperclip size={19} />
            </button>

            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={`p-2.5 rounded-xl transition ${
                showEmojiPicker ? 'bg-brand text-white' : 'text-muted hover:text-ink hover:bg-background'
              }`}
              title="Add emoji"
              aria-label="Add emoji"
            >
              <Smile size={19} />
            </button>

            {/* Textarea */}
            <textarea
              rows={1}
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              placeholder="Message…"
              className="flex-1 max-h-32 min-h-[42px] py-2.5 px-3.5 rounded-2xl bg-background border border-line text-sm text-ink outline-none focus:border-brand resize-none placeholder:text-muted"
            />

            {/* Send or Mic Button */}
            {text.trim() ? (
              <button
                disabled={sending}
                type="submit"
                className="size-11 grid place-items-center rounded-2xl bg-brand text-white hover:bg-brand-light shadow-md shadow-brand/30 transition shrink-0 disabled:opacity-50"
                aria-label="Send message"
              >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRecording(true)}
                className="size-11 grid place-items-center rounded-2xl bg-background border border-line text-muted hover:text-brand hover:border-brand transition shrink-0"
                title="Record voice note"
                aria-label="Record voice note"
              >
                <Mic size={19} />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  onOpenMedia,
}: {
  msg: Message;
  isMine: boolean;
  onOpenMedia: (url: string, type: 'image' | 'video', fileName?: string) => void;
}) {
  const attachment = msg.attachments?.[0];
  const fileUrl = getStorageFileUrl(attachment?.storage_path);

  const isBigEmoji =
    msg.message_type === 'EMOJI' &&
    msg.content &&
    msg.content.trim().length <= 6 &&
    /^\p{Extended_Pictographic}+$/u.test(msg.content.trim());

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-3xl p-3.5 shadow-sm transition ${
          isBigEmoji
            ? 'bg-transparent shadow-none !p-1 text-5xl'
            : isMine
            ? 'bg-brand text-white rounded-br-xs'
            : 'bg-surface border border-line text-ink rounded-bl-xs'
        }`}
      >
        {/* Attachment: Image */}
        {msg.message_type === 'IMAGE' && (
          <div className="space-y-1.5 min-w-[160px] min-h-[120px] rounded-2xl overflow-hidden bg-black/20">
            {fileUrl ? (
              <img
                src={fileUrl}
                alt={attachment?.file_name || 'Shared photo'}
                loading="lazy"
                onClick={() => onOpenMedia(fileUrl, 'image', attachment?.file_name)}
                className="rounded-2xl max-h-72 w-full object-cover cursor-pointer hover:opacity-90 active:scale-[0.99] transition shadow-inner"
              />
            ) : (
              <div className="p-4 text-center text-xs text-muted">Loading image…</div>
            )}
          </div>
        )}

        {/* Attachment: Video */}
        {msg.message_type === 'VIDEO' && (
          <div className="space-y-1.5 rounded-2xl overflow-hidden bg-black">
            {fileUrl ? (
              <video
                src={fileUrl}
                controls
                preload="metadata"
                playsInline
                className="rounded-2xl max-h-72 w-full bg-black"
              />
            ) : (
              <div className="p-4 text-center text-xs text-muted">Loading video…</div>
            )}
          </div>
        )}

        {/* Attachment: Voice note */}
        {msg.message_type === 'AUDIO' && fileUrl && (
          <AudioPlayer src={fileUrl} isMine={isMine} />
        )}

        {/* Attachment: Document / File */}
        {msg.message_type === 'DOCUMENT' && attachment && (
          <a
            href={fileUrl}
            download={attachment.file_name}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
              isMine
                ? 'bg-white/10 border-white/20 hover:bg-white/15 text-white'
                : 'bg-background border-line hover:border-brand/40 text-ink'
            }`}
          >
            <span className="p-2 rounded-xl bg-brand/20 text-brand">
              <FileText size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{attachment.file_name}</p>
              <p className={`text-[10px] ${isMine ? 'text-white/70' : 'text-muted'}`}>
                {Math.round((attachment.file_size / 1024) * 10) / 10} KB
              </p>
            </div>
            <Download size={16} className={isMine ? 'text-white/80' : 'text-muted'} />
          </a>
        )}

        {/* Shared Location */}
        {msg.message_type === 'LOCATION' && (
          <a
            className={`flex items-center gap-2 p-2.5 rounded-2xl border font-medium text-xs transition ${
              isMine
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-background border-line text-brand hover:underline'
            }`}
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.openstreetmap.org/?mlat=${(msg as any).location_lat}&mlon=${(msg as any).location_lng}`}
          >
            <MapPin size={18} className="text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">Live Map Location</p>
              <p className={`text-[10px] ${isMine ? 'text-white/70' : 'text-muted'}`}>
                {(msg as any).location_lat?.toFixed?.(4)}, {(msg as any).location_lng?.toFixed?.(4)}
              </p>
            </div>
          </a>
        )}

        {/* Text / Link content */}
        {msg.message_type === 'LINK' && msg.content && (
          <a
            href={msg.content}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all text-sm font-medium hover:opacity-90 block"
          >
            {msg.content}
          </a>
        )}

        {msg.message_type === 'TEXT' && msg.content && (
          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        )}

        {isBigEmoji && <span>{msg.content}</span>}

        {/* Timestamp & Read Receipt */}
        {!isBigEmoji && (
          <div
            className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
              isMine ? 'text-white/75' : 'text-muted'
            }`}
          >
            <span>{formatTime(msg.created_at)}</span>
            {isMine && (
              <span>
                {msg.viewed_at ? (
                  <CheckCheck size={13} className="text-emerald-300 inline" />
                ) : (
                  <Check size={13} className="inline" />
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
