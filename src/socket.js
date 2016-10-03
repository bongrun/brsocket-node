var config = require('./config'),
    Client = require('./client'),
    clients = require('./clients'),
    events = require('events'),
    eventSocket = new events.EventEmitter(),
    WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({port: config.SOCKET_PORT}),
    UrlParamsHelper = require('url-params-helper');

eventSocket.setMaxListeners(0);

module.exports.start = function () {
    'use strict';
    wss.on('connection', function (ws) {
        console.log("--------------------------------------");
        console.log('connection');
        var client = new Client(ws);
        client.user.time = UrlParamsHelper.getParam('time', ws.upgradeReq.url);

        clients.addClient(client);

        client.ws.on('message', function (message) {
            console.log('message');
            console.log(message);
            var data = JSON.parse(message);
            eventSocket.emit(data.type, client, data.data, data.id);
        });

        client.ws.on('close', function () {
            console.log('close');
            clients.deleteClient(client);
        });

        client.ws.on('error', function () {
            console.log('error');
            clients.deleteClient(client);
        });

        eventSocket.on('token', function (client, data) {
            client.user.lasttoken = client.user.token;
            client.user.token = data.token;
            var user = client.getUser();
            if (user.userId !== user.lastUserId) {
                if (user.lastUserId) {
                    clients.deleteAuthorized(client, user.lastUserId, user.lasttoken);
                }
                if (user.userId) {
                    clients.addAuthorized(client);
                } else {
                    clients.addNotAuthorized(client);
                }
            }
        });

        eventSocket.on('time', function (client, data) {
            client.user.time = data.time;
            clients.searchMinTime(client);
        });

        eventSocket.on('on', function (client, data) {
            if (data.type) {
                if (typeof client.subscriptions[data.type] === "undefined") {
                    client.subscriptions[data.type] = true;
                }
            }
        });

        eventSocket.on('off', function (client, data) {
            if (data.type) {
                if (typeof client.subscriptions[data.type] !== "undefined") {
                    delete client.subscriptions[data.type];
                }
            }
        });
    });
};

/**
 * Проверка живучестви сокета
 */
module.exports.ping = function () {
    'use strict';
    setInterval(function () {
        for (var key in clients.all) {
            clients.all[key].ws.ping();
        }
    }, config.SOCKET_PING_INTERVAL);
};
