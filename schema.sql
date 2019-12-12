DROP TABLE IF EXISTS "users", "games", "users_games", "card_types", "all_cards", "cards";

CREATE TABLE "users" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "name" text NOT NULL CHECK ("name" <> ''),
    "password_hash" text NOT NULL
);
CREATE UNIQUE INDEX ON "users" (lower("name"));

CREATE TABLE "games" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "name" text NOT NULL,
    "password_hash" text,
    "creator" integer NOT NULL REFERENCES "users" ("id"),
    "max_players" smallint NOT NULL,
    "started" boolean NOT NULL DEFAULT FALSE,
    "ended" boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE "users_games" (
    "user_id" integer PRIMARY KEY REFERENCES "users" ("id"),
    "game_id" integer REFERENCES "games" ("id")
);
CREATE INDEX ON "users_games" ("game_id");

CREATE TABLE "card_types" (
    "id" text PRIMARY KEY CHECK ("id" <> ''),
    "name" text NOT NULL,
    "base_url" text NOT NULL
);

CREATE TABLE "all_cards" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "text_id" text UNIQUE NOT NULL CHECK ("text_id" <> ''),
    "type" text NOT NULL REFERENCES "card_types" ("id"),
    "name" text NOT NULL CHECK ("name" <> ''),
    "text" text NOT NULL CHECK ("text" <> ''),
    "visibility" text NOT NULL CHECK ("visibility" IN ('all', 'player')),
    "duration" integer NOT NULL
);

CREATE TABLE "cards" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "text_id" text UNIQUE NOT NULL CHECK ("text_id" <> ''),
    "type" text NOT NULL REFERENCES "card_types" ("id"),
    "name" text NOT NULL CHECK ("name" <> ''),
    "text" text NOT NULL CHECK ("text" <> ''),
    "visibility" text NOT NULL CHECK ("visibility" IN ('all', 'player')),
    "duration" integer NOT NULL
);
