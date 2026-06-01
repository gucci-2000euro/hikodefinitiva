import { useState } from 'react';
import type { CommunityMessageWithProfile } from '@/types/index';
import { Flag, Reply, Trash2, MapPin, Trophy, Activity, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { MessageReactions } from './MessageReactions';

interface Props {
  message: CommunityMessageWithProfile;
  currentUserId: string;
  isFirstInGroup: boolean;
  onReport: () => void;
  onReply: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

function Avatar({ nome, avatarUrl }: { nome: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={nome} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-hiko-primary shrink-0 flex items-center justify-center text-xs font-bold text-hiko-deep">
      {nome[0]?.toUpperCase() ?? 'U'}
    </div>
  );
}

export function MessageBubble({
  message, currentUserId, isFirstInGroup,
  onReport, onReply, onDelete, isAdmin,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const isOwn = message.user_id === currentUserId;

  if (message.eliminato) return null;

  const displayName = message.profiles?.nome ?? 'Utente';
  const avatarUrl = message.profiles?.avatar_url ?? null;

  return (
    <div
      className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar o spacer */}
      {isFirstInGroup
        ? <Avatar nome={displayName} avatarUrl={avatarUrl} />
        : <div className="w-8 shrink-0" />
      }

      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Nome mittente (solo per altri, primo del gruppo) */}
        {!isOwn && isFirstInGroup && (
          <p className="text-xs font-semibold text-white/60 px-1">{displayName}</p>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-3 py-2 ${
          isOwn ? 'bg-hiko-primary text-hiko-deep rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'
        }`}>
          {message.tipo === 'testo' && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.contenuto}</p>
          )}
          {message.tipo === 'percorso' && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} /><span className="font-medium">{message.contenuto}</span>
            </div>
          )}
          {message.tipo === 'sfida' && (
            <div className="flex items-center gap-2 text-sm">
              <Trophy size={16} />
              <span className="font-medium">{message.contenuto}</span>
              <button className="ml-2 bg-hiko-deep text-hiko-primary text-xs font-bold px-2 py-0.5 rounded-lg">Accetta</button>
            </div>
          )}
          {message.tipo === 'run' && (
            <div className="flex items-center gap-2 text-sm">
              <Activity size={16} /><span className="font-medium">{message.contenuto}</span>
            </div>
          )}
        </div>

        {/* Timestamp + tasto ... per propri messaggi */}
        <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {isFirstInGroup && (
            <span className="text-[10px] text-white/30 px-1">
              {format(new Date(message.created_at), 'HH:mm', { locale: it })}
            </span>
          )}
          {(isOwn || isAdmin) && onDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="p-0.5 text-white/30 hover:text-white/70 transition-colors rounded"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div
                  className={`absolute bottom-6 z-30 bg-hiko-deep border border-white/10 rounded-xl shadow-xl overflow-hidden ${isOwn ? 'right-0' : 'left-0'}`}
                  style={{ minWidth: 120 }}
                >
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/10 w-full whitespace-nowrap"
                  >
                    <Trash2 size={13} /> Elimina
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reazioni */}
        <MessageReactions messageId={message.id} isOwn={isOwn} />
      </div>

      {/* Overlay per chiudere il dropdown cliccando fuori */}
      {showMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
}
