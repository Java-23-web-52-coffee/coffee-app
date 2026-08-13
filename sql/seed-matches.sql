-- ============================================================================
-- Seed data for the matching API (GET /apis/profiles/me/matches)
--
-- Unlike sql/seed-tags.sql, this script creates its OWN interests, profiles and
-- shops with fixed uuids, rather than attaching to whatever rows happen to be
-- alphabetically first. That is the whole point: every expected match score
-- below is exact and reproducible, so a wrong number tells you which bug you
-- have instead of just that something is off.
--
-- Safe to run more than once: every insert is ON CONFLICT DO NOTHING.
--
-- Run it:  psql "$DATABASE_URL" -f sql/seed-matches.sql
--
-- !! This writes to the shared team database. The cleanup block at the bottom
-- !! removes everything this script created. The three seeded profiles cannot
-- !! sign in (their password_hash is not a real argon2 hash) — they exist only
-- !! to be raters.
--
--
-- WHAT THIS PROVES
--
-- Set your own preferences to  Fast WiFi = Must  and  Quiet Atmosphere = Nice
-- (leave the other three alone), then GET /apis/profiles/me/matches:
--
--   1. Seed Alpha Roasters   matchScore 75   matchQuality great
--   2. Seed Bravo Coffee     matchScore 67   matchQuality good
--   3. Seed Charlie Cafe     matchScore 50   matchQuality fair
--
-- The ordering is the interesting part. Charlie is PERFECT on your
-- nice-to-have (5.0 quiet) and still finishes last, because Bravo does better
-- on the thing you called a must. That is the weighting working.
--
-- Diagnosing a wrong number for Alpha. Each bug produces its own value, so the
-- number tells you what broke:
--
--   75   correct
--   60   the dedupe is not working — Ana's stale 1 is counting as a fourth vote,
--        dragging Fast WiFi from 4.667 down to 3.750. This is the likeliest
--        failure, because the DISTINCT ON collapsing is the least-tested part.
--   92   the nice-to-have is being dropped from the denominator entirely
--   67   must and nice are being weighted equally (the 2x is not happening)
--   ~57  you left extra preferences set — see the `limited` test below
--
-- All of the above were confirmed against the real scoring code before this
-- file was written; they are not hand arithmetic.
--
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Interests. Only the first two ever get rated; the last three exist so the
-- `limited` coverage band can be triggered on demand.
-- ---------------------------------------------------------------------------
INSERT INTO interest (id, category) VALUES
    ('01900000-0000-7000-8000-000000001001', 'Fast WiFi'),
    ('01900000-0000-7000-8000-000000001002', 'Quiet Atmosphere'),
    ('01900000-0000-7000-8000-000000001003', 'Outdoor Seating'),
    ('01900000-0000-7000-8000-000000001004', 'Late Hours'),
    ('01900000-0000-7000-8000-000000001005', 'Vegan Food')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Raters. password_hash is char(97) and NOT NULL, so it needs a value; this
-- one is deliberately not a valid argon2 hash so these accounts are inert.
-- ---------------------------------------------------------------------------
INSERT INTO profile (id, activation_token, email, name, password_hash) VALUES
    ('01900000-0000-7000-8000-000000002001', NULL, 'seed-ana@example.invalid',  'Seed Ana',  'SEED-FAKE-HASH-NOT-LOGINABLE'),
    ('01900000-0000-7000-8000-000000002002', NULL, 'seed-ben@example.invalid',  'Seed Ben',  'SEED-FAKE-HASH-NOT-LOGINABLE'),
    ('01900000-0000-7000-8000-000000002003', NULL, 'seed-cleo@example.invalid', 'Seed Cleo', 'SEED-FAKE-HASH-NOT-LOGINABLE')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Shops. Every column has to be present and valid — ShopSchema requires a
