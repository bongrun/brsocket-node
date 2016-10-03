var _ = require('lodash');

module.exports.all = {};
module.exports.authorized = {};
module.exports.notAuthorized = {};

/**
 * Всем
 * @type {string}
 */
var SEND_TYPE_ALL = 'all';
/**
 * Всем авторизированным пользователям
 * @type {string}
 */
var SEND_TYPE_AUTHORIZED = 'authorized';
/**
 * Всем не авторизорованным пользователям
 * @type {string}
 */
var SEND_TYPE_NOT_AUTHORIZED = 'not_authorized';
/**
 * Только из списка указанным пользователей
 * @type {string}
 */
var SEND_TYPE_ON_THE_LIST = 'on_the_list';

module.exports.sendUser = function (sendType, usersIds, nowSigned, time, data) {
    'use strict';
    console.log('sendUser');
    var clients = [];
    switch (sendType) {
        case SEND_TYPE_ALL:
            clients = module.exports.all;
            break;
        case SEND_TYPE_AUTHORIZED:
            for (var userId in module.exports.authorized) {
                if (_.has(module.exports.authorized, [userId, 'devices'])) {
                    for (var key in module.exports.authorized[userId].devices) {
                        if (_.has(module.exports.authorized, [userId, 'devices', key, 'tabs'])) {
                            for (var key2 in module.exports.authorized[userId].devices[key].tabs) {
                                clients.push(module.exports.authorized[userId].devices[key].tabs[key2]);
                            }
                        }
                    }
                }
            }
            break;
        case SEND_TYPE_NOT_AUTHORIZED:
            clients = module.exports.notAuthorized;
            break;
        case SEND_TYPE_ON_THE_LIST:
            if (typeof usersIds !== "undefined" && _.isArray(usersIds)) {
                usersIds.forEach(function (userId) {
                    if (_.has(module.exports.authorized, [userId, 'devices'])) {
                        for (var key in module.exports.authorized[userId].devices) {
                            if (_.has(module.exports.authorized, [userId, 'devices', key, 'tabs'])) {
                                for (var key2 in module.exports.authorized[userId].devices[key].tabs) {
                                    clients.push(module.exports.authorized[userId].devices[key].tabs[key2]);
                                }
                            }
                        }
                    }
                });
            } else {
                return false;
            }
            break;
        default: return false;
    }
    clients.forEach(function(client){
        client.send(time, data, nowSigned);
    });
};

/**
 * Добавление пользователя
 * @param client
 */
module.exports.addClient = function (client) {
    'use strict';
    console.log('addClient');
    module.exports.all[client.getUser().websocketKey] = client;
    if (client.getUser().userId) {
        module.exports.addAuthorized(client);
    } else {
        module.exports.addNotAuthorized(client);
    }
};


/**
 * Добавление авторизационого пользователя
 * @param client
 */
module.exports.addAuthorized = function (client) {
    'use strict';
    console.log('addAuthorized');
    module.exports.deleteNotAuthorized(client);
    if (typeof module.exports.authorized[client.getUser().userId] === "undefined") {
        module.exports.authorized[client.getUser().userId] = {
            'devices': {},
            'minTime': client.getUser().time
        };
    } else {
        if (module.exports.authorized[client.getUser().userId].minTime > client.getUser().time) {
            module.exports.authorized[client.getUser().userId].minTime = client.getUser().time;
        }
    }
    if (typeof module.exports.authorized[client.getUser().userId].devices[client.getUser().token] === "undefined") {
        module.exports.authorized[client.getUser().userId].devices[client.getUser().token] = {
            'tabs': {},
            'minTime': client.getUser().time
        };
    } else {
        if (module.exports.authorized[client.getUser().userId].devices[client.getUser().token].minTime > client.getUser().time) {
            module.exports.authorized[client.getUser().userId].devices[client.getUser().token].minTime = client.getUser().time;
        }
    }
    module.exports.authorized[client.getUser().userId].devices[client.getUser().token].tabs[client.getUser().websocketKey] = client;
};

/**
 * Добавление не авторизационого пользователя
 * @param client
 */
module.exports.addNotAuthorized = function (client) {
    'use strict';
    console.log('addNotAuthorized');
    module.exports.deleteAuthorized(client);
    module.exports.notAuthorized[client.getUser().websocketKey] = client;
};

/**
 * Удаление авторизационого пользователя
 * @param client
 * @param userId
 * @param token
 */
module.exports.deleteAuthorized = function (client, userId, token) {
    'use strict';
    console.log('deleteAuthorized');
    if (typeof userId === "undefined") {
        userId = client.getUser().userId;
    }
    if (typeof token === "undefined") {
        token = client.getUser().token;
    }
    if (_.has(module.exports.authorized, [userId, 'devices', token, 'tabs', client.getUser().websocketKey])) {
        delete module.exports.authorized[userId].devices[token].tabs[client.getUser().websocketKey];
        if (Object.keys(module.exports.authorized[userId].devices[token].tabs).length === 0) {
            delete module.exports.authorized[userId].devices[token];
        }
        if (Object.keys(module.exports.authorized[userId].devices).length === 0) {
            delete module.exports.authorized[userId];
        }
        module.exports.searchMinTime(client, userId);
    }
};

/**
 * Удаление не авторизационого пользователя
 * @param client
 */
module.exports.deleteNotAuthorized = function (client) {
    'use strict';
    console.log('deleteNotAuthorized');
    delete module.exports.notAuthorized[client.getUser().websocketKey];
};

/**
 * Удаление пользователя
 * @param client
 */
module.exports.deleteClient = function (client) {
    'use strict';
    console.log('deleteClient');
    delete module.exports.all[client.getUser().websocketKey];
    if (client.getUser().userId) {
        module.exports.deleteAuthorized(client);
    } else {
        module.exports.deleteNotAuthorized(client);
    }
};

module.exports.searchMinTime = function (client, userId) {
    'use strict';
    console.log('searchMinTime');
    if (typeof userId === "undefined") {
        userId = client.getUser().userId;
    }
    if (client.getUser().userId && typeof module.exports.authorized[userId] !== "undefined" && typeof module.exports.authorized[userId].devices !== "undefined") {
        var devicesTimes = [];
        for (var key1 in module.exports.authorized[userId].devices) {
            var tabsTimes = [];
            if (module.exports.authorized[userId].devices[key1].tabs) {
                for (var key2 in module.exports.authorized[userId].devices[key1].tabs) {
                    tabsTimes.push(module.exports.authorized[userId].devices[key1].tabs[key2].time);
                    devicesTimes.push(module.exports.authorized[userId].devices[key1].tabs[key2].time);
                }
                module.exports.authorized[userId].devices[key1].minTime = Math.min.apply(Math, tabsTimes);
            } else {
                if (typeof module.exports.authorized[userId].devices[key1].minTime !== "undefined") {
                    module.exports.authorized[userId].devices[key1].minTime = null;
                }
            }
        }
        module.exports.authorized[userId].minTime = Math.min.apply(Math, devicesTimes);
    } else {
        if (_.has(module.exports.authorized, [userId, 'minTime'])) {
            module.exports.authorized[userId].minTime = null;
        }
    }
};