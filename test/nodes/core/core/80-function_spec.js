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
var functionNode = require("../../../../nodes/core/core/80-function.js");
var helper = require("../../helper.js");

describe('function node', function() {

    before(function(done) {
        helper.startServer(done);
    });
    
    afterEach(function() {
        helper.unload();
    });

    it('should be loaded', function(done) {
        var flow = [{id:"n1", type:"function", name: "function" }];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'function');
            done();
        });
    });

    it('should send returned message', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should pass through _topic', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return msg;"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property('topic', 'bar');
                msg.should.have.property('payload', 'foo');
                msg.should.have.property('_topic', 'baz');
                done();
            });
            n1.receive({payload:"foo",topic: "bar", _topic: "baz"});
        });
    });

    it('should send to multiple outputs', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"],["n3"]],
                     func:"return [{payload: '1'},{payload: '2'}];"},
                    {id:"n2", type:"helper"}, {id:"n3", type:"helper"} ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            var count = 0;
            n2.on("input", function(msg) {
                should(msg).have.property('payload', '1');
                count++;
                if (count == 2) {
                    done();
                }
            });
            n3.on("input", function(msg) {
                should(msg).have.property('payload', '2');
                count++;
                if (count == 2) {
                    done();
                }
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should send to multiple messages', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],
                     func:"return [[{payload: 1},{payload: 2}]];"},
                    {id:"n2", type:"helper"} ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var count = 0;
            n2.on("input", function(msg) {
                count++;
                should(msg).have.property('payload', count);
                should(msg).have.property('_topic', 'baz');
                if (count == 2) {
                    done();
                }
            });
            n1.receive({payload:"foo", topic: "bar", _topic:"baz"});
        });
    });

    it('should allow input to be discarded by returning null', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"return null"},
                    {id:"n2", type:"helper"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            setTimeout(function() {
                done();
            }, 200);
            n2.on("input", function(msg) {
                should.fail(null,null,"unexpected message");
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

    it('should handle and log script error', function(done) {
        var flow = [{id:"n1",type:"function",wires:[["n2"]],func:"retunr"}];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            n1.on("log", function(msg) {
                msg.should.have.property('level', 'error');
                msg.should.have.property('id', 'n1');
                msg.should.have.property('type', 'function');
                msg.should.have.property('msg', 'ReferenceError: retunr is not defined');
                done();
            });
            n1.receive({payload:"foo",topic: "bar"});
        });
    });

});
