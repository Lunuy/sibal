
import { EncodeStream, DecodeStream } from '../../../../dist';


const SERVER_ADDR = 'https://127.0.0.1:8000';

(async () => {
    // Download (decode)
    const decodeStream = new DecodeStream();
    const reader = decodeStream.readable.getReader();

    const downloadReponse = await fetch(SERVER_ADDR + '/');

    if(downloadReponse.body === null)
        throw new Error('Body should not be null');

    downloadReponse.body
        .pipeTo(decodeStream.writable);
    
    
    
    const tempIdData = await reader.read();
    if(tempIdData.done)
        throw new Error('Should not end here');
    const tempId = new TextDecoder().decode(tempIdData.value);


    // Upload (encode)
    const encodeStream = new EncodeStream();
    const writer = encodeStream.writable.getWriter();

    const uploadPromise = fetch(SERVER_ADDR + '/', {
        method: 'POST',
        body: encodeStream.readable,
        // @ts-ignore
        duplex: 'half'
    });

    writer.write(new TextEncoder().encode(tempId));


    // Application
    const textInput = document.getElementById('text')! as HTMLInputElement;
    const textarea = document.getElementById('textarea')! as HTMLTextAreaElement;
    
    textInput.addEventListener('keydown', e => {
        if(e.key === 'Enter') {
            const text = textInput.value;
            writer.write(new TextEncoder().encode(text));
            textInput.value = '';
        }
    });

    (async () => {
        while(true) {
            const data = await reader.read();
            
            if(!data.done) {
                const text = new TextDecoder().decode(data.value);
                textarea.textContent += '\n' + text;
                textarea.scrollTop = textarea.scrollHeight;
            }
        }
    })();
})();