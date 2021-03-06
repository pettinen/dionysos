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
INSERT INTO "all_cards" ("text_id", "name", "type", "text", "visibility", "duration", "remote") VALUES
    ('and_all_for_one', U&'\2026and All for One', 'all', 'During the next round, when someone must drink, everyone drinks the same amount in sympathy.', 'all', 1, true),
    ('bad_breath', 'Bad Breath', 'all', U&'If you haven\2019t brushed your teeth in 24 hours, take three sips.', 'all', 0, true),
    ('big_bother', 'Big Bother', 'all', 'If you have a big brother, take a sip. Otherwise take three sips.', 'all', 0, true),
    ('blackout', 'Blackout', 'all', 'Turn off all lights for the next two rounds.', 'all', 2, true),
    ('cant_be_this_cute', U&'Can\2019t Be This Cute', 'all', 'If you have a little sister, take a sip. Otherwise take three sips.', 'all', 0, true),
    ('charitable', 'Charitable', 'all', U&'If you haven\2019t given to charity in the past year, take two sips.', 'all', 0, true),
    ('chocolate_rain', 'Chocolate Rain', 'all', 'Add something sweet (preferably chocolate) to your drink and take two sips.', 'all', 0, true),
    ('companions', 'Companions', 'all', U&'Take a sip for every pet you\2019ve ever owned (but no more than four sips).', 'all', 0, true),
    ('dilution', 'Dilution', 'all', 'Fill your drink with something non-alcoholic.', 'all', 0, true),
    ('double_trouble', 'Double Trouble', 'all', 'The amounts of drinks in the next card shall be doubled.', 'all', 0, true),
    ('fancy_dress', 'Fancy Dress', 'all', 'The finest-dressed player takes three sips.', 'all', 0, false),
    ('finish_him', 'Finish Him!', 'all', 'Split into two teams. Each team chooses a champion to a wrestling match. The losing team cheers the winners and takes three sips.', 'all', 0, false),
    ('gamers_rise_up', 'Gamers Rise Up', 'all', U&'Take turns naming video games that you have played. Once someone can\2019t name a new one, they take four sips.', 'all', 0, true),
    ('group_hug', 'Group Hug', 'all', 'Have a group hug and take two sips from the drink of the player on your right.', 'all', 0, false),
    ('hand_me_downs', 'Hand-Me-Downs', 'all', 'Give a piece of clothing to another player.', 'all', 0, false),
    ('happy_hardcore', 'Happy Hardcore', 'all', 'Play some happy hardcore as loud as possible. Empty your drink.', 'all', 0, true),
    ('i_get_wet', 'I Get Wet', 'all', 'Wet your hair or finish your drink.', 'all', 0, true),
    ('ice_cold', 'Ice Cold', 'all', 'Add ice to your drink or cool it down some other way.', 'all', 0, true),
    ('insomniac', 'Insomniac', 'all', U&'If you didn\2019t sleep at least seven hours last night, take two sips.', 'all', 0, true),
    ('martial_law', 'Martial Law', 'all', 'Martial law applies for the next three rounds. All actions must be completed, and protection cards are not effective.', 'all', 3, true),
    ('mix_and_mingle', 'Mix and Mingle', 'all', U&'Mix all players\2019 drinks together and drink the delicious mixture.', 'all', 0, false),
    ('motherland', 'Motherland', 'all', 'Respect the Motherland by taking a sip of vodka. True gopniki happily drink more.', 'all', 0, true),
    ('neet', 'NEET', 'all', U&'If you don\2019t work, take two sips.', 'all', 0, true),
    ('oktoberfest', 'Oktoberfest', 'all', 'Everyone cheers and takes three sips.', 'all', 0, true),
    ('roundabout', 'Roundabout', 'all', 'Give your drink to the player on your right. Take a sip from the drink you received.', 'all', 0, false),
    ('sophistication', 'Sophistication', 'all', 'Listen to classical music and drink some wine. If both are not available, everyone takes two sips.', 'all', 0, true),
    ('spring_cleaning', 'Spring Cleaning', 'all', 'Clear the table of drinks by finishing them!', 'all', 0, true),
    ('summertide', 'Summertide', 'all', 'In summer or spring take two sips. In winter or fall take four sips.', 'all', 0, true),
    ('the_more_the_merrier', 'The More the Merrier', 'all', 'Take as many sips as there are players.', 'all', 0, true),
    ('yuletide', 'Yuletide', 'all', 'In winter or fall take two sips. In summer or spring take four sips.', 'all', 0, true),

