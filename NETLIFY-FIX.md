# AKCO Netlify Fix

This build removes the public/admin dependency on the Express `/api/config` endpoint.
Supabase browser client is loaded from `js/vendor/supabase.js` and uses the existing
public `js/supabase-config.js`.

Deploy the repository root (`akco-home`) as the Netlify site root.
No `server.js` is required for the static frontend/admin deployment.

Important:
- Keep the Supabase anon/public key only. Never use service_role in browser code.
- The public site reads CMS content directly from Supabase.
- Draft projects remain filtered out of public pages.
