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
--   75 visits, arranged so every shop draws exactly 3 distinct raters
--   1 extra repeat visit (see below), for 76 total
--   566 ratings — a visit rates only the interests we found evidence for
--
-- A visit does NOT rate all ten interests. The rating matrix in step 6 leaves a
-- cell NULL when no public evidence supports a score, and NULLs produce no
-- rating rows, so 186 of the 250 (shop, interest) pairs are rated and 64 are
-- genuinely unknown. That is what makes coverage vary and the `limited` band
-- reachable — see WHAT THE REAL DATA CHANGED below.
--
-- Three distinct raters per rated pair is still the tag threshold
-- (TAG_MIN_RATERS), so shop tags light up for free on anything that IS rated.
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
--     1. Sukoon              83 great     1. Bike In            88 great
--     2. Humble              81 great     2. Michael Thomas     87 great
--     3. Michael Thomas      71 good      3. Zendo              83 great
--    ...                                 ...
--    25. Red Rock         35 limited     25. Red Rock           26 weak
--
--   Imani Brooks (plant-based)          Diego Salas (student)
--     1. Café Lush           85 great     1. Sukoon             89 great
--     2. Rust Is Gold        80 great     2. Humble             80 great
--     3. Java Joe's          80 great     3. Sueños             75 great
--    ...                                 ...
--    25. Red Rock         33 limited     25. Red Rock        33 limited
--
--   Nina Okafor (social)                Wes Lindgren (generalist control)
--     1. Sukoon              85 great     1. Humble             76 great
--     2. Sueños              81 great     2. Sukoon             76 great
--     3. Bike In             79 great     3. Little Bear        75 great
--    ...                                 ...
--    25. Red Rock            8 weak      25. Red Rock        31 limited
--
--
-- WHAT THE REAL DATA CHANGED — read this before trusting the ranking
--
-- The invented matrix this replaced was tuned so every persona had a different
-- #1. That property is GONE, and its absence is the most useful thing in this
-- file:
--
--   Sukoon is #1 for THREE of six personas (Rosa, Diego, Nina). Tom gets Bike
--   In, Imani gets Café Lush, Wes gets Humble. Four distinct winners across
--   six personas, not six.
--
-- The cause is EVIDENCE DENSITY. Three explanations were tested against the
-- database before landing on it; do not re-run these experiments:
--
--   NOT the 0.5 default on its own. Substituting each interest's observed mean
--   (0.65-0.84 depending on interest) for the flat 0.5 leaves the orderings
--   almost unchanged and the distinct-#1 count identical.
--
--   NOT persona overlap. Rosa and Diego originally weighted the same four
--   interests, which looked like the obvious culprit. They were rewritten to
--   share only two — and STILL returned the same top three in the same order.
--   The rewrite was kept because two identical personas is a bad fixture
--   regardless, but on its own it did not move the ranking.
--
--   IT IS COVERAGE. A second research pass targeting only the sparsest shops
--   lifted the table from 152 to 186 rated cells, and that is what finally
--   moved things: distinct winners went 3 -> 4, Wes flipped from Sukoon to
--   Humble, Tom went from ranking 23 shops to all 25, and the number of shops
--   reporting `limited` collapsed (Nina and Tom now have none at all).
--
-- The mechanism is arithmetic. Every unrated interest contributes 0.5 where a
-- documented strength contributes up to 1.0, so a shop known on 4 of 10
-- interests cannot out-score one known on 8 no matter how good it is. Before
-- the second pass, four cafés sat at 4-5 rated interests and were effectively
-- disqualified from every ranking regardless of quality.
--
-- Treat the residual concentration as a finding about the product, not a defect
-- in this fixture. The ranking is still partly measuring how well a café is
-- written about, because scraped public evidence covers the same popular cafés
-- most thoroughly. Real users rating real shops is what evens that out; more
-- scraping has diminishing returns, as the 5/25 on Accessible Outlets shows.
--
-- Other things worth checking:
--
--   `limited` is REACHABLE but no longer everywhere — 0 to 6 shops per persona
--   report it (Nina and Tom have none, Diego and Imani have 6). Rosa's worst
--   coverage is 0.18. Before NULLs existed, coverage was 1.00 everywhere and
--   the band was dead code. If NOTHING reports `limited` for any persona, the
--   NULLs in the matrix are not being honoured.
--
--   Every persona now ranks all 25 shops. Tom used to rank only 23 — two
--   shops carried no rating on ANY interest he weights, so
--   selectMatchesForProfile excluded them outright. Filling their Dog Friendly
--   and Alt Drinks cells fixed that. The exclusion path is still real and still
--   correct; it just no longer triggers on this data.
--
--   Red Rock lands last for everyone, but the BAND it reports now varies by
--   persona: `weak` for Nina (8) and Tom (26), `limited` for the other four.
--   That is the distinction working. It is a wholesale roaster that says itself
--   there is "no sitting down", so for personas whose interests it can be
--   judged against it earns a genuine bad verdict, and for the rest there is
--   not enough to judge.
--
--   Scores did NOT compress the way grounding usually threatens. The spread
--   runs 8-89 across personas. The bands still separate shops.
--
-- Wes is NOT a flat 0.5 across the board, and assuming he is will produce
-- wrong numbers. The preferences form makes every profile crown exactly one
-- tie-break winner at 1.0, and step 2 gives Wes Comfortable Seating. Any
-- offline recalculation of this table has to carry that 1.0 or it will
-- disagree with the database — which is how this row was once got wrong.
-- Regenerate against the database, never from the matrix alone.
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

    IF shop_count <> 25 THEN
        RAISE EXCEPTION 'Expected the 25 shops from seed-shops-abq.sql; found %. Run that first.', shop_count;
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
--   Rosa    remote worker   wifi above all, then outlets, drinks and food
--   Tom     dog walker      dogs, then a patio to sit on
--   Imani   plant-based     vegan first, gluten free and food close behind
--   Diego   student         quiet above all, then seating, outlets and food
--
--   Rosa and Diego deliberately do NOT overlap on wifi or quiet. They used to
--   weight the same four interests and always returned the same shop; see the
--   note in step 2.
--   Nina    social          drinks beyond coffee, seating, patio
--   Wes     generalist      mildly interested in everything
--
-- Interests are joined by category, never by id. See the header.
-- --------------------------------------------------------------------------
INSERT INTO preference (profile_id, interest_id, importance)
SELECT w.profile_id, interest.id, w.importance
FROM (VALUES
    -- Rosa, remote worker: connectivity and power, and she wants a drink she
    -- likes while she is parked there. NOT a library — that is Diego's job.
    --
    -- Rosa and Diego used to weight the SAME four interests (WiFi, Outlets,
    -- Quiet, Seating) with only the order changed, which made them the same
    -- persona twice and meant they always returned the same shop. If you edit
    -- either one, keep their sets genuinely different or the fixture stops
    -- demonstrating that preferences matter at all.
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Strong WiFi',             1.0),
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Accessible Outlets',      0.8),
    ('01900000-0000-7000-8000-000000006001'::uuid, 'Alternate Drink Options', 0.5),
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

    -- Diego, student: silence, somewhere to sit for four hours, and something
    -- to eat without leaving. WiFi is dropped entirely — he reads and writes
    -- rather than streams, and it is the interest Rosa cares most about, so
    -- leaving it out is what keeps these two personas distinct.
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Quiet Atmosphere',        1.0),
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Comfortable Seating',     0.8),
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Accessible Outlets',      0.8),
    ('01900000-0000-7000-8000-000000006004'::uuid, 'Food Options',            0.5),

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
-- profiles. With 25 shops and 6 raters the rotation gives each profile 12 to 14
-- visits (Rosa has 14 — 13 plus her repeat), which is closer to how real usage
-- looks than a forced even split.
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

    -- Shops 11-25. The rotation continues by the same rule: the first rater is
    -- ((shop_n - 1) mod 6) + 1, then the next two wrapping at 6. days_ago runs
    -- 41-90 so this batch does not collide with the spread above.
    ('01900000-0000-7000-8000-000000007111',   11,   5,   90),
    ('01900000-0000-7000-8000-000000007112',   11,   6,   74),
    ('01900000-0000-7000-8000-000000007113',   11,   1,   58),

    ('01900000-0000-7000-8000-000000007121',   12,   6,   89),
    ('01900000-0000-7000-8000-000000007122',   12,   1,   73),
    ('01900000-0000-7000-8000-000000007123',   12,   2,   57),

    ('01900000-0000-7000-8000-000000007131',   13,   1,   88),
    ('01900000-0000-7000-8000-000000007132',   13,   2,   72),
    ('01900000-0000-7000-8000-000000007133',   13,   3,   56),

    ('01900000-0000-7000-8000-000000007141',   14,   2,   87),
    ('01900000-0000-7000-8000-000000007142',   14,   3,   71),
    ('01900000-0000-7000-8000-000000007143',   14,   4,   55),

    ('01900000-0000-7000-8000-000000007151',   15,   3,   86),
    ('01900000-0000-7000-8000-000000007152',   15,   4,   70),
    ('01900000-0000-7000-8000-000000007153',   15,   5,   54),

    ('01900000-0000-7000-8000-000000007161',   16,   4,   85),
    ('01900000-0000-7000-8000-000000007162',   16,   5,   69),
    ('01900000-0000-7000-8000-000000007163',   16,   6,   53),

    ('01900000-0000-7000-8000-000000007171',   17,   5,   84),
    ('01900000-0000-7000-8000-000000007172',   17,   6,   68),
    ('01900000-0000-7000-8000-000000007173',   17,   1,   52),

    ('01900000-0000-7000-8000-000000007181',   18,   6,   83),
    ('01900000-0000-7000-8000-000000007182',   18,   1,   67),
    ('01900000-0000-7000-8000-000000007183',   18,   2,   51),

    ('01900000-0000-7000-8000-000000007191',   19,   1,   82),
    ('01900000-0000-7000-8000-000000007192',   19,   2,   66),
    ('01900000-0000-7000-8000-000000007193',   19,   3,   50),

    ('01900000-0000-7000-8000-000000007201',   20,   2,   81),
    ('01900000-0000-7000-8000-000000007202',   20,   3,   65),
    ('01900000-0000-7000-8000-000000007203',   20,   4,   49),

    ('01900000-0000-7000-8000-000000007211',   21,   3,   80),
    ('01900000-0000-7000-8000-000000007212',   21,   4,   64),
    ('01900000-0000-7000-8000-000000007213',   21,   5,   48),

    ('01900000-0000-7000-8000-000000007221',   22,   4,   79),
    ('01900000-0000-7000-8000-000000007222',   22,   5,   63),
    ('01900000-0000-7000-8000-000000007223',   22,   6,   47),

    ('01900000-0000-7000-8000-000000007231',   23,   5,   78),
    ('01900000-0000-7000-8000-000000007232',   23,   6,   62),
    ('01900000-0000-7000-8000-000000007233',   23,   1,   46),

    ('01900000-0000-7000-8000-000000007241',   24,   6,   77),
    ('01900000-0000-7000-8000-000000007242',   24,   1,   61),
    ('01900000-0000-7000-8000-000000007243',   24,   2,   45),

    ('01900000-0000-7000-8000-000000007251',   25,   1,   76),
    ('01900000-0000-7000-8000-000000007252',   25,   2,   60),
    ('01900000-0000-7000-8000-000000007253',   25,   3,   44),

    -- The repeat. Rosa came back to shop 1 and liked it much better this time.
    -- Her 40-days-ago visit above must be ignored by the DISTINCT ON; if it is
    -- not, shop 1's averages come out low and her ranking is wrong.
    ('01900000-0000-7000-8000-000000007019',    1,   1,    3)
) AS sv (visit_id, shop_n, profile_n, days_ago)
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------------------------
-- 6. The ratings — up to 10 per visit.
--
-- THE SHOP RATING MATRIX, grounded in public evidence on 2026-08-17.
--
-- One row per shop, one column per interest, each a target 1-5 average — or
-- NULL, meaning NO EVIDENCE WAS FOUND and the shop is deliberately left
-- unrated for that interest. NULL is not a low score. It is the absence of a
-- claim, and it is what makes coverage — and therefore the `limited` band —
-- mean something instead of always being 1.00.
--
-- Read the columns as: Dog / Quiet / WiFi / Vegan / GlutenFree / Food /
-- Outlets / Seating / Patio / AltDrinks.
--
-- HOW EACH NUMBER WAS CHOSEN
--
--   5     repeatedly cited as a standout, or tagged yes with emphasis
--   4     clearly present and positively mentioned
--   3     present but unremarkable, or the sources conflict
--   2     mentioned as lacking
--   1     explicitly absent, or tagged `no`
--   NULL  no evidence found — leave unrated
--
-- SOURCES, strongest first
--
--   1. OpenStreetMap via the Overpass API, for `internet_access` and
--      `outdoor_seating`. Structured and unambiguous. A MISSING tag is not
--      evidence of absence — only an explicit `no` is, which is why a shop can
--      have no OSM wifi tag and still score on review evidence.
--   2. Diet directories: HappyCow (vegan), findmeglutenfree / Atly (gluten
--      free), BringFido (dogs).
--   3. Review prose from search summaries, plus each shop's own menu.
--
-- Yelp and Google attribute panels are NOT sources here. Both return HTTP 403
-- to automated fetches, so nothing in this table came from either.
--
-- WHAT THE EVIDENCE COULD NOT COVER — read this before trusting a ranking
--
-- 186 of the 250 cells got real evidence, after a second research pass that
-- deliberately targeted the sparsest shops rather than re-confirming what was
-- already known. These counts are Verification 4's output, not an estimate:
--
--   Comfortable Seating 25/25
--   Food Options        25/25   everybody publishes a menu
--   Outdoor Patio       25/25
--   Alt Drinks          23/25
--   Dog Friendly        19/25
--   Quiet Atmosphere    18/25
--   Strong WiFi         18/25
--   Vegan               17/25
--   Gluten Free         11/25
--   Accessible Outlets   5/25   <-- almost nobody writes down where the plugs are
--
-- The first pass reached 152/250 and left four shops at 4-5 rated interests
-- (Amalie, Plata, The Well, Sueños), which distorted the ranking — see WHAT THE
-- REAL DATA CHANGED. The second pass lifted the floor: the sparsest shop that
-- is actually a cafe now sits at 5/10, and only Red Rock (a wholesale roaster
-- with no cafe at all) is lower at 4/10.
--
-- Accessible Outlets is the finding worth acting on. Rosa and Diego both weight
-- it 0.8, and it is documented for four shops. A preference users can express
-- but the world does not record cannot influence a ranking, no matter how the
-- scoring treats it. That is a problem with the interest list, not the matcher.
--
-- The roster is read back out of the `visit` table rather than repeated: step 4
-- committed those rows earlier in this transaction, and the rater slot is the
-- last character of the visit id.
-- --------------------------------------------------------------------------
WITH matrix (shop_n, shop_label, dog, quiet, wifi, vegan, gf, food, outlets, seating, patio, alt) AS (VALUES
    -- Row 1's NULLs carry an explicit ::integer so the VALUES column types are
    -- never in doubt; later rows can then use a bare NULL.
    --                                     dog   qt   wf   vg   gf   fd   ou   se   pa   al

    -- OSM wlan + patio. Reviews: dog-friendly patio with a fountain, calm and
    -- good for working, macadamia/oat/soy milk. No outlet or GF evidence.
    ( 1, 'Michael Thomas  Nob Hill',           4,   4,   4,   3, NULL::integer,
                                                                     3, NULL::integer,
                                                                               4,   4,   3),
    -- OSM wlan + patio. Reviews: pastries consistently praised, seating inside
    -- and out, free wifi. Dog policy unknown; no vegan/GF/alt evidence.
    ( 2, 'Cutbow          roastology',         4,   3,   4,   3,NULL,   4,NULL,   4,   4,   4),
    -- OSM wlan + patio. HappyCow: vegan donuts and pastries, oat milk with no
    -- upcharge, GF options. Covered patio is dog friendly, shared with a
    -- brewery. Quiet only claimed of the back patio, so 3 not 4.
    ( 3, 'Zendo           downtown art',       5,   3,   4,   5,   4,   4,NULL,   4,   5,   4),
    -- OSM wlan + patio. Reviews: ample seating and cozy furniture, dog-friendly
    -- patio with cushioned benches, vegan pastries and GF options.
    ( 4, 'Little Bear     specialty',          5,NULL,   4,   4,   4,   4,NULL,   5,   4,   4),
    -- OSM wlan + patio. Reviews explicitly: "comfortable chairs with outlets",
    -- "plenty of seats inside and outside", covered patio, quiet with a book.
    ( 5, 'Humble          Lomas',              5,   4,   5,   3,NULL,   3,   5,   5,   4,   4),
    -- OSM wlan + patio. Big kitchen: burritos, waffles, GF crepes, caters to
    -- vegan and gluten sensitivities. Live music, so NOT a quiet room.
    ( 6, 'Java Joes       kitchen',         NULL,   2,   4,   4,   5,   5,NULL,   4,   4,   3),
    -- OSM patio, no wifi tag and reviews do not confirm it. Quiet and good for
    -- working; dogs allowed; seating mixed (high tops called uncomfortable).
    ( 7, 'Villa Myriam    roastery',           4,   4,   4,NULL,NULL,   4,NULL,   3,   4,   3),
    -- No OSM entry. Cozy lounge seating repeatedly cited; celebrated pistachio
    -- latte and creative specialty drinks. Open to 11pm.
    ( 8, 'Amalie          open late',          4,NULL,NULL,NULL,NULL,   3,NULL,   5,   4,   5),
    -- OSM wlan + patio. Reviews explicitly: "plenty of seating and outlets",
    -- quiet study space. Yemeni menu drives the alt-drinks and food scores.
    ( 9, 'Sukoon          study spot',      NULL,   5,   4,NULL,NULL,   4,   5,   5,   4,   5),
    -- OSM wlan but outdoor_seating=NO, while review prose describes a covered
    -- patio — conflicting, so patio is 3 per the rubric. Seating repeatedly
    -- called small and hard to get. Dogs allowed; vegan and GF options.
    (10, 'Trifecta        north valley',       4,   3,   4,   4,   4,   4,NULL,   2,   3,   4),
    --                                     dog   qt   wf   vg   gf   fd   ou   se   pa   al
    -- OSM wlan. Reviews: lots of comfortable seating and lounge areas, quiet at
    -- midday, reliable wifi, a much-praised vegan breakfast burrito.
    (11, 'Slow Burn       adobe',           NULL,   4,   5,   4,NULL,   3,NULL,   5,   4,   3),
    -- The deliberate floor, and it is real: a wholesale roaster that tells you
    -- itself there is "no counter, no shots pulled in front of you, and no
    -- sitting down". Almost everything is unrated because almost nothing is
    -- offered. Expect this shop to report `limited` or drop out entirely.
    (12, 'Red Rock        wholesale only',  NULL,NULL,NULL,NULL,NULL,   1,NULL,   1,   1,   1),
    -- Dogs welcome INSIDE, not just the patio. Vegan tofu breakfast burrito is
    -- the single most-praised item. Reviews warn "almost no outlets".
    (13, 'Rust Is Gold    moto shop',          5,NULL,NULL,   5,   4,   4,   1,   4,   4,   4),
    -- Counter inside Sawmill Market. Multiple seating areas with laptop
    -- workers; hand-blended Taos teas; many vegan offerings.
    (14, 'Plata           food hall',       NULL,   4,NULL,   4,NULL,   3,NULL,   4,   4,   4),
    -- An urban farm you drink coffee on. Free wifi advertised on their own
    -- site; very dog friendly; the whole venue is garden seating.
    (15, 'Bike In         farm garden',        5,   4,   4,   3,NULL,   4,NULL,   4,   5,   4),
    -- Known for a wide gluten-free selection. Calm and quiet, but seating is
    -- mixed — ample, yet some reviewers call the furniture uncomfortable.
    (16, 'Whispering Bean micro roaster',      4,   4,NULL,NULL,   5,   3,NULL,   3,   3,   4),
    -- Coffee flights and tea flights are the draw. Cozy chairs by the fire and
    -- ADA-accessible wide seating are repeatedly called out.
    (17, 'Sueños          flights',            4,   4,NULL,   3,NULL,   3,   4,   5,   4,   5),
    -- Huge room with lots of seating, free wifi, pets welcome, gluten/dairy
    -- free options. Patio exists but faces Menaul, so it is a 3 not a 4.
    (18, 'Napoli          long hours',         4,NULL,   4,   3,   4,   4,NULL,   5,   3,   4),
    -- OSM patio. In-house pastries and a seasonal menu; GF and vegan options;
    -- overflow seating shared with the attached Greek restaurant.
    (19, 'Meraki          cafe + market',      5,NULL,NULL,   3,   4,   4,NULL,   4,   4,NULL),
    -- ABQ's first Yemeni coffee house. Listed among the city's free-wifi
    -- shops; pistachio milk cake and Dubai croissants drive the food score;
    -- lattes, matchas and mojitos drive alt drinks.
    (20, 'Drop            Yemeni',             4,   3,   4,NULL,NULL,   4,NULL,   3,   3,   5),
    -- Reviews explicitly: "ample seating options and well-placed power
    -- outlets", shaded patio with Edison bulbs and lawn games.
    (21, 'Citizen         early work',      NULL,   3,   4,NULL,NULL,   3,   5,   5,   4,   3),
    -- Nonprofit coffee house. Free wifi, plenty of seating, "a perfect place to
    -- read a book". Small menu of donuts and sandwiches.
    (22, 'The Well        nonprofit',          4,   4,   4,NULL,NULL,   3,NULL,   4,   3,   4),
    -- The strongest dietary story in the table: everything can be made gluten
    -- free (listed by the National Celiac Association) and there are many vegan
    -- options including vegan cheese and butter.
    (23, 'Café Lush       brunch',             3,   4,   4,   5,   5,   5,NULL,   3,   4,NULL),
    -- A panaderia rather than a cafe, and it shows: food is the standout, the
    -- patio is spacious and dog friendly, GF options exist, free wifi.
    (24, 'Golden Crown    panaderia',          4,NULL,   4,   3,   4,   5,NULL,   4,   5,   3),
    -- Inside The ABQ Collective. Free high-speed wifi is the loudest claim;
    -- large outdoor area with swings; seating limited when busy.
    (25, 'ABQ Coffee      collective',         4,   4,   5,   4,   4,   3,NULL,   3,   4,   4)
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
    -- A NULL target means no evidence was found, so no rating row is written
    -- at all. This is the whole mechanism behind coverage being real: the
    -- matcher treats a missing (shop, interest) pair as unknown rather than as
    -- a bad score, and reports `limited` when too much of a profile's weighted
    -- preference mass lands on unknowns.
    WHERE t.value IS NOT NULL
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
-- Verification 1: row counts. Expect 6 / 60 / 76 / 566.
--
-- 566, not 760, because unrated (NULL) matrix cells write no rating rows. If
-- you see 760 here, the `WHERE t.value IS NOT NULL` filter in step 6 is gone
-- and every unknown has been silently scored as a real value.
-- ---------------------------------------------------------------------------
SELECT 'profiles'    AS what, count(*) AS n FROM profile    WHERE id::text         LIKE '01900000-0000-7000-8000-0000000060%'
UNION ALL
SELECT 'preferences',         count(*)      FROM preference WHERE profile_id::text LIKE '01900000-0000-7000-8000-0000000060%'
UNION ALL
SELECT 'visits',              count(*)      FROM visit      WHERE id::text         LIKE '01900000-0000-7000-8000-000000007%'
UNION ALL
SELECT 'ratings',             count(*)      FROM rating     WHERE visit_id::text   LIKE '01900000-0000-7000-8000-000000007%';


-- ---------------------------------------------------------------------------
-- Verification 2: every RATED (shop, interest) pair must have exactly 3
-- distinct raters.
--
-- Expect ZERO rows. A row here means the DISTINCT ON dedupe is not collapsing
-- Rosa's two visits to shop 1, or the rater rotation has a gap.
--
-- Note what this check can no longer tell you. Now that NULL targets produce no
-- rating rows, an unrated (shop, interest) pair forms no group at all and is
-- silently skipped here — so a clean result proves the raters are consistent,
-- NOT that every pair got rated. Verification 4 below is the coverage check;
-- run both.
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
-- Verification 4: evidence coverage per interest.
--
-- This is the check Verification 2 cannot do. It counts how many of the 25
-- shops carry a rating for each interest, which is the same thing as counting
-- the non-NULL cells in the matrix.
--
-- Expect the distribution documented in the matrix header — Food Options at
-- 25/25 down to Accessible Outlets at 4/25. A number that has drifted upward
-- means somebody filled in a guess; drifting downward means rating rows did not
-- land.
-- ---------------------------------------------------------------------------
SELECT interest.category,
       count(DISTINCT visit.shop_id) AS shops_rated,
       25 - count(DISTINCT visit.shop_id) AS shops_unrated
FROM rating
JOIN visit ON visit.id = rating.visit_id
JOIN interest ON interest.id = rating.interest_id
WHERE visit.id::text LIKE '01900000-0000-7000-8000-000000007%'
GROUP BY interest.category
ORDER BY count(DISTINCT visit.shop_id) DESC, interest.category;


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
