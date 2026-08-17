    -- ============================================================================
-- Twenty-five locally owned Albuquerque coffee shops.
--
-- Real businesses, real addresses, real phone numbers. Coordinates come from
-- OpenStreetMap's geocoder against the street address, so they land on the
-- building, not the neighborhood. Addresses, phones and hours were verified
-- against each shop's own site (or a current listing) on 2026-08-13 for shops
-- 01-10 and 2026-08-17 for shops 11-25 — hours in particular drift, so treat
-- them as a snapshot rather than gospel.
--
-- No chains: every shop here is independently owned in Albuquerque. Candidates
-- cut during verification because they have closed — Winning Coffee (111
-- Harvard SE), Deep Space Coffee (504 Central SW), Prosum Roasters' Los Arboles
-- cafe, Epiphany Espresso (Green Jeans Farmery) and Rust Is Gold's original
-- Eagle Rock Rd garage. Don't add them back without checking.
--
-- Two more were verified as open but cut anyway, because their sites serve
-- broken TLS and image_url is meant to be hotlinkable: Espresso Fino (222 Gold
-- Ave SW, expired certificate) and The Brew (311 Gold Ave SW, self-signed).
-- Both are fine to add if you source an image from somewhere else.
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
-- image_url points at each shop's own photography where they publish it, and at
-- a named third party where they do not. Every exception is called out inline
-- on its row: Michael Thomas and Humble come from the Nob Hill Main Street
-- directory, Java Joe's and Café Lush from Gil's Thrilling (And Filling) Blog,
-- Rust Is Gold from Sprudge Maps, Bike In from City Lifestyle.
--
-- Two rows are a logo rather than a photograph, and both are marked inline:
-- The Well (opened November 2025, no published photo exists anywhere yet) and
-- Drop Cafe (its site serves photos from relative paths only, so the logo was
-- the sole absolute URL available). Drop is worth revisiting — unlike The Well
-- it is a well-covered shop, so a real photo probably exists somewhere.
--
-- These are hotlinks. If a shop redesigns, that row's image 404s and the API
-- stays happy (the URL is still valid), so breakage only ever shows up in the
-- browser.
--
-- VERIFY BY LOOKING AT THE PIXELS, NOT THE STATUS CODE. Several rows here once
-- held a 200-OK image/jpeg that was in fact a 276x43 strip of credit-card
-- logos (Cutbow) or a water-filtration advert (The Well). A HEAD request
-- cannot tell you the picture is wrong; only rendering it can.
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
     -- their own site. The previous URL here was a 276x43 sliver of credit-card
     -- logos — it returned HTTP 200 and image/jpeg, which is why a header check
     -- missed it. Look at the pixels, not the content-type.
     'https://cdn.prod.website-files.com/6a3f02de2b0a2a053a754677/6a420d871cb78872d976f400_imgi_5_coffee_photo_1.jpeg'),

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
     -- exterior, hotlinked from Gil's Thrilling (And Filling) Blog's review;
     -- downtownjavajoes.com publishes only a logo
     'https://b4385483.assetcdn.net/2.0/4385483/wp-content/uploads/2018/03/JavaJoe13-scaled.jpeg'),

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
     'https://trifectacoffeeco.com/wp-content/uploads/2020/12/image000006-1200x550.jpg'),

    -- ---------------------------------------------------------------------
    -- Shops 11-25, added 2026-08-17. Same rules as above.
    -- ---------------------------------------------------------------------

    -- Wells Park, in a hundred-year-old adobe. Open every day.
    ('01900000-0000-7000-8000-000000004011',
     '821 Mountain Rd NW, Albuquerque, NM 87102',
     '{"monday":"7am-5pm","tuesday":"7am-5pm","wednesday":"7am-5pm","thursday":"7am-5pm","friday":"7am-5pm","saturday":"7am-5pm","sunday":"7am-5pm"}',
     35.095633, -106.656183, 'Slow Burn Coffee', '+1-505-503-7790',
     'https://www.slowburncoffee.com/cdn/shop/files/SB_FrontDoor_Signage.jpg?v=1696521923&width=1500'),

    -- North I-25 roaster, family business since 1993. Wholesale-first, so the
    -- hours are short and the weekend keys are absent: closed Sat and Sun.
    ('01900000-0000-7000-8000-000000004012',
     '4801 Jefferson St NE, Albuquerque, NM 87109',
     '{"monday":"9am-5pm","tuesday":"9am-5pm","wednesday":"9am-5pm","thursday":"9am-5pm","friday":"9am-2pm"}',
     35.135405, -106.593592, 'Red Rock Roasters', '+1-505-883-1175',
     -- their own "Find Us" page: hands scooping green beans. Not a storefront
     -- shot, but they are a wholesale roaster with no cafe to photograph.
     'https://cdn.shopify.com/s/files/1/0670/3126/9669/files/Find_Us.jpg?v=1670527145'),

    -- Motorcycle-themed cafe on Eubank. NOTE this is the Eubank shop; the
    -- original Eagle Rock Rd "Coffee & Garage" location has closed.
    ('01900000-0000-7000-8000-000000004013',
     '3732 Eubank Blvd NE, Ste 1A, Albuquerque, NM 87111',
     '{"monday":"7:30am-5pm","tuesday":"7:30am-5pm","wednesday":"7:30am-5pm","thursday":"7:30am-5pm","friday":"7:30am-5pm","saturday":"8am-5pm","sunday":"8am-5pm"}',
     35.124441, -106.532692, 'Rust Is Gold Coffee', '+1-505-573-2880',
     -- interior via Sprudge Maps, showing the vintage motorcycle over the
     -- merch wall; rustisgoldcoffee.com publishes only a header logo
     'https://www.sprudgemaps.com/wp-content/uploads/2024/03/IMG_0847-1200x893.jpeg'),

    -- Inside Sawmill Market near Old Town. Weekday-only counter.
    ('01900000-0000-7000-8000-000000004014',
     '1909 Bellamah Ave NW, Albuquerque, NM 87104',
     '{"monday":"7am-3pm","tuesday":"7am-3pm","wednesday":"7am-3pm","thursday":"7am-3pm","friday":"7am-3pm"}',
     35.101514, -106.667397, 'Plata Coffee', '+1-505-274-6288',
     'https://platacoffee.com/wp-content/uploads/plata.cortado.prep-2-1024x819.webp'),

    -- Garden coffee shop on Old Town Farm, built around cyclists. Closed
    -- Mon-Tue, which is why those keys are absent.
    ('01900000-0000-7000-8000-000000004015',
     '949 Montoya St NW, Albuquerque, NM 87104',
     '{"wednesday":"8am-2pm","thursday":"8am-2pm","friday":"8am-2pm","saturday":"8am-2pm","sunday":"8am-2pm"}',
     35.103235, -106.678151, 'Bike In Coffee', '+1-505-764-9116',
     -- the garden entrance arbor with a bicycle on top, via City Lifestyle.
     -- oldtownfarm.com has only flowerbeds and a bike-and-cup illustration.
     'https://static.citylifestyle.com/articles/bike-in-coffee/Bike-entrance-413.jpg?v=1'),

    -- Far North Valley micro-roaster off Coors & Alameda. Weekdays only.
    ('01900000-0000-7000-8000-000000004016',
     '10701 Corrales Rd NW, Ste 3, Albuquerque, NM 87114',
     '{"monday":"6am-4pm","tuesday":"6am-4pm","wednesday":"6am-4pm","thursday":"6am-4pm","friday":"6am-4pm"}',
     35.205009, -106.648777, 'Whispering Bean Coffee Roasters', '+1-505-697-9919',
     'https://images.squarespace-cdn.com/content/v1/5942d62c5016e1f67fa60ea9/1499214483677-JB4NLJ8EQJV78Q0CESH9/storefront.jpg'),

    -- Downtown, in the Lobo Rainforest building. Also runs a mobile bar.
    ('01900000-0000-7000-8000-000000004017',
     '101 Broadway Blvd NE, Albuquerque, NM 87102',
     '{"monday":"7am-2pm","tuesday":"7am-2pm","wednesday":"7am-2pm","thursday":"7am-2pm","friday":"7am-2pm","saturday":"8am-2pm"}',
     35.084452, -106.644759, 'Sueños Coffee Co', '+1-505-554-6175',
     'https://cdn.prod.website-files.com/687c66cc9c28b9a8a0021a7e/69277dda01177f843c0c6ba3__DSC3681.JPG'),

    -- Menaul near the fairgrounds. Longest hours of this batch on Thu-Sat.
    ('01900000-0000-7000-8000-000000004018',
     '3035 Menaul Blvd NE, Albuquerque, NM 87107',
     '{"monday":"7am-2pm","tuesday":"7am-2pm","wednesday":"7am-2pm","thursday":"7am-5pm","friday":"7am-5pm","saturday":"8am-5pm","sunday":"9am-1pm"}',
     35.109460, -106.610646, 'Napoli Coffee', '+1-505-884-5454',
     'https://napolicoffee.com/wp-content/uploads/2024/07/beautiful-cappuccino-napoli-coffee-1024x1024.jpg'),

    -- Northeast Heights cafe and small grocer.
    ('01900000-0000-7000-8000-000000004019',
     '5900 Eubank Blvd NE, Albuquerque, NM 87111',
     '{"monday":"7:30am-3pm","tuesday":"7:30am-3pm","wednesday":"7:30am-3pm","thursday":"7:30am-3pm","friday":"7:30am-3pm","saturday":"8am-3pm","sunday":"8am-3pm"}',
     35.148004, -106.526896, 'Meraki Coffee + Market', '+1-505-291-1116',
     'https://images.squarespace-cdn.com/content/v1/5fa1d5c6f5ab3a4363ca869c/1614390829769-SOANJ9XDC4V27SBO7QST/IMG_8466.jpg'),

    -- Yemeni coffee house in Paradise Hills. Open 13 hours a day, every day —
    -- the widest window in the whole table.
    ('01900000-0000-7000-8000-000000004020',
     '9311 Coors Blvd NW, Ste QA, Albuquerque, NM 87114',
     '{"monday":"7am-8pm","tuesday":"7am-8pm","wednesday":"7am-8pm","thursday":"7am-8pm","friday":"7am-8pm","saturday":"7am-8pm","sunday":"7am-8pm"}',
     35.184580, -106.666509, 'Drop Cafe', '+1-505-503-7728',
     -- their logo; dropcafenm.com serves photos from relative paths only
     'https://dropcafenm.com/assets/DropCafeLogo-cropped.png'),

    -- North ABQ near Journal Center. The 940 area code is what the business
    -- lists — an out-of-state cell, not a typo.
    ('01900000-0000-7000-8000-000000004021',
     '7518 Oakland Ave NE, Albuquerque, NM 87113',
     '{"monday":"6am-6pm","tuesday":"6am-6pm","wednesday":"6am-6pm","thursday":"6am-6pm","friday":"6am-6pm","saturday":"6am-6pm","sunday":"8am-11am"}',
     35.185802, -106.561181, 'Citizen Coffee', '+1-940-923-5450',
     'https://images.squarespace-cdn.com/content/v1/69098a05d8f25d67fd31d41c/737089b6-dded-4634-922c-cac73cbd2ece/CLG3-2.webp'),

    -- San Mateo at Osuna. Nonprofit coffee house. Closed Sundays.
    ('01900000-0000-7000-8000-000000004022',
     '5500 San Mateo Blvd NE, Ste 104, Albuquerque, NM 87109',
     '{"monday":"7am-3pm","tuesday":"7am-3pm","wednesday":"7am-3pm","thursday":"7am-3pm","friday":"7am-3pm","saturday":"9am-2pm"}',
     35.142326, -106.586361, 'The Well Coffee', '+1-505-903-8194',
     -- THE ONLY LOGO LEFT IN THIS TABLE, and it is a deliberate choice. This
     -- shop opened in November 2025 and nobody has published a photograph of
     -- it. The two images on its own site are a water-filtration advert and
     -- this wordmark; the advert was previously used here by mistake. If a real
     -- interior or storefront photo ever appears, swap it in.
     'https://i0.wp.com/thewellcoffeenm.org/wp-content/uploads/2024/12/cropped-file_000000009e50622f95ee09277b27fa21.png?resize=512%2C512&ssl=1'),

    -- Downtown breakfast and lunch cafe on Tijeras. Closed Sundays.
    ('01900000-0000-7000-8000-000000004023',
     '700 Tijeras Ave NW, Albuquerque, NM 87102',
     '{"monday":"7am-1:30pm","tuesday":"7am-1:30pm","wednesday":"7am-1:30pm","thursday":"7am-1:30pm","friday":"7am-1:30pm","saturday":"8am-1pm"}',
     35.087283, -106.654895, 'Café Lush', '+1-505-508-0164',
     -- exterior with the patio umbrellas and street sign, hotlinked from Gil's
     -- Thrilling (And Filling) Blog; cafelushabq.com publishes only a logo and
     -- its menus
     'https://b4385483.assetcdn.net/2.0/4385483/wp-content/uploads/2013/12/Lush18.jpeg?lossy=2&strip=1&webp=1'),

    -- Old Town bakery, open since 1972, roasting its own coffee. Closed
    -- Mon-Tue. A panaderia rather than a cafe, but it belongs on a coffee map.
    ('01900000-0000-7000-8000-000000004024',
     '1103 Mountain Rd NW, Albuquerque, NM 87102',
     '{"wednesday":"7am-8pm","thursday":"7am-8pm","friday":"7am-8pm","saturday":"7am-8pm","sunday":"10am-8pm"}',
     35.095693, -106.658116, 'Golden Crown Panaderia', '+1-505-243-2424',
     'https://goldencrown.biz/cdn/shop/files/Locally_Roasted_Coffee_Beans.jpg?v=1712435324&width=3840'),

    -- East side, inside The ABQ Collective retail space. Closed Mondays.
    ('01900000-0000-7000-8000-000000004025',
     '1321 Eubank Blvd NE, Albuquerque, NM 87112',
     '{"tuesday":"7am-4pm","wednesday":"7am-4pm","thursday":"7am-4pm","friday":"7am-4pm","saturday":"7am-4pm","sunday":"7am-3pm"}',
     35.094004, -106.532925, 'ABQ Coffee', '+1-505-554-1853',
     'https://static.wixstatic.com/media/fe5ff1_ac3b821bd294433d8ffdfaa93a13debc~mv2.jpg')

ON CONFLICT DO NOTHING;

COMMIT;


-- ---------------------------------------------------------------------------
-- Verification. Expect exactly 25 rows, and every boolean column true.
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
-- DELETE FROM shop WHERE id::text LIKE '01900000-0000-7000-8000-0000000040%';
-- ---------------------------------------------------------------------------
