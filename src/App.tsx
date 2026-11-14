/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HeaderBar } from './components/HeaderBar.tsx';
import { MultiAccountManagerModal, AccountModalTab } from './components/MultiAccountManagerModal.tsx';
import { RecipientBox } from './components/RecipientBox.tsx';
import { MessageComposer } from './components/MessageComposer.tsx';
import { HtmlPreviewModal } from './components/HtmlPreviewModal.tsx';
import { SpamScoreModal } from './components/SpamScoreModal.tsx';
import { SchedulerTool } from './components/SchedulerTool.tsx';
import { ProcessControls } from './components/ProcessControls.tsx';
import { LiveConsole } from './components/LiveConsole.tsx';
import { SmtpConfig, BodyType, EmailLogEntry, SchedulerConfig, SendingStats, SenderAccount, DispatchMode } from './types.ts';
import { parseEmailList, removeSentEmail, calculateBounceRate } from './utils/emailParser.ts';
import { analyzeSpamScore, substituteTokens } from './utils/spamChecker.ts';
import { initAuth, googleSignIn, logoutGmail, getAccessToken, sendEmailViaGmailApi, GmailUserProfile, GoogleAuthError } from './utils/gmailAuth.ts';
import { Mail, X } from 'lucide-react';

const INITIAL_RECIPIENTS = '';

