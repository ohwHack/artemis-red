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

function ensureString(o) {
    if (Buffer.isBuffer(o)) {
        return o.toString();
    } else if (typeof o === "object") {
        return JSON.stringify(o);
    } else if (typeof o === "string") {
        return o;
    }
    return ""+o;
}

function ensureBuffer(o) {
    if (Buffer.isBuffer(o)) {
        return o;
    } else if (typeof o === "object") {
        o = JSON.stringify(o);
    } else if (typeof o !== "string") {
        o = ""+o;
    }
    return new Buffer(o);
}

module.exports = {
    ensureString: ensureString,
    ensureBuffer: ensureBuffer,
};

