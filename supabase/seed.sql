-- =============================================================================
-- AKCO Real Estate Ltd. — Production Database Seed
-- Populates exact real website content across all sections and entities
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. company_settings
-- -----------------------------------------------------------------------------
INSERT INTO company_settings (
    id,
    company_name,
    tagline,
    established_year,
    address,
    phone,
    email,
    contact_intro
)
VALUES (
    'default',
    'AKCO Real Estate Ltd.',
    'Homes Done Thoughtfully',
    '2005',
    'Address to be supplied by AKCO.',
    'Phone number to be supplied by AKCO.',
    'Email address to be supplied by AKCO.',
    'Have a project, partnership or home in mind? We would be glad to hear from you.'
)
ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    tagline = EXCLUDED.tagline,
    established_year = EXCLUDED.established_year,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    contact_intro = EXCLUDED.contact_intro;

-- -----------------------------------------------------------------------------
-- 2. services
-- -----------------------------------------------------------------------------
INSERT INTO services (title, description, image_url, display_order)
VALUES
(
    'Residential Development',
    'Homes shaped by thoughtful planning, architecture and everyday living.',
    'assets/project-1.svg',
    1
),
(
    'Joint Venture / Landowner Partnerships',
    'Long-term partnerships built around clarity, trust and shared value.',
    'assets/project-2.svg',
    2
),
(
    'Sale of Apartments',
    'Considered homes presented with care from first conversation to handover.',
    'assets/project-3.svg',
    3
);

-- -----------------------------------------------------------------------------
-- 3. projects
-- -----------------------------------------------------------------------------
INSERT INTO projects (name, slug, location, year, status, description, featured_image, images, display_order)
VALUES
(
    'Project Name One',
    'project-name-one',
    'Location placeholder',
    '2026',
    'Completed',
    'Approved project description will be added here.',
    'assets/project-1.svg',
    '["assets/project-1.svg"]'::jsonb,
    1
),
(
    'Project Name Two',
    'project-name-two',
    'Location placeholder',
    '2026',
    'Ongoing',
    'Approved project description will be added here.',
    'assets/project-2.svg',
    '["assets/project-2.svg"]'::jsonb,
    2
),
(
    'Project Name Three',
    'project-name-three',
    'Location placeholder',
    '2027',
    'Upcoming',
    'Approved project description will be added here.',
    'assets/project-3.svg',
    '["assets/project-3.svg"]'::jsonb,
    3
);

-- -----------------------------------------------------------------------------
-- 4. team_members
-- -----------------------------------------------------------------------------
INSERT INTO team_members (name, role, bio_paragraphs, image_url, display_order)
VALUES
(
    'Mehejabeen Z Khan',
    'Managing Director',
    '[
        "Mehejabeen Z Khan brings over 15 years of experience as a development professional, having worked extensively with international charities in a consulting capacity. She holds a Master of Social Sciences in Economics from the University of Dhaka.",
        "As Managing Director of AKCO Real Estate Limited, she leads the company with a strong sense of responsibility, continuity, and care—carrying forward its founding values while ensuring a steady and thoughtful approach to growth. Alongside her professional work, she remains actively involved in both local and international women’s advocacy initiatives."
    ]'::jsonb,
    'assets/portrait-1.svg',
    1
),
(
    'Zarka Hasan Khan',
    'Director',
    '[
        "Zarka Hasan Khan holds a double major in Economics and Accounting from City, University of London, and a Master’s degree in Corporate Finance from Queen Mary University of London.",
        "As a Director at AKCO Real Estate Limited, she brings a modern, forward-looking perspective to the company, contributing to its evolving approach while remaining grounded in its core values of thoughtful design and long-term livability. She is actively involved in the strategic direction and brand development of the company."
    ]'::jsonb,
    'assets/portrait-2.svg',
    2
),
(
    'Rayma Hasan Khan',
    'Director',
    '[
        "Rayma Hasan Khan is currently pursuing a degree in Architecture at BRAC University, Dhaka.",
        "With a strong interest in design and the built environment, she represents the next phase of the company’s journey, with a focus on integrating architectural thinking into AKCO’s future developments."
    ]'::jsonb,
    'assets/portrait-3.svg',
    3
);

