const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const client = new Discord.Client();
const queue = new Map();

client.once("ready", () => {
    console.log("En ligne");
});
client.once("reconnecting", () => {
    console.log("Reconnexion !");
});
client.once("disconnect", () => {
    console.log("Déconnexion !");
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);
    //jouer une musique
    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    //skip une musique
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    //arréter une musique
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    }
});

async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send("Tu dois être dans un channel vocal pour écouter de la musique :sweat_smile:");
    const permissions = voiceChannel.permissionsFor(message.client.user);

    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("J'ai besoin des permissions pour rejoindre et parler dans ce canal vocal...");
    }

    try{
        const songInfo = await ytdl.getInfo(args[1]);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };

        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };
            queue.set(message.guild.id, queueContruct);
            queueContruct.songs.push(song);

            try {
                var connection = await voiceChannel.join();
                queueContruct.connection = connection;
                play(message.guild, queueContruct.songs[0]);
            } catch (err) {
                console.log(err);
                queue.delete(message.guild.id);
                return message.channel.send(err);
            }

        } else {
            serverQueue.songs.push(song);
            return message.channel.send(`${song.title} a été ajouté a la liste de lecture.`);
        }
    }catch (err){
        console.log(err);
        return message.reply("Je n'ai pas trouvé de musique correspondante... :cry:");
    }
}
//fonction pour passer une musique en cours de lecture dans un salon vocale
function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("Tu doit étre dans un canal vocal pour arrêter la musique !");

    if (!serverQueue)
        return message.channel.send("Heuu... il n'y a aucune chanson a skip :sweat_smile:");
    serverQueue.connection.dispatcher.end();
}
//fonction pour arreter un musique en cours dans un salon vocal
function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send("Tu doit étre dans un canal vocal pour arrêter la musique !");
    
  if (!serverQueue)
    return message.channel.send("Il n'y a aucune chanson a arrêter !");
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}
//fonction pour jouer une musique dans un chanel vocal
function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Je joue: **${song.title}** :notes:`);
}

client.login(token);