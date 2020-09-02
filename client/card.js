import { emit, showMessage } from './utils'


export class Card {
    constructor(data) {
        const properties = ['id', 'name', 'text', 'type', 'imgURL', 'baseURL']
        for (const property of properties)
            this[property] = data[property]
    }
    use() {
        const vm = dionysos.vm
        if (!vm.inGame()) {
            showMessage('not-in-game')
            return
        }
        if (!vm.currentGame.useCards().includes(this)) {
            showMessage('card-not-in-hand')
            return
        }
        emit('use-card', {id: this.id}, response => {
            if (!response.success)
                showMessage(response.reason)
        })
    }
}
