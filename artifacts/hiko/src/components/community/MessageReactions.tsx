import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { useAuthStore } from '@/store/useAuthStore';

const QUICK_EMOJIS = ['😂', '👍', '👎', '🏃', '🔥', '💪'];

const PICKER_EMOJIS = [
  '😂','😍','😅','😢','😮','🤔','😊','😎',
  '👍','👎','👏','🙌','🤝','💪','🏃','🚀',
  '❤️','🔥','⭐','💯','🎉','🏅','🎯','⚡',
  '✅','❌','💥','🌟','🏆','💨','🗺️','📅',
];

interface Props {
  messageId: string;
  isOwn: boolean;
}

export function MessageReactions({ messageId, isOwn }: Props) {
  const user = useAuthStore(s => s.user);
  const { reactions, toggleReaction } = useMessageReactions(messageId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const hasAnyReaction = Object.keys(reactions).length > 0;

  const handleEmoji = async (emoji: string) => {
    if (!user) return;
    await toggleReaction(emoji);
    setPickerOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
      {/* Pill delle reazioni esistenti */}
      {hasAnyReaction && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(reactions).map(([emoji, { count, hasReacted }]) => (
            <button
              key={emoji}
              onClick={() => handleEmoji(emoji)}
              aria-label={`${emoji} ${count} reazioni${hasReacted ? ', clicca per rimuovere' : ', clicca per aggiungere'}`}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
                hasReacted
                  ? 'bg-hiko-primary text-hiko-deep border-hiko-primary font-semibold'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <span>{emoji}</span>
              <span className="text-xs">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Barra emoji: su desktop al hover, su mobile apre direttamente il picker */}
      <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Quick emoji — solo su desktop al hover */}
        <div className={`
          hidden sm:flex items-center gap-1
          opacity-0 group-hover:opacity-100 focus-within:opacity-100
          transition-opacity
          ${isOwn ? 'flex-row-reverse' : ''}
        `}>
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleEmoji(emoji)}
              aria-label={`Reagisci con ${emoji}`}
              className={`text-base hover:scale-125 active:scale-110 transition-transform leading-none ${
                reactions[emoji]?.hasReacted ? 'opacity-100' : 'opacity-50 hover:opacity-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Pulsante picker — sempre visibile (piccolo), apre popover con tutte le emoji */}
        <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
          <Popover.Trigger asChild>
            <button
              aria-label="Aggiungi reazione"
              className="
                opacity-0 group-hover:opacity-100 focus:opacity-100
                sm:opacity-0 sm:group-hover:opacity-100
                w-6 h-6 flex items-center justify-center rounded-full
                bg-white/10 hover:bg-white/20 active:bg-white/30
                text-white/50 hover:text-white text-xs transition-all
              "
            >
              😊
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="top"
              sideOffset={6}
              className="z-50 bg-hiko-deep border border-white/15 rounded-2xl p-3 shadow-2xl"
            >
              {/* Quick emoji nel picker */}
              <div className="flex gap-1 mb-2 pb-2 border-b border-white/10">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleEmoji(emoji)}
                    aria-label={`Reagisci con ${emoji}`}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg hover:bg-white/10 active:scale-90 transition-all ${
                      reactions[emoji]?.hasReacted ? 'bg-hiko-primary/30 ring-1 ring-hiko-primary' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {/* Picker esteso */}
              <div className="grid grid-cols-8 gap-1">
                {PICKER_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleEmoji(emoji)}
                    aria-label={`Reagisci con ${emoji}`}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-base hover:bg-white/10 active:scale-90 transition-all ${
                      reactions[emoji]?.hasReacted ? 'bg-hiko-primary/30 ring-1 ring-hiko-primary' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <Popover.Arrow className="fill-hiko-deep" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}
