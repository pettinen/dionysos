INSERT INTO "users" ("name", "password_hash") VALUES
    ('Doris', '$argon2id$v=19$m=102400,t=2,p=8$RFtf9E1wyJMB1qXa5FLLUQ$bCcyhidFeTDEb0wq0akrng'),
    ('Jorma', '$argon2id$v=19$m=102400,t=2,p=8$xZj45emcU4VzIia2Nr0mfA$wIKJAkkEyms2jnyHawd8rw'),
    ('Sisu', '$argon2id$v=19$m=102400,t=2,p=8$8qtiF8xZp0zRuqRPTCWHKA$vOQ2LZhB2YacJThNbdO/Pg'),
    ('Tapio', '$argon2id$v=19$m=102400,t=2,p=8$rO3njVKyfqp/pEq2IMLMNw$duqwyBO/mxBDFqmGNfbMaA'),
    ('Valdemar', '$argon2id$v=19$m=102400,t=2,p=8$MnkE8PEKjDfCGPl1oharoA$rgsO5347kzWcooJeNCmtwg'),

    -- password: test
    ('<em>xss test</em>', '$argon2id$v=19$m=102400,t=2,p=8$dvVz/ADWNiXJYn43JlOY2w$38WrL6XAm6UcBiKAONlLTQ');


INSERT INTO "card_types" ("id", "name", "base_url") VALUES
    ('act', 'Action', 'action.webp'),
    ('all', 'All', 'all.webp'),
    ('perm', 'Permanent', 'permanent.webp'),
    ('use', 'Use', 'use.webp');
