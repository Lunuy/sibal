# Sibal
Simple messaging protocol (for order-guaranteed protocol). This library provides [Stream API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)'s [TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream) to encode and decode.

## Install
```bash
npm i sibal
```

## Examples
- [HTTP/2 Chat](examples/http2-chat)
- [TCP Chat](examples/tcp-chat)

## Usage
```ts
import { DecodeStream, EncodeStream } from 'sibal';

// Encode (send)
const encodeStream = new EncodeStream();

(async () => {
    const writer = encodeStream.writable.getWriter();
    const textEncoder = new TextEncoder();

    await writer.write(textEncoder.encode('A'));
    await writer.write(textEncoder.encode('B'));
    await writer.write(textEncoder.encode('C'));
    await writer.write(textEncoder.encode('D'));
})();

// Decode (receive)
const decodeStream = new DecodeStream();

(async () => {
    const reader = decodeStream.readable.getReader();
    const textDecoder = new TextDecoder();

    while(true) {
        const data = await reader.read();

        if(!data.done) {
            console.log(textDecoder.decode(data.value));
        }
    }
})();

// Stream encoded bytes to order-guaranteed somewhere(i.e. tcp)
// Stream raw bytes bytes to decoder
const somewhere = new TransformStream();
encodeStream.readable.pipeTo(somewhere.writable);
somewhere.readable.pipeTo(decodeStream.writable);
```
EncodeStream, DecodeStream is [TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream).


## Framing protocol
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+---------------+-------------------------------+---------------+
|  Payload len  |    Extended payload length    |               |
|      (8)      |           (16/64)             |               |
|               |   (if payload len==254/255)   |               |
+---------------+-------------------------------+ - - - - - - - +
|    Extended payload length continued, if payload len==255     |
+ - - - - - - - +-----------------------------------------------+
|               |                  Payload Data                 |
+---------------+ - - - - - - - - - - - - - - - - - - - - - - - +
|                    Payload Data continued ...                 |
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                    Payload Data continued ...                 |
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
```
"Extended payload length" works like [WebSocket Base Framing Protocol](https://datatracker.ietf.org/doc/html/rfc6455#section-5.2)'s one.