module.exports = function(RED) {
    var express = require('express')
  , opener  = require('opener')
  , routes  = require('./routes')
  , artemisNet = require('./artemisNet')
  , artemisModel = require('./public/javascripts/worldmodel');

    function ArtemisClient(config) {
        RED.nodes.createNode(this,config);
        artemisNet.connect("192.168.0.105", 10);
        this.status({fill:"green",shape:"dot",text:"connected"});
        var node = this;
        this.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });

        RegisterNetMsgAndSend('playerUpdate',node);
        RegisterNetMsgAndSend('damcon',node);
        RegisterNetMsgAndSend('playerShipDamage',node);
        RegisterNetMsgAndSend('gameOver',node);

        this.on('close', function() {
        	artemisNet.disconnect();
    	});
    }

    function RegisterNetMsgAndSend(messageType,node){
    	artemisNet.on(messageType,function(data){
    		msg = {
        		payload: data,
        		topic: messageType
        	};
        	node.send(msg);
    	});
    }

    RED.nodes.registerType("artemis-client",ArtemisClient);
}