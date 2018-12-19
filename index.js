/**
 * @license
 * Copyright (c) 2017-2018 VanishedApps
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @author VanishedApps
 */

"use strict";

const Discord = require("discord.js");
const client = new Discord.Client();

const childProcess = require("child_process");

const unexpectedRestartIdentifier = "unexpected";
const permissions = {
    addReactions: "ADD_REACTIONS",
    sendMessages: "SEND_MESSAGES",
    administrator: "ADMINISTRATOR"
};

process.on("uncaughtException", error => {
    handleGenerically(error);
    let shouldRestart = false;
    if (process.env.RESTARTED !== unexpectedRestartIdentifier) {
        for (const arg of process.argv) {
            if (arg === "restartOnFatalError") {
                shouldRestart = true;
                break;
            }
        }
    }
    exitProcess(1, shouldRestart);
});

const ms = require("ms");
const https = require("https");
const path = require("path");

const packageJSON = require("./package.json");
const configuration = require("./configurations/configuration.json");
const tokenConfiguration = require("./configurations/token.json");
const useProcessEnvIdentifier = "use_process_env";

const restartTimeout = getConfiguration("restartTimeout");
const presenceName = getConfiguration("presenceName");
const prefix = getConfiguration("prefix");
const shipMaxAttempts = getConfiguration("shipMaxAttempts");
const listMaxEntries = getConfiguration("listMaxEntries");
const giveMaxAmount = getConfiguration("giveMaxAmount");
const changelogFetchTimeout = getConfiguration("changelogFetchTimeout");
const developerIDs = getConfiguration("developerIDs");
const developmentGuildIDs = getConfiguration("developmentGuildIDs");
const token = getConfiguration("token");
const developmentEnvironment = getConfiguration("developmentEnvironment");
const cliProcessTimeout = getConfiguration("cliProcessTimeout");
const libraryMap = getLibraries();
const remindmeMaxTimeStringLength = 100;
// 100 is the limit for ms library, see https://github.com/zeit/ms/blob/2.1.1/index.js#L50
const licenseInfoCooldown = 1000 * 60 * 30;

const reminderTimerList = [];
const licenseInfoSentGuildList = new Map();
const maxSafeMessageLength = 2000 - ("_***__~~```".length * 2);
const sendOptionsForLongMessage = {
    split: {
        char: " ",
        maxLength: maxSafeMessageLength
    }
};

const helpString = `Prefix: ${bold("/")}\n\n${bold("/help")},\n${bold("/ping")},\n${bold("/ship")} [me],\n(${bold("/reminder")}\|${bold("/remind")}\|${bold("/remindme")}) <time> <value>,\n${bold("/give")} <mention> <amount> <item>,\n(${bold("/eightball")}\|${bold("/8ball")}) <value>,\n(${bold("/source")}\|${bold("/github")}\|${bold("/repo")}\|${bold("/repository")}),\n${bold("/stop")},\n${bold("/restart")},\n${bold("/osslicenses")}\|${bold("/opensourcelicenses")},\n(${bold("/changes")}\|${bold("/changelog")}\|${bold("/changelogs")}) [tagName],\n${bold("/invite")}`;
const dmUnavailableString = "I'm unable to send message to you in DM. Please make sure \"Allow direct messages from server members.\" is on in the \"Privacy & Safety\" settings in Discord settings!";
const repositoryString = "Original repository owned by DMCPlayer, no longer maintained: https://github.com/DMCPlayer/chill\nForked repository owned by original ChillBot author VanishedApps, no longer maintained: https://github.com/VanishedApps/chill\nForked repository owned by LightWayUp, still maintained: https://github.com/LightWayUp/chill";
const errorFetchingChangelogString = "Sorry, an error occured while fetching changelog. You can visit https://github.com/LightWayUp/chill/releases to see all changes.";
const inviteString = "Invite ChillBot to other servers!\nhttps://discordapp.com/api/oauth2/authorize?client_id=511463919399731201&scope=bot&permissions=3136";
const botUnavailableString = "Sorry, ChillBot is currently unavailable, most likely due to a new and not yet deployed update. Please check back later.";
const changelogBaseURL = "https://api.github.com/repos/LightWayUp/chill/releases/";

