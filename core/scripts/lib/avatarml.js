export class AvatarMLStreamParser extends WritableStream {
  currentData = "";

  getFirstNonColonIndex(str) {
    for (let i = 0; i < str.length; i++) {
      if (str[i] !== ':') {
        return i; // Return the index of the first non-colon character
      }
    }
    return -1; // Return -1 if there are no non-colon characters
  }

  parseChunk(chunk) {
    this.currentData = this.currentData + chunk;
    while (this.currentData.includes('\n')) {
      const text = this.currentData.substring(this.getFirstNonColonIndex(this.currentData), this.currentData.indexOf('\n') + 1);
      if (text.includes('::')) {
        const name = text.substring(0, text.indexOf(':'));
        const skillSub = text.substring(text.indexOf('::')+2)
        const skill = skillSub.substring(0, skillSub.indexOf('::')).replace(/:/g, '');
        let value = "";
        //GPT 3.5 is not very good at AvatarML and sometimes forgets to use three colons for value
        if (skillSub.includes(':::')) {
          value = skillSub.substring(skillSub.indexOf(':::')+3, skillSub.indexOf('\n'));
        } else {
          value = skillSub.substring(skillSub.indexOf('::')+2, skillSub.indexOf('\n'));
        }
        const skills = window.companion.GetCharacterAttribute('skills');
        if (skills && skills[skill]) {
          window.skills_llm.CallSkill(skill, {name: name, value: value});
        } else {
          window.skills_llm.CallSkill('TEXT', {name: name, value: `Cannot call skill: ${skill} is not an enabled skill`});
          //console.log(`Cannot call skill: ${skill} is not a valid skill` )
        }
      } else {
        //console.log(`Cannot parse command: ${text} is not valid AvatarML` )
      }
      this.currentData = this.currentData.substring(this.currentData.indexOf('\n') + 1);
    }
  }

  constructor(cb) {
    super({
      write: (chunk, _) => {
        this.parseChunk(chunk);
        },
      close: () => {
        this.parseChunk('\n');
        cb();
      }
    })
  }
}