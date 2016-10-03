var config = require('./config'),
    clients = require('./clients'),
    jwt = require('jsonwebtoken');

module.exports = function (ws) {
    'use strict';
    this.ws = ws;
    this.user = {};
    /**
     * Подписки
     * {
     *   'chat:read': 3
     *   'talk:send': null
     * }
     * @type {{}}
     */
    this.subscriptions = {};

    this.getUser = function () {
        var lastUserId = this.user.userId;

        try {
            this.user.userId = jwt.verify(this.user.token, config.JWT_SECRET).sub;
        } catch (err) {
            this.user.userId = null;
        }

        return {
            'websocketKey': this.ws.upgradeReq.headers['sec-websocket-key'],
            'cookie': this.ws.upgradeReq.headers.cookie,
            'token': this.user.token,
            'time': this.user.time > 0 ? parseFloat(this.user.time) : null,
            'userId': this.user.userId,
            'lastUserId': lastUserId,
            'lasttoken': this.user.lasttoken
        };
    };

    this.send = function (time, data, nowSigned) {
        console.log('send');
        if (this.ws.readyState === 1) {
            var dataSend = [];
            if (nowSigned) {
                time = 0;
                var self = this;
                data.forEach(function (item) {
                    var type = item.type + ((typeof item.id !== "undefined" && item.id) ? (':' + item.id) : '');
                    if (typeof self.subscriptions[type] !== "undefined") {
                        if (typeof item.data.time !== "undefined" &&  item.data.time > time ) {
                            time = item.data.time;
                        }
                        dataSend.push(item);
                    }
                });
            } else {
                dataSend = data;
            }
            if (dataSend.length) {
                this.ws.send(JSON.stringify({
                    time: time,
                    data: dataSend
                }));
                clients.searchMinTime(this);
            }
        }
    };
};