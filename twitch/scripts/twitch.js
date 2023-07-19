import { ChatClient } from '@twurple/chat';
import { StaticAuthProvider } from '@twurple/auth';
import * as TwitchAuth from './twitch-auth.js'

let twitchClient = null;
export class TwitchClient {

    clientId = null;
    scopes = 'user:read:email channel:read:subscriptions channel:moderate chat:edit chat:read whispers:read whispers:edit user:read:follows user:read:broadcast user:edit';
    accessToken = null;
    userInfo = null;
    chatClient = null;
    messageCount = 0;
    messageLog = [];
    permaMessageLog = [];
    subscriberLog = [];
    followerLog = [];
    raidLog = [];
    auth = null;
    interval = null;
    settings = {
        chatTime: 45,
        showChat: true,
        showSubs: true,
        showRaid: true,
        subsOnly: false,
        twitchOn: false  
    }
    lastEventTime = Date.now();
    eventQueue = [];

    constructor() {
        window.hooks.on('twitch_auth:login_update', (loginStatus) => {
            if (loginStatus) {
                TwitchAuth.GetAccessToken().then((twitchToken) => {
                    if (twitchToken) {
                        this.accessToken = twitchToken;
                        TwitchAuth.GetUserInfo().then((user) => {
                            this.userInfo = user;
                            this.toggleTwitch(this.settings.twitchOn)
                            window.hooks.emit('twitch_auth:accountupdate', ({ signedIn: true, userInfo: this.userInfo }))
                        })
                    }
                })

                TwitchAuth.GetClientID().then((twitchClientID) => {
                    if (twitchClientID) {
                        this.clientId = twitchClientID;
                    }
                })
            } else {
                this.accessToken = null;
                this.userInfo = null;
                window.hooks.emit('twitch_auth:accountupdate', ({ signedIn: false }))
            }
        })

        window.storage.Get('twitch:settings').then((settings) => {
            if (settings) {
                this.settings = JSON.parse(settings);
            }
        })

        TwitchAuth.CreateTwitchAuthWindow(true);
    }

    async saveSettings() {
        await window.storage.Set('twitch:settings', JSON.stringify(this.settings));
    }

    getStatus() {
        return this.settings.twitchOn;
    }

    isSignedIn() {
        return this.accessToken != null;
    }

    // Connects to the Twitch Chat
    async connectToChat() {
        if (!this.accessToken) {
            throw new Error('Must authenticate before connecting to chat');
        }
        const userInfo = this.userInfo;
        this.auth = new StaticAuthProvider(this.clientId, this.accessToken, this.scopes);
        this.chatClient = new ChatClient(this.auth, { channels: [userInfo.login] });
        this.chatClient.connect();
        console.log(this.chatClient.onAuthenticationSuccess(() => { console.log("Connected."); }));
        this.chatClient.join(userInfo.login);
        this.chatClient.onMessage(async (channel, user, text, msg) => {
            if (!this.settings.showChat) return;
            if (this.settings.subsOnly && !msg.userInfo.isSubscriber) return;
            const logMessage = {
                username: user,
                message: text
            };
            this.messageLog.push(logMessage);
            this.permaMessageLog.push(logMessage);
            this.messageCount++;
            console.log(`Message received: ${text}`);
        });

        this.chatClient.onSub(async (channel, user, subInfo, msg) => {
            if (!this.showSubs) return;
            const logMessage = {
                username: user,
                message: subInfo.message,
                type: 'sub'
            };
            this.eventQueue.push(logMessage);
            this.subscriberLog.push(`Sub received from ${user}: ${subInfo.message}\n`);
            this.messageCount++;
            console.log(`Sub received: ${subInfo.message}`);
        });

        this.chatClient.onResub(async (channel, username, subInfo, msg) => {
            if (!this.showSubs) return;
            const logMessage = {
                username: username,
                months: subInfo.months,
                message: subInfo.message,
                type: 'resub'
            };
            this.eventQueue.push(logMessage);
            this.subscriberLog.push(`Resub received from ${username}: ${subInfo.message}`);
            this.messageCount++;
            console.log(`Resub received: ${subInfo.message}\n`);
        });

        this.chatClient.onRaid(async (channel, username, raidInfo) => {
            if (!this.settings.showRaid) return;
            const info = {
                username: username,
                viewers: raidInfo.viewerCount,
                type: 'raid'
            };
            this.eventQueue.push(info);
            this.raidLog.push(`Raid received from ${username} with ${raidInfo.viewerCount}\n`);
            this.messageCount++;
            console.log(`Raid received: ${username}`);
        });

        let timeoutFunction = (async () => {
            this.userInfo = this.userInfo;
            console.log(this.userInfo)
            console.log(`Checking for events. Queue length: ${this.eventQueue.length}`);
            if (this.messageLog.length > 0) {
                // Create a copy of the current message group
                const messageGroupCopy = [...this.messageLog];
                // Clear the message group for the next interval
                this.messageLog = [];
                this.addTwitchChat(messageGroupCopy);
            }
            if (this.eventQueue.length > 0) {
                for (let event of this.eventQueue) {
                    if (event.type === 'sub') {
                        this.addTwitchSub(event)
                    } else if (event.type === 'resub') {
                        this.addTwitchResub(event);
                    } else if (event.type === 'raid') {
                        this.addTwitchRaid(event);
                    }
                }
            }
            if (this.messageCount > 0) {
                console.log(`Firing twitchContextRefresh event with ${this.messageCount} messages`)

                window.companion.Interrupt(); //Wake up sleepy head
                this.messageCount = 0;
            }
            this.eventQueue = [];
            if (this.settings.twitchOn) setTimeout(timeoutFunction, this.settings.chatTime * 1000);    
        })
        setTimeout(timeoutFunction, this.settings.chatTime * 1000);
    }

