import Cookies from 'js-cookie';
import io from 'socket.io-client';
import jQuery from 'jquery';
import ko from 'knockout';


jQuery($ => {
    const app = dionysos;
    const socket = io({
        path: '/socket'
    });

    const getMessage = function(messageID) {
        if (!app.messages) {
            log("dionysos.messages is missing");
            return messageID;
        }
        if (!app.messages[app.language]) {
            log(`Unknown language: ${app.language}`);
            app.language = 'en';
            return messageID;
        }
        if (!app.messages[app.language].has(messageID)) {
            log(`Unknown message ID: ${messageID}`);
            return messageID;
        }
        return app.messages[app.language].get(messageID);
    };

    const formatMessage = function(messageID, ...args) {
        return getMessage(messageID).format(...args);
    };

    const showMessage = function(messageID, ...args) {
        $('#messages').append($('<li>').text(formatMessage(messageID, ...args)));
    };

    const showMessages = function(messages) {
        messages.forEach(args => showMessage(...args));
    };

    const gameLog = function(messageID, ...args) {
        currentGame.gameLog.push(formatMessage(messageID, ...args));
    };

    const debug = function(...args) {
        if (app.config.debug)
            console.log(...args);
    };

    const showDebugMessage = function(message = '') {
        if (message)
            message = ` (${message})`;
        showMessage(`Unexpected error${message}. If your game is broken or you have`
            + ` more information about this bug, please contact ${app.config.adminEmail}`);
    };

    const log = console.log;

    const changeLanguage = function(language) {
        if (app.messages[language])
            return;
        fetch(app.paths.messages(language))
            .then(response => response.json())
            .then(messages => {
                app.messages[language] = new Map(Object.entries(messages));
            });
    };
    changeLanguage(app.language);


    socket.on('connect', () => {
        settings.connected(true);
    });
    socket.on('connect_error', error => {
        showMessage('connection-error');
        log("Socket.IO connection error:", error);
    });
    socket.on('error', error => {
        log("Socket.IO error:", error);
    });
    socket.on('disconnect', () => {
        settings.connected(false);
    });


    const afterGamesListLoaded = function() {
        if (app.initialGame !== null) {
            const gameID = app.initialGame;
            if (typeof gameID !== 'string') {
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

    // https://stackoverflow.com/a/4673436
    String.prototype.format = function() {
      return this.replace(/\{(\d+)\}/g, (match, index) =>
        arguments[index] === undefined ? match : arguments[index]);
    };


    class Game {
        constructor(data) {
            for (const property of ['id', 'name', 'creator', 'maxPlayers', 'passwordProtected', 'remote'])
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
                debug(`Attempting to join game ${this.id} with password '${password}'`);
            } else {
                debug(`Attempting to join game ${this.id}`);
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
                    showMessage('game-joined-self', this.name);
                } else {
                    showMessage(response.reason);
                }
            });
        }

        tryJoin() {
            if (this.passwordProtected) {
                const storedPassword = localStorage.getItem(`game-${this.id}-password`);
                if (storedPassword === null)
                    gamesList.passwordPrompt(this);
                else
                    this.join(storedPassword);
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
                errors.push(['error-refresh']);
            if (typeof this.username() !== 'string' || !this.username().trim())
                errors.push(['empty-username']);
            if (typeof this.password() !== 'string' || !this.password().trim())
                errors.push(['empty-password']);
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
                    if (currentGame.game())
                        currentGame.leave();
                    this.user(null);
                    replaceURL(null);
                    gamesList.newGame.name('');
                    // Reconnect to set auth cookies for socket
                    socket.close().open();
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
            if (typeof this.username() !== 'string' || !this.username().trim()) {
                errors.push(['invalid-username']);
            } else if (this.username().trim().length > app.config.usernameMaxLength) {
                errors.push(['username-too-long']);
            }
            if (typeof this.password() !== 'string'
                    || this.password().trim().length < app.config.passwordMinLength)
                errors.push(['password-too-short', app.config.passwordMinLength]);
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
            this.gameLog = ko.observableArray();
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

        cardImgURL(filename) {
            return `${app.paths.cardImgDir}${filename}`;
        }

        cardBaseURL(filename) {
            return `${app.paths.cardBaseDir}${filename}`;
        }

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
                if (!response) {
                    showMessage('connection-error');
                    return;
                }
                if (response.success) {
                    const card = cards.get(response.id);
                    if (!card)
                        log("Invalid card ID contained in 'draw-card' response");
                } else if (response.reason) {
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
            const gameName = this.game().name;
            this.clear();
            emit('leave-game', {id: gameID}, response => {
                if (!response) {
                    showMessage('connection-problem');
                } else if (response.success) {
                    this.clear();
                    replaceURL(null);
                    showMessage('game-left-self', gameName);
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
                errors.push(['game-already-started']);
            if (this.game().creator.id !== settings.user().id)
                errors.push(['not-creator']);
            if (errors.length > 0) {
                showMessages(errors);
                return;
            }
            emit('start-game', {id: this.game().id}, response => {
                if (!response)
                    showMessage('connection-error');
                else if (!response.success)
                    showMessage(response.reason);
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
                maxPlayers: ko.observable(app.config.maxPlayersDefault),
                remote: ko.observable(false)
            };
            this.ownGamesMaxed = ko.pureComputed(() => {
                if (!settings.user())
                    return true;
                const count = this.games().filter(game => game.creator.id === settings.user().id).length;
                return count >= app.config.maxGamesPerUser;
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

            let name = this.newGame.name();
            if (typeof name !== 'string' || !name.trim())
                errors.push(['invalid-name']);
            name = name.trim();

            const maxPlayers = Number(this.newGame.maxPlayers());
            if (!Number.isInteger(maxPlayers)
                    || maxPlayers < app.config.maxPlayersMin
                    || maxPlayers > app.config.maxPlayersMax)
                errors.push(['invalid-max-players']);

            let password = this.newGame.password();
            if (typeof password === 'string')
                password = password.trim();
            else
                errors.push(['invalid-password']);

            const remote = this.newGame.remote();
            if (typeof remote !== 'boolean')
                errors.push(['invalid-remote']);

            if (errors.length) {
                showMessages(errors);
                return;
            }

            const data = {
                name: name,
                maxPlayers: maxPlayers,
                remote: remote
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
                } else if (response.reason) {
                    showMessage(response.reason);
                }
            });
        }

        game(id) {
            return this.games().find(game => id === game.id) || null;
        }

        joinGame() {
            debug("Game password is", this.gamePassword());
            if (this.passwordPrompt() !== null)
                this.passwordPrompt().join(this.gamePassword());
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
        const game = gamesList.game(data.id);
        if (game) {
            game.started(true);
            if (game === currentGame.game())
                gameLog('game-started', game.name);
        } else {
            log("'game-started' contained an invalid game ID");
        }
    });

    socket.on('game-deleted', data => {
        debug('A game was deleted: ', data);
        localStorage.removeItem(`game-${data.id}-password`);
        if (currentGame.game() && currentGame.game().id === data.id)
            currentGame.clear();
        gamesList.games.remove(game => game.id === data.id);
    });

    currentGame.on('game-joined', data => {
        const player = new User(data);
        if (player.id !== settings.user().id) {
            currentGame.players.push(player);
            gameLog('game-joined-other', player.name);
        }
    });

    currentGame.on('game-left', data => {
        const players = currentGame.players.remove(player => player.id === data.userID);
        if (players.length !== 1)
            log('invalid-player', 'game-left', players);
        for (const player of players) {
            if (player.id !== settings.user().id)
                gameLog('game-left-other', player.name);
        }
    });

    currentGame.on('new-turn', data => {
        debug("New turn:", data);
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
            gameLog('game-ended');
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
            gameLog('private-card-drawn', player.name);
    });

    currentGame.on('public-card-drawn', data => {
        const card = cards.get(data.card);
        const player = currentGame.player(data.user);
        if (!card || !player) {
            log("Invalid data in 'public-card-drawn'", card, player);
            return;
        }

        currentGame.lastCard(card);
        if (player.id === settings.user().id)
            gameLog('public-card-drawn-self', card.name);
        else
            gameLog('public-card-drawn-other', card.name, player.name);
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
        gameLog('use-card-drawn', card.name);
        currentGame.lastCard(card);
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
        gameLog('card-used', card.name, player.name);
    });

    currentGame.on('turn-skipped', data => {
        const player = currentGame.player(data.userID);
        if (!player) {
            log('invalid-player', 'turn-skipped');
            return;
        }
        if (data.skipsLeft) {
            gameLog('turn-skipped', player.name,
                data.skipsLeft === 1 ? "one more time" : `${data.skipsLeft} more times`);
        } else {
            gameLog('last-turn-skipped', player.name);
        }
    });

    currentGame.on('spidey-sense-tingling', data => {
        const card = cards.get(data.cardID);
        if (!card) {
            log('invalid-card', 'spidey-sense-tingling');
            return;
        }
        gameLog('spidey-sense-tingling', card.name);
    });

    currentGame.on('card-discarded', data => {
        const card = cards.get(data.card);
        const player = currentGame.player(data.user);
        if (!card || !player) {
            log('invalid-data', 'discard', card, player);
            return;
        }
        gameLog('card-discarded', card.name, player.name);
    });

    currentGame.on('card-effect', data => {
        showMessage(data.message);
    });


    $('#game-password').keydown(event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            gamesList.joinGame();
        }
    });
});
