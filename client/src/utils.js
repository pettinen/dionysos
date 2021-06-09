import $ from 'jquery'
import Cookies from 'js-cookie'
import { sprintf } from 'sprintf-js'

import { Card } from './card'


export const changeLanguage = async function(language) {
    if (dionysos.messages[language]) {
        dionysos.language = language
        return
    }
    await fetch(dionysos.paths.messages(language))
    .then(response => response.json())
    .then(messages => {
        dionysos.messages[language] = new Map(Object.entries(messages))
        dionysos.language = language
    })
    // TODO: handle errors
}

export const debug = function(...args) {
    if (dionysos.config.debug)
        console.log("[DEBUG]", ...args)
}

export const defaultGameName = function(user) {
    return user ? `${user.name}\u2019s game` : ''
}

export const emit = function(event, data, ...args) {
    const csrfToken = getCSRFCookie()
    if (csrfToken)
        data[dionysos.config.csrfDataKey] = csrfToken
    dionysos.socket.emit(event, data, ...args)
}

export const fetchCards = async function() {
    dionysos.cards = new Map()
    await fetch(dionysos.paths.cards)
        .then(response => response.json())
        .then(response => {
            response.forEach(card => dionysos.cards.set(card.id, new Card(card)))
        })
    // TODO: handle errors
}

export const formatMessage = function(messageID, ...args) {
    return `${messageID}: ${args.join(', ')}`
    // return sprintf(getMessage(messageID), ...args)
}

export const gameLog = function(messageID, ...args) {
    // TODO: display these in the UI
    console.log("[GAMELOG]", formatMessage(messageID, ...args))
}

export const gamePasswordKey = function(id) {
    return `game-${id}-password`
}

export const getCSRFCookie = function() {
    return Cookies.get(dionysos.config.csrfCookie)
}

export const getMessage = async function(messageID) {
    if (!dionysos.messages) {
        log("dionysos.messages is missing")
        return messageID
    }
    if (!dionysos.messages[dionysos.language]) {
        log("Unknown language", dionysos.language)
        await changeLanguage(dionysos.config.defaultLanguage)
    }
    if (!dionysos.messages[dionysos.language].has(messageID)) {
        log("Unknown message ID", messageID)
        return messageID
    }
    return dionysos.messages[dionysos.language].get(messageID)
}

export const log = function(...args) {
    // TODO: send these messages to the server logs
    console.log("[LOG]", ...args)
}

export const replaceURL = function(gameID) {
    if (gameID)
        history.replaceState({ gameID: gameID }, `Game ${gameID}`, dionysos.paths.game(gameID))
    else
        history.replaceState({ gameID: null }, 'Lobby', dionysos.paths.index)
}

export const showDebugMessage = function(message = '') {
    if (message)
        message = ` (${message})`
    showMessage(`Unexpected error${message}. If your game is broken or you want to`
        + `supply information about this bug, please contact ${dionysos.config.adminContact}.`)
}

export const showMessage = function(messageID, ...args) {
    $('#messages').append($('<li>').text(formatMessage(messageID, ...args)))
}

export const showMessages = function(messages) {
    messages.forEach(message => {
        if (typeof message === 'string')
            showMessage(message)
        else
            showMessage(...message)
    })
}
