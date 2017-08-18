'use strict';

let angular = require('angular');
let combineReducers = require('redux').combineReducers;
let reduxThunk = require('redux-thunk');
let extend = require('lodash.assignin');
let isEmpty = require('lodash.isempty');
let utils = {};

function processDeps(dependencies) {
    let processedDeps = {};
    processedDeps.angular = dependencies.map(function(dep) {
        if (typeof dep !== 'string') {
            return dep.name;
        }

        return dep;
    });
    processedDeps.reducer = dependencies.reduce(function(current, next) {
        return next.reducer ? extend({}, current, next.reducer) : current;
    }, {});

    return processedDeps;
};

function AppStateService($ngRedux) {
    var exports = {};

    exports.connect = function connect(scope, selector, mapper) {
        var unsubscribe = $ngRedux.connect(selector)(mapper);
        scope.$on('$destroy', unsubscribe);
    };

    return exports;
};

utils.createApp = function createApp(name, deps, appReducer) {
    let processedDeps = processDeps(deps.concat(require('ng-redux')));

    return angular.module(name, processedDeps.angular)

        .config(['$ngReduxProvider', function reduxConfig($ngReduxProvider) {
            let reducerMap = extend(processedDeps.reducer, appReducer);
            let storeEnhancers = [];
            let reducer;

            if (isEmpty(reducerMap)) {
                reducer = function statePassthrough(state) { return state || {}; };
            } else {
                reducer = combineReducers(reducerMap);
            }
            if (process.env.NODE_ENV !== 'production' && window.devToolsExtension) {
                storeEnhancers.push(window.devToolsExtension());
            }
            $ngReduxProvider.createStoreWith(reducer, [reduxThunk], storeEnhancers);
        }])

        .run(['$ngRedux', '$rootScope', function($ngRedux, $rootScope) {
            //We need to listen to state changes outside of the Redux flow when using dev tools
            if (process.env.NODE_ENV !== 'production' && window.devToolsExtension) {
                $ngRedux.subscribe(function() {
                    setTimeout(function() {
                        $rootScope.$apply();
                    }, 100);
                });
            }
        }])

        .service('AppState', ['$ngRedux', AppStateService]);
};

utils.createModule = function createModule(name, deps) {
    let processedDeps = processDeps(deps);
    let localModule = angular.module(name, processedDeps.angular)
        .service('AppState', ['$ngRedux', AppStateService]);
    localModule.reducer = processedDeps.reducer;
    return localModule;
};

utils.createState = function createState(initialState, reducers) {
    return function reduce(state, action) {
        let reducer = reducers[action.type];
        if (reducer) {
            return reducer(state, action);
        }
        return state || initialState;
    };
};

module.exports = utils;
