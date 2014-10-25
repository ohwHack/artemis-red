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
    var nodemailer = require("nodemailer");
    var Imap = require('imap');

    //console.log(nodemailer.Transport.transports.SMTP.wellKnownHosts);

    try {
        var globalkeys = RED.settings.email || require(process.env.NODE_RED_HOME+"/../emailkeys.js");
    } catch(err) {
    }

    function EmailNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.name = n.name;
        this.outserver = n.server;
        this.outport = n.port;
        var flag = false;
        if (this.credentials && this.credentials.hasOwnProperty("userid")) {
            this.userid = this.credentials.userid;
        } else {
            if (globalkeys) {
                this.userid = globalkeys.user;
                flag = true;
            } else {
                this.error("No e-mail userid set");
            }
        }
        if (this.credentials && this.credentials.hasOwnProperty("password")) {
            this.password = this.credentials.password;
        } else {
            if (globalkeys) {
                this.password = globalkeys.pass;
                flag = true;
            } else {
                this.error("No e-mail password set");
            }
        }
        if (flag) {
            RED.nodes.addCredentials(n.id,{userid:this.userid, password:this.password, global:true});
        }
        var node = this;

        var smtpTransport = nodemailer.createTransport({
            host: node.outserver,
            port: node.outport,
            secure: true,
            auth: {
                user: node.userid,
                pass: node.password
            }
        });

        this.on("input", function(msg) {
            if (smtpTransport) {
                node.status({fill:"blue",shape:"dot",text:"sending"});
                var payload = RED.util.ensureString(msg.payload);
                smtpTransport.sendMail({
                    from: node.userid, // sender address
                    to: msg.to || node.name, // comma separated list of addressees
                    subject: msg.topic, // subject line
                    text: payload // plaintext body
                }, function(error, info) {
                    if (error) {
                        node.error(error);
                        node.status({fill:"red",shape:"ring",text:"send failed"});
                    } else {
                        node.log("Message sent: " + info.response);
                        node.status({});
                    }
                });
            }
            else { node.warn("No Email credentials found. See info panel."); }
        });
    }
    RED.nodes.registerType("e-mail",EmailNode,{
        credentials: {
            userid: {type:"text"},
            password: {type: "password"},
            global: { type:"boolean"}
        }
    });

    function EmailInNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.repeat = n.repeat * 1000 || 300000;
        this.inserver = n.server || globalkeys.server || "imap.gmail.com";
        this.inport = n.port || globalkeys.port || "993";
        var flag = false;

        if (this.credentials && this.credentials.hasOwnProperty("userid")) {
            this.userid = this.credentials.userid;
        } else {
            if (globalkeys) {
                this.userid = globalkeys.user;
                flag = true;
            } else {
                this.error("No e-mail userid set");
            }
        }
        if (this.credentials && this.credentials.hasOwnProperty("password")) {
            this.password = this.credentials.password;
        } else {
            if (globalkeys) {
                this.password = globalkeys.pass;
                flag = true;
            } else {
                this.error("No e-mail password set");
            }
        }
        if (flag) {
            RED.nodes.addCredentials(n.id,{userid:this.userid, password:this.password, global:true});
        }

        var node = this;
        this.interval_id = null;
        var oldmail = {};

        var imap = new Imap({
            user: node.userid,
            password: node.password,
            host: node.inserver,
            port: node.inport,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: node.repeat,
            authTimeout: node.repeat
        });

        if (!isNaN(this.repeat) && this.repeat > 0) {
            node.log("repeat = "+this.repeat);
            this.interval_id = setInterval( function() {
                node.emit("input",{});
            }, this.repeat );
        }

        this.on("input", function(msg) {
            imap.once('ready', function() {
                node.status({fill:"blue",shape:"dot",text:"fetching"});
                var pay = {};
                imap.openBox('INBOX', true, function(err, box) {
                    if (box.messages.total > 0) {
                        var f = imap.seq.fetch(box.messages.total + ':*', { bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)','TEXT'] });
                        f.on('message', function(msg, seqno) {
                            node.log('message: #'+ seqno);
                            var prefix = '(#' + seqno + ') ';
                            msg.on('body', function(stream, info) {
                                var buffer = '';
                                stream.on('data', function(chunk) {
                                    buffer += chunk.toString('utf8');
                                });
                                stream.on('end', function() {
                                    if (info.which !== 'TEXT') {
                                        pay.from = Imap.parseHeader(buffer).from[0];
                                        pay.topic = Imap.parseHeader(buffer).subject[0];
                                        pay.date = Imap.parseHeader(buffer).date[0];
                                    } else {
                                        var parts = buffer.split("Content-Type");
                                        for (var p = 0; p < parts.length; p++) {
                                            if (parts[p].indexOf("text/plain") >= 0) {
                                                pay.payload = parts[p].split("\n").slice(1,-2).join("\n").trim();
                                            }
                                            if (parts[p].indexOf("text/html") >= 0) {
                                                pay.html = parts[p].split("\n").slice(1,-2).join("\n").trim();
                                            }
                                        }
                                        //pay.body = buffer;
                                    }
                                });
                            });
                            msg.on('end', function() {
                                //node.log('Finished: '+prefix);
                            });
                        });
                        f.on('error', function(err) {
                            node.warn('fetch error: ' + err);
                            node.status({fill:"red",shape:"ring",text:"fetch error"});
                        });
                        f.on('end', function() {
                            if (JSON.stringify(pay) !== oldmail) {
                                node.send(pay);
                                oldmail = JSON.stringify(pay);
                                node.log('received new email: '+pay.topic);
                            }
                            else { node.log('duplicate not sent: '+pay.topic); }
                            //node.status({fill:"green",shape:"dot",text:"ok"});
                            node.status({});
                            imap.end();
                        });
                    }
                    else {
                        node.log("you have achieved inbox zero");
                        //node.status({fill:"green",shape:"dot",text:"ok"});
                        node.status({});
                        imap.end();
                    }
                });
            });
            node.status({fill:"grey",shape:"dot",text:"connecting"});
            imap.connect();
        });

        imap.on('error', function(err) {
            node.log(err);
            node.status({fill:"red",shape:"ring",text:"connect error"});
        });

        this.on("error", function(err) {
            node.log("error: ",err);
        });

        this.on("close", function() {
            if (this.interval_id != null) {
                clearInterval(this.interval_id);
            }
            if (imap) { imap.destroy(); }
        });

        node.emit("input",{});
    }
    RED.nodes.registerType("e-mail in",EmailInNode,{
        credentials: {
            userid: {type:"text"},
            password: {type: "password"},
            global: { type:"boolean"}
        }
    });
}
