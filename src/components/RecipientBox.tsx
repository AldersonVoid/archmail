import React, { useRef } from 'react';
import { Users, Upload, Trash2, Download } from 'lucide-react';
import { ParsedEmailList } from '../utils/emailParser.ts';

interface RecipientBoxProps {
  rawText: string;
  onTextChange: (newText: string) => void;
  parsed: ParsedEmailList;
  bounceRate: number;
  sentCount: number;
  bouncedCount: number;
  isSending: boolean;
  currentlySendingEmail?: string | null;
  onCleanInvalid: () => void;
  onDeduplicate: () => void;
  onLoadSampleBatch: (count: number) => void;
}

export const RecipientBox: React.FC<RecipientBoxProps> = ({
  rawText,
  onTextChange,
  parsed,
  bounceRate,
  sentCount,
  bouncedCount,
  isSending,
  currentlySendingEmail,
  onCleanInvalid,
  onDeduplicate,
  onLoadSampleBatch
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onTextChange(rawText ? `${rawText}\n${content}` : content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportRemaining = () => {
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remaining_recipients_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine bounce status tier
  const bounceColor = bounceRate > 5 
    ? 'text-[#e78284] border-[#e78284]/40 bg-[#e78284]/10' 
    : bounceRate > 2 
    ? 'text-[#e5c890] border-[#e5c890]/40 bg-[#e5c890]/10' 
    : 'text-[#a6d189] border-[#a6d189]/40 bg-[#a6d189]/10';

  const bounceStatusText = bounceRate > 5
    ? 'CRITICAL (Risk of ESP suspension)'
    : bounceRate > 2
    ? 'ELEVATED (Review target list)'
    : 'OPTIMAL (< 2.0% industry standard)';

  return (
    <div className="bg-[#101620] border border-[#1d2737] rounded-lg flex flex-col font-mono text-xs overflow-hidden shadow-lg h-full">
      {/* Box Header */}
      <div className="bg-[#141c27] border-b border-[#1d2737] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#179299]" />
          <span className="font-bold text-white tracking-wide uppercase text-xs">
            Recipient Target Queue
          </span>
          {/* Main count requested by user */}
          <span className="px-2 py-0.5 rounded-full bg-[#1b2738] text-[#7dc4e4] border border-[#2b3e58] font-bold text-[11px]">
            {parsed.valid.length} in box
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            title="Import recipients from .txt or .csv"
            className="p-1.5 rounded hover:bg-[#1f2d40] text-[#899cb4] hover:text-white transition cursor-pointer disabled:opacity-40"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={exportRemaining}
            disabled={!rawText}
            title="Export remaining list to .txt"
            className="p-1.5 rounded hover:bg-[#1f2d40] text-[#899cb4] hover:text-white transition cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onTextChange('')}
            disabled={isSending || !rawText}
            title="Clear recipient queue"
            className="p-1.5 rounded hover:bg-[#2d1b22] text-[#899cb4] hover:text-[#e78284] transition cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Bounce Tracker Bar */}
      <div className="bg-[#0c1118] border-b border-[#1b2533] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#6d7e94]">Live Bounce Rate:</span>
            <span className={`px-2 py-0.5 rounded font-bold border ${bounceColor}`}>
              {bounceRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-[#495b73] hidden sm:inline">•</span>
          <span className="text-[#8799af] text-[10px] hidden sm:inline">
            {bounceStatusText}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-[#7dc4e4]">
            Sent: <strong className="text-white">{sentCount}</strong>
          </span>
          <span className="text-[#e78284]">
            Bounces: <strong className="text-white">{bouncedCount}</strong>
          </span>
        </div>
      </div>

      {/* Recipient Input Monospace Box */}
      <div className="relative flex-1 min-h-[220px] bg-[#090d13]">
        <textarea
          value={rawText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Enter unlimited recipient email addresses (one per line, comma or semicolon separated):
user1@company.com
user2@example.org
"John Smith" <john@target.co>
sales@enterprise.net`}
          spellCheck={false}
          className="w-full h-full min-h-[220px] p-3.5 bg-transparent text-[#e0eaf5] font-mono text-xs resize-none focus:outline-hidden leading-relaxed selection:bg-[#179299]/30"
        />

        {/* Active Dispatch Overlay Banner if sending */}
        {isSending && currentlySendingEmail && (
          <div className="absolute bottom-2 left-2 right-2 bg-[#121c28]/95 border border-[#179299] p-2 rounded flex items-center justify-between shadow-lg text-[11px]">
            <div className="flex items-center gap-2 text-[#7dc4e4]">
              <span className="w-2 h-2 rounded-full bg-[#179299]" />
              <span>Dispatching now:</span>
              <strong className="text-white font-mono">{currentlySendingEmail}</strong>
            </div>
            <span className="text-[#a6d189] text-[10px] uppercase font-bold">
              Will pop from list on send
            </span>
          </div>
        )}
      </div>

      {/* Quick Tool Strip */}
      <div className="bg-[#121924] border-t border-[#1d2737] p-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Sample batch loader */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#6d7e94]">Quick Load:</span>
          <button
            type="button"
            onClick={() => onLoadSampleBatch(10)}
            disabled={isSending}
            className="px-2 py-0.5 rounded bg-[#182333] hover:bg-[#202f44] text-[#8fa4bc] hover:text-white border border-[#23334a] cursor-pointer disabled:opacity-40"
          >
            +10 Demo
          </button>
          <button
            type="button"
            onClick={() => onLoadSampleBatch(50)}
            disabled={isSending}
            className="px-2 py-0.5 rounded bg-[#182333] hover:bg-[#202f44] text-[#8fa4bc] hover:text-white border border-[#23334a] cursor-pointer disabled:opacity-40"
          >
            +50 Demo
          </button>
          <button
            type="button"
            onClick={() => onLoadSampleBatch(250)}
            disabled={isSending}
            className="px-2 py-0.5 rounded bg-[#182333] hover:bg-[#202f44] text-[#8fa4bc] hover:text-white border border-[#23334a] cursor-pointer disabled:opacity-40 hidden sm:inline"
          >
            +250 Test
          </button>
        </div>

        {/* Cleaning tools */}
        <div className="flex items-center gap-1.5">
          {parsed.duplicatesCount > 0 && (
            <button
              type="button"
              onClick={onDeduplicate}
              disabled={isSending}
              className="px-2 py-0.5 rounded bg-[#e5c890]/20 text-[#e5c890] border border-[#e5c890]/40 hover:bg-[#e5c890]/30 cursor-pointer"
            >
              Deduplicate ({parsed.duplicatesCount})
            </button>
          )}

          {parsed.invalid.length > 0 && (
            <button
              type="button"
              onClick={onCleanInvalid}
              disabled={isSending}
              className="px-2 py-0.5 rounded bg-[#e78284]/20 text-[#e78284] border border-[#e78284]/40 hover:bg-[#e78284]/30 cursor-pointer"
            >
              Clean Invalid ({parsed.invalid.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
