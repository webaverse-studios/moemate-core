const React = window.react;
const { useState, useEffect } = React;
const { SettingsButton } = window.settingsUI;

export const TwitchMenuButton = () => {
    const [active, setActive] = useState(false);

    useEffect(() => {
      window.hooks.emit("twitch:activate_settings", active);
    },[active, setActive])

    window.hooks.on("twitch:deactivate_menu_button", () => {
      setActive(false);
    })

    return (
        <div id='twitch'>
          <SettingsButton
            tooltipText="Twitch"
            icon="twitch"
            active={active}
            onClick={e => {
              setActive(!active);
            }}
          />
        </div>
    )
}