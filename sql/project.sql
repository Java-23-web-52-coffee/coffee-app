drop table if exists rating;
drop table if exists preference;
drop table if exists visit;
drop table if exists interest;
drop table if exists favorite;
drop table if exists profile;
drop table if exists shop;



CREATE TABLE IF NOT EXISTS shop
(
    id        uuid PRIMARY KEY,
    address   varchar(255),
    hours     json,
    lat       numeric(9, 6),
    lng       numeric(9, 6),
    name      varchar(63) NOT NULL,
    phone     varchar(31),
    image_url varchar(255)
);

CREATE TABLE profile (
    id uuid PRIMARY KEY,
    activation_token char(32),
    created_at timestamptz,
    email varchar(127) UNIQUE NOT NULL,
    name varchar(63) NOT NULL,
    password_hash char(97) NOT NULL,
    updated_at timestamptz
);

CREATE TABLE favorite (
    profile_id uuid NOT NULL references profile(id),
    shop_id uuid NOT NULL references shop(id),
    created_at timestamptz,
    primary key (profile_id, shop_id)
);


CREATE index ON favorite (profile_id, shop_id);

CREATE TABLE interest (
    id uuid PRIMARY KEY,
    interest_category varchar(127)
);

CREATE TABLE visit (
  id uuid PRIMARY KEY,
  shop_id uuid NOT NULL references shop(id),
  profile_id uuid NOT NULL references profile(id),
  created_at timestamptz
);

CREATE index ON visit (shop_id, profile_id);

CREATE TABLE preference (
  profile_id uuid references profile(id),
  interest_id uuid references interest(id),
  importance decimal,
  primary key (profile_id, interest_id)
);

CREATE index ON preference (profile_id, interest_id);

CREATE TABLE rating (
  visit_id uuid references visit(id),
  interest_id uuid references interest(id),
  value decimal,
primary key (visit_id, interest_id)
);

CREATE index ON rating (visit_id, interest_id);