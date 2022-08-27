
class ToBufferTransformer implements Transformer<Uint8Array, Buffer> {
    public transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Buffer>) {
        controller.enqueue(Buffer.from(chunk));
    }
};

export class ToBufferStream extends TransformStream<Uint8Array, Buffer> {
    public constructor() {
        super(new ToBufferTransformer());
    }
}