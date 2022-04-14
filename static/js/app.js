
/** ----------------------------------------------------- 
 * This is just a simple integration sample with socket.io and the chart
 * Of course, for larger project, it could be better 
 * to break it down into smaller components with react/vue/etc..
 ----------------------------------------------------- */


/**
 * Chart class 
 * handles chart's processes
 */
class Chart {

    /**
     * Setup chart instance and deps
     * 
     * @param string 
     * @return void   
     */
    constructor(chartSelector) {
        this.chart = new ApexCharts(document.querySelector(chartSelector), this.options()); // setup chart instance
        this.chart.render(); // pre-render it with loading message
        this.openAt = 0; // current candle's open time
        this.period = 10000; // aggregation period in milisecs
        this.data = []; // bag for full data 
        this.ohlc = []; // bag for candle's Open-High-Low-Close
        this.loaded = false;
        this.lastRecord = false;
    }

    /**
     * Define chart options
     * 
     * @return void   
     */
    options() {
        return {
            series: [],
            chart: { type: 'candlestick', height: 500 },
            title: { text: 'CandleStick Chart', align: 'left' },
            xaxis: { type: 'datetime' },
            yaxis: { tooltip: { enabled: true }, min: 0, max: 100 },
            noData: { text: 'Loading...' },
            theme: {
                mode: 'dark',
                palette: 'palette1',
                monochrome: {
                    enabled: false,
                    color: '#255aee',
                    shadeTo: 'light',
                    shadeIntensity: 0.65
                },
            }
        };
    }

    /**
     * Set aggregation period
     * 
     * @param int  
     * @return void
     */
    setPeriod(periodSecs) {
        this.period = periodSecs * 1000;
        console.log('chart-updated-period', this.period);
    }

    /**
     * Parse batch into single records
     * 
     * @param Array [{number: 15, time: 1649702709920}, {number: 15, time: 1649702709920}]
     * @return void
     */
    async updateBatch(data) {
        return new Promise(async (resolve, reject) => {
            if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    await this.update(data[i]);
                }
            }
            resolve(true);
        });
    }

    /**
     * Initiate chart data update flow
     *  
     *  parse receive record from :
     *      {number: 15, time: 1649702709920}
     * 
     *  ro result records : 
     *      this.data = [{
     *          x: new Date(1538778600000),
     *          y: [6629.81, 6650.5, 6623.04, 6633.33]
     *      },
     *      {
     *          x: new Date(1538780400000),
     *          y: [6632.01, 6643.59, 6620, 6630.11]
     *      }];
     * 
     * @param object record {number: 15, time: 1649702709920}
     * @return void
     */
    async update(record) {
        await this.updateOHLC(record);
        await this.updatePeriod(record);

        // update the view only if the ohlc is ready with it's 4 props,
        // otherwise, it might be the begging of a fresh candle, let it load
        if (this.ohlc.length == 4) {
            await this.updateView();
        }
    }

    /**
     * Update current candle's OHLC data based on latest received record
     * 
     * @param object record {number: 15, time: 1649702709920}
     * @return Promise
     */
    updateOHLC(record) {
        return new Promise(resolve => {
            let open = this.ohlc[0] ?? false;
            let high = this.ohlc[1] ?? false;
            let low = this.ohlc[2] ?? false;
            let close = this.ohlc[3] ?? false;

            // update open value
            if (open === false) {
                this.ohlc[0] = record.number;
            }
            // update high value
            else if ((high === false && record.number >= open) || (high !== false && record.number >= high)) {
                this.ohlc[1] = record.number;
            }
            // update low value
            else if ((low === false && record.number <= open) || (low !== false && record.number <= low)) {
                this.ohlc[1] == 'undefined' ? this.ohlc[1] = open : null; // fill prev val if it's not filled yet
                this.ohlc[2] = record.number;
            }
            // update close value            
            else if ((record.number >= low && record.number <= high)) {
                this.ohlc[3] = record.number;
            }
            console.log("parseOHLC", this.ohlc);

            // set the last record
            this.lastRecord = record;

            resolve(true);
        });
    }

    /**
     * Handle next aggregation-period (candle) tasks
     * 
     * @param object record {number: 15, time: 1649702709920}
     * @return Promise
     */
    updatePeriod(record) {
        return new Promise(resolve => {
            // new candle timing handlers
            this.openAt == 0 ? this.openAt = record.time : null;
            let nextOpen = this.openAt + this.period;
            let renewPeriod = record.time >= nextOpen ? true : false;
            if (!this.loaded) {
                this.loaded = true;
                renewPeriod = true;
            }

            console.log("parsePeriod", 'parsing...',
                `this.period: ${this.period}`,
                `this.openAt: ${this.openAt}`,
                `nextOpen: ${nextOpen}`,
                `record.time: ${record.time}`,
                `renewPeriod: ${renewPeriod}`
            );

            // is it time to prep new candle?
            if (renewPeriod) {
                console.log('parsePeriod', 'new-period');
                $('.aggBadge').fadeOut().fadeIn(); // minor effect in the status bar on new candle initiation

                // if yes, set new open time
                this.openAt = record.time;
                // reset the ohlc for next period
                this.ohlc = [];

                // push new chart data entry
                this.data.push({
                    x: record.time,
                    y: this.ohlc
                });

            } else { // no need to push new candle yet, just update last one's ohlc  
                console.log('parsePeriod', 'old-period');
                if (this.data[this.data.length - 1]) {
                    this.data[this.data.length - 1].y = this.ohlc;
                }
            }
            resolve(true);
        });
    }

    /**
     * Update chart view
     * 
     * @return Promise
     */
    updateView() {
        return new Promise(resolve => {
            console.log('updateView');
            let updateSeriesReturn = this.chart.updateSeries([{
                name: 'Updates',
                data: this.data
            }])
            console.log('updateSeriesReturn:', updateSeriesReturn);
            resolve(true);
        });
    }

    /**
     * Reset chart view
     * 
     * reset the chart's data
     * also reset last record for the next batch
     * so that the server will know bring all the data from the begging
     * @return Promise
     */
    resetView() {
        return new Promise(resolve => {
            console.log('resetView');
            this.lastRecord = false;
            this.chart.updateSeries([{
                name: 'Updates',
                data: []
            }])
            resolve(true);
        });
    }
}



