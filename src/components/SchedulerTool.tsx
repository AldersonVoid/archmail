import React from 'react';
import { Clock, Shuffle } from 'lucide-react';
import { SchedulerConfig } from '../types.ts';

interface SchedulerToolProps {
  config: SchedulerConfig;
  onChange: (cfg: SchedulerConfig) => void;
  isSending: boolean;
}

const INTERVAL_PRESETS = [
  { label: '0s (Burst)', value: 0, desc: 'Instant bulk burst' },
  { label: '0.5s', value: 0.5, desc: '120 emails/min' },
  { label: '1.0s', value: 1.0, desc: '60 emails/min (Safe)' },
  { label: '2.0s', value: 2.0, desc: '30 emails/min' },
  { label: '5.0s', value: 5.0, desc: '12 emails/min (Warmup)' },
];

export const SchedulerTool: React.FC<SchedulerToolProps> = ({
  config,
  onChange,
  isSending
}) => {
  return (
    <div className="bg-[#101620] border border-[#1d2737] rounded-lg p-3.5 font-mono text-xs shadow-lg space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#179299]" />
          <span className="font-bold text-white tracking-wide uppercase text-xs">
            Interval Scheduler & Dispatch Timing
          </span>
        </div>
        <span className="text-[11px] text-[#7dc4e4] bg-[#172332] border border-[#24374f] px-2 py-0.5 rounded">
          {config.intervalSec === 0 ? 'Instant Burst (0s)' : `${config.intervalSec}s Interval`}
        </span>
      </div>

      {/* Interval presets row */}
      <div>
        <label className="text-[#899cb4] text-[11px] block mb-1.5">
          Dispatch Interval (Delay between outgoing emails):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {INTERVAL_PRESETS.map((preset) => {
            const isSelected = config.intervalSec === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange({ ...config, intervalSec: preset.value })}
                disabled={isSending}
                className={`p-2 rounded border text-left transition cursor-pointer disabled:opacity-40 ${
                  isSelected
                    ? 'bg-[#179299]/20 border-[#179299] text-[#7dc4e4]'
                    : 'bg-[#141b26] border-[#1f2b3b] text-[#9db0c6] hover:bg-[#1a2333]'
                }`}
              >
                <div className="font-bold text-white text-xs">{preset.label}</div>
                <div className="text-[9px] text-[#63758b] truncate">{preset.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Timing & Jitter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1b2533]">
        {/* Custom Interval Input */}
        <div className="space-y-1">
          <label className="text-[#899cb4] text-[11px] block">Custom Interval (Sec):</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              min="0"
              max="60"
              value={config.intervalSec}
              onChange={(e) => onChange({ ...config, intervalSec: Math.max(0, parseFloat(e.target.value) || 0) })}
              disabled={isSending}
              className="w-full bg-[#090d13] border border-[#233144] rounded px-2.5 py-1 text-white focus:border-[#179299] focus:outline-hidden"
            />
            <span className="text-[#64768c] text-[11px]">sec</span>
          </div>
        </div>

        {/* Human Jitter Toggle */}
        <div className="space-y-1 flex flex-col justify-center">
          <label className="text-[#899cb4] text-[11px] block">Anti-Throttle Jitter:</label>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={config.jitterEnabled}
              onChange={(e) => onChange({ ...config, jitterEnabled: e.target.checked })}
              disabled={isSending}
              className="accent-[#179299] w-4 h-4 rounded"
            />
            <span className="text-[#9db0c6] text-[11px] flex items-center gap-1">
              <Shuffle className="w-3 h-3 text-[#179299]" />
              <span>± 20% Variance (Mimic human)</span>
            </span>
          </label>
        </div>

        {/* Batch pause setting */}
        <div className="space-y-1">
          <label className="text-[#899cb4] text-[11px] block">Batch Rest Pause:</label>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[#64768c]">Every</span>
            <input
              type="number"
              min="0"
              max="500"
              value={config.batchSize || 0}
              onChange={(e) => onChange({ ...config, batchSize: parseInt(e.target.value, 10) || 0 })}
              disabled={isSending}
              className="w-16 bg-[#090d13] border border-[#233144] rounded px-1.5 py-1 text-white text-center focus:border-[#179299] focus:outline-hidden"
            />
            <span className="text-[#64768c]">pause</span>
            <input
              type="number"
              min="0"
              max="300"
              value={config.batchDelaySec || 0}
              onChange={(e) => onChange({ ...config, batchDelaySec: parseInt(e.target.value, 10) || 0 })}
              disabled={isSending}
              className="w-14 bg-[#090d13] border border-[#233144] rounded px-1.5 py-1 text-white text-center focus:border-[#179299] focus:outline-hidden"
            />
            <span className="text-[#64768c]">s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
