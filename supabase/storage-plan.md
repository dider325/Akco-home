# Supabase Storage Plan — AKCO Real Estate Ltd.

## 1. Storage Overview

The media infrastructure uses a single dedicated public bucket for all web and administrative media assets.

* **Bucket Name**: `akco-media`
* **Public Access**: `true` (Allows CDN delivery for public website rendering)
* **Maximum File Size**: `10MB` (10,485,760 bytes)
* **Allowed MIME Types**:
  * `image/svg+xml` (.svg)
  * `image/png` (.png)
  * `image/jpeg` (.jpg, .jpeg)
  * `image/webp` (.webp)

---

## 2. Directory Structure

Media assets are organized by functional domain to ensure clean separation and predictable asset URLs:

```text
akco-media/
├── projects/      # Project hero images, architectural renders, floorplans, and gallery items
│   ├── project-1.svg
│   ├── project-2.svg
│   └── project-3.svg
├── website/       # General site imagery, homepage hero, and background textures
│   ├── hero.svg
│   ├── story.svg
│   └── map.svg
├── team/          # Leadership and management portrait imagery
│   ├── portrait-1.svg
│   ├── portrait-2.svg
│   └── portrait-3.svg
├── legacy/        # Historical archive photos and founder legacy profiles
│   ├── history-1.svg
│   └── history-2.svg
└── brand/         # Logomarks, emblems, icons, and official brand assets
    └── akco-logo.png
```

---

## 3. Storage Setup SQL

The following SQL configuration sets up the storage bucket and its security policies:

```sql
-- 1. Create the akco-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'akco-media',
  'akco-media',
  true,
  10485760,
  ARRAY['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];

-- 2. Public Read Access Policy
CREATE POLICY "Public Read Access for akco-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'akco-media');

-- 3. Admin Upload Policy
CREATE POLICY "Admin Upload Access for akco-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'akco-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  )
);

-- 4. Admin Update Policy
CREATE POLICY "Admin Update Access for akco-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'akco-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  )
);

-- 5. Admin Delete Policy
CREATE POLICY "Admin Delete Access for akco-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'akco-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  )
);
```

---

## 4. Admin Media Workflow

The Admin Panel interacts with the media storage layer via the `mediaService`:

1. **Upload**: User selects or drops an SVG, PNG, JPG, or WEBP file.
2. **Path Resolution**: The service names the file predictably (e.g. `projects/{timestamp}-{sanitized-name}.svg`) and uploads it to `akco-media`.
3. **Registry Sync**: Upon successful upload, a metadata record is written to the `media_assets` database table (`filename`, `storage_path`, `public_url`, `file_type`, `file_size`, `usage_tag`).
4. **Content Assignment**: The public URL or storage path is assigned to projects, team members, services, or site content.
5. **Asset Deletion**: Deleting from the media library removes both the database record and the file in storage.
