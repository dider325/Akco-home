/**
 * AKCO Real Estate Ltd. — Media Service Layer
 * Manages Supabase Storage uploads, public URL generation, deletions,
 * and synchronizes with the media_assets database registry.
 */
import { getSupabase } from './supabaseClient.js';

export const BUCKET_NAME = 'akco-media';
export const VALID_FOLDERS = ['projects', 'website', 'team', 'legacy', 'brand'];
export const ALLOWED_MIME_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function sanitizeFilename(filename) {
  return filename
    .toLowerCase()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_');
}

function detectFileType(filename, mimeType) {
  if (mimeType === 'image/svg+xml' || filename.endsWith('.svg')) return 'SVG';
  if (mimeType === 'image/png' || filename.endsWith('.png')) return 'PNG';
  if (mimeType === 'image/jpeg' || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'JPEG';
  if (mimeType === 'image/webp' || filename.endsWith('.webp')) return 'WEBP';
  return 'IMAGE';
}

function mapAssetFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    filename: row.filename,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    usageTag: row.usage_tag || '',
    fileType: row.file_type || 'IMAGE',
    fileSize: row.file_size || 0,
    createdAt: row.created_at
  };
}

export function getPublicUrl(storagePath) {
  const client = getSupabase();
  if (!client || !storagePath) return '';

  const { data } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return data?.publicUrl || '';
}

export function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    if (!file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      const maxWidth = 1920;
      const maxHeight = 1080;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/png' ? undefined : 0.82;
      const dataUrl = canvas.toDataURL(mimeType, quality);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
}

export async function uploadAsset(file, folder = 'website', usageTag = '') {
  if (!file) return { data: null, error: new Error('No file provided for upload') };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { data: null, error: new Error('File exceeds maximum allowed size of 10MB') };
  }

  const client = getSupabase();
  const cleanName = sanitizeFilename(file.name || 'asset');
  const uniqueTimestamp = Date.now();
  const targetFolder = VALID_FOLDERS.includes(folder) ? folder : 'website';
  const storagePath = `${targetFolder}/${uniqueTimestamp}-${cleanName}`;
  const fileType = detectFileType(cleanName, file.type);

  if (!client) {
    const dataUrl = await fileToDataUrl(file);
    return {
      data: { id: String(uniqueTimestamp), filename: cleanName, storagePath: '', publicUrl: dataUrl, fileType, fileSize: file.size || 0 },
      error: null
    };
  }

  try {
    const { error: uploadError } = await client.storage.from(BUCKET_NAME).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined
    });

    if (uploadError) {
      return { data: null, error: new Error(`Supabase Storage upload failed (${uploadError.statusCode || 400}): ${uploadError.message || 'Unknown Storage error'}`) };
    }

    const publicUrl = getPublicUrl(storagePath);
    const { data: assetRecord, error: dbError } = await client.from('media_assets').insert({
      filename: cleanName,
      storage_path: storagePath,
      public_url: publicUrl,
      usage_tag: usageTag || `${targetFolder} asset`,
      file_type: fileType,
      file_size: file.size || 0
    }).select().maybeSingle();

    if (dbError) {
      // Roll back the Storage object if catalog registration fails.
      await client.storage.from(BUCKET_NAME).remove([storagePath]);
      return { data: null, error: new Error(`Media catalog save failed: ${dbError.message || 'Unknown database error'}`) };
    }

    return { data: assetRecord ? mapAssetFromDb(assetRecord) : {
      id: String(uniqueTimestamp), filename: cleanName, storagePath, publicUrl, fileType, fileSize: file.size || 0
    }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteAsset(assetId, storagePath) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    // 1. Delete from database
    if (assetId) {
      const { error: dbError } = await client
        .from('media_assets')
        .delete()
        .eq('id', assetId);

      if (dbError) return { data: false, error: dbError };
    }

    // 2. Delete from storage if path provided
    if (storagePath) {
      const { error: storageError } = await client.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (storageError) return { data: false, error: storageError };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err };
  }
}

export async function listAssets(options = {}) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    let query = client
      .from('media_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.fileType && options.fileType !== 'All') {
      query = query.eq('file_type', options.fileType.toUpperCase());
    }

    if (options.search) {
      query = query.or(`filename.ilike.%${options.search}%,usage_tag.ilike.%${options.search}%`);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: (data || []).map(mapAssetFromDb), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
