import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/store/useAuthStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/lib/supabase';
import { checkBlacklist, checkCompletedWords } from '@/lib/moderation';
import { ArrowLeft, ImagePlus, X, Loader2, AlertTriangle, Info } from 'lucide-react';

export default function SocialNew() {
  const [, setLocation] = useLocation();
  const user = useAuthStore(state => state.user);
  const openAuthModal = useAuthStore(state => state.openAuthModal);
  const imgUpload = useImageUpload('post-images');

  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  const captionViolation = caption ? checkCompletedWords(caption) : null;
  const captionBlocked = captionViolation?.decision === 'blocked';

  useEffect(() => {
    if (!user) {
      openAuthModal('Sign in to share your run.', () => {});
      setLocation('/social');
    }
  }, [user, openAuthModal, setLocation]);

  const handlePublish = async () => {
    if (!user || !caption.trim()) return;
    const violation = checkBlacklist(caption);
    if (violation?.decision === 'blocked') return;
    setPublishing(true);
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      caption: caption.trim(),
      image_url: imgUpload.preview ?? null,
    });
    setPublishing(false);
    if (!error) setLocation('/social');
  };

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation('/social')} className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">New Post</h1>
        </div>
        <button
          onClick={handlePublish}
          disabled={!caption.trim() || publishing || captionBlocked}
          className="text-hiko-primary font-bold disabled:opacity-50 transition-opacity flex items-center gap-1.5"
        >
          {publishing ? <Loader2 size={16} className="animate-spin" /> : null}
          Publish
        </button>
      </div>

      <div className="p-6">
        <input
          ref={imgUpload.inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !user) return;
            await imgUpload.handleFile(file, user.id);
          }}
        />

        {/* Foto selezionata o area di upload */}
        {imgUpload.preview ? (
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-black/40 border border-white/10">
            <img src={imgUpload.preview} alt="Post" className="w-full h-full object-cover" />
            <button
              onClick={() => imgUpload.setPreview(null)}
              className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
            >
              <X size={16} />
            </button>
            <button
              onClick={imgUpload.open}
              className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-black/80"
            >
              <ImagePlus size={14} /> Cambia
            </button>
          </div>
        ) : (
          <button
            onClick={imgUpload.open}
            disabled={imgUpload.uploading}
            className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 text-white/40 hover:border-hiko-primary/40 hover:text-white/60 transition-colors mb-4"
          >
            {imgUpload.uploading
              ? <Loader2 size={36} className="animate-spin" />
              : <><ImagePlus size={36} /><span className="text-sm">Aggiungi una foto dal dispositivo</span></>
            }
          </button>
        )}

        <div className={`glass-panel rounded-2xl p-4 border ${
          captionViolation?.decision === 'blocked' ? 'border-red-500/50' :
          captionViolation?.decision === 'flagged' ? 'border-yellow-500/50' :
          'border-transparent'
        }`}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="How was your run?..."
            className="w-full bg-transparent border-none resize-none focus:outline-none text-white placeholder:text-white/40 h-32"
          />
        </div>
        {captionViolation?.decision === 'blocked' && (
          <div className="flex items-start gap-2 mt-2 px-1">
            <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{captionViolation.reason}</p>
          </div>
        )}
        {captionViolation?.decision === 'flagged' && (
          <div className="flex items-start gap-2 mt-2 px-1">
            <Info size={14} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">{captionViolation.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
