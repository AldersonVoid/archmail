/**
 * Spam Score Engine & Heuristic Analyzer
 * Evaluates subject and body content against anti-spam filters (SpamAssassin / RFC heuristics).
 */

export interface SpamRuleHit {
  id: string;
  name: string;
  points: number; // positive = spammy, negative = reputable bonus
  description: string;
  suggestion?: string;
  matchedText?: string[];
}

export interface SpamReport {
  score: number; // 0 (Cleanest) to 100 (Worst Spam)
  rawSpamAssassinPoints: number; // typical -2.0 to +15.0 scale
  riskLevel: 'clean' | 'moderate' | 'high' | 'critical';
  verdict: string;
  ruleHits: SpamRuleHit[];
  recommendations: string[];
  stats: {
    subjectLength: number;
    bodyLength: number;
    wordCount: number;
    linkCount: number;
    capsRatioSubject: number;
    capsRatioBody: number;
    hasUnsubscribe: boolean;
  };
}

// Common spam trigger phrases with sensitivity
const SPAM_TRIGGER_WORDS = [
  { word: '100% free', penalty: 2.5, category: 'guarantee' },
  { word: 'free gift', penalty: 2.0, category: 'offer' },
  { word: 'act now', penalty: 1.8, category: 'urgency' },
  { word: 'urgent', penalty: 1.5, category: 'urgency' },
  { word: 'immediate response', penalty: 1.6, category: 'urgency' },
  { word: 'make money', penalty: 2.8, category: 'financial' },
  { word: 'extra income', penalty: 2.5, category: 'financial' },
  { word: 'earn $$$', penalty: 3.0, category: 'financial' },
  { word: 'cash bonus', penalty: 2.2, category: 'financial' },
  { word: 'risk free', penalty: 2.0, category: 'guarantee' },
  { word: 'no obligation', penalty: 1.5, category: 'guarantee' },
  { word: 'congratulations', penalty: 1.4, category: 'hype' },
  { word: 'winner', penalty: 2.2, category: 'hype' },
  { word: 'claim now', penalty: 2.0, category: 'urgency' },
  { word: 'guaranteed', penalty: 1.8, category: 'guarantee' },
  { word: 'once in a lifetime', penalty: 2.2, category: 'hype' },
  { word: 'unlimited', penalty: 1.2, category: 'hype' },
  { word: 'lowest price', penalty: 1.5, category: 'marketing' },
  { word: 'satisfaction guaranteed', penalty: 1.6, category: 'guarantee' },
  { word: 'click here now', penalty: 2.5, category: 'cta' },
  { word: 'exclusive deal', penalty: 1.4, category: 'marketing' },
  { word: 'viagra', penalty: 5.0, category: 'pharma' },
  { word: 'crypto profit', penalty: 3.5, category: 'financial' },
  { word: 'bitcoin investment', penalty: 3.2, category: 'financial' },
  { word: 'pre-approved', penalty: 2.0, category: 'financial' },
  { word: 'dear friend', penalty: 1.8, category: 'salutation' }
];

const SUSPICIOUS_URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly'
];

