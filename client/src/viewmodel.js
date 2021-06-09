import ko from 'knockout'

import {
    defaultGameName,
    emit,
    getCSRFCookie,
    replaceURL,
    showMessage,
    showMessages
} from './utils'
import { Game } from './game'
import { User } from './user'


export class ViewModel {
    constructor() {
        /*
         * General settings
         */
        this.user = ko.observable(dionysos.initialUser
            ? new User(dionysos.initialUser)
            : null)
        this.credentials = {
            username: ko.observable(''),
            password: ko.observable('')
        }
        this.connected = ko.observable(false)

        this.view = ko.pureComputed(() => {
            if (this.user() === null)
                return 'logged-out'
            if (this.currentGame && this.currentGame.game())
                return 'game'
            return 'lobby'
        })
        this.inGame = ko.pureComputed(() => this.view() === 'game')
        this.inLobby = ko.pureComputed(() => this.view() === 'lobby')
        this.loggedOut = ko.pureComputed(() => this.view() === 'logged-out')

        /*
         * Lobby
         */
        this.games = ko.observableArray([])
        this.newGame = {
            name: ko.observable(defaultGameName(this.user())),
            password: ko.observable(''),
            maxPlayers: ko.observable(dionysos.config.maxPlayersDefault),
            remote: ko.observable(false)
        }
        this.joinPassword = ko.observable('')
        this.joinPasswordPrompt = ko.observable(null)
        this.ownGamesMaxed = ko.pureComputed(() => {
            if (!this.user())
                return true
            const count = this.games().filter(game => game.creator.id === this.user().id).length
            return count >= dionysos.config.maxGamesPerUser
        })
        this.joinableGames = ko.pureComputed(
            () => this.games().filter(game => !game.started()))
        this.canCreateGame = ko.pureComputed(
            () => !this.ownGamesMaxed() && !this.inGame())

        /*
         * Current game
         */
        this.currentGame = {
            game: ko.observable(null),
            log: ko.observableArray(),
            activeCards: new Map(),
            useCards: ko.observableArray(),
            players: ko.observableArray(),
            currentPlayer: ko.observable(null),
            lastCard: ko.observable(null),
            canDraw: ko.pureComputed(() => {
                if (!this.currentGame.inProgress() || !this.currentGame.currentPlayer())
                    return false
                return this.currentGame.currentPlayer().id === this.user().id
            }),
            canStart: ko.pureComputed(() => {
                if (this.currentGame.inProgress() || !this.currentGame.isCreator())
                    return false
                return this.currentGame.players().length >= dionysos.config.minPlayersToStart
            }),
            inProgress: ko.pureComputed(() => {
                const game = this.currentGame.game()
                return game && game.started() && !game.ended()
            }),
            isCreator: ko.pureComputed(() => {
                if (!this.user() || !this.inGame())
                    return false
                return this.currentGame.game().creator.id === this.user().id
            }),
            url: ko.pureComputed(() => {
                if (!this.inGame())
                    return dionysos.paths.index
                return dionysos.paths.game(this.currentGame.game().id)
            }),
            activeCardsOfUser(id) {
                if (!this.activeCards.has(id))
                    this.activeCards.set(id, ko.observableArray())
                return this.activeCards.get(id)
            },
            clear() {
                this.reset()
                this.players.removeAll()
                this.log.removeAll()
                this.game(null)
            },
            drawCard() {
                if (!this.canDraw()) {
                    showMessage('not-in-turn')
                    return
                }
                emit('draw-card', {}, response => {
                    if (!response) {
                        showMessage('connection-error')
                        return
                    }
                    if (!response.success)
                        showMessage(response.reason)
                })
            },
            leave() {
                if (!this.game())
                    return
                const gameID = this.game().id
                const gameName = this.game().name

                this.clear()
                replaceURL(null)
                emit('leave-game', {id: gameID}, response => {
                    if (!response)
                        showMessage('connection-error')
                    else if (response.success)
                        showMessage('game-left-self', gameName)
                    else
                        showMessage(response.reason)
                })
            },
            player(id) {
                return this.players().find(player => id === player.id) || null
            },
            reset() {
                // Reset the game to a non-started state,
                // but stay in game, keep player list and game log
                this.currentPlayer(null)
                this.lastCard(null)
                this.useCards.removeAll()
                // TODO: reset other values
            },
            start() {
                if (!this.game()) {
                    showMessage('not-in-game')
                    return
                }
                const errors = []
                if (this.game().started())
                    errors.push('game-already-started')
                if (!this.isCreator())
                    errors.push('not-creator')
                if (errors.length) {
                    showMessages(errors)
                    return
                }

                emit('start-game', {id: this.game().id}, response => {
                    if (!response)
                        showMessage('connection-error')
                    else if (!response.success)
                        showMessage(response.reason)
                })
            }
        }
    }

    cancelJoinPasswordPrompt() {
        this.joinPasswordPrompt(null)
        this.joinPassword('')
    }

    cardBaseURL(filename) {
        return dionysos.paths.cardBaseDir + filename
    }

    cardImgURL(filename) {
        return dionysos.paths.cardImgDir + filename
    }

