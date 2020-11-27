import { debug, gameLog, gamePasswordKey, log, showMessage } from './utils'
import { Game } from './game'
import { User } from './user'


export const registerHandlers = function(socket, vm) {
    socket.on('active-card-added', data => {
        const card = dionysos.cards.get(data.cardID)
        if (!card) {
            log("Invalid card ID in 'active-card-added'")
            return
        }
        vm.currentGame.activeCardsOfUser(data.userID).push(card)
    })

    socket.on('active-card-removed', data => {
        const removedCards = vm.currentGame.activeCardsOfUser(data.userID).remove(
            card => card.id === data.cardID)
        // TODO: currently removes all instances of a card;
        //       needs to be changed if we want to have multiples of cards
        if (!removedCards.length)
            log("Invalid card or user ID in 'active-card-removed'")
    })

    socket.on('card-discarded', data => {
        const card = dionysos.cards.get(data.cardID)
        const player = vm.currentGame.player(data.userID)
        if (!card)
            log("Invalid card ID in 'card-discarded'")
        if (!player)
            log("Invalid player ID in 'card-discarded'")
        if (!card || !player)
            return

        gameLog('card-discarded', card.name, player.name)            
    })

    socket.on('card-effect', data => {
        gameLog(data.message)
    })

    socket.on('connect', () => {
        vm.connected(true)
    })

    socket.on('connect_error', error => {
        showMessage('connection-error')
        debug("Socket.IO connection error:", error)
    })

    socket.on('disconnect', () => {
        vm.connected(false)
    })

    socket.on('error', error => {
        log("Socket.IO error:", error)
    })

    socket.on('game-created', data => {
        debug("Game created:", data)
        vm.games.push(new Game(data))
    })

    socket.on('game-deleted', data => {
        debug("Game deleted:", data)
        localStorage.removeItem(`game-${data.id}-password`)
        if (vm.inGame() && data.id === vm.currentGame.game().id)
            vm.currentGame.clear()
        vm.games.remove(game => game.id === data.id)
    })

    socket.on('game-ended', data => {
        const game = vm.currentGame.game()
        game.started(false)
        game.ended(true)
        vm.currentGame.reset()
        gameLog('game-ended')
    })

    socket.on('game-joined', data => {
        debug("New player joined:", data)
        const player = new User(data)
        if (player.id !== vm.user().id) {
            vm.currentGame.players.push(player)
            gameLog('game-joined-other', player.name)
        }
    })

    socket.on('game-left', data => {
        debug("Player left:", data)
        const players = vm.currentGame.players.remove(player => player.id === data.userID)
        if (players.length !== 1)
            log(`${players.length} players left a game (expected 1)`)
        for (const player of players) {
            if (player.id !== vm.user().id)
                gameLog('game-left-other', player.name)
        }
    })

    socket.on('game-started', data => {
        const game = vm.findGame(data.id)
        if (game) {
            debug("Game started:", data)
            game.started(true)
            if (vm.inGame() && game.id === vm.currentGame.game().id)
                gameLog('game-started')
        } else {
            log("Invalid game ID in 'game-started'")
        }
    })

    socket.on('game-updated', data => {
        debug("Game updated:", data)
        const game = vm.findGame(data.id)
        const mutableProperties = ['playerCount']
        if (game) {
            for (const property of mutableProperties) {
                if (data[property] !== undefined)
                    game[property](data[property])
            }
        } else {
            log("Invalid game ID in 'game-updated'")
        }        
    })

    socket.on('new-turn', data => {
        debug("New turn:", data)
        const player = vm.currentGame.player(data.userID)
        if (!player) {
            log("Invalid user ID in 'new-turn'")
            return
        }
        vm.currentGame.currentPlayer(player)
    })

    socket.on('player-order-changed', playerOrder => {
        const newPlayers = []
        for (const id of playerOrder) {
            const player = vm.currentGame.player(id)
            if (player)
                newPlayers.push(player)
            else
                log("Invalid user ID in 'player-order-changed'")
        }
        vm.currentGame.players(newPlayers)
    })

    socket.on('private-card-drawn', data => {
        const player = vm.currentGame.player(data.userID)
        if (!player) {
            log("Invalid user ID in 'private-card-drawn'")
            return
        }
        if (vm.user().id !== player.id)
            gameLog('private-card-drawn', player.name)
    })

    socket.on('public-card-drawn', data => {
        const card = dionysos.cards.get(data.cardID)
        const player = vm.currentGame.player(data.userID)
        if (!card)
            log("Invalid card ID in 'public-card-drawn")
        if (!player)
            log("Invalid user ID in 'public-card-drawn")
        if (!card || !player)
            return

        vm.currentGame.lastCard(card)
        if (vm.user().id === player.id)
            gameLog('public-card-drawn-self', card.name)
        else
            gameLog('public-card-drawn-other', card.name, player.name)
    })

    socket.on('turn-skipped', data => {
        const player = vm.currentGame.player(data.userID)
        if (!player) {
            log("Invalid user ID in 'turn-skipped'")
            return
        }
        if (data.skipsLeft) {
            gameLog('turn-skipped', player.name,
                data.skipsLeft === 1 ? "one more time" : `${data.skipsLeft} more times`)
        } else {
            gameLog('last-turn-skipped', player.name)
        }
    })

    socket.on('use-card-added', data => {
        const card = dionysos.cards.get(data.cardID)
        if (!card) {
            log("Invalid card ID in 'use-card-added'")
            return
        }
        gameLog('use-card-drawn', card.name)
        vm.currentGame.lastCard(card)
        vm.currentGame.useCards.push(card)
    })

    socket.on('use-card-removed', data => {
        // TODO: currently removes all instances of a card (like active-card-removed).
        //       Needs to be changed if we want to have multiples of cards.
        const removedCards = vm.currentGame.useCards.remove(card => card.id === data.cardID)
        if (!removedCards.length)
            log("Invalid card ID in 'use-card-removed'")
    })

    socket.on('use-card-used', data => {
        const card = dionysos.cards.get(data.cardID)
        const player = vm.currentGame.player(data.userID)
        if (!card)
            log("Invalid card ID in 'use-card-used'")
        if (!player)
            log("Invalid user ID in 'use-card-used'")
        if (!card || !player)
            return
        gameLog('use-card-used', card.name, player.name)
    })
}
