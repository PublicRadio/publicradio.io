export const promiseMiddleware = () =>
    (dispatch) =>
        ({type, result,...rest} = {}) => {
            if (!type)
                return console.trace('no action')
            if (result && result.then instanceof Function)
                result.then(
                        result => dispatch({type, result, ...rest}),
                        error => dispatch({type, error, ...rest}))

            dispatch({type, result, ...rest})
        };