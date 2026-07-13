CREATE TABLE IF NOT EXISTS shop {
    id uuid PRIMARY KEY,
    address varchar(255),
    hours json,
    lat numeric(9,6),
    lng numeric(9,6),
    name varchar(63) NOT NULL,
    phone varchar(31),
    image_url url
    };

CREATE TABLE profile (
    id uuid PRIMARY KEY,
    activation_token char(32),
    created_at timestamptz,
    email varchar(127) UNIQUE NOT NULL,
    name varchar(63) NOT NULL,
    password_hash char(97) NOT NULL,
    updated_at timestamptz
);

CREATE TABLE save (
    profile_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    created_at timestamptz
);

CREATE TABLE interest (
    id uuid,
    interest_category varchar(127)
);

