-- ============================================================================
-- Seed data for the shop tags ticket (GET /apis/shops/{shopId}/tags)
--
-- Tags are derived, not stored: a shop earns a tag on an interest when the
-- average of each person's most recent rating of that interest is >= 4, from
-- at least 3 distinct people.
--
-- This script does NOT invent shops or interests. It attaches to the three
-- alphabetically-first rows already in `shop` and `interest`, so it works
-- against whatever data the loader put there. Deeper seeding is a later
-- ticket.
--
-- Safe to run more than once: every insert is ON CONFLICT DO NOTHING, so a
-- second run changes nothing.
--
-- Run it:  psql "$DATABASE_URL" -f sql/seed-tags.sql
-- (This writes to the shared team database. The verification query at the
-- bottom prints what the tags endpoint should return.)
--
-- What the data is built to prove:
--
--   Shop 1  interest 1  -> TAG SHOWS   3 people, avg 4.67
--                          Ana rated it 1 on an old visit and 5 on a newer
--                          one; only the 5 counts. Proves latest-rating-wins
--                          and one-person-one-vote.
--   Shop 1  interest 2  -> NO TAG      3 people, avg 2.67 (below the 4 cutoff)
--   Shop 1  interest 3  -> TAG SHOWS   3 people, avg 4.33
--                          Ana's newer visit skipped this interest, so her
--                          older rating survives. Proves the fallback.
--   Shop 2  interest 1  -> NO TAG      avg 5.0 but only 2 people
--                          Proves the 3-person floor is doing work.
--   Shop 3              -> NO TAGS     no visits at all
--                          Proves the "No tags yet" empty state.
--
-- Expected result: shop 1 renders two chips, shops 2 and 3 render the empty
-- state.
-- ============================================================================


-- --------------------------------------------------------------------------
-- 0. Refuse to run against a database that has nothing to attach to, rather
--    than silently seeding zero rows.
-- --------------------------------------------------------------------------
DO $$
BEGIN
    IF (SELECT count(*) FROM shop) < 3 THEN
        RAISE EXCEPTION 'seed-tags.sql needs at least 3 shops; found %. Load shops first.',
            (SELECT count(*) FROM shop);
    END IF;
    IF (SELECT count(*) FROM interest) < 3 THEN
        RAISE EXCEPTION 'seed-tags.sql needs at least 3 interests; found %. Load interests first.',
            (SELECT count(*) FROM interest);
    END IF;
END $$;


