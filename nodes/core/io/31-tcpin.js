/**
 * Copyright 2013,2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var reconnectTime = RED.settings.socketReconnectTime||10000;
    var socketTimeout = RED.settings.socketTimeout||null;
    var net = require('net');

    var connectionPool = {};

    function TcpIn(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port * 1;
        this.topic = n.topic;
        this.stream = (!n.datamode||n.datamode=='stream'); /* stream,single*/
        this.datatype = n.datatype||'buffer'; /* buffer,utf8,base64 */
        this.newline = (n.newline||"").replace("\\n","\n").replace("\\r","\r");
        this.base64 = n.base64;
        this.server = (typeof n.server == 'boolean')?n.server:(n.server == "server");
        this.closing = false;
        var node = this;
        var count = 0;

        if (!node.server) {
            var buffer = null;
            var client;
            var reconnectTimeout;
            var end = false;
            var setupTcpClient = function() {
                node.log("connecting to "+node.host+":"+node.port);
                node.status({fill:"grey",shape:"dot",text:"connecting"});
                var id = (1+Math.random()*4294967295).toString(16);
                client = net.connect(node.port, node.host, function() {
                    buffer = (node.datatype == 'buffer')? new Buffer(0):"";
                    node.log("connected to "+node.host+":"+node.port);
                    node.status({fill:"green",shape:"dot",text:"connected"});
                });
                connectionPool[id] = client;

                client.on('data', function (data) {
                    if (node.datatype != 'buffer') {
                        data = data.toString(node.datatype);
                    }
                    if (node.stream) {
                        if ((node.datatype) === "utf8" && node.newline != "") {
                            buffer = buffer+data;
                            var parts = buffer.split(node.newline);
                            for (var i = 0;i<parts.length-1;i+=1) {
                                var msg = {topic:node.topic, payload:parts[i]};
                                msg._session = {type:"tcp",id:id};
                                node.send(msg);
                            }
                            buffer = parts[parts.length-1];
                        } else {
                            var msg = {topic:node.topic, payload:data};
                            msg._session = {type:"tcp",id:id};
                            node.send(msg);
                        }
                    } else {
                        if ((typeof data) === "string") {
                            buffer = buffer+data;
                        } else {
                            buffer = Buffer.concat([buffer,data],buffer.length+data.length);
                        }
                    }
                });
                client.on('end', function() {
                    if (!node.stream || (node.datatype == "utf8" && node.newline != "" && buffer.length > 0)) {
                        var msg = {topic:node.topic,payload:buffer};
                        msg._session = {type:"tcp",id:id};
                        if (buffer.length !== 0) {
                            end = true; // only ask for fast re-connect if we actually got something
                            node.send(msg);
                        }
                        buffer = null;
                    }
                });
                client.on('close', function() {
                    delete connectionPool[id];
                    node.status({fill:"red",shape:"ring",text:"disconnected"});
                    if (!node.closing) {
                        if (end) { // if we were asked to close then try to reconnect once very quick.
                            end = false;
                            reconnectTimeout = setTimeout(setupTcpClient, 20);
                        }
                        else {
                            node.log("connection lost to "+node.host+":"+node.port);
                            reconnectTimeout = setTimeout(setupTcpClient, reconnectTime);
                        }
                    }
                });
                client.on('error', function(err) {
                    node.log(err);
                });
            }
            setupTcpClient();

            this.on('close', function() {
                this.closing = true;
                client.end();
                clearTimeout(reconnectTimeout);
            });
        } else {
            var server = net.createServer(function (socket) {
                if (socketTimeout !== null) { socket.setTimeout(socketTimeout); }
                var id = (1+Math.random()*4294967295).toString(16);
                connectionPool[id] = socket;
                node.status({text:++count+" connections"});

                var buffer = (node.datatype == 'buffer')? new Buffer(0):"";
                socket.on('data', function (data) {
                    if (node.datatype != 'buffer') {
                        data = data.toString(node.datatype);
                    }
                    if (node.stream) {
                        if ((typeof data) === "string" && node.newline != "") {
                            buffer = buffer+data;
                            var parts = buffer.split(node.newline);
                            for (var i = 0;i<parts.length-1;i+=1) {
                                var msg = {topic:node.topic, payload:parts[i],ip:socket.remoteAddress,port:socket.remotePort};
                                msg._session = {type:"tcp",id:id};
                                node.send(msg);
                            }
                            buffer = parts[parts.length-1];
                        } else {
                            var msg = {topic:node.topic, payload:data};
                            msg._session = {type:"tcp",id:id};
                            node.send(msg);
                        }
                    } else {
                        if ((typeof data) === "string") {
                            buffer = buffer+data;
                        } else {
                            buffer = Buffer.concat([buffer,data],buffer.length+data.length);
                        }
                    }
                });
                socket.on('end', function() {
                    if (!node.stream || (node.datatype === "utf8" && node.newline !== "")) {
                        if (buffer.length > 0) {
                            var msg = {topic:node.topic,payload:buffer};
                            msg._session = {type:"tcp",id:id};
                            node.send(msg);
                        }
                        buffer = null;
                    }
                });
                socket.on('timeout', function() {
                    node.log('timeout closed socket port '+node.port);
                    socket.end();
                });
                socket.on('close', function() {
                    delete connectionPool[id];
                    node.status({text:--count+" connections"});
                });
                socket.on('error',function(err) {
                    node.log(err);
                });
            });
            server.on('error', function(err) {
                if (err) {
                    node.error('unable to listen on port '+node.port+' : '+err);
                }
            });
            server.listen(node.port, function(err) {
                if (err) {
                    node.error('unable to listen on port '+node.port+' : '+err);
                } else {
                    node.log('listening on port '+node.port);

                    node.on('close', function() {
                        node.closing = true;
                        server.close();
                        node.log('stopped listening on port '+node.port);
                    });
                }
            });
        }

    }
    RED.nodes.registerType("tcp in",TcpIn);

    function TcpOut(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port * 1;
        this.base64 = n.base64;
        this.doend = n.end || false;
        this.beserver = n.beserver;
        this.name = n.name;
        this.closing = false;
        var node = this;

        if (!node.beserver||node.beserver=="client") {
            var reconnectTimeout;
            var client = null;
            var connected = false;
            var end = false;

            var setupTcpClient = function() {
                node.log("connecting to "+node.host+":"+node.port);
                node.status({fill:"grey",shape:"dot",text:"connecting"});
                client = net.connect(node.port, node.host, function() {
                    connected = true;
                    node.log("connected to "+node.host+":"+node.port);
                    node.status({fill:"green",shape:"dot",text:"connected"});
                });
                client.on('error', function (err) {
                    node.log('error : '+err);
                });
                client.on('end', function (err) {
                });
                client.on('close', function() {
                    node.status({fill:"red",shape:"ring",text:"disconnected"});
                    connected = false;
                    client.destroy();
                    if (!node.closing) {
                        if (end) {
                            end = false;
                            reconnectTimeout = setTimeout(setupTcpClient,20);
                        }
                        else {
                            node.log("connection lost to "+node.host+":"+node.port);
                            reconnectTimeout = setTimeout(setupTcpClient,reconnectTime);
                        }
                    }
                });
            }
            setupTcpClient();

            node.on("input", function(msg) {
                if (connected && msg.payload != null) {
                    if (Buffer.isBuffer(msg.payload)) {
                        client.write(msg.payload);
                    } else if (typeof msg.payload === "string" && node.base64) {
                        client.write(new Buffer(msg.payload,'base64'));
                    } else {
                        client.write(new Buffer(""+msg.payload));
                    }
                    if (node.doend === true) {
                        end = true;
                        client.end();
                    }
                }
            });

            node.on("close", function() {
                this.closing = true;
                client.end();
                clearTimeout(reconnectTimeout);
            });

        } else if (node.beserver == "reply") {
            node.on("input",function(msg) {
                if (msg._session && msg._session.type == "tcp") {
                    var client = connectionPool[msg._session.id];
                    if (client) {
                        if (Buffer.isBuffer(msg.payload)) {
                            client.write(msg.payload);
                        } else if (typeof msg.payload === "string" && node.base64) {
                            client.write(new Buffer(msg.payload,'base64'));
                        } else {
                            client.write(new Buffer(""+msg.payload));
                        }
                    }
                }
            });
        } else {
            var connectedSockets = [];
            node.status({text:"0 connections"});
            var server = net.createServer(function (socket) {
                if (socketTimeout !== null) { socket.setTimeout(socketTimeout); }
                var remoteDetails = socket.remoteAddress+":"+socket.remotePort;
                node.log("connection from "+remoteDetails);
                connectedSockets.push(socket);
                node.status({text:connectedSockets.length+" connections"});
                socket.on('timeout', function() {
                    node.log('timeout closed socket port '+node.port);
                    socket.end();
                });
                socket.on('close',function() {
                    node.log("connection closed from "+remoteDetails);
                    connectedSockets.splice(connectedSockets.indexOf(socket),1);
                    node.status({text:connectedSockets.length+" connections"});
                });
                socket.on('error',function() {
                    node.log("socket error from "+remoteDetails);
                    connectedSockets.splice(connectedSockets.indexOf(socket),1);
                    node.status({text:connectedSockets.length+" connections"});
                });
            });

            node.on("input", function(msg) {
                if (msg.payload != null) {
                    var buffer;
                    if (Buffer.isBuffer(msg.payload)) {
                        buffer = msg.payload;
                    } else if (typeof msg.payload === "string" && node.base64) {
                        buffer = new Buffer(msg.payload,'base64');
                    } else {
                        buffer = new Buffer(""+msg.payload);
                    }
                    for (var i = 0; i<connectedSockets.length;i+=1) {
                        if (node.doend === true) { connectedSockets[i].end(buffer); }
                        else { connectedSockets[i].write(buffer); }
                    }
                }
            });

            server.on('error', function(err) {
                if (err) {
                    node.error('unable to listen on port '+node.port+' : '+err);
                }
            });

            server.listen(node.port, function(err) {
                if (err) {
                    node.error('unable to listen on port '+node.port+' : '+err);
                } else {
                    node.log('listening on port '+node.port);
                    node.on('close', function() {
                        server.close();
                        node.log('stopped listening on port '+node.port);
                    });
                }
            });
        }
    }
    RED.nodes.registerType("tcp out",TcpOut);

    function TcpGet(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.port = Number(n.port);
        this.out = n.out;
        this.splitc = n.splitc;

        if (this.out != "char") { this.splitc = Number(this.splitc); }
        else { this.splitc.replace("\\n","\n").replace("\\r","\r").replace("\\t","\t").replace("\\e","\e").replace("\\f","\f").replace("\\0","\0"); }

        var buf;
        if (this.out == "count") { buf = new Buffer(this.splitc); }
        else { buf = new Buffer(32768); } // set it to 32k... hopefully big enough for most.... but only hopefully

        this.connected = false;
        var node = this;
        var client;

        this.on("input", function(msg) {
            var i = 0;
            if ((!Buffer.isBuffer(msg.payload)) && (typeof msg.payload !== "string")) {
                msg.payload = msg.payload.toString();
            }
            if (!node.connected) {
                client = net.Socket();
                client.setTimeout(socketTimeout);
                node.status({});
                client.connect(node.port, node.server, function() {
                    //node.log('client connected');
                    node.status({fill:"green",shape:"dot",text:"connected"});
                    node.connected = true;
                    client.write(msg.payload);
                });

                client.on('data', function(data) {
                    //node.log("data:"+ data.length+":"+ data);
                    if (node.splitc === 0) {
                        node.send({"payload": data});
                    }
                    else if (node.out === "sit") { // if we are staying connected just send the buffer
                        node.send({"payload": data});
                    }
                    else {
                        for (var j = 0; j < data.length; j++ ) {
                            if (node.out === "time")  {
                                // do the timer thing
                                if (node.tout) {
                                    i += 1;
                                    buf[i] = data[j];
                                }
                                else {
                                    node.tout = setTimeout(function () {
                                        node.tout = null;
                                        var m = new Buffer(i+1);
                                        buf.copy(m,0,0,i+1);
                                        node.send({"payload": m});
                                        client.end();
                                        m = null;
                                    }, node.splitc);
                                    i = 0;
                                    buf[0] = data[j];
                                }
                            }
                            // count bytes into a buffer...
                            else if (node.out == "count") {
                                buf[i] = data[j];
                                i += 1;
                                if ( i >= node.serialConfig.count) {
                                    node.send({"payload": buf});
                                    client.end();
                                    i = 0;
                                }
                            }
                            // look for a char
                            else {
                                buf[i] = data[j];
                                i += 1;
                                if (data[j] == node.splitc) {
                                    var m = new Buffer(i);
                                    buf.copy(m,0,0,i);
                                    node.send({"payload": m});
                                    client.end();
                                    m = null;
                                    i = 0;
                                }
                            }
                        }
                    }
                });

                client.on('end', function() {
                    //node.log('client disconnected');
                    node.connected = false;
                    node.status({});
                    client = null;
                });

                client.on('error', function() {
                    node.log('connect failed');
                    node.status({fill:"red",shape:"ring",text:"error"});
                    if (client) { client.end(); }
                });

                client.on('timeout',function() {
                    node.log('connect timeout');
                    if (client) {
                        client.end();
                        setTimeout(function() {
                            client.connect(node.port, node.server, function() {
                                //node.log('client connected');
                                node.connected = true;
                                client.write(msg.payload);
                            });
                        },reconnectTime);
                    }
                });
            }
            else { client.write(msg.payload); }
        });

        this.on("close", function() {
            if (client) { buf = null; client.end(); }
        });

    }
    RED.nodes.registerType("tcp request",TcpGet);
}
