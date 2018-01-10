import async from 'async';
import assert from 'assert';
import url from 'url';
import _ from 'underscore';
import Promise from 'bluebird';

import Sync from './library/sync';

module.exports = function() {

    this.confs = require('./config');

    let bootstrapCalls = {};
    const calls = {};
    const events = {};
    let plugins = [];

    this.endpoint = {};
    this.sync = new Sync(this);

    /**
     * List all possible calls
     * @returns {Array}
     */
    this.listCalls = () => {
        return Object.keys(calls);
    };

    this.query = url.parse(window.location.href, true).query;

    this.registerBootstrap = (name, callback) => {
        bootstrapCalls[name] = callback;
        return this;
    };

    this.unregisterTriggers = (name, except = []) => {
        for (let i in events[name]) {
            if (except.includes(i)) {
                continue;
            }
            delete events[name][i];
        }
    };

    this.unregisterTrigger = (name, ...list) => {
        if (events[name]) {
            for (let e of list) {
                if (events[name][e]) {
                    delete events[name][e];
                }
            }
        }
    };

    this.registerTrigger = (name, id, callback) => {
        if (Array.isArray(name)) {
            for (let n of name) {
                this.registerTrigger(n, id, callback);
            }
            return;
        }
        console.log(':: register trigger ::', name);
        if (!(name in events)) {
            events[name] = {};
        }
        events[name][id] = callback;
    };

    this.trigger = (name, args, onComplete) => {

        const run = () => {
            if (onComplete) {
                onComplete();
            }
        };

        console.log(':: trigger ::', name, args);
        if (!(name in events)) {
            run();
            return this;
        }

        let submits = events[name] ? Object.keys(events[name]).length : 0;
        if (submits === 0) {
            run();
            return this;
        }

        const runsAtEnd = () => {
            if (!--submits) {
                console.log(':: trigger :: end ::', name);
                run();
            }
        };

        console.log(':: trigger :: init ::', name);

        for (let triggerName in events[name]) {
            if (!events[name][triggerName]) {
                submits--;
                continue;
            }
            console.log(`${name} executing ${triggerName}`);
            events[name][triggerName](args, runsAtEnd);
        }

        return this;
    };

    this.triggered = Promise.promisify((...d) => this.trigger(...d));

    this.registerCall = (name, callback) => {
        console.log(':: register :: ', name);
        this.trigger(`call::register::${name}`);
        calls[name] = callback;
        return this;
    };

    this.listCalls = regex => {
        regex = regex || /.*/;
        for (let key in calls) {
            if (regex.test(key)) {
                console.log(`harlan.call('${key}')`, calls[key]);
            }
        }
    };

    this.reference = name => (...parameters) => this.call(name, ...parameters);

    this.click = (name, ...parameters) => e => {
        e.preventDefault();
        this.call(name, ...parameters);
    };

    this.event = this.click;
    this.preventDefault = this.click;

    this.call = (name, ...parameters) => {
        console.log(':: call ::', name, parameters);
        if (!(name in calls)) {
            console.error(`Failed! ${name} not found.`);
            return null;
        }

        const data = calls[name](...parameters);
        this.trigger(`call::${name}`, parameters);
        return data;
    };

    this.promise = Promise.promisify((...d) => this.call(...d));

    this.run = (cb) => {
        const calls = bootstrapCalls; /* prevent race cond */
        bootstrapCalls = {};

        async.auto(calls, (err, results) => {
            console.log(':: bootstrap ::', err, results);
            this.trigger('bootstrap::end');
            if (cb) cb();
        });
    };

    this.addPlugin = callback => {
        plugins.push(callback);
        return this;
    };

    this.registerTrigger('bootstrap::end', 'plugins', (opts, cb) => {
        this.addPlugin = callback => {
            callback(this);
            return this;
        };

        for (let plugin of plugins) plugin(this);
        plugins = [];
        cb();
    });

    this.registerBootstrap('bootstrap::end', cb => {
        cb();
        this.sync.register(this.confs.syncInterval); /* register sync */
    });

    return this;
};
