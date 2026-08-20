'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface Props {
  src: string;
  isMine?: boolean;
}

export function AudioPlayer({ src, isMine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio play error:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatSecs = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] max-w-[270px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`size-9 rounded-full grid place-items-center shrink-0 transition shadow-sm ${
          isMine ? 'bg-white text-brand hover:bg-white/90' : 'bg-brand text-white hover:bg-brand-light'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Volume2 size={13} className={isMine ? 'text-white/70' : 'text-muted'} />
          <span className={`text-[11px] font-mono ${isMine ? 'text-white/90' : 'text-ink'}`}>
            {formatSecs(currentTime)} / {formatSecs(duration || currentTime)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-black/20 rounded-lg appearance-none cursor-pointer accent-brand"
        />
      </div>
    </div>
  );
}
