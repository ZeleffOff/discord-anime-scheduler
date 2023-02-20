async function sendNotification(animes, client, logStatus) {
    const guilds = await getGuilds();

    const notifications = animes.flatMap(anime => {
        const { media, episode } = anime;

        return guilds.filter(guild => {
            if (guild.channel && guild.mode === 'list') {
                return guild.data.includes(media.id);
            }

            return true;
        }).map(guild => {
            const channel = client.channels.cache.get(guild.channel);
            if (!channel) return;

            const title = media.title.romaji || media.title.english || media.title.native;
            const embed = {
                author: { name: title, icon_url: media.coverImage.large, url: media.siteUrl },
                description: `L'épisode \`${episode}\` de l'anime **${media.title.romaji || media.title.english || media.title.native}** est désormais disponible sur les sites ci-dessous :\n\n${media.externalLinks.map(site => `[${site.site}](${site.url})`).join(" - ")}`,
                color: Number('0x' + media.coverImage.color.replace('#', '')) ?? 0xF3df94,
                thumbnail: { url: media.coverImage.large },
                timestamp: new Date().toISOString()
            };

            return channel.send({ embeds: [embed] }).then(() => {
                if (logStatus) {
                    console.log(`Notification envoyée au serveur ${channel.guild.id}. Anime : ${media.title.romaji} - Episode : ${episode}`);
                }
            }).catch(e => console.log(e));
        });
    });
    return Promise.all(notifications);
}


async function getGuilds() {
    const guilds = await require('../Models/Anime').find({});
    return guilds;
}

module.exports = sendNotification;
