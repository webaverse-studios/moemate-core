

async function handleEmoteSkill(event) {
    window.companion.SendMessage({type: "EMOTE", user: event.name, value: event.value});
    window.companion.Lock();
    const emotion = event.value;
    window.companion.SetEmote(emotion);
    window.companion.Unlock();
    window.companion.Interrupt();
}

export const emotes = [
    {
      "name": "agree",
      "animation": "agree",
      "emotion": "joy"
    },
    {
      "name": "angry",
      "animation": "angryFists",
      "emotion": "angry"
    },
    {
      "name": "apologetic",
      "animation": "apologetic",
      "emotion": "neutral"
    },
    {
      "name": "confused",
      "animation": "confused",
      "emotion": "angry"
    },
    {
      "name": "curious",
      "animation": "curious",
      "emotion": "headShake"
    },
    {
      "name": "cry",
      "animation": "cry",
      "emotion": "sorrow"
    },
    {
      "name": "disagree",
      "animation": "disagree",
      "emotion": "headShake"
    },
    {
      "name": "embarrassed",
      "animation": "embarrassed2",
      "emotion": "embarrassed"
    },
    {
      "name": "excited",
      "animation": "excited",
      "emotion": "fun"
    },
    {
      "name": "headNod",
      "animation": "headNod",
      "emotion": "headNod"
    },
    {
      "name": "headShake",
      "animation": "headShake2",
      "emotion": "headShake"
    },
    {
      "name": "irritated",
      "animation": "angryFistsSoft",
      "emotion": "angry"
    },
    {
      "name": "listening",
      "animation": "listen",
      "emotion": "neutral"
    },
    {
      "name": "sad",
      "animation": "sad",
      "emotion": "sorrow"
    },
    {
      "name": "shocked",
      "animation": "shocked",
      "emotion": "surprise"
    },
    {
      "name": "surprise",
      "animation": "surprise",
      "emotion": "surprise"
    },
    {
      "name": "upset",
      "animation": "upset",
      "emotion": "sorrow"
    },
    {
      "name": "victory",
      "animation": "victory",
      "emotion": "victory"
    },
  
    {
      "name": "applaud",
      "animation": "applaud",
      "emotion": "joy"
    },
    {
      "name": "dope",
      "animation": "dab",
      "emotion": "victory"
    },
    {
      "name": "blessing",
      "animation": "blessing",
      "emotion": "joy"
    },
    {
      "name": "love",
      "animation": "love",
      "emotion": "joy"
    },
    {
      "name": "kiss",
      "animation": "kiss",
      "emotion": "joy"
    },
    {
      "name": "anxiety",
      "animation": "anxiety",
      "emotion": "surprise"
    },
    {
      "name": "stop",
      "animation": "stop",
      "emotion": "angry"
    },
    {
      "name": "celebrate",
      "animation": "celebrate",
      "emotion": "victory"
    }
  ]


export async function preload(){
    const validEmotions = emotes.map(e => e.name);
    window.models_llm.ApplyContextObject({validEmotions})
}



export function init() {
    window.hooks.on("moemate_core:handle_skill_emote", (event) => handleEmoteSkill(event));
}