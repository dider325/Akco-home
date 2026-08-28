-- =============================================================================
-- AKCO Real Estate Ltd. — Supabase Database Schema
-- Production Schema for AKCO Real Estate & Admin CMS
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. admin_users
-- Stores authorization records for authenticated administrators.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. projects
-- Residential development projects showcase.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    year TEXT NOT NULL DEFAULT '—',
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Completed', 'Ongoing', 'Upcoming', 'Published', 'Draft')),
    description TEXT NOT NULL DEFAULT '',
    featured_image TEXT NOT NULL DEFAULT '',
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_display_order ON projects(display_order);

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. services
-- Core business and development service offerings.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. team_members
-- Leadership and management profiles.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT NOT NULL DEFAULT '',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_display_order ON team_members(display_order);

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON team_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5. legacy_blocks
-- Story and history blocks for founders, milestones, and brand legacy.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legacy_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_type TEXT NOT NULL DEFAULT 'story' CHECK (block_type IN ('hero', 'intro', 'founder', 'name', 'transition', 'story', 'profile', 'quote', 'closing')),
    eyebrow TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT NOT NULL DEFAULT '',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_blocks_display_order ON legacy_blocks(display_order);

CREATE TRIGGER update_legacy_blocks_updated_at
BEFORE UPDATE ON legacy_blocks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. site_content
-- Structured text, headings, leads, and assets across page sections.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_content (
    id TEXT PRIMARY KEY,
    eyebrow TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    lead TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    extra_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON site_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 7. company_settings
-- Global contact details, brand metadata, and firm configuration.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    company_name TEXT NOT NULL DEFAULT 'AKCO Real Estate Ltd.',
    tagline TEXT NOT NULL DEFAULT 'Homes Done Thoughtfully',
    established_year TEXT NOT NULL DEFAULT '2005',
    address TEXT NOT NULL DEFAULT 'Address to be supplied by AKCO.',
    phone TEXT NOT NULL DEFAULT 'Phone number to be supplied by AKCO.',
    email TEXT NOT NULL DEFAULT 'Email address to be supplied by AKCO.',
    contact_intro TEXT NOT NULL DEFAULT 'Have a project, partnership or home in mind? We would be glad to hear from you.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 8. social_links
-- Social media presence and direct links.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_links_order ON social_links(display_order);

CREATE TRIGGER update_social_links_updated_at
BEFORE UPDATE ON social_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 9. contact_enquiries
-- Inbound visitor inquiries, partnership requests, and apartment questions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Read', 'Archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_status ON contact_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_enquiries_created ON contact_enquiries(created_at DESC);

-- -----------------------------------------------------------------------------
-- 10. media_assets
-- Central media library registry tracking files in Supabase Storage.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    usage_tag TEXT NOT NULL DEFAULT '',
    file_type TEXT NOT NULL DEFAULT 'SVG',
    file_size BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created ON media_assets(created_at DESC);