const response = {
    eightBall: {
        answers: [
            "Yes",
            "No",
            "Maybe",
            "I'm not Google, how am I supposed to know?",
            "idc",
            "leave me alone",
            "42",
            "14-13",
            "ew, I have a gf!"
        ],
        prompts: [
            "Mmmm, can't read that try again \ud83d\ude09",
            "boi, u gotta ask a question \u2753",
            "let me think. no...",
            "Error: too dumb to read \ud83d\udccb",
            "I can't read air"
        ]
    },
    mentioned: [
        "What do you want nub?",
        "Sorry busy ignoring you.",
        "Ez pz.",
        "XDXDXD so funny!",
        "Idc.",
        "lmao",
        "No.",
        "Let's agree to disagree.",
        "Wassup?",
        "I've been summoned!",
        "ooOOooOOoo",
        "Ha! Nub.",
        "Booooo!",
        "\ud83d\ude26",
        "OwOwOwOwO"
    ]
};

if (process.env.RESTARTED !== undefined) {
    console.log("This process was started by the previous process.");
    if (restartTimeout >= 1000) {
        const timeoutInSeconds = Math.floor(restartTimeout / 1000);
        let waitString = ".".repeat(timeoutInSeconds);
        console.log(waitString);
        let i = 1;
        const timerID = setInterval(() => {
            waitString = "|" + waitString.substring(0, timeoutInSeconds - 1);
            console.log(waitString);
            if (i++ === timeoutInSeconds) {
                clearInterval(timerID);
            }
        }, 1000);
    }
    setTimeout(() => login(), restartTimeout);
} else {
    login();
}

