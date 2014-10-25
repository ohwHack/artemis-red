module.exports = function(RED) {

    function MsgDebouncer(config) {

        RED.nodes.createNode(this,config);

        this.on('input', function(msg) {
          if(msg.topic != this.topic || msg.payload != this.payload){
            this.send(msg);
            this.topic = msg.topic;
            this.payload = msg.payload;
          }else{
            this.send(null);
          }

        });

        this.on('close', function() {
        });
    }

    RED.nodes.registerType("msg-debouncer", MsgDebouncer);
}
