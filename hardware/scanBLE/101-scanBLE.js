/**
 * scanBLE.js
 * Scans for a specific Bluetooth 4 (BLE) Device (by Name and UUID)
 * Returns the Name the of Device when found and stops scanning
 * Requires Noble: https://github.com/sandeepmistry/noble
 * Copyright 2013 Charalampos Doukas - @BuildingIoT
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

//might need to modify accordingly
var RED = require(process.env.NODE_RED_HOME+"/red/red");

//import noble
var noble = require('noble');

// The main node definition - most things happen in here
function BleScan(n) {
    // Create a RED node
    RED.nodes.createNode(this,n);

    var msg = {};
    var ble_name;
    var node = this;

    //get name and uuid from user
    this.ble_name = n.ble_name;
    this.ble_uuid = n.ble_uuid;

    this.on("input", function(msg){
        noble.startScanning();
    });

    noble.on('scanStart', function(msg) {
        msg = {};
        msg.topic = node.topic;
        msg.payload = "Scanning initiated..." //debugging
        //console.log('scanning initiated...');
        node.send(msg);
    });

    noble.on('discover', function(peripheral) {
        var msg = {};
        msg.topic = node.topic;
        msg.payload = "not found";

        //check for the device name and the UUID (first one from the UUID list)
        if(peripheral.advertisement.localName==node.ble_name && peripheral.advertisement.serviceUuids[0]==node.ble_uuid) {
            msg.payload=peripheral.advertisement.localName;
            noble.stopScanning();
        }
        node.send(msg);
    });

    this.on("close", function() {
        try { noble.stopScanning(); }
        catch (err) { console.log(err); }
    });
}

// Register the node by name. This must be called before overriding any of the
// Node functions.
RED.nodes.registerType("scanBLE", BleScan);