client.on("ready", () => {
    client.user.setPresence({
        status: "online",
        afk: "false",
        game: {
            name: presenceName,
            url: "https://www.twitch.tv/",
            type: "PLAYING"
        }
    }).catch(error => console.error(`An error occured while setting presence!\n\nFull details:\n${error}`));
    console.log("Chilled!");
}).on("message", async message => {
    const author = message.author;
    const channel = message.channel;
    try {
        if (author.bot || message.guild === null) {
            return;
        }

        if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) {
            return respondToNonCommands(message);
        }

        const substring = message.content.substring(prefix.length);
        if (substring === "") {
            return respondToNonCommands(message);
        }

        const canSendMessages = clientHasPermissionInChannel(permissions.sendMessages, channel);
        const shouldReject = developmentEnvironment && !isSentInDevelopmentGuild(message);
        const args = substring.split(/\s+/gi);
        switch (args[0].toLowerCase()) {

            case "help": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                channel.send(helpString)
                .then(sent => {
                    if (clientHasPermissionInChannel(permissions.addReactions, channel)) {
                        message.react("\u2754")
                        .catch(error => console.error(`An error occured while reacting to message "${message.content}"!\n\nFull details:\n${error}`));
                    } else {
                        const messageToSend = `Permission ${permissions.addReactions} is needed to add reactions!`;
                        channel.send(messageToSend)
                        .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                    }
                }, error => console.error(`An error occured while sending message "${helpString}"!\n\nFull details:\n${error}`));
                break;
            }

            case "ping": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                const ping = client.ping;
                const messageToSend = "Pinging.";
                channel.send(bold(messageToSend))
                .then(message => message.edit(bold("Pinging.."))
                    .then(message => message.edit(bold("Pinging..."))
                        .then(message => message.edit(bold("Pinging."))
                            .then(message => message.edit(bold("Pinging.."))
                                .then(message => message.edit(`${bold("Pong!")} ${code(`${ping < 0 ? "0" : ping.toFixed()} ms`)}`)
                                    .catch(error => console.error(`An error occured while editing message "${message.content}"!\n\nFull details:\n${error}`)),
                                error => console.error(`An error occured while editing message "${message.content}"!\n\nFull details:\n${error}`)),
                            error => console.error(`An error occured while editing message "${message.content}"!\n\nFull details:\n${error}`)),
                        error => console.error(`An error occured while editing message "${message.content}"!\n\nFull details:\n${error}`)),
                    error => console.error(`An error occured while editing message "${message.content}"!\n\nFull details:\n${error}`)),
                error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                break;
            }

            case "ship": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                const firstUser = (args.length >= 2 && args[1].toLowerCase() === "me") ? author : message.guild.members.random().user;
                let randomSecondUser;
                let attempts = 0;
                do {
                    randomSecondUser = message.guild.members.random().user;
                    attempts++;
                } while (firstUser.equals(randomSecondUser) && attempts < shipMaxAttempts)
                let messageToSend;
                if (firstUser.equals(randomSecondUser)) {
                    messageToSend = shipMaxAttempts > 0 ? "Too bad, I can't seem to find anyone to ship with you..." : `I ship ${createMentionForUser(firstUser)} with himself/herself`;
                } else {
                    messageToSend = `I ship ${createMentionForUser(firstUser)} with ${createMentionForUser(randomSecondUser)}`;
                }
                channel.send(messageToSend)
                .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                break;
            }

            case "reminder":
            case "remind":
            case "remindme": {
                if (shouldReject) {
                    return;
                }
                let messageToSend;
                let timeout;
                if (args.length === 1) {
                    messageToSend = `Please provide a time in seconds, minutes, hours, days or months! Example: ${code("/remindme 3d Do homework")}`;
                } else if (args[1].length > remindmeMaxTimeStringLength) {
                    messageToSend = "The string of time you specified is too long!";
                } else {
                    timeout = ms(args[1]);
                    if (timeout === undefined) {
                        messageToSend = "You need to specify a valid time with unit!";
                    } else if (timeout < 0) {
                        messageToSend = "Time can not be negative!";
                    } else if (args.length === 2) {
                        messageToSend = `Please provide a value to remind you for. Example: ${code("/remindme 3d Do homework")}`;
                    }
                }
                if (messageToSend !== undefined && canSendMessages) {
                    return message.reply(messageToSend)
                        .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                }
                if (reminderTimerList.length >= listMaxEntries && listMaxEntries > 0) {
                    clearTimeout(reminderTimerList.shift());
                }
                const matched = getMatchedOriginalFromArgs(message, args, 2);
                const reminder = matched === null ? args.slice(2).join(" ") : message.content.substring(matched.length);
                if (canSendMessages) {
                    messageToSend = "Timer set! \ud83d\udd5c";
                    channel.send(messageToSend)
                    .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                }
                messageToSend = `\ud83d\udd5c ${bold("DING!")} Reminder text: ${bold(reminder)}. Reminder time set: ${bold(ms(timeout, {long: true}))}`;
                reminderTimerList.push(setTimeout(() => author.send(messageToSend, sendOptionsForLongMessage)
                        .catch(error => {
                            if (canSendMessages) {
                                message.reply(dmUnavailableString)
                                .catch(error => console.error(`An error occured while replying "${dmUnavailableString}" to message!\n\nFull details:\n${error}`));
                            }
                            console.error(`An error occured while sending message "${messageToSend}" in DM!\n\nFull details:\n${error}`);
                        }), timeout));
                break;
            }

            case "give": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                let messageToSend;
                let target;
                let amount;
                let item;
                if (args.length === 1) {
                    messageToSend = "Please mention someone!";
                } else {
                    target = getFirstMentionedUser(message);
                    if (target === undefined) {
                        messageToSend = "Please mention someone!";
                    } else if (target.user.equals(author)) {
                        messageToSend = "You can't give items to yourself!";
                    } else if (!(args[1] === createMentionForUser(target.user) || args[1] === createMentionForUser(target.user, true))) {
                        messageToSend = "The syntax is /give <mention> <amount> <item>!";
                    } else if (args.length === 2) {
                        messageToSend = "Please provide a valid amount!";
                    } else {
                        amount = args[2];
                        if (!isInteger(amount)) {
                            messageToSend = "Please provide a valid amount!";
                        } else {
                            const parsedAmount = parseInt(amount, 10);
                            if (parsedAmount <= 0) {
                                messageToSend = "Amount can not be negative or 0!";
                            } else if (parsedAmount > giveMaxAmount && giveMaxAmount > 0) {
                                messageToSend = `${bold(giveMaxAmount.toString())} is the max amount you can give to someone!`;
                            } else if (args.length === 3) {
                                messageToSend = "Please provide an item!";
                            } else {
                                const matched = getMatchedOriginalFromArgs(message, args, 3);
                                item = matched === null ? args.slice(3).join(" ") : message.content.substring(matched.length);
                            }
                        }
                    }
                }
                if (messageToSend !== undefined) {
                    return message.reply(messageToSend)
                        .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                }
                messageToSend = `${createMentionForUser(author)} gave ${createMentionForUser(target.user)} ${bold(amount)}x ${bold(item)}(s)`;
                channel.send(messageToSend, sendOptionsForLongMessage)
                .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                break;
            }

            case "eightball":
            case "8ball": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                let messageToSend;
                if (args.length === 1) {
                    messageToSend = bold(getRandomFromArray(response.eightBall.prompts));
                    return message.reply(messageToSend)
                        .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                }
                messageToSend = getRandomFromArray(response.eightBall.answers);
                channel.send(messageToSend)
                .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                break;
            }

            case "source":
            case "github":
            case "repo":
            case "repository": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                channel.send(repositoryString)
                .catch(error => console.error(`An error occured while sending message "${repositoryString}"!\n\nFull details:\n${error}`));
                break;
            }

            case "stop": {
                if (shouldReject) {
                    return;
                }
                if (!isDeveloper(author) && canSendMessages) {
                    const messageToSend = "You don't have permission to stop ChillBot!";
                    return message.reply(messageToSend)
                        .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                }
                exitProcess(0, false);
                break;
            }

            case "restart": {
                if (shouldReject) {
                    return;
                }
                if (!isDeveloper(author) && canSendMessages) {
                    const messageToSend = "You don't have permission to restart ChillBot!";
                    return message.reply(messageToSend)
                        .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                }
                exitProcess(0, true);
                break;
            }

            case "osslicenses":
            case "opensourcelicenses": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                const guildID = message.guild.id;
                if (licenseInfoSentGuildList.has(guildID)) {
                    const messageToSend = `This command has been used in the server recently. Jump to the message: ${licenseInfoSentGuildList.get(guildID)[0]}`;
                    return message.reply(messageToSend)
                        .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                }
                if (licenseInfoSentGuildList.size >= listMaxEntries && listMaxEntries > 0) {
                    const firstItemKey = licenseInfoSentGuildList.keys().next().value;
                    clearTimeout(licenseInfoSentGuildList.get(firstItemKey)[1]);
                    licenseInfoSentGuildList.delete(firstItemKey);
                }
                licenseInfoSentGuildList.set(guildID, [message.url, setTimeout(() => licenseInfoSentGuildList.delete(guildID), licenseInfoCooldown)]);
                for (const libraryEntry of libraryMap) {
                    const library = libraryEntry[0];
                    const libraryVersion = libraryEntry[1];
                    let messageToSend = libraryVersion === "" ? `${bold(library)}\nLicense:` : `${bold(library)}\nVersion: ${libraryVersion}\nLicense:`;
                    await channel.send(messageToSend, sendOptionsForLongMessage)
                        .then(async message => {
                            messageToSend = require(`./licenses/${library}.js`).license;
                            while (messageToSend.length > maxSafeMessageLength) {
                                let partialMessage = messageToSend.substring(0, maxSafeMessageLength);
                                const splitableIndex = partialMessage.lastIndexOf("\n");
                                if (splitableIndex === -1) {
                                    messageToSend = messageToSend.substring(maxSafeMessageLength);
                                } else {
                                    partialMessage = messageToSend.substring(0, splitableIndex);
                                    messageToSend = messageToSend.substring(splitableIndex + 1);
                                }
                                await channel.send(partialMessage, {code: true})
                                    .catch(error => console.error(`An error occured while sending message "${partialMessage}"!\n\nFull details:\n${error}`));
                            }
                            await channel.send(messageToSend, {code: true})
                                .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                        }, error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                }
                break;
            }

            case "changes":
            case "changelog":
            case "changelogs": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                let messageToSend;
                let tagName;
                if (args.length > 1) {
                    if (/^v?((0|([1-9]\d*))\.){2}(0|([1-9]\d*))(\-((alpha)|(beta)|(rc))([1-9]\d*))?$/gi.test(args[1])) {
                        tagName = args[1].toLowerCase();
                        if (!tagName.startsWith("v")) {
                            tagName = `v${tagName}`;
                        }
                    } else {
                        messageToSend = "Tag name must be in a format of \"a.b.c\" or \"va.b.c\" (where a, b, c are numbers) with optional suffix for alpha, beta and rc releases, without any leading 0s!";
                        return message.reply(messageToSend)
                            .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                    }
                }
                messageToSend = "Fetching changelog...";
                await channel.send(messageToSend)
                    .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                https.get(`${changelogBaseURL}${tagName !== undefined ? `tags/${tagName}`: "latest"}`, {
                    headers: {
                        "User-Agent": "ChillBot"
                    },
                    timeout: changelogFetchTimeout
                }, response => {
                    const statusCode = response.statusCode;
                    const contentType = "content-type";
                    if (statusCode !== 200) {
                        response.resume();
                        if (statusCode === 404 && tagName !== undefined) {
                            messageToSend = `Sorry, the specified tag name ${tagName} does not correspond to any release!`;
                            return message.reply(messageToSend)
                                .catch(error => console.error(`An error occured while replying "${messageToSend}" to message!\n\nFull details:\n${error}`));
                        }
                        console.error(`Unable to get changelog, server responded with status code ${statusCode}!`);
                        return channel.send(errorFetchingChangelogString)
                            .catch(error => console.error(`An error occured while sending message "${errorFetchingChangelogString}"!\n\nFull details:\n${error}`));
                    }
                    if (!(/^application\/.*json/gi.test(response.headers[contentType]))) {
                        response.resume();
                        console.error(`Unable to get changelog, response ${contentType} does not match "application/json"!`);
                        return channel.send(errorFetchingChangelogString)
                            .catch(error => console.error(`An error occured while sending message "${errorFetchingChangelogString}"!\n\nFull details:\n${error}`));
                    }
                    let raw = "";
                    response.on("data", chunk => raw += chunk)
                    .on("error", error => {
                        console.error(`An error occured while attempting to fetch changelog!\n\nFull details:\n${error}`);
                        channel.send(errorFetchingChangelogString)
                        .catch(error => console.error(`An error occured while sending message "${errorFetchingChangelogString}"!\n\nFull details:\n${error}`));
                    }).on("end", () => {
                        if (!response.complete) {
                            console.error("Unable to get changelog, connection was terminated while response was still not fully received!");
                            return channel.send(errorFetchingChangelogString)
                                .catch(error => console.error(`An error occured while sending message "${errorFetchingChangelogString}"!\n\nFull details:\n${error}`));
                        }
                        try {
                            const parsed = JSON.parse(raw);
                            const parsedDescription = parsed.body;
                            if (parsedDescription === undefined) {
                                console.error("Unable to obtain changelog from parsed JSON!");
                                return channel.send(errorFetchingChangelogString)
                                    .catch(error => console.error(`An error occured while sending message "${errorFetchingChangelogString}"!\n\nFull details:\n${error}`));
                            }
                            const description = parsedDescription.replace(/\r/gi, "");
                            const parsedName = parsed.name;
                            const displayName = parsedName === undefined ? (tagName === undefined ? "Latest release" : tagName) : parsedName;
                            const parsedTagName = parsed.tag_name;
                            const displayTagName = tagName === undefined ? (parsedTagName === undefined ? "latest": parsedTagName) : tagName;
                            messageToSend = `${bold(displayName)}\nRelease: ${displayTagName}\nChanges:\n${description}`;
                            channel.send(messageToSend, {
                                split: {
                                    maxLength: maxSafeMessageLength
                                }
                            }).catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
                        } catch (error) {
                            console.error("Unable to get changelog, received data is not valid JSON!");
                            channel.send(errorFetchingChangelogString)
                            .catch(error => console.error(`An error occured while sending message "${errorFetchingChangelogString}"!\n\nFull details:\n${error}`));
                        }
                    })
                });
                break;
            }

            case "invite": {
                if (!canSendMessages || shouldReject) {
                    return;
                }
                channel.send(inviteString)
                .catch(error => console.error(`An error occured while sending message "${inviteString}"!\n\nFull details:\n${error}`));
                break;
            }

            default: {
                respondToNonCommands(message);
            }
        }
    } catch (error) {
        handleGenerically(error, channel);
    }
});

