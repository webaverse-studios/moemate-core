<p style="text-align: center;"><h1>Moemate Core Modules</h1></p>

<p align="center">
  <img src="https://static.wixstatic.com/media/23bb89_f9bd2f871f5c4bafb4a5f377a7f57d11~mv2.png/v1/fit/w_2500,h_1330,al_c/23bb89_f9bd2f871f5c4bafb4a5f377a7f57d11~mv2.png" alt="Moemate"/>
</p>

This is the full source code for all of the models we have shipped so far in Moemate.  By themselves they are likely not very useful. But can be used as an example of how to create your own
addon modules for Moemate!

To download and use the Moemate companion yourself, head to the [Moemate Website](https://www.moemate.io)

---

## Core Module
Contains all the base models and behaviors of Moemate.

### Skills
- **Emote** - Plays an emotion animation
- **Expression** - Plays an emotion animation along with spoken text.
- **Mood** - Sets the companion's mood
- **Settings Change** - Gives the companion the ability to change app settings
- **Stop** - Tells the companion to stop talking and wait for a response
- **Text** - Send and speak a chat message

### Models
- **Azure** - Text to speech
- **Claude Instant v1.1** - Anthropic Conversational AI
- **Claude v2** - Newest version of Anthropic Conversational AI
- **Elevenlabs** - Text to speech
- **GPT 3.5 Turbo** - OpenAI Conversational AI
- **GPT 4** - Newest version of OpenAI Conversational AI
- **Talknet** - Moemate internal text to speech model

---

## Image Generation
This module gives the companion the ability to generate images.

### Skills
- **Create Image** - Generate an image from a collection of tags

### Models
- **ImaginAIry**
- **Stable Diffusion**

---

## Selfies
Gives the companion the ability to take selfies of itself in various poses.

### Skills
- **Create Selfie**

### Models
- **ImaginAIry Selfie**

---

## Twitch
Gives the companion the abilitiy to join your twitch stream and engage with your subscribers and viewers.

---

## Web Search
Gives the companion the ability to search the web for Images, Videos, and Web pages

### Skills
- **Web Search**

### Models
- **Bing Search API**