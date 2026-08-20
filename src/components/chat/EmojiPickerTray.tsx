'use client';

import React from 'react';

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Frequent',
    emojis: ['❤️', '😂', '🔥', '👍', '😍', '🙏', '🎉', '💯', '✨', '😎', '🥹', '👏'],
  },
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😭', '😉', '😊', '😇', '🥰', '😘', '😋', '😜', '🤪', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '💪', '🙏', '✍️', '💅', '🤳'],
  },
  {
    name: 'Hearts & Vibes',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '🌟', '💫', '💥', '🔥', '⚡'],
  },
];

export function EmojiPickerTray({ onSelect, onClose }: Props) {
  return (
    <div className="absolute bottom-16 left-3 z-50 w-72 md:w-80 max-h-72 rounded-2xl bg-surface border border-line p-3 shadow-2xl overflow-y-auto backdrop-blur-lg">
      <div className="flex items-center justify-between pb-2 border-b border-line mb-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Quick Emojis</span>
        <button
          onClick={onClose}
          className="text-xs text-muted hover:text-ink px-1.5 py-0.5 rounded-lg hover:bg-background"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <p className="text-[11px] text-muted font-medium mb-1">{cat.name}</p>
            <div className="grid grid-cols-6 gap-1">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="size-9 grid place-items-center rounded-xl text-lg hover:bg-background hover:scale-115 active:scale-95 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
