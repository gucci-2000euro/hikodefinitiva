import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type Bucket = 'avatars' | 'community-covers' | 'post-images' | 'dm-images';

export function useImageUpload(bucket: Bucket) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => inputRef.current?.click();

  const handleFile = async (
    file: File,
    userId: string,
  ): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { console.error(error); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setPreview(data.publicUrl);
    return data.publicUrl;
  };

  return { uploading, preview, setPreview, open, inputRef, handleFile };
}
