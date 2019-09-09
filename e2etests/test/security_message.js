// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';


var ModuleTestHelper = require('./module_test_helper.js');
//var EventHubReceiverHelper = require('./eventhub_receiver_helper');
var Rendezvous = require('./rendezvous_helper.js').Rendezvous;
var Message = require('azure-iot-common').Message;
//var assert = require('chai').assert;
var debug = require('debug')('e2etests:module-messaging');
var Amqp = require('azure-iot-device-amqp').Amqp;
var AmqpWs = require('azure-iot-device-amqp').AmqpWs;
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var MqttWs = require('azure-iot-device-mqtt').MqttWs;
var LogAnalyticsHelper = require('./log_analytics_helper.js');
var uuid = require('uuid');

var transportsToTest = [ Amqp, AmqpWs, Mqtt, MqttWs ];

describe('security messaging', function() {
  this.timeout(1700*1000);

  transportsToTest.forEach(function(Transport) {
    describe('using ' + Transport.name, function() {
      var testModule = {};

      before(function(done) {
        debug('using ModuleTestHelper to create modules');
        ModuleTestHelper.createModule(testModule, Transport, function(err) {
          debug('ModuleTestHelper.createModule returned ' + (err ? err : 'success'));
          done(err);
        });
      });

      after(function(done) {
        debug('using ModuleTestHelper to clean up after tests');
        ModuleTestHelper.cleanUpAfterTest(testModule, function(err) {
          debug('ModuleTestHelper.cleanUpAfterTest returned ' + (err ? err : 'success'));
          done(err);
        });
      });

      it ('Can send from module to service', function(testCallback) {
        var dateTime = new Date();
        
        var agentId = uuid.v4();
        var eventId = uuid.v4();
        var securityMessage = {
          "AgentVersion": "0.0.1",
          "AgentId": agentId,
          "MessageSchemaVersion": "1.0",
          "Events":[ 
            {
              "EventType": "Security",
              "Category": "Periodic",
              "Name": "ListeningPorts",
              "IsEmpty": true,
              "PayloadSchemaVersion": "1.0",
              "Id": eventId,
              "TimestampLocal": dateTime.toISOString(),
              "TimestampUTC": dateTime.toISOString(),
              "Payload": []
            }
          ]
        };

        debug('sending message');
        var msg = new Message(JSON.stringify(securityMessage));
        msg.setAsSecurityMessage();
        testModule.deviceClient.sendEvent(msg, function(err) {
          if (err) {
            debug('module send event returned ' + err);
            testCallback(err);
          } else {
            debug('module send event completed without error');
          }
        });

        LogAnalyticsHelper.waitForMessage(testModule.deviceId, eventId, 300000, testCallback);
      });
    });
  });
});



