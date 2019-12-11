-- NOTES

-- Cards that require extra coding are at the bottom of the file.

-- The "duration" column specifies how many rounds a card is active.
-- Zero means the card has no lasting effect; -1 means the card stays permanently.

-- Unicode characters cheat sheet:
-- - en dash: U+2013
-- - apostrophe (single quote): U+2019
-- - double quotes: U+201C U+201D
-- - ellipsis: U+2026

-- "All" cards
INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration") VALUES
    ('roundabout', 'Roundabout', 1, 'Give your drink to the player on your right. Take a sip from the drink you received.', 'all', 0),
    ('big_bother', 'Big Bother', 1, 'If you have a big brother, take a sip. Otherwise take three sips.', 'all', 0),
    ('neet', 'NEET', 1, U&'If you don\2019t work, take two sips.', 'all', 0),
    ('gamers_rise_up', 'Gamers Rise Up', 1, U&'Take turns naming video games that you have played. Once someone can\2019t name a new one, they take four sips.', 'all', 0),
    ('chocolate_rain', 'Chocolate Rain', 1, 'Add something sweet (preferably chocolate) to your drink and take two sips.', 'all', 0),
    ('oktoberfest', 'Oktoberfest', 1, 'Everyone cheers and takes three sips.', 'all', 0),
    ('bad_breath', 'Bad Breath', 1, U&'If you haven\2019t brushed your teeth in 24 hours, take three sips.', 'all', 0),
    ('motherland', 'Motherland', 1, 'Respect the Motherland by taking a sip of vodka. True gopniki happily drink more.', 'all', 0),
    ('happy_hardcore', 'Happy Hardcore', 1, 'Play some happy hardcore as loud as possible. Empty your drink.', 'all', 0),
    ('fancy_dress', 'Fancy Dress', 1, 'The finest-dressed player takes three sips.', 'all', 0),
    ('finish_him', 'Finish Him!', 1, 'Split into two teams. Each team chooses a champion to a wrestling match. The losing team cheers the winners and takes three sips.', 'all', 0),
    ('dilution', 'Dilution', 1, 'Fill your drink with something non-alcoholic.', 'all', 0),
    ('double_trouble', 'Double Trouble', 1, 'The amounts of drinks in the next card shall be doubled.', 'all', 0),
    ('sophistication', 'Sophistication', 1, 'Listen to classical music and drink some wine. If both are not available, everyone takes two sips.', 'all', 0),
    ('yuletide', 'Yuletide', 1, 'In winter or fall take two sips. In summer or spring take four sips.', 'all', 0),
    ('companions', 'Companions', 1, U&'Take a sip for every pet you\2019ve ever owned (but no more than four sips).', 'all', 0),
    ('group_hug', 'Group Hug', 1, 'Have a group hug and take two sips from the drink of the player on your right.', 'all', 0),
    ('martial_law', 'Martial Law', 1, 'Martial law applies for the next three rounds. All actions must be completed, and protection cards are not effective.', 'all', 3),
    ('blackout', 'Blackout', 1, 'Turn off all lights for the next two turns.', 'all', 2),
    ('the_more_the_merrier', 'The More the Merrier', 1, 'Take as many sips as there are players.', 'all', 0),
    ('mix_and_mingle', 'Mix and Mingle', 1, U&'Mix all players\2019 drinks together and drink the delicious mixture.', 'all', 0),
    ('cant_be_this_cute', U&'Can\2019t Be This Cute', 1, 'If you have a little sister, take a sip. Otherwise take three sips.', 'all', 0),
    ('summertide', 'Summertide', 1, 'In summer or spring take two sips. In winter or fall take four sips.', 'all', 0),
    ('and_all_for_one', U&'\2026and All for One', 1, 'During the next round, when someone must drink, everyone drinks the same amount in sympathy.', 'all', 1),
    ('getting_moist', 'Getting Moist', 1, 'Wet your hair or finish your drink.', 'all', 0),
    ('hand_me_downs', 'Hand-Me-Downs', 1, 'Give a piece of clothing to another player.', 'all', 0),
    ('insomniac', 'Insomniac', 1, U&'If you didn\2019t sleep at least seven hours last night, take two sips.', 'all', 0),
    ('ice_cold', 'Ice Cold', 1, 'Add ice to your drink or cool it down some other way.', 'all', 0),
    ('spring_cleaning', 'Spring Cleaning', 1, 'Clear the table of drinks by finishing them!', 'all', 0),
    ('charitable', 'Charitable', 1, U&'If you haven\2019t given to charity in the past year, take two sips.', 'all', 0);

