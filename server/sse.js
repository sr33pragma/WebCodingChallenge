var express = require('express');
var fs = require('fs');
var { mktdata } = require ('./marketdata.js');
var { MktSim } = require ('./mktsim.js');


const hostname = '127.0.0.1';
const port = 3333;  // dont use 3000, other use it
var sim = new MktSim();
var app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.get('/', function(req, res){
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(fs.readFileSync(__dirname + '/sse.html'));
    res.end();
});

app.get ('/start', function(req, res){
    console.log ("GET: start")
    startStreaming(req, res);
});

app.get ('/stop', function(req, res){
    console.log ("GET: stop")
    stopStreaming(req, res);
});

app.get ('/reset', function(req, res){
    console.log ("GET: reset")
    resetToStart(req, res);
});

app.get ('/set', function(req, res){
    console.log ("GET: set")
    // let speed = req.query.speed;
    // if (speed != null) {
    //     sim.replaySpeed = parseFloat(speed);
    // }
    // stopStreaming(req, res);
    setVars(req, res);
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

function startStreaming(req, res) {
    console.log ("Start called..");
    if (!(req.headers.accept && req.headers.accept == 'text/event-stream')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('req.headers.accept - Expected: text/event-stream');
        return;
    }
    if (sim.start() == false) {
        console.log("Start called on end of stream: " + sim.toString());
        res.writeHead(204, { 'Content-Type': 'text/event-stream' });
        res.end("data: end of stream. Do a reset. " + sim.toString() + "\n\n");
        return;
    }
    // all good, start
    startTime = Date.now();
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    setTimeout(function () {
        streamEvents(res, sim);
    }, 100);
}

function stopStreaming(req, res) {
    console.log ("Stop called..");
    sim.stop();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write("data: Stopped at event: " + sim.toString());
    res.end();
}

function resetToStart(req, res) {
    console.log ("Reset called..");
    sim.stop();
    sim.reset();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write("data: Reset at event: " + sim.toString());
    res.end();
}

function setVars(req, res) {
    console.log ("Set called..");
    let speed = req.query.speed;
    if (speed != null) {
        sim.replaySpeed = parseFloat(speed);
    }
    sim.stop();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write("data: SetSpeed to: " + speed + " at event: " + sim.toString());
    res.end();
}

function streamEvents(res, sim) {
    let delay = sim.msecsToWait();
    console.log(">> Start StreamEvents");
    let elapsedSecs = (Date.now() - startTime)/1000.0;
    while (delay != null && delay <= 0) {
        let row = sim.getCurrentEventAsJson();
        let eventElapsedSecs = sim.getCurrentEventMsecsAfterStartEvent()/1000;
        res.write("data: " + row +'\n\n');
        console.log ("res.write data:" + row);
        sim.next();
        delay = sim.msecsToWait ();
    }
    if (delay == null) {
        console.log ("stop streaming: " + sim.toString());
        res.write("data: stop streaming at event: " + sim.toString() + "\n\n");
        res.end();
        return;
    }
    console.log ("streamEvents.setTimeout: " + delay);
    setTimeout(function () {
        streamEvents(res, sim);
    }, delay);
}

