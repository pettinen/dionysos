INSERT INTO "users" ("name", "password_hash") VALUES
    ('Doris', '$2b$12$Jc8RYDshkU.q8gOZRthJeOZWjj1.wnd0TKBdreYdPEcLqVg/iW2VO'),
    ('Jorma', '$2b$12$wOAO2PZv9A8X0Hq3fGsULO7sPbCTic.A33F394HXrPskyH5MS3Gz2'),
    ('Sisu', '$2b$12$tQshraLtl8zetRq7NLxbd.volWh0ewNzq1KrrEVNGwdxHz8fDIelW'),
    ('Tapio', '$2b$12$E.edrKOIweVm98KFlmgRL.zwfkZPQh1kP8PkFo180PTnQ8fFgkJgS'),
    ('Valdemar', '$2b$12$q8S0NpBFs63dcWBv2XlQDOT0DJinuiRI9o3kGIlN7RgRKjrjE5yia'),

    -- password: test
    ('<em>xss test</em>', '$2b$12$7GzpoWinejbOjBPMmsVmZesv6EA2iVQJPymV6vqV8sqoVQBqzTbS2');


INSERT INTO "card_types" ("id", "name", "base_url") VALUES
    ('act', 'Action', 'action.webp'),
    ('all', 'All', 'all.webp'),
    ('perm', 'Permanent', 'permanent.webp'),
    ('use', 'Use', 'use.webp');
