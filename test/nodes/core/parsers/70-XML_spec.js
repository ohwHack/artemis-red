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

var should = require("should");
var xmlNode = require("../../../../nodes/core/parsers/70-XML.js");
var helper = require("../../helper.js");

describe('XML node', function() {

    before(function(done) {
        helper.startServer(done);   
    });

    afterEach(function() {
        helper.unload();
    });
    
    it('should be loaded', function(done) {
        var flow = [{id:"xmlNode1", type:"xml", name: "xmlNode" }];
        helper.load(xmlNode, flow, function() {
            var xmlNode1 = helper.getNode("xmlNode1");
            xmlNode1.should.have.property('name', 'xmlNode');
            done();
        });
    });

    it('should convert a valid xml string to a javascript object', function(done) {
        var flow = [{id:"n1",type:"xml",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(xmlNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.payload.should.have.property('employees');
                msg.payload.employees.should.have.property('firstName');
                should.equal(msg.payload.employees.firstName[0], 'John');
                msg.payload.employees.should.have.property('lastName');
                should.equal(msg.payload.employees.lastName[0], 'Smith');
                done();
            });
            var string = '<employees><firstName>John</firstName><lastName>Smith</lastName></employees>';
            n1.receive({payload:string,topic: "bar"});
        });
    });
   
    it('should convert a javascript object to an xml string', function(done) {
        var flow = [{id:"n1",type:"xml",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(xmlNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                console.log(msg.payload);
                var index = msg.payload.indexOf('<employees><firstName>John</firstName><lastName>Smith</lastName></employees>');
                index.should.be.above(-1);
                done();
            });
            var obj = {"employees":{"firstName":["John"],"lastName":["Smith"] }};
            n1.receive({payload:obj,topic: "bar"});
        });
    });
    
    it('should log an error if asked to parse an invalid xml string', function(done) {
        var flow = [{id:"n1",type:"xml",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(xmlNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.on("log", function(msg) {
                should.deepEqual("error", msg.level);
                done();
            });
            n1.receive({payload:'<not valid xml>',topic: "bar"});
        });
    });
    
    it('should log an error if asked to parse something thats not xml or js', function(done) {
        var flow = [{id:"n1",type:"xml",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(xmlNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n1.on("log", function(msg) {
                msg.should.have.property('msg');
                should.deepEqual("This node only handles xml strings or js objects.", msg.msg);
                done();
            });
            n1.receive({payload:1,topic: "bar"});
        });
    });

});
