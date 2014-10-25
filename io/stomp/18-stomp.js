/**
 * Copyright 2014 IBM Corp.
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
    var StompClient = require('stomp-client');
    var querystring = require('querystring');

    function StompServerNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.port = n.port;
        this.name = n.name;
        var credentials = RED.nodes.getCredentials(n.id);
        if (credentials) {
            this.username = credentials.user;
            this.password = credentials.password;
        }
    }
    RED.nodes.registerType("stomp-server",StompServerNode);

    RED.httpAdmin.get('/stomp-server/:id',function(req,res) {
        var credentials = RED.nodes.getCredentials(req.params.id);
        if (credentials) {
            res.send(JSON.stringify({user:credentials.user,hasPassword:(credentials.password&&credentials.password!=="")}));
        } else {
            res.send(JSON.stringify({}));
        }
    });

    RED.httpAdmin.delete('/stomp-server/:id',function(req,res) {
        RED.nodes.deleteCredentials(req.params.id);
        res.send(200);
    });

    RED.httpAdmin.post('/stomp-server/:id',function(req,res) {
        var body = "";
        req.on('data', function(chunk) {
            body+=chunk;
        });
        req.on('end', function(){
            var newCreds = querystring.parse(body);
            var credentials = RED.nodes.getCredentials(req.params.id)||{};
            if (newCreds.user == null || newCreds.user === "") {
                delete credentials.user;
            } else {
                credentials.user = newCreds.user;
            }
            if (newCreds.password === "") {
                delete credentials.password;
            } else {
                credentials.password = newCreds.password||credentials.password;
            }
            RED.nodes.addCredentials(req.params.id,credentials);
            res.send(200);
        });
    });


    function StompInNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.topic = n.topic;

        this.serverConfig = RED.nodes.getNode(this.server);
        this.host = this.serverConfig.server;
        this.port = this.serverConfig.port;
        this.userid = this.serverConfig.username;
        this.password = this.serverConfig.password;

        var node = this;
        var msg = {topic:this.topic};
        var closing = false;

        node.client = new StompClient(node.host, node.port, node.userid, node.password, '1.0');
        node.status({fill:"grey",shape:"ring",text:"connecting"});

        var doConnect = function() {
            node.client.connect(function(sessionId) {
                node.status({fill:"green",shape:"dot",text:"connected"});
                node.log('subscribed to: '+node.topic);
                node.client.subscribe(node.topic, function(body, headers) {
                    msg.payload = JSON.parse(body);
                    node.send(msg);
                });
            }, function(error) {
                node.status({fill:"grey",shape:"dot",text:"error"});
                node.warn(error);
            });
        }

        node.client.on("disconnect", function() {
            node.status({fill:"red",shape:"ring",text:"disconnected"});
            if (!closing) {
                setTimeout( function () { doConnect(); }, 15000);
            }
        });

        node.client.on("error", function(error) {
            node.status({fill:"grey",shape:"dot",text:"error"});
            node.log(error);
        });

        doConnect();

        node.on("close", function(done) {
            closing = true;
            if (node.client) {
                node.client.on("disconnect", function() {
                    done();
                });
                //node.client.unsubscribe(node.topic);
                node.client.disconnect();
            } else { done(); }
        });
    }
    RED.nodes.registerType("stomp in",StompInNode);


    function StompOutNode(n) {
        RED.nodes.createNode(this,n);
        this.server = n.server;
        this.topic = n.topic;

        this.serverConfig = RED.nodes.getNode(this.server);
        this.host = this.serverConfig.server;
        this.port = this.serverConfig.port;
        this.userid = this.serverConfig.username;
        this.password = this.serverConfig.password;

        var node = this;
        var msg = {topic:this.topic};
        var closing = false;

        node.client = new StompClient(node.host, node.port, node.userid, node.password, '1.0');
        node.status({fill:"grey",shape:"ring",text:"connecting"});

        node.client.connect( function(sessionId) {
            node.status({fill:"green",shape:"dot",text:"connected"});
        }, function(error) {
            node.status({fill:"grey",shape:"dot",text:"error"});
            node.warn(error);
        });

        node.client.on("disconnect", function() {
            node.status({fill:"red",shape:"ring",text:"disconnected"});
            if (!closing) {
                setTimeout( function () { node.client.connect(); }, 15000);
            }
        });

        node.client.on("error", function(error) {
            node.log(error);
        });

        node.on("input", function(msg) {
            node.client.publish(node.topic || msg.topic, msg.payload);
        });

        node.on("close", function(done) {
            closing = true;
            if (client) { client.disconnect(); }
        });
    }
    RED.nodes.registerType("stomp out",StompOutNode);

}
