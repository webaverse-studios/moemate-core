
// let isStopSkill = false;
/*
    Since now we call `this.stop()` after every llm response in `ai-agent-controller.js`,
    then will always only show one text message,
    so it's safe to not check whether there is STOP skill in response ( ie: moemate_core:handle_skill_stop event ),
    can resotre the checking of `isStopSkill` when we removed this hack.
*/

async function _handleTtsStreamResponse(response) {
    // if (isStopSkill) {
        // isStopSkill = false;
        window.companion.Lock();
        await window.companion.WaitForVoice(async () => {
            window.companion.SendMessage({type: "STOP", user: response.args.name, value: response.args.value});
            window.companion.Unlock();
        })
    // }
}

async function handleStopSkill(event) {
    // isStopSkill = true;
    window.hooks.emitSync("character:stop")
}

export function init() {
    window.hooks.on("moemate_core:handle_skill_stop", (event) => handleStopSkill(event));
    window.hooks.on("models:response:stream:Elevenlabs", (text) => _handleTtsStreamResponse(text));
    window.hooks.on("models:response:stream:Moemate Talknet", (text) => _handleTtsStreamResponse(text));
    window.hooks.on("models:response:stream:Azure", (text) => _handleTtsStreamResponse(text));

    window.hooks.on('tts:failed', event => {
        // if (isStopSkill) {
            // isStopSkill = false;
            window.companion.SendMessage({type: "STOP", user: event.name, value: event.value});
        // }
    })
}