
// Temp fix for now.
// For future releases, we should make the skills actually receive an object for arguments... 
const argumentParser = (skill, args) => {
  if (skill === "emote"){
    return ["EMOTE", {value: args.emote_name}];
  }
  if (skill === "expression"){
    return ["EXPRESSION", {value: args.text}];
  }
  if (skill === "change_mood"){
    return ["MOOD", {value: args.mood_name}];
  }
  if (skill === "settings_change"){
    return ["SETTINGS_CHANGE", {value: args.setting_name + "=" + args.setting_value}];
  }
  if (skill === "stop"){
    return ["STOP", {value: true}];
  }
  if (skill === "text"){
    return ["TEXT", {value: args.text}];
  }
  if (skill === "create_image"){
    return ["CREATE_IMAGE", {value: args.image_description}];
  }
  if (skill === "search_web"){
    return ["SEARCH_WEB", {value: `(${args.category}) ${args.query_subject}` }];
  }
}


export class FunctionStreamParser extends WritableStream {
    currentFunction = null;
    args = ""
    currentText = "";

    parseChunk(chunk) {
      //console.log(chunk);
      if (chunk?.delta?.function_call){
        if (this.currentFunction == null) {
          //console.log("Function call: " + chunk?.delta?.function_call?.name);
          this.currentFunction = chunk?.delta?.function_call?.name;
        } else {
          //console.log("Function call args: " + chunk?.delta?.function_call?.arguments);
          this.args += chunk?.delta?.function_call?.arguments;
        }
      } else if (chunk?.delta?.content != null){
        //console.log("Text: " + chunk.delta.content);
        this.currentText+=chunk.delta.content;
      } else if (chunk.finish_reason == "function_call") {
        //console.log("Calling function: " + this.currentFunction + " with args: " + this.args);
        let jsonArgs = JSON.parse(this.args);

        let [skill, args] = argumentParser(this.currentFunction, jsonArgs);
        window.skills_llm.CallSkill(skill, args);
        this.currentFunction = null;
        this.args = "";
      } else if (this.currentText){ //finished with text
          // TODO split by sentences and send each line
          //console.log("Sending text: " + this.currentText);
          window.skills_llm.CallSkill("TEXT", {value: this.currentText});
          this.currentText = "";
      }
    }

    constructor(cb) {
      super({
        write: (chunk, _) => {
          this.parseChunk(chunk);
          },
        close: () => {
          cb();
        }
      })
    }
  }