-- --------------------------------------------------------------------------
-- 1. Three raters.
--
--    activation_token is NULL because that is what activation.controller.ts
--    sets on an activated account. The password hash is a correctly-shaped
--    placeholder padded to the char(97) column width — nobody can sign in as
--    these profiles, and nothing in this ticket needs to.
-- --------------------------------------------------------------------------
INSERT INTO profile (id, activation_token, email, name, password_hash)
VALUES
    ('0198a2b0-0000-7000-8000-000000000001', NULL, 'ana.seed@coffee.test',   'Ana Reyes',
     rpad('$argon2id$v=19$m=65536,t=3,p=4$c2VlZHNhbHRzZWVkc2FsdA$seed-not-a-real-hash', 97, 'x')),
    ('0198a2b0-0000-7000-8000-000000000002', NULL, 'devon.seed@coffee.test', 'Devon Park',
     rpad('$argon2id$v=19$m=65536,t=3,p=4$c2VlZHNhbHRzZWVkc2FsdA$seed-not-a-real-hash', 97, 'x')),
    ('0198a2b0-0000-7000-8000-000000000003', NULL, 'priya.seed@coffee.test', 'Priya Raman',
     rpad('$argon2id$v=19$m=65536,t=3,p=4$c2VlZHNhbHRzZWVkc2FsdA$seed-not-a-real-hash', 97, 'x'))
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 2. Six visits across the first two shops.
--
--    The ids are real uuidv7 values because the models validate with
--    z.uuidv7() — a random uuid would fail schema parsing on the way out.
--    created_at is relative to now() so "most recent visit" stays meaningful
--    however long after seeding you look at it.
-- --------------------------------------------------------------------------
WITH target_shop AS (
    SELECT id, row_number() OVER (ORDER BY name, id) AS n
    FROM (SELECT id, name FROM shop ORDER BY name, id LIMIT 3) s
),
seed_visit (id, shop_n, profile_id, days_ago) AS (
    VALUES
        -- Ana at shop 1, twice. The older visit is the one that must be ignored.
        ('0198a2b0-0001-7000-8000-000000000001'::uuid, 1, '0198a2b0-0000-7000-8000-000000000001'::uuid, 60),
        ('0198a2b0-0001-7000-8000-000000000002'::uuid, 1, '0198a2b0-0000-7000-8000-000000000001'::uuid,  5),
        -- Devon and Priya at shop 1, once each.
        ('0198a2b0-0001-7000-8000-000000000003'::uuid, 1, '0198a2b0-0000-7000-8000-000000000002'::uuid, 20),
        ('0198a2b0-0001-7000-8000-000000000004'::uuid, 1, '0198a2b0-0000-7000-8000-000000000003'::uuid, 10),
        -- Only two people ever visit shop 2.
        ('0198a2b0-0001-7000-8000-000000000005'::uuid, 2, '0198a2b0-0000-7000-8000-000000000001'::uuid, 15),
        ('0198a2b0-0001-7000-8000-000000000006'::uuid, 2, '0198a2b0-0000-7000-8000-000000000002'::uuid, 12)
        -- Shop 3 gets nothing on purpose.
)
INSERT INTO visit (id, shop_id, profile_id, created_at)
SELECT sv.id, ts.id, sv.profile_id, now() - make_interval(days => sv.days_ago)
FROM seed_visit sv
JOIN target_shop ts ON ts.n = sv.shop_n
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 3. The ratings.
--
--    Note what is deliberately missing: visit 2 (Ana's newer visit to shop 1)
--    has no row for interest 3. That is the skipped-interest case — her older
--    rating from visit 1 has to survive, or shop 1 loses that tag.
-- --------------------------------------------------------------------------
WITH target_interest AS (
    SELECT id, row_number() OVER (ORDER BY category, id) AS n
    FROM (SELECT id, category FROM interest ORDER BY category, id LIMIT 3) i
),
seed_rating (visit_id, interest_n, value) AS (
    VALUES
        -- Shop 1, interest 1 -> tag shows. Ana's stale 1.0 must not count.
        ('0198a2b0-0001-7000-8000-000000000001'::uuid, 1, 1.0),  -- Ana, old   (ignored)
        ('0198a2b0-0001-7000-8000-000000000002'::uuid, 1, 5.0),  -- Ana, new   (counts)
        ('0198a2b0-0001-7000-8000-000000000003'::uuid, 1, 4.0),  -- Devon
        ('0198a2b0-0001-7000-8000-000000000004'::uuid, 1, 5.0),  -- Priya

        -- Shop 1, interest 2 -> no tag. Enough people, average too low.
        ('0198a2b0-0001-7000-8000-000000000002'::uuid, 2, 3.0),  -- Ana
        ('0198a2b0-0001-7000-8000-000000000003'::uuid, 2, 3.0),  -- Devon
        ('0198a2b0-0001-7000-8000-000000000004'::uuid, 2, 2.0),  -- Priya

        -- Shop 1, interest 3 -> tag shows via Ana's older rating only.
        ('0198a2b0-0001-7000-8000-000000000001'::uuid, 3, 4.0),  -- Ana, old   (counts: her new visit skipped this)
        ('0198a2b0-0001-7000-8000-000000000003'::uuid, 3, 5.0),  -- Devon
        ('0198a2b0-0001-7000-8000-000000000004'::uuid, 3, 4.0),  -- Priya

        -- Shop 2, interest 1 -> no tag. Perfect scores, only two people.
        ('0198a2b0-0001-7000-8000-000000000005'::uuid, 1, 5.0),  -- Ana
        ('0198a2b0-0001-7000-8000-000000000006'::uuid, 1, 5.0)   -- Devon
)
INSERT INTO rating (visit_id, interest_id, value)
SELECT sr.visit_id, ti.id, sr.value
FROM seed_rating sr
JOIN target_interest ti ON ti.n = sr.interest_n
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 4. Verification — this is the endpoint's query, widened to all three shops
--    so you can see the passes and the rejections side by side.
--
--    Expect exactly two rows, both for shop 1.
-- --------------------------------------------------------------------------
WITH target_shop AS (
    SELECT id, row_number() OVER (ORDER BY name, id) AS n
    FROM (SELECT id, name FROM shop ORDER BY name, id LIMIT 3) s
),
latest AS (
    SELECT DISTINCT ON (visit.shop_id, rating.interest_id, visit.profile_id)
           visit.shop_id,
           rating.interest_id,
           visit.profile_id,
           rating.value
    FROM rating
    JOIN visit ON visit.id = rating.visit_id
    WHERE visit.shop_id IN (SELECT id FROM target_shop)
    ORDER BY visit.shop_id, rating.interest_id, visit.profile_id,
             visit.created_at DESC, visit.id DESC
)
SELECT shop.name          AS shop,
       interest.category  AS tag,
       round(avg(latest.value), 2) AS avg_value,
       count(*)           AS rating_count
FROM latest
JOIN shop ON shop.id = latest.shop_id
JOIN interest ON interest.id = latest.interest_id
GROUP BY shop.name, interest.category
HAVING count(*) >= 3 AND avg(latest.value) >= 4
ORDER BY shop.name, avg(latest.value) DESC, interest.category;


-- --------------------------------------------------------------------------
-- 5. Undo, if you need the database back the way it was. Run these in order.
--
-- DELETE FROM rating WHERE visit_id IN (
--     SELECT id FROM visit WHERE profile_id IN (
--         '0198a2b0-0000-7000-8000-000000000001',
--         '0198a2b0-0000-7000-8000-000000000002',
--         '0198a2b0-0000-7000-8000-000000000003'));
-- DELETE FROM visit WHERE profile_id IN (
--     '0198a2b0-0000-7000-8000-000000000001',
--     '0198a2b0-0000-7000-8000-000000000002',
--     '0198a2b0-0000-7000-8000-000000000003');
-- DELETE FROM profile WHERE id IN (
--     '0198a2b0-0000-7000-8000-000000000001',
--     '0198a2b0-0000-7000-8000-000000000002',
--     '0198a2b0-0000-7000-8000-000000000003');
-- --------------------------------------------------------------------------
