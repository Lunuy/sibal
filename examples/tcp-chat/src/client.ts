import { EncodeStream, DecodeStream } from '../../../dist';

import net from 'net';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Readable, Writable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { ToBufferStream } from './ToBufferStream';



(async () => {
    const client = new net.Socket();
    client.connect({ port: 8080, host: '127.0.0.1' });
    
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const outputRl = new readline.Readline(stdout);

    // Encode (Upload)
    const encodeStream = new EncodeStream();
    const writer = encodeStream.writable.getWriter();

    encodeStream.readable
        .pipeThrough(new ToBufferStream())
        .pipeTo(
            (Writable.toWeb(client) as WritableStream<Buffer>)
         );

    // Decode (Download)
    const decodeStream = new DecodeStream();
    const reader = decodeStream.readable.getReader();

    (Readable.toWeb(client) as ReadableStream<Buffer>).pipeTo(
        decodeStream.writable
    );

    // Receive
    (async () => {
        while(true) {
            const data = await reader.read();

            if(!data.done) {
                console.log(Buffer.from(data.value).toString());
            }
        }
    })();

    // Send
    while(true) {
        const message = await rl.question('');

        await outputRl
            .moveCursor(0, -1)
            .clearLine(0)
            .commit();

        await writer.write(Buffer.from(message));
    }
})();