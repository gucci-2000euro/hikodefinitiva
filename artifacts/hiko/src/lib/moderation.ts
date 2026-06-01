import type { ModerationResult } from '@/types/index';
import blacklistData from './hiko_blacklist.json';

type BlacklistEntry = { term: string; category: string; action: 'block' | 'flag'; reason?: string };
type BlacklistFile = {
  terms: BlacklistEntry[];
  leet_map: Record<string, string>;
  whitelist: string[];
};

const { terms, leet_map, whitelist } = blacklistData as BlacklistFile;

export function normalizeText(text: string): string {
  let s = text.toLowerCase();
  // Unicode NFKD + remove diacritics
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  // Leet substitution
  s = s.split('').map(c => leet_map[c] ?? c).join('');
  // Collapse repeated chars (fuuuuck → fuck, max 2 consecutive)
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  // Remove non-alphanumeric except spaces
  s = s.replace(/[^a-z0-9 ]/g, '');
  return s;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function checkBlacklist(text: string): ModerationResult | null {
  const normalized = normalizeText(text);

  // Whitelist check — se c'è un termine whitelistato, skip controllo
  for (const w of whitelist) {
    if (normalized.includes(normalizeText(w))) return null;
  }

  let flaggedResult: ModerationResult | null = null;

  for (const entry of terms) {
    const normalizedTerm = normalizeText(entry.term);
    let matched = false;

    // Exact substring match
    if (normalized.includes(normalizedTerm)) {
      matched = true;
    }

    if (!matched) {
      const words = normalized.split(' ');
      const termWords = normalizedTerm.split(' ');
      if (termWords.length > 1) {
        for (let i = 0; i <= words.length - termWords.length; i++) {
          const chunk = words.slice(i, i + termWords.length).join(' ');
          if (levenshtein(chunk, normalizedTerm) <= 2) { matched = true; break; }
        }
      } else {
        // Soglia 1 (una sola modifica) per parole singole: evita falsi positivi
        // su parole comuni corte (es. "vero" ≠ "negro", "sera" ≠ "negra")
        for (const word of words) {
          if (Math.abs(word.length - normalizedTerm.length) <= 1 &&
              levenshtein(word, normalizedTerm) <= 1) { matched = true; break; }
        }
      }
    }

    if (matched) {
      const result = buildResult(entry);
      // Le parole "blocked" bloccano subito; le "flagged" aspettano la valutazione AI
      if (result.decision === 'blocked') return result;
      // Conserva il primo flagged ma continua a cercare un eventuale blocked
      if (!flaggedResult) flaggedResult = result;
    }
  }

  return flaggedResult;
}

/**
 * Controlla SOLO le parole già completate (seguite da separatore).
 * Usa match esatto sul singolo termine — NO sottostringa, NO fuzzy/Levenshtein —
 * per evitare falsi positivi durante la digitazione.
 * Le frasi multi-parola vengono cercate come sottostringa nel testo normalizzato
 * completo (es. "figlio di puttana" viene trovata solo se intera).
 */
export function checkCompletedWords(text: string): ModerationResult | null {
  if (!text.trim()) return null;
  const normalized = normalizeText(text);

  // Whitelist: se c'è un termine whitelistato, skip
  for (const w of whitelist) {
    if (normalized.includes(normalizeText(w))) return null;
  }

  // Parole complete (split su separatori)
  const words = normalized.split(/[\s.,!?;:]+/).filter(Boolean);

  let flaggedResult: ModerationResult | null = null;

  for (const entry of terms) {
    const normalizedTerm = normalizeText(entry.term);
    const termWords = normalizedTerm.split(/\s+/).filter(Boolean);
    let matched = false;

    if (termWords.length > 1) {
      // Frase multi-parola: sottostringa esatta nel testo normalizzato
      matched = normalized.includes(normalizedTerm);
    } else {
      // Singola parola: match ESATTO (non sottostringa)
      matched = words.some(w => w === normalizedTerm);
    }

    if (matched) {
      const result = buildResult(entry);
      if (result.decision === 'blocked') return result;
      if (!flaggedResult) flaggedResult = result;
    }
  }

  return flaggedResult;
}

/** Chiama l'edge function moderate-message per valutazione AI contestuale.
 *  Usata per parole "flagged" (ambigue) che il blacklist locale non può decidere da solo. */
export async function moderateWithAI(
  messageId: string,
  channelId: string,
  text: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<ModerationResult> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/moderate-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ messageId, channelId, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('edge function unavailable');
    return await res.json() as ModerationResult;
  } catch {
    // Se l'edge function non è raggiungibile, lascia passare con pending
    return { decision: 'approved', confidence: 0.5, reason: '', category: null };
  }
}

function buildResult(entry: BlacklistEntry): ModerationResult {
  const decision = entry.action === 'block' ? 'blocked' : 'flagged';
  const categoryMessages: Record<string, string> = {
    HATE:      'Linguaggio discriminatorio non tollerato in questa community.',
    INSULT:    'Insulti personali non sono permessi.',
    BLASPHEMY: 'Espressioni blasfeme non sono appropriate in questa community.',
    THREAT:    'Minacce dirette non sono tollerate.',
    BODY:      'Commenti negativi sul corpo altrui non sono benvenuti.',
    ELITISM:   'Hiko è una community aperta a tutti i livelli. Rispettiamo ogni runner.',
    SEXUAL:    'Contenuti o avances sessuali non sono consentiti.',
    DRUG:      'Riferimenti offensivi a sostanze non sono permessi.',
    SPAM:      'Contenuto ripetitivo o spam non è permesso.',
  };
  return {
    decision,
    confidence: 1.0,
    reason: entry.reason ?? categoryMessages[entry.category] ?? 'Contenuto non consentito.',
    category: entry.category as ModerationResult['category'],
  };
}