/**
 * App class, handles app's events
 */
class App {

    /**
     * Bind events
     * 
     * @return void
     */
    constructor() {
        this.bindConnect();
        this.bindDisconnect();
        this.bindPeriod();
    }

    /**
     * Connect to socket
     * 
     * @return void
     */
    bindConnect() {
        $('#connect').click(() => {
            socket.connect();
        });
    }

    /**
     * Disconnect from socket
     * 
     * @return void
     */
    bindDisconnect() {
        $('#disconnect').click(() => {
            socket.disconnect();
        });
    }

    /**
     * Bind period changes
     * 
     * @return void
     */
    bindPeriod() {
        let $aggSelect = $('#aggSelect');
        $aggSelect.change(async () => {
            console.log('app-updating-chart-period', chart.period);
            let secsPeriod = parseInt($aggSelect.val());
            await chart.resetView();
            chart.setPeriod(secsPeriod);
            $('.aggBadge')
                .fadeOut()
                .text(`${secsPeriod} Seconds`)
                .removeClass('bg-secondary')
                .addClass('bg-success')
                .fadeIn();
        });
    }

    /**
     * Listen to socket events
     * 
     * @return void
     */
    initListeners() {

        // on connect only inform the console and send initial emit to the server
        socket.on('connect', () => {
            console.log('connected');
            socket.emit('send-batch', chart.lastRecord);
            $('.connBadge')
                .fadeOut()
                .text('Connected')
                .removeClass('bg-secondary')
                .addClass('bg-success')
                .fadeIn();
        });

        // async handler to let the chart render on new data arrival before handling next batch 
        socket.on('batch', async (data) => {
            console.log('received-batch', data);
            if (data.length > 0) {
                await chart.updateBatch(data);
                socket.emit('send-batch', chart.lastRecord);
            } else {
                console.log('waiting...');
                setTimeout(() => {
                    console.log('requesting-send-batch');
                    socket.emit('send-batch', chart.lastRecord);
                }, 2000);
            }
        });

        // on disconnect only make affect and inform the console
        socket.on('disconnect', () => {
            console.log('disconnected');
            $('.connBadge')
                .fadeOut()
                .text('Disconnected')
                .removeClass('bg-success')
                .addClass('bg-secondary')
                .fadeIn();
        });

        // on init, it should listen and disconnected  
        socket.disconnect();
    }
}



/**
 * Initiate parties 
 */
const socket = io();
const chart = new Chart("#chart");
const app = new App();
$(() => {
    app.initListeners();
});