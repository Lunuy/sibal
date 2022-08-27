import { EncodeStream, DecodeStream } from '../../../dist';

import net from 'net';
import { Readable, Writable } from 'node:stream';
import { ToBufferStream } from './ToBufferStream';

const PORT = 8080;


const server = new net.Server();
server.listen(PORT);

let userIdIncrement = 0;
const userWriters = new Set<WritableStreamDefaultWriter<Uint8Array>>();

function broadcast(chunk: Uint8Array) {
    for(const userWriter of userWriters) {
        userWriter.write(chunk);
    }
}

server.on('connection', socket => {
    (async () => {
        userIdIncrement++;
        const userName = "User" + userIdIncrement;
    
        // Encode
        const encodeStream = new EncodeStream();
        const writer = encodeStream.writable.getWriter();
    
        encodeStream.readable
            .pipeThrough(new ToBufferStream())
            .pipeTo(
                (Writable.toWeb(socket) as WritableStream<Buffer>)
            ).catch(() => {});
    
        // Decode
        const decodeStream = new DecodeStream();
        const reader = decodeStream.readable.getReader();
    
        (Readable.toWeb(socket) as ReadableStream<Buffer>).pipeTo(
            decodeStream.writable
        ).catch(() => {});
        
        
        (async () => {
            while(true) {
                const data = await reader.read();
                if(!data.done) {
                    broadcast(Buffer.from(userName + ": " + Buffer.from(data.value).toString()));
                }
            }
        })().catch(() => {});
        
        // Socket
        socket.on('error', () => {});
        socket.on('close', () => {
            userWriters.delete(writer);
            broadcast(Buffer.from("==== " + userName + " LEAVED" + " ===="));
        });
        userWriters.add(writer);
        broadcast(Buffer.from("==== " + userName + " JOINED" + " ===="));
    })();
});