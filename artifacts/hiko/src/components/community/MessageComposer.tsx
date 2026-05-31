import { useState, useCallback, useRef } from 'react';
import type { CommunityMessage } from '@/types/index';
import { checkBlacklist, checkCompletedWords, moderateWithAI } from '@/lib/moderation';
import { Send, Paperclip, AlertTriangle, Info } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Separatori che indicano che una parola è stata completata
const WORD_SEPARATORS = new Set([' ', 'Enter', '.', ',', ';', ':', '!', '?']);

/**
 * Restituisce la porzione di testo che contiene solo parole completate
 * (tutto ciò che precede l'ultimo separatore incluso).
 * Se non c'è ancora nessun separatore, restituisce stringa vuota.
 */
function getCompletedPortion(text: string): string {
  let lastSep = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (/[\s.,!?;:]/.test(text[i])) { lastSep = i; break; }
  }
  return lastSep >= 0 ? text.slice(0, lastSep + 1) : '';
}

interface Props {
  channelId: string;
  onSend: (message: Partial<CommunityMessage>) => Promise<string | null>;
  onRemove?: (messageId: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function MessageComposer({ channelId, onSend, onRemove, disabled, readOnly }: Props) {
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string | null>(null);
  const aiPending = useRef(false);

  const runWordCheck = useCallback((fullText: string) => {
    const portion = getCompletedPortion(fullText);
    if (!portion) {
      setBlocked(null);
      setFlagged(null);
      return;
    }
    // Controllo solo su parole complete — exact match, no fuzzy
    const result = checkCompletedWords(portion);
    if (!result) {
      setBlocked(null);
      setFlagged(null);
    } else if (result.decision === 'blocked') {
      setBlocked(result.reason);
      setFlagged(null);
    } else {
      setBlocked(null);
      setFlagged(result.reason);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    runWordCheck(val);
  }, [runWordCheck]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Quando l'utente completa una parola con un separatore, ri-controlla
    if (WORD_SEPARATORS.has(e.key)) {
      runWordCheck(text + e.key);
    }
  }, [text, runWordCheck]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!text.trim() || disabled || readOnly) return;

    const currentText = text.trim();

    // Controllo finale completo con fuzzy matching — fonte di verità lato client
    const finalCheck = checkBlacklist(currentText);
    if (finalCheck?.decision === 'blocked') {
      setBlocked(finalCheck.reason);
      setFlagged(null);
      return;
    }

    const hasFlagged = !!flagged || finalCheck?.decision === 'flagged';

    setText('');
    setBlocked(null);
    setFlagged(null);

    const messageId = await onSend({ channel_id: channelId, contenuto: currentText, tipo: 'testo' });

    // Se flagged, valutazione AI in background come fonte di verità server-side
    if (hasFlagged && messageId && !aiPending.current) {
      aiPending.current = true;
      moderateWithAI(messageId, channelId, currentText, SUPABASE_URL, SUPABASE_ANON)
        .then(result => {
          if (result.decision === 'blocked' && onRemove) onRemove(messageId);
        })
        .finally(() => { aiPending.current = false; });
    }
  };

  if (readOnly) {
    return (
      <div className="px-4 py-3 border-t border-white/10 text-center text-sm text-white/40">
        Solo gli admin possono scrivere in questo canale.
      </div>
    );
  }

  const borderClass = blocked
    ? 'border-red-500/60 focus:border-red-500'
    : flagged
      ? 'border-yellow-500/60 focus:border-yellow-500'
      : 'border-white/10 focus:border-hiko-primary/50';

  return (
    <div className="px-4 py-3 border-t border-white/10">
      {/* Violazione bloccante — mostra tipo standard + ragione specifica della categoria */}
      {blocked && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 mb-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2"
        >
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-red-400">Messaggio non consentito</p>
            <p className="text-xs text-red-300 mt-0.5">{blocked}</p>
          </div>
        </div>
      )}
      {/* Warning — flagged: invio consentito, AI valuta in background */}
      {flagged && !blocked && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 mb-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2"
        >
          <Info size={14} className="text-yellow-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-yellow-400">Controlla il tono del messaggio</p>
            <p className="text-xs text-yellow-300 mt-0.5">{flagged}</p>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          className="text-white/40 hover:text-white/70 transition-colors p-1 shrink-0"
          aria-label="Allega file"
        >
          <Paperclip size={18} />
        </button>
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio..."
          disabled={disabled}
          rows={1}
          aria-label="Campo messaggio"
          aria-invalid={!!blocked}
          className={`flex-1 bg-white/5 border ${borderClass} rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 resize-none outline-none transition-colors`}
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled || !!blocked}
          aria-label="Invia messaggio"
          className="bg-hiko-primary text-hiko-deep p-2 rounded-xl disabled:opacity-40 hover:bg-hiko-primary/90 transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