-- -----------------------------------------------------------------------------
-- 5. legacy_blocks
-- -----------------------------------------------------------------------------
INSERT INTO legacy_blocks (block_type, eyebrow, title, paragraphs, image_url, display_order)
VALUES
(
    'hero',
    'Management & Legacy',
    'Built on values. Carried forward.',
    '["A foundation of care, integrity and purpose — carried into the next generation of AKCO."]'::jsonb,
    'assets/hero.svg',
    1
),
(
    'intro',
    'Our Story & Legacy',
    'Some foundations are built to last.',
    '["AKCO''s story began with a clear sense of purpose — and continues through a new generation committed to the same principles."]'::jsonb,
    '',
    2
),
(
    'founder',
    'The Founder',
    'Late Mr. Hasanuzzaman Khan',
    '[
        "AKCO Real Estate Limited was founded with a clear sense of purpose by Late Mr. Hasanuzzaman Khan, whose passion for building was rooted in care, attention to detail, and a deep understanding of what makes a home truly livable.",
        "A distinguished businessman, his work spanned multiple sectors including manufacturing, healthcare, and real estate. He dedicated over three decades to managing Eastern Steel Mills Limited, a family-run steel rolling mill originally established by his father. Through this experience, he developed a strong technical understanding of materials, structure, and construction—an insight that naturally led him toward real estate development.",
        "In addition, he served as Managing Director of General Medical Hospital, reflecting his broader commitment to building institutions that serve both industry and community. He was also known for his philanthropic outlook and active involvement in education, contributing to institutions such as Mohammadpur Preparatory School & College and Dohar Nawabganj College, while also serving as a former member of the Board of Trustees of Bangladesh University.",
        "His values, integrity, and thoughtful approach continue to shape the foundation and direction of the company today."
    ]'::jsonb,
    'assets/history-1.svg',
    3
),
(
    'name',
    'The Name',
    'A legacy behind the name.',
    '[
        "The name AKCO itself carries a legacy. It is inspired by Late Mr. Ata Uddin Khan, a highly respected figure in Bangladesh whose life was defined by discipline, leadership, and public service. A Chartered Accountant (UK) by profession, he held several distinguished roles, including Finance & Manpower Minister, Chairman of Bangladesh Krishi Bank, Chairman of Agrani Bank, and Chairman of the Censor Board.",
        "Beyond his public service, he made lasting contributions to education as the Founder of Dohar Nawabganj College and Mohammadpur Preparatory School, and served as a member of the Board of Trustees of Bangladesh University. His work ethic and sense of responsibility left a lasting impression, inspiring the founding vision of AKCO Real Estate Limited and its continued commitment to building with integrity, care, and purpose."
    ]'::jsonb,
    'assets/history-2.svg',
    4
),
(
    'transition',
    'Carrying It Forward',
    'Today, the company is led by the next generation, carrying forward this legacy while shaping a more contemporary, thoughtful approach to residential development.',
    '[]'::jsonb,
    '',
    5
),
(
    'closing',
    'Legacy & Leadership',
    'Building with integrity. Moving forward with purpose.',
    '[]'::jsonb,
    '',
    6
);

