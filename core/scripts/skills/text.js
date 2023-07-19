function fixUrlForVoice(text) {
    const pattern = /(?:(?:https?|ftp):\/?\/?)?(?:www\.)?(\S+)\.([A-Z]*)\/?\S*/ig;
    const matches = text.matchAll(pattern);

    for (const match of matches) {
        if (match) {
            text = text.replace(match[0], match[1] + '.' + match[2]);
        }
    }
    return text;
}

function formatForJSON(str) {
    return str.replace(/\\/g, "\\\\")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/\"/g, '\\"')
    .replace(/\//g, '\\\/')
    .replace(/\b/g, '')
    .replace(/\f/g, '')
    .replace(/\t/g, '\\t');
}


function normalizeText(text) {
    return text.replace(/[^a-zA-ZÀ-ÿ0-9.,?!:;'"`@#$\*%& \n]/g, ' ')
        .replace(/ +/g, ' ')
        .trim()
        .normalize('NFKD'); // combine diacritics
}

async function _handleTtsStreamResponse(response) {
    //Wait for turn
    window.companion.Lock();
    await window.companion.WaitForVoice(async () => {
        //Send text to agent
        window.companion.SendMessage({ type: "TEXT", user: response.args.name, value: response.args.value})
        //Send voice stream to agent
        await window.companion.SendVoiceStream(response.stream);
        window.companion.Unlock();
    })
}

async function handleTextSkill(event) {
    const voiceText = normalizeText(fixUrlForVoice(event.value));
    const voice = window.models_tts.GetVoice();
    window.companion.Lock();
    //Call the TTS Model
    window.models_tts.SetCurrentModel(voice.model);
    let prosodyPitch = window.companion.GetCharacterAttribute('voiceProsodyPitch');
    let prosodyRate = window.companion.GetCharacterAttribute('voiceProsodyRate');
    let voiceStyle = window.companion.GetCharacterAttribute('voiceStyle');

    if (!prosodyPitch) prosodyPitch = 15;
    if (!prosodyRate) prosodyRate = 15;
    if (!voiceStyle && voice.StyleList) {
        voiceStyle = voice.StyleList[0];
    } else if (!voiceStyle) {
        voiceStyle = "";
    }

    const context = {
        tts: {
            text: formatForJSON(voiceText),
            style: voiceStyle,
            prosodyRate: prosodyRate,
            prosodyPitch: prosodyPitch
        }
    }
    window.models_tts.ApplyContextObject(context);
    const result = await window.models_tts.CallCurrentModel(event);
    if (!result) {
        //Calling the TTS failed... so lets just send the text and no voice.
        window.companion.SendMessage({ type: "TEXT", user: event.name, value: event.value})

        window.hooks.emit('tts:failed', event);
    }
    window.companion.Unlock();
}

export function init() {
    window.hooks.on("moemate_core:handle_skill_text", (event) => handleTextSkill(event));
    window.hooks.on("models:response:stream:Elevenlabs", (text) => _handleTtsStreamResponse(text));
    window.hooks.on("models:response:stream:Moemate Talknet", (text) => _handleTtsStreamResponse(text));
    window.hooks.on("models:response:stream:Azure", (text) => _handleTtsStreamResponse(text));
}