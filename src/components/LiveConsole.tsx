import React, { useState } from 'react';
import { Terminal, Download, Trash2 } from 'lucide-react';
import { EmailLogEntry } from '../types.ts';

interface LiveConsoleProps {
  logs: EmailLogEntry[];
  onClearLogs: () => void;
  isSending: boolean;
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({
  logs,
  onClearLogs,
  isSending
}) => {
  const [filter, setFilter] = useState<'all' | 'sent' | 'bounced' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.status !== filter) return false;
    if (searchTerm && !log.recipient.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const exportCsv = () => {
    if (logs.length === 0) return;
    const header = 'Timestamp,Sender,Recipient,Status,Code,LatencyMs,Message\n';
    const rows = logs
      .map(l => `"${l.timestamp}","${l.senderEmail || 'default'}","${l.recipient}","${l.status}",${l.code},${l.latencyMs},"${(l.message || '').replace(/"/g, '""')}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archmail_dispatch_audit_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0b0e14] border border-[#1b2533] rounded-lg font-mono text-xs overflow-hidden shadow-xl flex flex-col h-[340px]">
      {/* Terminal Title Bar */}
      <div className="bg-[#121822] border-b border-[#1b2533] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          {/* Arch style traffic lights */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e78284]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#e5c890]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#a6d189]" />
          </div>
          <Terminal className="w-3.5 h-3.5 text-[#179299]" />
          <span className="font-bold text-white text-[11px] tracking-wider uppercase">
            tty1 // live delivery audit log
          </span>
          <span className="text-[10px] bg-[#1a2331] text-[#7dc4e4] px-1.5 py-0.5 rounded border border-[#27374b]">
            {logs.length} events
          </span>
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex bg-[#080b0f] border border-[#1e2a3c] rounded p-0.5 text-[10px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${filter === 'all' ? 'bg-[#179299] text-black font-bold' : 'text-[#899cb4] hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${filter === 'sent' ? 'bg-[#a6d189] text-black font-bold' : 'text-[#899cb4] hover:text-white'}`}
            >
              Sent OK
            </button>
            <button
              onClick={() => setFilter('bounced')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${filter === 'bounced' ? 'bg-[#e78284] text-black font-bold' : 'text-[#899cb4] hover:text-white'}`}
            >
              Bounces
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-2 py-0.5 rounded cursor-pointer transition ${filter === 'failed' ? 'bg-[#ef9f76] text-black font-bold' : 'text-[#899cb4] hover:text-white'}`}
            >
              Failed
            </button>
          </div>

          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            title="Export CSV Audit"
            className="p-1 rounded bg-[#16202c] hover:bg-[#1f2d3e] text-[#8fa4bc] hover:text-white border border-[#27384c] cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearLogs}
            disabled={isSending || logs.length === 0}
            title="Clear Console Output"
            className="p-1 rounded bg-[#16202c] hover:bg-[#2c1921] text-[#8fa4bc] hover:text-[#e78284] border border-[#27384c] cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] bg-[#070a0f] text-[#cad3f5] selection:bg-[#179299]/30">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#45576d] space-y-2 select-none py-10">
            <Terminal className="w-8 h-8 text-[#253243]" />
            <p>ArchMail daemon listening. Press "START BULK SEND" to dispatch queue.</p>
            <p className="text-[10px] text-[#344458]">Real-time SMTP handshake logs & NDR bounce detections will stream here.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-[#556980]">
            No log entries match the current filter "{filter}".
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            let statusBadge = '';
            let statusTextColor = '';

            if (log.status === 'sent') {
              statusBadge = '[SMTP 250 OK]';
              statusTextColor = 'text-[#a6d189]';
            } else if (log.status === 'bounced') {
              statusBadge = `[BOUNCE ${log.code || 550}]`;
              statusTextColor = 'text-[#e78284]';
            } else {
              statusBadge = `[FAIL ${log.code || 500}]`;
              statusTextColor = 'text-[#ef9f76]';
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 py-0.5 hover:bg-[#111721] px-1 rounded transition-colors"
              >
                <span className="text-[#516379] shrink-0">{timeStr}</span>
                <span className={`font-bold shrink-0 ${statusTextColor}`}>
                  {statusBadge}
                </span>
                {log.senderEmail && (
                  <span className="text-[#7dc4e4] shrink-0 max-w-[140px] truncate text-[10px] bg-[#141e2a] px-1 rounded border border-[#213144]">
                    {log.senderEmail}
                  </span>
                )}
                <span className="text-white font-medium shrink-0 max-w-[180px] truncate">
                  {log.recipient}
                </span>
                <span className="text-[#6c7f96] truncate flex-1">
                  &rarr; {log.message}
                </span>
                <span className="text-[#495b70] shrink-0 text-[10px]">
                  {log.latencyMs}ms
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Bar */}
      <div className="bg-[#0e141c] border-t border-[#17212e] px-3 py-1 flex items-center justify-between text-[10px] text-[#556980]">
        <div className="flex items-center gap-2">
          <span className="text-[#179299]">archlinux:~$</span>
          <span>systemd[1]: Unit archmail-daemon.service active (running)</span>
        </div>
        <div>
          <span>Filtered: {filteredLogs.length} / {logs.length}</span>
        </div>
      </div>
    </div>
  );
};
