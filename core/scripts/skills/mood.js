async function handleMoodSkill(event) {
    window.companion.SendMessage({type: "MOOD", user: event.name, value: event.value});

    window.companion.Lock();
    const mood = event.value;
    window.companion.SetMood(mood);
    window.companion.Unlock();
    window.companion.Interrupt();
}

export const moods = 
[
  {
    "name": "neutral"
  },
  {
    "name": "angry"
  },
  {
    "name": "fun"
  },
  {
    "name": "joy"
  },
  {
    "name": "sorrow"
  },
  {
    "name": "surprise"
  }
]

export function preload(){
    const validMoods = moods.map(m => m.name);
    window.models_llm.ApplyContextObject({validMoods})
}

export function init() {
    window.hooks.on("moemate_core:handle_skill_mood", (event) => handleMoodSkill(event));
}