-- "Use" cards
    ('ahead_of_schedule', 'Ahead of Schedule', 'use', 'Pause the game. Decide the length of the pause with other players.', 'player', 0, true),
    ('asserting_dominance', 'Asserting Dominance', 'use', 'Refuse to carry out any one action.', 'player', 0, true),
    ('challenge', 'Challenge', 'use', U&'Challenge another player to arm-wrestling. The loser takes a sip from both players\2019 drinks.', 'player', 0, false),
    ('delegation', 'Delegation', 'use', 'Order another player to carry out an action in your stead.', 'player', 0, true),
    ('honeymoon', 'Honeymoon', 'use', 'Pick two players. During the next round they must talk to each other in a ridiculously sappy, mushy, lovey-dovey manner.', 'player', 1, true),
    ('kindness', 'Kindness', 'use', U&'Protect yourself and up to two others from an \201Call\201D card.', 'player', 0, true),
    ('no_u', 'NO U', 'use', U&'After someone draws an \201Cact\201D card, order them to carry out the card\2019s task themself.', 'player', 0, true),
    ('phoenix', 'Phoenix', 'use', 'Fill the drink of another player.', 'player', 0, false),
    ('safe_space', 'Safe Space', 'use', 'Protect yourself and the players next to you from any card.', 'player', 0, true),
    ('teetotal', 'Teetotal', 'use', 'Switch your drink for a non-alcoholic beverage.', 'player', 0, true),
    ('thunderdome', 'Thunderdome', 'use', 'Avoid all actions during the next round.', 'player', 1, true),
    ('white_knight', 'White Knight', 'use', U&'Carry out another player\2019s task.', 'player', 0, true),

-- "Permanent" cards
    ('cant_get_enough', U&'Can\2019t Get Enough', 'perm', 'Take a sip at the start of your every turn.', 'all', -1, true),
    ('cockatrice', 'Cockatrice', 'perm', 'You may not look anyone in the eyes. If you do, stay completely still until your next turn.', 'all', -1, false),
    ('deus_ex_machina', 'Deus Ex Machina', 'perm', 'The amounts of sips you must drink are halved! (Rounded up.)', 'all', -1, true),
    ('dictator', 'Dictator', 'perm', 'You may add a new rule to the game. Remember to set a punishment for breaking the rule.', 'all', -1, true),
    ('falsetto', 'Falsetto', 'perm', 'You must talk in a high-pitched voice. Take a sip if you forget to.', 'all', -1, true),
    ('fight_club', 'Fight Club', 'perm', 'You must keep your fists clenched. If you forget, take two sips.', 'all', -1, false),
    ('foul_mouth', 'Foul Mouth', 'perm', 'You may not swear. If you do, take two sips.', 'all', -1, true),
    ('gary', 'Gary!', 'perm', 'You are now known as Gary. Addressing you by any other name carries a punishment of three sips.', 'all', -1, true),
    ('hydra', 'Hydra', 'perm', 'You must touch some part of three other players at all times. If you get separated, you may discard this card but all four players must take four sips.', 'all', -1, false),
    ('methanol', 'Methanol', 'perm' , 'Keep your eyes shut or covered. If you forget, take two sips.', 'all', -1, false),
    ('my_lips_are_sealed', 'My Lips Are Sealed', 'perm', 'You may not speak unless spoken to. If you do, take two sips.', 'all', -1, true),
    ('rhyme_and_reason', 'Rhyme and Reason', 'perm', U&'You must speak in rhyme. Like, all the time. If your rhyme\2019s a disappointment, two sips shall be your punishment.', 'all', -1, true),
    ('servants', 'Servants', 'perm', 'Other players shall give you your drinks. You may not touch your drink yourself.', 'all', -1, false),
    ('super_serious', 'Super Serious', 'perm', 'Take a sip whenever you laugh.', 'all', -1, true),
    ('wingman', 'Wingman', 'perm', 'You are affected by all permanent cards of the player in turn before you.', 'all', -1, true),
    ('your_next_pose_will_be', U&'Your Next Pose Will Be\2026', 'perm', 'On your every turn strike a pose and keep it until your next turn.', 'all', -1, false),

