export const SET_LOCALE = 'SET_LOCALE'

export function init (locale) {
    return setLocale(locale)
}

export function setLocale (locale) {
    return {type: SET_LOCALE, locale}
}