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
    const base64Image = data;
    const imageBlob = _base64ToBlob(base64Image, 'image/jpeg');
    window.companion.SendImage({ data: imageBlob, prompt: _prompt })
}

async function _createSelfie(event) {
    window.companion.SendMessage({type: "TAKE_SELFIE", user: event.name, value: event.value});
    
    const characterDesc = window.companion.GetCharacterAttribute("visualDescription");
    const image = await _fetchPose(event.value);
    const prompt = {
        prompt: event.value + characterDesc,
        image: image
    }
    _prompt = event.value;
    window.models_img.SetCurrentModel("ImaginAIry-Selfie");
    window.models_img.ApplyContextObject(prompt);
    window.companion.Lock();
    await window.models_img.CallCurrentModel();
    window.companion.Unlock();
}
/**
 * This function takes in a prompt, breaks it up, and returns a pose type from the strings inside the prompt. If a pose type is not found, it returns a default pose type.
 * This pose type is then used to fetch a pose from the available pose images inside the folder 'pose-pack' inside of the module.
 * Then it returns the image data of the pose to be sent as the ControlNET image to the model, which is then generated and returned to the companion chat.
 * @param {Object} prompt 
 * @returns {Object} imageData
 * 
**/
async function _fetchPose(prompt) {
    const brokenPrompt = prompt.split(" ");
    const poseTypes = ['waist', 'full'];
    let viablePrompt = [];
    let temp = '';
    for (let i = 0; i < brokenPrompt.length; i++) {
        temp = brokenPrompt[i].toLocaleLowerCase();
        if (poseTypes.includes(temp)) {
            viablePrompt.push(temp);
        }
    }
    const poseType = viablePrompt[0] || 'waist';
    const poses = await getImagesFromPosePack();
    
    // Filter poses that contain the pose type
    let filteredPoses = poses.filter(pose => pose.toLowerCase().includes(poseType));
    
    // If no pose of the desired type, default to the original pose list
    if (filteredPoses.length === 0) {
        filteredPoses = poses;
    }
    
    // Pick random pose from the filtered poses
    const randomIndex = Math.floor(Math.random() * filteredPoses.length);
    const pose = filteredPoses[randomIndex];
    
    const fileUrl = pose.replace(/\\/g, '/');
    console.log(fileUrl);
    const imageData = await window.fs.readImage(fileUrl);
    return imageData;
}

async function getImagesFromPosePack() {
    let fileArray = [];
    await window.fs.Find('resources/modules/selfies/pose-pack/*.png').then((files) => {
        fileArray = files;
    })
    return fileArray;
}

export function init() {
    window.hooks.on("moemate-selfie:handle_skill_create_selfie", (event) => _createSelfie(event));
    window.hooks.on("models:response:ImaginAIry-Selfie", (data) => _handleResponse(data));
}