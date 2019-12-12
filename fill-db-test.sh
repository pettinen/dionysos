#!/bin/sh

cd "$(dirname "$0")"

psql < schema.sql
psql < test-data.sql
psql < cards.sql

# Insert all cards that require special coding (plus some other ones).
# Unimplemented special cards are commented out.
psql << 'EOF'
INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration")
    SELECT "text_id", "name", "type", "text", "visibility", "duration" FROM "all_cards"
    WHERE "text_id" IN (
    -- Ordinary cards
        'anything_you_can_do',
        'asserting_dominance',
        'charitable',
        'cockatrice',
        'deadline',
        'dictator',
        'methanol',
        'spring_cleaning'
        'teetotal',
    -- Special action cards
        'daring',
        'distracted',
        'greed',
        'magic',
        --'new_world_order',
        --'sacrifice',
        'too_many_cards',
    -- Special "all" cards
        --'chaos',
        --'missed_opportunities',
        --'revolution',
    -- Special permanent cards
        'generosity',
        'spidey_sense',
    -- Special "use" cards
        'artist',
        --'cleanup',
        --'donor',
        'gotta_go_fast',
        --'grand_larceny',
        --'nope',
        --'not_so_permanent',
        --'petty_theft',
        --'teleportation',
        'to_the_loo'
    );
EOF
