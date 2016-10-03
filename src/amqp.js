var amqp = require('amqp'),
    config = require('./config'),
    clients = require('./clients');

module.exports.start = function () {
    'use strict';
    var connection = amqp.createConnection({
        host: config.RABBITMQ_HOST,
        port: config.RABBITMQ_PORT,
        login: config.RABBITMQ_LOGIN,
        password: config.RABBITMQ_PASSWORD,
        connectionTimeout: 10000,
        authMechanism: 'AMQPLAIN',
        vhost: config.RABBITMQ_VHOST,
        noDelay: true,
        durable: true,
        ssl: {
            enabled: false
        }
    });

    // add this for better debuging
    connection.on('error', function (e) {
        console.log("Error from amqp: ", e);
    });

    // Wait for connection to become established.
    connection.on('ready', function () {
        console.log("ready");
        // Use the default 'amq.topic' exchange
        connection.queue(config.RABBITMQ_QUEUE, {durable: true, autoDelete: false}, function (q) {
            console.log("queue");
            q.subscribe(function (message) {
                var data = JSON.parse(message.data.toString('utf8')).job;
                console.log(data);
                clients.sendUser(data.sendType, data.usersIds, data.nowSigned, data.time, data.data);
            });
        });
    });
};