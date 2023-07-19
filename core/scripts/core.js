/**
 * The default module for moemate, with basic skills and prompts
 * @module moemate
 */

import { AvatarMLStreamParser } from './lib/avatarml.js';
import { FunctionStreamParser } from './lib/functions.js';
import { createParser } from './lib/parser.js';

/* STREAMING HANDLERS */
const textDecoder = new TextDecoder();
export class ModelOutputParseStream extends TransformStream {
    constructor(Parser) {
        let controllerObj = { controller: null }; //obj so its pass by ref

        const eventStreamParser = Parser(controllerObj);

        super({
            transform: (chunk, _controller) => {
                controllerObj.controller = _controller;
                const s = textDecoder.decode(chunk);
                eventStreamParser.feed(s);
            },
        });
    }
}


const _openAIFunctionsStreamingParser = (controllerObj) => {
    return createParser(event => {
        if (event.type === 'event') {
            if (event.data !== '[DONE]') { // stream data
                const data = JSON.parse(event.data);

                if (data.choices[0]){
                    controllerObj.controller.enqueue(data.choices[0]);
                }
            } else { // stream end
                // console.log('stream done');
            }
        }
    });
}



const _openAIStreamingParser = (controllerObj) => {
    return createParser(event => {
        if (event.type === 'event') {
            if (event.data !== '[DONE]') { // stream data
                const data = JSON.parse(event.data);
                const content = data.choices[0].delta.content;
                if (content) {
                    controllerObj.controller.enqueue(content);
                }
            } else { // stream end
                // console.log('stream done');
            }
        }
    });
}

const _anthropicStreamingParser = (controllerObj) => {
    let current_content = "";
    return createParser(event => {
        if (event.type === 'event') {
            if (event.data !== '[DONE]') { // stream data
                const data = JSON.parse(event.data);
                if (data.completion) {
                    const data_trimmed = data.completion.trimStart();
                    const new_content = data_trimmed.indexOf(current_content) + current_content.length;
                    let modifiedcontent = data_trimmed.slice(new_content);
                    current_content = data_trimmed;
                    if (modifiedcontent) {
                        controllerObj.controller.enqueue(modifiedcontent);
                    }
                } else {
                    console.log("No completion in data: " + JSON.stringify(data));
                }
            } else { // stream end
                // console.log('stream done');
            }
        }
    });
}


async function _handleStreamResponse(stream, modelClass, styleParser) {
    const ipcStream = new window.IpcStream(stream);
    let streamModelParser;
    switch(modelClass){
        case "openai":
            streamModelParser = _openAIStreamingParser;
            break;
        case "anthropic":
            streamModelParser = _anthropicStreamingParser;
            break;
        case "openai_functions":
            streamModelParser = _openAIFunctionsStreamingParser;
            break;
    }

    const modelOutputParseStream = new ModelOutputParseStream(streamModelParser);
    const response = ipcStream.pipeThrough(modelOutputParseStream);
    let streamStyleParser;
    switch (styleParser){
        case "AvatarML":
            streamStyleParser = new AvatarMLStreamParser(() => {
                window.companion.Unlock();
            });
            break;
        case "Functions":
            streamStyleParser = new FunctionStreamParser(() => {
                window.companion.Unlock();
            });
            break;
        case "None":
            // TODO
            console.log("Uh oh. This shouldn't happen. No style parser selected.");
            break;
    }

    window.companion.Lock();
    await response.pipeTo(streamStyleParser);
}



/* RESPONSE HANDLERS */
function _handleGPTFunctionResponse(response) {
    if (response.choices[0].message.function_call){
        window.models_llm.SetFunctionCall(response.choices[0].message.function_call);
    } else {
        _handleGPTResponse(response);
    }
}

function _handleGPTResponse(response) {
    window.models_llm.SetResponse(response.choices[0].message.content);
}

function _handleClaudeResponse(response) {
    window.models_llm.SetResponse(response.completion.trimStart());
}

function _handleResponse(modelClass, response){
    switch(modelClass){
        case "openai":
            _handleGPTResponse(response);
            break;
        case "anthropic":
            _handleClaudeResponse(response);
            break;
        case "openai_functions":
            _handleGPTFunctionResponse(response);
            break;
    }
}


/* PUTTING MESSAGES IN GLOBAL CONTEXT */
function applyStyleToMessageContent(message, style) {
    if (style == "AvatarML") {
        return message.user !== '@user' ? `:${message.user}::${message.type}:::${message.value}` : message.value;
    } else if (style == "Functions") {
        if (message.type === "TEXT" || message.type === "EXPRESSION") {
            return message.value;
        }
        return message.type + " " + message.value;
    } 
    return message.value;
}


