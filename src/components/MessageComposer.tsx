import React from 'react';
import { Mail, Code, FileText, Eye, ShieldAlert } from 'lucide-react';
import { BodyType } from '../types.ts';
import { SpamReport } from '../utils/spamChecker.ts';

interface MessageComposerProps {
  subject: string;
  onSubjectChange: (subj: string) => void;
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  textBody: string;
  onTextBodyChange: (text: string) => void;
  htmlBody: string;
  onHtmlBodyChange: (html: string) => void;
  onOpenPreview: () => void;
  onOpenSpamModal: () => void;
  spamReport: SpamReport;
  isSending: boolean;
}

const HTML_TEMPLATES = [
  {
    name: 'Minimal Dark Release',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 20px; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #c9d1d9; }
    .card { max-width: 580px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; background-color: rgba(23, 146, 153, 0.15); color: #7dc4e4; border-radius: 4px; font-size: 12px; font-weight: 600; font-family: monospace; }
    h1 { color: #ffffff; font-size: 22px; margin-top: 16px; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.6; color: #8b949e; }
    .btn { display: inline-block; background-color: #179299; color: #0d1117; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 6px; margin-top: 16px; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #21262d; font-size: 12px; color: #484f58; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">SYSTEM NOTICE // {random_id}</span>
    <h1>Critical Infrastructure Update for {name}</h1>
    <p>Hello {name},</p>
    <p>We are notifying all verified domains under <strong>{domain}</strong> regarding scheduled system upgrades and kernel telemetry enhancements.</p>
    <p>Please review your cluster status and confirm configuration parameters before {date}.</p>
    <a href="https://example.com/verify?id={random_id}" class="btn">View Node Dashboard &rarr;</a>
    <div class="footer">
      Sent to {email} &bull; <a href="https://example.com/unsubscribe?e={email}" style="color: #58a6ff; text-decoration: none;">Manage Notifications or Unsubscribe</a>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'Modern Clean Newsletter',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 24px 0; background-color: #f6f8fa; font-family: 'Helvetica Neue', Arial, sans-serif; color: #24292f; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #d0d7de; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { background: #179299; padding: 24px 32px; color: #ffffff; }
    .header h2 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
    .content { padding: 32px; font-size: 15px; line-height: 1.6; color: #333333; }
    .btn { display: inline-block; background-color: #0969da; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .footer { background: #f6f8fa; padding: 20px 32px; font-size: 12px; color: #6e7781; border-top: 1px solid #eaeef2; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Arch Engineering Dispatch</h2>
    </div>
    <div class="content">
      <p>Hi {name},</p>
      <p>Welcome to this edition of our developer briefing for {domain}. Here are the latest technical architecture notes and updates.</p>
      <p>Security protocols have been updated across all edge nodes as of {date}.</p>
      <a href="https://example.com/report" class="btn">Read Full Technical Report</a>
    </div>
    <div class="footer">
      Delivered to {email} &bull; <a href="https://example.com/optout" style="color: #0969da;">Click to Unsubscribe</a>
    </div>
  </div>
</body>
</html>`
  }
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  subject,
  onSubjectChange,
  bodyType,
  onBodyTypeChange,
  textBody,
  onTextBodyChange,
  htmlBody,
  onHtmlBodyChange,
  onOpenPreview,
  onOpenSpamModal,
  spamReport,
  isSending
}) => {
  const insertToken = (token: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      onSubjectChange(`${subject}${subject ? ' ' : ''}${token}`);
    } else {
      if (bodyType === 'text') {
        onTextBodyChange(`${textBody}${textBody ? ' ' : ''}${token}`);
      } else {
        onHtmlBodyChange(`${htmlBody}${htmlBody ? ' ' : ''}${token}`);
      }
    }
  };

  const loadTemplate = (html: string) => {
    onHtmlBodyChange(html);
  };

  const getScoreBadgeColor = () => {
    if (spamReport.score > 50) return 'bg-[#e78284]/20 text-[#e78284] border-[#e78284]/50';
    if (spamReport.score > 20) return 'bg-[#e5c890]/20 text-[#e5c890] border-[#e5c890]/50';
    return 'bg-[#a6d189]/20 text-[#a6d189] border-[#a6d189]/50';
  };

  return (
    <div className="bg-[#101620] border border-[#1d2737] rounded-lg flex flex-col font-mono text-xs overflow-hidden shadow-lg h-full">
      {/* Subject Line Header Bar */}
      <div className="bg-[#141c27] border-b border-[#1d2737] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#179299]" />
          <span className="font-bold text-white tracking-wide uppercase text-xs">
            Message Composition
          </span>
        </div>

        {/* Dynamic variable quick insertion pills */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[#6d7e94] hidden sm:inline">Tags:</span>
          {['{name}', '{email}', '{domain}', '{date}', '{random_id}'].map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertToken(token, 'body')}
              disabled={isSending}
              className="px-1.5 py-0.5 rounded bg-[#182333] hover:bg-[#203046] text-[#7dc4e4] border border-[#26374f] cursor-pointer text-[10px] transition"
              title={`Insert ${token} token`}
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Input Box */}
      <div className="p-3 bg-[#0d1219] border-b border-[#1b2533]">
        <div className="flex items-center gap-2">
          <label className="text-[#899cb4] font-medium text-[11px] min-w-[55px]">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            disabled={isSending}
            placeholder="e.g. Critical Node Update for {domain} [{random_id}]"
            className="flex-1 bg-[#090d13] border border-[#233144] rounded px-3 py-1.5 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden text-xs"
          />
        </div>
      </div>

      {/* Body Options Bar (Normal Text vs HTML Body + Preview Button + Spam Score) */}
      <div className="bg-[#121924] border-b border-[#1b2533] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* 2 Options as explicitly requested: Normal body vs HTML body */}
          <div className="flex bg-[#0a0e14] border border-[#1e2a3c] rounded p-0.5">
            <button
              type="button"
              onClick={() => onBodyTypeChange('text')}
              disabled={isSending}
              className={`px-3 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition ${
                bodyType === 'text'
                  ? 'bg-[#179299] text-black font-bold'
                  : 'text-[#899cb4] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Normal Body (Plain)</span>
            </button>
            <button
              type="button"
              onClick={() => onBodyTypeChange('html')}
              disabled={isSending}
              className={`px-3 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition ${
                bodyType === 'html'
                  ? 'bg-[#179299] text-black font-bold'
                  : 'text-[#899cb4] hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>HTML Body</span>
            </button>
          </div>

          {/* HTML Preset Templates dropdown if HTML selected */}
          {bodyType === 'html' && (
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-[#64768c] text-[10px]">Template:</span>
              {HTML_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => loadTemplate(tmpl.html)}
                  disabled={isSending}
                  className="px-1.5 py-0.5 rounded bg-[#182333] hover:bg-[#22334b] text-[#9db0c6] border border-[#233144] text-[10px] cursor-pointer"
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview Button & Spam Score Checker Trigger */}
        <div className="flex items-center gap-2">
          {/* HTML Preview Button */}
          <button
            type="button"
            onClick={onOpenPreview}
            className="px-2.5 py-1 rounded bg-[#182535] hover:bg-[#203248] text-[#7dc4e4] border border-[#2b3e58] flex items-center gap-1.5 text-[11px] cursor-pointer transition shadow-xs"
            title="Preview rendered HTML email"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Render</span>
          </button>

          {/* Spam Score Checker Button */}
          <button
            type="button"
            onClick={onOpenSpamModal}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-[11px] cursor-pointer transition ${getScoreBadgeColor()}`}
            title="Inspect Spam Risk Score & Filter Rules"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Spam Score: {spamReport.score}/100</span>
          </button>
        </div>
      </div>

      {/* Editor Body Textarea */}
      <div className="relative flex-1 min-h-[220px] bg-[#090d13]">
        {bodyType === 'text' ? (
          <textarea
            value={textBody}
            onChange={(e) => onTextBodyChange(e.target.value)}
            disabled={isSending}
            placeholder={`Type your email message here...

Hello {name},

Here is an important update regarding {domain}.
Reference ID: {random_id}

Best regards,
Arch Linux Security Team

To unsubscribe, reply with 'STOP'.`}
            spellCheck={false}
            className="w-full h-full min-h-[220px] p-3.5 bg-transparent text-[#e0eaf5] font-mono text-xs resize-none focus:outline-hidden leading-relaxed selection:bg-[#179299]/30"
          />
        ) : (
          <textarea
            value={htmlBody}
            onChange={(e) => onHtmlBodyChange(e.target.value)}
            disabled={isSending}
            placeholder={`<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; background: #0b0e14; color: #fff; padding: 20px;">
    <h2>Update for {name}</h2>
    <p>Your node {domain} has received release {random_id}.</p>
    <p><a href="https://example.com/unsub?e={email}" style="color: #179299;">Unsubscribe</a></p>
  </body>
</html>`}
            spellCheck={false}
            className="w-full h-full min-h-[220px] p-3.5 bg-transparent text-[#a6d189] font-mono text-xs resize-none focus:outline-hidden leading-relaxed selection:bg-[#179299]/30"
          />
        )}
      </div>

      {/* Footer Word & Character Counter */}
      <div className="bg-[#121924] border-t border-[#1d2737] px-3 py-1.5 flex items-center justify-between text-[11px] text-[#6d7e94]">
        <div>
          <span>Mode: </span>
          <span className="text-white font-medium">{bodyType === 'html' ? 'Rich HTML Code' : 'Plain Text (RFC 822)'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Length: <strong className="text-white">{bodyType === 'html' ? htmlBody.length : textBody.length}</strong> chars
          </span>
          <span>
            Words: <strong className="text-white">{spamReport.stats.wordCount}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
