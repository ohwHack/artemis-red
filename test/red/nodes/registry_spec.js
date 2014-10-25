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
var sinon = require("sinon");
var path = require("path");
var when = require("when");

var RedNodes = require("../../../red/nodes");
var RedNode = require("../../../red/nodes/Node");
var typeRegistry = require("../../../red/nodes/registry");
var events = require("../../../red/events");

afterEach(function() {
    typeRegistry.clear();
});

describe('NodeRegistry', function() {
    
    var resourcesDir = __dirname+ path.sep + "resources" + path.sep;
    
    function stubSettings(s,available) {
        s.available =  function() {return available;}
        s.set = function(s,v) { return when.resolve()},
        s.get = function(s) { return null;}
        return s
    }
    var settings = stubSettings({},false);
    var settingsWithStorage = stubSettings({},true);
    
    it('automatically registers new nodes',function() {
        var testNode = RedNodes.getNode('123');
        should.not.exist(n);
        var n = new RedNode({id:'123',type:'abc'});
        
        var newNode = RedNodes.getNode('123');
        
        should.strictEqual(n,newNode);
    });
    
    it('handles nodes that export a function', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load(resourcesDir + "TestNode1",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode1.js");
            list[0].should.have.property("types",["test-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            var nodeConstructor = typeRegistry.get("test-node-1");
            nodeConstructor.should.be.type("function");
            
            done();
        }).catch(function(e) {
            done(e);
        });
            
    });
    
    
    it('handles nodes that export a function returning a resolving promise', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load(resourcesDir + "TestNode2",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode2.js");
            list[0].should.have.property("types",["test-node-2"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            var nodeConstructor = typeRegistry.get("test-node-2");
            nodeConstructor.should.be.type("function");
            
            done();
        }).catch(function(e) {
            done(e);
        });
            
    });
    
    it('handles nodes that export a function returning a rejecting promise', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load(resourcesDir + "TestNode3",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode3.js");
            list[0].should.have.property("types",["test-node-3"]);
            list[0].should.have.property("enabled",true);
            list[0].should.have.property("err","fail");

            var nodeConstructor = typeRegistry.get("test-node-3");
            (nodeConstructor === null).should.be.true;
            
            done();
        }).catch(function(e) {
            done(e);
        });
            
    });
    
    it('handles files containing multiple nodes', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load(resourcesDir + "MultipleNodes1",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","MultipleNodes1.js");
            list[0].should.have.property("types",["test-node-multiple-1a","test-node-multiple-1b"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            var nodeConstructor = typeRegistry.get("test-node-multiple-1a");
            nodeConstructor.should.be.type("function");

            nodeConstructor = typeRegistry.get("test-node-multiple-1b");
            nodeConstructor.should.be.type("function");
            
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('handles nested directories', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load(resourcesDir + "NestedDirectoryNode",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","NestedNode.js");
            list[0].should.have.property("types",["nested-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('emits type-registered and node-icon-dir events', function(done) {
        var eventEmitSpy = sinon.spy(events,"emit");
        typeRegistry.init(settings);
        typeRegistry.load(resourcesDir + "NestedDirectoryNode",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("name","NestedNode.js");
            list[0].should.have.property("types",["nested-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            eventEmitSpy.callCount.should.equal(2);
            
            eventEmitSpy.firstCall.args[0].should.be.equal("node-icon-dir");
            eventEmitSpy.firstCall.args[1].should.be.equal(
                    resourcesDir + "NestedDirectoryNode" + path.sep + "NestedNode" + path.sep + "icons");

            eventEmitSpy.secondCall.args[0].should.be.equal("type-registered");
            eventEmitSpy.secondCall.args[1].should.be.equal("nested-node-1");
            
            done();
        }).catch(function(e) {
            done(e);
        }).finally(function() {
            eventEmitSpy.restore();
        });
    });
    
    it('rejects a duplicate node type registration', function(done) {
        
        typeRegistry.init(stubSettings({
            nodesDir:[resourcesDir + "TestNode1",resourcesDir + "DuplicateTestNode"]
        },false));
        typeRegistry.load("wontexist",true).then(function() {
            var list = typeRegistry.getNodeList();
            
            list.should.be.an.Array.and.have.lengthOf(2);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode1.js");
            list[0].should.have.property("types",["test-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            list[1].should.have.property("id");
            list[1].id.should.not.equal(list[0].id);
            
            list[1].should.have.property("name","TestNode1.js");
            list[1].should.have.property("types",["test-node-1"]);
            list[1].should.have.property("enabled",true);
            list[1].should.have.property("err");
            /already registered/.test(list[1].err).should.be.true;

            var nodeConstructor = typeRegistry.get("test-node-1");
            // Verify the duplicate node hasn't replaced the original one
            nodeConstructor.name.should.be.equal("TestNode");
            
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('handles nodesDir as a string', function(done) {

        typeRegistry.init(stubSettings({
            nodesDir :resourcesDir + "TestNode1"
        },false));
        typeRegistry.load("wontexist",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("types",["test-node-1"]);
            done();
        }).catch(function(e) {
            done("Loading of non-existing nodesDir should succeed");
        });
            
    });
    
    it('handles invalid nodesDir',function(done) {

        typeRegistry.init(stubSettings({
            nodesDir : "wontexist"
        },false));
        typeRegistry.load("wontexist",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            done();
        }).catch(function(e) {
            done("Loading of non-existing nodesDir should succeed");
        });
    });
    
    it('returns nothing for an unregistered type config', function() {
        typeRegistry.init(settings);
        typeRegistry.load("wontexist",true).then(function(){
            var config = typeRegistry.getNodeConfig("imaginary-shark");
            (config === null).should.be.true;
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('excludes node files listed in nodesExcludes',function(done) {
        typeRegistry.init(stubSettings({
            nodesExcludes: [ "TestNode1.js" ],
            nodesDir:[resourcesDir + "TestNode1",resourcesDir + "TestNode2"]
        },false));
        typeRegistry.load("wontexist",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("types",["test-node-2"]);
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('returns the node configurations', function(done) {
        typeRegistry.init(stubSettings({
            nodesDir:[resourcesDir + "TestNode1",resourcesDir + "TestNode2"]
        },false));
        typeRegistry.load("wontexist",true).then(function() {
            var list = typeRegistry.getNodeList();
            
            var nodeConfigs = typeRegistry.getNodeConfigs();
            
            // TODO: this is brittle...
            nodeConfigs.should.equal("<script type=\"text/x-red\" data-template-name=\"test-node-1\"></script>\n<script type=\"text/x-red\" data-help-name=\"test-node-1\"></script>\n<script type=\"text/javascript\">RED.nodes.registerType('test-node-1',{});</script>\n<style></style>\n<p>this should be filtered out</p>\n<script type=\"text/x-red\" data-template-name=\"test-node-2\"></script>\n<script type=\"text/x-red\" data-help-name=\"test-node-2\"></script>\n<script type=\"text/javascript\">RED.nodes.registerType('test-node-2',{});</script>\n<style></style>\n");
            
            var nodeId = list[0].id;
            var nodeConfig = typeRegistry.getNodeConfig(nodeId);
            nodeConfig.should.equal("<script type=\"text/x-red\" data-template-name=\"test-node-1\"></script>\n<script type=\"text/x-red\" data-help-name=\"test-node-1\"></script>\n<script type=\"text/javascript\">RED.nodes.registerType('test-node-1',{});</script>\n<style></style>\n<p>this should be filtered out</p>\n");
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('stores the node list', function(done) {
        var settings = {
            nodesDir:[resourcesDir + "TestNode1",resourcesDir + "TestNode2",resourcesDir + "TestNode3"],
            available: function() { return true; },
            set: function(s,v) {return when.resolve();},
            get: function(s) { return null;}
        }
        var settingsSave = sinon.spy(settings,"set");
        typeRegistry.init(settings);
        typeRegistry.load("wontexist",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.Array.and.have.length(3);
            
            settingsSave.callCount.should.equal(1);
            settingsSave.firstCall.args[0].should.be.equal("nodes");
            var savedList = settingsSave.firstCall.args[1];
            
            savedList[list[0].id].name == list[0].name;
            savedList[list[1].id].name == list[1].name;
            savedList[list[2].id].name == list[2].name;
            
            savedList[list[0].id].should.not.have.property("err");
            savedList[list[1].id].should.not.have.property("err");
            savedList[list[2].id].should.not.have.property("err");
            
            done();
        }).catch(function(e) {
            done(e);
        }).finally(function() {
            settingsSave.restore();
        });
            
    });
    
    it('allows nodes to be added by filename', function(done) {
        var settings = {
            available: function() { return true; },
            set: function(s,v) {return when.resolve();},
            get: function(s) { return null;}
        }            
        typeRegistry.init(settings);
        typeRegistry.load("wontexist",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            
            typeRegistry.addNode(resourcesDir + "TestNode1/TestNode1.js").then(function(node) {
                list = typeRegistry.getNodeList();
                list[0].should.have.property("id");
                list[0].should.have.property("name","TestNode1.js");
                list[0].should.have.property("types",["test-node-1"]);
                list[0].should.have.property("enabled",true);
                list[0].should.not.have.property("err");
                
                node.should.be.an.Array.and.have.lengthOf(1);
                node.should.eql(list);
                
                done();
            }).catch(function(e) {
                done(e);
            });
            
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('fails to add non-existent filename', function(done) {
        typeRegistry.init(settingsWithStorage);
        typeRegistry.load("wontexist",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            typeRegistry.addNode(resourcesDir + "DoesNotExist/DoesNotExist.js").then(function(nodes) {
                nodes.should.be.an.Array.and.have.lengthOf(1);
                nodes[0].should.have.property("id");
                nodes[0].should.have.property("types",[]);
                nodes[0].should.have.property("err");
                done();
            }).otherwise(function(e) {
                done(e);
            });
            
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('returns node info by type or id', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load(resourcesDir + "TestNode1",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            
            var id = list[0].id;
            var type = list[0].types[0];
            
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode1.js");
            list[0].should.have.property("types",["test-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");
            
            var info = typeRegistry.getNodeInfo(id);
            list[0].should.eql(info);

            var info2 = typeRegistry.getNodeInfo(type);
            list[0].should.eql(info2);
            
            done();
        }).catch(function(e) {
            done(e);
        });
            
    });
    
    
    it('rejects adding duplicate nodes', function(done) {
        typeRegistry.init(settingsWithStorage);
        typeRegistry.load(resourcesDir + "TestNode1",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            
            typeRegistry.addNode({file:resourcesDir + "TestNode1" + path.sep + "TestNode1.js"}).then(function(node) {
                done(new Error("duplicate node loaded"));
            }).otherwise(function(e) {
                var list = typeRegistry.getNodeList();
                list.should.be.an.Array.and.have.lengthOf(1);
                done();
            });
            
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('removes nodes from the registry', function(done) {
        typeRegistry.init(settingsWithStorage);
        typeRegistry.load(resourcesDir + "TestNode1",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode1.js");
            list[0].should.have.property("types",["test-node-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.have.property("loaded",true);

            typeRegistry.getNodeConfigs().length.should.be.greaterThan(0);
            
            var info = typeRegistry.removeNode(list[0].id);
            
            info.should.have.property("id",list[0].id);
            info.should.have.property("enabled",false);
            info.should.have.property("loaded",false);
            
            typeRegistry.getNodeList().should.be.an.Array.and.be.empty;
            typeRegistry.getNodeConfigs().length.should.equal(0);
            
            var nodeConstructor = typeRegistry.get("test-node-1");
            (typeof nodeConstructor).should.be.equal("undefined");
            
            
            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('rejects removing unknown nodes from the registry', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load("wontexist",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;

            
            /*jshint immed: false */
            (function() {
                typeRegistry.removeNode("1234");
            }).should.throw();

            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('scans the node_modules path for node files', function(done) {
        var fs = require("fs");
        var path = require("path");
        
        var eventEmitSpy = sinon.spy(events,"emit");
        var pathJoin = (function() {
            var _join = path.join;
            return sinon.stub(path,"join",function() {
                if (arguments.length  == 3 && arguments[2] == "package.json") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1],arguments[2]);
                }
                if (arguments.length == 2 && arguments[1] == "TestNodeModule") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1]);
                }
                return _join.apply(this,arguments);
            });
        })();
        
        var readdirSync = (function() {
            var originalReaddirSync = fs.readdirSync;
            var callCount = 0;
            return sinon.stub(fs,"readdirSync",function(dir) {
                var result = [];
                if (callCount == 1) {
                    result = originalReaddirSync(resourcesDir + "TestNodeModule" + path.sep + "node_modules");
                }
                callCount++;
                return result;
            });
        })();
        
        typeRegistry.init(settings);
        typeRegistry.load("wontexist",false).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(2);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNodeModule:TestNodeMod1");
            list[0].should.have.property("types",["test-node-mod-1"]);
            list[0].should.have.property("enabled",true);
            list[0].should.not.have.property("err");

            list[1].should.have.property("id");
            list[1].should.have.property("name","TestNodeModule:TestNodeMod2");
            list[1].should.have.property("types",["test-node-mod-2"]);
            list[1].should.have.property("enabled",true);
            list[1].should.have.property("err");
            
            
            eventEmitSpy.callCount.should.equal(2);
            
            eventEmitSpy.firstCall.args[0].should.be.equal("node-icon-dir");
            eventEmitSpy.firstCall.args[1].should.be.equal(
                    resourcesDir + "TestNodeModule" + path.sep+ "node_modules" + path.sep + "TestNodeModule" + path.sep + "icons");

            eventEmitSpy.secondCall.args[0].should.be.equal("type-registered");
            eventEmitSpy.secondCall.args[1].should.be.equal("test-node-mod-1");
            
            done();
        }).catch(function(e) {
            done(e);
        }).finally(function() {
            readdirSync.restore();
            pathJoin.restore();
            eventEmitSpy.restore();
        });
    });
    
    it('allows nodes to be added by module name', function(done) {
        var fs = require("fs");
        var path = require("path");

        var pathJoin = (function() {
            var _join = path.join;
            return sinon.stub(path,"join",function() {
                if (arguments.length  == 3 && arguments[2] == "package.json") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1],arguments[2]);
                }
                if (arguments.length == 2 && arguments[1] == "TestNodeModule") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1]);
                }
                return _join.apply(this,arguments);
            });
        })();
        
        var readdirSync = (function() {
            var originalReaddirSync = fs.readdirSync;
            var callCount = 0;
            return sinon.stub(fs,"readdirSync",function(dir) {
                var result = [];
                if (callCount == 1) {
                    result = originalReaddirSync(resourcesDir + "TestNodeModule" + path.sep + "node_modules");
                }
                callCount++;
                return result;
            });
        })();
        typeRegistry.init(settingsWithStorage);
        typeRegistry.load("wontexist",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            
            typeRegistry.addModule("TestNodeModule").then(function(node) {
                list = typeRegistry.getNodeList();
                list.should.be.an.Array.and.have.lengthOf(2);
                list[0].should.have.property("id");
                list[0].should.have.property("name","TestNodeModule:TestNodeMod1");
                list[0].should.have.property("types",["test-node-mod-1"]);
                list[0].should.have.property("enabled",true);
                list[0].should.not.have.property("err");

                list[1].should.have.property("id");
                list[1].should.have.property("name","TestNodeModule:TestNodeMod2");
                list[1].should.have.property("types",["test-node-mod-2"]);
                list[1].should.have.property("enabled",true);
                list[1].should.have.property("err");
                
                node.should.eql(list);
                
                done();
            }).catch(function(e) {
                done(e);
            });
            
        }).catch(function(e) {
            done(e);
        }).finally(function() {
            readdirSync.restore();
            pathJoin.restore();
        });
    });
    
    
    it('rejects adding duplicate node modules', function(done) {
        var fs = require("fs");
        var path = require("path");

        var pathJoin = (function() {
            var _join = path.join;
            return sinon.stub(path,"join",function() {
                if (arguments.length  == 3 && arguments[2] == "package.json") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1],arguments[2]);
                }
                if (arguments.length == 2 && arguments[1] == "TestNodeModule") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1]);
                }
                return _join.apply(this,arguments);
            });
        })();
        
        var readdirSync = (function() {
            var originalReaddirSync = fs.readdirSync;
            var callCount = 0;
            return sinon.stub(fs,"readdirSync",function(dir) {
                var result = [];
                if (callCount == 1) {
                    result = originalReaddirSync(resourcesDir + "TestNodeModule" + path.sep + "node_modules");
                }
                callCount++;
                return result;
            });
        })();

        typeRegistry.init(settingsWithStorage);
        typeRegistry.load('wontexist',false).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(2);
            typeRegistry.addModule("TestNodeModule").then(function(node) {
                done(new Error("addModule resolved"));
            }).otherwise(function(err) {
                done();
            });
        }).catch(function(e) {
            done(e);
        }).finally(function() {
            readdirSync.restore();
            pathJoin.restore();
        });
    });
    
    
    it('fails to add non-existent module name', function(done) {
        typeRegistry.init(settingsWithStorage);
        typeRegistry.load("wontexist",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            
            typeRegistry.addModule("DoesNotExistModule").then(function(node) {
                done(new Error("ENOENT not thrown"));
            }).otherwise(function(e) {
                e.code.should.eql("MODULE_NOT_FOUND");
                done();
            });
            
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('removes nodes from the registry by module', function(done) {
        var fs = require("fs");
        var path = require("path");

        var pathJoin = (function() {
            var _join = path.join;
            return sinon.stub(path,"join",function() {
                if (arguments.length  == 3 && arguments[2] == "package.json") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1],arguments[2]);
                }
                if (arguments.length == 2 && arguments[1] == "TestNodeModule") {
                    return _join(resourcesDir,"TestNodeModule" + path.sep + "node_modules" + path.sep,arguments[1]);
                }
                return _join.apply(this,arguments);
            });
        })();
        
        var readdirSync = (function() {
            var originalReaddirSync = fs.readdirSync;
            var callCount = 0;
            return sinon.stub(fs,"readdirSync",function(dir) {
                var result = [];
                if (callCount == 1) {
                    result = originalReaddirSync(resourcesDir + "TestNodeModule" + path.sep + "node_modules");
                }
                callCount++;
                return result;
            });
        })();

        typeRegistry.init(settingsWithStorage);
        typeRegistry.load('wontexist',false).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(2);
            var res = typeRegistry.removeModule("TestNodeModule");
            
            res.should.be.an.Array.and.have.lengthOf(2);
            res[0].should.have.a.property("id",list[0].id);
            res[1].should.have.a.property("id",list[1].id);
            
            list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            
            done();
        }).catch(function(e) {
            done(e);
        }).finally(function() {
            readdirSync.restore();
            pathJoin.restore();
        });
            
    });
    
    it('fails to remove non-existent module name', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load("wontexist",true).then(function(){
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            
            /*jshint immed: false */
            (function() {
                typeRegistry.removeModule("DoesNotExistModule");
            }).should.throw();
            
            done();
            
        }).catch(function(e) {
            done(e);
        });
    });
    
    
    it('allows nodes to be enabled and disabled', function(done) {
        typeRegistry.init(settingsWithStorage);
        typeRegistry.load(resourcesDir+path.sep+"TestNode1",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.have.lengthOf(1);
            list[0].should.have.property("id");
            list[0].should.have.property("name","TestNode1.js");
            list[0].should.have.property("enabled",true);
            
            var nodeConfig = typeRegistry.getNodeConfigs();
            nodeConfig.length.should.be.greaterThan(0);
            
            var info = typeRegistry.disableNode(list[0].id);
            info.should.have.property("id",list[0].id);
            info.should.have.property("enabled",false);
            
            var list2 = typeRegistry.getNodeList();
            list2.should.be.an.Array.and.have.lengthOf(1);
            list2[0].should.have.property("enabled",false);
            
            typeRegistry.getNodeConfigs().length.should.equal(0);
            
            var info2 = typeRegistry.enableNode(list[0].id);
            info2.should.have.property("id",list[0].id);
            info2.should.have.property("enabled",true);
            
            var list3 = typeRegistry.getNodeList();
            list3.should.be.an.Array.and.have.lengthOf(1);
            list3[0].should.have.property("enabled",true);
            
            var nodeConfig2 = typeRegistry.getNodeConfigs();
            nodeConfig2.should.eql(nodeConfig);

            done();
        }).catch(function(e) {
            done(e);
        });
    });
    
    it('fails to enable/disable non-existent nodes', function(done) {
        typeRegistry.init(settings);
        typeRegistry.load("wontexist",true).then(function() {
            var list = typeRegistry.getNodeList();
            list.should.be.an.Array.and.be.empty;
            
            /*jshint immed: false */
            (function() {
                    typeRegistry.disableNode("123");
            }).should.throw();
            
            /*jshint immed: false */
            (function() {
                typeRegistry.enableNode("123");
            }).should.throw();
            
            done();
        }).catch(function(e) {
            done(e);
        });
    });
});
