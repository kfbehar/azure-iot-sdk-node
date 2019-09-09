// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var AuthenticationContext = require('adal-node').AuthenticationContext;
const request = require('request');
var needle = require('needle');
//var fs = require('fs');
var rp = require('request-promise-native');

//Azure Log Analytics API version
const  logAnalyticsApiVersion = "v1";
const pollingInterval = 60 * 1000; 
const timeout = 1800 * 1000;

var workspaceId = process.env.LOG_ANALYTICS_WORKSPACE_ID;
var aadTenant = process.env.LOG_ANALYTICS_AAD_TENANT;
var appId = process.env.LOG_ANALYTICS_APP_ID;
var appCertificate = process.env.LOG_ANALYTICS_APP_CERT;;
var certThumbprint = process.env.LOG_ANALYTICS_APP_CERT_THUMBPRINT;

//Azure Active Directory authentication authority for public cloud
var authenticationAuthority = `https://login.windows.net/${aadTenant}`;
//Azure Log Analytics Authentication token audience
const  audience = "https://api.loganalytics.io/";
//Azure Log Analytics query URL
const  queryUri = `http://localhost:8889/${logAnalyticsApiVersion}/workspaces/${workspaceId}/query`;

function waitForMessage(deviceId, eventId, timeout, done) {
  if (timeout <= 0) {
    done(`Message ${eventId} from device ${deviceId} was not received`);
  }
  
  RunWithToken(function(authvalue) {
    var query = `SecurityIoTRawEvent | where DeviceId == \"${deviceId}\" | where IoTRawEventId == \"${eventId}\"`;
    queryLogAnalytics(query, authvalue, eventId, done, deviceId, eventId, timeout);
  });
}

async function queryLogAnalytics(query, authValue, deferAction, done, deviceId, eventId, timeout) {
  var jsonQuery =  { "timespan": "PT72H", "query": `${query}` };
  var response =  await rp.post({uri:queryUri, auth: {'bearer': `${authValue}`}, body: jsonQuery, json:true }).catch(() => {
    throw "could not send query";
  });
  if (response.tables[0].rows.length > 0)
  {
    done();
  } else {
    setTimeout(() => { waitForMessage(deviceId, eventId, timeout-pollingInterval, done) }, pollingInterval);
  }
}

function RunWithToken(callback) {
  var authenticationContext = new AuthenticationContext(authenticationAuthority);
  try {
    return authenticationContext.acquireTokenWithClientCertificate(
      audience, 
      appId, 
      appCertificate,
      certThumbprint,
      function (err, tokenResponse) {
          if (err) throw err;
          return callback(tokenResponse.accessToken);
      });
  } catch (err) {
    console.log(err);
  }
  
}

module.exports = {
  waitForMessage: waitForMessage
};