-- non-null address, a phone of at least 10 characters, and a parseable URL, so
-- a NULL here becomes a 500 on the endpoint rather than a missing field.
-- ---------------------------------------------------------------------------
INSERT INTO shop (id, address, hours, lat, lng, name, phone, image_url) VALUES
    ('01900000-0000-7000-8000-000000003001',
     '101 Seed Ave NW, Albuquerque, NM 87102',
     '{"monday":"7am-6pm","tuesday":"7am-6pm","wednesday":"7am-6pm","thursday":"7am-6pm","friday":"7am-8pm","saturday":"8am-8pm","sunday":"8am-4pm"}',
     35.084400, -106.650400, 'Seed Alpha Roasters', '+1-505-555-0101',
     'https://placehold.co/600x400?text=Seed+Alpha'),
    ('01900000-0000-7000-8000-000000003002',
     '202 Seed Blvd SE, Albuquerque, NM 87106',
     '{"monday":"6am-5pm","tuesday":"6am-5pm","wednesday":"6am-5pm","thursday":"6am-5pm","friday":"6am-7pm","saturday":"7am-7pm","sunday":"closed"}',
     35.078900, -106.619500, 'Seed Bravo Coffee', '+1-505-555-0102',
     'https://placehold.co/600x400?text=Seed+Bravo'),
    ('01900000-0000-7000-8000-000000003003',
     '303 Seed Rd NE, Albuquerque, NM 87110',
     '{"monday":"8am-4pm","tuesday":"8am-4pm","wednesday":"8am-4pm","thursday":"8am-4pm","friday":"8am-6pm","saturday":"9am-6pm","sunday":"9am-2pm"}',
     35.106700, -106.585300, 'Seed Charlie Cafe', '+1-505-555-0103',
     'https://placehold.co/600x400?text=Seed+Charlie')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Visits. created_at is explicit so the most-recent-wins collapsing is
