/**
 * API interface for Twitch.tv Authentication
 * @author Chris Larkin
 * @author Nevyn Tatum
 */

import url from 'url'
import jwtDecode from 'jwt-decode'

/**
 * Configuration conststants, these are not secret so can be hard coded
 * However might need to change these based on environment (Dev/Stage/Prod)
 */
const API_IDENTIFIER = ""
const TWITCH_AUTH_DOMAIN = "id.twitch.tv";
const CLIENT_ID = "arosrv3mja0b5ywmhr0dxaa5r7rn3f"

const redirectUri = 'https://local.moemate.io/callback';

let accessToken = null;
let authWindow = null;
let username = "";

/**
 * Gets the access token for the currently authed user, or null
 * @returns {string} - Access token
 */
export async function GetAccessToken() {
    return accessToken;
}
export async function GetClientID() {
    return CLIENT_ID;
}

/**
 * Get the url for displaying the login page
 * @returns {string} - Authentication URL 
 */
export function GetAuthenticationURL() {
    return (
        "https://" +
        TWITCH_AUTH_DOMAIN +
        "/oauth2/authorize?" +
        "client_id=" + CLIENT_ID +
        "&redirect_uri=" + redirectUri +
        "&response_type=token&" +
        "scope=" + encodeURIComponent('user:read:email channel:read:subscriptions channel:moderate chat:edit chat:read whispers:read whispers:edit user:read:follows user:read:broadcast user:edit') // update this with your required scopes    
    );
}


/**
 * Not sure what this does yet
 * @param {*} callbackURL 
 */
export async function LoadTokens(callbackURL) {
    const urlParts = url.parse(callbackURL.replace('#', '?'), true);
    const query = urlParts.query;

    if (!query?.access_token) return false;

    accessToken = query.access_token;

    window.hooks.emit('twitch_auth:login_update', true);
    return true;
}

/**
 * Log the current user out
 */
export async function Logout() {
    window.browser.ClearAllCookies(`https://${TWITCH_AUTH_DOMAIN}`);
    accessToken = null;
    window.hooks.emit('twitch_auth:login_update', false);
}

/**
 * Get the URL to log out the current user
 * @returns {string} - Url for logout
 */
export function GetLogOutUrl() {
    return `https://${TWITCH_AUTH_DOMAIN}/oauth2/revoke?client_id=${CLIENT_ID}&token=${accessToken}`;
}

    // Gets the user info for the currently authenticated user
export async function GetUserInfo() {
    if (!accessToken) {
        throw new Error('Must authenticate before getting user info');
    }

    const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
            'Client-ID': CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const data = (await response.json())
    if (data.data && data.data.length > 0) {
        return data.data[0]; // return the first user in the response
    } else {
        throw new Error('No user info returned from Twitch API');
    }
}


/**
 * Open the login screen
 */
export async function CreateTwitchAuthWindow(silent) {
    DestroyAuthWin();
    const primaryDisplay = await window.appapi.GetPrimaryDisplay();
    const { width: globalWidth, height: globalHeight } = primaryDisplay.workAreaSize;

    authWindow = await window.browser.createBrowserWindow({
        width: 500,
        height: 425,
        x: (globalWidth/2) - 250,
        y: (globalHeight/2) - 212,
        frame: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            enableRemoteModule: false
        }
    });

    window.browser.AlwaysOnTop(authWindow, true);
    window.browser.browserGo(authWindow, GetAuthenticationURL())

    const filter = {
        urls: [
            'https://local.moemate.io/callback*'
        ]
    };

    window.browser.onBeforeRequest(authWindow, filter, async (url) => {
        if (await LoadTokens(url)) {
            return DestroyAuthWin();
        }

        return CreateLogoutWindow();
    });

    window.browser.on(authWindow,'closed', () => {
        authWindow = null;
    });

    window.browser.on(authWindow, 'ready-to-show', () => {
        if (!silent) 
        {   
            window.browser.browserShow(authWindow);
        } else {
            //Wait three seconds, if we dont get a callback by then just give up
            var thisWindow = authWindow;
            authWindow = null;
            setTimeout(() => {
                window.browser.closeBrowserWindow(thisWindow);
            }, 3000);
        }        
    })
}

/**
 * Close and destroy the login window
 */
export function DestroyAuthWin() {
    if (!authWindow) return;
    window.browser.closeBrowserWindow(authWindow);
    authWindow = null;
}

/**
 * Create and display a logout window
 */
export async function CreateLogoutWindow() {
    //No need to make a window for this, just call the endpoint;
    DestroyAuthWin();
    
    await fetch(GetLogOutUrl());
    await Logout()
}