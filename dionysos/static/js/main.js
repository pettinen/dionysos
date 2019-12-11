jQuery($ => {
    'use strict';

    const app = dionysos;

    const socket = io({path: '/socket', transports: ['websocket']});
    const showMessage = console.log;
    const showDebugMessage = function(reason) {
        showMessage(`Unexpected error (${reason}). If your game is broken or you have`
            + ` more information about this bug, please contact ${app.config.adminEmail}`);
    };
    const showMessages = function(msgs) {
        msgs.forEach(msg => showMessage(msg));
    };

    socket.on('connect', () => showMessage("Connected"));
    socket.on('connect_error', error => {
        showMessage('connection-error');
        console.log(error);
    });
    socket.on('error', error => console.log("Error:", error));
    socket.on('disconnect', () => showMessage("Disconnected"));


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

    const escapeHTML = function(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    };


    class Game {
        constructor(data, playerCount = 0, started = false) {
            for (const property of ['id', 'name', 'creator', 'maxPlayers', 'passwordProtected'])
                this[property] = data[property];
            for (const property of ['playerCount', 'started'])
                this[property] = ko.observable(data[property]);
            this.password = ko.observable('');
            this.full = ko.pureComputed(() => this.playerCount() >= this.maxPlayers);
            this.canJoin = ko.pureComputed(
                () => !this.full() && settings.user() && !currentGame.inGame());
        }

        join() {
            const data = {id: this.id};
            if (this.passwordProtected) {
                if (typeof this.password() !== 'string' || !this.password().trim()) {
                    showMessage('password-required');
                    return;
                }
                data.password = this.password().trim();
                console.log(`Attempting to join game ${this.id} with password '${this.password()}'`);
            } else {
                console.log(`Attempting to join game ${this.id}`);
            }
            socket.emit('join-game', csrf(data), response => {
                if (response.success) {
                    currentGame.clear();
                    currentGame.game(this);
                    currentGame.players.push(...response.players.map(player => new User(player)));
                    showMessage('game-joined-self');
                } else {
                    showMessage(response.reason);
                }
            });
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
        }

        login() {
            const errors = [];
            const csrfToken = csrfCookie();
            if (!csrfToken)
                errors.push('missing-csrf-token');
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
                } else {
                    console.log("Login failed:", response);
                    showMessage(response.reason);
                }
            });
        }

        logout() {
            const csrfToken = csrfCookie();
            if (!csrfToken) {
                showMessage('missing-csrf-token');
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
                    // Reconnect to set auth cookies for socket
                    socket.close().open();
                    showMessage('logged-out');
                } else {
                    console.log("Logout failed:", response);
                    showMessage(response.reason);
                }
            });
        }
    }

    const settings = new SettingsViewModel(app.user);
    applyBindings(settings, $('#settings'));


    class CurrentGameViewModel {
        constructor() {
            this.game = ko.observable(null);
            this.ended = ko.observable(false);
            this.activeCardsMap = new Map();
            this.useCards = ko.observableArray();
            this.players = ko.observableArray();
            this.currentPlayer = ko.observable(null);
            this.lastCard = ko.observable(null);
            this.inGame = ko.pureComputed(() => Boolean(this.game()));

            this.canDraw = ko.pureComputed(() => {
                return this.currentPlayer()
                    && this.currentPlayer().id === settings.user().id;
            });
            this.canStart = ko.pureComputed(() => {
                return this.game() && !this.game().started()
                    && this.game().creator.id === settings.user().id;
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
            this.ended(false);
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
            socket.emit('draw-card', csrf(), response => {
                if(response.success) {
                    const card = cards.get(response.id);
                    if (!card)
                        return; // TODO: log this
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
            socket.emit('leave-game', csrf(), response => {
                if (response.success) {
                    this.clear();
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
            socket.emit('start-game', csrf(), response => {
                if (response.success) {
                    this.game().started(true);
                    showMessage('game-started');
                } else {
                    showMessage(response.reason);
                }
            });
        }
    }
    const currentGame = new CurrentGameViewModel();
    applyBindings(currentGame, $('#current-game'));


    class GamesListViewModel {
        constructor(games = []) {
            this.games = ko.observableArray(games);
            this.newGame = {
                name: ko.observable(''),
                password: ko.observable(''),
                maxPlayers: ko.observable(app.config.maxPlayersDefault)
            };
            this.canCreateGame = ko.pureComputed(
                () => settings.user() && !currentGame.inGame());
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
            const password = this.newGame.password();
            if (typeof password !== 'string')
                errors.push('invalid-password');
            if (errors.length) {
                showMessages(errors);
                return;
            }

            socket.emit('create-game',
                csrf({
                    name: name.trim(),
                    password: password.trim(),
                    maxPlayers: maxPlayers
                }),
                response => {
                    if (response.success) {
                        const game = gamesList.game(response.id);
                        currentGame.clear();
                        currentGame.game(game);
                        currentGame.players.push(settings.user());
                        showMessage('game-created');
                    } else {
                        showMessage(response.reason);
                    }
                }
            );
        }

        game(id) {
            return this.games().find(game => id === game.id) || null;
        }
    }
    const gamesList = new GamesListViewModel();
    applyBindings(gamesList, $('#games-list'));

    fetch(app.paths.games)
        .then(response => response.json())
        .then(games => gamesList.games.push(...games.map(game => new Game(game))));


    class Card {
        constructor(data) {
            for (const property of ['id', 'name', 'text', 'type', 'imgURL', 'baseURL'])
                this[property] = data[property];
        }
        use() {
            if (currentGame.game() === null) {
                showMessage('not-in-game');
                return;
            }
            if (currentGame.useCards.indexOf(this) === -1) {
                showMessage('card-not-in-hand');
                return;
            }
            socket.emit('use-card', csrf({id: this.id}), response => {
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
        console.log(`A game (ID: ${data.id}, name: ${data.name}) was created`);
        gamesList.games.push(new Game(data));
    });

    socket.on('game-updated', data => {
        console.log(`Game ${data.id} now has ${data.playerCount} players`);
        const game = gamesList.game(data.id);
        if (game) {
            game.playerCount(data.playerCount);
        } else {
        } // TODO: log this
    });

    socket.on('game-started', data => {
        console.log(`Game ${data.id} has started`);
        const game = gamesList.game(data.id);
        if (game) {
            game.started(true)
        } else {
        } // TODO: log this
    });

    socket.on('game-deleted', data => {
        console.log(`Game ${data.id} has ended`);
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
        const players = currentGame.players.remove(player => player.id === data.id);
        if (players.length !== 1) {
        } // TODO: log this
        for (const player of players) {
            if (player.id !== settings.user().id)
                showMessage('game-left-other', player);
        }
    });

    currentGame.on('new-turn', data => {
        const player = currentGame.player(data.id);
        if (!player)
            return; // TODO: log this
        console.log(`It is now ${currentGame.player(data.id).name}'s turn.`);
        currentGame.currentPlayer(player);
    });

    currentGame.on('game-ended', () => {
        currentGame.ended(true);
        currentGame.currentPlayer(null);
        showMessage('game-ended');
    });

    currentGame.on('player-order-changed', playerOrder => {
        const players = currentGame.players.removeAll();
        for (const id of playerOrder) {
            const player = players.find(player => id === player.id);
            if (player) {
                currentGame.players.push(player);
            } else {
            } // TODO: log this
        }
    });

    currentGame.on('private-card-drawn', data => {
        const player = currentGame.player(data.userID);
        if (!player)
            return; // TODO: log this
        if (settings.user().id !== player.id)
            showMessage('private-card-drawn', player);
    });

    currentGame.on('card-drawn', data => {
        const card = cards.get(data.cardID);
        const player = currentGame.player(data.userID);
        if (!card || !player)
            return; // TODO: log this
        if (player.id !== settings.user().id)
            showMessage('card-drawn-other', card, player);
    });

    currentGame.on('active-card-added', data => {
        const card = cards.get(data.cardID);
        if (!card)
            return; // TODO: log this
        currentGame.activeCards(data.userID).push(card);
    });

    currentGame.on('active-card-removed', data => {
        const removedCards = currentGame.activeCards(data.userID).remove(
            card => card.id === data.cardID);
        if (!removedCards.length) {
        } // TODO: log this
    });

    currentGame.on('use-card-added', data => {
        const card = cards.get(data.id);
        if (!card)
            return; // TODO: log this
        currentGame.useCards.push(card);
    });

    currentGame.on('use-card-removed', data => {
        // TODO: Currently removes all copies of a card.
        //       This becomes a problem if we want to have duplicates of cards.
        //       Same problem (though less severe) exists with active-card-removed.
        const removedCards = currentGame.useCards.remove(card => card.id === data.id);
        if (!removedCards.length) {
        } // TODO: log this
    });

    currentGame.on('card-used', data => {
        const card = cards.get(data.cardID);
        const player = currentGame.player(data.userID);
        if (!card || !player)
            return; // TODO: log this
        showMessage('card-used', card, player);
    });

    currentGame.on('turn-skipped', data => {
        const player = currentGame.player(data.id);
        if (!player)
            return; // TODO: log this
        showMessage('turn-skipped', player, data.skipsLeft);
    });

    currentGame.on('spidey-sense-tingling', data => {
        const card = cards.get(data.id);
        if (!card)
            return; // TODO: log this
        showMessage('spidey-sense-tingling', card);
    });

    currentGame.on('discard', data => {
        const card = cards.get(data.cardID);
        const player = currentGame.player(data.userID);
        if (!card || !player)
            return; // TODO: log this
        showMessage('discard', card, player);
    });

    currentGame.on('card-effect', data => showMessage(data.message));
});
