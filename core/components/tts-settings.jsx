const React = window.react;
const { useState, useEffect } = React;

export const CoreTtsSettings = () => {
    const [voice, setVoice] = useState("");
    const [voiceStyle, setVoiceStyle] = useState("");
    const [voiceProsodyRate, setVoiceProsodyRate] = useState(15);
    const [voiceProsodyPitch, setVoiceProsodyPitch] = useState(15);

    useEffect(() => {
        const onCharacterUpdate = (arg) => {
            switch (arg.key) {
                case 'voice':
                    window.models_tts.SetVoice(arg.value);
                    setVoice(arg.value);
                    break;
                case 'voiceStyle':
                    setVoiceStyle(arg.value);
                    break;
                case 'voiceProsodyRate':
                    setVoiceProsodyRate(arg.value);
                    break;
                case 'voiceProsodyPitch':
                    setVoiceProsodyPitch(arg.value);
                    break;
            }
        }
        window.hooks.on("characterupdate", onCharacterUpdate)

        const onCharacterReady = (spec) => {
            window.models_tts.SetVoice(spec.voice);
            setVoice(spec.voice);
            setVoiceStyle(spec.voiceStyle);
            setVoiceProsodyRate(spec.voiceProsodyRate ? spec.voiceProsodyRate : 15);
            setVoiceProsodyPitch(spec.voiceProsodyPitch ? spec.voiceProsodyPitch : 15);
        }
        window.hooks.on("characterready", onCharacterReady);

    }, [setVoice, setVoiceStyle]);

    return (
        <>
            <div className={window.styles.CompanionSettings.formItem}>
                <label>Voice</label>
                <select
                    onChange={(e) => {
                        window.companion.SetCharacterAttribute('voice', e.target.value);
                    }}
                    value={voice}
                >
                    {window.models_tts.GetVoices().map((model) => {
                        return (
                            <option value={model.name} key={model.name}>
                                {model.name}
                            </option>
                        );
                    })
                    }
                </select>
            </div>
            {window.models_tts.GetCurrentModel() == 'Azure' && window.models_tts.GetVoice().StyleList && (
                <div className={window.styles.CompanionSettings.formItem}>
                    <label>Style</label>
                    <select
                        onChange={(e) => {
                            window.companion.SetCharacterAttribute('voiceStyle', e.target.value);
                        }}
                        value={voiceStyle}
                    >
                        {window.models_tts.GetVoice().StyleList.map((style) => {
                            return (
                                <option value={style} key={style}>
                                    {style}
                                </option>
                            );
                        })
                        }
                    </select>
                </div>
            )}
            {window.models_tts.GetCurrentModel() == 'Azure' && (
                <>
                    <div className={window.styles.CompanionSettings.formItem}>
                        <label>Voice Prosody Rate</label>
                        <input
                            type="range"
                            className={window.styles.CompanionSettings.horizontal}
                            min="1"
                            max="100"
                            onChange={(e) => {
                                window.companion.SetCharacterAttribute('voiceProsodyRate', e.target.value);
                            }}
                            value={voiceProsodyRate}
                        />
                    </div>

                    <div className={window.styles.CompanionSettings.formItem}>
                        <label>Voice Prosody Pitch</label>
                        <input
                            type="range"
                            className={window.styles.CompanionSettings.horizontal}
                            min="1"
                            max="100"
                            onChange={(e) => {
                                window.companion.SetCharacterAttribute('voiceProsodyPitch', e.target.value);
                            }}
                            value={voiceProsodyPitch}
                        />
                        <div className={window.styles.CompanionSettings.formItem}>
                            <p/>
                            <button
                                className={window.styles.CompanionSettings.btn}
                                onClick={() => {
                                    window.companion.SetCharacterAttribute('voiceProsodyPitch', 15);
                                    window.companion.SetCharacterAttribute('voiceProsodyRate', 15);
                                }}
                            >
                                Reset Prosody
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}