function handleGenerically(error, channel) {
    try {
        if (!(error instanceof Error && (channel === undefined || channel === null || channel instanceof Discord.Channel))) {
            throw new TypeError("Incorrect type(s) for handleGenerically arguments!");
        }
        console.error(error);
        console.trace();
        if (!(client === undefined || client === null || channel === undefined || channel === null) && clientHasPermissionInChannel(permissions.sendMessages, channel)) {
            const messageToSend = "Sorry, an error occured."
            channel.send(messageToSend)
            .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
        }
    } catch (error) {
        console.error(error);
    }
}

function exitProcess(exitCode, shouldRestart) {
    try {
        if (!((typeof exitCode === "number" || exitCode instanceof Number || exitCode === undefined || exitCode === null) && (typeof shouldRestart === "boolean" || shouldRestart instanceof Boolean || shouldRestart === undefined || shouldRestart === null))) {
            throw new TypeError("Incorrect type(s) for exitProcess arguments!");
        }
        if (exitCode === undefined || exitCode === null) {
            exitCode = 0;
        }
        if (shouldRestart === undefined || shouldRestart === null) {
            shouldRestart = false;
        }
        if (shouldRestart) {
            const newArgs = [];
            for (let iterator = 0; iterator < process.argv.length; iterator++) {
                let arg = process.argv[iterator];
                if (arg.includes(" ")) {
                    arg = `"${arg}"`;
                }
                newArgs.push(arg);
            }
            process.env.RESTARTED = exitCode === 0 ? "normal" : unexpectedRestartIdentifier;
            childProcess.spawn(newArgs[0], newArgs.slice(1), {
                stdio: "ignore",
                detached: process.platform === "win32",
                shell: true
            }).unref();
            console.log("Restarting process...");
        } else {
            console.log("Goodbye, chill!");
        }
        if (!(client === undefined || client === null || client.user === undefined || client.user === null)) {
            client.user.setStatus("invisible")
            .then(clientUser => client.destroy()
                .catch(error => console.error(`An error occured while logging out!\n\nFull details:\n${error}`)),
            error => console.error(`An error occured while setting status!\n\nFull details:\n${error}`));
        }
        process.exit(exitCode);
    } catch (error) {
        handleGenerically(error);
    }
}

