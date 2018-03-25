load('api_gpio.js');
load('api_shadow.js');
load("api_sys.js");

// GPIO pin which has the transitor gate connected
let pin = 0; //D3 pin is number 0 one nodeMCU for some reason. https://github.com/esp8266/Arduino/blob/master/variants/nodemcu/pins_arduino.h#L37-L59
GPIO.write(pin, 0);
GPIO.set_mode(pin, GPIO.MODE_OUTPUT);

// This is the sequence of light states when you press the physical Ansluta button
// The SKIP state is actually DIM on the lights, but to be able to save the state
// on the shadow as either OFF, ON or DIM we need to have only on DIM here to 
// avoid ambiguities.
let states = ["OFF", "DIM", "ON", "skip"];
let stateIndex = 0;

Shadow.addHandler(function(event, obj) {
    print("addHandler received: ", JSON.stringify(event), JSON.stringify(obj));
    if (event === "CONNECTED") {
        Shadow.get();
    } else if (event === "GET_ACCEPTED") {
        setCurrentState(obj.state.reported);
    } else if (event === "UPDATE_DELTA") {
        handleDelta(obj.state);
    }
}, null);

function setCurrentState(lastReported) {
    let lastReportedState = lastReported.light;
    for(let i = 0; i < states.length; i++){
        if ( lastReportedState === states[i]){
            stateIndex = i;
            break;
        }
    }
    Shadow.update(0, {reported: {light: states[stateIndex]}});  
}

function handleDelta(state) {
    let desiredState = state.light;
    if (isValidState(desiredState)) {
        updateState(desiredState);
    }
}

function updateState(newState) {
    while(states[stateIndex] !== newState){
        powerTransistorGate();
        stateIndex = (stateIndex + 1) % 4; 
    }
    Shadow.update(0, {reported: {light: states[stateIndex]}});  
}

function powerTransistorGate(){
    print("POWERING");
    GPIO.write(pin, 1);
    Sys.usleep(0.1 * 1000000); 
    GPIO.write(pin, 0);
    Sys.usleep(0.1 * 1000000);
}

function isValidState(state) {
    for(let i = 0; i < states.length; i++){
        if ( state === states[i]){
            return true;
        }
    }
    return false;
}