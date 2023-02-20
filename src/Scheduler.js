const EventEmitter = require('events');
const { readFileSync } = require('fs');
const fetchAnime = require('./Utils/fetchAnime');
const convertTime = require('./Utils/convertTime');
const _checkUpdate = require('./Utils/checkUpdate');
const { Client, Guild, TextChannel, Role, NewsChannel } = require('discord.js');
const connexionMongoDatabase = require('./Utils/connexionMongoDatabase');
const sendNotification = require('./Utils/sendNotification');
const _error = require('./Utils/error');
const getDatabase = require('./Utils/getDatabase');
const query = readFileSync(require.resolve('../src/Graphql/SchedulerQuery.graphql')).toString();
const AnimeQuery = readFileSync(require.resolve('../src/Graphql/AnimeQuery.graphql')).toString();
const AnimeQueryIds = readFileSync(require.resolve('../src/Graphql/AnimeQueryIds.graphql')).toString();
const AnimesQuery = readFileSync(require.resolve('../src/Graphql/AnimesQuery.graphql')).toString();
const AnimeModel = require('./Models/Anime');

const MAL_REGEX = /(?<=myanimelist\.net\/anime\/)\d{1,}/gi;
const ANILIST_REGEX = /(?<=anilist\.co\/anime\/)\d{1,}/gi;

_checkUpdate();

class Scheduler extends EventEmitter {
    constructor(client, options = { log: false, mongoUri: null, autoPost: true }) {
        super();

        /**
         * @name Scheduler#client
         * @type {Scheduler}
         * @readonly
         */
        this.client = client;
        this.notifications = [];
        this.log = options.log;
        this.mongoUri = options.mongoUri;
        this.autoPost = options.autoPost;
        this.database = null;

        if (!this.mongoUri) throw new TypeError("MongoDB Uri not provided.");
        if (!(this.client instanceof Client)) throw new Error("No client provided or client is not instanceof Discord#Client.");
    }

    /**
     * Return the date for a given number of days from the current date.
     * 
     * @param {number} [days=1] - The number of days to add (default: 1).
     * @returns {Date} The corresponding date.
    */
    getFromNextDays(days = 1) {
        return new Date(new Date().getTime() + (864e5 * days));
    }

    /**
     * Gets anime broadcasts for a given day and handles notifications for new episodes.
     *
     * @async
     * @param {string} nextDay - The date for which to retrieve anime programs (in "YYYY-MM-DD" format).
     * @param {number} page - The page of results to retrieve (default: 1).
     * @returns {void}
    */
    async handleSchedules(nextDay, page) {
        const animes = await fetchAnime(query, { page, nextDay });

        if (animes.errors && this.log) {
            console.log("\x1b[33m[Scheduler] \x1b[0mAn error occurred while obtaining anime from https://anilist.co\n", animes.errors.map(e => e.message).join("\n"));
            return;
        }

        for (const anime of animes.data.Page.airingSchedules) {
            if (this.notifications.find(a => a.anime === anime)) {
                continue;
            }

            this.notifications.push(anime);

            if (this.log) {
                console.log(`\x1b[33m[Scheduler] \x1b[0mEpisode \x1b[34m${anime.episode} \x1b[0mof anime \x1b[34m${anime.media.title.romaji || anime.media.title.userPreferred} \x1b[0mwill air in \x1b[36m${convertTime(anime.timeUntilAiring)}`);
            }
        }

        if (animes.data.Page.pageInfo.hasNextPage) {
            this.handleSchedules(nextDay, animes.data.Page.pageInfo.currentPage + 1);
        } else {
            let notification = null;

            const loopAiring = async () => {
                const animeSameData = this.notifications.filter(a => a.timeUntilAiring === this.notifications[0].timeUntilAiring);

                if (animeSameData.length) {
                    if (this.autoPost) {
                        await sendNotification(animeSameData, this.client, this.log);
                        this.notifications = this.notifications.filter(a => a.timeUntilAiring !== this.notifications[0].timeUntilAiring);
                    } else {
                        this.emit('airing', animeSameData);
                        this.notifications = this.notifications.filter(a => a.timeUntilAiring !== this.notifications[0].timeUntilAiring);
                    }

                    emitNotification();
                } else {
                    clearTimeout(notification);

                    if (this.log) {
                        console.log("\x1b[33[Scheduler] \x1b[0mAll the anime of the day have been broadcast.");
                    }
                }
            };

            const emitNotification = () => {
                notification = setTimeout(loopAiring, this.notifications[0].timeUntilAiring * 1000);
            };

            emitNotification();
        }
    }

