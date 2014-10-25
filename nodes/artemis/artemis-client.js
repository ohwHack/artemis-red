module.exports = function(RED) {
    var artemisNet = require('./artemisNet'),
        artemisModel = require('./public/javascripts/worldmodel');

    function ArtemisClient(config) {
        RED.nodes.createNode(this,config);
        var node = this;


        this.status({fill:"red", shape:"ring",text:"disconnected"});
        this.server = RED.nodes.getNode(config.server);
        try {
            this.status({fill:"yellow", shape:"ring",text:"connecting"});
            artemisNet.connect(server, 10);
            RegisterNetMsgAndSend('playerUpdate',node);
            RegisterNetMsgAndSend('damcon',node);
            RegisterNetMsgAndSend('playerShipDamage',node);
            RegisterNetMsgAndSend('gameOver',node);
            this.status({fill:"green",shape:"dot",text:"connected"});
        }
        catch(e) {
            this.status({fill:"red", shape:"ring",text:"error"});
            node.warn(e);
        }

        this.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });


        this.on('close', function() {
        	artemisNet.disconnect();
    	});
    }

    function RegisterNetMsgAndSend(messageType,node){
    	artemisNet.on(messageType,function(data){
    		node.status({fill:"green",shape:"dot",text:messageType});
    		msg = {
        		payload: data,
        		topic: messageType
        	};
        	node.send(msg);
    	});
    }

    RED.nodes.registerType("artemis-client",ArtemisClient);
};