function getConfiguration(configurationType) {
    if (!(typeof configurationType === "string" || configurationType instanceof String)) {
        throw new TypeError("Incorrect type for getConfiguration argument!");
    }
    let result = configurationType.toLowerCase().endsWith("token") ? tokenConfiguration[configurationType] : configuration[configurationType];
    switch(configurationType) {

        case "restartTimeout": {
            if (result === useProcessEnvIdentifier) {
                result = parseInt(process.env.BOT_RESTART_TIMEOUT, 10);
            }
            if (!(typeof result === "number" && isInteger(result.toString()))) {
                throw new TypeError("Invalid restartTimeout value!");
            }
            if (result <= 0) {
                throw new Error("Invalid restartTimeout value, restartTimeout must not be less than or equal to 0!");
            }
            break;
        }

        case "presenceName": {
            if (result === useProcessEnvIdentifier) {
                result = process.env.BOT_PRESENCE_NAME;
            }
            if (typeof result !== "string") {
                throw new TypeError("Invalid presenceName value!");
            }
            break;
        }

        case "prefix": {
            if (result === useProcessEnvIdentifier) {
                result = process.env.BOT_PREFIX;
            }
            if (typeof result !== "string" || result.length === 0 || result.includes(" ")) {
                throw new Error("Invalid prefix value, prefix must be a string and must not contain blanks!");
            }
            break;
        }

        case "shipMaxAttempts": {
            if (result === useProcessEnvIdentifier) {
                result = parseInt(process.env.BOT_SHIP_MAX_ATTEMPTS, 10);
            }
            if (!(typeof result === "number" && isInteger(result.toString()))) {
                throw new TypeError("Invalid shipMaxAttempts value!");
            }
            break;
        }

        case "listMaxEntries": {
            if (result === useProcessEnvIdentifier) {
                result = parseInt(process.env.BOT_LIST_MAX_ENTRIES, 10);
            }
            if (!(typeof result === "number" && isInteger(result.toString()))) {
                throw new TypeError("Invalid listMaxEntries value!");
            }
            break;
        }

        case "giveMaxAmount": {
            if (result === useProcessEnvIdentifier) {
                result = parseInt(process.env.BOT_GIVE_MAX_AMOUNT, 10);
            }
            if (!(typeof result === "number" && isInteger(result.toString()))) {
                throw new TypeError("Invalid giveMaxAmount value!");
            }
            break;
        }

        case "changelogFetchTimeout": {
            if (result === useProcessEnvIdentifier) {
                result = parseInt(process.env.BOT_CHANGELOG_FETCH_TIMEOUT, 10);
            }
            if (!(typeof result === "number" && isInteger(result.toString()))) {
                throw new TypeError("Invalid changelogFetchTimeout value!");
            }
            if (result <= 0) {
                throw new Error("Invalid changelogFetchTimeout value, changelogFetchTimeout must not be less than or equal to 0!");
            }
            break;
        }

        case "developerIDs": {
            if (result === useProcessEnvIdentifier) {
                result = process.env.BOT_DEVELOPER_IDS;
                if (result === undefined) {
                    throw new TypeError("Invalid developerIDs value!");
                } else {
                    result = result.split(/\s+/gi);
                }
            } else if (!Array.isArray(result)) {
                throw new TypeError("Invalid developerIDs value!");
            }
            result = result.filter(id => typeof id === "string" && /^\d+$/gi.test(id));
            if (result.length === 0) {
                throw new Error("Invalid developerIDs value!");
            }
            break;
        }

        case "developmentGuildIDs": {
            if (result === useProcessEnvIdentifier) {
                result = process.env.BOT_DEVELOPMENT_GUILD_IDS;
                if (result === undefined) {
                    throw new TypeError("Invalid developmentGuildIDs value!");
                } else {
                    result = result.split(/\s+/gi);
                }
            } else if (!Array.isArray(result)) {
                throw new TypeError("Invalid developmentGuildIDs value!");
            }
            result = result.filter(id => typeof id === "string" && /^\d+$/gi.test(id));
            if (result.length === 0) {
                throw new Error("Invalid developmentGuildIDs value!");
            }
            break;
        }

        case "token": {
            if (result === useProcessEnvIdentifier) {
                result = process.env.BOT_TOKEN;
            }
            if (typeof result !== "string" || result.length === 0 || result.includes(" ")) {
                throw new Error("Invalid token value, token must be a string and must not contain blanks!");
            }
            break;
        }

        case "developmentEnvironment": {
            if (result === useProcessEnvIdentifier) {
                switch (process.env.DEVELOPMENT_ENVIRONMENT.toLowerCase()) {

                    case "true": {
                        result = true;
                        break;
                    }

                    case "false": {
                        result = false;
                        break;
                    }

                    default: {
                        throw new Error("Invalid developmentEnvironment value!");
                    }
                }
            } else if (typeof result !== "boolean") {
                throw new TypeError("Invalid devEnvironment value!");
            }
            break;
        }

        case "cliProcessTimeout": {
            if (result === useProcessEnvIdentifier) {
                result = parseInt(process.env.BOT_CLI_PROCESS_TIMEOUT, 10);
            }
            if (!(typeof result === "number" && isInteger(result.toString()))) {
                throw new TypeError("Invalid cliProcessTimeout value!");
            }
            if (result <= 0) {
                throw new Error("Invalid cliProcessTimeout value, cliProcessTimeout must not be less than or equal to 0!");
            }
            break;
        }

        default: {
            throw new Error("Invalid configuration to fetch!");
        }
    }
    return result;
}

