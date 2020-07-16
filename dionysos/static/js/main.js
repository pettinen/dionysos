jQuery($ => {
    'use strict';

    const app = dionysos;
    const socket = io({
        path: '/socket'
    });

    const getMessage = function(messageID) {
        if (app.messages[app.language].has(messageID))
            return app.messages[app.language].get(messageID);
        log(`Unknown message ID: ${messageID}`);
        return messageID;
    };
    const showMessage = function(...messages) {
        messages.forEach(message => console.log(message));
    };
    const gameLog = function(...messages) {
        currentGame.gameLog.push(...messages);
    };
    const showDebugMessage = function(message = '') {
        if (message)
            message = ` (${reason})`;
        showMessage(`Unexpected error${reason}. If your game is broken or you have`
            + ` more information about this bug, please contact ${app.config.adminEmail}`);
    };
    const log = console.log;
    const showMessages = function(messages) {
        messages.forEach(msg => showMessage(msg));
    };

    socket.on('connect', () => {
        settings.connected(true);
        showMessage('connected');
    });
    socket.on('connect_error', error => {
        showMessage('connection-error');
        console.log("Socket.IO connection error:", error);
    });
    socket.on('error', error => {
        log("Socket.IO error:", error)
    });
    socket.on('disconnect', () => {
        settings.connected(false);
        showMessage('disconnected');
    });


    const afterGamesListLoaded = function() {
        if (app.initialGame !== null) {
            const gameID = Number(app.initialGame);
            if (Number.isNaN(gameID)) {
                showMessage('invalid-game-id');
                replaceURL(null);
                return;
            }
            const game = gamesList.game(gameID);
            if (game === null) {
                showMessage('invalid-game-id');
                replaceURL(null);
                return;
            }
            if (!settings.user()) {
                showMessage('log-in');
                replaceURL(null);
                return;
            }
            game.tryJoin();
        }
    };

    const applyBindings = function(viewModel, jQueryObject) {
        jQueryObject.each(function() {
            ko.applyBindings(viewModel, this);
        });
    };

    const csrfCookie = function() {
        return Cookies.get(app.config.csrfCookie);
    };

    const csrf = function(data = {}) {
        const csrfToken = csrfCookie();
        if (csrfToken)
            data[app.config.csrfDataKey] = csrfToken;
        return data;
    };

    const emit = function(event, data, ...args) {
        socket.emit(event, csrf(data), ...args);
    };

    const escapeHTML = function(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    };

    const replaceURL = function(gameID) {
        if (gameID === null)
            history.replaceState({gameID: null}, 'Lobby', '/');
        else
            history.replaceState({gameID: gameID}, `Game ${gameID}`, app.paths.game(gameID));
    };


    class Game {
        constructor(data) {
            for (const property of ['id', 'name', 'creator', 'maxPlayers', 'passwordProtected'])
                this[property] = data[property];
            for (const property of ['playerCount', 'started', 'ended'])
                this[property] = ko.observable(data[property]);
            this.full = ko.pureComputed(() => this.playerCount() >= this.maxPlayers);
            this.canJoin = ko.pureComputed(
                () => !this.full() && settings.user() && !currentGame.inGame());
        }

        join(password = '') {
            const data = {id: this.id};
            if (this.passwordProtected) {
                if (typeof password !== 'string' || !password.trim()) {
                    showMessage('password-required');
                    return;
                }
                password = password.trim();
                data.password = password;
                console.log(`Attempting to join game ${this.id} with password '${password}'`);
            } else {
                console.log(`Attempting to join game ${this.id}`);
            }
            emit('join-game', data, response => {
                if (response.success) {
                    currentGame.clear();
                    currentGame.game(this);
                    currentGame.players.push(...response.players.map(player => new User(player)));
                    replaceURL(this.id);
                    
                    if (localStorage.getItem(`game-${this.id}-password`) !== null) {
                        log("Password found in localStorage");
                        localStorage.setItem(`game-${this.id}-password`, password.trim());
                    }
                    gamesList.passwordPrompt(null);
                    showMessage('game-joined-self');
                } else {
                    showMessage(response.reason);
                }
            });
        }

        tryJoin() {
            if (this.passwordProtected) {
                const storedPassword = localStorage.getItem(`game-${this.id}-password`);
                if (storedPassword === null) {
                    gamesList.passwordPrompt(this.id);
                } else {
                    log("Password found in localStorage");
                    this.join(storedPassword);
                }
            } else {
                this.join();
            }
        }
    }


    class User {
        constructor(data) {
            for (const property of ['id', 'name'])
                this[property] = data[property];
        }
    }


    class SettingsViewModel {
        constructor(user) {
            this.user = ko.observable(
                (user === null) ? null : new User(user));
            this.username = ko.observable('');
            this.password = ko.observable('');
            this.connected = ko.observable(false);
        }

        login() {
            const errors = [];
            const csrfToken = csrfCookie();
            if (!csrfToken)
                errors.push('error-refresh');
            if (typeof this.username() !== 'string' || !this.username().trim())
                errors.push('empty-username');
            if (typeof this.password() !== 'string' || !this.password().trim())
                errors.push('empty-password');
            if (errors.length) {
                showMessages(errors);
                return;
            }

            const requestBody = {
                username: this.username().trim(),
                password: this.password().trim()
            };
            fetch(app.paths.login, {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: {
                    'Content-Type': 'application/json',
                    [app.config.csrfHeader]: csrfToken
                }
            })
            .then(response => response.json())
            .then(response => {
                if (response.success) {
                    this.user(new User(response.user));
                    // Reconnect to set auth cookies for socket
                    socket.close().open();
                    showMessage('logged-in');
                    if (!gamesList.newGame.name())
                        gamesList.newGame.name(`${this.user().name}\u2019s game`);
                } else {
                    console.log("Login failed:", response);
                    showMessage(response.reason);
                }
            });
        }

        logout() {
            const csrfToken = csrfCookie();
            if (!csrfToken) {
                showMessage('error-refresh');
                return;
            }
            fetch(app.paths.logout, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [app.config.csrfHeader]: csrfToken
                }
            })
            .then(response => response.json())
            .then(response => {
                if (response.success) {
                    currentGame.leave();
                    this.user(null);
                    replaceURL(null);
                    // Reconnect to set auth cookies for socket
                    socket.close().open();
                    showMessage('logged-out');
                } else {
                    console.log("Logout failed:", response);
                    showMessage(response.reason);
                }
            });
        }

        register() {
            const csrfToken = csrfCookie();
            if (!csrfToken) {
                log("Missing CSRF token when registering");
                showMessage('error-refresh');
                return;
            }
            const errors = [];
            if (typeof this.username() !== 'string' || !this.username().trim())
                errors.push('empty-username');
            if (typeof this.password() !== 'string'
                    || this.password().trim().length < app.config.passwordMinLength)
                errors.push('password-too-short');
            if (errors.length) {
                showMessages(errors);
                return;
            }

            const requestBody = {
                username: this.username().trim(),
                password: this.password().trim()
            };

            fetch(app.paths.register, {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: {
                    'Content-Type': 'application/json',
                    [app.config.csrfHeader]: csrfToken
                }
            })
            .then(response => response.json())
            .then(response => {
                if (response.success) {
                    this.user(new User(response.user));
                    // Reconnect to set auth cookies for socket
                    socket.close().open();
                    showMessage('registered');
                } else {
                    showMessage(response.reason);
                }
            });
        }
    }

    const settings = new SettingsViewModel(app.initialUser);
    applyBindings(settings, $('#settings'));


    class CurrentGameViewModel {
        constructor() {
            this.game = ko.observable(null);
            this.gameLog = ko.observableArray(['ayy', 'lmao']);
            this.activeCardsMap = new Map();
            this.useCards = ko.observableArray();
            this.players = ko.observableArray();
            this.currentPlayer = ko.observable(null);
            this.lastCard = ko.observable(null);
            this.inGame = ko.pureComputed(() => Boolean(this.game()));

            this.isCreator = ko.pureComputed(() => {
                return this.game() && settings.user() && this.game().creator.id === settings.user().id;
            });
            this.inProgress = ko.pureComputed(() => {
                return this.game() && this.game().started() && !this.game().ended();
            });
            this.canDraw = ko.pureComputed(() => {
                return this.inProgress() && this.currentPlayer()
                    && this.currentPlayer().id === settings.user().id;
            });
            this.canStart = ko.pureComputed(() => {
                return this.game() && !this.game().started() && !this.game().ended() && this.isCreator()
                    && this.players().length >= app.config.minPlayersToStart;
            });
            this.url = ko.pureComputed(() => {
                if (this.game() === null)
                    return app.paths.index;
                return app.paths.game(this.game().id);
            });
        }

        activeCards(userID) {
            if (!this.activeCardsMap.has(userID))
                this.activeCardsMap.set(userID, ko.observableArray());
            return this.activeCardsMap.get(userID);
        }

        cardImgURL = filename => `${app.paths.cardImgDir}${filename}`;
        cardBaseURL = filename => `${app.paths.cardBaseDir}${filename}`;

        clear() {
            this.game(null);
            this.activeCardsMap.clear();
            this.useCards.removeAll();
            this.players.removeAll();
            this.currentPlayer(null);
            this.lastCard(null);
        }

        drawCard() {
            if (!this.inGame()) {
                showMessage('not-in-game');
                return;
            }
            if (!this.canDraw()) {
                showMessage('not-in-turn');
                return;
            }
            emit('draw-card', {}, response => {
                if (response.success) {
                    const card = cards.get(response.id);
                    if (!card) {
                        log('invalid-card', 'draw-card');
                        return;
                    }
                    this.lastCard(card);
                    showMessage('card-drawn-self', card);
                } else {
                    showMessage(response.reason);
                }
            });
        }

        leave() {
            if (!this.inGame()) {
                showMessage('not-in-game');
                return;
            }
            const gameID = this.game().id;
            this.clear();
            emit('leave-game', {id: gameID}, response => {
                if (!response) {
                    showMessage('connection-problem');
                } else if (response.success) {
                    this.clear();
                    replaceURL(null);
                    showMessage('game-left-self');
                } else {
                    showMessage(response.reason);
                }
            });
        }

        player(id) {
            return this.players().find(player => id === player.id) || null;
        }

        on(event, callback) {
            socket.on(event, (...args) => {
                if (this.game() !== null)
                    callback(...args);
            });
        }

        start() {
            if (!this.inGame()) {
                showMessage('not-in-game');
                return;
            }
            const errors = [];
            if (this.game().started())
                errors.push('game-already-started');
            if (this.game().creator.id !== settings.user().id)
                errors.push('not-creator');
            if (errors.length > 0) {
                showMessages(errors);
                return;
            }
            emit('start-game', {id: this.game().id}, response => {
                if (response.success) {
                    if (this.game() === null) {
                        log("Tried to start a nonexistent game");
                    } else {
                        this.game().started(true);
                        showMessage('game-started');
                    }
                } else {
                    showMessage(response.reason);
                }
            });
        }
    }
    const currentGame = new CurrentGameViewModel();
    applyBindings(currentGame, $('#current-game'));


    class GamesListViewModel {
        constructor() {
            this.games = ko.observableArray([]);
            this.newGame = {
                name: ko.observable(app.initialUser ? `${app.initialUser.name}\u2019s game` : ''),
                password: ko.observable(''),
                maxPlayers: ko.observable(app.config.maxPlayersDefault)
            };
            this.ownGamesMaxed = ko.pureComputed(() => {
                if (!settings.user())
                    return true;
                const count = this.games().filter(game => game.creator.id === settings.user().id).length;
                return count >= app.config.maxCreatedGames;
            });
            this.joinableGames = ko.pureComputed(() => {
                return this.games().filter(game => !game.started());
            });
            this.canCreateGame = ko.pureComputed(() => !this.ownGamesMaxed() && !currentGame.inGame());
            this.gamePassword = ko.observable('');
            this.passwordPrompt = ko.observable(null);
            this.visible = ko.pureComputed(() => !currentGame.inGame());
        }

        cancelPasswordPrompt() {
            this.passwordPrompt(null);
            this.gamePassword('');
        }

        createGame() {
            const errors = [];
            const name = this.newGame.name();
            if (typeof name !== 'string' || !name.trim())
                errors.push('invalid-name');

            const maxPlayers = Number(this.newGame.maxPlayers());
            if (!Number.isInteger(maxPlayers)
                    || maxPlayers < app.config.maxPlayersMin
                    || maxPlayers > app.config.maxPlayersMax)
                errors.push('invalid-max-players');
            let password = this.newGame.password().trim();
            if (typeof password !== 'string')
                errors.push('invalid-password');
            if (errors.length) {
                showMessages(errors);
                return;
            }

            const data = {
                name: name.trim(),
                maxPlayers: maxPlayers
            };
            if (password)
                data.password = password;

            emit('create-game', data, response => {
                if (!response) {
                    showMessage('connection-error');
                    return;
                }
                if (response.success) {
                    this.refresh().then(() => {
                        gamesList.refresh().then(() => {
                            const game = gamesList.game(response.id);
                            if (password)
                                localStorage.setItem(`game-${game.id}-password`, password);
                            if (game === null) {
                                log("Game did not exist after creating it");
                                return;
                            }
                            game.join(password);
                            if (currentGame.game() !== null)
                                showMessage('game-created');
                        });
                    });
                } else if (response) {
                    showMessage(response.reason);
                }
            });
        }

        game(id) {
            return this.games().find(game => id === game.id) || null;
        }

        joinGame() {
            if (this.passwordPrompt() !== null)
                this.game(this.passwordPrompt()).join(this.gamePassword());
        }

        async refresh() {
            await fetch(app.paths.games)
                .then(response => response.json())
                .then(newGames => {
                    // Update games and remove those that have been deleted
                    const oldGames = this.games();
                    oldGames.forEach(oldGame => {
                        const newGame = newGames.find(newGame => oldGame.id === newGame.id);
                        if (newGame !== undefined) {
                            for (const property of ['playerCount', 'started', 'ended'])
                                oldGame[property](newGame[property]);
                        } else {
                            this.games.remove(game => game.id === oldGame.id);
                        }
                    });
                    // Push previously unseen games
                    newGames.forEach(newGame => {
                        if (!oldGames.some(oldGame => oldGame.id === newGame.id))
                            this.games.push(new Game(newGame));
                    });
                });
        }
    }
    const gamesList = new GamesListViewModel();
    applyBindings(gamesList, $('#games'));

    gamesList.refresh().then(afterGamesListLoaded);


    class Card {
        constructor(data) {
            for (const property of ['id', 'name', 'text', 'type', 'imgURL', 'baseURL'])
                this[property] = data[property];
        }
        use() {
            if (!currentGame.inGame()) {
                showMessage('not-in-game');
                return;
            }
            if (!currentGame.useCards().includes(this)) {
                showMessage('card-not-in-hand');
                return;
            }
            emit('use-card', {id: this.id}, response => {
                if (!response.success)
                    showMessage(response.reason);
            });
        }
    }

    const cards = new Map();
    fetch(app.paths.cards)
        .then(response => response.json())
        .then(response => {
            response.forEach(card => cards.set(card.id, new Card(card)));
        });
    const card = function(id) {
        return cards.get(id) || null;
    };


    socket.on('game-created', data => {
        log('game-created', data);
        gamesList.games.push(new Game(data));
    });

    socket.on('game-updated', data => {
        log('player-count-updated', data);
        const game = gamesList.game(data.id);
        if (game)
            game.playerCount(data.playerCount);
        else
            log('invalid-game', 'game-updated');
    });

    socket.on('game-started', data => {
        log('game-started', data);
        const game = gamesList.game(data.id);
        if (game)
            game.started(true);
        else
            log('invalid-game', 'game-started');
    });

    socket.on('game-deleted', data => {
        log('game-deleted', data);
        if (currentGame.game() && currentGame.game().id === data.id)
            currentGame.clear();
        gamesList.games.remove(game => game.id === data.id);
    });

    currentGame.on('game-joined', data => {
        const player = new User(data);
        if (player.id !== settings.user().id) {
            currentGame.players.push(player);
            showMessage('game-joined-other', player);
        }
    });

    currentGame.on('game-left', data => {
        const players = currentGame.players.remove(player => player.id === data.user);
        if (players.length !== 1)
            log('invalid-player', 'game-left', players);
        for (const player of players) {
            if (player.id !== settings.user().id)
                showMessage('game-left-other', player);
        }
    });

    currentGame.on('new-turn', data => {
        const player = currentGame.player(data.user);
        if (!player) {
            log('invalid-player', 'new-turn');
            return;
        }
        currentGame.currentPlayer(player);
    });

    currentGame.on('game-ended', data => {
        if (!data.id) {
            log("Missing game ID in 'game-ended' data");
            return;
        }

        const game = gamesList.game(data.id);
        if (!game) {
            log("Nonexistent game ID in 'game-ended' data");
            return;
        }
        gamesList.game(data.id).ended(true);

        if (currentGame.game() && data.id === currentGame.game().id) {
            currentGame.currentPlayer(null);
            showMessage('game-ended');
        }
    });

    currentGame.on('player-order-changed', playerOrder => {
        const oldPlayers = currentGame.players();
        const newPlayers = [];
        for (const id of playerOrder) {
            const player = oldPlayers.find(player => id === player.id);
            if (player)
                newPlayers.push(player);
            else
                log("Invalid user ID in 'player-order-changed' data");
        }
        currentGame.players(newPlayers);
    });

    currentGame.on('private-card-drawn', data => {
        const player = currentGame.player(data.user);
        if (!player) {
            log('invalid-player', 'private-card-drawn');
            return;
        }
        if (settings.user().id !== player.id)
            showMessage('private-card-drawn', player);
    });

    currentGame.on('public-card-drawn', data => {
        const card = cards.get(data.card);
        const player = currentGame.player(data.user);
        if (!card || !player) {
            log('invalid-data', 'public-card-drawn', card, player);
            return;
        }
        if (player.id !== settings.user().id)
            showMessage('public-card-drawn-other', card, player);
    });

    currentGame.on('active-card-added', data => {
        const card = cards.get(data.cardID);
        if (!card) {
            log('invalid-card', 'active-card-added');
            return;
        }
        currentGame.activeCards(data.userID).push(card);
    });

    currentGame.on('active-card-removed', data => {
        const removedCards = currentGame.activeCards(data.userID).remove(
            card => card.id === data.cardID);
        if (!removedCards.length)
            log('invalid-card', 'active-card-removed');
    });

    currentGame.on('use-card-added', data => {
        const card = cards.get(data.cardID);
        if (!card) {
            log('invalid-card', 'use-card-added');
            return;
        }
        currentGame.useCards.push(card);
    });

    currentGame.on('use-card-removed', data => {
        // TODO: Currently removes all copies of a card.
        //       This becomes a problem if we want to have duplicates of cards.
        //       Same problem (though less severe) exists with active-card-removed.
        const removedCards = currentGame.useCards.remove(card => card.id === data.cardID);
        if (!removedCards.length)
            log('invalid-card', 'use-card-removed');
    });

    currentGame.on('card-used', data => {
        const card = cards.get(data.cardID);
        const player = currentGame.player(data.userID);
        if (!card || !player) {
            log('invalid-data', 'card-used', card, player);
            return;
        }
        showMessage('card-used', card, player);
    });

    currentGame.on('turn-skipped', data => {
        const player = currentGame.player(data.userID);
        if (!player) {
            log('invalid-player', 'turn-skipped');
            return;
        }
        showMessage('turn-skipped', player, data.skipsLeft);
    });

    currentGame.on('spidey-sense-tingling', data => {
        const card = cards.get(data.cardID);
        if (!card) {
            log('invalid-card', 'spidey-sense-tingling');
            return;
        }
        showMessage('spidey-sense-tingling', card);
    });

    currentGame.on('card-discarded', data => {
        const card = cards.get(data.card);
        const player = currentGame.player(data.user);
        if (!card || !player) {
            log('invalid-data', 'discard', card, player);
            return;
        }
        showMessage('discard', card, player);
    });

    currentGame.on('card-effect', data => {
        showMessage(data.message)
    });

});
