import io from 'socket.io-client'
import jQuery from 'jquery'
import ko from 'knockout'

import { ViewModel } from './viewmodel'
import { changeLanguage, fetchCards } from './utils'
import { registerHandlers } from './handlers'


jQuery(async () => {
    dionysos.socket = io({
        path: '/socket'
    })

    dionysos.vm = new ViewModel(dionysos)
    ko.applyBindings(dionysos.vm)

    await Promise.all([
        dionysos.vm.refreshGamesList(),
        changeLanguage(dionysos.language),
        registerHandlers(dionysos.socket, dionysos.vm),
        fetchCards()
    ])
})