-- "Use" cards
INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration") VALUES
    ('ahead_of_schedule', 'Ahead of Schedule', 2, 'Pause the game. Decide the length of the pause with other players.', 'player', 0),
    ('asserting_dominance', 'Asserting Dominance', 2, 'Refuse to carry out any one action.', 'player', 0),
    ('challenge', 'Challenge', 2, U&'Challenge another player to arm-wrestling. The loser takes a sip from both players\2019 drinks.', 'player', 0),
    ('delegation', 'Delegation', 2, 'Order another player to carry out an action in your stead.', 'player', 0),
    ('honeymoon', 'Honeymoon', 2, 'Pick two players. During the next round they must talk to each other in a ridiculously sappy, mushy, lovey-dovey manner.', 'player', 1),
    ('kindness', 'Kindness', 2, U&'Protect yourself and up to two others from an \201Call\201D card.', 'player', 0),
    ('no_u', 'NO U', 2, U&'After someone draws an \201Cact\201D card, order them to carry out the card\2019s task themself.', 'player', 0),
    ('phoenix', 'Phoenix', 2, 'Fill the drink of another player.', 'player', 0),
    ('safe_space', 'Safe Space', 2, 'Protect yourself and the players next to you from any card.', 'player', 0),
    ('teetotal', 'Teetotal', 2, 'Switch your drink for a non-alcoholic beverage.', 'player', 0),
    ('thunderdome', 'Thunderdome', 2, 'Avoid all actions during the next round.', 'player', 1),
    ('white_knight', 'White Knight', 2, U&'Carry out another player\2019s task.', 'player', 0);

-- "Permanent" cards
INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration") VALUES
    ('cant_get_enough', U&'Can\2019t Get Enough', 3, 'Take a sip at the start of your every turn.', 'all', -1),
    ('cockatrice', 'Cockatrice', 3, 'You may not look anyone in the eyes. If you do, stay completely still until your next turn.', 'all', -1),
    ('deus_ex_machina', 'Deus Ex Machina', 3, 'The amounts of sips you must drink are halved! (Rounded up.)', 'all', -1),
    ('falsetto', 'Falsetto', 3, 'You must talk in a high-pitched voice. Take a sip if you forget to.', 'all', -1),
    ('fight_club', 'Fight Club', 3, 'You must keep your fists clenched. If you forget, take two sips.', 'all', -1),
    ('foul_mouth', 'Foul Mouth', 3, 'You may not swear. If you do, take two sips.', 'all', -1),
    ('gary', 'Gary!', 3, 'You are now known as Gary. Addressing you by any other name carries a punishment of three sips.', 'all', -1),
    ('hydra', 'Hydra', 3, 'You must touch some part of three other players at all times. If you get separated, you may discard this card but all four players must take four sips.', 'all', -1),
    ('lawmaker', 'Lawmaker', 3, 'You may add a new rule to the game. Remember to set a punishment for breaking the rule.', 'all', -1),
    ('methanol', 'Methanol', 3 , 'Keep your eyes shut or covered. If you forget, take two sips.', 'all', -1),
    ('my_lips_are_sealed', 'My Lips Are Sealed', 3, 'You may not speak unless spoken to. If you do, take two sips.', 'all', -1),
    ('rhyme_and_reason', 'Rhyme and Reason', 3, U&'You must speak in rhyme. Like, all the time. If your rhyme\2019s a disappointment, two sips shall be your punishment.', 'all', -1),
    ('servants', 'Servants', 3, 'Other players shall give you your drinks. You may not touch your drink yourself.', 'all', -1),
    ('super_serious', 'Super Serious', 3, 'Take a sip whenever you laugh.', 'all', -1),
    ('wingman', 'Wingman', 3, 'You are affected by all permanent cards of the player on your left.', 'all', -1),
    ('your_next_pose_will_be', U&'Your Next Pose Will Be\2026', 3, 'On your every turn strike a pose and keep it until your next turn.', 'all', -1);

