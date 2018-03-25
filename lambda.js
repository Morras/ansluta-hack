var AWS = require('aws-sdk');
var iotdata = new AWS.IotData({endpoint: 'a3uqqq8qiyasc3.iot.eu-west-2.amazonaws.com', region:"eu-west-2"});
        
exports.handler = function (request, context) {
    console.log("DEBUG: " + JSON.stringify(request));
    var directive = request.directive;
    if (directive.header.namespace === 'Alexa.Discovery' && directive.header.name === 'Discover') {
        handleDiscovery(request, context, "");
    }
    else if (directive.header.namespace === 'Alexa.PowerController') {
        if (directive.header.name === 'TurnOn' || directive.header.name === 'TurnOff') {
            handlePowerControl(request, context);
        }
    } else if (directive.header.namespace === 'Alexa.BrightnessController') {
        // The spots only support 0, 50 and 100 percent, so I will let anything outside that be the DIM settings
        if (directive.payload.brightnessDelta === -100 || directive.payload.brightness === 0) {
            turnSpotsOff(request, context);
        } else if (directive.payload.brightnessDelta === 100 || directive.payload.brightness === 100) {
            turnSpotsOn(request, context);
        } else {
            dimSpots(request, context);
        }
    }

    function handleDiscovery(request, context) {
        var payload = {
            "endpoints":
            [
                {
                    "endpointId": "tv-spots",
                    "manufacturerName": "Ikea spots",
                    "friendlyName": "tv lights",
                    "description": "Smart Device Switch",
                    "displayCategories": ["LIGHT"],
                    "capabilities":
                    [
                        {
                          "type": "AlexaInterface",
                          "interface": "Alexa",
                          "version": "3"
                        },
                        {
                            "interface": "Alexa.PowerController",
                            "version": "3",
                            "type": "AlexaInterface",
                            "properties": {
                            }
                        },
                        {
                            "interface": "Alexa.BrightnessController",
                            "version": "3",
                            "type": "AlexaInterface",
                            "properties": {
                            }
                        }
                    ]
                }
            ]
        };
        var header = request.directive.header;
        header.name = "Discover.Response";
        context.succeed({ event: { header: header, payload: payload } });
    }

    function log(message, message1, message2) {
        console.log(message + message1 + message2);
    }

    function handlePowerControl(request, context) {
        // get device ID passed in during discovery
        var requestMethod = request.directive.header.name;

        if (requestMethod === "TurnOn") {
            turnSpotsOn(request, context);
        }
        else if (requestMethod === "TurnOff") {
            turnSpotsOff(request, context);
        }
    }
    
    function turnSpotsOn(request, context){
        updateDeviceShadow("ON", respondPowerController, request, context, "ON");
    }
    
    function turnSpotsOff(request, context){
        updateDeviceShadow("OFF", respondPowerController, request, context);
    }
    
    function dimSpots(request, context){
        updateDeviceShadow("DIM", respondBrightnessController, request, context);
    }
    
    function updateDeviceShadow(newLightState, responder, request, context){
        console.log("DEBUG: updating device shadow to " + newLightState);
        var params = {
            payload: JSON.stringify({
                state: {
                    desired: {
                        light: newLightState
                    }
                }
            }),
            thingName: 'ansluta-switch'
        };
        
        iotdata.updateThingShadow(params, function(err, data) {
                if (err) {
                    console.log("ERROR: " + err);
                    context.fail(err);
                } else {
                    console.log("SUCCESS: " + data);
                    responder(request, context, newLightState)
                }
            });
    }
    
    function respondPowerController(request, context, powerResult){
        var contextResult = {
            "properties": [{
                "namespace": "Alexa.PowerController",
                "name": "powerState",
                "value": powerResult,
                "timeOfSample": new Date().toISOString(),
                "uncertaintyInMilliseconds": 50
            }]
        };

        respond(request, context, contextResult);
    }
    
    function respondBrightnessController(request, context){
        var contextResult = {
            "properties": [{
                "namespace": "Alexa.BrightnessController",
                "name": "brightness",
                "value": 50,
                "timeOfSample": new Date().toISOString(),
                "uncertaintyInMilliseconds": 50
            }]
        };

        respond(request, context, contextResult);
    }
    
    function respond(request, context, contextResult) {
        var responseHeader = request.directive.header;
        responseHeader.name = "Response";
        responseHeader.namespace = "Alexa";
        var response = {
            context: contextResult,
            event: {
                header: responseHeader
            },
            payload: {}

        };
        context.succeed(response);        
    }
};
