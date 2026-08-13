    -- ============================================================================
-- Ten locally owned Albuquerque coffee shops.
--
-- Real businesses, real addresses, real phone numbers. Coordinates come from
-- OpenStreetMap's geocoder against the street address, so they land on the
-- building, not the neighborhood. Addresses, phones and hours were verified
-- against each shop's own site (or a current listing) on 2026-08-13 — hours in
-- particular drift, so treat them as a snapshot rather than gospel.
--
-- No chains: every shop here is independently owned in Albuquerque. Three
-- obvious candidates were cut during verification because they have closed —
-- Winning Coffee (111 Harvard SE), Deep Space Coffee (504 Central SW) and
-- Prosum Roasters' Los Arboles cafe. Don't add them back without checking.
--
-- This script is ADDITIVE. It does not touch the `Seed Alpha/Bravo/Charlie`
-- shops from sql/seed-matches.sql, because `favorite`, `visit` and `rating`
-- hold foreign keys to them and the matching and tags tickets depend on that
-- data. The undo block at the bottom removes only what this file inserted.
--
-- Safe to run more than once: the insert is ON CONFLICT DO NOTHING and the ids
-- are fixed, so a second run changes nothing.
--
-- Run it:  psql "$DATABASE_URL" -f sql/seed-shops-abq.sql
-- (This writes to the shared team database.)
--
--
-- WHAT THE SCHEMA DEMANDS
--
-- A bad row does NOT fail here. It inserts fine and then blows up on the way
-- OUT, as a 500 from GET /apis/shops, because selectAllShops() runs every row
-- through ShopSchema (backend/src/apis/shop/shop.model.ts). So:
--
--   id         must be a genuine uuidv7 — version nibble 7, variant nibble 8.
--              A random uuid stores fine and then fails z.uuidv7() on read.
--              These use a reserved 01900000-0000-7000-8000-0000000040NN block
--              so they cannot collide with seed-matches.sql's ...3001-3003.
--   hours      lowercase day keys, each value max 32 chars. Days are optional,
--              so a shop with unconfirmed weekend hours simply omits them.
--   lat/lng    numeric(9,6). Six decimal places, roughly 10cm of precision.
--   name       1-63 chars.
--   phone      10-31 chars. The +1-505-... form is the house style.
--   image_url  a valid URL, max 255 chars, and NOT nullable.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- The shops.
--
-- image_url points at each shop's own photography where they publish it. Two
-- exceptions worth knowing about, both called out inline below: Java Joe's
-- serves a logo rather than a storefront photo, and Michael Thomas / Humble
-- are hotlinked from the Nob Hill Main Street business directory because
-- neither shop's own site exposes a usable image URL. These are hotlinks — if
-- one of these shops redesigns, that row's image 404s and the API stays happy
-- (the URL is still valid), so the breakage will only ever show up in the
-- browser.
-- ---------------------------------------------------------------------------
INSERT INTO shop (id, address, hours, lat, lng, name, phone, image_url) VALUES

    -- Nob Hill roaster, going since 2004. Note this is the Bryn Mawr shop; the
    -- Carlisle Blvd location that shows up in older listings has closed.
    ('01900000-0000-7000-8000-000000004001',
     '202 Bryn Mawr Dr SE, Albuquerque, NM 87106',
     '{"monday":"6am-3pm","tuesday":"6am-3pm","wednesday":"6am-3pm","thursday":"6am-3pm","friday":"6am-3pm","saturday":"7am-3pm","sunday":"7am-3pm"}',
     35.078953, -106.609262, 'Michael Thomas Coffee Roasters', '+1-505-504-7078',
     -- via the Nob Hill Main Street directory; michaelthomascoffee.com exposes no image URL
     'https://nobhillmainstreet.org/wp-content/uploads/2023/02/313722824_455777346644961_8968002634963461974_n.jpg'),

    -- Old Town roastery. Closed Mondays, which is why that key is absent.
    ('01900000-0000-7000-8000-000000004002',
     '1208 Rio Grande Blvd NW, Albuquerque, NM 87104',
     '{"tuesday":"7:30am-3pm","wednesday":"7:30am-3pm","thursday":"7:30am-3pm","friday":"7:30am-3pm","saturday":"8am-3pm","sunday":"8am-3pm"}',
     35.107074, -106.670992, 'Cutbow Coffee Roastology', '+1-505-355-5563',
     'https://cdn.prod.website-files.com/6a3f02de2b0a2a053a754677/6a423b766a971a16109682f5_imgi_7_cc.jpeg'),

    -- Downtown, doubles as a rotating gallery for local artists.
    ('01900000-0000-7000-8000-000000004003',
     '413 2nd St SW, Albuquerque, NM 87102',
     '{"monday":"7am-7pm","tuesday":"7am-7pm","wednesday":"7am-7pm","thursday":"7am-7pm","friday":"7am-7pm","saturday":"7am-7pm","sunday":"7am-7pm"}',
     35.080763, -106.650032, 'Zendo Coffee', '+1-505-926-1636',
     'https://images.squarespace-cdn.com/content/v1/625dd73774359a22f1a761d6/1651857088347-TLRW4ETRWL28BDZR1J72/Zendo-05-22-1430947.jpg'),

    -- Uptown location. Weekend hours are deliberately omitted: only Mon-Fri
    -- could be confirmed, and hours is a partial object, so this is legal and
    -- exercises the missing-day path in the UI.
    ('01900000-0000-7000-8000-000000004004',
     '2632 Pennsylvania St NE, Albuquerque, NM 87110',
     '{"monday":"7am-6pm","tuesday":"7am-6pm","wednesday":"7am-6pm","thursday":"7am-6pm","friday":"7am-6pm"}',
     35.110865, -106.559426, 'Little Bear Coffee', '+1-505-300-4685',
     'https://littlebearcoffee.com/cdn/shop/files/LB_Roastery-4983_600x.jpg?v=1782408319'),

    -- The Lomas shop. Their Central Ave downtown location has closed.
    ('01900000-0000-7000-8000-000000004005',
     '4200 Lomas Blvd NE, Ste C, Albuquerque, NM 87110',
     '{"monday":"6am-6pm","tuesday":"6am-6pm","wednesday":"6am-6pm","thursday":"6am-6pm","friday":"6am-6pm","saturday":"6am-6pm","sunday":"6am-6pm"}',
     35.087180, -106.597529, 'Humble Coffee Company', '+1-505-289-9909',
     -- also via Nob Hill Main Street; humblecoffeeco.com exposes no image URL
     'https://nobhillmainstreet.org/wp-content/uploads/2024/06/humble-lomas-interior.jpeg'),

    -- Downtown roaster and cafe. Note the escaped apostrophe in the name.
    ('01900000-0000-7000-8000-000000004006',
     '906 Park Ave SW, Albuquerque, NM 87102',
     '{"monday":"6:30am-3:30pm","tuesday":"6:30am-3:30pm","wednesday":"6:30am-3:30pm","thursday":"6:30am-3:30pm","friday":"6:30am-3:30pm","saturday":"6:30am-3:30pm","sunday":"6:30am-3:30pm"}',
     35.085170, -106.657968, 'Java Joe''s', '+1-505-765-1514',
     -- their logo, not a storefront photo — the site publishes no cafe imagery
     'https://downtownjavajoes.com/wp-content/uploads/2022/03/Java-Joes-Circle.png'),

    -- Colombian-family roastery near the rail yards. Closed Sundays.
    ('01900000-0000-7000-8000-000000004007',
     '573 Commercial St NE, Albuquerque, NM 87102',
     '{"monday":"6am-3pm","tuesday":"6am-3pm","wednesday":"6am-3pm","thursday":"6am-3pm","friday":"6am-3pm","saturday":"10am-2pm"}',
     35.088582, -106.645599, 'Villa Myriam Coffee', '+1-505-336-5652',
     'https://vmcoffee.com/wp-content/uploads/2024/09/2024-03-24-17-15-43-133-scaled.jpg'),

    -- Central Ave near UNM, open late.
    ('01900000-0000-7000-8000-000000004008',
     '2132 Central Ave SE, Ste C, Albuquerque, NM 87106',
     '{"monday":"7:30am-11pm","tuesday":"7:30am-11pm","wednesday":"7:30am-11pm","thursday":"7:30am-11pm","friday":"7:30am-11pm","saturday":"7:30am-11pm","sunday":"7:30am-11pm"}',
     35.080630, -106.622494, 'Amalie Coffee Co', '+1-505-307-8037',
     'https://amaliecoffeeco.com/images/about-restaurant-img.jpg'),

    -- The late-night study spot: midnight most nights, 1am on weekends.
    ('01900000-0000-7000-8000-000000004009',
     '3001 Central Ave NE, Albuquerque, NM 87106',
     '{"monday":"7am-12am","tuesday":"7am-12am","wednesday":"7am-12am","thursday":"7am-12am","friday":"7am-1am","saturday":"7am-1am","sunday":"7am-12am"}',
     35.080975, -106.611856, 'Sukoon Coffeehouse', '+1-505-808-3394',
     'https://snworksceo.imgix.net/tdl/86d56950-8c3a-4728-8c81-0e33f31b5064.sized-1000x1000.JPG'),

    -- North Valley roaster off Montano.
    ('01900000-0000-7000-8000-000000004010',
     '413 Montano Rd NE, Ste F, Albuquerque, NM 87107',
     '{"monday":"6:30am-6pm","tuesday":"6:30am-6pm","wednesday":"6:30am-6pm","thursday":"6:30am-6pm","friday":"6:30am-6pm","saturday":"7am-5pm","sunday":"9am-3pm"}',
     35.137010, -106.627103, 'Trifecta Coffee Company', '+1-505-800-7081',
     'https://trifectacoffeeco.com/wp-content/uploads/2020/12/image000006-1200x550.jpg')