function getLibraries() {
    const map = new Map().set("node", process.version);
    let npmPath = path.resolve(path.dirname(process.argv[0]), (process.platform === "win32" ? "./npm.cmd" : "./npm"));
    if (npmPath.includes(" ")) {
        npmPath = `"${npmPath}"`;
    }
    const npmProcess = childProcess.spawnSync(npmPath, ["-v"], {
        timeout: cliProcessTimeout,
        shell: true,
        windowsHide: true
    });
    let npmVersion = "";
    if (npmProcess.error !== undefined && npmProcess.error !== null) {
        console.error(`An error occured while attempting to read stdout of NPM process!\n\nFull details:\n${npmProcess.error}`);
    } else {
        const bufferString = npmProcess.stdout.toString();
        if (/^\s*(\d+\.){2}\d+\s*$/gi.test(bufferString)) {
            npmVersion = bufferString.trim();
        }
    }
    map.set("npm", npmVersion);
    for (const library in packageJSON.dependencies) {
        map.set(library, packageJSON.dependencies[library]);
    }
    return map.set("async-limiter", "")
    .set("long", "")
    .set("prism-media", "")
    .set("snekfetch", "")
    .set("tweetnacl-js", "")
    .set("ws", "");
}

function bold(string) {
    if (!(typeof string === "string" || string instanceof String)) {
        throw new TypeError("Incorrect type for bold argument!");
    }
    return `**${string}**`;
}