-- "Action" cards
    ('alcoholic', 'Alcoholic', 'act', 'Finish your drink. Because why not?', 'all', 0, true),
    ('anything_you_can_do', U&'Anything You Can Do\2026', 'act', U&'Pick a player. They must do something that you must then imitate. If you succeed, they take three sips. If you don\2019t, take three sips yourself.', 'all', 0, false),
    ('armored', 'Armored', 'act', U&'For the next two rounds, you are protected from cards that you didn\2019t draw.', 'all', 2, true),
    ('bad_touch', 'Bad Touch', 'act', 'Let anyone who wants to slap your ass. Alternatively finish your drink.', 'all', 0, false),
    ('curses', 'Curses!', 'act', 'You are cursed! Take a sip now and at the start of your next two turns.', 'all', 2, true),
    ('deadline', 'Deadline', 'act', 'Finish your drink in ten seconds. If you fail, take three additional sips.', 'all', 0, true),
    ('dragonborn', 'Dragonborn', 'act', 'Let the player on your right spice up your drink.', 'all', 0, false),
    ('experimental_formula', 'Experimental Formula', 'act', 'Add milk and salt to taste to your drink. Enjoy.', 'all', 0, true),
    ('fashion_show', 'Fashion Show', 'act', 'Perform a proper catwalk. Others take a sip.', 'all', 0, false),
    ('fetch_boy', 'Fetch, Boy!', 'act', 'Throw something. Tell everyone that whoever brings it back to you will not have to take three sips. Laugh (and drink along).', 'player', 0, false),
    ('high_five', 'High Five', 'act', 'High five with another player. Everyone else takes a sip.', 'all', 0, false),
    ('honesty', 'Honesty', 'act', 'Pick a player who will ask you a question. Answer truthfully or finish your drink.', 'all', 0, true),
    ('hug_or_chug', 'Hug or Chug', 'act', 'Hug every other player or finish your drink.', 'all', 0, false),
    ('loyalty', 'Loyalty', 'act', 'Pick a player. The next time they have to finish their drink, drink half of it in their stead.', 'all', 0, false),
    ('mimic', 'Mimic', 'act', U&'Imitate another player. Others rate your act on a scale of 0\20135. The imitated player takes a sip for every five points.', 'all', 0, true),
    ('monarch', 'Monarch', 'act', 'You are the Queen or King of the game. Everyone else toasts in your honor and finishes their drink.', 'all', 0, true),
    ('one_for_all', 'One for All?', 'act', 'Either take five sips or order everyone else to take two sips.', 'all', 0, true),
    ('party_of_one', 'Party of One', 'act', 'Go sit in the corner of the room until your next turn. Take three sips.', 'all', 0, true),
    ('push_up_or_shup_up', 'Push Up, or Shut Up!', 'act', U&'Order a player to perform ten push-ups. If they succeed, take a sip. If they don\2019t, they take three sips.', 'all', 0, false),
    ('slaver', 'Slaver', 'act', 'Choose a slave. For the next three turns they have to carry out actions in your stead.', 'all', 3, true),
    ('special_eyes', 'Special Eyes', 'act', U&'Challenge another player to a staring contest. The loser takes three sips from the winner\2019s drink.', 'all', 0, false),
    ('stand_up', 'Stand-Up', 'act', 'Try to make others laugh. Everyone who laughs takes two sips. If no-one does, take four sips yourself.', 'player', 0, true),
    ('switcheroo', 'Switcheroo', 'act', 'You may switch drinks with another player. Alternatively take two sips.', 'all', 0, false),
    ('take_a_letter', 'Take a Letter', 'act', 'Dictate a short letter to another player. If they are able to repeat it, word for word, take two sips. If not, they take a sip.', 'all', 0, true),
    ('waterfall', 'Waterfall', 'act', 'Pick an opponent. Both fill their drinks and empty them on the count of three. The faster player may add a new rule to the game.', 'all', 0, false);


