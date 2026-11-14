import React from 'react';
import { Shield, Server, AlertCircle, LogOut, Loader2, Users, Shuffle, Plus } from 'lucide-react';
import { SenderAccount, SendingStats } from '../types.ts';

interface HeaderBarProps {
  accounts: SenderAccount[];
  activeAccount?: SenderAccount;
  isRotatingSenders: boolean;
  stats: SendingStats;
  isSending: boolean;
  onOpenAccountManager: () => void;
  onOpenAddGmail: () => void;
  onConnectGoogleOAuth: () => void;
  isConnectingOAuth: boolean;
  onLogoutAccount: (id: string) => void;
  onDisconnectAll?: () => void;
  onOpenSpamModal: () => void;
  spamScore: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  accounts,
  activeAccount,
  isRotatingSenders,
  stats,
  isSending,
  onOpenAccountManager,
  onOpenAddGmail,
  onConnectGoogleOAuth,
  isConnectingOAuth,
  onLogoutAccount,
  onDisconnectAll,
  onOpenSpamModal,
  spamScore
}) => {
  const activeCount = accounts.filter(a => a.isActive).length;

  return (
    <header className="bg-[#0e131b] border-b border-[#1b2432] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 font-mono">
      {/* Arch Linux Brand identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Stylized Arch Linux logo */}
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#179299] via-[#04a5e5] to-[#209fb5] flex items-center justify-center shadow-lg shadow-[#179299]/20 font-bold text-black text-sm select-none">
            <svg viewBox="0 0 100 100" className="w-5 h-5 fill-current">
              <path d="M50 15 L20 80 L35 80 L44 60 L56 60 L65 80 L80 80 Z M50 35 L54 50 L46 50 Z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-wider">
                ARCH<span className="text-[#179299]">MAIL</span>
              </span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#1b2533] text-[#7dc4e4] border border-[#26354a]">
                multi-user
              </span>
            </div>
            <p className="text-[11px] text-[#71829a] flex items-center gap-1.5">
              <span>daemon.active</span>
              <span className="text-[#32435b]">•</span>
              {accounts.length > 0 ? (
                <span className="text-[#a6d189] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a6d189]"></span>
                  {accounts.length} senders connected
                </span>
              ) : (
                <span className="text-[#e5c890] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e5c890] animate-pulse"></span>
                  0 senders connected (disconnected)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div className="hidden md:flex items-center gap-3 text-xs">
        {/* Active Relay / Rotation Status */}
        <button
          onClick={onOpenAccountManager}
          className="flex items-center gap-2 bg-[#121822] hover:bg-[#192330] border border-[#1b2533] px-3 py-1.5 rounded cursor-pointer transition text-left"
          title="Click to view all accounts and rotation settings"
        >
          {accounts.length === 0 ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-[#e5c890]" />
              <span className="text-[#899cb4]">Sender:</span>
              <span className="text-[#e5c890] font-semibold">
                No mail connected &mdash; Click to connect
              </span>
            </>
          ) : isRotatingSenders ? (
            <>
              <Shuffle className="w-3.5 h-3.5 text-[#179299]" />
              <span className="text-[#899cb4]">Relay:</span>
              <span className="text-[#a6d189] font-bold flex items-center gap-1">
                <span>Rotating</span>
                <span className="text-[10px] bg-[#a6d189]/20 text-[#a6d189] px-1 rounded">
                  {activeCount} Active
                </span>
              </span>
            </>
          ) : (
            <>
              <Server className="w-3.5 h-3.5 text-[#179299]" />
              <span className="text-[#899cb4]">Sender:</span>
              <span className="text-white font-medium truncate max-w-[150px]">
                {activeAccount ? activeAccount.email : 'No active sender'}
              </span>
            </>
          )}
          <span className={`w-2 h-2 rounded-full ${accounts.length > 0 ? 'bg-[#a6d189]' : 'bg-[#e5c890]'}`} />
        </button>

        {/* Real-time bounce rate quick counter */}
        <div className="flex items-center gap-2 bg-[#121822] border border-[#1b2533] px-3 py-1.5 rounded">
          <AlertCircle className={`w-3.5 h-3.5 ${stats.bounceRate > 5 ? 'text-[#e78284]' : stats.bounceRate > 2 ? 'text-[#e5c890]' : 'text-[#a6d189]'}`} />
          <span className="text-[#899cb4]">Bounce Rate:</span>
          <span className={`font-bold ${stats.bounceRate > 5 ? 'text-[#e78284]' : stats.bounceRate > 2 ? 'text-[#e5c890]' : 'text-[#a6d189]'}`}>
            {stats.bounceRate.toFixed(1)}%
          </span>
        </div>

        {/* Spam Score Quick Badge */}
        <button
          onClick={onOpenSpamModal}
          className="flex items-center gap-2 bg-[#121822] hover:bg-[#1a2332] border border-[#1b2533] px-3 py-1.5 rounded transition cursor-pointer"
          title="Click to inspect Spam Score details"
        >
          <Shield className={`w-3.5 h-3.5 ${spamScore > 50 ? 'text-[#e78284]' : spamScore > 20 ? 'text-[#e5c890]' : 'text-[#a6d189]'}`} />
          <span className="text-[#899cb4]">Spam Score:</span>
          <span className={`font-bold ${spamScore > 50 ? 'text-[#e78284]' : spamScore > 20 ? 'text-[#e5c890]' : 'text-[#a6d189]'}`}>
            {spamScore}/100
          </span>
        </button>
      </div>

      {/* Right Controls: Google OAuth, Logout & Accounts Pool */}
      <div className="flex items-center gap-2">
        {/* Direct Google Sign In Button */}
        <button
          onClick={onConnectGoogleOAuth}
          disabled={isConnectingOAuth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] shadow-md transition cursor-pointer select-none disabled:opacity-50"
          title="Sign in with your Google account"
        >
          {isConnectingOAuth ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4285F4]" />
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>{isConnectingOAuth ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

        {/* If no accounts connected, show prominent + Add Account button */}
        {accounts.length === 0 && (
          <button
            onClick={onOpenAddGmail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#179299] hover:bg-[#1ab0b8] text-black shadow-md shadow-[#179299]/20 transition cursor-pointer"
            title="Add your own Gmail or SMTP account"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Sender Account</span>
          </button>
        )}

        {/* If an account is connected, show email & Logout/Disconnect */}
        {activeAccount && (
          <div className="hidden sm:flex items-center gap-1.5 bg-[#121922] border border-[#233346] px-2.5 py-1 rounded text-xs">
            {activeAccount.photoURL ? (
              <img src={activeAccount.photoURL} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#1e2a38] text-[#7dc4e4] flex items-center justify-center text-[10px] font-bold">
                {activeAccount.name ? activeAccount.name.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <span className="text-white max-w-[120px] truncate font-medium text-[11px]" title={activeAccount.email}>
              {activeAccount.email}
            </span>
            <button
              onClick={() => onLogoutAccount(activeAccount.id)}
              className="text-[#8fa4bc] hover:text-[#e78284] p-1 rounded hover:bg-[#25151c] transition cursor-pointer"
              title="Disconnect this account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Master Accounts Pool Modal Button */}
        <button
          onClick={onOpenAccountManager}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#16202c] hover:bg-[#1f2c3d] text-[#c5d1de] border border-[#27374b] transition cursor-pointer"
          title="Open Multi-Account Pool & Sender Configuration"
        >
          <Users className="w-3.5 h-3.5 text-[#179299]" />
          <span>Accounts ({accounts.length})</span>
          {isRotatingSenders && accounts.length > 0 && (
            <span className="text-[10px] bg-[#a6d189]/20 text-[#a6d189] px-1 rounded font-bold">Auto</span>
          )}
        </button>
      </div>
    </header>
  );
};
