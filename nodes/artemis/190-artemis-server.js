module.exports = function(RED) {
    function ArtemisServerNode(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port;
    }
    RED.nodes.registerType("artemis-server",ArtemisServerNode);
};
