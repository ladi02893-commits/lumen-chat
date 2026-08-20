'use client';

import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface Props {
  url: string;
  type: 'image' | 'video';
  fileName?: string;
  onClose: () => void;
}

export function MediaViewerModal({ url, type, fileName, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4">
      <div className="flex items-center justify-between p-2 text-white shrink-0">
        <span className="text-sm font-medium truncate max-w-[200px] md:max-w-md">
          {fileName || 'Media viewer'}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download={fileName || 'file'}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/10 text-white transition"
            title="Download / Open original"
          >
            <Download size={20} />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white transition"
            title="Close"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 grid place-items-center overflow-hidden p-2">
        {type === 'image' ? (
          <img
            src={url}
            alt={fileName || 'Image preview'}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl bg-black"
          />
        )}
      </div>
    </div>
  );
}
