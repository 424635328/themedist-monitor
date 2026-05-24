'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyAllButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? '已复制！' : '一键复制全部'}
    </button>
  );
}
