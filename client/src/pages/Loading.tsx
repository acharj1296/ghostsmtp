import { RefreshCw } from 'lucide-react';

export const Loading = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4">
      <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
      <span className="text-sm text-slate-400 font-medium tracking-wide">Loading workspace...</span>
    </div>
  );
};

export default Loading;
