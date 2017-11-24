const Discord = require("discord.js");
const ms = require("ms");
const economy = require("discord-eco");

var bot = new Discord.Client();

const PREFIX = "/"

bot.on("ready", function() {
    console.log("Chilled!");

bot.user.setGame("In development 🔺 | Chilling.")
       
});

bot.on("message", function(message) {
    if (message.author.equals(bot.user)) return;

    if (!message.content.startsWith(PREFIX)) return;

    var args = message.content.substring(PREFIX.length).split(" ");

    switch (args[0].toLowerCase())  {
        case "ping":
               message.channel.send("**Pinging.**").then((message)=>{
                        message.edit("**Pinging..**")
                            message.edit("**Pinging...**")
                                message.edit("**Pinging.**")
                                    message.edit("**Pinging..**")
                                        message.edit("**Pong!** " + "`" + bot.ping.toFixed() + "ms" + "`")});
            break;
        case "points":
        economy.fetchBalance(message.author.id).then((i) => {
            const embed = new Discord.RichEmbed()
                .setDescription(`${message.author.username}`)
                .addField("**Account Info**", "Owner: " + message.author.username)
                .addField("Points: " + i.money, "ChillPal")
            message.channel.send({embed});
        });
              break;
        case "checkpoints":
        let userhe = message.mentions.members.first().id
        let userh = message.mentions.members.first().user.username
        economy.fetchBalance(userhe).then((i) => {
            const embed = new Discord.RichEmbed()
                .setDescription(`${userh}`)
                .addField("**Account Info**", "Owner: " + userh)
                .addField("Points: " + i.money, "ChillPal")
            message.channel.send({embed});
        });
              break;
        case "addpoints":
        let userz = message.mentions.members.first().id
        let add = args.slice(2).join(" ")
        if(!message.guild.member(message.author).hasPermission("ADMINISTRATOR")) return message.reply("Please get the **ADMINISTRATOR** permission to use this command.");
        if(!add) return message.reply("How much points do you want to give to someone?");

        economy.updateBalance(userz, add).then((i) => {
        message.channel.send(`Added **${add}** points to user.`);
        }); 
            break;
        case "help":
            message.author.send("Prefix: **/**\n**/points**,\n/**checkpoints** [mention],\n**/addpoints** [mention] [number],\n**/ping**,\n**/ship**\n**/ship me**\n**/remindme** [time] [text]\n**/give** [mention] [amount] [item]")
            message.react("\❔");
            break;
        case "eval":
            let evall = args.slice(1).join(" ")
            message.delete();
            message.channel.send(eval(evall));
            break;
        case "ship":
        let ship = "me"
        
        if (args[1]) {
            return message.channel.send("I ship <@" + message.author.id + "> and <@" + message.guild.members.random().user.id + ">");
        } else {
            message.channel.send("I ship <@" + message.guild.members.random().user.id + "> and <@" + message.guild.members.random().user.id + ">");
        }
            break;
        case "remindme":
        let time = args[1]
        let remind = message.content.split(" ").slice(2).join(" ");
        
        if (!args[1]) {
            return message.channel.send("Please provide a time in seconds, minutes, hours, days or months! Example: `/remindme 3d Do homework`");
        }

        if (!remind) {
            return message.channel.send("Please provide a text or a sentence to remind you for. Example: `/remindme 3d Do homework`");
        }

        setTimeout(function() {
            message.author.sendMessage(`:clock130: **DING!** Remind text: **${remind}**. Remind time set: **${ms(ms(time), {long: true})}**`);
        }, ms(time));
        message.channel.send("Timer set! :clock130:");
            break;
        case "give":
        let mention = message.mentions.members.first()
        let amount = args[2]
        let item = message.content.split(" ").slice(3).join(" ");

        if (!mention) {
            return message.channel.send("Please mention someone.");
        }

        if (!item) {
            return message.channel.send("Please provide an item.");
        }

        if (!amount) {
            return message.channel.send("Please provide an amount.");
        }

        if (amount > 64) {
            return message.channel.send("**64** is the max amount you can give to someone!");
        }

        message.channel.send(`<@${message.author.id}> gave **${mention}** **${amount}**x **${item}**.`);
            break;
    }
});
    
bot.login(process.env.BOT_TOKEN);
