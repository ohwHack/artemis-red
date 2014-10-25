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
    var SunCalc = require('suncalc');

    function SunNode(n) {
        RED.nodes.createNode(this,n);
        this.lat = n.lat;
        this.lon = n.lon;
        this.start = n.start;
        this.end = n.end;

        var node = this;
        var oldval = null;

        this.tick = setInterval(function() {
            var now = new Date();
            var hour = now.getUTCHours();
            var mins = now.getUTCMinutes();
            var times = SunCalc.getTimes(now, node.lat, node.lon);
            var hour1 = times[node.start].getUTCHours();
            var mins1 = times[node.start].getUTCMinutes();
            var hour2 = times[node.end].getUTCHours();
            var mins2 = times[node.end].getUTCMinutes();
            var e1 = (hour*60+mins) - (hour1*60+mins1);
            var e2 = (hour*60+mins) - (hour2*60+mins2);
            var moon = parseInt(SunCalc.getMoonIllumination(now).fraction*100+0.5)/100;
            var msg = { payload:0, topic:"sun", moon:moon };
            if ((e1 > 0) & (e2 < 0)) { msg.payload = 1; }
            if (oldval == null) { oldval = msg.payload; }
            if (msg.payload == 1) { node.status({fill:"yellow",shape:"dot",text:"day"}); }
            else { node.status({fill:"blue",shape:"dot",text:"night"}); }
            if (msg.payload != oldval) {
                oldval = msg.payload;
                node.send( [msg,msg] );
            }
            else { node.send(msg); }
        }, 60000);

        this.on("close", function() {
            clearInterval(this.tick);
        });
    }
    RED.nodes.registerType("sunrise",SunNode);
}
