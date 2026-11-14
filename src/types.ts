export interface SmtpConfig {
  id?: string;
  name?: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  isSandbox: boolean;
}

export type BodyType = 'text' | 'html';
export type DispatchMode = 'smtp' | 'gmail_oauth' | 'round_robin';
export type SenderType = 'gmail_oauth' | 'gmail_app_pass' | 'custom_smtp' | 'sandbox';

export interface SenderAccount {
  id: string;
  name: string;
  email: string;
  type: SenderType;
  isActive: boolean; // included in sending rotation
  smtpConfig?: SmtpConfig;
  oauthAccessToken?: string;
  photoURL?: string;
  sentCount: number;
  bouncedCount: number;
  lastUsedTimestamp?: string;
  status: 'ready' | 'auth_error' | 'rate_limited';
}

export interface EmailLogEntry {
  id: string;
  recipient: string;
  senderEmail: string;
  status: 'sent' | 'bounced' | 'failed';
  code: number;
  message: string;
  timestamp: string;
  latencyMs: number;
}

export interface SchedulerConfig {
  intervalSec: number;
  jitterEnabled: boolean;
  batchSize: number;
  batchDelaySec: number;
  scheduleTime: string | null; // ISO string if scheduled for later
  rotateSenders: boolean; // Automatically rotate through all active connected accounts
}

export interface SendingStats {
  totalInitial: number;
  sent: number;
  bounced: number;
  failed: number;
  remaining: number;
  bounceRate: number; // percentage e.g. 2.5
  startTime: number | null;
  elapsedSec: number;
  avgLatencyMs: number;
  etaSec: number;
}
