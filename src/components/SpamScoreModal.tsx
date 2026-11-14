import React from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle2, Zap, ArrowRight, Info } from 'lucide-react';
import { SpamReport } from '../utils/spamChecker.ts';

interface SpamScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SpamReport;
  onApplyUnsubscribeFix: () => void;
}

export const SpamScoreModal: React.FC<SpamScoreModalProps> = ({
  isOpen,
  onClose,
  report,
  onApplyUnsubscribeFix
}) => {
  if (!isOpen) return null;

  const getMeterColor = () => {
    if (report.score > 70) return '#e78284';
    if (report.score > 40) return '#ef9f76';
    if (report.score > 20) return '#e5c890';
    return '#a6d189';
  };

  const getRiskBadge = () => {
    switch (report.riskLevel) {
      case 'critical':
        return { text: 'CRITICAL SPAM RISK', bg: 'bg-[#e78284]/20 text-[#e78284] border-[#e78284]' };
      case 'high':
        return { text: 'HIGH SPAM RISK', bg: 'bg-[#ef9f76]/20 text-[#ef9f76] border-[#ef9f76]' };
      case 'moderate':
        return { text: 'MODERATE RISK', bg: 'bg-[#e5c890]/20 text-[#e5c890] border-[#e5c890]' };
      default:
        return { text: 'INBOX READY / OPTIMAL', bg: 'bg-[#a6d189]/20 text-[#a6d189] border-[#a6d189]' };
    }
  };

  const riskBadge = getRiskBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#101620] border border-[#1f2b3b] rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-[#c5d1de] text-xs">
        {/* Header */}
        <div className="bg-[#141b26] border-b border-[#1f2b3b] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#179299]" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                Anti-Spam Filter Score Diagnostic
              </h2>
              <p className="text-[11px] text-[#788a9f]">
                Evaluates deliverability against RFC spam filter heuristics & keyword penalties
              </p>
            </div>
          </div>
          <button
            aria-label="Close spam diagnostic"
            onClick={onClose}
            className="text-[#788a9f] hover:text-white p-1 rounded hover:bg-[#1f2b3b] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Top Score Banner */}
          <div className="bg-[#0b0f16] border border-[#1b2533] p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Circular Gauge Representation */}
              <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-4 border-[#1c2635]">
                <div
                  className="absolute inset-0 rounded-full border-4 border-t-transparent border-l-transparent transition-all duration-500"
                  style={{ borderColor: getMeterColor(), transform: `rotate(${(report.score / 100) * 360}deg)` }}
                />
                <div className="text-center">
                  <div className="text-lg font-bold text-white leading-tight">{report.score}</div>
                  <div className="text-[9px] text-[#718298] uppercase">/ 100</div>
                </div>
              </div>

              <div>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${riskBadge.bg}`}>
                  {riskBadge.text}
                </span>
                <p className="text-[#a4b5cb] text-xs mt-1.5 font-sans">
                  {report.verdict}
                </p>
                <div className="text-[11px] text-[#63758b] mt-0.5">
                  SpamAssassin points: <strong className="text-white">{report.rawSpamAssassinPoints}</strong> (Target: &lt; 2.5)
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#121924] p-3 rounded border border-[#1d2737] w-full sm:w-auto">
              <div>
                <span className="text-[#64768c] block">Subject Caps:</span>
                <span className="text-white font-bold">{report.stats.capsRatioSubject}%</span>
              </div>
              <div>
                <span className="text-[#64768c] block">Body Caps:</span>
                <span className="text-white font-bold">{report.stats.capsRatioBody}%</span>
              </div>
              <div>
                <span className="text-[#64768c] block">Hyperlinks:</span>
                <span className="text-white font-bold">{report.stats.linkCount}</span>
              </div>
              <div>
                <span className="text-[#64768c] block">Opt-out / Unsub:</span>
                <span className={report.stats.hasUnsubscribe ? 'text-[#a6d189] font-bold' : 'text-[#e78284] font-bold'}>
                  {report.stats.hasUnsubscribe ? 'Detected' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#e5c890]" />
                <span>Deliverability Optimizations:</span>
              </h3>
              <div className="space-y-1.5">
                {report.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded bg-[#131b26] border border-[#202d3e] flex items-center justify-between gap-3 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-[#179299] shrink-0" />
                      <span>{rec}</span>
                    </div>
                    {rec.toLowerCase().includes('unsubscribe') && (
                      <button
                        onClick={onApplyUnsubscribeFix}
                        className="px-2 py-1 rounded bg-[#179299] text-black font-bold text-[10px] hover:bg-[#1ab0b8] cursor-pointer shrink-0 transition"
                      >
                        Auto-Insert Unsubscribe
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Triggered Filter Rules Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#7dc4e4]" />
              <span>Inspection Breakdown ({report.ruleHits.length} rules checked):</span>
            </h3>

            <div className="space-y-2">
              {report.ruleHits.map((rule) => {
                const isPositive = rule.points > 0;
                return (
                  <div
                    key={rule.id}
                    className={`p-3 rounded border text-[11px] ${
                      isPositive
                        ? 'bg-[#141821] border-[#291f24]'
                        : 'bg-[#121c22] border-[#1b3531]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isPositive ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#e78284]" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#a6d189]" />
                        )}
                        <span className={isPositive ? 'text-[#f28779]' : 'text-[#a6d189]'}>
                          {rule.name}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isPositive ? 'bg-[#e78284]/20 text-[#e78284]' : 'bg-[#a6d189]/20 text-[#a6d189]'
                      }`}>
                        {isPositive ? `+${rule.points} pts` : `${rule.points} pts (Bonus)`}
                      </span>
                    </div>

                    <p className="text-[#8e9eb3]">{rule.description}</p>

                    {rule.matchedText && rule.matchedText.length > 0 && (
                      <div className="mt-1.5 text-[10px] text-[#e5c890] flex items-center gap-1">
                        <span>Matched tokens:</span>
                        <code className="bg-[#1d2737] px-1.5 py-0.5 rounded text-white">
                          {rule.matchedText.join(', ')}
                        </code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#141b26] border-t border-[#1f2b3b] px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] text-[#6c7d93]">
            Score recalculates automatically as you edit content
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#179299] hover:bg-[#1ab0b8] text-black font-bold cursor-pointer transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