ON CONFLICT DO NOTHING;

COMMIT;


-- ---------------------------------------------------------------------------
-- Verification. Expect exactly 10 rows, and every boolean column true.
--
-- The three checks mirror the constraints ShopSchema enforces on read, so if
-- this query is clean, GET /apis/shops will not 500 on these rows.
-- ---------------------------------------------------------------------------
SELECT name,
       phone,
       length(phone)  BETWEEN 10 AND 31 AS phone_ok,
       length(image_url) <= 255          AS image_url_ok,
       (SELECT bool_and(length(value) <= 32)
        FROM json_each_text(hours))      AS hours_ok
FROM shop
WHERE id::text LIKE '01900000-0000-7000-8000-0000000040%'
ORDER BY name;


-- ---------------------------------------------------------------------------
-- Undo, if you need the database back the way it was.
--
-- This will fail with a foreign key violation if anyone has favorited or
-- visited one of these shops since seeding — which is the correct behavior,
-- not a bug. Clear those rows first if you really mean it.
--
-- DELETE FROM shop WHERE id IN (
--     '01900000-0000-7000-8000-000000004001',
--     '01900000-0000-7000-8000-000000004002',
--     '01900000-0000-7000-8000-000000004003',
--     '01900000-0000-7000-8000-000000004004',
--     '01900000-0000-7000-8000-000000004005',
--     '01900000-0000-7000-8000-000000004006',
--     '01900000-0000-7000-8000-000000004007',
--     '01900000-0000-7000-8000-000000004008',
--     '01900000-0000-7000-8000-000000004009',
--     '01900000-0000-7000-8000-000000004010');
-- ---------------------------------------------------------------------------
