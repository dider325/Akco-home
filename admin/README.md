# AKCO Real Estate Ltd. — Admin Panel & Service Layer

This directory houses the approved AKCO Content Management Studio and its decoupled Supabase Service Layer.

## Directory Structure

```text
admin/
├── index.html             # Approved Admin Panel UI
├── styles.css             # Approved Admin Panel Stylesheet
├── app.js                 # Approved Admin UI Script (UI presentation state)
├── services/
│   ├── index.js           # Central barrel export for all services
│   ├── supabaseClient.js  # Browser Supabase client & config manager
│   ├── authService.js     # Auth, session, and admin authorization verification
│   ├── contentService.js  # CMS content, settings, services, team, legacy, social
│   ├── projectService.js  # Projects CRUD, galleries, statuses, reordering
│   ├── mediaService.js    # Supabase storage (akco-media) & media_assets registry
│   └── enquiryService.js  # Public enquiry ingestion & admin inbox management
```

## Security & Architecture Principles

1. **Decoupled Architecture**: Services translate database `snake_case` fields into camelCase frontend data contracts.
2. **Client-Side Anon Key Only**: The `service_role` secret key is never exposed to the client.
3. **Database-Level Authorization**: Security is governed by PostgreSQL Row-Level Security (RLS) policies using the `is_admin()` helper function querying the `admin_users` table.
4. **Storage Sync & Protection**: The `mediaService` keeps the `akco-media` storage bucket and `media_assets` catalog synchronized, rolling back failed database inserts to avoid orphaned files.
