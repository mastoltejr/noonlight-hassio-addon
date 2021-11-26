/*
The MIT License (MIT)
 Original Copyright 2018 Phil Nash
 Modifications and addtions Copyright (c) 2015 Sonos, Inc.
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

 const fs = require('fs');
 const express = require('express');
 const axios = require('axios');

 // Load Configuration
let rawconfig = fs.readFileSync('../../data/options.json');  
let config = JSON.parse(rawconfig);  

console.log("Starting with configuration:", config)
console.log("Environment Variables", JSON.stringify(process.env))

axios.defaults.baseURL = String('http://supervisor/core/');
axios.interceptors.request.use(
    function (request) {
            console.log(
                `${request.method?.toUpperCase()} ${request.url}`,
                request
            );

        if (request.headers === undefined) {
            request.headers = {};
        }

        if (request.headers['Authorization'] === undefined) {
            request.headers[
                'Authorization'
            ] = `Bearer ${process.env['SUPERVISOR_TOKEN']}`;
        }

        request.headers['Content-Type'] = 'application/json';

        return request;
    },
    function (error) {
        return Promise.reject(error);
    }
);

// process.env
// {
//     "npm_config_user_agent":"npm/7.17.0 node/v14.18.1 linux x64 workspaces/false",
//     "HOSTNAME":"eb5264a1-noonlight",
//     "npm_node_execpath":"/usr/bin/node",
//     "SHLVL":"2",
//     "npm_config_noproxy":"",
//     "HOME":"/root",
//     "CWD":"/app",
//     "npm_package_json":"/app/package.json",
//     "npm_config_userconfig":"/root/.npmrc",
//     "S6_CMD_WAIT_FOR_SERVICES":"1",
//     "S6_LOGGING":"0",
//     "COLOR":"0",
//     "npm_config_metrics_registry":"https://registry.npmjs.org/",
//     "_":"/usr/bin/npm",
//     "npm_config_prefix":"/usr/local",
//     "npm_config_cache":"/root/.npm",
//     "HASSIO_TOKEN":"xxxx",
//     "npm_config_node_gyp":"/usr/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js",
//     "PATH":"/app/node_modules/.bin:/node_modules/.bin:/usr/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/node-gyp-bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
//     "NODE":"/usr/bin/node",
//     "npm_package_name":"noonlight",
//     "S6_BEHAVIOUR_IF_STAGE2_FAILS":"2",
//     "LANG":"C.UTF-8",
//     "npm_lifecycle_script":"node server",
//     "npm_package_version":"1.0.6",
//     "npm_lifecycle_event":"server",
//     "npm_config_globalconfig":"/etc/npmrc",
//     "npm_config_init_module":"/root/.npm-init.js",
//     "PWD":"/app",
//     "npm_config_globalignorefile":"/etc/npmignore",
//     "npm_execpath":"/usr/lib/node_modules/npm/bin/npm-cli.js",
//     "npm_command":"run-script",
//     "TZ":"America/Denver",
//     "SUPERVISOR_TOKEN":"xxxxx",
//     "npm_config_python":"/usr/bin/python3",
//     "INIT_CWD":"/app",
//     "EDITOR":"vi"
//  }

// HA API http://supervisor/core/api
// HA WS API http://supervisor/core/websocket

const app = express();
app.use(express.json());

app.get('/test', async (req, res) => {
    console.log('received test request');
    axios.post('api/states/input_text.noonlight_alarm_id',{
        data: {
            "state": `Random Number: ${Math.floor(Math.random()*100)}`
        }
    }).then(resp => {
        console.log('Response from HA', resp.data);
    }).catch(err => console.log(JSON.stringify(err)))

    res.send({'hello': 'hello'})
});

app.listen(5950, () =>
  console.log('Express server is running on localhost:5950')
);