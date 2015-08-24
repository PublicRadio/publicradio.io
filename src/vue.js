import {chain} from 'lodash';
import Vue from 'vue';
import {mergeOptions, hyphenate} from 'vue/src/util';
import './lib/sugar.js';

const passProps = 'inherit,template'.split(',');
const passMethods = 'data,created,beforeCompile,compiled,ready,attached,detached,beforeDestroy,destroyed'.split(',');
const passes = passProps.concat(passMethods);
const assetKeys = 'directives,elementDirectives,filters,components,transitions,partials'.split(',');
const registerKeys = 'on,watch'.split(',');

const assetMaps = fill(assetKeys, () => new WeakMap());
const registerMaps = fill(registerKeys, () => new WeakMap());

const connectorCache = new WeakMap();

export default class VueComponent {
    static connect (connector) {
        return (target) => {connectorCache.set(target, connector)};
    }

    static get options () {
        if (this.__cachedOptions) return this.__cachedOptions;
        const constructor = this;
        const parentConstructor = constructor.prototype.constructor instanceof VueComponent
            ? constructor.prototype.constructor
            : Vue;
        const defaultOptions = this._options;
        const parentOptions = parentConstructor.options;
        /*assets are binded to constructor*/
        const assets = fill(assetKeys, key => assetMaps[key].get(constructor));
        /*static passes are binded to constructor*/
        const staticOpts = fill(passes, key => constructor[key]);
        if (connectorCache.has(constructor))
            staticOpts.data = () => connectorCache.get(constructor);
        if (assets.components)
            for (let key of Object.keys(assets.components)) {
                const component = assets.components[key];
                Object.defineProperties(component, {
                    options: Object.getOwnPropertyDescriptor(VueComponent, 'options')
                });
            }

        return this.__cachedOptions = {...defaultOptions, ...parentOptions, ...assets, ...staticOpts};
    }

    static revealOptions (instance, opts) {
        /*registers are binded to instance*/
        const registers = fill(registerKeys, key => registerMaps[key].get(instance));
        const instanceOpts = fill(passes, key => {
            const val = instance[key];
            if (val) {
                delete instance[key];
                return val;
            }
        });
        const staticOpts = this.constructor.options;

        return {...staticOpts, ...registers, ...instanceOpts, ...opts};
    }

    constructor (opts) {
        this._init(VueComponent.revealOptions(this, opts));
        return this;
    }

    $addChild (opts = {}, BaseConstructor = VueComponent) {
        const instance = new BaseConstructor(opts);
        instance.__proto__ = Vue.prototype;
        return instance;
        var parent = this;
        var inherit = opts.inherit !== undefined
            ? opts.inherit
            : BaseConstructor.options.inherit;
        opts = Object.assign(opts, {_parent: parent, _root: parent.$root});
        if (!inherit)
            return new BaseConstructor(opts);

        return new (parent._childCtors[BaseConstructor.cid]
        || (parent._childCtors[BaseConstructor.cid] = class extends BaseConstructor {
            static linker = BaseConstructor.linker;
            // important: transcluded inline repeaters should
            // inherit from outer scope rather than host
            static prototype = opts._context || this;
        }))(opts);
    }
}

inherits(VueComponent, Vue);


Vue.extend = function extend (extendOptions) {
    var Sub = class Component extends VueComponent {
        static cid = require('vue/src/api/global.js').cid++;
        static _options = extendOptions;
        // allow further extension
        static extend = extend;
    };
    Sub['super'] = this;
    // create asset registers, so extended classes
    // can have their private assets too.
    assetKeys.forEach((type) => Sub[type] = this[type]);
    return Sub;
};

function inherits (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

for (let type of assetKeys) {
    const propMap = assetMaps[type];
    VueComponent[type] = (...args) => {
        return function decorate (object:VueComponent) {
            if (arguments.length !== 1)
                return console.warn('You should use this decorator only on class');
            for (let arg of args) {
                const keys = Object.keys(arg);
                for (let key of keys)
                    if (hyphenate(key) !== key) {
                        arg[key.toLowerCase()] = arg[hyphenate(key)] = arg[key];
                        delete arg[key];
                    }
            }
            propMap.set(object, Object.assign(propMap.get(object) || {}, ...args));
        }
    }
}

for (let type of registerKeys) {
    const propMap = registerMaps[type];
    VueComponent[type] = (...args) => {
        // decorator called without args, picking name as key
        const isCalledDirectly = args.length === 3 && args[0] instanceof VueComponent;
        const key = isCalledDirectly ? args[1] : args[0];
        return isCalledDirectly ? decorate(...arguments) : decorate;

        function decorate (object:VueComponent, name, descriptor) {
            if (arguments.length !== 3)
                return console.warn('You should use this decorator only on class method');

            propMap.getOrSetDefault(object, () => []).push([key, descriptor.value]);
            descriptor.value = undefined;
            return descriptor;
        }
    }
}


function fill (array, fn) {
    return array
        .map(key => [key, fn(key)])
        .filter(([, val]) => val)
        .reduce((acc, [key, val]) => ({...acc, [key]: val}), {});
}