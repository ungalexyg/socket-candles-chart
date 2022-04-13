# Socket.io Candlestick Chart

Basic implementation example of real-time candle stick chart. Based on NodeJS & Socket.io at the backend, with some help from Bootstrap and AppexCharts at the frontend.

<center><img src="https://raw.githubusercontent.com/ungalexyg/sockets-candles-chart/main/static/img/thumb.png" alt="thumb.png"></center>


1. Clone the repo
2. Go to the project
```
$ cd /path/to/project
```
3. Install packages
```
$ npm i
```
4. Start the server
```
$ npm run dev
```
5. The server will listen and start to generate data and store it in the "storage" (runtime-array, can be adjusted to any service)

6. Open the client http://localhost:3000/client
```
It will run /static/client/index.html
```
7. To see the process, you can take a look at the browser's console and at the terminal's console at the same time.

8. Click on the Connect button to connect to the server and run the chart

* At the begging it will take some time to fill the chart with the data that already stored in the "storage" on the server side
* When selecting new aggregation period it will reset the chart and reloading process will also take some time. The chart can display only 1 period of candle at the time (no charts with 1 candle 10 sec, other 30 sec...) so it needs the reload

