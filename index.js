/**
 * Setup
 */
const port = 3000
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const EventEmitter = require('events')
const randomNumberEmitter = new EventEmitter()
var app = express()

/**
 * Middlewares 
 */
app.use(express.static(path.join(__dirname, 'static'))) // serve all the static files from ./static  
app.use(bodyParser.urlencoded({ extended: false })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json()) // parse application/json


/**
 * Create servers
 */
const server = require('http').createServer(app)
const io = require('socket.io')(server)

/**
 * Config, you can adjust it, 
 * but take it easy, its just a demo, the chart is gentle, 
 * it simulates trading volume of less popular asset, it's not nasdaq yet :) 
 */
var config = {
    defaultEventRate: 4, // how many records will be generates per interval
    fetchDataInterval: 1000, // how often the records generator will run in milliseconds 
    randRange: 60
}

/**
 * Storage process
 */
// sample storage, of course this should be replaced with stable service
// listen to data generation in and store it some data storage 
// this is decoupled process from the interactions with the client
const historyStorage = [];
randomNumberEmitter.on('store-batch', (data) => {
    console.log('server-store-batch', data);
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            historyStorage.push(data[i]);
        }
        // console.log('historyStorage', historyStorage);
    }
})

/**
 * Storage helper
 * extract records batch from the storage using a given historical record 
 */
const storageBatch = (fromRecord) => {
    if (fromRecord === false) { // if specific record not provided, send the full storage
        return historyStorage;
    }
    let recordIndex = historyStorage.findIndex(record => {
        return record._id === fromRecord._id;
    });
    return historyStorage.slice(recordIndex + 1); //
}


/**
 * Client listeners
 */
io.on('connection', function (socket) {

    // inform that we have new client connection
    console.log('client-new-connection');

    // listen to client subscriptions for a new batch 
    socket.on('send-batch', function (lastRecord) {
        console.log('client-expecting-batch');
        console.log('client-last-record', lastRecord);
        batch = storageBatch(lastRecord);
        console.log('sending-client-delta-batch', batch);
        socket.emit('batch', batch);
    })
})



/**
 * Demo server, generating data & events
 */
server.listen(port, function () {

    setInterval(function () {

        let recordsBatch = [];

        let rangePercent = Math.floor(config.randRange * 0.1);

        for (let i = 0; i < config.defaultEventRate; i++) {
            let rand = Math.random();
            let number = Math.floor(rand * Math.floor(config.randRange));
            let time = Date.now();
            let nonce = Math.floor(rand * 10000);
            let recordId = `${time}-${i}-${nonce}`;

            // by default, the script emitted each number in the loop during it's generation, 
            // directly to the server and to the client.
            // to avoid some intensive operations at the network, we can collect the numbers
            // and send it in batches to the storage instead of record by record
            // we can also decuple the processes 
            //  1) server generate data > store it in the storage
            //  2) client subscribe > server give it data from the storage
            //  * all the records marked with unique ids for data integrity
            // of course, it depends on the case/needs etc ... 
            // randomNumberEmitter.emit('record', { number: number, time: Date.now() })
            recordsBatch.push({
                // -----------------------------
                // to insure that clients would be able to interact 
                // with the data in accurate way,  
                // we add to each number a record-id 
                // so that the clients will be able to access it using accurate reference
                // (it can also be kind of "metadata" with more info about the record)                
                _id: recordId,
                // -----------------------------
                number: number,
                time: time
            })

        }

        // here we can push the batch directly to the storage from here
        // but it is done via emit to illustrate like it comes from some other sources  
        // historyStorage.push(batch); 
        randomNumberEmitter.emit('store-batch', recordsBatch)

    }, config.fetchDataInterval)

    console.log('server listetning on port', port)
})


