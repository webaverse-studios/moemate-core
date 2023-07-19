let lastResponse = undefined;
let lastNewsResponse = undefined;

function _handleSetPrompts(model, type) {
    if (lastResponse) {
        ;
        window.models_llm.ApplyContextObject(lastResponse);
        switch (type) {
            case 'chat':
                window.prompts_llm.SetPrompt('moemate-websearch:websearch', { role: 'system' });
                break;
            case 'force questions and chat':
                window.prompts_llm.SetPrompt('moemate-websearch:websearch', { role: 'system' });
                break;
        }
        lastResponse = undefined;
    }
    if (lastNewsResponse) {
        window.models_llm.ApplyContextObject(lastNewsResponse);
        switch (type) {
            case 'chat':
                window.prompts_llm.SetPrompt('moemate-websearch:news', { role: 'system' });
                break;
            case 'force questions and chat':
                window.prompts_llm.SetPrompt('moemate-websearch:news', { role: 'system' });
                break;
        }
        lastNewsResponse = undefined;
    }
}

function _handleResponse(data) {
    const search = JSON.parse(data);
    //Get top ranked result
    console.log(search);
    const topResultType = search._type;
    switch (topResultType) {
        case 'SearchResponse':
            lastResponse = {
               search: {
                  url: search.webPages.value[0].url,
                  result: search.webPages.value[0].snippet
               }
            }
            window.companion.Interrupt();
            break;
        case 'Images':
            let name = window.companion.GetCharacterAttribute('name');
            window.companion.SendMessage({ type: "WEB_IMAGE", user: name, value: search.value[0].contentUrl, timestamp: Date.now(), alt: search.value[0].name});
            window.companion.Interrupt();
            break;
        case 'Videos':
            let vid_name = window.companion.GetCharacterAttribute('name');
            const regex = /src="([^"]+)"/;
            const match = regex.exec(search.value[0].embedHtml);
            const srcValue = match ? match[1] : '';
            const value = srcValue.split('?')[0];
            window.companion.SendMessage({ type: "WEB_VIDEO", user: vid_name, value, timestamp: Date.now(), alt: search.value[0].name });
            window.companion.Interrupt();
            break;
        case 'News':
            lastNewsResponse = {
                news: {
                    url: search.value[0].url,
                    headline: search.value[0].name,
                    from: search.value[0].provider.name,
                    description: search.value[0].description
                }
            }
            window.companion.Interrupt();
            break;
        default:
            console.log("Unknown result type in web search");
            break;
    }
}

async function _searchWeb(event) {
    window.companion.SendMessage({type: "SEARCH_WEB", user: event.name, value: event.value});

    let filter = 'webpages'
    let value = event.value;
    if (event.value.indexOf(')' > 0)) {
        var regExp = /\(([^)]+)\)/;
        var matches = regExp.exec(event.value);
        if (matches) {
           filter = matches[1].toLowerCase();
           value = value.substring(value.indexOf(')')+2);
        }
    }
    if (filter == "webpages") filter = "";
    const query = {
        query: value,
        responseFilter: filter
    }
    window.models_generic.SetCurrentModel("websearch:bing");
    window.models_generic.ApplyContextObject(query);
    window.companion.Lock();
    await window.models_generic.CallCurrentModel();
    window.companion.Unlock();
}

export function init() {
    window.hooks.on("websearch:handle_skill_websearch", (event) => _searchWeb(event));
    window.hooks.on("models:response:websearch:bing", (data) => _handleResponse(data));
    
    window.hooks.on("set_prompts", ({model, type}) => _handleSetPrompts(model, type));
}