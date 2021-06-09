import ko from 'knockout'

import {
    emit,
    gameLog,
    gamePasswordKey,
    replaceURL,
    showMessage
} from './utils'
import { User } from './user'


export class Game {
    constructor(data) {
        const immutableProperties = ['id', 'name', 'creator', 'maxPlayers', 'passwordProtected', 'remote']
        const mutableProperties = ['playerCount', 'started', 'ended']

        immutableProperties.forEach(property => {
            this[property] = data[property]
        })
        mutableProperties.forEach(property => {
            this[property] = ko.observable(data[property])
        })
        this.full = ko.pureComputed(() => this.playerCount() >= this.maxPlayers)
    }

    join(password = '') {
        const requestData = { id: this.id }
        if (this.passwordProtected) {
            if (typeof password !== 'string' || !password.trim()) {
                showMessage('password-required')
                return
            }
            password = password.trim()
            requestData.password = password
        }

        emit('join-game', requestData, response => {
            if (response.success) {
                const vm = dionysos.vm
                vm.currentGame.clear()
                vm.currentGame.game(this)
                vm.currentGame.players.push(...response.players.map(player => new User(player)))
                replaceURL(this.id)
                localStorage.setItem(this.passwordKey, password)
                vm.joinPasswordPrompt(null)
                gameLog('game-joined-self', this.name)
            } else {
                showMessage('join-failed', response.reason)
            }
        })
    }

    get passwordKey() {
        return gamePasswordKey(this.id)
    }

    tryJoin() {
        if(this.passwordProtected) {
            const storedPassword = localStorage.getItem(this.passwordKey)
            if (storedPassword === null)
                dionysos.vm.joinPasswordPrompt(this)
            else
                this.join(storedPassword)
        } else {
            this.join()
        }
    }
}
