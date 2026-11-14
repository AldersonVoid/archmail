import React from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { SendingStats, DispatchMode } from '../types.ts';

interface ProcessControlsProps {
  isSending: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onResetStats: () => void;
  stats: SendingStats;
  canStart: boolean;
  totalInQueue: number;
  dispatchMode?: DispatchMode;
  activeSenderEmail?: string;
  hasAccounts?: boolean;
}

export const ProcessControls: React.FC<ProcessControlsProps> = ({
  isSending,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  onResetStats,
  stats,
  canStart,
  totalInQueue,
  dispatchMode,
  activeSenderEmail,
  hasAccounts = true
}) => {
  const percentComplete = stats.totalInitial > 0
    ? Math.min(100, Math.round(((stats.totalInitial - stats.remaining) / stats.totalInitial) * 100))
    : 0;

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#101620] border border-[#1d2737] rounded-lg p-4 font-mono text-xs shadow-lg space-y-4">
      {/* Top Controls Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Process Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isSending ? (
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart}
              className={`px-5 py-2.5 rounded font-bold flex items-center gap-2 transition cursor-pointer text-sm shadow-md ${
                canStart
                  ? !hasAccounts
                    ? 'bg-[#e5c890] hover:bg-[#f0d5a0] text-black shadow-[#e5c890]/25 hover:scale-[1.02]'
                    : 'bg-[#179299] hover:bg-[#1ab0b8] text-black shadow-[#179299]/25 hover:scale-[1.02]'
                  : 'bg-[#1b2533] text-[#5c6e83] cursor-not-allowed border border-[#223043]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{!hasAccounts ? 'ADD SENDER ACCOUNT & START' : 'START BULK SEND'}</span>
            </button>
          ) : isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="px-5 py-2.5 rounded font-bold bg-[#a6d189] hover:bg-[#b5e896] text-black flex items-center gap-2 transition cursor-pointer text-sm shadow-md shadow-[#a6d189]/25 hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME SENDING</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="px-5 py-2.5 rounded font-bold bg-[#e5c890] hover:bg-[#edd39d] text-black flex items-center gap-2 transition cursor-pointer text-sm shadow-md shadow-[#e5c890]/25"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE</span>
            </button>
          )}

          {/* STOP Button */}
          <button
            type="button"
            onClick={onStop}
            disabled={!isSending && !isPaused}
            className={`px-4 py-2.5 rounded font-bold flex items-center gap-2 transition cursor-pointer text-sm ${
              isSending || isPaused
                ? 'bg-[#e78284] hover:bg-[#f28e90] text-black shadow-md shadow-[#e78284]/25 hover:scale-[1.02]'
                : 'bg-[#1b2533] text-[#5c6e83] cursor-not-allowed border border-[#223043]'
            }`}
          >
            <Square className="w-4 h-4 fill-current" />
            <span>STOP / ABORT</span>
          </button>

          {/* Reset Stats Button */}
          <button
            type="button"
            onClick={onResetStats}
            disabled={isSending}
            title="Reset delivery counters & history"
            className="px-3 py-2.5 rounded bg-[#16202c] hover:bg-[#1f2d3e] text-[#8fa4bc] hover:text-white border border-[#27384c] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Stats</span>
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3">
          {dispatchMode === 'gmail_oauth' && activeSenderEmail && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#090d13] border border-[#1b2f44] px-2.5 py-1 rounded text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="text-[#8ea0b5]">Relay:</span>
              <span className="text-[#7dc4e4] font-medium max-w-[160px] truncate">{activeSenderEmail}</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[#090d13] border border-[#1d2737] px-3 py-1.5 rounded">
            <span className={`w-2 h-2 rounded-full ${isSending && !isPaused ? 'bg-[#a6d189]' : isPaused ? 'bg-[#e5c890]' : 'bg-[#64768c]'}`} />
            <span className="text-[#8ea0b5]">Status:</span>
            <span className={`font-bold uppercase ${isSending && !isPaused ? 'text-[#a6d189]' : isPaused ? 'text-[#e5c890]' : 'text-[#8ea0b5]'}`}>
              {isSending ? (isPaused ? 'Paused' : 'Transmitting') : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar & ETA */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#8ea0b5]">
          <div className="flex items-center gap-2">
            <span>Overall Dispatch Progress:</span>
            <strong className="text-white">{percentComplete}%</strong>
          </div>
          <div className="flex items-center gap-3">
            <span>Elapsed: <strong className="text-white">{formatTime(stats.elapsedSec)}</strong></span>
            {isSending && (
              <span>ETA: <strong className="text-[#7dc4e4]">{formatTime(stats.etaSec)}</strong></span>
            )}
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2.5 bg-[#090d13] rounded-full overflow-hidden border border-[#1b2533]">
          <div
            className="h-full bg-gradient-to-r from-[#179299] via-[#04a5e5] to-[#a6d189] transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Real-time Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {/* 1. Remaining */}
        <div className="bg-[#0b0f16] border border-[#1b2533] p-2.5 rounded">
          <span className="text-[#64768c] text-[10px] uppercase block">In Queue</span>
          <span className="text-lg font-bold text-white font-mono">{totalInQueue}</span>
          <span className="text-[10px] text-[#4d5f75] block">Pending send</span>
        </div>

        {/* 2. Sent */}
        <div className="bg-[#0b0f16] border border-[#1b2533] p-2.5 rounded">
          <span className="text-[#64768c] text-[10px] uppercase block">Sent OK</span>
          <span className="text-lg font-bold text-[#a6d189] font-mono">{stats.sent}</span>
          <span className="text-[10px] text-[#a6d189]/70 block">250 OK Delivered</span>
        </div>

        {/* 3. Bounces */}
        <div className="bg-[#0b0f16] border border-[#1b2533] p-2.5 rounded">
          <span className="text-[#64768c] text-[10px] uppercase block">Bounced (NDR)</span>
          <span className="text-lg font-bold text-[#e78284] font-mono">{stats.bounced}</span>
          <span className="text-[10px] text-[#e78284]/70 block">550 / Mailbox Reject</span>
        </div>

        {/* 4. Live Bounce Rate */}
        <div className="bg-[#0b0f16] border border-[#1b2533] p-2.5 rounded">
          <span className="text-[#64768c] text-[10px] uppercase block">Bounce Rate</span>
          <span className={`text-lg font-bold font-mono ${stats.bounceRate > 5 ? 'text-[#e78284]' : stats.bounceRate > 2 ? 'text-[#e5c890]' : 'text-[#a6d189]'}`}>
            {stats.bounceRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#64768c] block">
            {stats.bounceRate > 5 ? 'High Risk' : stats.bounceRate > 2 ? 'Warning' : 'Healthy'}
          </span>
        </div>

        {/* 5. Avg Latency */}
        <div className="bg-[#0b0f16] border border-[#1b2533] p-2.5 rounded col-span-2 sm:col-span-1">
          <span className="text-[#64768c] text-[10px] uppercase block">Avg Latency</span>
          <span className="text-lg font-bold text-[#7dc4e4] font-mono">
            {stats.avgLatencyMs ? `${Math.round(stats.avgLatencyMs)}ms` : '--'}
          </span>
          <span className="text-[10px] text-[#4d5f75] block">SMTP handshake</span>
        </div>
      </div>
    </div>
  );
};