-- "Action" cards
INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration") VALUES
    ('alcoholic', 'Alcoholic', 4, 'Finish your drink. Because why not?', 'all', 0),
    ('anything_you_can_do', U&'Anything You Can Do\2026', 4, U&'Pick a player. They must do something that you must then imitate. If you succeed, they take three sips. If you don\2019t, take three sips yourself.', 'all', 0),
    ('armored', 'Armored', 4, U&'For the next two rounds, you are protected from cards that you didn\2019t draw.', 'all', 2),
    ('bad_touch', 'Bad Touch', 4, 'Let anyone who wants to slap your ass. Alternatively finish your drink.', 'all', 0),
    ('curses', 'Curses!', 4, 'You are cursed! Take a sip now and at the start of your next two turns.', 'all', 2),
    ('deadline', 'Deadline', 4, 'Finish your drink in ten seconds. If you fail, take three additional sips.', 'all', 0),
    ('dragonborn', 'Dragonborn', 4, 'Let the player on your right spice up your drink.', 'all', 0),
    ('experimental_formula', 'Experimental Formula', 4, 'Add milk and salt to taste to your drink. Enjoy.', 'all', 0),
    ('fashion_show', 'Fashion Show', 4, 'Perform a proper catwalk. Others take a sip.', 'all', 0),
    ('fetch_boy', 'Fetch, Boy!', 4, 'Throw something. Tell everyone that whoever brings it back to you will not have to take three sips. Laugh (and drink along).', 'player', 0),
    ('high_five', 'High Five', 4, 'High five with another player. Everyone else takes a sip.', 'all', 0),
    ('honesty', 'Honesty', 4, 'Pick a player who will ask you a question. Answer truthfully or finish your drink.', 'all', 0),
    ('hug_or_chug', 'Hug or Chug', 4, 'Hug every other player or finish your drink.', 'all', 0),
    ('loyalty', 'Loyalty', 4, 'Pick a player. The next time they have to finish their drink, drink half of it in their stead.', 'all', 0),
    ('matchmaker', 'Matchmaker', 4, 'Order two players to kiss. If they do, take four sips. If they do not, they take three sips each.', 'all', 0),
    ('mimic', 'Mimic', 4, U&'Imitate another player. Others rate your act on a scale of 0\20135. The imitated player takes a sip for every five points.', 'all', 0),
    ('monarch', 'Monarch', 4, 'You are the King or Queen of the game. Everyone else toasts in your honor and finishes their drink.', 'all', 0),
    ('one_for_all', 'One for All?', 4, 'Either take five sips or order everyone else to take two sips.', 'all', 0),
    ('party_of_one', 'Party of One', 4, 'Go sit in the corner of the room until your next turn. Take three sips.', 'all', 0),
    ('push_up_or_shup_up', 'Push Up, or Shut Up!', 4, U&'Order a player to perform ten push-ups. If they succeed, take a sip. If they don\2019t, they take three sips.', 'all', 0),
    ('slaver', 'Slaver', 4, 'Choose a slave. For the next three turns they have to carry out actions in your stead.', 'all', 3),
    ('special_eyes', 'Special Eyes', 4, U&'Challenge another player to a staring contest. The loser takes three sips from the winner\2019s drink.', 'all', 0),
    ('stand_up', 'Stand-Up', 4, 'Try to make others laugh. Everyone who laughs takes two sips. If no-one does, take four sips yourself.', 'player', 0),
    ('switcheroo', 'Switcheroo', 4, 'You may switch drinks with another player. Alternatively take two sips.', 'all', 0),
    ('take_a_letter', 'Take a Letter', 4, 'Dictate a short letter to another player. If they are able to repeat it, word for word, take two sips. If not, they take a sip.', 'all', 0),
    ('waterfall', 'Waterfall', 4, 'Pick an opponent. Both fill their drinks and empty them on the count of three. The faster player may add a new rule to the game.', 'all', 0);


