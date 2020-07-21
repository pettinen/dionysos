#!/bin/sh

cd "$(dirname "$0")"

psql < schema.sql
psql < test-data.sql
psql < cards.sql
psql -c 'INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration", "remote") SELECT "text_id", "name", "type", "text", "visibility", "duration", "remote" FROM "all_cards";'
