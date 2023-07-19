async function handleSettingsChangeSkill(event){
    window.companion.SendMessage({type: "SETTINGS_CHANGE", user: event.name, value: event.value});

    window.companion.Lock();
    const settingsChangeRequest = event.value.toLowerCase().replace(/\s/g, '');
    const split = settingsChangeRequest.split('=');
    if (split.length !== 2)
        return

    let setting = split[0];
    let value = split[1];
    if (setting === 'volume') {
        try{
            value = parseInt(value);
        } catch (e){
            return;
        }
    } else if (setting === 'closed_captioning' || setting === 'closedcaptioning' || setting === 'captions' || setting === 'closed_captions') {
        setting = 'closedCaptioning';
        if (value === 'true' || value === 'false' || value === 'on' || value === 'off')
            value = value === 'true' || value === 'on';
        else
            return;
            
    } else {
        return;
    }
    window.companion.SetSetting(setting, value);
    window.companion.Unlock();
}


export function init() {
    window.hooks.on("moemate_core:handle_skill_settings_change", (event) => handleSettingsChangeSkill(event));
}