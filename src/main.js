var socket = require('./socket'),
    amqp = require('./amqp');

socket.start();
socket.ping();

amqp.start();
