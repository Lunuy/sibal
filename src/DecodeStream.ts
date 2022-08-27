enum DecodeTransformerState {
    GetLength,
    GetMediumLength,
    GetLargeLength,
    GetData
};

class DecodeTransformer implements Transformer<Uint8Array, Uint8Array> {
    private readonly options: DecodeStreamOptions;

    private readonly buffers: Uint8Array[];
    private bufferedBytes: number;
    private payloadLength: number;
    private state: DecodeTransformerState;

    constructor(options: DecodeStreamOptions) {
        this.buffers = [];
        this.bufferedBytes = 0;
        this.payloadLength = 0;
        this.state = DecodeTransformerState.GetLength;

        this.options = options;
    }

    public transform(chunk: Uint8Array, controller: TransformStreamDefaultController) {
        this.bufferedBytes += chunk.length;
        this.buffers.push(chunk);
        this.parseLoop(controller);
    }
    
    private parseLoop(controller: TransformStreamDefaultController) {
        while (true) {
            switch (this.state) {
                case DecodeTransformerState.GetLength: {
                    if (this.bufferedBytes === 0)
                        return;

                    const lengthUint8 = this.consume(1);
                    const lengthView = new DataView(lengthUint8.buffer, lengthUint8.byteOffset);
                    const length = lengthView.getUint8(0);
                        
                    if(length === 0b1111_1110) {
                        this.state = DecodeTransformerState.GetMediumLength;
                    } else if(length === 0b1111_1111) {
                        this.state = DecodeTransformerState.GetLargeLength;
                    } else {
                        if(length > this.options.maxPayloadLength)
                            return controller.error(new Error('Payload length longer than max payload length.'));

                        this.payloadLength = length;
                        this.state = DecodeTransformerState.GetData;
                    }

                    break;
                }
                case DecodeTransformerState.GetMediumLength: {
                    if(this.bufferedBytes < 2)
                        return;
                    
                    const lengthUint8 = this.consume(2);
                    const lengthView = new DataView(lengthUint8.buffer, lengthUint8.byteOffset);
                    const length = lengthView.getUint16(0);

                    if(length > this.options.maxPayloadLength)
                        return controller.error(new Error('Payload length longer than max payload length.'));

                    this.payloadLength = length;
                    this.state = DecodeTransformerState.GetData;

                    break;
                }
                case DecodeTransformerState.GetLargeLength: {
                    if(this.bufferedBytes < 8)
                        return;
                    
                    const lengthUint8 = this.consume(8);
                    const lengthView = new DataView(lengthUint8.buffer, lengthUint8.byteOffset);
                    const length = lengthView.getBigUint64(0);

                    if(length > this.options.maxPayloadLength)
                        return controller.error(new Error('Payload length longer than max payload length.'));

                    this.payloadLength = Number(length);
                    this.state = DecodeTransformerState.GetData;

                    break;
                }
                case DecodeTransformerState.GetData: {
                    if(this.bufferedBytes < this.payloadLength)
                        return;

                    const payload = this.consume(this.payloadLength);
                    controller.enqueue(payload);

                    this.state = DecodeTransformerState.GetLength;

                    break;
                }
            }
        }
    }

    private consume(n: number): Uint8Array {
        this.bufferedBytes -= n;

        if(n === 0)
            return new Uint8Array(0);

        if (n === this.buffers[0].length) {
            return this.buffers.shift()!;
        } else if (n < this.buffers[0].length) {
            const buffer = this.buffers[0];
            this.buffers[0] = buffer.subarray(n);
            return buffer.subarray(0, n);
        } else {
            const result = new Uint8Array(n);

            for (let pulledBytes = 0; pulledBytes !== n;) {
                const buffer = this.buffers[0];
                const offset = pulledBytes;

                if (n >= pulledBytes + buffer.length) {
                    result.set(this.buffers.shift()!, offset);
                } else {
                    result.set(buffer.subarray(0, n), offset);
                    this.buffers[0] = buffer.subarray(n);
                }

                pulledBytes += buffer.length;
            }

            return result;
        }
    }
}


export interface DecodeStreamOptions {
    maxPayloadLength: number;
}

export class DecodeStream extends TransformStream<Uint8Array, Uint8Array> {
    public constructor(options: Partial<DecodeStreamOptions> = {}) {
        super(new DecodeTransformer({
            maxPayloadLength: Number.MAX_SAFE_INTEGER,
            ...options
        }));
    }
}