import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label: string;
  onCopy?: (text: string, label: string) => void;
  className?: string;
}

/**
 * Copy-to-clipboard button with inline "Copied" feedback.
 * Shows a checkmark for 1.5 s after a successful copy.
 */
export const CopyButton = ({ text, label, onCopy, className = '' }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (onCopy) onCopy(text, label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fall back to parent onCopy which shows a toast
      if (onCopy) onCopy(text, label);
    }
  }, [text, label, onCopy]);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy(); }}
      disabled={!text}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
        copied
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
};

export default CopyButton;