-- deterministic and does not fall through to the visit.id tiebreak.
--
-- Ana has TWO visits to Alpha. That is the dedupe test: her old visit rated
-- Fast WiFi a 1, her new one rated it a 5, and only the 5 may count.
-- ---------------------------------------------------------------------------
INSERT INTO visit (id, shop_id, profile_id, created_at) VALUES
    -- Alpha
    ('01900000-0000-7000-8000-000000004001', '01900000-0000-7000-8000-000000003001', '01900000-0000-7000-8000-000000002001', '2026-01-15 10:00:00+00'), -- Ana, OLD
    ('01900000-0000-7000-8000-000000004002', '01900000-0000-7000-8000-000000003001', '01900000-0000-7000-8000-000000002001', '2026-06-15 10:00:00+00'), -- Ana, NEW
    ('01900000-0000-7000-8000-000000004003', '01900000-0000-7000-8000-000000003001', '01900000-0000-7000-8000-000000002002', '2026-06-16 10:00:00+00'), -- Ben
    ('01900000-0000-7000-8000-000000004004', '01900000-0000-7000-8000-000000003001', '01900000-0000-7000-8000-000000002003', '2026-06-17 10:00:00+00'), -- Cleo
    -- Bravo
    ('01900000-0000-7000-8000-000000004005', '01900000-0000-7000-8000-000000003002', '01900000-0000-7000-8000-000000002001', '2026-06-18 10:00:00+00'),
    ('01900000-0000-7000-8000-000000004006', '01900000-0000-7000-8000-000000003002', '01900000-0000-7000-8000-000000002002', '2026-06-19 10:00:00+00'),
    ('01900000-0000-7000-8000-000000004007', '01900000-0000-7000-8000-000000003002', '01900000-0000-7000-8000-000000002003', '2026-06-20 10:00:00+00'),
    -- Charlie
    ('01900000-0000-7000-8000-000000004008', '01900000-0000-7000-8000-000000003003', '01900000-0000-7000-8000-000000002001', '2026-06-21 10:00:00+00'),
    ('01900000-0000-7000-8000-000000004009', '01900000-0000-7000-8000-000000003003', '01900000-0000-7000-8000-000000002002', '2026-06-22 10:00:00+00'),
    ('01900000-0000-7000-8000-00000000400a', '01900000-0000-7000-8000-000000003003', '01900000-0000-7000-8000-000000002003', '2026-06-23 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Ratings.
--
-- Alpha, Fast WiFi:          5, 5, 4  -> 4.667   (Ana's stale 1 must not count)
-- Alpha, Quiet Atmosphere:   3, 2, 3  -> 2.667
-- Bravo, Fast WiFi:          4, 4, 4  -> 4.000
-- Bravo, Quiet Atmosphere:   3, 3, 3  -> 3.000
-- Charlie, Fast WiFi:        2, 2, 2  -> 2.000
-- Charlie, Quiet Atmosphere: 5, 5, 5  -> 5.000
--
-- Ana's OLD visit rates ONLY Fast WiFi. Keeping Quiet Atmosphere out of it
-- makes Fast WiFi the single variable the dedupe test turns on.
-- ---------------------------------------------------------------------------
INSERT INTO rating (visit_id, interest_id, value) VALUES
    -- Ana's OLD Alpha visit: the stale rating that must be superseded
    ('01900000-0000-7000-8000-000000004001', '01900000-0000-7000-8000-000000001001', 1),

    -- Alpha
    ('01900000-0000-7000-8000-000000004002', '01900000-0000-7000-8000-000000001001', 5),
    ('01900000-0000-7000-8000-000000004002', '01900000-0000-7000-8000-000000001002', 3),
    ('01900000-0000-7000-8000-000000004003', '01900000-0000-7000-8000-000000001001', 5),
    ('01900000-0000-7000-8000-000000004003', '01900000-0000-7000-8000-000000001002', 2),
    ('01900000-0000-7000-8000-000000004004', '01900000-0000-7000-8000-000000001001', 4),
    ('01900000-0000-7000-8000-000000004004', '01900000-0000-7000-8000-000000001002', 3),

    -- Bravo
    ('01900000-0000-7000-8000-000000004005', '01900000-0000-7000-8000-000000001001', 4),
    ('01900000-0000-7000-8000-000000004005', '01900000-0000-7000-8000-000000001002', 3),
    ('01900000-0000-7000-8000-000000004006', '01900000-0000-7000-8000-000000001001', 4),
    ('01900000-0000-7000-8000-000000004006', '01900000-0000-7000-8000-000000001002', 3),
    ('01900000-0000-7000-8000-000000004007', '01900000-0000-7000-8000-000000001001', 4),
    ('01900000-0000-7000-8000-000000004007', '01900000-0000-7000-8000-000000001002', 3),

    -- Charlie
    ('01900000-0000-7000-8000-000000004008', '01900000-0000-7000-8000-000000001001', 2),
    ('01900000-0000-7000-8000-000000004008', '01900000-0000-7000-8000-000000001002', 5),
    ('01900000-0000-7000-8000-000000004009', '01900000-0000-7000-8000-000000001001', 2),
    ('01900000-0000-7000-8000-000000004009', '01900000-0000-7000-8000-000000001002', 5),
    ('01900000-0000-7000-8000-00000000400a', '01900000-0000-7000-8000-000000001001', 2),
    ('01900000-0000-7000-8000-00000000400a', '01900000-0000-7000-8000-000000001002', 5)
ON CONFLICT (visit_id, interest_id) DO NOTHING;

COMMIT;


-- ============================================================================
-- VERIFICATION — run this before you even start the server.
--
-- It shows the deduped average (what the matcher uses) beside the naive
-- average (what you get if one person's visits each count as a vote). If the
-- two columns are equal for Alpha / Fast WiFi, the DISTINCT ON collapsing is
-- not working.
--
--   Alpha  / Fast WiFi          deduped 4.667   naive 3.750   <- the dedupe test
--   Alpha  / Quiet Atmosphere   deduped 2.667   naive 2.667
--   Bravo  / Fast WiFi          deduped 4.000   naive 4.000
--   Bravo  / Quiet Atmosphere   deduped 3.000   naive 3.000
--   Charlie/ Fast WiFi          deduped 2.000   naive 2.000
--   Charlie/ Quiet Atmosphere   deduped 5.000   naive 5.000
-- ============================================================================
WITH latest AS (
    SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
           visit.shop_id, rating.interest_id, visit.profile_id, rating.value
    FROM rating
    JOIN visit ON visit.id = rating.visit_id
    ORDER BY visit.shop_id, rating.interest_id, visit.profile_id,
             visit.created_at DESC, visit.id DESC
)
SELECT shop.name,
       interest.category,
       round(AVG(latest.value), 3)   AS deduped_avg,
       round(naive.avg_value, 3)     AS naive_avg,
       COUNT(*)                      AS distinct_raters
FROM latest
JOIN shop     ON shop.id = latest.shop_id
JOIN interest ON interest.id = latest.interest_id
JOIN (
    SELECT visit.shop_id, rating.interest_id, AVG(rating.value) AS avg_value
    FROM rating
    JOIN visit ON visit.id = rating.visit_id
    GROUP BY visit.shop_id, rating.interest_id
) AS naive
  ON naive.shop_id = latest.shop_id
 AND naive.interest_id = latest.interest_id
WHERE shop.id IN (
    '01900000-0000-7000-8000-000000003001',
    '01900000-0000-7000-8000-000000003002',
    '01900000-0000-7000-8000-000000003003'
)
GROUP BY shop.name, interest.category, naive.avg_value
ORDER BY shop.name, interest.category;


-- ============================================================================
-- OPTIONAL — set the test preferences without clicking through the UI.
--
-- Replace :me with your own profile id, then uncomment. Going through
-- /preferences instead also exercises the preferences form, so prefer the UI
-- unless you are iterating on the matcher itself.
--
-- Fast WiFi = Must (1), Quiet Atmosphere = Nice (0.5):
--
-- INSERT INTO preference (profile_id, interest_id, importance) VALUES
--     (:me, '01900000-0000-7000-8000-000000001001', 1),
--     (:me, '01900000-0000-7000-8000-000000001002', 0.5)
-- ON CONFLICT (profile_id, interest_id) DO UPDATE SET importance = EXCLUDED.importance;
--
--
-- To trigger the `limited` band instead, weight all five as Must. Coverage
-- becomes 2.0 / 5.0 = 0.4, under the 0.5 floor, so every shop reports
-- matchQuality "limited" while keeping its numeric score (Alpha 57, then
-- Bravo and Charlie tied at 55, broken on name):
--
-- INSERT INTO preference (profile_id, interest_id, importance)
-- SELECT :me, id, 1 FROM interest
-- WHERE id IN ('01900000-0000-7000-8000-000000001001',
--              '01900000-0000-7000-8000-000000001002',
--              '01900000-0000-7000-8000-000000001003',
--              '01900000-0000-7000-8000-000000001004',
--              '01900000-0000-7000-8000-000000001005')
-- ON CONFLICT (profile_id, interest_id) DO UPDATE SET importance = EXCLUDED.importance;
-- ============================================================================


-- ============================================================================
-- CLEANUP — removes everything this script created, in FK-safe order.
-- Uncomment and run when you are done. This is a shared database.
-- ============================================================================
-- BEGIN;
-- DELETE FROM rating WHERE visit_id IN (
--     SELECT id FROM visit WHERE profile_id IN (
--         '01900000-0000-7000-8000-000000002001',
--         '01900000-0000-7000-8000-000000002002',
--         '01900000-0000-7000-8000-000000002003'));
-- DELETE FROM visit WHERE profile_id IN (
--     '01900000-0000-7000-8000-000000002001',
--     '01900000-0000-7000-8000-000000002002',
--     '01900000-0000-7000-8000-000000002003');
-- DELETE FROM preference WHERE interest_id IN (
--     '01900000-0000-7000-8000-000000001001',
--     '01900000-0000-7000-8000-000000001002',
--     '01900000-0000-7000-8000-000000001003',
--     '01900000-0000-7000-8000-000000001004',
--     '01900000-0000-7000-8000-000000001005');
-- DELETE FROM favorite WHERE shop_id IN (
--     '01900000-0000-7000-8000-000000003001',
--     '01900000-0000-7000-8000-000000003002',
--     '01900000-0000-7000-8000-000000003003');
-- DELETE FROM profile WHERE id IN (
--     '01900000-0000-7000-8000-000000002001',
--     '01900000-0000-7000-8000-000000002002',
--     '01900000-0000-7000-8000-000000002003');
-- DELETE FROM shop WHERE id IN (
--     '01900000-0000-7000-8000-000000003001',
--     '01900000-0000-7000-8000-000000003002',
--     '01900000-0000-7000-8000-000000003003');
-- DELETE FROM interest WHERE id IN (
--     '01900000-0000-7000-8000-000000001001',
--     '01900000-0000-7000-8000-000000001002',
--     '01900000-0000-7000-8000-000000001003',
--     '01900000-0000-7000-8000-000000001004',
--     '01900000-0000-7000-8000-000000001005');
-- COMMIT;
