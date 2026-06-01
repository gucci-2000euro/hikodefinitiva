import { useState, useCallback, useRef } from 'react';
import type { CommunityMessage } from '@/types/index';
import { checkBlacklist, checkCompletedWords, moderateWithAI } from '@/lib/moderation';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Send, ImagePlus, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const WORD_SEPARATORS = new Set([' ', 'Enter', '.', ',', ';', ':', '!', '?']);

function getCompletedPortion(text: string): string {
  let lastSep = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (/[\s.,!?;:]/.test(text[i])) { lastSep = i; break; }
  }
  return lastSep >= 0 ? text.slice(0, lastSep + 1) : '';
}

interface Props {
  channelId: string;
  userId?: string;
  onSend: (message: Partial<CommunityMessage>) => Promise<string | null>;
  onRemove?: (messageId: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function MessageComposer({ channelId, userId, onSend, onRemove, disabled, readOnly }: Props) {
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string | null>(null);
  const aiPending = useRef(false);
  const imgUpload = useImageUpload('post-images');

  const runWordCheck = useCallback((fullText: string) => {
    const portion = getCompletedPortion(fullText);
    if (!portion) { setBlocked(null); setFlagged(null); return; }
    const result = checkCompletedWords(portion);
    if (!result) { setBlocked(null); setFlagged(null); }
    else if (result.decision === 'blocked') { setBlocked(result.reason); setFlagged(null); }
    else { setBlocked(null); setFlagged(result.reason); }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    runWordCheck(val);
  }, [runWordCheck]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }
    if (WORD_SEPARATORS.has(e.key)) runWordCheck(text + e.key);
  }, [text, runWordCheck]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const hasText = text.trim().length > 0;
    const hasImage = !!imgUpload.preview;
    if ((!hasText && !hasImage) || disabled || readOnly) return;

    if (hasText) {
      const finalCheck = checkBlacklist(text.trim());
      if (finalCheck?.decision === 'blocked') { setBlocked(finalCheck.reason); setFlagged(null); return; }
    }

    const hasFlagged = !!flagged;
    const currentText = text.trim();
    const imageUrl = imgUpload.preview;

    setText('');
    setBlocked(null);
    setFlagged(null);
    imgUpload.setPreview(null);

    let messageId: string | null = null;

    if (hasImage && imageUrl) {
      messageId = await onSend({ channel_id: channelId, contenuto: currentText || '', tipo: 'immagine', image_url: imageUrl });
    } else {
      messageId = await onSend({ channel_id: channelId, contenuto: currentText, tipo: 'testo' });
    }

    if (hasFlagged && messageId && !aiPending.current) {
      aiPending.current = true;
      moderateWithAI(messageId, channelId, currentText, SUPABASE_URL, SUPABASE_ANON)
        .then(result => { if (result.decision === 'blocked' && onRemove) onRemove(messageId!); })
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
    ? 'border-red-500/60' : flagged ? 'border-yellow-500/60' : 'border-white/10 focus:border-hiko-primary/50';

  return (
    <div className="px-4 py-3 border-t border-white/10">
      {blocked && (
        <div role="alert" className="flex items-start gap-2 mb-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-400">Messaggio non consentito</p>
            <p className="text-xs text-red-300 mt-0.5">{blocked}</p>
          </div>
        </div>
      )}
      {flagged && !blocked && (
        <div role="status" className="flex items-start gap-2 mb-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2">
          <Info size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-yellow-400">Controlla il tono del messaggio</p>
            <p className="text-xs text-yellow-300 mt-0.5">{flagged}</p>
          </div>
        </div>
      )}

      {/* Preview immagine selezionata */}
      {imgUpload.preview && (
        <div className="relative inline-block mb-2">
          <img src={imgUpload.preview} alt="" className="h-20 rounded-xl object-cover border border-white/10" />
          <button onClick={() => imgUpload.setPreview(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Input file nascosto */}
        <input
          ref={imgUpload.inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file && userId) await imgUpload.handleFile(file, userId);
          }}
        />
        {/* Bottone immagine — stessa icona del DM */}
        <button
          onClick={imgUpload.open}
          disabled={disabled || imgUpload.uploading}
          className="text-white/40 hover:text-hiko-primary transition-colors p-1 shrink-0 disabled:opacity-40"
          aria-label="Allega immagine"
        >
          {imgUpload.uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
        </button>

        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Unisciti per scrivere...' : 'Scrivi un messaggio...'}
          disabled={disabled}
          rows={1}
          className={`flex-1 bg-white/5 border ${borderClass} rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 resize-none outline-none transition-colors`}
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !imgUpload.preview) || disabled || !!blocked}
          className="bg-hiko-primary text-hiko-deep p-2 rounded-xl disabled:opacity-40 hover:bg-hiko-primary/90 transition-colors shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
