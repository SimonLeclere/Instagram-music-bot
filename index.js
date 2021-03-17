const Insta = require('@androz2091/insta.js');
const ytdl = require('ytdl-core');
const YouTube = require("youtube-sr").default;

const client = new Insta.Client()
const config = require('./config.json');

client.on('connected', () => {
    console.log(`Client connecté avec le profil ${client.user.username}`);
})


client.on('messageCreate', async message => {  

    if(!message.content || message.authorID === client.user.id || !message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    message.markSeen();
     
    message.chat.approve();

    if(['play', 'p'].includes(commandName)) {

        if(!args.length) return message.chat.sendMessage('Veuillez préciser une recherche.');

        message.chat.startTyping({ disableOnSend: true });

        const result = await YouTube.search(args.join(' '), { limit: 500 }).catch(() => null);
        if (!result) return message.chat.sendMessage(`Erreur: Aucune musique trouvée pour la recherche : "${args.join(' ')}".`);

        const videosFiltered = result.filter(v => v.duration < 60000);
        if(!videosFiltered.length) return message.chat.sendMessage(`Erreur: Aucune musique de moins d'une minute trouvée parmi les résultats de la recherche.`);

        await message.chat.sendMessage(`Envoyez un nombre entre 1 et ${videosFiltered.length} pour choisir la vidéo.`);
        await message.chat.sendMessage(videosFiltered.map((v, i) => `${i + 1}. ${v.title}`).slice(0, 10).join('\n'))

        const collector = message.createMessageCollector({ idle: 20000 });

        collector.on('message', msg => {
            if(msg.authorID === client.user.id) return;
            
            collector.end();
            msg.markSeen();

            if (!msg.content) return message.chat.sendMessage('Commande annulée.');
            
            const int = parseInt(msg.content, 10);
            if(!int || int <=0 || int > videosFiltered.length) return message.chat.sendMessage('Commande annulée.');

            message.chat.startTyping({ disableOnSend: true });

            try {
                const stream = ytdl(videosFiltered[int - 1].url, { filter: format => format.container === 'mp4' });
                const array = [];
                stream
                .on('data', chunk => {
                    array.push(chunk);
                })
                .on('end', () => {
                    message.chat.sendVoice(Buffer.concat(array));
                });
            }
            catch (err) {
                message.chat.sendMessage('Erreur, impossible d\'envoyer le vocal');
            }
        })
    }

    if(['help', 'h'].includes(commandName)) return message.chat.sendMessage('Voici la liste des commandes disponibles :\n• help\n• play <musique>')

})

client.login(config.username, config.password);
