
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fs, { write } from 'fs';
import path from 'path';
import { EncodeStream, DecodeStream } from '../../../../dist';
import { Readable, Writable } from 'node:stream';
import { ToBufferStream } from './ToBufferStream';
import { nanoid } from 'nanoid';


const start = async () => {
    // System
    let userIdIncrement = 0;
    const userWriters = new Set<WritableStreamDefaultWriter<Uint8Array>>();
    
    function broadcast(chunk: Uint8Array) {
        for(const userWriter of userWriters) {
            userWriter.write(chunk);
        }
    }

    const tempWriterMap = new Map<string, WritableStreamDefaultWriter<Uint8Array>>();
    

    // Server
    const server = Fastify({
        http2: true,
        https: {
            key: fs.readFileSync(path.resolve(__dirname, '../certs/key.key')),
            cert:fs.readFileSync(path.resolve(__dirname, '../certs/cert.crt'))
        }
    });
    
    await server.register(fastifyCors, {
        origin: "*",
        methods: "GET,POST,PUT,PATCH,DELETE"
    });

    server.get('/', async (request, reply) => {
        // Encode
        const encodeStream = new EncodeStream();
        const writer = encodeStream.writable.getWriter();

        const bufferStream = encodeStream.readable
            .pipeThrough(new ToBufferStream());
        
        reply.raw.stream.on('close', () => {
            writer.close();
        });
    
        reply.send(Readable.fromWeb(bufferStream as any));

        // Generate temporary id
        const tempId = nanoid();
        tempWriterMap.set(tempId, writer);

        await writer.write(new TextEncoder().encode(tempId));
    });

    server.post('/', (request, reply) => {
        userIdIncrement++;
        const userName = "User" + userIdIncrement;

        // Decode
        const decodeStream = new DecodeStream();
        const reader = decodeStream.readable.getReader();

        (Readable.toWeb(request.raw.stream) as ReadableStream<Buffer>).pipeTo(
            decodeStream.writable
        ).catch(() => {});

        (async () => {
            // Check temporary id
            const tempIdData = await reader.read();

            if(tempIdData.done) {
                await reader.cancel();
                return;
            }

            const tempId = Buffer.from(tempIdData.value).toString();
            if(!tempWriterMap.has(tempId)) {
                await reader.cancel();
                return;
            }

            // Application
            const writer = tempWriterMap.get(tempId)!;
            tempWriterMap.delete(tempId);

            writer.closed.then(() => {
                userWriters.delete(writer);
                broadcast(Buffer.from("==== " + userName + " LEAVED" + " ===="));
            }).catch(() => {});
            userWriters.add(writer);
            broadcast(Buffer.from("==== " + userName + " JOINED" + " ===="));

            while(true) {
                const data = await reader.read();
                if(!data.done) {
                    broadcast(Buffer.from(userName + ": " + Buffer.from(data.value).toString()));
                }
            }
        })().catch(() => {});
    });


    await server.listen({ port: 8000 })
}

start();