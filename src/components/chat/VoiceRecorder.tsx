'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onRecorded: (file: File) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecorded, onCancel }: Props) {
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(100);

        timer = setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);
      } catch (err: any) {
        console.error(err);
        toast.error('Microphone access denied or not available.');
        onCancel();
      }
    };

    startRecording();

    return () => {
      if (timer) clearInterval(timer);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleStopAndSend = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
      onRecorded(file);
    };

    recorder.stop();
  };

  const handleDiscard = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    onCancel();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex items-center justify-between bg-surface border border-line rounded-2xl px-4 py-2 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="size-3.5 rounded-full bg-red-500 animate-rec-pulse" />
        <span className="text-sm font-medium font-mono text-ink">{formatTimer(seconds)}</span>
        <span className="text-xs text-muted">Recording voice note…</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDiscard}
          className="p-2 text-muted hover:text-red-500 rounded-xl hover:bg-background transition"
          title="Cancel"
          aria-label="Discard recording"
        >
          <Trash2 size={18} />
        </button>

        <button
          type="button"
          onClick={handleStopAndSend}
          className="size-9 grid place-items-center rounded-xl bg-brand text-white hover:bg-brand-light transition shadow-sm"
          title="Send voice note"
          aria-label="Send voice note"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
