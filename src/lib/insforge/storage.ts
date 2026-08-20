/**
 * Helper to construct public URL for files in InsForge Storage
 */
export function getStorageFileUrl(storagePath?: string | null, bucket = 'chat-files'): string {
  if (!storagePath) return '';
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://4krks269.us-east.insforge.app').replace(/\/+$/, '');
  
  // Format: https://{host}/api/storage/buckets/{bucket}/objects/{encodedPath}
  return `${baseUrl}/api/storage/buckets/${bucket}/objects/${encodeURIComponent(storagePath)}`;
}
