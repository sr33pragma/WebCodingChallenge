var sys = require('sys');
var { mktdata } = require ('./marketdata.js');

const STOPAT_EVENT_INACTIVE = -1;
const RunState = {Stopped: 0, Running: 1, StopRequested: 2};

class MktSim {
    constructor() {
        this.currentIndex = 0; 
        this.startEventTime = 0; 
        this.startTime = 0; 
        this.runState = RunState.Stopped;
        this.stopAtEventNumber = STOPAT_EVENT_INACTIVE;
        this.replaySpeed = 1.0
    }

    getCurrentEventAsJson() {
        var elapsedWallclockTime = (Date.now() - this.startTime)/1000;
        var eventTimeOffset = this.getCurrentEventMsecsAfterStartEvent() / 1000;
        var stats = {wallClock: elapsedWallclockTime, eventTime: eventTimeOffset}
        var sse = {event: this.getCurrentEvent(), time: stats}
        return JSON.stringify(sse);
    }
    getCurrentEvent() {
        let evnt = mktdata[this.currentIndex];
        if (evnt == null) {
            console.log("getCurrentEvent: null event for currentIndex:" + this.currentIndex);
        }
        return evnt;
    }

    getCurrentEventId() {
        let evnt = this.getCurrentEvent();
        // sys.puts("getCurrentEventId: " + evnt.toString());
        return evnt[0];
    }

    getCurrentEventTime() {
        let evnt = this.getCurrentEvent();
        if (evnt == null)
            return null;
        let eventTime = evnt[1]
        return eventTime;
    }

    getCurrentEventMsecsAfterStartEvent() {
        return (this.getCurrentEventTime() - this.startEventTime);
    }

    getCurrentEventScaledMsecsAfterStartEvent() {
        return Math.round(this.getCurrentEventMsecsAfterStartEvent() / this.replaySpeed);
    }

    reset() {
        this.currentIndex = 0; 
        this.startEventTime = 0; 
        this.startTime = 0; 
        this.stopAtEventNumber = STOPAT_EVENT_INACTIVE;
        this.replaySpeed = 1.0
    }

    start() {
        this.startTime = Date.now();
        let tm =  this.getCurrentEventTime();
        if (tm == null) {
            return false;
        }
        this.startEventTime = tm
        this.runState = RunState.Running;
        return true;
    }

    stop() {
        if (this.runState == RunState.Running) {
            this.runState = RunState.StopRequested;
        } 
        else {
            this.runState = RunState.Stopped;
        }
    }

    isStopped() {
        return this.runState == RunState.Stopped;
    }

    msecsToWait() {
        if (this.runState != RunState.Running)
            return null;
        this.updateRunningState();
        if (this.runState != RunState.Running)
            return null;
        let delay = this.msecsToEventTime();
        return delay;
        // console.log("msecToWait: " + delay);

    }

    next() {
        this.currentIndex = this.currentIndex + 1;
        // console.log ("next done: " + this);
    }

    updateRunningState() {
        let shouldStop = false;
        if (this.currentIndex >= mktdata.length) {
            shouldStop = true;
        }
        // if a stop is requested, stop and return
        if (this.runstate == RunState.StopRequested) {
            shouldStop = true;
        }
        
        // if we have reached the 'breakpoint' event, return
        if (this.currentIndex == this.stopAtEventNumber) {
            this.stopAtEventNumber = STOPAT_EVENT_INACTIVE;
            shouldStop = true;
        }
        if (shouldStop) {
            this.runstate = RunState.Stopped;
            return;
        }
        // console.log (this);
    }

    msecsToEventTime() {
        let evnt = this.getCurrentEvent();
        if (evnt == null)
            return null;
        let eventTime = this.getCurrentEventTime(); 
        let eventTimeOffset = this.getCurrentEventMsecsAfterStartEvent();
        let expectedElapsedTime = Math.round(eventTimeOffset / this.replaySpeed);
        let actualElapsedTime = Date.now() - this.startTime;
        let sleepDuration = Math.round(expectedElapsedTime - actualElapsedTime);
        // console.log ("msecsToET - #: " + evnt[0] + ", wait: " + expectedElapsedTime + ", now: " + actualElapsedTime + ", sleep: " + sleepDuration);
        //console.log (this.toString());
        return sleepDuration;
    }

    toString() {
        return "mktsim ["
        + "currentIndex: " + this.currentIndex
        + ", startEventTime: " + this.startEventTime
        + ", startTime: " + this.startTime
        + ", runState: " + this.runState
        + ", stopAtEventNumber: " + this.stopAtEventNumber
        + ", replaySpeed: " + this.replaySpeed
        + "]"
    }
}

module.exports = {MktSim};