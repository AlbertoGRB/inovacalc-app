import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Upload a signature image (base64 PNG) to Supabase Storage.
 * Returns the storage path.
 */
export async function uploadSignature(quoteId: string, base64Data: string): Promise<string> {
  // Remove data URI prefix if present
  const raw = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const path = `${quoteId}.png`;

  const { error } = await supabase.storage
    .from('signatures')
    .upload(path, decode(raw), {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;
  return path;
}

/**
 * Get a signed URL for a signature image.
 */
export async function getSignatureUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('signatures')
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Update the quote's signature_url column.
 */
export async function updateQuoteSignature(quoteId: string, signaturePath: string): Promise<void> {
  const { error } = await supabase
    .from('quotes')
    .update({ signature_url: signaturePath })
    .eq('id', quoteId);

  if (error) throw error;
}