export function analyzeSpamScore(
  subject: string,
  body: string,
  isHtml: boolean,
  fromEmail?: string
): SpamReport {
  const ruleHits: SpamRuleHit[] = [];
  const recommendations: string[] = [];

  const cleanSubject = (subject || '').trim();
  const rawBody = body || '';
  
  // Extract text from HTML if body is HTML
  const textBody = isHtml 
    ? rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
             .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
             .replace(/<[^>]+>/g, ' ')
             .replace(/&nbsp;/g, ' ')
             .replace(/\s+/g, ' ')
             .trim()
    : rawBody;

  const combinedContent = `${cleanSubject} ${textBody}`.toLowerCase();

  // 1. Check Subject Line
  if (!cleanSubject) {
    ruleHits.push({
      id: 'EMPTY_SUBJECT',
      name: 'Missing Subject Line',
      points: 4.0,
      description: 'Emails without a subject are flagged heavily by spam filters.',
      suggestion: 'Add a concise, relevant subject line.'
    });
  } else {
    // Subject Caps Ratio
    const subjectLetters = cleanSubject.replace(/[^a-zA-Z]/g, '');
    const subjectCaps = cleanSubject.replace(/[^A-Z]/g, '');
    const subjectCapsRatio = subjectLetters.length > 0 ? (subjectCaps.length / subjectLetters.length) : 0;

    if (subjectCapsRatio > 0.4 && cleanSubject.length > 5) {
      const pts = subjectCapsRatio > 0.7 ? 3.5 : 2.0;
      ruleHits.push({
        id: 'SUBJ_ALL_CAPS',
        name: 'Excessive Capitals in Subject',
        points: pts,
        description: `${Math.round(subjectCapsRatio * 100)}% of characters in your subject are uppercase.`,
        suggestion: 'Use sentence case or title case instead of shouting.'
      });
    }

    // Exclamation / Punctuation in Subject
    const exclamationCount = (cleanSubject.match(/!/g) || []).length;
    if (exclamationCount > 1) {
      ruleHits.push({
        id: 'SUBJ_EXCESSIVE_PUNCT',
        name: 'Multiple Exclamations in Subject',
        points: 1.5 * exclamationCount,
        description: `Subject contains ${exclamationCount} exclamation marks.`,
        suggestion: 'Remove excessive exclamation marks.'
      });
    }

    // Deceptive prefix checks
    if (/^(re:|fwd:)\s*(?!$)/i.test(cleanSubject)) {
      ruleHits.push({
        id: 'SUBJ_FAKE_REPLY',
        name: 'Deceptive Re: or Fwd: Prefix',
        points: 2.5,
        description: 'Using fake reply/forward prefixes to trick recipients triggers spam filters.',
        suggestion: 'Avoid "Re:" or "Fwd:" prefixes for initial cold/bulk outreach.'
      });
    }
  }

  // 2. Trigger Keyword Scan
  const matchedSpamWords: string[] = [];
  let triggerWordScore = 0;

  for (const item of SPAM_TRIGGER_WORDS) {
    const regex = new RegExp(`\\b${item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = combinedContent.match(regex);
    if (matches && matches.length > 0) {
      matchedSpamWords.push(`${item.word} (x${matches.length})`);
      triggerWordScore += item.penalty * Math.min(matches.length, 3);
    }
  }

  if (matchedSpamWords.length > 0) {
    ruleHits.push({
      id: 'TRIGGER_KEYWORDS',
      name: 'Spam Trigger Keywords Detected',
      points: Math.min(triggerWordScore, 8.0),
      description: `Detected phrases often flagged by anti-spam filters: ${matchedSpamWords.slice(0, 5).join(', ')}${matchedSpamWords.length > 5 ? '...' : ''}`,
      suggestion: 'Rephrase commercial hype words with authentic, direct messaging.',
      matchedText: matchedSpamWords
    });
  }

  // 3. Body Caps Ratio
  const bodyLetters = textBody.replace(/[^a-zA-Z]/g, '');
  const bodyCaps = textBody.replace(/[^A-Z]/g, '');
  const bodyCapsRatio = bodyLetters.length > 0 ? (bodyCaps.length / bodyLetters.length) : 0;
  if (bodyCapsRatio > 0.3 && textBody.length > 30) {
    ruleHits.push({
      id: 'BODY_HIGH_CAPS',
      name: 'High Ratio of Capital Letters in Body',
      points: 2.5,
      description: `${Math.round(bodyCapsRatio * 100)}% of letters in body are uppercase.`,
      suggestion: 'Write in natural sentence casing.'
    });
  }

  // 4. Link & URL Analysis
  const linkMatches = rawBody.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const linkCount = linkMatches.length;

  if (linkCount > 7) {
    ruleHits.push({
      id: 'TOO_MANY_LINKS',
      name: 'Excessive Number of Links',
      points: 2.0,
      description: `Email contains ${linkCount} hyperlinks. High link density signals promotional blasts.`,
      suggestion: 'Keep links to 1-3 focused calls to action.'
    });
  }

  // Check for URL shorteners
  const foundShorteners = linkMatches.filter(url => 
    SUSPICIOUS_URL_SHORTENERS.some(short => url.toLowerCase().includes(short))
  );
  if (foundShorteners.length > 0) {
    ruleHits.push({
      id: 'URL_SHORTENERS',
      name: 'Suspicious URL Shortener Detected',
      points: 3.5,
      description: 'URL shorteners (e.g. bit.ly, tinyurl) are frequently blacklisted by email spam filters.',
      suggestion: 'Use direct, domain-branded HTTPS URLs instead of redirect shorteners.',
      matchedText: foundShorteners
    });
  }

  // 5. HTML checks
  if (isHtml) {
    // Check for JavaScript tags
    if (/<script/i.test(rawBody)) {
      ruleHits.push({
        id: 'HTML_SCRIPT_TAG',
        name: 'Dangerous Script Tag',
        points: 6.0,
        description: 'JavaScript inside email is blocked by nearly 100% of email clients and classified as malware.',
        suggestion: 'Remove all <script> tags.'
      });
    }

    // Check for iframe
    if (/<iframe/i.test(rawBody)) {
      ruleHits.push({
        id: 'HTML_IFRAME_TAG',
        name: 'Embedded IFrame',
        points: 5.0,
        description: 'IFrames are disallowed in modern email standards and will trigger immediate quarantine.',
        suggestion: 'Remove <iframe> tags.'
      });
    }

    // Check for HTML comments with spam padding
    if ((rawBody.match(/<!--[\s\S]*?-->/g) || []).length > 5) {
      ruleHits.push({
        id: 'EXCESSIVE_COMMENTS',
        name: 'Excessive HTML Comments',
        points: 1.5,
        description: 'Unusual amount of HTML comment blocks detected.',
        suggestion: 'Clean up unnecessary HTML comments.'
      });
    }
  }

  // 6. Unsubscribe link / CAN-SPAM compliance
  const hasUnsubscribe = /unsubscribe|opt-out|opt out|manage preferences/i.test(combinedContent);
  if (!hasUnsubscribe && textBody.length > 50) {
    ruleHits.push({
      id: 'MISSING_UNSUBSCRIBE',
      name: 'Missing Unsubscribe Mechanism',
      points: 2.0,
      description: 'No opt-out or unsubscribe notice detected. Required for compliance with CAN-SPAM and GDPR.',
      suggestion: 'Include a clear unsubscribe link or footer instruction.'
    });
  } else if (hasUnsubscribe) {
    // Good bonus!
    ruleHits.push({
      id: 'HAS_UNSUBSCRIBE_BONUS',
      name: 'Compliant Unsubscribe Included',
      points: -1.0,
      description: 'Found opt-out / unsubscribe text, improving inbox deliverability.',
      suggestion: undefined
    });
  }

  // 7. Sender domain hygiene check
  if (fromEmail) {
    const isFreeProvider = /@(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|aol\.com)$/i.test(fromEmail);
    if (isFreeProvider) {
      ruleHits.push({
        id: 'FREE_WEBMAIL_SENDER',
        name: 'Free Webmail Sender Domain',
        points: 1.5,
        description: `Sending bulk mail from free public domain (${fromEmail.split('@')[1]}) often violates DMARC.`,
        suggestion: 'Use a custom branded domain with proper SPF/DKIM records for high deliverability.'
      });
    }
  }

  // Calculate total points
  const rawSpamAssassinPoints = ruleHits.reduce((sum, r) => sum + r.points, 0);
  
  // Normalize into 0 (Best/Clean) to 100 (Worst) score
  // If raw points <= 0: score is 0-5
  // If raw points == 5: score ~ 50
  // If raw points >= 10: score > 85
  const normalizedScore = Math.min(100, Math.max(0, Math.round(
    rawSpamAssassinPoints <= 0 
      ? Math.max(2, 5 + rawSpamAssassinPoints * 2)
      : Math.min(100, (rawSpamAssassinPoints / 10) * 100)
  )));

  let riskLevel: 'clean' | 'moderate' | 'high' | 'critical' = 'clean';
  let verdict = 'Excellent - High likelihood of inbox delivery';

  if (normalizedScore > 75 || rawSpamAssassinPoints >= 7.5) {
    riskLevel = 'critical';
    verdict = 'Critical Spam Risk - Likely to be dropped or sent to Spam/Junk folder';
  } else if (normalizedScore > 45 || rawSpamAssassinPoints >= 4.5) {
    riskLevel = 'high';
    verdict = 'High Risk - Multiple spam triggers could hurt sender reputation';
  } else if (normalizedScore > 20 || rawSpamAssassinPoints >= 2.0) {
    riskLevel = 'moderate';
    verdict = 'Moderate Risk - A few flags to refine before blast';
  }

  for (const hit of ruleHits) {
    if (hit.suggestion && hit.points > 0) {
      recommendations.push(hit.suggestion);
    }
  }

  const wordCount = textBody.trim() ? textBody.trim().split(/\s+/).length : 0;

  return {
    score: normalizedScore,
    rawSpamAssassinPoints: Math.round(rawSpamAssassinPoints * 10) / 10,
    riskLevel,
    verdict,
    ruleHits,
    recommendations,
    stats: {
      subjectLength: cleanSubject.length,
      bodyLength: textBody.length,
      wordCount,
      linkCount,
      capsRatioSubject: Math.round((cleanSubject.replace(/[^A-Z]/g, '').length / (cleanSubject.replace(/[^a-zA-Z]/g, '').length || 1)) * 100),
      capsRatioBody: Math.round((textBody.replace(/[^A-Z]/g, '').length / (textBody.replace(/[^a-zA-Z]/g, '').length || 1)) * 100),
      hasUnsubscribe
    }
  };
}

/**
 * Replace personal tokens in subject or body
 * e.g. {email}, {name}, {domain}, {random_id}, {date}
 */
export function substituteTokens(template: string, recipientEmail: string, customName?: string): string {
  if (!template) return '';
  const email = recipientEmail.trim();
  const parts = email.split('@');
  const userPart = parts[0] || '';
  const domainPart = parts[1] || '';
  const inferredName = customName || userPart.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return template
    .replace(/{email}/gi, email)
    .replace(/{name}/gi, inferredName)
    .replace(/{user}/gi, userPart)
    .replace(/{domain}/gi, domainPart)
    .replace(/{random_id}/gi, randomId)
    .replace(/{date}/gi, dateStr);
}
