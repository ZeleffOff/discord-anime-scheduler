async function sendNotification(animes, nextAnime, client, logStatus) {
    const guilds = await getGuilds();
    const channels = guilds.filter(guild => guild.channel).map(guild => client.channels.cache.get(guild.channel)).filter(Boolean);

    const notifications = animes.map(anime => {
        const description = `L'épisode \`${anime.episode}\` de l'anime **${anime.media.title.romaji || anime.media.title.english || anime.media.title.native}** est désormais disponible sur les sites ci-dessous :\n\n${anime.media.externalLinks.map(site => `[${site.site}](${site.url})`).join(" - ")}`;

        return {
            author: { name: anime.media.title.romaji || anime.media.title.english || anime.media.title.native, icon_url: anime.media.coverImage.large, url: anime.media.siteUrl },
            description,
            color: Number('0x' + anime.media.coverImage.color.replace('#', '')) ?? 0xF3df94,
            thumbnail: { url: anime.media.coverImage.large },
            timestamp: new Date().toISOString()
        };
    });

    const promises = [];

    for (const channel of channels) {
        const promise = channel.send({ embeds: notifications }).then(() => {
            if (logStatus) {
                console.log(`Notification envoyée sur le serveur ${channel.guild.id} pour l'épisode ${animes[0].episode} de l'anime ${animes[0].media.title.romaji || animes[0].media.title.english || animes[0].media.title.native}`);
            }
        }).catch(e => console.log(e));

        promises.push(promise);
    }

    await Promise.all(promises);
}

async function getGuilds() {
    const guilds = await require('../Models/Guild').find({});
    return guilds;
}

module.exports = sendNotification;