    createGame() {
        const errors = []
        const name = this.newGame.name()
        if (typeof name !== 'string' || !name.trim())
            errors.push('invalid-name')
        const maxPlayers = Number(this.newGame.maxPlayers())
        if (!Number.isInteger(maxPlayers)
                || maxPlayers < dionysos.config.maxPlayersMin
                || maxPlayers > dionysos.config.maxPlayersMax)
            errors.push('invalid-max-players')
        let password = this.newGame.password()
        if (typeof password !== 'string')
            errors.push('invalid-password')
        const remote = this.newGame.remote()
        if (typeof remote !== 'boolean')
            errors.push('invalid-remote')

        if (errors.length) {
            showMessages(errors)
            return
        }

        const data = {
            name: name.trim(),
            maxPlayers,
            remote
        }
        password = password.trim()
        if (password)
            data.password = password

        emit('create-game', data, response => {
            if (!response) {
                showMessage('connection-error')
                return
            }
            if (response.success) {
                this.refreshGamesList().then(() => {
                    const game = this.findGame(response.id)
                    if (game === null) {
                        log("Game does not exist after creating it.")
                        showMessage('error-refresh')
                        return
                    }
                    if (password)
                        localStorage.setItem(game.passwordKey, password)
                    game.join(password)
                    if (this.inGame())
                        showMessage('game-created')
                })
            } else {
                showMessage(response.reason)
            }
        })
    }

    findGame(id) {
        return this.games().find(game => id === game.id) || null
    }

    joinGame() {
        console.log(arguments)
    }

    login() {
        const errors = []
        const csrfToken = getCSRFCookie()
        if (!csrfToken)
            errors.push('error-refresh')
        const username = this.credentials.username()
        if (typeof username !== 'string' || !username.trim())
            errors.push('empty-username')
        const password = this.credentials.password()
        if (typeof password !== 'string' || !password.trim())
            errors.push('empty-password')
        if (errors.length) {
            showMessages(errors)
            return
        }

        const requestBody = {
            username: username.trim(),
            password: password.trim()
        }
        fetch(dionysos.paths.login, {
            body: JSON.stringify(requestBody),
            headers: {
                'Content-Type': 'application/json',
                [dionysos.config.csrfHeader]: csrfToken
            },
            method: 'POST'
        })
        .then(response => response.json())
        .then(response => {
            if (response.success) {
                this.user(new User(response.user))
                // Reconnect to set auth cookies for socket
                dionysos.socket.close().open()
                if (!this.newGame.name())
                    this.newGame.name(defaultGameName(this.user()))
            } else {
                showMessage('login-failed', response.reason)
            }
        })
        // TODO: handle errors
    }

    logout() {
        const csrfToken = getCSRFCookie()
        if (!csrfToken) {
            showMessage('error-refresh')
            return
        }

        fetch(dionysos.paths.logout, {
            headers: {
                'Content-Type': 'application/json',
                [dionysos.config.csrfHeader]: csrfToken
            },
            method: 'POST'
        })
        .then(response => response.json())
        .then(response => {
            if (response.success) {
                if (this.inGame())
                    this.leaveGame()
                if (this.newGame.name() === defaultGameName(this.user()))
                    this.newGame.name('')
                this.user(null)
                replaceURL(null)
                // Reconnect to set auth cookies for socket
                dionysos.socket.close().open()
            } else {
                showMessage('logout-failed', response.reason)
            }
        })
        // TODO: handle errors
    }

    async refreshGamesList() {
        await fetch(dionysos.paths.games)
            .then(response => response.json())
            .then(newGames => {
                // Update games and remove those that have been deleted
                const oldGames = this.games()
                const mutableProperties = ['playerCount', 'started', 'ended']
                oldGames.forEach(oldGame => {
                    const newGame = newGames.find(newGame => oldGame.id === newGame.id)
                    if (newGame === undefined) {
                        this.games.remove(game => game.id === oldGame.id)
                    } else {
                        for (const property of mutableProperties)
                            oldGame[property](newGame[property])
                    }
                })

                // Push previously unseen games
                newGames.forEach(newGame => {
                    if (!oldGames.some(oldGame => oldGame.id === newGame.id))
                        this.games.push(new Game(newGame))
                })
            })
        // TODO: handle errors
    }

    register() {
        const csrfToken = getCSRFCookie()
        if (!csrfToken) {
            log("Missing CSRF token when registering")
            showMessage('error-refresh')
            return
        }
        const errors = []
        const username = this.credentials.username()
        if (typeof username !== 'string' || !username.trim()) {
            errors.push('invalid-username')
        } else if (username.length > dionysos.config.usernameMaxLength) {
            errors.push('username-too-long')
        }
        const password = this.credentials.password()
        if (typeof password !== 'string' || password.length < dionysos.config.passwordMinLength)
            errors.push(['password-too-short', dionysos.config.passwordMinLength])
        if (errors.length) {
            showMessages(errors)
            return
        }

        const data = {
            username: username.trim(),
            password: password.trim()
        }
        fetch(dionysos.paths.register, {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                [dionysos.config.csrfHeader]: csrfToken
            },
            method: 'POST'
        })
        .then(response => response.json())
        .then(response => {
            if (response.success) {
                this.user(new User(response.user))
                // Reconnect to set auth cookies for socket
                socket.close().open()
                showMessage('registered')
            } else {
                showMessage(response.reason)
            }
        })
        // TODO: handle errors
    }
}