function login() {
    client.login(token)
    .catch(error => console.error(`An error occured while logging in! Token is ${developmentEnvironment ? token : "a secret"}!\n\nFull details:\n${error}`));
}

function respondToNonCommands(message) {
    if (!(message instanceof Discord.Message)) {
        throw new TypeError("Incorrect type for respondToNonCommands argument!");
    }
    const channel = message.channel;
    if (hasMentionForUser(message, client.user) && clientHasPermissionInChannel(permissions.sendMessages, channel)) {
        let messageToSend = getRandomFromArray(response.mentioned);
        if (developmentEnvironment && !isSentInDevelopmentGuild(message)) {
            messageToSend = botUnavailableString;
        }
        channel.send(messageToSend)
        .catch(error => console.error(`An error occured while sending message "${messageToSend}"!\n\nFull details:\n${error}`));
    }
}

function clientHasPermissionInChannel(permission, channel) {
    if (!((typeof permission === "string" || permission instanceof String || permission instanceof Discord.Permissions || Array.isArray(permission)) && channel instanceof Discord.Channel)) {
        throw new TypeError("Incorrect type(s) for clientHasPermissionInChannel arguments!");
    }
    let permissionFiltered = permission;
    if (Array.isArray(permission)) {
        if (permission.length !== 0) {
            permissionFiltered = permission.filter(eachPermission => typeof eachPermission === "string" || eachPermission instanceof String || eachPermission instanceof Discord.Permissions);
        }
        if (permissionFiltered.length === 0) {
            throw new TypeError("Incorrect type(s) for clientHasPermissionInChannel arguments!");
        }
    }
    const permissionsForClient = channel.permissionsFor(client.user);
    return permissionsForClient.has(permissionFiltered) || permissionsForClient.has(permissions.administrator);
}

