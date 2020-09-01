import io from 'socket.io-client'
import jQuery from 'jquery'
import ko from 'knockout'

import { ViewModel } from './viewmodel'
import { changeLanguage, showMessage } from './functions'
import { registerHandlers } from './handlers'


jQuery(() => {
    dionysos.socket = io({
        path: '/socket'
    })

    dionysos.vm = new ViewModel(dionysos)
    ko.applyBindings(dionysos.vm)

    dionysos.vm.refreshGamesList()
    changeLanguage(dionysos.language)
    registerHandlers(dionysos.socket, dionysos.vm)
})
