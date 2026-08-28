-- =============================================================================
-- AKCO Real Estate Ltd. — Row Level Security (RLS) Policies
-- Production Security Rules for Public Website & Admin Operations
-- =============================================================================

-- Enable Row Level Security across all application tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE legacy_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Helper Function: is_admin()
-- Verifies that the current caller is an authenticated user with an active
-- entry in the admin_users table (prevents standard auth users from having admin rights).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 1. admin_users Policies
-- -----------------------------------------------------------------------------
-- Users can read their own admin record if authenticated
CREATE POLICY "Allow users to view own admin status"
ON admin_users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Active admins can view all admin users
CREATE POLICY "Allow active admins to view all admin users"
ON admin_users FOR SELECT
TO authenticated
USING (is_admin());

-- Only active admins can create, update, or remove admin users
CREATE POLICY "Allow active admins to insert admin users"
ON admin_users FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Allow active admins to update admin users"
ON admin_users FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Allow active admins to delete admin users"
ON admin_users FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 2. projects Policies
-- Public can read published/active projects. Active admins can manage all projects.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view published and active projects"
ON projects FOR SELECT
TO public
USING (
  status IN ('Published', 'Completed', 'Ongoing', 'Upcoming')
  OR is_admin()
);

CREATE POLICY "Admins can insert projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update projects"
ON projects FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete projects"
ON projects FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 3. services Policies
-- Public can read services. Active admins have full CRUD.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view all services"
ON services FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert services"
ON services FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update services"
ON services FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete services"
ON services FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 4. team_members Policies
-- Public can view team members. Active admins have full CRUD.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view team members"
ON team_members FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert team members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update team members"
ON team_members FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete team members"
ON team_members FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 5. legacy_blocks Policies
-- Public can view legacy blocks. Active admins have full CRUD.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view legacy blocks"
ON legacy_blocks FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert legacy blocks"
ON legacy_blocks FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update legacy blocks"
ON legacy_blocks FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete legacy blocks"
ON legacy_blocks FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 6. site_content Policies
-- Public can read site content sections. Active admins have full CRUD.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view site content"
ON site_content FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert site content"
ON site_content FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update site content"
ON site_content FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete site content"
ON site_content FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 7. company_settings Policies
-- Public can view company settings. Active admins have full CRUD.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view company settings"
ON company_settings FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert company settings"
ON company_settings FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update company settings"
ON company_settings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete company settings"
ON company_settings FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 8. social_links Policies
-- Public can view active social links. Active admins can view and manage all links.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view active social links"
ON social_links FOR SELECT
TO public
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert social links"
ON social_links FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update social links"
ON social_links FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete social links"
ON social_links FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 9. contact_enquiries Policies
-- Public / anon can submit enquiries. ONLY active admins can read, update, or delete.
-- -----------------------------------------------------------------------------
CREATE POLICY "Anyone can submit a contact enquiry"
ON contact_enquiries FOR INSERT
TO public
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) > 0 AND
  email IS NOT NULL AND length(trim(email)) > 0 AND
  message IS NOT NULL AND length(trim(message)) > 0
);

CREATE POLICY "Admins can view contact enquiries"
ON contact_enquiries FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update contact enquiries"
ON contact_enquiries FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete contact enquiries"
ON contact_enquiries FOR DELETE
TO authenticated
USING (is_admin());

-- -----------------------------------------------------------------------------
-- 10. media_assets Policies
-- Public can view media library assets. Active admins have full CRUD.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view media assets"
ON media_assets FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert media assets"
ON media_assets FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update media assets"
ON media_assets FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete media assets"
ON media_assets FOR DELETE
TO authenticated
USING (is_admin());
