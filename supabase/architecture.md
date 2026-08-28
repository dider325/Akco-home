# AKCO Real Estate Ltd. — System Architecture & Backend Specification

## 1. Architectural Overview

The AKCO application follows a decoupled multi-tier architecture designed to maintain complete independence between the database schema, administrative CMS operations, and the public website frontend.

```text
┌────────────────────────────────────────────────────────┐
│             Supabase Cloud Infrastructure             │
│                                                        │
│  ┌──────────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │   PostgreSQL DB   │ │   Storage    │ │    Auth    │  │
│  │   (RLS Enforced)  │ │ (akco-media) │ │ (Email/PW) │  │
│  └────────┬─────────┘ └──────┬───────┘ └─────┬──────┘  │
└───────────┼──────────────────┼───────────────┼─────────┘
            │                  │               │
            ▼                  ▼               ▼
┌────────────────────────────────────────────────────────┐
│               Service & Client API Layer               │
│                                                        │
│  • supabaseClient.js (Anon key + Session management)  │
│  • authService.js    (Admin login, logout, session)    │
│  • contentService.js (Homepage, About, Legacy, Config) │
│  • projectService.js (Projects CRUD, status, filter)   │
│  • mediaService.js   (Uploads, registry, deletions)    │
│  • enquiryService.js (Inquiries ingestion & review)    │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│    Admin Panel UI     │       │    Public Website     │
│                       │       │                       │
│ • Dashboard & Stats   │       │ • Data Contract Layer │
│ • Content Editors     │       │   (AKCO_DATA adapter) │
│ • Project Manager     │       │ • GSAP / ScrollTrigger│
│ • Media Library       │       │ • Lenis Smooth Scroll │
│ • Inquiries Inbox     │       │ • Pure Presentation  │
└───────────────────────┘       └───────────────────────┘
```

---

## 2. Core Database Entities (10 Agreed Tables)

1. **`admin_users`**: Maps Supabase Auth `auth.users(id)` to CMS administrator permissions with an explicit `is_active` boolean guard.
2. **`projects`**: Real estate developments with `name`, `slug`, `location`, `year`, `status`, `description`, `featured_image`, `images` (JSONB array), and `display_order`.
3. **`services`**: Development service items with title, description, image, and ordering.
4. **`team_members`**: Leadership profiles with name, role, bio paragraphs (JSONB array), portrait image, and ordering.
5. **`legacy_blocks`**: Story blocks supporting founder narratives, history, milestone quotes, and legacy details.
6. **`site_content`**: Structured section-by-section CMS content for Hero, Approach, Philosophy, Vision, Tagline, and CTA blocks.
7. **`company_settings`**: Global business metadata (address, phone, contact email, tagline, year established).
8. **`social_links`**: Social network channels with active toggles and ordering.
9. **`contact_enquiries`**: Inbound customer inquiries and partnership requests.
10. **`media_assets`**: Asset registry tracking Supabase Storage paths, MIME types, file sizes, and usage tags.

---

## 3. Frontend Data Contract Compatibility

The public website relies on a clean data contract established in `js/data.js`:

```typescript
interface Project {
  id: string | number;
  name: string;
  location: string;
  year: string;
  status: 'Completed' | 'Ongoing' | 'Upcoming' | 'Published' | 'Draft';
  description: string;
  featuredImage: string;
  images: string[];
  displayOrder?: number;
  updatedAt?: string;
}
```

The database schema directly mirrors this structure (using standard SQL `snake_case` column naming). When data is fetched by the `contentService`, an adapter will translate database fields into the camelCase `AKCO_DATA` structure, ensuring zero disruption to existing website scripts or animations.

---

## 4. Security & Access Control Model

* **Service Role Secret Protection**: The `service_role` key is **never** embedded in client-side code or repositories. All client interactions use the public `anon` key.
* **Row-Level Security (RLS)**:
  * Public anonymous visitors can only execute `SELECT` queries on published and active website content.
  * Public visitors can execute `INSERT` on `contact_enquiries` to send messages, but cannot read or query enquiries.
  * Only authenticated users whose `id` exists in `admin_users` with `is_active = true` (verified via the `is_admin()` SQL function) are granted write and deletion permissions.
* **Storage Protection**:
  * The `akco-media` bucket is configured for public read access via CDN.
  * Storage object writes (`INSERT`, `UPDATE`, `DELETE`) are strictly restricted to verified active admin users via storage RLS policies.
