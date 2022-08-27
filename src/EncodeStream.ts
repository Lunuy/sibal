class EncodeTransformer implements Transformer<Uint8Array, Uint8Array> {
    public transform(data: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
        if(data.length <= 0b1111_1101) {
            const header = new Uint8Array(1);
            const headerView = new DataView(header.buffer, header.byteOffset);
            headerView.setUint8(0, data.length);

            controller.enqueue(header);
            controller.enqueue(data);
        } else if(data.length <= 0xFF_FF) {
            const header = new Uint8Array(3);
            const headerView = new DataView(header.buffer, header.byteOffset);
            headerView.setUint8(0, 0b1111_1110);
            headerView.setUint16(1, data.length);

            controller.enqueue(header);
            controller.enqueue(data);
        } else if(data.length <= 0xFF_FF_FF_FF_FF_FF_FF_FF) {
            const header = new Uint8Array(9);
            const headerView = new DataView(header.buffer, header.byteOffset);
            headerView.setUint8(0, 0b1111_1111);
            headerView.setBigUint64(1, BigInt(data.length));

            controller.enqueue(header);
            controller.enqueue(data);
        } else {
            controller.error(new Error('Buffer too big'));
        }
    }
}


export class EncodeStream extends TransformStream<Uint8Array, Uint8Array> {
    public constructor() {
        super(new EncodeTransformer());
    }
}