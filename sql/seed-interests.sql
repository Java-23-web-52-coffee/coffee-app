-- ============================================================================
-- The ten interests users can express a preference for.
--
-- These are the product's canonical interest list. Categories are stored in
-- Title Case to match the convention seed-matches.sql already established
-- ('Fast WiFi', not 'fast wifi'), because the UI renders `category` verbatim.
--
-- Run it:  psql "$DATABASE_URL" -f sql/seed-interests.sql
-- (This writes to the shared team database.)
--
-- Safe to run more than once, twice over: the ids are fixed and the insert is
-- ON CONFLICT DO NOTHING, AND each row is guarded by a case-insensitive
-- NOT EXISTS on `category`. The second guard matters because `interest` has no
-- UNIQUE constraint on category (sql/project.sql:40-43) — without it, a rerun
-- with different ids would happily create a second 'Vegan' and the preferences
-- screen would show it twice.
--
--
-- READ THIS BEFORE YOU RUN IT: THE OVERLAP WITH seed-matches.sql
--
-- sql/seed-matches.sql already inserted five interests as test fixtures:
--
--     Fast WiFi | Quiet Atmosphere | Outdoor Seating | Late Hours | Vegan Food
--
-- 'Quiet Atmosphere' is an exact match for one of ours, so the NOT EXISTS
-- guard skips it and we reuse the existing row. Three others are NEAR matches
-- that the guard cannot catch, and they will coexist:
--
--     Fast WiFi        alongside  Strong WiFi
--     Vegan Food       alongside  Vegan
--     Outdoor Seating  alongside  Outdoor Patio
--
-- That is deliberate, not an oversight. The seed-matches rows are load-bearing:
-- its documented match scores (75 / 67 / 50) are pinned to those interest ids
-- through `rating` and `preference` foreign keys, so deleting them breaks that
-- fixture. Until the matching ticket is done with them, the preferences screen
-- will show both flavors. The optional cleanup at the bottom of this file
-- retires them once you no longer need those scores.
--
--
-- WHAT THE SCHEMA DEMANDS
--
-- As with the shops, a bad row inserts cleanly and then fails on the way OUT:
-- selectAllInterest() parses every row through InterestModel
-- (backend/src/apis/interest/interest.model.ts:11-14), so a bad id surfaces as
-- a 500 from the interests endpoint, not an error here.
--
--   id        a genuine uuidv7 — version nibble 7, variant nibble 8. These use
--             a reserved 01900000-0000-7000-8000-0000000050NN block, clear of
--             seed-matches.sql's interests (...1001-1005) and of
--             seed-shops-abq.sql's shops (...4001-4010).
--   category  varchar(127), and InterestModel requires a string. Every value
--             below is well under the limit.
-- ============================================================================

BEGIN;

INSERT INTO interest (id, category)
SELECT v.id, v.category
FROM (VALUES
    ('01900000-0000-7000-8000-000000005001'::uuid, 'Dog Friendly'),
    ('01900000-0000-7000-8000-000000005002'::uuid, 'Quiet Atmosphere'),
    ('01900000-0000-7000-8000-000000005003'::uuid, 'Strong WiFi'),
    ('01900000-0000-7000-8000-000000005004'::uuid, 'Vegan'),
    ('01900000-0000-7000-8000-000000005005'::uuid, 'Gluten Free'),
    ('01900000-0000-7000-8000-000000005006'::uuid, 'Food Options'),
    ('01900000-0000-7000-8000-000000005007'::uuid, 'Accessible Outlets'),
    ('01900000-0000-7000-8000-000000005008'::uuid, 'Comfortable Seating'),
    ('01900000-0000-7000-8000-000000005009'::uuid, 'Outdoor Patio'),
    ('01900000-0000-7000-8000-000000005010'::uuid, 'Alternate Drink Options')
) AS v (id, category)
-- skip any category that already exists under a different id, whatever its case
WHERE NOT EXISTS (
    SELECT 1 FROM interest i WHERE lower(i.category) = lower(v.category)
)
ON CONFLICT DO NOTHING;

COMMIT;


-- ---------------------------------------------------------------------------
-- Verification.
--
-- `source` tells you where each row came from. Expect the ten above, plus the
-- four surviving seed-matches fixtures, and 'Quiet Atmosphere' exactly ONCE —
-- if it appears twice, the NOT EXISTS guard did not fire and something else
-- inserted a duplicate.
-- ---------------------------------------------------------------------------
SELECT category,
       count(*) AS times_present,
       CASE
           WHEN min(id::text) LIKE '01900000-0000-7000-8000-0000000050%' THEN 'seed-interests'
           WHEN min(id::text) LIKE '01900000-0000-7000-8000-0000000010%' THEN 'seed-matches'
           ELSE 'other'
       END AS source
FROM interest
GROUP BY category
ORDER BY source, category;


-- ---------------------------------------------------------------------------
-- Optional: retire the seed-matches.sql interests once the matching ticket no
-- longer needs its pinned scores. This clears the near-duplicate pairs above.
--
-- Order matters — `rating` and `preference` both reference interest(id), so
-- they have to go first or the DELETE hits a foreign key violation.
--
-- DELETE FROM rating     WHERE interest_id::text LIKE '01900000-0000-7000-8000-0000000010%';
-- DELETE FROM preference WHERE interest_id::text LIKE '01900000-0000-7000-8000-0000000010%';
-- DELETE FROM interest   WHERE id::text          LIKE '01900000-0000-7000-8000-0000000010%';
--
-- Then rerun this file to fill in 'Quiet Atmosphere' under our own id.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- Undo just this file's rows.
--
-- Fails with a foreign key violation if anyone has set a preference or left a
-- rating on one of these interests. That is correct behavior — clear those
-- first if you really mean it.
--
-- DELETE FROM interest WHERE id::text LIKE '01900000-0000-7000-8000-0000000050%';
-- ---------------------------------------------------------------------------