-- Cards that require extra coding (altering turn order, drawing extra cards, moving cards between players, etc.)

INSERT INTO "cards" ("text_id", "name", "type", "text", "visibility", "duration") VALUES
-- "All" cards
    ('chaos', 'Chaos', 1, U&'The direction of the game is reversed. All players\2019 permanent and \201Cuse\201D cards are shuffled and dealt to all players.', 'all', 0),
    ('missed_opportunities', 'Missed Opportunities', 1, U&'All \201Cuse\201D cards in players\2019 hands are shuffled back into the deck. Their owners must take one sip per card.', 'all', 0),
    ('revolution', 'Revolution', 1, 'Everyone gives their permanent cards to the player next in turn from them.', 'all', 0),
-- "Use" cards
    ('artist', 'Artist', 2, 'Take a creative break and skip your next five turns.', 'player', 5),
    ('cleanup', 'Cleanup', 2, 'You may discard any active permanent cards.', 'player', 0),
    ('donor', 'Donor', 2, 'Search the deck for a card and give it to any other player.', 'player', 0),
    ('gotta_go_fast', 'Gotta Go Fast', 2, 'Skip your next turn.', 'player', 1),
    ('grand_larceny', 'Grand Larceny', 2, U&'Steal all other players\2019 \201Cuse\201D cards.', 'player', 0),
    ('nope', 'NOPE', 2, 'Cancel the effect of any card. If used on a permanent card, it is removed from the game.', 'player', 0),
    ('not_so_permanent', 'Not So Permanent', 2, 'All active permanent cards are shuffled back into the deck.', 'player', 0),
    ('petty_theft', 'Petty Theft', 2, U&'Steal one \201Cuse\201D card from any player. You may not see the cards you\2019re choosing from.', 'player', 0),
    ('teleportation', 'Teleportation', 2, 'Switch places with another player. If you have been ordered to do something, that player does it in your stead.', 'player', 0),
    ('to_the_loo', 'To the Loo', 2, 'Take a bathroom break. Your next three turns are skipped.', 'player', 3),
    ('tyrant', 'Tyrant', 2, 'Order another player to double their drinks for the next two rounds.', 'player', 2),
-- "Permanent" cards
    ('generosity', 'Generosity', 3, U&'You must give away any \201Cuse\201D cards you have, with a smile. Cards must be given to other players in turns. If you forget to smile, take a sip.', 'all', -1),
    ('spidey_sense', 'Spidey Sense', 3, 'You can see the card on the top of the deck.', 'player', -1),
-- "Action"  cards
    ('daring', 'Daring', 4, 'Draw the next card. Its drinks shall be doubled.', 'all', 0),
    ('distracted', 'Distracted', 4, 'You are distracted and skip your next turn.', 'all', 1),
    ('greed', 'Greed', 4, U&'Take all other players\2019 permanent cards.', 'all', 0),
    ('magic', 'Magic', 4, 'Shuffle the deck and put this card at the bottom of the deck.', 'all', 0),
    ('new_world_order', 'New World Order', 4, 'Switch places with another player. Both of you take a sip.', 'all', 0),
    ('sacrifice', 'Sacrifice', 4, 'For every drink you finish, you may discard two permanent cards.', 'all', 0),
    ('too_many_cards', 'Too Many Cards', 4, 'The top two cards in the deck are discarded.', 'all', 0);
