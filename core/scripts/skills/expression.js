async function handleExpressionSkill(event) {
    window.companion.SendMessage({type: "EXPRESSION", user: event.name, value: event.value});

    const text = event.value;
    const emotions = text.match(/<([^>]+)>/g);

    window.companion.Lock();
    
    //Call the TTS Model 
    window.hooks.emit('moemate_core:handle_skill_text', event)
    if (emotions?.length > 0){
      setTimeout(()=>{
        // small delay, audio plays a bit delayed 
        window.companion.SetEmote(emotions[0].replace(/[<>]/g, '')); 
        // remove < and > 
      },100)
    }
    
    window.companion.Unlock();
    window.companion.Interrupt();
  }
  
  export function init() {
    window.hooks.on("moemate_core:handle_skill_expression", (event) => handleExpressionSkill(event));
  }