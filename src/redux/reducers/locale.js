import React from 'react'
import {SET_LOCALE} from '../actions/locale'

const defaultLocale = 'ru'
const locale = {}
locale.ru = {
    introPopup: {
        title: 'Это Public Radio',
        body: `Мы берем музыкальные паблики из VK с лучшей музыкой и делаем из них почти настоящие радиостанции (и даже немножко лучше).
Чтобы Public Radio подсказал станции специально для вас - авторизуйтесь в Вконтакте`,
        buttons: {
            authorizeVK: 'Войти с помощью Вконтакте',
            authorizeNonce: 'Попробовать без авторизации'
        }
    }
}
locale.en = {
}

Object.keys(locale).forEach(key => locale[key].locale = key)


export default function (state = locale[defaultLocale], action = {}) {
    switch (action.type) {
        case SET_LOCALE:
            return locale[action.locale] || locale[defaultLocale]
        default:
            return state
    }
}