function code(string) {
    if (!(typeof string === "string" || string instanceof String)) {
        throw new TypeError("Incorrect type for code argument!");
    }
    return `\`${string}\``;
}

function createMentionForUser(user, nick) {
    if (!(user instanceof Discord.User && (nick === undefined || nick === null || typeof nick === "boolean" || nick instanceof Boolean))) {
        throw new TypeError("Incorrect type(s) for createMentionForUser arguments!");
    }
    if (nick === undefined || nick === null) {
        nick = false;
    }
    return nick ? `<@!${user.id}>` : `<@${user.id}>`;
}

function getMatchedOriginalFromArgs(message, args, numberOfArgsToMatch) {
    if (!(message instanceof Discord.Message && (Array.isArray(args) || !(args === undefined || args === null || args.length === undefined)) && (typeof numberOfArgsToMatch === "number" || numberOfArgsToMatch instanceof Number))) {
        throw new TypeError("Incorrect type(s) for getMatchedOriginalFromArgs arguments!");
    }
    let regExpPattern = `${prefix}${args.slice(0, numberOfArgsToMatch).join("\\s+")}\\s+`;
    const matchOriginal = message.content.match(new RegExp(regExpPattern, "g"));
    return matchOriginal === null ? null : matchOriginal[0];
}

function getFirstMentionedUser(message) {
    if (!(message instanceof Discord.Message)) {
        throw new TypeError("Incorrect type for getFirstMentionedUser argument!");
    }
    const mentionsCollection = message.mentions.members;
    if (mentionsCollection.length <= 0) {
        return;
    }
    return mentionsCollection.first();
}

function isInteger(string, acceptSign) {
    if (!((typeof string === "string" || string instanceof String) && (acceptSign === undefined || acceptSign === null || typeof acceptSign === "boolean" || acceptSign instanceof Boolean))) {
        throw new TypeError("Incorrect type(s) for isInteger arguments!");
    }
    if (acceptSign === undefined || acceptSign === null) {
        acceptSign = true;
    }
    return acceptSign ? /^\s*(\+|\-)?\d+\s*$/gi.test(string) : /^\s*\d+\s*$/gi.test(string);
}

function getRandomFromArray(array) {
    if (!Array.isArray(array) || (array === undefined || array === null || array.length === undefined)) {
        throw new TypeError("Incorrect type for getRandomFromArray argument!");
    }
    return array[Math.floor(Math.random() * array.length)];
}

function isDeveloper(user) {
    if (!(user instanceof Discord.User)) {
        throw new TypeError("Incorrect type for isDeveloper argument!");
    }
    let isBotDeveloper = false;
    for (const developerID of developerIDs) {
        if (user.id === developerID) {
            isBotDeveloper = true;
            break;
        }
    }
    return isBotDeveloper;
}

function isSentInDevelopmentGuild(message) {
    if (!(message instanceof Discord.Message)) {
        throw new TypeError("Incorrect type for isSentInDevelopmentGuild argument!");
    }
    let isSentInDevGuild = false;
    for (const guildID of developmentGuildIDs) {
        if (message.guild.id === guildID) {
            isSentInDevGuild = true;
            break;
        }
    }
    return isSentInDevGuild;
}

function hasMentionForUser(message, user) {
    if (!(message instanceof Discord.Message && user instanceof Discord.User)) {
        throw new TypeError("Incorrect type(s) for hasMentionForUser arguments!");
    }
    const content = message.content;
    const matched = content.match(new RegExp(`<@\\\!?${user.id}>`, "gi"));
    if (matched === null) {
        return false;
    }
    const backSlashMatched = content.match(new RegExp(`\\\\*<@\\\!?${user.id}>`, "gi"));
    let hasMatch = false;
    for (let i = 0; i < matched.length; i++) {
        if ((backSlashMatched[i].length - matched[i].length) % 2 === 0) {
            hasMatch = true;
            break;
        }
    }
    return hasMatch;
}
