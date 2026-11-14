import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Mail,
  Server,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Key,
  ExternalLink,
  HelpCircle,
  Shuffle,
  Send
} from 'lucide-react';
import { SenderAccount, SmtpConfig } from '../types.ts';
import { GoogleAuthError, getAccessToken, sendEmailViaGmailApi } from '../utils/gmailAuth.ts';

export type AccountModalTab = 'accounts' | 'add_gmail' | 'add_smtp' | 'add_oauth';

interface MultiAccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: SenderAccount[];
  activeAccountId: string;
  onSetActiveAccount: (id: string) => void;
  onToggleAccountActive: (id: string) => void;
  onAddAccount: (account: SenderAccount) => void;
  onRemoveAccount: (id: string) => void;
  onDisconnectAll?: () => void;
  isRotatingSenders: boolean;
  onToggleRotateSenders: (rotate: boolean) => void;
  onConnectGoogleOAuth: (requestRestrictedScopes?: boolean) => Promise<GoogleAuthError | undefined>;
  isConnectingOAuth: boolean;
  initialTab?: AccountModalTab;
}

export const MultiAccountManagerModal: React.FC<MultiAccountManagerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  onSetActiveAccount,
  onToggleAccountActive,
  onAddAccount,
  onRemoveAccount,
  onDisconnectAll,
  isRotatingSenders,
  onToggleRotateSenders,
  onConnectGoogleOAuth,
  isConnectingOAuth,
  initialTab = 'accounts'
}) => {
  const [activeTab, setActiveTab] = useState<AccountModalTab>(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // 1. Gmail App Password Form State
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailAppPass, setGmailAppPass] = useState('');
  const [gmailSenderName, setGmailSenderName] = useState('');
  const [isVerifyingGmail, setIsVerifyingGmail] = useState(false);
  const [gmailVerifyStatus, setGmailVerifyStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // 2. Custom SMTP Form State
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPass: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
    isSandbox: false
  });
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false);
  const [smtpVerifyStatus, setSmtpVerifyStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // 3. Live Test Email State (Send 1 real email to verify delivery)
  const [testRecipientEmail, setTestRecipientEmail] = useState(() => accounts[0]?.email || '');
  const [isSendingLiveTest, setIsSendingLiveTest] = useState(false);
  const [liveTestResult, setLiveTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (!testRecipientEmail && accounts.length > 0) {
      setTestRecipientEmail(accounts[0].email);
    }
  }, [accounts, testRecipientEmail]);

  // 4. OAuth Error banner state
  const [oauthError, setOauthError] = useState<GoogleAuthError | null>(null);

  // Quick Presets for Popular Email Relays (Bypasses Google verification hurdles)
  const handleApplyPreset = (preset: 'brevo' | 'resend' | 'sendgrid' | 'outlook' | 'yahoo') => {
    if (preset === 'brevo') {
      setSmtpForm({
        ...smtpForm,
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        user: smtpForm.user || '',
        fromName: smtpForm.fromName || 'Campaign Team',
        fromEmail: smtpForm.fromEmail || '',
        isSandbox: false
      });
    } else if (preset === 'resend') {
      setSmtpForm({
        ...smtpForm,
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        user: 'resend',
        fromName: smtpForm.fromName || 'Campaign Team',
        fromEmail: smtpForm.fromEmail || '',
        isSandbox: false
      });
    } else if (preset === 'sendgrid') {
      setSmtpForm({
        ...smtpForm,
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        user: 'apikey',
        fromName: smtpForm.fromName || 'Notifications',
        fromEmail: smtpForm.fromEmail || '',
        isSandbox: false
      });
    } else if (preset === 'outlook') {
      setSmtpForm({
        ...smtpForm,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        user: smtpForm.user || '',
        fromName: smtpForm.fromName || '',
        fromEmail: smtpForm.fromEmail || '',
        isSandbox: false
      });
    } else if (preset === 'yahoo') {
      setSmtpForm({
        ...smtpForm,
        host: 'smtp.mail.yahoo.com',
        port: 465,
        secure: true,
        user: smtpForm.user || '',
        fromName: smtpForm.fromName || '',
        fromEmail: smtpForm.fromEmail || '',
        isSandbox: false
      });
    }
  };

  if (!isOpen) return null;

  // Handle Universal Gmail Verification & Add (Live Google SMTP with App Password)
  const handleVerifyAndAddGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailEmail || !gmailAppPass) {
      setGmailVerifyStatus({
        success: false,
        message: 'Please enter both your Gmail address and 16-character App Password.'
      });
      return;
    }

    setIsVerifyingGmail(true);
    setGmailVerifyStatus(null);

    const cleanPass = gmailAppPass.replace(/\s+/g, '');
    const cleanEmail = gmailEmail.trim().toLowerCase();

    const testPayload: SmtpConfig = {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: cleanEmail,
      pass: cleanPass,
      fromName: gmailSenderName || cleanEmail.split('@')[0],
      fromEmail: cleanEmail,
      replyTo: cleanEmail,
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapUser: cleanEmail,
      imapPass: cleanPass,
      isSandbox: false
    };

    try {
      const res = await fetch('/api/smtp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`API endpoint unavailable (${res.status}). If hosting on a static or cPanel server, ensure the /api handler is installed.`);
      }
      const data = await res.json();

      if (res.ok && data.success) {
        setGmailVerifyStatus({
          success: true,
          message: `✓ Connected! Real handshake verified with Google SMTP (${cleanEmail}).`
        });

        const newAccount: SenderAccount = {
          id: `gmail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: gmailSenderName || cleanEmail.split('@')[0],
          email: cleanEmail,
          type: 'gmail_app_pass',
          isActive: true,
          smtpConfig: testPayload,
          sentCount: 0,
          bouncedCount: 0,
          status: 'ready'
        };

        onAddAccount(newAccount);
        onSetActiveAccount(newAccount.id);

        setTimeout(() => {
          setGmailEmail('');
          setGmailAppPass('');
          setGmailSenderName('');
          setGmailVerifyStatus(null);
          setActiveTab('accounts');
        }, 1200);
      } else {
        setGmailVerifyStatus({
          success: false,
          message: data.message || 'Google SMTP authentication failed. Please verify 2-Step Verification is ON and your 16-character App Password was generated at myaccount.google.com/apppasswords.'
        });
      }
    } catch (err: any) {
      setGmailVerifyStatus({
        success: false,
        message: err.message || 'Network connection failed.'
      });
    } finally {
      setIsVerifyingGmail(false);
    }
  };

  // Handle Custom SMTP Verification & Add
  const handleVerifyAndAddSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpForm.host || !smtpForm.user || !smtpForm.pass) {
      setSmtpVerifyStatus({
        success: false,
        message: 'Host, username/email, and password/key are required.'
      });
      return;
    }

    setIsVerifyingSmtp(true);
    setSmtpVerifyStatus(null);

    try {
      const res = await fetch('/api/smtp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm)
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`API endpoint unavailable (${res.status}). If hosting on a static or cPanel server, ensure the /api handler is installed.`);
      }
      const data = await res.json();

      if (res.ok && data.success) {
        setSmtpVerifyStatus({ success: true, message: data.message });

        const newAccount: SenderAccount = {
          id: `smtp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: smtpForm.fromName || smtpForm.user.split('@')[0],
          email: smtpForm.fromEmail || smtpForm.user,
          type: 'custom_smtp',
          isActive: true,
          smtpConfig: {
            ...smtpForm,
            isSandbox: false
          },
          sentCount: 0,
          bouncedCount: 0,
          status: 'ready'
        };

        onAddAccount(newAccount);
        onSetActiveAccount(newAccount.id);
        setTimeout(() => {
          setActiveTab('accounts');
          setSmtpVerifyStatus(null);
        }, 1200);
      } else {
        setSmtpVerifyStatus({ success: false, message: data.message || 'SMTP Handshake failed.' });
      }
    } catch (err: any) {
      setSmtpVerifyStatus({ success: false, message: err.message || 'Network error verifying server.' });
    } finally {
      setIsVerifyingSmtp(false);
    }
  };

  // Trigger 1 Live Test Email to confirm real delivery to inbox
  const handleSendLiveTestEmail = async (account: SenderAccount) => {
    if (!testRecipientEmail) {
      setLiveTestResult({ success: false, message: 'Please enter a recipient email address for the test.' });
      return;
    }

    setIsSendingLiveTest(true);
    setLiveTestResult(null);

    // Route A: Gmail OAuth 2.0 Account (Dispatch via client-side Gmail API)
    if (account.type === 'gmail_oauth') {
      try {
        let token = account.oauthAccessToken;
        if (!token) {
          token = (await getAccessToken()) || undefined;
        }

        if (token && token !== 'google_authenticated_token') {
          const testTimestamp = new Date().toISOString();
          const fromStr = `"${account.name || 'ArchMail User'}" <${account.email}>`;
          const gmailResult = await sendEmailViaGmailApi({
            accessToken: token,
            to: testRecipientEmail.trim(),
            from: fromStr,
            subject: '[ArchMail Test] Live Delivery Verification',
            body: `<div style="font-family: sans-serif; background: #0e131b; color: #fff; padding: 24px; border-radius: 8px;">
              <h2 style="color: #179299; margin-top: 0;">✓ ArchMail Live Delivery Test</h2>
              <p>This email confirms that your connected account (<strong>${account.email}</strong>) is authenticated via Google OAuth 2.0 and delivering real messages to inboxes.</p>
              <p style="color: #8fa4bc; font-size: 12px;">Sent to: <strong>${testRecipientEmail.trim()}</strong> &bull; Timestamp: ${testTimestamp}</p>
            </div>`,
            isHtml: true
          });

          if (gmailResult.success) {
            setLiveTestResult({
              success: true,
              message: `✓ Success! Test email delivered to ${testRecipientEmail.trim()} via Gmail REST API! Message ID: ${gmailResult.messageId || 'OK'}`
            });
            setIsSendingLiveTest(false);
            return;
          }

          const rawError = gmailResult.error || 'Gmail dispatch error';
          let failureMessage = `Gmail API error (${gmailResult.code}): ${rawError}`;
          
          if (/API has not been used|disabled/i.test(rawError)) {
            failureMessage = `Gmail API is disabled on project "archmail-dispatcher". Please enable "Gmail API" in Google Cloud Console.`;
          } else if (gmailResult.code === 403 && /scope|permission|insufficient/i.test(rawError)) {
            failureMessage = `Google requires "Send email on your behalf" permission scope. Click "Authorize Send Scope" to re-authorize.`;
          }

          setLiveTestResult({
            success: false,
            message: failureMessage
          });
          setIsSendingLiveTest(false);
          return;
        }
      } catch (err: any) {
        // Fall back to server SMTP if configured
      }
    }

    // Route B: SMTP / Gmail App Password
    if (!account.smtpConfig || !account.smtpConfig.pass || account.smtpConfig.pass === 'google_authenticated') {
      setLiveTestResult({
        success: false,
        message: 'This account requires a 16-character Google App Password or SMTP password to deliver via SMTP. Please use the "Connect Gmail (App Password)" tab.'
      });
      setIsSendingLiveTest(false);
      return;
    }

    try {
      const res = await fetch('/api/email/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: account.smtpConfig,
          targetEmail: testRecipientEmail.trim()
        })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`API endpoint unavailable (${res.status} ${res.statusText}). If hosting on a static or cPanel server, ensure the /api handler is installed.`);
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setLiveTestResult({
          success: true,
          message: `✓ Success! Real test email delivered to ${testRecipientEmail}. Message ID: ${data.messageId || 'OK'}. Please check your inbox and Sent folder!`
        });
      } else {
        setLiveTestResult({
          success: false,
          message: data.message || 'Failed to send test email. Please check your credentials.'
        });
      }
    } catch (err: any) {
      setLiveTestResult({
        success: false,
        message: err.message || 'Failed to dispatch test email.'
      });
    } finally {
      setIsSendingLiveTest(false);
    }
  };

  // Trigger Google OAuth Sign-in with Send Permission
  const handleOAuthConnect = async (requestRestrictedScopes: boolean = true) => {
    setOauthError(null);
    setLiveTestResult(null);
    const err = await onConnectGoogleOAuth(requestRestrictedScopes);
    if (err) {
      setOauthError(err);
    } else {
      setActiveTab('accounts');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 font-mono text-xs text-[#c5d1de]">
      <div className="bg-[#101620] border border-[#1f2b3b] rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#141b26] border-b border-[#1f2b3b] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#179299]" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <span>Multi-Account Dispatcher & Senders</span>
                <span className="text-[10px] bg-[#1a2536] text-[#7dc4e4] px-1.5 py-0.5 rounded border border-[#27384e]">
                  {accounts.length} Connected
                </span>
              </h2>
              <p className="text-[11px] text-[#788a9f]">
                Real email delivery via Google SMTP (App Password), Free Relays (Brevo, Resend, Outlook), or Custom SMTP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#788a9f] hover:text-white p-1 rounded hover:bg-[#1f2b3b] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Client-Side Privacy Notice */}
        <div className="bg-[#0b1017] border-b border-[#1b2738] px-5 py-2 flex items-center justify-between text-[11px] text-[#7dc4e4]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#179299]"></span>
            <span><strong>Private to your browser:</strong> Accounts you add are stored solely in your device&apos;s localStorage. No credentials or accounts are saved on the server.</span>
          </div>
          {accounts.length > 0 && onDisconnectAll && (
            <button
              onClick={onDisconnectAll}
              className="text-[#e78284] hover:underline font-bold text-[10px] cursor-pointer"
            >
              Clear My Accounts
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1f2b3b] bg-[#0c1118] px-4 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-2 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'accounts'
                ? 'border-[#179299] text-[#7dc4e4] bg-[#141b26] rounded-t'
                : 'border-transparent text-[#788a9f] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Connected Senders ({accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add_gmail')}
            className={`px-3 py-2 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'add_gmail'
                ? 'border-[#179299] text-[#7dc4e4] bg-[#141b26] rounded-t'
                : 'border-transparent text-[#788a9f] hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[#e5c890]" />
            <span>Connect Gmail (App Password)</span>
          </button>

          <button
            onClick={() => setActiveTab('add_smtp')}
            className={`px-3 py-2 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'add_smtp'
                ? 'border-[#179299] text-[#7dc4e4] bg-[#141b26] rounded-t'
                : 'border-transparent text-[#788a9f] hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-[#179299]" />
            <span>Free Relays & Custom SMTP</span>
            <span className="text-[9px] bg-[#179299]/20 text-[#7dc4e4] px-1 rounded font-bold">Brevo / Resend</span>
          </button>

          <button
            onClick={() => setActiveTab('add_oauth')}
            className={`px-3 py-2 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'add_oauth'
                ? 'border-[#179299] text-[#7dc4e4] bg-[#141b26] rounded-t'
                : 'border-transparent text-[#788a9f] hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google OAuth 2.0</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: ACCOUNTS LIST & ROTATION CONTROLS */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              {/* Auto-Rotation Feature Banner */}
              <div className="bg-[#0b0f16] border border-[#1b2533] p-3.5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-[#179299]" />
                    <span className="font-bold text-white text-xs">
                      Round-Robin Auto-Rotation
                    </span>
                    <span className="text-[10px] bg-[#179299]/20 text-[#7dc4e4] px-1.5 py-0.2 rounded font-bold">
                      HIGH VOLUME
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8fa4bc]">
                    Distribute outgoing bulk queue evenly across all checked accounts (Email 1 with Account A, Email 2 with Account B). Prevents rate limits and optimizes delivery speed.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-[#131b26] border border-[#233347] px-3 py-2 rounded shrink-0">
                  <input
                    type="checkbox"
                    checked={isRotatingSenders}
                    onChange={(e) => onToggleRotateSenders(e.target.checked)}
                    className="accent-[#179299] w-4 h-4 rounded"
                  />
                  <span className={`font-bold text-xs ${isRotatingSenders ? 'text-[#a6d189]' : 'text-[#899cb4]'}`}>
                    {isRotatingSenders ? 'ROTATION ACTIVE' : 'ENABLE ROTATION'}
                  </span>
                </label>
              </div>

              {/* Live Test Send Quick Bar (Send 1 real email to verify delivery) */}
              {accounts.length > 0 && (
                <div className="bg-[#0e1622] border border-[#1d2f44] p-3.5 rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Send className="w-3.5 h-3.5 text-[#179299]" />
                      <span>Send 1 Live Test Email to My Inbox</span>
                    </div>
                    <span className="text-[10px] text-[#7dc4e4]">Verify real inbox arrival before bulk sending</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      placeholder="Enter email to receive test (e.g. your-email@gmail.com)"
                      className="flex-1 bg-[#090d14] border border-[#23344a] rounded px-3 py-1.5 text-white placeholder-[#4c5f76] focus:border-[#179299] focus:outline-hidden text-xs"
                    />
                    <button
                      type="button"
                      disabled={isSendingLiveTest || !accounts.find(a => a.id === activeAccountId || a.isActive)}
                      onClick={() => {
                        const acc = accounts.find(a => a.id === activeAccountId) || accounts[0];
                        if (acc) handleSendLiveTestEmail(acc);
                      }}
                      className="px-4 py-1.5 bg-[#179299] hover:bg-[#1db0b8] text-black font-bold rounded cursor-pointer transition flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                    >
                      {isSendingLiveTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isSendingLiveTest ? 'Delivering...' : 'Send Live Test'}</span>
                    </button>
                  </div>
                  {liveTestResult && (
                    <div className={`p-2.5 rounded border text-[11px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                      liveTestResult.success
                        ? 'bg-[#12241d] border-[#1f4a38] text-[#a6d189]'
                        : 'bg-[#26151c] border-[#4d1f2b] text-[#e78284]'
                    }`}>
                      <div className="flex items-center gap-2">
                        {liveTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                        <span>{liveTestResult.message}</span>
                      </div>
                      {!liveTestResult.success && liveTestResult.message?.includes('OAuth') && (
                        <button
                          type="button"
                          onClick={() => handleOAuthConnect(true)}
                          className="px-2.5 py-1 bg-[#179299] hover:bg-[#1ab0b8] text-black font-bold rounded text-[10px] shrink-0 cursor-pointer transition shadow-sm"
                        >
                          Authorize Send Scope &rarr;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* List of Connected Sender Accounts */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#8fa4bc] uppercase tracking-wider flex items-center justify-between">
                  <span>Sender Accounts ({accounts.length})</span>
                  {accounts.length > 0 && onDisconnectAll && (
                    <button
                      onClick={onDisconnectAll}
                      className="text-[#e78284] hover:text-[#f8a8a9] bg-[#22151c] hover:bg-[#341b26] border border-[#48222d] px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                      title="Disconnect all accounts from the system"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Disconnect All</span>
                    </button>
                  )}
                </div>

                {accounts.length === 0 ? (
                  <div className="p-6 text-center bg-[#0c1017] border border-dashed border-[#233144] rounded-lg space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#172332] text-[#7dc4e4] flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6 text-[#179299]" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">No Senders Connected</p>
                      <p className="text-xs text-[#8fa4bc] mt-1 max-w-md mx-auto">
                        Connect your Gmail account via App Password, or choose a free SMTP relay (Brevo, Resend, Outlook) to begin sending real emails.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-2 text-left">
                      {/* Option 1: Gmail App Password */}
                      <button
                        onClick={() => setActiveTab('add_gmail')}
                        className="p-3 bg-[#131b26] hover:bg-[#1a2536] border border-[#233347] hover:border-[#e5c890]/60 rounded-lg transition cursor-pointer flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-[#e5c890]" />
                          <span className="font-bold text-white text-xs">Gmail App Password</span>
                        </div>
                        <span className="text-[10px] text-[#788a9f]">Connect your Gmail with 16-character App Password</span>
                      </button>

                      {/* Option 2: Free Relays (Brevo / Resend / Outlook) */}
                      <button
                        onClick={() => setActiveTab('add_smtp')}
                        className="p-3 bg-[#131b26] hover:bg-[#1a2536] border border-[#233347] hover:border-[#179299]/60 rounded-lg transition cursor-pointer flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-[#179299]" />
                          <span className="font-bold text-white text-xs">Free SMTP Relays</span>
                        </div>
                        <span className="text-[10px] text-[#788a9f]">Brevo (300/day free), Resend, or Outlook (Zero Google blocks)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  accounts.map((acc) => {
                    const isSelected = activeAccountId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        className={`p-3.5 rounded-lg border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#131b26] border-[#179299]/60 shadow-md shadow-[#179299]/5'
                            : 'bg-[#0d131c] border-[#1a2535] hover:border-[#27384e]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={acc.isActive}
                            onChange={() => onToggleAccountActive(acc.id)}
                            title="Toggle participation in round-robin rotation"
                            className="accent-[#179299] w-4 h-4 rounded cursor-pointer"
                          />

                          <div className="w-8 h-8 rounded-full bg-[#1b2535] border border-[#27374b] flex items-center justify-center font-bold text-xs text-[#7dc4e4] shrink-0">
                            {acc.name ? acc.name.substring(0, 2).toUpperCase() : acc.email.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">
                                {acc.name || acc.email.split('@')[0]}
                              </span>
                              <span className="text-[10px] text-[#788a9f]">
                                &lt;{acc.email}&gt;
                              </span>
                              {acc.type === 'gmail_app_pass' && (
                                <span className="text-[9px] bg-[#a6d189]/15 text-[#a6d189] px-1.5 py-0.2 rounded border border-[#a6d189]/30">
                                  Gmail SMTP
                                </span>
                              )}
                              {acc.type === 'gmail_oauth' && (
                                <span className="text-[9px] bg-[#4285F4]/15 text-[#7dc4e4] px-1.5 py-0.2 rounded border border-[#4285F4]/30">
                                  OAuth 2.0
                                </span>
                              )}
                              {acc.type === 'custom_smtp' && (
                                <span className="text-[9px] bg-[#f9e2af]/15 text-[#f9e2af] px-1.5 py-0.2 rounded border border-[#f9e2af]/30">
                                  SMTP Relay
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-[#71849c]">
                              <span>Status: <strong className="text-[#a6d189]">READY (LIVE)</strong></span>
                              <span>•</span>
                              <span>Host: {acc.smtpConfig?.host || 'smtp.gmail.com'}:{acc.smtpConfig?.port || 465}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right text-[11px] font-mono mr-2">
                            <span className="text-[#a6d189]">Sent: <strong>{acc.sentCount}</strong></span>
                            <span className="text-[#e78284] ml-2">Bounces: <strong>{acc.bouncedCount}</strong></span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSendLiveTestEmail(acc)}
                              disabled={isSendingLiveTest}
                              title="Send 1 real test email from this account to test delivery"
                              className="px-2 py-1 rounded text-[11px] bg-[#162332] hover:bg-[#1f3147] text-[#7dc4e4] border border-[#253952] cursor-pointer flex items-center gap-1 transition"
                            >
                              <Send className="w-3 h-3 text-[#179299]" />
                              <span>Test</span>
                            </button>

                            {!isRotatingSenders && (
                              <button
                                onClick={() => onSetActiveAccount(acc.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-[#179299] text-black'
                                    : 'bg-[#172332] text-[#8fa4bc] hover:bg-[#1f2f44] border border-[#26374f]'
                                }`}
                              >
                                {isSelected ? 'Active' : 'Set Active'}
                              </button>
                            )}

                            <button
                              onClick={() => onRemoveAccount(acc.id)}
                              title="Disconnect this account"
                              className="p-1 rounded text-[#8fa4bc] hover:text-[#e78284] hover:bg-[#2b1820] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Account Actions Bar */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('add_gmail')}
                  className="px-3.5 py-2 rounded bg-[#179299] hover:bg-[#1ab0b8] text-black font-bold flex items-center gap-1.5 text-xs cursor-pointer shadow-md shadow-[#179299]/20"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>+ Connect Gmail (App Password)</span>
                </button>
                <button
                  onClick={() => setActiveTab('add_smtp')}
                  className="px-3 py-1.5 rounded bg-[#172332] hover:bg-[#203146] text-[#7dc4e4] border border-[#273d58] flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Free SMTP Relays (Brevo / Resend / Outlook)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GMAIL APP PASSWORD & STEP-BY-STEP FIX FOR "SETTING NOT AVAILABLE" */}
          {activeTab === 'add_gmail' && (
            <div className="space-y-4">
              {/* Detailed Breakdown for the User's Screenshot Error */}
              <div className="bg-[#16120e] border border-[#3b2c1f] p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-2.5 text-[#e5c890]">
                  <HelpCircle className="w-5 h-5 shrink-0 text-[#e5c890]" />
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Fixing Google: "The setting you are looking for is not available for your account"
                    </h4>
                    <p className="text-[11px] text-[#c9b183]">
                      Why Google showed you this error screen and how to enable App Passwords in 2 simple steps:
                    </p>
                  </div>
                </div>

                <div className="bg-[#1e1713] p-3 rounded border border-[#483424] space-y-2 text-[11px]">
                  <p className="text-[#d8c7b3] leading-relaxed">
                    Google <strong>locks and hides</strong> the App Passwords page unless <strong>2-Step Verification</strong> is switched <strong>ON</strong> first!
                  </p>
                  <div className="space-y-2 pt-1 text-[#f0dfcc]">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#179299] text-black font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                      <div>
                        <span>Open{' '}
                          <a
                            href="https://myaccount.google.com/signinoptions/two-step-verification"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#7dc4e4] underline font-bold inline-flex items-center gap-0.5"
                          >
                            Google 2-Step Verification Setup
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>{' '}
                          and turn it <strong>ON</strong> for your account.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#179299] text-black font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                      <div>
                        <span>Once 2-Step Verification is ON, open{' '}
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#7dc4e4] underline font-bold inline-flex items-center gap-0.5"
                          >
                            Google App Passwords
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>{' '}
                          (or search "App passwords" in Google account search bar). Enter name <strong>ArchMail</strong>, click <strong>Create</strong>, and copy the 16-letter code!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form to enter Gmail App Password */}
              <div className="bg-[#0b0f16] border border-[#1b2533] p-4 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#a6d189]" />
                  <span>Connect Live Gmail (Google SMTP)</span>
                </h3>

                <form onSubmit={handleVerifyAndAddGmail} className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[#899cb4] text-[11px] block">
                        Your Gmail Address: <span className="text-[#e78284]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={gmailEmail}
                        onChange={(e) => setGmailEmail(e.target.value)}
                        placeholder="youremail@gmail.com"
                        className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-2 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#899cb4] text-[11px] block">
                        Sender Display Name:
                      </label>
                      <input
                        type="text"
                        value={gmailSenderName}
                        onChange={(e) => setGmailSenderName(e.target.value)}
                        placeholder="e.g. Campaign Team (Optional)"
                        className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-2 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#899cb4] text-[11px] block">
                      Google App Password (16 characters): <span className="text-[#e78284]">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={gmailAppPass}
                      onChange={(e) => setGmailAppPass(e.target.value)}
                      placeholder="abcd efgh ijkl mnop"
                      className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-2 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden tracking-wider font-mono"
                    />
                    <p className="text-[10px] text-[#6d7e94]">
                      16-character generated password from myaccount.google.com/apppasswords. Spaces are stripped automatically.
                    </p>
                  </div>

                  {gmailVerifyStatus && (
                    <div className={`p-3 rounded border text-[11px] space-y-2 ${
                      gmailVerifyStatus.success
                        ? 'bg-[#12241d] border-[#1f4a38] text-[#a6d189]'
                        : 'bg-[#26151c] border-[#4d1f2b] text-[#e78284]'
                    }`}>
                      <div className="flex items-center gap-2">
                        {gmailVerifyStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                        <span>{gmailVerifyStatus.message}</span>
                      </div>
                      {!gmailVerifyStatus.success && (
                        <div className="pt-2 border-t border-[#4d1f2b] flex items-center justify-between text-xs">
                          <span className="text-[#a5adcb] text-[10px]">Cannot enable 2FA on Google?</span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('add_smtp')}
                            className="px-2.5 py-1 bg-[#172433] hover:bg-[#1f3248] text-[#7dc4e4] rounded border border-[#273d58] cursor-pointer transition font-medium text-[11px]"
                          >
                            Use Free Brevo / Outlook Relay Instead &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#1b2533]">
                    <button
                      type="button"
                      onClick={() => setActiveTab('accounts')}
                      className="px-3 py-1.5 rounded bg-[#182333] hover:bg-[#203046] text-[#8fa4bc]"
                    >
                      Back to Accounts
                    </button>

                    <button
                      type="submit"
                      disabled={isVerifyingGmail}
                      className="px-5 py-2 rounded bg-[#179299] hover:bg-[#1ab0b8] text-black font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-[#179299]/20"
                    >
                      {isVerifyingGmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing Live Handshake...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify & Add Gmail Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: FREE SMTP RELAYS & CUSTOM SERVER */}
          {activeTab === 'add_smtp' && (
            <div className="space-y-4">
              {/* Free ESP Presets */}
              <div className="bg-[#0b0f16] border border-[#1b2533] p-3.5 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#179299]" />
                    <span>Free Relay Presets (No Google Blocks or 2FA Restrictions)</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#8fa4bc]">
                  If your Google account cannot enable App Passwords or 2FA, use one of these high-deliverability relays:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('brevo')}
                    className="px-2.5 py-1 rounded bg-[#141d28] hover:bg-[#1b2737] border border-[#23354b] text-[#7dc4e4] text-xs font-semibold cursor-pointer"
                  >
                    Brevo (300 Free/Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('resend')}
                    className="px-2.5 py-1 rounded bg-[#141d28] hover:bg-[#1b2737] border border-[#23354b] text-[#7dc4e4] text-xs font-semibold cursor-pointer"
                  >
                    Resend (3,000 Free/Mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('outlook')}
                    className="px-2.5 py-1 rounded bg-[#141d28] hover:bg-[#1b2737] border border-[#23354b] text-[#7dc4e4] text-xs font-semibold cursor-pointer"
                  >
                    Outlook / Hotmail
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('yahoo')}
                    className="px-2.5 py-1 rounded bg-[#141d28] hover:bg-[#1b2737] border border-[#23354b] text-[#7dc4e4] text-xs font-semibold cursor-pointer"
                  >
                    Yahoo Mail
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleVerifyAndAddSmtp} className="space-y-3 bg-[#0b0f16] border border-[#1b2533] p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[#899cb4] text-[11px] block">SMTP Host</label>
                    <input
                      type="text"
                      required
                      value={smtpForm.host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      placeholder="smtp-relay.brevo.com or smtp.office365.com"
                      className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-1.5 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#899cb4] text-[11px] block">Port</label>
                    <input
                      type="number"
                      required
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value, 10) || 587, secure: parseInt(e.target.value, 10) === 465 })}
                      placeholder="587"
                      className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-1.5 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#899cb4] text-[11px] block">Username / SMTP Login</label>
                    <input
                      type="text"
                      required
                      value={smtpForm.user}
                      onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                      placeholder="your-login@domain.com or apikey"
                      className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-1.5 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#899cb4] text-[11px] block">Password / SMTP Key</label>
                    <input
                      type="password"
                      required
                      value={smtpForm.pass}
                      onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-1.5 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#899cb4] text-[11px] block">Display Name</label>
                    <input
                      type="text"
                      value={smtpForm.fromName}
                      onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                      placeholder="Campaign Team"
                      className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-1.5 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#899cb4] text-[11px] block">From Email Address</label>
                    <input
                      type="email"
                      value={smtpForm.fromEmail}
                      onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                      placeholder="sender@domain.com"
                      className="w-full bg-[#0a0e14] border border-[#233144] rounded px-3 py-1.5 text-white placeholder-[#45576d] focus:border-[#179299] focus:outline-hidden"
                    />
                  </div>
                </div>

                {smtpVerifyStatus && (
                  <div className={`p-3 rounded border text-[11px] flex items-center gap-2 ${
                    smtpVerifyStatus.success
                      ? 'bg-[#12241d] border-[#1f4a38] text-[#a6d189]'
                      : 'bg-[#26151c] border-[#4d1f2b] text-[#e78284]'
                  }`}>
                    {smtpVerifyStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{smtpVerifyStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#1b2533]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('accounts')}
                    className="px-3 py-1.5 rounded bg-[#182333] hover:bg-[#203046] text-[#8fa4bc]"
                  >
                    Back to Accounts
                  </button>

                  <button
                    type="submit"
                    disabled={isVerifyingSmtp}
                    className="px-5 py-2 rounded bg-[#179299] hover:bg-[#1ab0b8] text-black font-bold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {isVerifyingSmtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing Handshake...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify & Add SMTP Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: GOOGLE OAUTH 2.0 (WITH ERROR 403 EXPLANATION) */}
          {activeTab === 'add_oauth' && (
            <div className="space-y-4">
              <div className="bg-[#0b0f16] border border-[#1b2533] p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white p-2 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Google OAuth 2.0 Sign-In</span>
                    </h3>
                    <p className="text-[11px] text-[#7dc4e4]">
                      Connect via official Google Account authorization popup
                    </p>
                  </div>
                </div>

                {/* Explanation of Error 403 */}
                <div className="bg-[#121c27] border border-[#1e344d] p-3.5 rounded-lg space-y-2 text-[11px] text-[#9db0c6]">
                  <div className="flex items-center gap-2 font-bold text-[#f2b482]">
                    <AlertTriangle className="w-4 h-4 text-[#f2b482]" />
                    <span>Regarding Google Error 403 (access_denied):</span>
                  </div>
                  <p className="leading-relaxed text-[#8fa4bc]">
                    If Google shows <em>"App has not completed Google verification process (Error 403)"</em>, it means the Google Cloud OAuth app is restricted to developer test accounts.
                  </p>
                  <p className="text-[#a6d189] font-medium">
                    &rarr; <strong>Recommended:</strong> Use <strong>Gmail App Password</strong> (in the 2nd tab) or <strong>Free Relays (Brevo/Outlook)</strong> to send real emails with 100% reliability and zero Google Cloud OAuth blocks!
                  </p>
                </div>

                {oauthError && (
                  <div className="bg-[#29171f] border border-[#592635] p-3 rounded-lg space-y-2 text-[#e78284]">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#f28779]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Google Notice: {oauthError.message}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOAuthConnect(true)}
                    disabled={isConnectingOAuth}
                    className="px-5 py-2.5 rounded bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] font-semibold text-xs flex items-center gap-2.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isConnectingOAuth ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )}
                    <span>Sign In & Authorize Gmail Sending</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('add_gmail')}
                    className="text-[#7dc4e4] hover:underline font-bold text-xs"
                  >
                    Use Gmail App Password instead &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#141b26] border-t border-[#1f2b3b] px-5 py-3 flex items-center justify-between">
          <div className="text-[11px] text-[#6c7d93]">
            {isRotatingSenders
              ? `Rotation Active: Load balancing across ${accounts.filter(a => a.isActive).length} accounts`
              : `Single Sender Mode: ${accounts.find(a => a.id === activeAccountId)?.email || 'None'}`}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#179299] hover:bg-[#1ab0b8] text-black font-bold cursor-pointer transition shadow-md shadow-[#179299]/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