-- -----------------------------------------------------------------------------
-- 6. site_content
-- -----------------------------------------------------------------------------
INSERT INTO site_content (id, eyebrow, title, lead, body, image_url, extra_data)
VALUES
(
    'homepage_hero',
    'Boutique Residential Developer · Dhaka',
    'Homes Done Thoughtfully.',
    'Thoughtfully considered homes shaped by architecture, care and a long-term view.',
    '',
    'assets/hero.svg',
    '{"scroll_label": "Scroll to explore", "hero_mark": "AKCO"}'::jsonb
),
(
    'homepage_approach',
    'The AKCO Approach',
    'A quieter approach to residential development.',
    'AKCO Real Estate Ltd. is a boutique residential developer based in Dhaka. We create homes shaped by architecture, quality, and the realities of everyday life.',
    'Dhaka · Residential Development',
    '',
    '{"section_kicker": "A boutique point of view", "link_label": "Discover AKCO", "link_url": "about.html"}'::jsonb
),
(
    'homepage_philosophy',
    'Brand Philosophy',
    'Thoughtful by design.',
    'We believe the best homes are not simply built. They are considered — from proportion and light to material, detail and the everyday experience of living.',
    '',
    '',
    '{
        "topline_span": "Homes Done Thoughtfully",
        "principles": [
            {"title": "Thoughtful Design", "description": "Design decisions should improve the experience of home."},
            {"title": "Quality Over Quantity", "description": "We value lasting quality over unnecessary volume."},
            {"title": "Built for Living", "description": "Homes are considered around the realities of everyday life."},
            {"title": "Care in Every Detail", "description": "Small decisions shape the feeling of a place."},
            {"title": "Trust & Responsibility", "description": "Long-term relationships begin with clarity and integrity."},
            {"title": "Calm, Considered Development", "description": "A measured approach creates better places and better outcomes."}
        ]
    }'::jsonb
),
(
    'homepage_cta',
    'Begin a Conversation',
    'Creating Homes. Building Trust.',
    'Have a project, partnership or home in mind? We would be glad to hear from you.',
    '',
    '',
    '{
        "button_primary": {"label": "Explore Projects", "url": "projects.html"},
        "button_secondary": {"label": "Contact AKCO", "url": "contact.html"}
    }'::jsonb
),
(
    'about_hero',
    'About AKCO',
    'Homes Done Thoughtfully.',
    'Established 2005 · Dhaka · Residential Development',
    '',
    'assets/hero.svg',
    '{"established": "Established 2005", "location": "Dhaka · Residential Development"}'::jsonb
),
(
    'about_intro',
    'About AKCO',
    'A quieter approach to residential development.',
    'AKCO Real Estate Limited is a boutique residential developer based in Dhaka, established in 2005. Over the years, we have developed a select number of projects, with a focus on quality, livability, and thoughtful design.',
    'Our approach is simple—we create homes with intention, where comfort, warmth, and thoughtful design come together to offer a more elevated way of living. Each project is carefully considered, with close attention to layout, natural light, and the overall experience of living in the space.',
    '',
    '{
        "paragraphs": [
            "Our approach is simple—we create homes with intention, where comfort, warmth, and thoughtful design come together to offer a more elevated way of living. Each project is carefully considered, with close attention to layout, natural light, and the overall experience of living in the space. In a city where many developments prioritize scale, we take a more measured approach—creating homes that feel comfortable, functional, and quietly refined, both inside and out.",
            "We design with an understanding of how families in Dhaka live, prioritizing flow and spaces that feel natural and easy to use every day. Equal importance is given to how each building presents itself, ensuring a timeless and well-composed exterior that complements the experience within. Over time, our work has been shaped by close, enduring relationships with our clients—grounded in trust, care, and a consistent commitment to quality."
        ]
    }'::jsonb
),
(
    'about_cinema',
    'Vision',
    'To create homes that feel timeless and thoughtfully designed—bringing together comfort, beauty, and lasting value for families in Dhaka, through a quieter and more considered approach to development.',
    'Homes Done Thoughtfully',
    '',
    'assets/story.svg',
    '{"vision_eyebrow": "Vision", "tagline_eyebrow": "Tagline", "tagline": "Homes Done Thoughtfully"}'::jsonb
),
(
    'about_values',
    'Our Values',
    'What guides our work.',
    'Our Values',
    '',
    '',
    '{
        "values": [
            {"title": "Thoughtful Design", "description": "We approach every home with intention, ensuring that layouts, flow, and details are carefully planned to support everyday living—not just visual appeal."},
            {"title": "Quality Over Quantity", "description": "We take on a limited number of projects at a time, allowing us to maintain a higher level of attention, consistency, and care in everything we build."},
            {"title": "Built for Living", "description": "Our homes are designed for long-term comfort, with practical layouts, ample natural light, and spaces that feel easy to live in day to day."},
            {"title": "Care in Every Detail", "description": "From the exterior presence of a building to the smallest interior decisions, we focus on creating spaces that feel cohesive, refined, and well-considered."},
            {"title": "Trust & Responsibility", "description": "We value the trust our clients place in us and approach every project with honesty, accountability, and a long-term sense of responsibility."},
            {"title": "Calm, Considered Development", "description": "We do not believe in repetitive, large-scale construction. Each project is approached individually, with a focus on creating homes that feel personal rather than standardized."}
        ]
    }'::jsonb
),
(
    'about_closing',
    'Homes Done Thoughtfully',
    'A quieter approach to building homes.',
    '',
    '',
    '',
    '{}'::jsonb
),
(
    'contact_hero',
    'AKCO / Contact',
    'Let''s Talk.',
    'Project enquiries · Partnerships · Apartment sales',
    '',
    '',
    '{"scroll_label": "Scroll to connect ↓"}'::jsonb
),
(
    'contact_intro',
    'Start a conversation',
    'Tell us what you''re looking for.',
    'For project enquiries, partnerships and apartment sales, connect with the AKCO team.',
    '',
    '',
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    eyebrow = EXCLUDED.eyebrow,
    title = EXCLUDED.title,
    lead = EXCLUDED.lead,
    body = EXCLUDED.body,
    image_url = EXCLUDED.image_url,
    extra_data = EXCLUDED.extra_data,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 7. social_links
-- -----------------------------------------------------------------------------
INSERT INTO social_links (platform, url, is_active, display_order)
VALUES
('Facebook', 'https://facebook.com/akco', true, 1),
('Instagram', 'https://instagram.com/akco', true, 2),
('LinkedIn', 'https://linkedin.com/company/akco', true, 3);

-- -----------------------------------------------------------------------------
-- 8. media_assets
-- -----------------------------------------------------------------------------
INSERT INTO media_assets (filename, storage_path, public_url, usage_tag, file_type, file_size)
VALUES
('hero.svg', 'website/hero.svg', 'assets/hero.svg', 'Homepage · Hero background', 'SVG', 12400),
('story.svg', 'website/story.svg', 'assets/story.svg', 'About · Story cinema section', 'SVG', 9800),
('map.svg', 'website/map.svg', 'assets/map.svg', 'Contact · Interactive map locator', 'SVG', 6200),
('project-1.svg', 'projects/project-1.svg', 'assets/project-1.svg', 'Project Name One · Featured imagery', 'SVG', 14500),
('project-2.svg', 'projects/project-2.svg', 'assets/project-2.svg', 'Project Name Two · Featured imagery', 'SVG', 15200),
('project-3.svg', 'projects/project-3.svg', 'assets/project-3.svg', 'Project Name Three · Featured imagery', 'SVG', 13800),
('portrait-1.svg', 'team/portrait-1.svg', 'assets/portrait-1.svg', 'Leadership · Mehejabeen Z Khan', 'SVG', 11200),
('portrait-2.svg', 'team/portrait-2.svg', 'assets/portrait-2.svg', 'Leadership · Zarka Hasan Khan', 'SVG', 10800),
('portrait-3.svg', 'team/portrait-3.svg', 'assets/portrait-3.svg', 'Leadership · Rayma Hasan Khan', 'SVG', 11500),
('history-1.svg', 'legacy/history-1.svg', 'assets/history-1.svg', 'Legacy · Late Mr. Hasanuzzaman Khan', 'SVG', 16400),
('history-2.svg', 'legacy/history-2.svg', 'assets/history-2.svg', 'Legacy · Late Mr. Ata Uddin Khan', 'SVG', 15900),
('akco-logo.png', 'brand/akco-logo.png', 'assets/akco-logo.png', 'Brand · Primary Emblem Logomark', 'PNG', 42000)
ON CONFLICT (storage_path) DO NOTHING;
