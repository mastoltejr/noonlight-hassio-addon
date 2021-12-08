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
 let rawconfig;
 let config;
 try {
    rawconfig = fs.readFileSync('../../data/options.json');  
    config = JSON.parse(rawconfig);
 } catch(err){
    console.log('could not load config');
 }
  

//config
//{ NOONLIGHT_TOKEN: '', NOONLIGHT_WEBHOOK_SECRET: '' }


// console.log(process.env);
// console.log(config);
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

        console.log(
            `REQUESTING: ${request.method?.toUpperCase()} ${request.url}`,
            String(request.headers['Authorization']).slice(0,15) + '...',
            request.data || ''
        );

        return request;
    },
    function (error) {
        console.log(JSON.stringify(error));
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    function (response) {
            console.log(
                `RECIEVED: ${response.url}`,
                response.data
            );

        return response;
    },
    function (error) {
        console.log(JSON.stringify(error));
        return Promise.reject(error);
    }
);

const app = express();
app.use(express.json());

const timestamp = () => {
    return new Date().toLocaleDateString("en-US",{month: 'numeric', day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"});
}

const event_map = {
    smoke: {
        on: "detected",
        off: "clear",
        default: "detected" 
    },
    camera: {
        default: "unknown"
    },
    lock: {
        lockec: "locked",
        unlocked: "unlocked",
        on: "door_open",
        off: "door_closed",
        default: "door_open"
    },
    contact: {
        on: "open",
        off: "closed",
        open: "open",
        closed: "closed",
        default: "open"
    },
    motion: {
        on: "detected",
        off: "cleared",
        default: "detected"
    },
    network_connection: {
        on: "established",
        off: "lost",
        default: "lost"
    },
    water_leak: {
        on: "detected",
        off: "clear",
        wet: "detected",
        dry: "clear",
        default: "detected"
    },
    freeze: {
        on: "detected",
        off: "cleared",
        default: "detected"
    }
};

axios.post('http://supervisor/core/api/states/sensor.noonlight',{
    "state": ``,
    "attributes": {
        friendly_name: "Noonlight Alarm Status",
        icon: "mdi:alarm-bell",
        alarm_id: '',
        status: '',
        created_at: '', 
        owner_id: ''
    }
});

axios.post('http://supervisor/core/api/states/sensor.noonlight_alarm_owners',{
    "state": '',
    "attributes": {
        friendly_name: "Noonlight Alarm Owners",
        icon: "mdi:account-group",
        ...config.USERS.reduce((obj, user) => ({...obj, [user.name]: ''}),{})
    }
});

let current_alarm_id = '';

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

app.get('/createAlarm', (req, res) => {
    // create Noonlight Alarm
    const user = config.USERS[0];
    axios.post('https://api-sandbox.noonlight.com/dispatch/v1/alarms',{
        name: user.name,
        phone: user.phone,
        pin: user.pin,
        location: {
            address: config.ADDRESS
        },
        services: {
            police: true
        },
        instructions: {
            entry: config.INSTRUCTIONS
        }
    }).then(resp => {
        const {id: alarm_id, status, created_at, owner_id} = resp.data;
        current_alarm_id = alarm_id;
        // update HA Noonlight Sensor
        axios.post('http://supervisor/core/api/states/sensor.noonlight',{
            "state": `Contacted Noonlight`,
            "attributes": {
                friendly_name: "Noonlight Alarm Status",
                icon: "mdi:alarm-bell",
                alarm_id,
                status,
                created_at, 
                owner_id
            }
        });

        // update HA Noonlight Owners
        const ogTimestamp = timestamp();
        axios.post('http://supervisor/core/api/states/sensor.noonlight_alarm_owners',{
            "state": config.USERS[0].name,
            "attributes": {
                friendly_name: "Noonlight Alarm Owners",
                icon: "mdi:account-group",
                [config.USERS[0].name]: ogTimestamp
            }
        });

        // Add additional users to alarm / update HA with results
        if(config.USERS.length > 1){
            axios.post(`https://api-sandbox.noonlight.com/dispatch/v1/alarms/${alarm_id}/people`,
                config.USERS.slice(1).map(user => ({
                    name: user.name, 
                    phone: user.phone, 
                    pin: user.pin
                })))
            .then(() => {
                const newTimestamp = timestamp();
                axios.post('http://supervisor/core/api/states/sensor.noonlight_alarm_owners',{
                    "state": `${config.USERS.length} Users`,
                    "attributes": {
                        friendly_name: "Noonlight Alarm Owners",
                        icon: "mdi:account-group",
                        [config.USERS[0].name]: ogTimestamp,
                        ...config.USERS.slice(1).reduce((obj, user) => ({...obj, [user.name]: newTimestamp}),{})
                    }
                });
            }); 
        }
    });

    res.send(true);
});

// for cameras, have an automation take snapshot https://www.home-assistant.io/integrations/camera#service-snapshot
// have the filename be the alarm_id + trigger.time + entity_id
// save this filename in the home_alarm_event entity_value attribute

app.get('/addAlarmEvent', (req, res) => {
    axios.get('http://supervisor/core/api/states/variable.home_alarm_event').then((resp) => {
        const { event_type, event_time, device_id, device_name, device_manufacturer, entity_id, entity_value, noonlight_recieved} = resp.data.attributes;
        const attribute = config.ENTITY_MAP.find(e => e.entity === entity_id)?.attribute;
        if(attribute !== undefined){
            axios.post(`https://api-sandbox.noonlight.com/dispatch/v1/alarms/${current_alarm_id}/events`,[
                {
                    event_type,
                    event_time,
                    meta: {
                        attribute: attribute,
                        value: event_map[attribute][entity_value],
                        device_id,
                        device_name,
                        device_model,
                        device_manufacturer,
                        media: attribute === 'camera' ? entity_value : undefined
                    }
                }
            ]).then(() => {
                axios.post('http://supervisor/core/api/states/variable.home_alarm_event',{
                    value: resp.data.value,
                    attributes: {
                        ...resp.data.attributes,
                        noonlight_recieved: true
                    }
                });
            }).catch(() => {
                axios.post('http://supervisor/core/api/states/variable.home_alarm_event',{
                    value: `Noonlight did not recieve ${attribute} event`
                })
            });
        } else {
            // post that noonlight was unsuccessful
            axios.post('http://supervisor/core/api/states/variable.home_alarm_event',{
                value: `Noonlight did not recieve ${attribute} event`
            });
        }
        
    });
    res.send(true);
});

app.get('/cancelAlarm', (req, res) => {
    axios.get('http://supervisor/core/api/states/sensor.noonlight').then(resp => {
        const {alarm_id, ...attributes} = resp.data.attributes;    
        axios.post(`https://api-sandbox.noonlight.com/dispatch/v1/alarms/${alarm_id}/status`,{
            status: 'CANCELED',
            pin: config.USERS[0].pin
        }).then(noon => {
            const { status, created_at} = noon.data;
            axios.post('http://supervisor/core/api/states/sensor.noonlight',{
                "state": `Alarm ${status}`,
                "attributes": {
                    alarm_id,
                    status,
                    ...attributes,
                    created_at
                }
            });
            current_alarm_id = '';

            setTimeout(() => {
                axios.get('http://supervisor/core/api/states/sensor.noonlight').then(resp => {
                    const {value} = resp.data;
                    if(value === `Alarm ${status}`){
                        axios.post('http://supervisor/core/api/states/sensor.noonlight',{
                            "state": ``,
                            "attributes": {
                                alarm_id: '',
                                owner_id: '',
                                created_at: '',
                                status: 'Ready'
                            }
                        });
                    }
                });
            },1000*60*5);
        })  
    });
    res.send(true);
})


app.listen(5950, () =>
  console.log('Express server is running on localhost:5950')
);