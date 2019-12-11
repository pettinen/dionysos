--Ordinary cards
INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration") VALUES
;

-- Special cards (unimplemented ones commented out)
INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration") VALUES
-- "All" cards
--    ('chaos', 'Chaos', 1, 'The direction of the game is reversed. All players\u2019 permanent and \u201Cuse\u201D cards are shuffled and dealt to all players.', 'all', 0),
--    ('missed_opportunities', 'Missed Opportunities', 1, 'All \u201Cuse\u201D cards in players\u2019 hands are shuffled back into the deck. Their owners must take one sip per card.', 'all', 0),
--    ('revolution', 'Revolution', 1, 'Everyone gives their permanent cards to the player next in turn from them.', 'all', 0),

-- "Use" cards
    ('artist', 'Artist', 2, 'Take a creative break and skip your next five turns.', 'player', 5),
--    ('cleanup', 'Cleanup', 2, 'You may discard any active permanent cards.', 'player', 0),
--    ('donor', 'Donor', 2, 'Search the deck for a card and give it to any other player.', 'player', 0),
    ('gotta_go_fast', 'Gotta Go Fast', 2, 'Skip your next turn.', 'player', 1),
--    ('grand_larceny', 'Grand Larceny', 2, 'Steal all other players\u2019 \u201Cuse\u201D cards.', 'player', 0),
--    ('nope', 'NOPE', 2, 'Cancel the effect of any card. If used on a permanent card, it is removed from the game.', 'player', 0),
--    ('not_so_permanent', 'Not So Permanent', 2, 'All active permanent cards are shuffled back into the deck.', 'player', 0),
--    ('petty_theft', 'Petty Theft', 2, 'Steal one \u201Cuse\u201D card from any player. You may not see the cards you\u2019re choosing from.', 'player', 0),
--    ('teleportation', 'Teleportation', 2, 'Switch places with another player. If you have been ordered to do something, that player does it in your stead.', 'player', 0),
    ('to_the_loo', 'To the Loo', 2, 'Take a bathroom break. Your next three turns are skipped.', 'player', 3),

-- "Permanent" cards
    ('generosity', 'Generosity', 3, 'You must give away any \u2019Cuse\u2019D cards you have, with a smile. Cards must be given to other players in turns. If you forget to smile, take a sip.', 'all', -1),
    ('spidey_sense', 'Spidey Sense', 3, 'You can see the card on the top of the deck.', 'player', -1),

-- "Action"  cards
    ('daring', 'Daring', 4, 'Draw the next card. Its drinks shall be doubled.', 'all', 0),
    ('distracted', 'Distracted', 4, 'You are distracted and skip your next turn.', 'all', 1),
    ('greed', 'Greed', 4, 'Take all other players\u2019 permanent cards.', 'all', 0),
    ('magic', 'Magic', 4, 'Shuffle the deck and put this card at the bottom of the deck.', 'all', 0),
--    ('new_world_order', 'New World Order', 4, 'Switch places with another player. Both of you take a sip.', 'all', 0),
--    ('sacrifice', 'Sacrifice', 4, 'For every drink you finish, you may discard two permanent cards.', 'all', 0),
    ('too_many_cards', 'Too Many Cards', 4, 'The top two cards in the deck are discarded.', 'all', 0);
