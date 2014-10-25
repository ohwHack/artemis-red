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
var XMPP = require('simple-xmpp');

try { var xmppkey = RED.settings.xmpp || require(process.env.NODE_RED_HOME+"/../xmppkeys.js"); }
catch(err) { }

function XMPPServerNode(n) {
    RED.nodes.createNode(this,n);
    this.server = n.server;
    this.port = n.port;
    this.nickname = n.nickname;
    var credentials = RED.nodes.getCredentials(n.id);
    if (credentials) {
        this.username = credentials.user;
        this.password = credentials.password;
    }
}
RED.nodes.registerType("xmpp-server",XMPPServerNode);

var querystring = require('querystring');

RED.httpAdmin.get('/xmpp-server/:id',function(req,res) {
    var credentials = RED.nodes.getCredentials(req.params.id);
    if (credentials) {
        res.send(JSON.stringify({user:credentials.user,hasPassword:(credentials.password&&credentials.password!=="")}));
    } else if (xmppkey && xmppkey.jid && xmppkey.password) {
        RED.nodes.addCredentials(req.params.id,{user:xmppkey.jid, password:xmppkey.password, global:true});
        credentials = RED.nodes.getCredentials(req.params.id);
        res.send(JSON.stringify({user:credentials.user,global:credentials.global,hasPassword:(credentials.password&&credentials.password!=="")}));
    } else {
        res.send(JSON.stringify({}));
    }
});

RED.httpAdmin.delete('/xmpp-server/:id',function(req,res) {
    RED.nodes.deleteCredentials(req.params.id);
    res.send(200);
});

RED.httpAdmin.post('/xmpp-server/:id',function(req,res) {
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


function XmppInNode(n) {
    RED.nodes.createNode(this,n);
    this.server = n.server;

    this.serverConfig = RED.nodes.getNode(this.server);
    this.host = this.serverConfig.server;
    this.port = this.serverConfig.port;
    this.nick = this.serverConfig.nickname || "Node-RED";
    this.userid = this.serverConfig.username;
    this.password = this.serverConfig.password;

    this.join = n.join || false;
    this.sendAll = n.sendObject;
    this.to = n.to || "";
    var node = this;

    var xmpp = new XMPP.SimpleXMPP();

    xmpp.on('online', function() {
        node.log('connected to '+node.host+":"+node.port);
        node.status({fill:"green",shape:"dot",text:"connected"});
        //xmpp.setPresence('online', node.nick+' online');
        if (node.join) {
            xmpp.join(node.to+'/'+node.nick);
        }
    });

    xmpp.on('chat', function(from, message) {
        var msg = { topic:from, payload:message };
        node.send([msg,null]);
    });

    xmpp.on('groupchat', function(conference, from, message, stamp) {
        var msg = { topic:from, payload:message, room:conference };
        if (from != node.nick) { node.send([msg,null]); }
    });

    //xmpp.on('chatstate', function(from, state) {
        //console.log('%s is currently %s', from, state);
        //var msg = { topic:from, payload:state };
        //node.send([null,msg]);
    //});

    xmpp.on('buddy', function(jid, state, statusText) {
        node.log(jid+" is "+state+" : "+statusText);
        var msg = { topic:jid, payload: { presence:state, status:statusText} };
        node.send([null,msg]);
    });

    xmpp.on('error', function(err) {
        console.error("error",err);
    });

    xmpp.on('close', function(err) {
        node.log('connection closed');
        node.status({fill:"red",shape:"ring",text:"not connected"});
    });

    xmpp.on('subscribe', function(from) {
        xmpp.acceptSubscription(from);
    });

    // Now actually make the connection
    try {
        xmpp.connect({
            jid         : node.userid,
            password    : node.password,
            host        : node.host,
            port        : node.port,
            skipPresence : true,
            reconnect : false
        });
    } catch(e) {
        node.error("Bad xmpp configuration");
        node.status({fill:"red",shape:"ring",text:"not connected"});
    }

    node.on("close", function(done) {
        //xmpp.setPresence('offline');
        if (xmpp.conn) { xmpp.conn.end(); }
        xmpp = null;
        done();
    });
}
RED.nodes.registerType("xmpp in",XmppInNode);

function XmppOutNode(n) {
    RED.nodes.createNode(this,n);
    this.server = n.server;

    this.serverConfig = RED.nodes.getNode(this.server);
    this.host = this.serverConfig.server;
    this.port = this.serverConfig.port;
    this.nick = this.serverConfig.nickname || "Node-RED";
    this.userid = this.serverConfig.username;
    this.password = this.serverConfig.password;

    this.join = n.join || false;
    this.sendAll = n.sendObject;
    this.to = n.to || "";
    var node = this;

    var xmpp = new XMPP.SimpleXMPP();

    xmpp.on('online', function() {
        node.log('connected to '+node.host+":"+node.port);
        node.status({fill:"green",shape:"dot",text:"connected"});
        xmpp.setPresence('online', node.nick+' online');
        if (node.join) {
            xmpp.join(node.to+'/'+node.nick);
        }
    });

    xmpp.on('error', function(err) {
        console.error("error",err);
    });

    xmpp.on('close', function(err) {
        node.log('connection closed');
        node.status({fill:"red",shape:"ring",text:"not connected"});
    });

    xmpp.on('subscribe', function(from) {
        xmpp.acceptSubscription(from);
    });

    // Now actually make the connection
    try {
        xmpp.connect({
            jid         : node.userid,
            password    : node.password,
            host        : node.host,
            port        : node.port,
            skipPresence : true,
            reconnect : false
        });
    } catch(e) {
        node.error("Bad xmpp configuration");
        node.status({fill:"red",shape:"ring",text:"not connected"});
    }

    node.on("input", function(msg) {
        if (msg.presence) {
            if (['away', 'dnd', 'xa','chat'].indexOf(msg.presence) > -1 ) {
                xmpp.setPresence(msg.presence, msg.payload);
            }
            else { node.warn("Can't set presence - invalid value"); }
        }
        else {
            var to = msg.topic;
            if (node.to !== "") { to = node.to; }
            if (node.sendAll) {
                xmpp.send(to, JSON.stringify(msg), node.join);
            }
            else if (msg.payload) {
                if (typeof(msg.payload) === "object") {
                    xmpp.send(to, JSON.stringify(msg.payload), node.join);
                } else {
                    xmpp.send(to, msg.payload.toString(), node.join);
                }
            }
        }
    });

    node.on("close", function() {
        xmpp.setPresence('offline');
        if (xmpp.conn) { xmpp.conn.end(); }
        xmpp = null;
    });
}
RED.nodes.registerType("xmpp out",XmppOutNode);

}
