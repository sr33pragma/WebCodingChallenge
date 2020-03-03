var express = require('express');
var fs = require('fs');
var { mktdata } = require ('./marketdata.js');
var { MktSim } = require ('./mktsim.js');


const hostname = '127.0.0.1';
const port = 3000;
var sim = new MktSim();
var app = express();

app.get('/', function(req, res){
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(fs.readFileSync(__dirname + '/sse.html'));
    res.end();
});

app.get ('/events', function(req, res){
    processEvents(req, res);
});

app.get ('/start', function(req, res){
    startStreaming(req, res);
});

app.get ('/stop', function(req, res){
    stopStreaming(req, res);
});

app.get ('/reset', function(req, res){
    resetToStart(req, res);
});

app.get ('/set', function(req, res){
    let speed = req.query.speed;
    if (speed != null) {
        sim.replaySpeed = parseFloat(speed);
    }
    stopStreaming(req, res);
});


app.listen(3000, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

function startStreaming(req, res) {
    if (!(req.headers.accept && req.headers.accept == 'text/event-stream')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('req.headers.accept - Expected: text/event-stream');
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    startTime = Date.now();
    sim.start();
    setTimeout(function () {
        streamEvents(res, sim);
    }, 100);
}

function stopStreaming(req, res) {
    sim.stop();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write("pause/stop: " + sim.toString());
    res.end();
    console.log("stopStreaming..");
}

function resetToStart(req, res) {
    sim.stop();
    sim.reset();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write("reset: " + sim.toString());
    res.end();
}

function streamEvents(res, sim) {
    let delay = sim.msecsToWait();
    console.log(">> Start StreamEvents");
    let elapsedSecs = (Date.now() - startTime)/1000.0;
    while (delay != null && delay <= 0) {
        // console.log("delay: " + delay);
        let row = sim.getCurrentEventAsJson();
        let eventElapsedSecs = sim.getCurrentEventMsecsAfterStartEvent()/1000;
        res.write('id: ' + sim.getCurrentEventId() + '\n');
        res.write("data: " + row +'\n\n');
        console.log ("res.write data:" + row);
        sim.next();
        delay = sim.msecsToWait ();
    }
    if (delay == null) {
        return;
    }
    console.log ("streamEvents.setTimeout: " + delay);
    setTimeout(function () {
        streamEvents(res, sim);
    }, delay);
}

