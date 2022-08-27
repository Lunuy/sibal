# HTTP/2 Chat (With Sibal)
Chat example using [HTTP/2 Streaming request](https://developer.chrome.com/articles/fetch-streaming-requests/) and [Streaming response](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams).

## Server
```bash
cd server
npm i -D
npm run watch
```
Server will serve on [https://127.0.0.1:8000](https://127.0.0.1:8000), using celf-certificated certs.

## Web Client
```bash
cd client
npm i -D
npm run serve
```
[http://127.0.0.1:9000](http://127.0.0.1:9000)

You may need to use chrome canary(&gt; 105). You should go to [https://127.0.0.1:8000/](https://127.0.0.1:8000/) once, and select continue (to ignore security error of self-certificated certificate).

## How it works
Because browser does not support full-duplex http/2 connection yet, we use two http connections for download and upload.

1. Client establishes download stream connection(GET)
2. Server generates temporary id for the client and sends it to the client.
3. Client establishes upload stream connection(POST) and sends temporary id that received from server.
4. Now server knows upload and download stream connection pair for the client.
5. Full-duplex connection is established using two stream connections(download, upload).

## Why HTTP streaming needs Sibal?
Upload and download stream is like tcp socket, fetch upload stream [does not guarantee](https://fetch.spec.whatwg.org/#http-fetch) each chunk to be sent separately, of course download stream does not guarantee those thing [too](https://stackoverflow.com/questions/57412098/does-fetchs-response-body-chunks-correspond-to-http-chunks). So we need messaging protocol to seperate each message. Sibal can do something in here.