function formatForJSON(str) {
    return str.replace(/\\/g, "\\\\")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/"/g, '\\"')
    .replace(/\//g, '\\\/')
    .replace(/\b/g, '')
    .replace(/\f/g, '')
    .replace(/\t/g, '\\t');
}

function _handleConversation(messageArray, conversationJson, styleParser) {
    for (const m of conversationJson.conversation) {
        let styledMessageContent = applyStyleToMessageContent(m, styleParser);

        messageArray.push({ role: m.user === "@user" ? "user" : "assistant", content: formatForJSON(styledMessageContent) });
    }
    return messageArray;
}


function formatSkillForFunction(skill){
    if (skill.isDisabled) return null;
    if (skill.fn_name && skill.fn_desc && skill.fn_parameters) return {
        "name": skill.fn_name,
        "description": skill.fn_desc,
        "parameters": skill.fn_parameters
    }
    return null;
}

function _addMessagesToContextObject(model, styleParser) {
    let prompts = window.prompts_llm.GetPrompts();

    if (model == "GPT4 Functions" || model == "GPT 3.5 Turbo Functions") {
        const functions = window.skills_llm.GetSkills()
            .map(skill => formatSkillForFunction(skill))
            .filter(skill => skill !== null);

        window.models_llm.ApplyContextObject({ functions });
    }

    window.prompts_llm.ClearPrompts();
    let messages = [];
    for (const p of prompts) {
        //The model is a JSON string, but JSON does not support multiline strings, so format the prompt
        if (p.data?.type == "json") {
            let jsonPrompt = JSON.parse(p.prompt);
            switch (jsonPrompt.type) {
                case 'conversation':
                    messages = _handleConversation(messages, jsonPrompt, styleParser);
                    continue;
            }
        } else {
            messages.push({ role: p.data.role, content: formatForJSON(p.prompt) });
        }
    }
    window.models_llm.ApplyContextObject({ messages });
}


/* HANDLING PROMPTS */
function _handleSetPrompts(model, type) {
    window.prompts_llm.ClearPrompts();
    if (model === "GPT 3.5 Turbo Functions" || model === "GPT4 Functions"){
        switch (type) {
            case 'chat':
                window.prompts_llm.SetPrompt('moemate_core:memories', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:characters_functions', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:tasks', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:perception', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:user', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:conversation', { type: 'json' });
                window.prompts_llm.SetPrompt('moemate_core:generate_response_functions', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'Functions'});
                break;
            case 'force questions and chat':
                window.prompts_llm.SetPrompt('moemate_core:memories', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:characters_functions', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:tasks', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:perception', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:user', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:conversation', { type: 'json' });
                window.prompts_llm.SetPrompt('moemate_core:force_questions_functions', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:generate_response_functions', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'Functions'});
                break;
            case 'extract_information':
                window.prompts_llm.SetPrompt('moemate_core:extract_information', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'None'});
                break;
            case 'generate_importance_score':
                window.prompts_llm.SetPrompt('moemate_core:generate_importance', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'None'});
                break;
            case 'generate_importance_score_batched':
                window.prompts_llm.SetPrompt('moemate_core:generate_importance_score_batch', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'None'});
                break;
        }
        return;
    }
    else if(model === "Claude v2" || model === "Claude v1.1"){
        switch(type){
            case 'chat':
                window.prompts_llm.SetPrompt('moemate_core:intro', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:skills', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:memories', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:characters', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:tasks', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:perception', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:user', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:claude_expansion', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:conversation', { type: 'json' });
                window.prompts_llm.SetPrompt('moemate_core:conversation_guide', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:claude_gaslight', {role: 'assistant'});
                window.prompts_llm.SetPrompt('moemate_core:generate_response', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'AvatarML'});
                break;
            case 'force questions and chat':
                window.prompts_llm.SetPrompt('moemate_core:intro', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:skills', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:memories', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:characters', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:tasks', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:perception', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:user', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:claude_expansion', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:conversation', { type: 'json' });
                window.prompts_llm.SetPrompt('moemate_core:conversation_guide', { role: 'system' });
                window.prompts_llm.SetPrompt('moemate_core:claude_gaslight', {role: 'assistant'});
                window.prompts_llm.SetPrompt('moemate_core:force_questions', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'AvatarML'});
                break;
            case 'extract_information':
                window.prompts_llm.SetPrompt('moemate_core:extract_information', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'None'});
                break;
            case 'generate_importance_score':
                window.prompts_llm.SetPrompt('moemate_core:generate_importance', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'None'});
                break;
            case 'generate_importance_score_batched':
                window.prompts_llm.SetPrompt('moemate_core:generate_importance_score_batch', { role: 'system' });
                window.models_llm.ApplyContextObject({'style_parser': 'None'});
                break;
        }
}

    switch (type) {
        case 'chat':
            window.prompts_llm.SetPrompt('moemate_core:intro', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:skills', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:memories', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:characters', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:tasks', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:perception', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:user', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:conversation', { type: 'json' });
            window.prompts_llm.SetPrompt('moemate_core:conversation_flow', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:generate_response', { role: 'system' });
            window.models_llm.ApplyContextObject({'style_parser': 'AvatarML'});
            break;
        case 'force questions and chat':
            window.prompts_llm.SetPrompt('moemate_core:intro', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:skills', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:memories', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:characters', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:tasks', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:perception', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:user', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:conversation', { type: 'json' });
            window.prompts_llm.SetPrompt('moemate_core:conversation_flow', { role: 'system' });
            window.prompts_llm.SetPrompt('moemate_core:force_questions', { role: 'system' });
            window.models_llm.ApplyContextObject({'style_parser': 'AvatarML'});
            break;
        case 'extract_information':
            window.prompts_llm.SetPrompt('moemate_core:extract_information', { role: 'system' });
            window.models_llm.ApplyContextObject({'style_parser': 'None'});
            break;
        case 'generate_importance_score':
            window.prompts_llm.SetPrompt('moemate_core:generate_importance', { role: 'system' });
            window.models_llm.ApplyContextObject({'style_parser': 'None'});
            break;
        case 'generate_importance_score_batched':
            window.prompts_llm.SetPrompt('moemate_core:generate_importance_score_batch', { role: 'system' });
            window.models_llm.ApplyContextObject({'style_parser': 'None'});
            break;
    }
}

/**
 * Called before the module is loaded
 */
export function preload(){
    window.hbs_helpers.RegisterHelper('moemate_core:is-function-call', (function(function_call) {
        if (function_call === undefined) return false;
        return function_call === "auto"; 

    }).toString());

    window.hbs_helpers.RegisterHelper('moemate_core:format-for-claude', ((messages) => {
        if (messages === undefined) return "";

        messages = messages.map(message => {
           if (typeof message === 'string') {
               return {
                   role: 'system',
                   content: message,
               }
           }
           if (message.role === 'user') {
                return `Human: ${message.content}`;
            } else if (message.role === 'system') {
                return `Human: ${message.content}`;
            } else if (message.role === 'assistant') {
                return `Assistant: ${message.content}`;
            }
            return "";
        });
    
        messages.push("Assistant:");
        return messages.join("\\n\\n");

    }).toString());
}


/**
 * Called when the module is activated. All models, prompts, and style sheets are registered before this call
 */
export function init() {
    window.hooks.on("models:response:Claude-instant v1.1", ({modelClass, response}) => _handleResponse(modelClass, response));
    window.hooks.on("models:response:stream:Claude-instant v1.1", ({stream, modelClass, styleParser}) => _handleStreamResponse(stream, modelClass, styleParser));
    window.hooks.on("models:request:Claude-instant v1.1", ({model, styleParser="None"}) => _addMessagesToContextObject(model, styleParser));
    
    window.hooks.on("models:response:Claude v2", ({modelClass, response}) => _handleResponse(modelClass, response));
    window.hooks.on("models:response:stream:Claude v2", ({stream, modelClass, styleParser}) => _handleStreamResponse(stream, modelClass, styleParser));
    window.hooks.on("models:request:Claude v2", ({model, styleParser="None"}) => _addMessagesToContextObject(model, styleParser));

    window.hooks.on("models:response:GPT 3.5 Turbo Functions", ({modelClass, response}) => _handleResponse(modelClass, response));
    window.hooks.on("models:response:stream:GPT 3.5 Turbo Functions", ({stream, modelClass, styleParser}) => _handleStreamResponse(stream, modelClass, styleParser));
    window.hooks.on("models:request:GPT 3.5 Turbo Functions", ({model, styleParser="None"}) => _addMessagesToContextObject(model, styleParser));
    
    window.hooks.on("models:response:GPT4 Functions", ({modelClass, response}) => _handleResponse(modelClass, response));
    window.hooks.on("models:response:stream:GPT4 Functions", ({stream, modelClass, styleParser}) => _handleStreamResponse(stream, modelClass, styleParser));
    window.hooks.on("models:request:GPT4 Functions", ({model, styleParser="None"}) => _addMessagesToContextObject(model, styleParser));

    window.hooks.on("models:response:GPT 3.5 Turbo", ({modelClass, response}) => _handleResponse(modelClass, response));
    window.hooks.on("models:response:stream:GPT 3.5 Turbo", ({stream, modelClass, styleParser}) => _handleStreamResponse(stream, modelClass, styleParser));
    window.hooks.on("models:request:GPT 3.5 Turbo", ({model, styleParser="None"}) => _addMessagesToContextObject(model, styleParser));
    
    window.hooks.on("models:response:GPT4", ({modelClass, response}) => _handleResponse(modelClass, response));
    window.hooks.on("models:response:stream:GPT4", ({stream, modelClass, styleParser}) => _handleStreamResponse(stream, modelClass, styleParser));
    window.hooks.on("models:request:GPT4", ({model, styleParser="None"}) => _addMessagesToContextObject(model, styleParser));

    window.hooks.on("set_prompts", ({model, type}) => _handleSetPrompts(model, type));

    window.components.AddComponentToScreen('settings-voice', 'tts-settings');
    window.components.AddComponentToScreen('settings-info', 'upload-txt');
}

/**
 * Called when the module is deactivated. For now this is not called when the app is shut down, only when the user deactivates the module.
 */
export function destroy() {

}