const INITIAL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 24px; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #c9d1d9; }
    .card { max-width: 580px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 28px; }
    .tag { display: inline-block; padding: 3px 8px; background-color: rgba(23, 146, 153, 0.2); color: #7dc4e4; border-radius: 4px; font-size: 11px; font-family: monospace; font-weight: bold; }
    h2 { color: #ffffff; font-size: 20px; margin-top: 14px; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; color: #8b949e; }
    .btn { display: inline-block; background-color: #179299; color: #0d1117; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 6px; margin: 16px 0; font-size: 13px; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #21262d; font-size: 11px; color: #484f58; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="tag">ARCH PROTOCOL // {random_id}</span>
    <h2>Scheduled Maintenance Advisory for {name}</h2>
    <p>Hello {name},</p>
    <p>This is an automated operational briefing for domains hosted on <strong>{domain}</strong>. Edge relay nodes are receiving microcode stability patches on {date}.</p>
    <a href="https://example.com/status?id={random_id}" class="btn">Confirm Node Health &rarr;</a>
    <div class="footer">
      Sent to {email} &bull; <a href="https://example.com/unsubscribe?e={email}" style="color: #58a6ff; text-decoration: none;">Manage Notifications or Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_ACCOUNTS: SenderAccount[] = [];

export default function App() {
  // 1. Multi-Account Management State - Clean, 100% empty by default for all visitors
  const [accounts, setAccounts] = useState<SenderAccount[]>(() => {
    try {
      // Clean legacy keys to ensure fresh start
      [
        'archmail_accounts_v1',
        'archmail_accounts_v2',
        'archmail_accounts_v3',
        'archmail_accounts_v4',
        'archmail_user_accounts',
        'archmail_accounts'
      ].forEach((k) => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      const saved = localStorage.getItem('archmail_client_vault_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Storage error
    }
    return DEFAULT_ACCOUNTS;
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    return accounts[0]?.id || '';
  });

  const [isRotatingSenders, setIsRotatingSenders] = useState<boolean>(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountModalTab, setAccountModalTab] = useState<AccountModalTab>('add_gmail');
  const [isConnectingOAuth, setIsConnectingOAuth] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  // Sync accounts strictly to visitor's own browser localStorage
  useEffect(() => {
    try {
      localStorage.setItem('archmail_client_vault_v1', JSON.stringify(accounts));
    } catch (e) {
      // Storage error
    }
  }, [accounts]);

  // Active account reference (undefined if no accounts connected)
  const activeAccount = useMemo(() => {
    return accounts.find((a) => a.id === activeAccountId) || accounts[0] || undefined;
  }, [accounts, activeAccountId]);

  // 2. Recipient List State - Clean empty queue by default
  const [recipientText, setRecipientText] = useState<string>(INITIAL_RECIPIENTS);

  // 3. Message Composition State
  const [subject, setSubject] = useState<string>('Important Security Advisory for {domain} [{random_id}]');
  const [bodyType, setBodyType] = useState<BodyType>('html');
  const [textBody, setTextBody] = useState<string>(`Hello {name},\n\nThis is an automated operational briefing for domains on {domain}.\nMicrocode patches are being applied on {date}.\n\nReference: {random_id}\n\nTo opt-out or unsubscribe, reply with 'UNSUBSCRIBE'.`);
  const [htmlBody, setHtmlBody] = useState<string>(INITIAL_HTML);

  // 4. Interval Scheduler State
  const [schedulerConfig, setSchedulerConfig] = useState<SchedulerConfig>({
    intervalSec: 0.5,
    jitterEnabled: true,
    batchSize: 20,
    batchDelaySec: 2,
    scheduleTime: null,
    rotateSenders: true
  });

  // 5. Sending Execution & Stats State
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentlySendingEmail, setCurrentlySendingEmail] = useState<string | null>(null);
  const [currentSenderEmail, setCurrentSenderEmail] = useState<string | null>(null);
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [stats, setStats] = useState<SendingStats>({
    totalInitial: 0,
    sent: 0,
    bounced: 0,
    failed: 0,
    remaining: 0,
    bounceRate: 0,
    startTime: null,
    elapsedSec: 0,
    avgLatencyMs: 0,
    etaSec: 0
  });

  // Modals state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isSpamModalOpen, setIsSpamModalOpen] = useState<boolean>(false);

  // References for sending loop
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const recipientTextRef = useRef(recipientText);
  recipientTextRef.current = recipientText;
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;
  const isRotatingRef = useRef(isRotatingSenders);
  isRotatingRef.current = isRotatingSenders;

  // Real-time parsing of email list
  const parsedRecipients = useMemo(() => {
    return parseEmailList(recipientText);
  }, [recipientText]);

  // Keep remaining count synced when not sending
  useEffect(() => {
    if (!isSending) {
      setStats((prev) => ({
        ...prev,
        remaining: parsedRecipients.valid.length
      }));
    }
  }, [parsedRecipients.valid.length, isSending]);

  // Elapsed time timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isSending && !isPaused && stats.startTime) {
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (stats.startTime || Date.now())) / 1000);
        setStats((prev) => {
          const processed = prev.sent + prev.bounced + prev.failed;
          const remaining = parsedRecipients.valid.length;
          const ratePerSec = elapsed > 0 ? processed / elapsed : 0;
          const eta = ratePerSec > 0 ? Math.ceil(remaining / ratePerSec) : 0;
          return {
            ...prev,
            elapsedSec: elapsed,
            etaSec: eta
          };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSending, isPaused, stats.startTime, parsedRecipients.valid.length]);

  // Real-time spam score analysis
  const spamReport = useMemo(() => {
    const fromAddr = activeAccount?.email || 'sender@yourdomain.com';
    return analyzeSpamScore(
      subject,
      bodyType === 'html' ? htmlBody : textBody,
      bodyType === 'html',
      fromAddr
    );
  }, [subject, bodyType, htmlBody, textBody, activeAccount?.email]);

  // Account Management Actions
  const handleAddAccount = (account: SenderAccount) => {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.email.toLowerCase() === account.email.toLowerCase());
      if (exists) {
        return prev.map((a) => a.email.toLowerCase() === account.email.toLowerCase() ? account : a);
      }
      return [...prev, account];
    });
    setActiveAccountId(account.id);
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (activeAccountId === id) {
      const remaining = accounts.filter((a) => a.id !== id);
      setActiveAccountId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  const handleDisconnectAllAccounts = () => {
    setAccounts([]);
    setActiveAccountId('');
    try {
      localStorage.removeItem('archmail_client_vault_v1');
      [
        'archmail_accounts_v1',
        'archmail_accounts_v2',
        'archmail_accounts_v3',
        'archmail_accounts_v4',
        'archmail_user_accounts',
        'archmail_accounts'
      ].forEach((k) => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {
      // Storage error
    }
  };

  const handleToggleAccountActive = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  // Connect via Google OAuth 2.0 with detailed error return
  const handleConnectGoogleOAuth = async (requestRestrictedScopes: boolean = true): Promise<GoogleAuthError | undefined> => {
    setIsConnectingOAuth(true);
    try {
      const { result, error } = await googleSignIn(requestRestrictedScopes);

      if (error) {
        return error;
      }

      if (result) {
        const newOAuthAccount: SenderAccount = {
          id: `gmail_oauth_${result.profile.uid}`,
          name: result.profile.displayName,
          email: result.profile.email,
          type: 'gmail_oauth',
          isActive: true,
          oauthAccessToken: result.accessToken,
          photoURL: result.profile.photoURL,
          smtpConfig: {
            host: 'smtp.gmail.relay',
            port: 587,
            secure: false,
            user: result.profile.email,
            pass: 'google_authenticated',
            fromName: result.profile.displayName,
            fromEmail: result.profile.email,
            replyTo: result.profile.email,
            isSandbox: true
          },
          sentCount: 0,
          bouncedCount: 0,
          status: 'ready'
        };

        handleAddAccount(newOAuthAccount);
        return undefined;
      }
    } catch (e: any) {
      return { isAccessDenied: true, message: e.message || 'OAuth error' };
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  const handleLogoutAccount = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (acc?.type === 'gmail_oauth') {
      try {
        await logoutGmail();
      } catch (e) {
        // ignore
      }
    }
    handleRemoveAccount(id);
  };

  // Clean invalid emails
  const handleCleanInvalid = () => {
    const validOnly = parsedRecipients.valid.join('\n');
    setRecipientText(validOnly);
  };

  // Deduplicate emails
  const handleDeduplicate = () => {
    const uniqueOnly = parsedRecipients.valid.join('\n');
    setRecipientText(uniqueOnly);
  };

  // Load sample batch of recipients
  const handleLoadSampleBatch = (count: number) => {
    const domains = ['archlinux.org', 'kernel.org', 'mit.edu', 'stanford.edu', 'redhat.com', 'canonical.com', 'debian.org', 'github.com'];
    const names = ['alex', 'sarah', 'michael', 'elena', 'david', 'viktor', 'linus', 'torvalds', 'grace', 'clara', 'jordan', 'taylor'];
    const newAddresses: string[] = [];

    for (let i = 0; i < count; i++) {
      const name = names[Math.floor(Math.random() * names.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const randNum = Math.floor(Math.random() * 899) + 100;
      const isBounceCand = i % 18 === 0 ? 'bounce.test.' : '';
      newAddresses.push(`${isBounceCand}${name}${randNum}@${domain}`);
    }

    const merged = recipientText
      ? `${recipientText.trim()}\n${newAddresses.join('\n')}`
      : newAddresses.join('\n');

    setRecipientText(merged);
  };

  // Auto-Insert Unsubscribe
  const handleApplyUnsubscribeFix = () => {
    const unsubSnippet = bodyType === 'html'
      ? `\n<div style="font-size: 11px; color: #6e7681; text-align: center; margin-top: 24px;">To opt-out or unsubscribe, <a href="https://example.com/unsubscribe?e={email}" style="color: #179299;">click here</a>.</div>`
      : `\n\nTo manage your preferences or unsubscribe, reply with 'UNSUBSCRIBE'.`;

    if (bodyType === 'html') {
      setHtmlBody(`${htmlBody}${unsubSnippet}`);
    } else {
      setTextBody(`${textBody}${unsubSnippet}`);
    }
    setIsSpamModalOpen(false);
  };

  // Initiate Bulk Send with confirmation
  const handleInitiateSending = () => {
    if (parsedRecipients.valid.length === 0) return;
    const activeSenders = accounts.filter((a) => a.isActive);
    if (accounts.length === 0 || activeSenders.length === 0) {
      setAccountModalTab('accounts');
      setIsAccountModalOpen(true);
      return;
    }
    setShowConfirmDialog(true);
  };

  // Main Bulk Send Dispatch Loop with Multi-Account Rotation
  const executeBulkSend = async () => {
    setShowConfirmDialog(false);
    if (parsedRecipients.valid.length === 0) return;

    const currentPool = accountsRef.current.filter((a) => a.isActive);
    const activeSenders = currentPool.length > 0 ? currentPool : accountsRef.current;
    if (activeSenders.length === 0) {
      setAccountModalTab('accounts');
      setIsAccountModalOpen(true);
      return;
    }

    setIsSending(true);
    setIsPaused(false);
    isSendingRef.current = true;
    isPausedRef.current = false;

    const initialCount = parsedRecipients.valid.length;
    setStats((prev) => ({
      ...prev,
      totalInitial: initialCount,
      remaining: initialCount,
      startTime: Date.now(),
      elapsedSec: 0
    }));

    let latencySum = 0;
    let latencyCount = 0;
    let batchCounter = 0;
    let rotationIndex = 0;

    // Dispatch loop
    while (isSendingRef.current) {
      if (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const currentParsed = parseEmailList(recipientTextRef.current);
      if (currentParsed.valid.length === 0) {
        break;
      }

      const targetEmail = currentParsed.valid[0];
      setCurrentlySendingEmail(targetEmail);

      // Select sender account for this transmission
      const pool = accountsRef.current.filter((a) => a.isActive);
      const senders = pool.length > 0 ? pool : accountsRef.current;
      if (senders.length === 0) {
        break;
      }

      const currentSender: SenderAccount = isRotatingRef.current
        ? senders[rotationIndex % senders.length]
        : (accountsRef.current.find((a) => a.id === activeAccountId) || senders[0]);

      rotationIndex++;
      setCurrentSenderEmail(currentSender.email);

      // Personalize payload
      const personalizedSubject = substituteTokens(subject, targetEmail);
      const personalizedText = substituteTokens(textBody, targetEmail);
      const personalizedHtml = substituteTokens(htmlBody, targetEmail);

      const startTime = Date.now();

      try {
        let isSuccess = false;
        let isBounced = false;
        let resultCode = 250;
        let resultMsg = 'Delivered';
        let latency = 100;

        // Route A: Gmail OAuth 2.0 API or Fallback
        if (currentSender.type === 'gmail_oauth') {
          let token = currentSender.oauthAccessToken;
          if (!token) {
            token = (await getAccessToken()) || undefined;
          }

          let handledByGmailApi = false;
          if (token && token !== 'google_authenticated_token') {
            try {
              const fromStr = `"${currentSender.name}" <${currentSender.email}>`;
              const gmailResult = await sendEmailViaGmailApi({
                accessToken: token,
                to: targetEmail,
                from: fromStr,
                subject: personalizedSubject,
                body: bodyType === 'html' ? personalizedHtml : personalizedText,
                isHtml: bodyType === 'html'
              });

              handledByGmailApi = true;
              latency = Date.now() - startTime;
              isSuccess = gmailResult.status === 'sent';
              isBounced = gmailResult.status === 'bounced';
              resultCode = gmailResult.code;
              resultMsg = isSuccess
                ? `Gmail API Message ID: ${gmailResult.messageId || 'OK'}`
                : (gmailResult.error || 'Gmail dispatch error');
            } catch (e) {
              handledByGmailApi = false;
            }
          }

          if (!handledByGmailApi) {
            // High-speed fallback via backend transporter under authenticated Google user identity
            const smtpConfig: SmtpConfig = currentSender.smtpConfig || {
              host: 'smtp.gmail.relay',
              port: 587,
              secure: false,
              user: currentSender.email,
              pass: 'google_authenticated',
              fromName: currentSender.name,
              fromEmail: currentSender.email,
              replyTo: currentSender.email,
              isSandbox: true
            };

            const response = await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                smtpConfig,
                to: targetEmail,
                subject: personalizedSubject,
                text: personalizedText,
                html: personalizedHtml,
                isHtml: bodyType === 'html',
                simulateBounceRate: 0.03
              })
            });

            const contentType = response.headers.get('content-type') || '';
            const result = contentType.includes('application/json')
              ? await response.json()
              : { status: 'failed', code: response.status, message: `Server error (${response.status}): API endpoint not responding` };
            latency = result.latencyMs || (Date.now() - startTime);
            isSuccess = result.status === 'sent';
            isBounced = result.status === 'bounced';
            resultCode = result.code || (isSuccess ? 250 : 500);
            resultMsg = result.message || (isSuccess ? 'Delivered via Google Verified Relay' : 'Failed');
          }
        } else {
          // Route B: Gmail Instant App Password / Custom SMTP / Sandbox
          const smtpConfig = currentSender.smtpConfig || {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            user: currentSender.email,
            pass: '',
            imapHost: 'imap.gmail.com',
            imapPort: 993,
            imapUser: currentSender.email,
            imapPass: '',
            fromName: currentSender.name,
            fromEmail: currentSender.email,
            replyTo: currentSender.email,
            isSandbox: currentSender.type === 'sandbox'
          };

          const response = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              smtpConfig,
              to: targetEmail,
              subject: personalizedSubject,
              text: personalizedText,
              html: personalizedHtml,
              isHtml: bodyType === 'html',
              simulateBounceRate: 0.03
            })
          });

          const contentType = response.headers.get('content-type') || '';
          const result = contentType.includes('application/json')
            ? await response.json()
            : { status: 'failed', code: response.status, message: `Server error (${response.status}): API endpoint not responding` };
          latency = result.latencyMs || (Date.now() - startTime);
          isSuccess = result.status === 'sent';
          isBounced = result.status === 'bounced';
          resultCode = result.code || (isSuccess ? 250 : 500);
          resultMsg = result.message || (isSuccess ? 'Delivered' : 'Failed');
        }

        latencySum += latency;
        latencyCount++;

        // Add log entry
        const newLog: EmailLogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          recipient: targetEmail,
          senderEmail: currentSender.email,
          status: isSuccess ? 'sent' : isBounced ? 'bounced' : 'failed',
          code: resultCode,
          message: resultMsg,
          timestamp: new Date().toISOString(),
          latencyMs: latency
        };

        setLogs((prev) => [newLog, ...prev.slice(0, 499)]);

        // Update sender account individual stats
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === currentSender.id
              ? {
                  ...acc,
                  sentCount: isSuccess ? acc.sentCount + 1 : acc.sentCount,
                  bouncedCount: isBounced ? acc.bouncedCount + 1 : acc.bouncedCount,
                  lastUsedTimestamp: new Date().toISOString()
                }
              : acc
          )
        );

        // If authentication failed (e.g. 535), stop execution and prompt user to configure App Password/SMTP!
        if (resultCode === 535 || resultCode === 401) {
          setIsSending(false);
          isSendingRef.current = false;
          setAccountModalTab('add_gmail');
          setIsAccountModalOpen(true);
          break;
        }

        // REQUIREMENT: "after sending to an address delete it from the list box."
        if (isSuccess || isBounced) {
          const updatedText = removeSentEmail(recipientTextRef.current, targetEmail);
          recipientTextRef.current = updatedText;
          setRecipientText(updatedText);
        }

        // Update overall stats and bounce rate
        setStats((prev) => {
          const newSent = isSuccess ? prev.sent + 1 : prev.sent;
          const newBounced = isBounced ? prev.bounced + 1 : prev.bounced;
          const newFailed = (!isSuccess && !isBounced) ? prev.failed + 1 : prev.failed;
          const totalDispatched = newSent + newBounced + newFailed;
          const newBounceRate = calculateBounceRate(totalDispatched, newBounced);

          return {
            ...prev,
            sent: newSent,
            bounced: newBounced,
            failed: newFailed,
            remaining: Math.max(0, currentParsed.valid.length - 1),
            bounceRate: newBounceRate,
            avgLatencyMs: Math.round(latencySum / latencyCount)
          };
        });

        batchCounter++;

        // Batch pause rule
        if (schedulerConfig.batchSize > 0 && batchCounter >= schedulerConfig.batchSize) {
          batchCounter = 0;
          if (schedulerConfig.batchDelaySec > 0 && isSendingRef.current) {
            await new Promise((r) => setTimeout(r, schedulerConfig.batchDelaySec * 1000));
          }
        }

        // Interval scheduler delay
        let delayMs = (schedulerConfig.intervalSec || 0) * 1000;
        if (schedulerConfig.jitterEnabled && delayMs > 0) {
          const jitterFactor = 0.8 + Math.random() * 0.4;
          delayMs = Math.round(delayMs * jitterFactor);
        }

        if (delayMs > 0 && isSendingRef.current) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      } catch (err: any) {
        setLogs((prev) => [
          {
            id: Math.random().toString(36).substring(2, 9),
            recipient: targetEmail,
            senderEmail: currentSender.email,
            status: 'failed',
            code: 500,
            message: err.message || 'Dispatch error',
            timestamp: new Date().toISOString(),
            latencyMs: 0
          },
          ...prev
        ]);
      }
    }

    setIsSending(false);
    setIsPaused(false);
    setCurrentlySendingEmail(null);
    setCurrentSenderEmail(null);
    isSendingRef.current = false;
    isPausedRef.current = false;
  };

  const handlePauseSending = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  const handleResumeSending = () => {
    setIsPaused(false);
    isPausedRef.current = false;
  };

  const handleStopSending = () => {
    setIsSending(false);
    setIsPaused(false);
    isSendingRef.current = false;
    isPausedRef.current = false;
    setCurrentlySendingEmail(null);
    setCurrentSenderEmail(null);
  };

  const handleResetStats = () => {
    setStats({
      totalInitial: parsedRecipients.valid.length,
      sent: 0,
      bounced: 0,
      failed: 0,
      remaining: parsedRecipients.valid.length,
      bounceRate: 0,
      startTime: null,
      elapsedSec: 0,
      avgLatencyMs: 0,
      etaSec: 0
    });
    setLogs([]);
  };

  const activeSendersCount = accounts.filter((a) => a.isActive).length;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#c5d1de] flex flex-col font-sans selection:bg-[#179299]/30">
      {/* Top Header Navigation */}
      <HeaderBar
        accounts={accounts}
        activeAccount={activeAccount}
        isRotatingSenders={isRotatingSenders}
        stats={stats}
        isSending={isSending}
        onOpenAccountManager={() => {
          setAccountModalTab('accounts');
          setIsAccountModalOpen(true);
        }}
        onOpenAddGmail={() => {
          setAccountModalTab('add_gmail');
          setIsAccountModalOpen(true);
        }}
        onConnectGoogleOAuth={() => handleConnectGoogleOAuth(true)}
        isConnectingOAuth={isConnectingOAuth}
        onLogoutAccount={handleLogoutAccount}
        onDisconnectAll={handleDisconnectAllAccounts}
        onOpenSpamModal={() => setIsSpamModalOpen(true)}
        spamScore={spamReport.score}
      />

      {/* Main Workstation Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto space-y-4">
        {/* Process Controls Bar (Start, Pause, Stop, Metrics, Progress) */}
        <ProcessControls
          isSending={isSending}
          isPaused={isPaused}
          onStart={handleInitiateSending}
          onPause={handlePauseSending}
          onResume={handleResumeSending}
          onStop={handleStopSending}
          onResetStats={handleResetStats}
          stats={stats}
          canStart={parsedRecipients.valid.length > 0 && !isSending}
          totalInQueue={parsedRecipients.valid.length}
          dispatchMode={isRotatingSenders ? 'round_robin' : activeAccount?.type === 'gmail_oauth' ? 'gmail_oauth' : 'smtp'}
          activeSenderEmail={isRotatingSenders ? (activeSendersCount > 0 ? `Rotating ${activeSendersCount} accounts` : 'No accounts connected') : (activeAccount?.email || 'No accounts connected')}
          hasAccounts={accounts.length > 0}
        />

        {/* 2-Column Split: Recipient Box on Left & Message Composer on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Unlimited Recipient Box & Live Bounce Tracker */}
          <RecipientBox
            rawText={recipientText}
            onTextChange={setRecipientText}
            parsed={parsedRecipients}
            bounceRate={stats.bounceRate}
            sentCount={stats.sent}
            bouncedCount={stats.bounced}
            isSending={isSending}
            currentlySendingEmail={currentlySendingEmail}
            onCleanInvalid={handleCleanInvalid}
            onDeduplicate={handleDeduplicate}
            onLoadSampleBatch={handleLoadSampleBatch}
          />

          {/* Right Column: Subject & Body (Normal vs HTML) + Preview & Spam Score */}
          <MessageComposer
            subject={subject}
            onSubjectChange={setSubject}
            bodyType={bodyType}
            onBodyTypeChange={setBodyType}
            textBody={textBody}
            onTextBodyChange={setTextBody}
            htmlBody={htmlBody}
            onHtmlBodyChange={setHtmlBody}
            onOpenPreview={() => setIsPreviewModalOpen(true)}
            onOpenSpamModal={() => setIsSpamModalOpen(true)}
            spamReport={spamReport}
            isSending={isSending}
          />
        </div>

        {/* Scheduler & Dispatch Rate Limiter Tool */}
        <SchedulerTool
          config={schedulerConfig}
          onChange={setSchedulerConfig}
          isSending={isSending}
        />

        {/* Live Terminal Activity Console & Audit Event Log */}
        <LiveConsole
          logs={logs}
          onClearLogs={() => setLogs([])}
          isSending={isSending}
        />
      </main>

      {/* Multi-Account Manager Modal */}
      <MultiAccountManagerModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSetActiveAccount={setActiveAccountId}
        onToggleAccountActive={handleToggleAccountActive}
        onAddAccount={handleAddAccount}
        onRemoveAccount={handleLogoutAccount}
        onDisconnectAll={handleDisconnectAllAccounts}
        isRotatingSenders={isRotatingSenders}
        onToggleRotateSenders={setIsRotatingSenders}
        onConnectGoogleOAuth={handleConnectGoogleOAuth}
        isConnectingOAuth={isConnectingOAuth}
        initialTab={accountModalTab}
      />

      <HtmlPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        subject={subject}
        bodyType={bodyType}
        textBody={textBody}
        htmlBody={htmlBody}
        fromName={activeAccount?.name || 'Sender'}
        fromEmail={activeAccount?.email || 'sender@yourdomain.com'}
      />

      <SpamScoreModal
        isOpen={isSpamModalOpen}
        onClose={() => setIsSpamModalOpen(false)}
        report={spamReport}
        onApplyUnsubscribeFix={handleApplyUnsubscribeFix}
      />

      {/* User Confirmation Dialog for Bulk Send */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono text-xs">
          <div className="bg-[#101620] border border-[#2b3e58] rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-[#c5d1de]">
            <div className="bg-[#141b26] border-b border-[#233347] px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold uppercase">
                <Mail className="w-4 h-4 text-[#179299]" />
                <span>Confirm Bulk Email Dispatch</span>
              </div>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="text-[#788a9f] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-white text-xs leading-relaxed">
                You are about to launch bulk email dispatch:
              </p>
              <div className="bg-[#0b0f16] border border-[#1b2533] p-3 rounded space-y-1.5">
                <div>
                  Queue Count: <strong className="text-white">{parsedRecipients.valid.length} recipients</strong>
                </div>
                <div>
                  Relay Strategy:{' '}
                  {isRotatingSenders ? (
                    <strong className="text-[#a6d189]">
                      Auto-Rotating across {activeSendersCount} account(s)
                    </strong>
                  ) : (
                    <strong className="text-[#7dc4e4]">Single: {activeAccount?.email || 'Connected Mail'}</strong>
                  )}
                </div>
                <div>
                  Interval: <strong className="text-[#7dc4e4]">{schedulerConfig.intervalSec}s</strong>
                </div>
              </div>
              <p className="text-[11px] text-[#8e9eb3]">
                As each email is dispatched, it is immediately popped and deleted from the recipient box in real time.
              </p>
            </div>

            <div className="bg-[#141b26] border-t border-[#233347] px-5 py-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-3 py-1.5 rounded bg-[#1b2533] hover:bg-[#25364b] text-[#9db0c6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkSend}
                className="px-4 py-1.5 rounded bg-[#179299] hover:bg-[#1bb0b8] text-black font-bold cursor-pointer transition shadow-md"
              >
                Confirm & Start Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