    async disconnect() {
        if (this.interval) clearInterval(this.interval);
        this.chatClient = null;
        this.interval = null;
    }
    // Method to initiate Twitch SSO authentication
    async authenticate() {
        TwitchAuth.CreateTwitchAuthWindow(false);
    }
    async logOut() {
        TwitchAuth.CreateLogoutWindow();
    }
    setChatTime(time) {
        this.settings.chatTime = time;
        this.saveSettings();
    }
    toggleChat(show) {
        this.settings.showChat = show;
        this.saveSettings();
    }
    toggleSubs(subs) {
        this.settings.showSubs = subs;
        this.saveSettings();
    }
    toggleRaid(raid) {
        this.settings.showRaid = raid;
        this.saveSettings();
    }
    toggleSubsOnly(subs) {
        this.settings.subsOnly = subs;
        this.saveSettings();
    }
    toggleTwitch(state) {
        this.settings.twitchOn = state;
        if (state) { 
            this.connectToChat();
        } else {
            this.disconnect();
        }
        this.saveSettings();
    }
    getTwitchInfo() {
        return this.userInfo;
    }
    getMessageLog() {
        const lastTenMessages = this.permaMessageLog.slice(-10);
        return lastTenMessages;
    }

    getSubscriberLog() {
        const lastTenSubscribers = this.subscriberLog.slice(-10);
        return lastTenSubscribers;
    }

    getRaidLog() {
        const lastTenRaids = this.raidLog.slice(-10);
        return lastTenRaids;
    }
    getFollowerLog() {
        return this.followerLog;
    }

    addTwitchChat(messages) {
        console.log('twitch chat', messages)
        messages.forEach(message => {
          const timestamp = Date.now();
          const memoryData = {
            user: 'system',
            type: 'TWITCH_CHAT',
            value: `${message.username}: ${message.message}`,
            timestamp,
            importance: 1,
          };
          
          window.companion.SendMessage(memoryData);
        });
      }

      addTwitchSub(message){
        const timestamp = Date.now();
        const memoryData = {
          user: 'system',
          type: 'TWITCH_SUB',
          value: `${message.username} subbed with the message: ${message.message}`,
          timestamp,
          importance: 3,
        };
        window.companion.SendMessage(memoryData);
      }

      addTwitchResub(message){
        const timestamp = Date.now();
        const memoryData = {
          user: 'system',
          type: 'TWITCH_RESUB',
          value: `${message.username} subbed for ${message.months} months with the message: ${message.message}`,
          timestamp,
          importance: 3,
        };
        window.companion.SendMessage(memoryData);
      }

      addTwitchRaid(message){
        const timestamp = Date.now();
        const memoryData = {
          user: 'system',
          type: 'TWITCH_RAID',
          value: `${message.username} is raiding with ${message.viewers} raiders.`,
          timestamp,
          importance: 4,
        };
        window.companion.SendMessage(memoryData);
      }    
};


const formatTwitchMessage = (twitchMessage) => {
    return `${twitchMessage.username}: ${twitchMessage.message}`;
}

function _handleSetPrompts(model, type) {
    if (type == 'chat' && twitchClient.getStatus()) {
        //Load the context
        let twitchInfo = this.getTwitchInfo();
        let twitchInfoString = "Twitch not connected.";
        if (twitchInfo) twitchInfoString = `\n## <Display Name>: ${twitchInfo.display_name}\n## <Description>: ${twitchInfo.description}\n## <Member Since>: ${twitchInfo.created_at}`;
        twitchContext = {
            twitchInfo: twitchInfoString,
            twitchMessages: twitchClient.getMessageLog().map(twitchMessage => formatTwitchMessage(twitchMessage)),
            twitchSubscribers: twitchClient.getSubscriberLog(),
            twitchFollowers: twitchClient.getFollowerLog(),
            twitchRaids: twitchClient.getRaidLog()
        }
        window.models_llm.ApplyContextObject(twitchContext);
        window.prompts_llm.SetPrompt('moemate-twitch:twitch', { role: 'system' });
    }
}

export function preload() {
    twitchClient = new TwitchClient();
    window.twitchClient = twitchClient;
}

export function init() {

    window.hooks.on('twitch:authenticate', () => {
        twitchClient.authenticate();
    })

    window.hooks.on('twitch:logout', () => {
        twitchClient.logOut();
    });


    window.hooks.on("set_prompts", ({model, type}) => _handleSetPrompts(model, type));

    window.components.AddComponentToScreen('main-menu', 'TwitchMenuButton');
    window.components.AddComponentToScreen('settings-window', 'TwitchSettings');
}