    /**
      Sets the anime notification channel for the specified server.
      *
      * @async
      * @function setChannel
      * @param {Guild} guild - The Guild object of the server concerned.
      * @param {(TextChannel|NewsChannel)} channel - Channel to set as notification channel. Discord#TextChannel / Discord#NewsChannel
      * @returns {Promise<{ error: boolean, message: string, code: number }>} - A promise that returns an object containing information about the success or failure of the operation.
    */
    async setChannel(guild, channel) {
        if (!guild || !(guild instanceof Guild)) throw new TypeError('Guild not provided or not instance of Discord#Guild.');
        if (!channel || !(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) throw new TypeError('Channel not provided or not instanceof Discord#TextChannel | Discord#NewsChannel.');

        const guildDb = await getDatabase(guild.id, true);
        guildDb.channel = channel.id;

        await guildDb.save().catch(e => console.log('Scheduler#setChannel Error : ', e));
        return guildDb;
    }

    /**
      * Sets the role of anime notifications for the specified server.
      *
      * @async
      * @function setRole
      * @param {Guild} guild - The `Guild` object representing the server.
      * @param {Role} role - Discord#Role | The role that will be mentioned when an anime airs.
      * @returns {Promise<{ error: boolean, message: string, code: number }>} An object containing an error boolean, message, and status code.
    */
    async setRole(guild, role) {
        if (!guild || !(guild instanceof Guild)) throw new TypeError('Guild not provided or not instance of Discord#Guild.')
        if (!role || !(role instanceof Role)) throw new TypeError('Role not provided or not instanceof Discord#Role.');

        const guildDb = await getDatabase(guild.id, true);
        guildDb.role = role.id;

        await guildDb.save().catch(e => console.log('Scheduler#setRole error : ', e));
        return guildDb;
    }

    /**
     * Adds an anime to the list of the specified server.
     *
     * @async
     * @function addAnime
     * @param {Guild} guild - The server for which we want to add the anime.
     * @param {string|number} anime - The name or ID of the anime we want to add from https://anilist.co
    */
    async addAnime(guild, anime) {
        if (!guild || !(guild instanceof Guild)) _error('Guild not provided or not instance of Discord#Guild.');
        if (!anime) throw new TypeError('Anime not provided.');

        let guildDb = await getDatabase(guild.id, true);

        if (Number(anime)) anime = Number(anime);
        else if (anime.match(ANILIST_REGEX)) anime = anime.match(ANILIST_REGEX)[0];
        else if (anime.match(MAL_REGEX)) anime = anime.match(MAL_REGEX)[0];
        else {
            anime = await fetchAnime(AnimeQuery, {
                search: anime,
                type: 'ANIME'
            }).then(e => { return Number(e.data.Media?.id) }).catch(e => null);
            if (!anime) throw new Error('Anime not found.');
        };

        anime = Number(anime);

        if (guildDb.data.includes(anime)) throw new Error('Anime is already in list.');

        let query = await fetchAnime(AnimeQueryIds, { ids: anime });
        if (query.errors || !query.data.Page.media.length) throw new Error('Anime not found.');

        query = query.data.Page.media[0];

        if (query.status === 'FINISHED') return { message: 'The airing of this anime has been finished.', code: 'FINISHED', anime: query };
        if (query.status === 'CANCELLED') return { message: 'The airing of this anime has been canceled.', code: 'ANIME_CANCELLED', anime: query };

        guildDb.data.push(anime);

        await guildDb.save().catch(e => console.log('Scheduler#addAnime Error : ', e));
        return { data: guildDb, anime: query };
    }

    /**
     * Removes an anime from the specified guild's anime list.
     * 
     * @async
     * @function
     * @param {Guild} guild - The guild to remove the anime from.
     * @param {string} animeId - The ID or name of the anime to remove.
     * @returns {Object} - The updated anime list for the guild.
    */
    async removeAnime(guild, animeId) {
        if (!guild || !(guild instanceof Guild)) throw new TypeError('Guild not provided or not instance of Discord#Guild.', errorCode.INVALID_GUILD);
        if (!animeId) throw new TypeError('Anime not found.');

        let guildDb = await getDatabase(guild.id);
        if (!guildDb) _error('Anime server list is empty.', 'EMPTY_LIST');

        let anime = Number(animeId);
        if (!anime) {
            if (animeId.match(ANILIST_REGEX)) {
                anime = animeId.match(ANILIST_REGEX)[0];
            } else if (animeId.match(MAL_REGEX)) {
                anime = animeId.match(MAL_REGEX)[0];
            } else {
                anime = await fetchAnime(AnimeQuery, {
                    search: animeId,
                    type: 'ANIME'
                }).then(res => { return Number(res.data.Media?.id) }).catch(e => null);
                if (!anime) throw new Error('Anime not found.');
            }
        }

        if (!guildDb.data.includes(anime)) throw new Error('Anime is not in anime list.');

        guildDb.data.splice(guildDb.data.findIndex(a => a === anime), 1);

        await guildDb.save().catch(e => console.log('Scheduler#removeAnime Error : ', e));
        return guildDb;
    }

    /**
     * Retrieves a list of anime for the specified guild.
     * 
     * @async
     * @function
     * @param {Guild} guild - The guild to retrieve anime from.
     * @returns {Array<Object>} - An array of anime objects.
    */
    async list(guild) {
        if (!guild || !(guild instanceof Guild)) throw new TypeError('Guild not provided or not instance of Discord#Guild.');

        let guildDb = await getDatabase(guild.id);
        if (!guildDb || !guildDb.data.length) throw new Error('Anime server list is empty.');

        const entries = [],
            watched = guildDb.data;

        let page = 0,
            hasNextPage = false;

        do {
            const animes = await fetchAnime(AnimesQuery, { watched, page });

            if (animes.errors) return { error: true, errors: animes.errors };
            else if (!entries.length && !animes.data.Page.media.length) throw new Error('No anime found in this anime list.');
            else {
                page = animes.data.Page.pageInfo.currentPage + 1,
                    hasNextPage = animes.data.Page.hasNextPage;

                entries.push(...animes.data.Page.media);
            }
        } while (hasNextPage);

        return entries;
    }

    /**
    Deletes a guild's data from the database.

    * @async
    * @function delete
    * @param {Guild} guild - The guild to delete data for.
    * @returns {Promise<Database>} A Promise that resolves with the deleted guild database.
    */
    async delete(guild) {
        if (!guild || !(guild instanceof Guild)) throw new TypeError('Guild not provided or not instance of Discord#Guild.');

        const guildDb = await getDatabase(guild.id);
        if (!guildDb || !guildDb.data.length) throw new TypeError('Guild not found.');

        await AnimeModel.findOneAndDelete({ _id: guild.id }).catch(e => console.log('Scheduler#delete Error : ', e));
        return guildDb;
    }

    /**
     * Sets the notification mode for a guild in the database.
     * 
     * @async
     * @function setMode
     * @param {Guild} guild - The guild to set the mode for.
     * @param {string} mode - The notification mode to set.
     * @returns {Promise<Database>} A Promise that resolves with the updated guild database.
    */
    async setMode(guild, mode) {
        if (!guild || !(guild instanceof Guild)) throw new TypeError('Guild not provided or not instance of Discord#Guild.');

        const modes = ['all', 'list'];
        if (!modes.includes(mode)) new TypeError('Notification mode not supported.');

        const guildDb = await getDatabase(guild.id, true);
        guildDb.mode = mode;

        await guildDb.save().catch(e => console.log('Scheduler#setMode Error : ', e));
        return guildDb;
    }

    /**
     * Initialize the Scheduler
     * 
     * @async
     * @function init
     */
    async init() {
        await connexionMongoDatabase(this.mongoUri, this.log);

        this.handleSchedules(Math.round(this.getFromNextDays().getTime() / 1000));

        this.client.loop = setInterval(() => {
            return this.handleSchedules(Math.round(this.getFromNextDays().getTime() / 1000))
        }, 864e5);
    }
}

module.exports = Scheduler;

/**
 * @author Zeleff_#1615
 * @description Notifie un serveur lors d'un nouvel épisode d'anime !
 * @version 2.0.0
 */
