module.exports = function(RED) {
    var spawn = require('child_process').spawn;


    function VlcPlayer(config) {

        RED.nodes.createNode(this,config);

        this.vlcPath  = config.vlcPath || "/Applications/VLC.app/Contents/MacOS/VLC";
        this.vlcHandle = null;
        if(this.vlcPath == undefined){
            this.vlcPath = "vlc";
        }
        this.sound = config.sound;
        this.repeats = config.repeats;
        
        console.log(config);
        var node = this;
        this.on('input', function(msg) {
            console.log("Vlc handle is: " + this.vlcHandle);
           
            if((this.vlcHandle == null || msg.payload == "on") && msg.payload != "off"){
                if(this.vlcHandle != null){
                    console.log("Killing");
                    this.vlcHandle.kill('SIGKILL');
                    this.vlcHandle = null;
                }
                 console.log("Spawning " + this.vlcPath + " sound " + this.sound);
                  this.status({fill:"red",shape:"dot",text:"Playing"});
                  var options = [this.sound];
                  if(this.repeats){
                      options.push("-R");
                  }
                this.vlcHandle = spawn(this.vlcPath,options);
            }else{
                
                if(this.vlcHandle != null){
                    console.log("Killing");
                    this.vlcHandle.kill('SIGKILL');
                    this.vlcHandle = null;
                }
                this.vlcHandle = null;
            }
            
           // /Applications/VLC.app/Contents/MacOS/VLC alarm.mp3 -R --cvlc
        });

        this.on('close', function() {
        	   if(this.vlcHandle != null){
                    console.log("Killing");
                    this.vlcHandle.kill('SIGKILL');
                    this.vlcHandle = null;
                }
    	});
    }



    RED.nodes.registerType("vlc-player",VlcPlayer);
}