-- Cards that require extra coding (altering turn order, drawing extra cards, moving cards between players, etc.).
-- Unimplemented ones are commented out.

INSERT INTO "all_cards" ("text_id", "name", "type", "text", "visibility", "duration", "remote") VALUES
-- "All" cards
    --('chaos', 'Chaos', 'all', U&'The direction of the game is reversed. All players\2019 permanent and \201Cuse\201D cards are shuffled and dealt to all players.', 'all', 0, true),
    --('missed_opportunities', 'Missed Opportunities', 'all', U&'All \201Cuse\201D cards in players\2019 hands are shuffled back into the deck. Their owners must take one sip per card.', 'all', 0, true),
    --('revolution', 'Revolution', 'all', 'Everyone gives their permanent cards to the player next in turn from them.', 'all', 0, true),
-- "Use" cards
    ('artist', 'Artist', 'use', 'Take a creative break and skip your next five turns.', 'player', 5, true),
    --('cleanup', 'Cleanup', 'use', 'You may discard any active permanent cards.', 'player', 0, true),
    --('donor', 'Donor', 'use', 'Search the deck for a card and give it to any other player.', 'player', 0, true),
    ('gotta_go_fast', 'Gotta Go Fast', 'use', 'Skip your next turn.', 'player', 1, true),
    --('grand_larceny', 'Grand Larceny', 'use', U&'Steal all other players\2019 \201Cuse\201D cards.', 'player', 0, true),
    --('nope', 'NOPE', 'use', 'Cancel the effect of any card. If used on a permanent card, it is removed from the game.', 'player', 0, true),
    --('not_so_permanent', 'Not So Permanent', 'use', 'All active permanent cards are shuffled back into the deck.', 'player', 0, true),
    --('petty_theft', 'Petty Theft', 'use', U&'Steal one \201Cuse\201D card from any player. You may not see the cards you\2019re choosing from.', 'player', 0, true),
    --('teleportation', 'Teleportation', 'use', 'Switch places with another player. If you have been ordered to do something, that player does it in your stead.', 'player', 0, true),
    ('to_the_loo', 'To the Loo', 'use', 'Take a bathroom break. Your next three turns are skipped.', 'player', 3, true),
    --('tyrant', 'Tyrant', 'use', 'Order another player to double their drinks for the next two rounds.', 'player', 2, true),
-- "Permanent" cards
    ('generosity', 'Generosity', 'perm', U&'You must give away any \201Cuse\201D cards you have, with a smile. Cards must be given to other players in turns. If you forget to smile, take a sip.', 'all', -1, false),
    --('spidey_sense', 'Spidey Sense', 'perm', 'You can see the card on the top of the deck.', 'player', -1, true),
-- "Action"  cards
    ('daring', 'Daring', 'act', 'Draw the next card. Its drinks shall be doubled.', 'all', 0, true),
    ('distracted', 'Distracted', 'act', 'You are distracted and skip your next turn.', 'all', 1, true),
    ('greed', 'Greed', 'act', U&'Take all other players\2019 permanent cards.', 'all', 0, true),
    ('magic', 'Magic', 'act', 'Shuffle the deck and put this card at the bottom of the deck.', 'all', 0, true),
    --('new_world_order', 'New World Order', 'act', 'Switch places with another player. Both of you take a sip.', 'all', 0, true),
    --('sacrifice', 'Sacrifice', 'act', 'For every drink you finish, you may discard two permanent cards.', 'all', 0, true),
    ('too_many_cards', 'Too Many Cards', 'act', 'The top two cards in the deck are discarded.', 'all', 0, true);
