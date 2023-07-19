let _prompt = "";

function _base64ToBlob(base64, mimetype) {
    const bytes = atob(base64); // decode base64 string
    const array = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i++) {
        array[i] = bytes.charCodeAt(i);
    }

    return new Blob([array], { type: mimetype });
}

function _handleResponse(data) {
    console.log(data);
    const base64Image = data;
    const imageBlob = _base64ToBlob(base64Image, 'image/jpeg');
    window.companion.SendImage({ data: imageBlob, prompt: _prompt })
}

async function _createImage(event) {
    window.companion.SendMessage({type: "CREATE_IMAGE", user: event.name, value: event.value});

    const prompt = {
        prompt: event.value
    }
    _prompt = event.value;
    window.models_img.SetCurrentModel("ImaginAIry");
    window.models_img.ApplyContextObject(prompt);
    window.companion.Lock();
    await window.models_img.CallCurrentModel();
    window.companion.Unlock();
}

export function init() {
    window.hooks.on("image-generation:handle_skill_create_image", (event) => _createImage(event));
    window.hooks.on("models:response:ImaginAIry", (data) => _handleResponse(data));
}