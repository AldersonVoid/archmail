import React, { useState } from 'react';
import { X, Smartphone, Monitor, Tablet, Sun, Moon, Sparkles } from 'lucide-react';
import { substituteTokens } from '../utils/spamChecker.ts';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  bodyType: 'text' | 'html';
  textBody: string;
  htmlBody: string;
  fromName: string;
  fromEmail: string;
}

export const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({
  isOpen,
  onClose,
  subject,
  bodyType,
  textBody,
  htmlBody,
  fromName,
  fromEmail
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  if (!isOpen) return null;

  // Substitute sample recipient data to show authentic preview
  const sampleEmail = 'alex.chen@cyberdyne.org';
  const sampleName = 'Alex Chen';
  const renderedSubject = substituteTokens(subject || '(No Subject)', sampleEmail, sampleName);
  const rawContent = bodyType === 'html' ? htmlBody : `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 14px; line-height: 1.6;">${textBody}</pre>`;
  const renderedBody = substituteTokens(rawContent, sampleEmail, sampleName);

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile':
        return 'max-w-[390px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'max-w-4xl';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className={`bg-[#101620] border border-[#1f2b3b] rounded-lg shadow-2xl w-full ${getViewportWidth()} h-[85vh] flex flex-col overflow-hidden text-[#c5d1de] font-mono transition-all duration-200`}>
        {/* Preview Top Controls */}
        <div className="bg-[#141b26] border-b border-[#1f2b3b] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs tracking-wide uppercase">
              Email Render Preview
            </span>
            <span className="text-[10px] bg-[#1a2536] text-[#7dc4e4] px-1.5 py-0.5 rounded border border-[#27384e]">
              {bodyType.toUpperCase()} MODE
            </span>
          </div>

          {/* Viewport switchers */}
          <div className="flex items-center bg-[#0a0e14] border border-[#1e2a3c] rounded p-0.5 text-xs">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded cursor-pointer transition ${viewport === 'desktop' ? 'bg-[#179299] text-black font-bold' : 'text-[#899cb4] hover:text-white'}`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded cursor-pointer transition ${viewport === 'tablet' ? 'bg-[#179299] text-black font-bold' : 'text-[#899cb4] hover:text-white'}`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded cursor-pointer transition ${viewport === 'mobile' ? 'bg-[#179299] text-black font-bold' : 'text-[#899cb4] hover:text-white'}`}
              title="Mobile View (390px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Light / Dark email client backdrop */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded bg-[#182333] hover:bg-[#203046] text-[#899cb4] hover:text-white border border-[#26374f] cursor-pointer"
              title="Toggle Client Background (Dark / Light)"
            >
              {themeMode === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[#e5c890]" />}
            </button>
            <button
              onClick={onClose}
              className="text-[#788a9f] hover:text-white p-1 rounded hover:bg-[#1f2b3b] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Email Header Simulation */}
        <div className="bg-[#0c1017] border-b border-[#1b2533] px-5 py-3 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[#6c7d93] min-w-[50px]">Subject:</span>
            <span className="font-bold text-white font-sans text-sm">{renderedSubject}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#6c7d93] min-w-[50px]">From:</span>
            <span className="text-[#7dc4e4]">
              {fromName ? `"${fromName}" <${fromEmail || 'sender@domain.com'}>` : (fromEmail || 'sender@domain.com')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#6c7d93] min-w-[50px]">To:</span>
            <span className="text-[#9db0c6]">{sampleName} &lt;{sampleEmail}&gt;</span>
          </div>
        </div>

        {/* Render Frame */}
        <div className={`flex-1 overflow-auto p-4 flex justify-center ${themeMode === 'light' ? 'bg-[#e5e9f0]' : 'bg-[#080b0f]'}`}>
          <div className="w-full h-full flex flex-col bg-white rounded shadow-md overflow-hidden">
            <iframe
              srcDoc={renderedBody}
              title="Email HTML Preview"
              sandbox="allow-same-origin"
              className="w-full h-full border-none"
            />
          </div>
        </div>

        {/* Preview Footer */}
        <div className="bg-[#141b26] border-t border-[#1f2b3b] px-5 py-2.5 flex items-center justify-between text-[11px] text-[#6c7d93]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#179299]" />
            <span>Sample recipient tokens dynamically populated for preview</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#1b2533] hover:bg-[#233144] text-white cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
