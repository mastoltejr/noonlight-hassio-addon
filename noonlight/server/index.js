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
 try {
    let rawconfig = fs.readFileSync('../../data/options.json');  
    let config = JSON.parse(rawconfig);
 } catch(err){
    console.log('could not load config');
 }
  

//config
//{ NOONLIGHT_TOKEN: '', NOONLIGHT_WEBHOOK_SECRET: '' }

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

axios.interceptors.request.use(
    function (request) {
            console.log(
                `${request.method?.toUpperCase()} ${request.baseURL + request.url}`,
                request.data
            );

        if (request.headers === undefined) {
            request.headers = {};
        }
        const url = String(request.url);
        if(url.startsWith('http://supervisor/core/api')){
            request.headers[
                'Authorization'
            ] = `Bearer ${process.env['SUPERVISOR_TOKEN']}`;
        } else if(url.startsWith('https://api-sandbox.noonlight.com')){
            request.headers[
                'Authorization'
            ] = `Bearer ${config['NOONLIGHT_TOKEN']}`;
        }

        request.headers['Content-Type'] = 'application/json';

        return request;
    },
    function (error) {
        return Promise.reject(error);
    }
);

const app = express();
app.use(express.json());

axios.post('http://supervisor/core/api/states/sensor.noonlight_trigger',{
    "state": "",
    "attributes": {
        "value": "",
        "datetime": ""
    }
});

// Routes

// Create Alarm ID
// HA automation calls on alarm trigger
// input
// location: {
//     address: {line1: '1700 S Monroe St', city: 'Denver', state: 'CO', zip: '80210'}
//   },
//   instructions: {entry: 'The Gate Code'},
//   name: 'Michael Stolte',
//   phone: '7138994043',
//   pin: '9658'

app.get('/createAlarm', async (req, res) => {
    await axios.get('http://supervisor/core/api/states/sensor.noonlight_trigger').then((resp) => {
        console.log(resp.data);
    });
    //console.log(`Body: ${JSON.stringify(req.body)}`);
    // axios.post('https://api-sandbox.noonlight.com/dispatch/v1/alarms',req.data).then(resp => {
    //     const {id, status, created_at, owner_id} = resp.data;

    //     await axios.post('http://supervisor/core/api/states/sensor.noonlight',{
    //         "state": `Contacted Noonlight`,
    //         "attributes": {
    //             "alarm_id": id,
    //             status,
    //             created_at, 
    //             owner_id
    //         }
    //     });


    // });

    res.send(true);
});

// Add Trigger Device to Alarm
// HA automation calls on sensor.noonlight changes to Contacted Noonlight
// input
// {
//     meta: {
//       attribute: 'contact',
//       value: 'open',
//       device_id?: string,
//       device_model: 'Aqara',
//       device_name: 'Kitchen Window',
//       device_manufacturer: 'Aqara',
//       media: string
//     },
//     event_type: 'alarm.device.activated_alarm',
//     event_time: '2021-11-27T14:55:00'
//   }
// door => door_open/door_closed, contact => open/closed, motion => detected/cleared, water_leak => detected/cleared

app.post('/addAlarmTrigger', async (req, res) => {
    axios.post(`https://api-sandbox.noonlight.com/dispatch/v1/alarms/${req.data.alarm_id}/events`)
});

// app.get('/test', async (req, res) => {

//     axios.post('http://supervisor/core/api/states/input_text.noonlight_alarm_id',{
//             "state": `Random Number: ${Math.floor(Math.random()*100)}`
//     }).then(resp => {
//         console.log('Response from HA', resp.data);
//     }).catch(err => console.log(JSON.stringify(err)))

//     res.send({'hello': 'hello'})
// });

app.listen(5950, () =>
  console.log('Express server is running on localhost:5950')
);