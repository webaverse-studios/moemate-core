const React = window.react;
const { useState, useEffect } = React;
const { Switch, SettingsBackButton } = window.settingsUI;

function classnames() {
  var classes = [];

  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (!arg) continue;

    var argType = typeof arg;

    if (argType === 'string' || argType === 'number') {
      classes.push(arg);
    } else if (Array.isArray(arg)) {
      if (arg.length) {
        var inner = classNames.apply(null, arg);
        if (inner) {
          classes.push(inner);
        }
      }
    } else if (argType === 'object') {
      if (arg.toString !== Object.prototype.toString && !arg.toString.toString().includes('[native code]')) {
        classes.push(arg.toString());
        continue;
      }

      for (var key in arg) {
        if (hasOwn.call(arg, key) && arg[key]) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(' ');
}

export const TwitchSettings = () => {
  const [twitchToggle, setTwitchToggle] = useState(window.twitchClient?.settings.twitchOn);
  const [subsOnly, setSubsOnly] = useState(window.twitchClient.settings.subsOnly);
  const [showChat, setShowChat] = useState(window.twitchClient.settings.showChat);
  const [showSubs, setShowSubs] = useState(window.twitchClient.settings.showSubs);
  const [showRaid, setShowRaid] = useState(window.twitchClient.settings.showRaid);
  const [chatTime, setChatTime] = useState(window.twitchClient.settings.chatTime);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [open, setOpen] = useState(false);

  window.hooks.on("twitch:activate_settings", (active) => {
    setOpen(active);
  })

  // Detect Switch Changes and Update Settings
  const toggleTwitch = (e) => {
    setTwitchToggle(e);
    window.twitchClient?.toggleTwitch(e);
  };

  useEffect(() => {
    if (!open) {
      window.hooks.emit('twitch:deactivate_menu_button')
    }
  }, [open])

  useEffect(() => {
    window.twitchClient.toggleChat(showChat);
  }, [showChat]);

  useEffect(() => {
    window.twitchClient.toggleSubs(showSubs);
  }, [showSubs]);

  useEffect(() => {
    window.twitchClient.setChatTime(chatTime);
  }, [chatTime]);

  useEffect(() => {
    window.twitchClient.toggleRaid(showRaid);
  }, [showRaid]);

  useEffect(() => {
    window.twitchClient.toggleSubsOnly(subsOnly);
  }, [subsOnly]);

  useEffect(() => {
    window.hooks.on('twitch_auth:accountupdate', (update) => {
      if (update.signedIn) {
        setIsSignedIn(true);
        setUsername(update.userInfo.login);
      } else {
        setIsSignedIn(false);
      }
    })
  }, []);

  return (
    <>
      <div className={classnames(
        window.styles?.CompanionSettings?.wrap,
        window.styles?.CompanionSettings?.full,
        open == true ? window.styles?.CompanionSettings?.open : null,
        "focusAppOnHover"
      )}>
        <SettingsBackButton
          icon="caretLeft"
          onClick={e => {
            setOpen(false)
          }}
        />
        <div className={window.styles?.CompanionSettings?.settingsTitle}>Twitch Settings</div>
        <div className={classnames(
          window.styles?.CompanionSettings?.row,
          window.styles?.CompanionSettings?.scroll,
          window.styles?.CompanionSettings?.generalSettings,
        )}>
          <div className={window.styles?.CompanionSettings?.scroll}>
            {!isSignedIn && (
              <div className={window.styles?.CompanionSettings?.formItem}>
                <button className={window.styles?.CompanionSettings?.button} onClick={() => window.hooks.emit('twitch:authenticate')}>
                  Login to Twitch
                </button>
              </div>
            )}
            {isSignedIn && (
              <>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <label>Signed in as:</label>
                  <input type="text" value={username} disabled={true} />
                </div>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <button className={window.styles?.CompanionSettings?.button} onClick={() => window.hooks.emit('twitch:logout')}>
                    Log Out of Twitch
                  </button>
                </div>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <Switch
                    label={"Streamer Mode"}
                    checked={twitchToggle}
                    onChange={e => {
                      toggleTwitch(!twitchToggle);
                    }}
                  />
                </div>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <Switch
                    label={"Subs Only Chat"}
                    checked={subsOnly}
                    onChange={e => {
                      setSubsOnly(!subsOnly);
                    }}
                  />
                </div>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <Switch
                    label={"Show Chat"}
                    checked={showChat}
                    onChange={e => {
                      setShowChat(!showChat);
                    }}
                  />
                </div>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <Switch
                    label={"Show Subs"}
                    checked={showSubs}
                    onChange={e => {
                      setShowSubs(!showSubs);
                    }}
                  />
                </div>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <Switch
                    label={"Show Raids"}
                    checked={showRaid}
                    onChange={e => {
                      setShowRaid(!showRaid);
                    }}
                  />
                </div>
                <div className={window.styles?.CompanionSettings?.formItem}>
                  <label>{`Log Refresh Interval (Seconds)`}</label>
                  <input type="range" min='10' value={chatTime} className={window.styles?.CompanionSettings?.horizontal} onChange={(e) => { setChatTime(e.target.value) }} />
                  <input type="number" min='10' value={chatTime} className={window.styles?.CompanionSettings?.horizontal} onChange={(e) => { setChatTime(e.target.value) }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};