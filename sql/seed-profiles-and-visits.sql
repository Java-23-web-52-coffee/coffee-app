-- ============================================================================
-- Six profiles with preferences, the visits they logged, and the ratings they
-- left. This is the half of the loop that makes matching work at all.
--
-- Without it, GET /apis/profiles/me/matches returns [] for everybody:
-- selectMatchesForProfile only ranks shops that have a real rating on an
-- interest the profile weighted, so with no visit/rating rows there is nothing
-- to rank.
--
-- Requires sql/seed-shops-abq.sql and sql/seed-interests.sql to have run
-- first. The guard block below refuses to run otherwise rather than seeding a
-- half-connected fixture.
--
-- Run it:  psql "$DATABASE_URL" -f sql/seed-profiles-and-visits.sql
--
-- Safe to run more than once: fixed uuids and ON CONFLICT DO NOTHING
-- throughout.
--
--
-- !! THESE SIX ACCOUNTS CAN SIGN IN. Shared password: @Cohort52
-- !!
-- !! The hashes are real argon2id, generated with the exact parameters
-- !! setHash() uses (backend/src/utils/auth.utils.ts), so sign-in works and
-- !! you can look at /matches as any persona. They are dev fixtures that own
-- !! nothing, but they are known-password accounts in the shared team
-- !! database — do not leave them in place if that database ever becomes
-- !! reachable from the internet. The undo block at the bottom removes them.
--
--
-- SHAPE OF THE DATA
--
--   6 profiles, each with a full 10-interest preference set
--   30 visits, arranged so every shop draws exactly 3 distinct raters
--   1 extra repeat visit (see below), for 31 total
--   310 ratings — every visit rates all ten interests
--
-- Every visit rating every interest means coverage is 1.0 for any preference
-- set, so no shop reports the `limited` band. Three raters per shop is also
-- the tag threshold (TAG_MIN_RATERS), so shop tags light up for free.
--
-- The repeat visit is deliberate: Rosa visits Michael Thomas twice, rating it
-- poorly 40 days ago and well 3 days ago. The DISTINCT ON collapsing in
-- selectShopInterestAverages must ignore the older visit. That is the
-- least-tested part of the matching query, so it gets a fixture.
--
--
-- HOW THE RATINGS ARE BUILT
--
-- Each shop has a personality: a target 1-5 score per interest, in the matrix
-- further down. Its three raters score target-1, target, target+1 (clamped to
-- 1-5), so the average lands on the target while individual rows still vary
-- the way real ratings would.
--
-- A target of 4 or 5 therefore clears the tag threshold (average >= 4); a
-- target of 3 or below does not. That is the knob for deciding which shops
-- earn which chips.
--
--
-- WHAT TO EXPECT FROM THE MATCHES ENDPOINT
--
-- Sign in as any profile and GET /apis/profiles/me/matches. Every number below
-- was produced by running this file's data through the REAL scoreShop /
-- toMatchScore / bandFor from backend/src/utils/matching.utils.ts, not by hand
-- arithmetic, so a mismatch is a bug in the query rather than a typo here.
--
--   Rosa Delgado (remote worker)        Tom Whitaker (dog walker)
--     1. Sukoon              84 great     1. Humble             83 great
--     2. Zendo               80 great     2. Trifecta           75 great
--     3. Michael Thomas      69 good      3. Little Bear        68 good
--    ...                                 ...
--    10. Cutbow              41 weak     10. Sukoon             29 weak
--
--   Imani Brooks (plant-based)          Diego Salas (student)
--     1. Java Joe's          81 great     1. Sukoon             87 great
--     2. Little Bear         63 good      2. Zendo              82 great
--     3. Trifecta            63 good      3. Michael Thomas     75 great
--    ...                                 ...
--    10. Cutbow              29 weak     10. Java Joe's         44 weak
--
--   Nina Okafor (social)                Wes Lindgren (generalist control)
--     1. Little Bear         85 great     1. Trifecta           65 good
--     2. Trifecta            71 good      2. Zendo              64 good
--     3. Humble              65 good      3. Little Bear        64 good
--    ...                                 ...
--    10. Villa Myriam        40 weak     10. Cutbow             41 weak
--
-- Two things to check beyond the raw numbers:
--
--   Every persona has a DIFFERENT shop at #1. If two personas return the same
--   ordering, the preference weights are not reaching the score.
--
--   Every shop reports coverage 1.00 and nothing reports `limited`. A
--   `limited` band means the visit or rating rows did not all land.
--
-- Wes is the control: weighting everything at 0.5 makes his ranking a plain
-- "best overall" list with no persona tilt, and his spread is correspondingly
-- narrow (65 down to 41, versus Diego's 87 down to 44).
--
--
-- WHAT THE SCHEMA DEMANDS
--
--   profile.password_hash  exactly 97 chars (PrivateProfileSchema). An argon2id
--                          hash with these parameters is exactly 97.
--   activation_token       NULL, which is what activation.controller.ts leaves
--                          on an activated account and what sign-in requires.
--   preference.importance  0-1. Only 1 / 0.8 / 0.5 / 0 are values the
--                          preferences UI can actually produce, and exactly one
--                          interest per profile carries 1.0 (the tie-break
--                          winner) — see preferences.constants.ts.
--   rating.value           1-5.
--   every id               a genuine uuidv7. Profiles use the reserved
--                          ...0000006NNN block, visits ...0000007NNN, clear of
--                          the shops (...40NN) and interests (...50NN).
--
-- Interests are resolved BY CATEGORY NAME, never by hard-coded uuid. This is
-- not stylistic: sql/seed-interests.sql skips inserting 'Quiet Atmosphere' when
-- seed-matches.sql already created it, so on some databases that category lives
-- under id ...0000001002 instead of ...0000005002. Hard-coding the id would
-- raise a foreign key violation on those and not on others.
-- ============================================================================


-- --------------------------------------------------------------------------
-- 0. Refuse to run against a database missing the rows we attach to.
-- --------------------------------------------------------------------------
DO $$
DECLARE
    shop_count integer;
    missing_interests text;
BEGIN
    SELECT count(*) INTO shop_count
    FROM shop WHERE id::text LIKE '01900000-0000-7000-8000-0000000040%';

    -- Name the missing categories rather than just counting them. A bare count
    -- tells you something is wrong but not what to fix, and the answer is
    -- usually a single category that never got inserted.
    SELECT string_agg(quote_literal(wanted.category), ', ' ORDER BY wanted.category)
    INTO missing_interests
    FROM unnest(ARRAY[
        'Dog Friendly', 'Quiet Atmosphere', 'Strong WiFi', 'Vegan',
        'Gluten Free', 'Food Options', 'Accessible Outlets',
        'Comfortable Seating', 'Outdoor Patio', 'Alternate Drink Options'
    ]) AS wanted (category)
    WHERE NOT EXISTS (
        SELECT 1 FROM interest WHERE lower(interest.category) = lower(wanted.category)
    );

    IF shop_count <> 10 THEN
        RAISE EXCEPTION 'Expected the 10 shops from seed-shops-abq.sql; found %. Run that first.', shop_count;
    END IF;
    IF missing_interests IS NOT NULL THEN
        RAISE EXCEPTION 'Missing interest categories: %. Run sql/seed-interests.sql first.', missing_interests;
    END IF;
END $$;


BEGIN;

-- --------------------------------------------------------------------------
-- 1. The six profiles.
--
-- Every password_hash below is a real argon2id hash of @Cohort52, each with
-- its own salt. Sign-in works.
-- --------------------------------------------------------------------------
INSERT INTO profile (id, activation_token, email, name, password_hash) VALUES
    ('01900000-0000-7000-8000-000000006001', NULL, 'rosa.delgado@abqcoffee.test',  'Rosa Delgado',
     '$argon2id$v=19$m=65536,t=3,p=4$Qq1PGd9izl7pierk0hK3DA$4cG7Iqnaiirr1kxKSh4v/b1ePS44ge8juSkubwkJQrU'),
    ('01900000-0000-7000-8000-000000006002', NULL, 'tom.whitaker@abqcoffee.test',  'Tom Whitaker',
     '$argon2id$v=19$m=65536,t=3,p=4$UOZwxh3MFSZ4SQ8Fy3NL5A$vPQGWsFhtzL1uIMx4MGwvzbayoiHCwyzOtDId0aOoPo'),
    ('01900000-0000-7000-8000-000000006003', NULL, 'imani.brooks@abqcoffee.test',  'Imani Brooks',
     '$argon2id$v=19$m=65536,t=3,p=4$L25+HLJYNnJdrhxCwtdMdA$/7AMdrfz9HlK++Z3DgeaPyrA2A6Ju7Bfbju8h1RoVr4'),
    ('01900000-0000-7000-8000-000000006004', NULL, 'diego.salas@abqcoffee.test',   'Diego Salas',
     '$argon2id$v=19$m=65536,t=3,p=4$KVpd7lz4cxIuDgBf7gmJzg$sSRyUs4Y75siRWhKl9Sw+v53n2OYlISoReJMnhe/NS8'),
    ('01900000-0000-7000-8000-000000006005', NULL, 'nina.okafor@abqcoffee.test',   'Nina Okafor',
     '$argon2id$v=19$m=65536,t=3,p=4$cgUmHVHB1SgNP4AfnCceow$XB1k1QQ+dFdB6pGYSsi8uoAbGeQMORTi1iqbuhhzAqU'),
    ('01900000-0000-7000-8000-000000006006', NULL, 'wes.lindgren@abqcoffee.test',  'Wes Lindgren',
     '$argon2id$v=19$m=65536,t=3,p=4$NOLGyB1ifmmM27G+dz1oIA$jL9Nry1aGgvp0/wkGP8D2+LTzhMD+9Ufy+CG7uO38vU')
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 2. Preferences — the weighted ones.
--
-- Six personas that pull in different directions, so the ranking is not the
-- same list for everybody. Exactly one 1.0 each, because the preferences form
-- only lets you crown a single tie-break winner; everything else marked "must"
-- comes through as 0.8.
--
--   Rosa    remote worker   wifi above all, then outlets and quiet
--   Tom     dog walker      dogs, then a patio to sit on
--   Imani   plant-based     vegan first, gluten free and food close behind
--   Diego   student         quiet above all, then outlets and seating
--   Nina    social          drinks beyond coffee, seating, patio
--   Wes     generalist      mildly interested in everything
--
-- Interests are joined by category, never by id. See the header.
-- --------------------------------------------------------------------------
INSERT INTO preference (profile_id, interest_id, importance)
SELECT w.profile_id, interest.id, w.importance
FROM (VALUES
    -- Rosa, remote worker
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Strong WiFi',             1.0),
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Accessible Outlets',      0.8),
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Quiet Atmosphere',        0.8),
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Comfortable Seating',     0.5),
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Food Options',            0.5),

    -- Tom, dog walker
    ('01900000-0000-7000-8000-000000006002'::uuid, 'Dog Friendly',            1.0),
    ('01900000-0000-7000-8000-000000006002'::uuid, 'Outdoor Patio',           0.8),
    ('01900000-0000-7000-8000-000000006002'::uuid, 'Alternate Drink Options', 0.5),

    -- Imani, plant-based
    ('01900000-0000-7000-8000-000000006003'::uuid, 'Vegan',                   1.0),
    ('01900000-0000-7000-8000-000000006003'::uuid, 'Gluten Free',             0.8),
    ('01900000-0000-7000-8000-000000006003'::uuid, 'Food Options',            0.8),
    ('01900000-0000-7000-8000-000000006003'::uuid, 'Alternate Drink Options', 0.5),

    -- Diego, student
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Quiet Atmosphere',        1.0),
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Accessible Outlets',      0.8),
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Comfortable Seating',     0.8),
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Strong WiFi',             0.5),

    -- Nina, social
    ('01900000-0000-7000-8000-000000006005'::uuid, 'Alternate Drink Options', 1.0),
    ('01900000-0000-7000-8000-000000006005'::uuid, 'Comfortable Seating',     0.8),
    ('01900000-0000-7000-8000-000000006005'::uuid, 'Outdoor Patio',           0.8),
    ('01900000-0000-7000-8000-000000006005'::uuid, 'Food Options',            0.5),

    -- Wes, generalist: one 1.0 and the rest filled in at 0.5 by step 3
    ('01900000-0000-7000-8000-000000006006'::uuid, 'Comfortable Seating',     1.0)
) AS w (profile_id, category, importance)
JOIN interest ON lower(interest.category) = lower(w.category)
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 3. Preferences — the rest.
--
-- Every profile answers every interest. importance 0 is a real saved answer
-- meaning "I don't care", not an absent row, and the matching code drops it
-- from both numerator and denominator.
--
-- Wes is the exception: as the generalist he answers 0.5 to everything he has
-- not already crowned, which is what makes him a useful control — his ranking
-- is close to "which shop is best overall", with no persona tilt.
--
-- ON CONFLICT skips anything step 2 already weighted, so this only fills gaps.
-- --------------------------------------------------------------------------
INSERT INTO preference (profile_id, interest_id, importance)
SELECT p.profile_id, interest.id,
       CASE WHEN p.profile_id = '01900000-0000-7000-8000-000000006006' THEN 0.5 ELSE 0 END
FROM (VALUES
    ('01900000-0000-7000-8000-000000006001'::uuid),
    ('01900000-0000-7000-8000-000000006002'::uuid),
    ('01900000-0000-7000-8000-000000006003'::uuid),
    ('01900000-0000-7000-8000-000000006004'::uuid),
    ('01900000-0000-7000-8000-000000006005'::uuid),
    ('01900000-0000-7000-8000-000000006006'::uuid)
) AS p (profile_id)
CROSS JOIN interest
WHERE lower(interest.category) IN (
    'dog friendly', 'quiet atmosphere', 'strong wifi', 'vegan', 'gluten free',
    'food options', 'accessible outlets', 'comfortable seating',
    'outdoor patio', 'alternate drink options')
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 4. The visits.
--
-- Raters are rotated across shops so each shop collects exactly three distinct
-- profiles. Profiles end up with 4 to 6 visits each rather than a forced even
-- split, which is closer to how real usage looks.
--
-- days_ago spreads the visits out and, more importantly, makes Rosa's repeat
-- visit to shop 1 unambiguously the newest thing she has said about that shop.
--
-- THE VISIT ID ENCODES ITS OWN SLOT:
--
--     ...000000007 <shop 01-10> <rater slot>
--
-- rater slot 1/2/3 means this rater scored the shop's target minus one, on
-- target, or plus one; slot 9 is the repeat visit. Step 5 reads the slot back
-- out of the id, which is why this roster appears exactly once in the file.
--
-- (An earlier version kept the roster in a TEMP TABLE so both steps could read
-- it. That needs the TEMP privilege, which the shared database does not grant,
-- so the offset rides along in the id instead.)
-- --------------------------------------------------------------------------
INSERT INTO visit (id, shop_id, profile_id, created_at)
SELECT sv.visit_id::uuid,
       ('01900000-0000-7000-8000-0000000040' || lpad(sv.shop_n::text, 2, '0'))::uuid,
       ('01900000-0000-7000-8000-00000000600' || sv.profile_n)::uuid,
       now() - make_interval(days => sv.days_ago)
FROM (VALUES
    --  visit id                              shop  who  days ago
    ('01900000-0000-7000-8000-000000007011',    1,   1,   40),
    ('01900000-0000-7000-8000-000000007012',    1,   2,   25),
    ('01900000-0000-7000-8000-000000007013',    1,   3,   12),

    ('01900000-0000-7000-8000-000000007021',    2,   2,   38),
    ('01900000-0000-7000-8000-000000007022',    2,   3,   24),
    ('01900000-0000-7000-8000-000000007023',    2,   4,   11),

    ('01900000-0000-7000-8000-000000007031',    3,   3,   36),
    ('01900000-0000-7000-8000-000000007032',    3,   4,   23),
    ('01900000-0000-7000-8000-000000007033',    3,   5,   10),

    ('01900000-0000-7000-8000-000000007041',    4,   4,   34),
    ('01900000-0000-7000-8000-000000007042',    4,   5,   22),
    ('01900000-0000-7000-8000-000000007043',    4,   6,    9),

    ('01900000-0000-7000-8000-000000007051',    5,   5,   32),
    ('01900000-0000-7000-8000-000000007052',    5,   6,   21),
    ('01900000-0000-7000-8000-000000007053',    5,   1,    8),

    ('01900000-0000-7000-8000-000000007061',    6,   6,   30),
    ('01900000-0000-7000-8000-000000007062',    6,   1,   20),
    ('01900000-0000-7000-8000-000000007063',    6,   2,    7),

    ('01900000-0000-7000-8000-000000007071',    7,   1,   28),
    ('01900000-0000-7000-8000-000000007072',    7,   2,   19),
    ('01900000-0000-7000-8000-000000007073',    7,   3,    6),

    ('01900000-0000-7000-8000-000000007081',    8,   2,   27),
    ('01900000-0000-7000-8000-000000007082',    8,   3,   18),
    ('01900000-0000-7000-8000-000000007083',    8,   4,    5),

    ('01900000-0000-7000-8000-000000007091',    9,   3,   26),
    ('01900000-0000-7000-8000-000000007092',    9,   4,   17),
    ('01900000-0000-7000-8000-000000007093',    9,   5,    4),

    ('01900000-0000-7000-8000-000000007101',   10,   4,   33),
    ('01900000-0000-7000-8000-000000007102',   10,   5,   16),
    ('01900000-0000-7000-8000-000000007103',   10,   6,    3),

    -- The repeat. Rosa came back to shop 1 and liked it much better this time.
    -- Her 40-days-ago visit above must be ignored by the DISTINCT ON; if it is
    -- not, shop 1's averages come out low and her ranking is wrong.
    ('01900000-0000-7000-8000-000000007019',    1,   1,    3)
) AS sv (visit_id, shop_n, profile_n, days_ago)
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 6. The ratings — 10 per visit.
--
-- THE SHOP PERSONALITY MATRIX. One row per shop, one column per interest,
-- each a target 1-5 average. Everything about which shop wins which persona
-- is decided here.
--
-- Read the columns as: Dog / Quiet / WiFi / Vegan / GlutenFree / Food /
-- Outlets / Seating / Patio / AltDrinks.
--
-- Targets of 4 or 5 are the shop's signature strengths and clear the tag
-- threshold. Everything at 3 or below stays quiet.
--
-- The roster is read back out of the `visit` table rather than repeated: step 4
-- committed those rows earlier in this transaction, and the rater slot is the
-- last character of the visit id.
-- --------------------------------------------------------------------------
WITH matrix (shop_n, shop_label, dog, quiet, wifi, vegan, gf, food, outlets, seating, patio, alt) AS (VALUES
    --                                    dog qt wf vg gf fd ou se pa al
    ( 1, 'Michael Thomas  roaster',         2, 4, 3, 2, 2, 2, 3, 3, 2, 3),
    ( 2, 'Cutbow          quiet craft',     2, 5, 2, 2, 2, 1, 2, 3, 3, 4),
    ( 3, 'Zendo           work-friendly',   3, 4, 5, 4, 3, 3, 5, 4, 2, 3),
    ( 4, 'Little Bear     social',          3, 2, 3, 3, 3, 4, 3, 5, 4, 5),
    ( 5, 'Humble          dogs and patio',  5, 3, 3, 3, 3, 4, 2, 3, 5, 3),
    ( 6, 'Java Joes       kitchen',         3, 3, 3, 5, 5, 5, 2, 3, 3, 2),
    ( 7, 'Villa Myriam    roastery',        2, 4, 4, 2, 2, 2, 4, 3, 2, 3),
    ( 8, 'Amalie          open late',       2, 3, 4, 4, 3, 3, 4, 4, 3, 4),
    ( 9, 'Sukoon          study spot',      1, 5, 5, 3, 2, 3, 5, 4, 2, 4),
    (10, 'Trifecta        north valley',    4, 3, 3, 3, 4, 4, 3, 4, 5, 3)
),
-- the visits step 4 just inserted, with the rater slot decoded back out of the
-- id into the offset applied to the shop's target
seeded_visit AS (
    SELECT visit.id AS visit_id,
           visit.shop_id,
           CASE right(visit.id::text, 1)
               WHEN '1' THEN -1   -- rater one scored below target
               WHEN '2' THEN  0   -- rater two scored on target
               WHEN '3' THEN  1   -- rater three scored above target
               WHEN '9' THEN  1   -- the repeat visit, scored above target
           END AS rating_offset
    FROM visit
    WHERE visit.id::text LIKE '01900000-0000-7000-8000-000000007%'
      -- an unrecognised slot would make the CASE return NULL, and rating.value
      -- has no NOT NULL constraint, so the bad row would insert quietly and
      -- only surface later as a 500 from the matches endpoint
      AND right(visit.id::text, 1) IN ('1', '2', '3', '9')
),
-- unpivot the matrix into (shop_n, category, target)
target AS (
    SELECT m.shop_n, t.category, t.value
    FROM matrix m
    CROSS JOIN LATERAL (VALUES
        ('Dog Friendly',            m.dog),
        ('Quiet Atmosphere',        m.quiet),
        ('Strong WiFi',             m.wifi),
        ('Vegan',                   m.vegan),
        ('Gluten Free',             m.gf),
        ('Food Options',            m.food),
        ('Accessible Outlets',      m.outlets),
        ('Comfortable Seating',     m.seating),
        ('Outdoor Patio',           m.patio),
        ('Alternate Drink Options', m.alt)
    ) AS t (category, value)
)
INSERT INTO rating (visit_id, interest_id, value)
SELECT sv.visit_id,
       interest.id,
       -- clamped, so a target of 5 yields 4/5/5 rather than an illegal 6
       LEAST(5, GREATEST(1, target.value + sv.rating_offset))
FROM seeded_visit sv
JOIN target
  ON ('01900000-0000-7000-8000-0000000040' || lpad(target.shop_n::text, 2, '0'))::uuid = sv.shop_id
-- matched case-insensitively for the same reason the guard is: a pre-existing
-- row may differ in case from the canonical seed-interests.sql spelling
JOIN interest ON lower(interest.category) = lower(target.category)
ON CONFLICT DO NOTHING;

COMMIT;


-- ---------------------------------------------------------------------------
-- Verification 1: row counts. Expect 6 / 60 / 31 / 310.
-- ---------------------------------------------------------------------------
SELECT 'profiles'    AS what, count(*) AS n FROM profile    WHERE id::text         LIKE '01900000-0000-7000-8000-0000000060%'
UNION ALL
SELECT 'preferences',         count(*)      FROM preference WHERE profile_id::text LIKE '01900000-0000-7000-8000-0000000060%'
UNION ALL
SELECT 'visits',              count(*)      FROM visit      WHERE id::text         LIKE '01900000-0000-7000-8000-000000007%'
UNION ALL
SELECT 'ratings',             count(*)      FROM rating     WHERE visit_id::text   LIKE '01900000-0000-7000-8000-000000007%';


-- ---------------------------------------------------------------------------
-- Verification 2: every shop must have exactly 3 distinct raters per interest.
--
-- Expect ZERO rows. A row here means the DISTINCT ON dedupe is not collapsing
-- Rosa's two visits to shop 1, or the rater rotation has a gap.
-- ---------------------------------------------------------------------------
WITH latest AS (
    SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
           visit.shop_id, rating.interest_id, visit.profile_id, rating.value
    FROM rating
    JOIN visit ON visit.id = rating.visit_id
    WHERE visit.id::text LIKE '01900000-0000-7000-8000-000000007%'
    ORDER BY visit.shop_id, rating.interest_id, visit.profile_id,
             visit.created_at DESC, visit.id DESC
)
SELECT shop.name, interest.category, count(*) AS raters
FROM latest
JOIN shop ON shop.id = latest.shop_id
JOIN interest ON interest.id = latest.interest_id
GROUP BY shop.name, interest.category
HAVING count(*) <> 3
ORDER BY shop.name, interest.category;


-- ---------------------------------------------------------------------------
-- Verification 3: the tags each shop earns (average >= 4, at least 3 raters).
--
-- This is the tags endpoint's own query. Every shop should return at least one
-- chip, and they should read like the personality matrix above.
-- ---------------------------------------------------------------------------
WITH latest AS (
    SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
           visit.shop_id, rating.interest_id, visit.profile_id, rating.value
    FROM rating
    JOIN visit ON visit.id = rating.visit_id
    ORDER BY visit.shop_id, rating.interest_id, visit.profile_id,
             visit.created_at DESC, visit.id DESC
)
SELECT shop.name, interest.category, round(avg(latest.value), 2) AS avg_value
FROM latest
JOIN shop ON shop.id = latest.shop_id
JOIN interest ON interest.id = latest.interest_id
WHERE shop.id::text LIKE '01900000-0000-7000-8000-0000000040%'
GROUP BY shop.name, interest.category
HAVING count(*) >= 3 AND avg(latest.value) >= 4
ORDER BY shop.name, avg(latest.value) DESC, interest.category;


-- ---------------------------------------------------------------------------
-- Undo. Order matters — rating references visit, preference references
-- profile, and visit references profile.
--
-- DELETE FROM rating     WHERE visit_id::text   LIKE '01900000-0000-7000-8000-000000007%';
-- DELETE FROM visit      WHERE id::text         LIKE '01900000-0000-7000-8000-000000007%';
-- DELETE FROM preference WHERE profile_id::text LIKE '01900000-0000-7000-8000-0000000060%';
-- DELETE FROM favorite   WHERE profile_id::text LIKE '01900000-0000-7000-8000-0000000060%';
-- DELETE FROM profile    WHERE id::text         LIKE '01900000-0000-7000-8000-0000000060%';
-- ---------------------------------------------------------------------------
