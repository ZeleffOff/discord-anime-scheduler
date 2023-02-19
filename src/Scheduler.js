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
const errorCode = {
    INVALID_GUILD: 'INVALID_GUILD',
    INVALID_ANIME: 'INVALID_ANIME',
    INVALID_ROLE: 'INVALID_ROLE',
    INVALID_MODE: 'INVALID_MODE',
    INVALID_CHANNEL: 'INVALID_CHANNEL',
    ALREADY_IN_DB: 'ALREADY_IN_DB',
    EMPTY_LIST: 'EMPTY_LIST',
    NOT_IN_DB: 'NOT_IN_DB',
    ANIME_NOT_FOUND: 'ANIME_NOT_FOUND',
    DB_ERROR: 'DB_ERROR',
    ERROR: 'ERROR'

};
const successCode = {
    UPDATED: 'UPDATED'
}

const MAL_REGEX = /(?<=myanimelist\.net\/anime\/)\d{1,}/gi;
const ANILIST_REGEX = /(?<=anilist\.co\/anime\/)\d{1,}/gi;

_checkUpdate();

class Scheduler extends EventEmitter {
    constructor(client, options = { log: true, mongoUri: 'a', autoPost: false }) {
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

        if (!(this.client instanceof Client)) _error("L'argument #client fourni n'est pas une instance Discord#Client.", 'INVALID_CLIENT');
    }

    /**
     * Renvoie la date pour un nombre de jours donné à partir de la date actuelle.
     * @param {number} [days=1] - Le nombre de jours à ajouter (par défaut: 1).
     * @returns {Date} La date correspondante.
     */
    getFromNextDays(days = 1) {
        return new Date(new Date().getTime() + (864e5 * days));
    }

    /**
     * Récupère les diffusions d'animes pour un jour donné et gère les notifications pour les nouveaux épisodes.
     * 
     * @async
     * @param {string} nextDay - La date du jour pour lequel récupérer les programmes d'anime (au format "YYYY-MM-DD").
     * @param {number} page - La page de résultats à récupérer (par défaut: 1).
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
                        await sendNotification(animeSameData, this.notifications[1], this.client, this.log);
                        this.notifications = this.notifications.filter(a => a.timeUntilAiring !== this.notifications[0].timeUntilAiring);
                    } else {
                        this.emit('airing', animeSameData, this.notifications[1]);
                        this.notifications = this.notifications.filter(a => a.timeUntilAiring !== this.notifications[0].timeUntilAiring);
                    }

                    emitNotification();
                } else {
                    clearTimeout(notification);

                    if (this.log) {
                        console.log("\x1b[33[Scheduler] \x1b[0mTous les animes du jour ont été diffusés.");
                    }
                }
            };

            const emitNotification = () => {
                notification = setTimeout(loopAiring, 5000);
            };

            emitNotification();
        }
    }

    /**
     Définit le salon des notifications d'anime pour le serveur spécifié.
     *
     * @async
     * @function setChannel
     * @param {Guild} guild - L'objet Guild du serveur concerné.
     * @param {(TextChannel|NewsChannel)} channel - Salon à définir en tant que salon de notification. Discord#TextChannel / Discord#NewsChannel
     * @returns {Promise<{ error: boolean, message: string, code: number }>} - Une promesse qui retourne un objet contenant des informations sur la réussite ou l'échec de l'opération.
    */
    async setChannel(guild, channel) {
        if (!guild || !(guild instanceof Guild)) return { error: true, message: "Le serveur indiquer est invalide.", code: errorCode.INVALID_GUILD };
        if (!channel || !(channel instanceof TextChannel) && !(channel instanceof NewsChannel)) return { error: true, message: "Le salon indiquer est invalide.", code: errorCode.INVALID_CHANNEL };

        const guildDb = await getDatabase(guild.id, true);
        guildDb.channel = channel.id;

        try {
            await guildDb.save();
            return {
                error: false,
                message: "Le salon des notifications d'anime a bien été défini.",
                code: successCode.UPDATED,
            };
        } catch (error) {
            console.log(
                "Une erreur est survenue lors de l'ajout du salon des notifications à la base de données :\n",
                error
            );
            return {
                error: true,
                message: "Une erreur est survenue lors de la mise à jour du salon des notifications.",
                code: errorCode.ERROR,
            };
        }
    }

    /**
     * Définit le rôle des notifications d'anime pour le serveur spécifié.
     *
     * @async
     * @function setRole
     * @param {Guild} guild - L'objet `Guild` représentant le serveur.
     * @param {Role} role - Discord#Role | Le rôle qui sera mentionner lorsqu'un anime sera diffusé.
     * @returns {Promise<{ error: boolean, message: string, code: number }>} Un objet contenant un booléen d'erreur, un message et un code de statut.
     * @throws {TypeError} Si `guild` n'est pas une instance de `Discord#Guild` ou si `role` n'est pas une instance de `Discord#Role`.
    */
    async setRole(guild, role) {
        if (!guild || !(guild instanceof Guild)) return { error: true, message: "Le serveur indiquer est invalide.", code: errorCode.INVALID_GUILD };
        if (!role || !(role instanceof Role)) return { error: true, message: "Le rôle indiquer est invalide.", code: errorCode.INVALID_ROLE };

        const guildDb = await getDatabase(guild.id, true);
        guildDb.role = role.id;

        try {
            await guildDb.save();
            return {
                error: false,
                message: "Le rôle des notifications d'anime a bien été défini.",
                code: successCode.UPDATED,
            };
        } catch (error) {
            console.log(
                "Une erreur est survenue lors de l'ajout du rôle de notification à la base de données :\n",
                error
            );
            return {
                error: true,
                message: "Une erreur est survenue lors de la mise à jour du rôle de notification.",
                code: errorCode.ERROR,
            };
        }
    }

    /**
     * Ajoute un anime à la liste du serveur spécifié.
     * 
     * @async
     * @function addAnime
     * @param {Guild} guild - Le serveur pour lequel on veut ajouter l'anime.
     * @param {string|number} anime - Le nom ou l'ID de l'anime que l'on veut ajouter depuis https://anilist.co
     * @returns {Promise<Object>} Une promesse qui se résoud avec un objet contenant les informations suivantes :
     *      - error {boolean} - Indique si une erreur s'est produite ou non.
     *      - message {string} - Un message décrivant le résultat de l'opération.
     *      - code {string} - Un code indiquant le résultat de l'opération.
     *      - database {GuildDatabase} - La base de données mise à jour, si l'opération a réussi.
     *      - anime_added {number} - Informations sur l'anime ajouté, si l'opération a réussi.
     */
    async addAnime(guild, anime) {
        if (!guild || !(guild instanceof Guild)) return { message: "Le serveur indiquer est invalide.", code: errorCode.INVALID_GUILD };
        if (!anime) return { message: "Le rôle indiquer est invalide.", code: errorCode.INVALID_ANIME };

        let guildDb = await getDatabase(guild.id, true);

        if (Number(anime)) anime = Number(anime);
        else if (anime.match(ANILIST_REGEX)) anime = anime.match(ANILIST_REGEX)[0];
        else if (anime.match(MAL_REGEX)) anime = anime.match(MAL_REGEX)[0];
        else {
            anime = await fetchAnime(AnimeQuery, {
                search: anime,
                type: 'ANIME'
            }).then(e => { return Number(e.data.Media?.id) }).catch();
            if (!anime) return {
                error: true,
                message: 'Anime introuvable.',
                code: errorCode.ANIME_NOT_FOUND
            }
        };

        anime = Number(anime);

        if (guildDb.data.includes(anime)) return { error: true, message: 'Cet anime fait déjà partie de la database.', code: errorCode.ALREADY_IN_DB }

        let query = await fetchAnime(AnimeQueryIds, { ids: anime });
        if (query.errors || !query.data.Page.media.length) return console.log(query.errors)

        query = query.data.Page.media[0];

        if (query.status === 'FINISHED') return { error: true, message: 'Cet anime a terminé sa diffusion.', code: 'FINISHED', anime: query };
        if (query.status === 'CANCELLED') return { error: true, message: 'Cet anime a annuler sa diffusion.', code: 'CANCELLED', anime: query };

        guildDb.data.push(anime);
        guildDb.save()
            .catch((err) => {
                return console.log('Une erreur est survenue lors de l\'ajout d\'un anime à la database : ', err)
            });

        return {
            error: false,
            database: guildDb,
            anime_added: anime,
            code: successCode.UPDATED
        };
    }

    /**
     * Retire un anime de la liste des animes suivis pour un serveur donné.
     *
     * @async
     * @param {Guild} guild - L'objet serveur Discord.
     * @param {string} animeId - L'identifiant de l'anime à supprimer.
     * @returns {Promise<{error: boolean, message: string, code: number}>}
     */
    async removeAnime(guild, animeId) {
        if (!guild || !(guild instanceof Guild)) {
            return { error: true, message: "Serveur invalide.", code: errorCode.INVALID_GUILD };
        }
        if (!animeId) {
            return { error: true, message: "Anime invalide.", code: errorCode.INVALID_ANIME };
        }

        let guildDb = await getDatabase(guild.id);
        if (!guildDb) {
            return { error: true, message: 'Liste d\'anime du serveur vide.', code: errorCode.EMPTY_LIST };
        }

        // Récupère l'identifiant de l'anime à partir de son nom ou de son URL
        let anime = Number(animeId);
        if (!anime) {
            if (animeId.match(ANILIST_REGEX)) {
                anime = animeId.match(ANILIST_REGEX)[0];
            } else if (animeId.match(MAL_REGEX)) {
                anime = animeId.match(MAL_REGEX)[0];
            } else {
                const result = await fetchAnime(AnimeQuery, {
                    search: animeId,
                    type: 'ANIME'
                });
                if (result.data.Media.id) {
                    anime = Number(result.data.Media.id);
                } else {
                    return { error: true, message: 'Anime non trouvé.', code: errorCode.INVALID_ANIME };
                }
            }
        }

        if (!guildDb.data.includes(anime)) {
            return { error: true, message: 'Cet anime ne fait pas partie de la liste des animes du serveur.', code: errorCode.NOT_IN_DB };
        }

        guildDb.data.splice(guildDb.data.findIndex(a => a === anime), 1);

        try {
            guildDb.save();

            return {
                error: false,
                message: "L'anime a bien été retiré de la liste des animes du serveur.",
                code: successCode.UPDATED
            };
        } catch (error) {
            return {
                error: true,
                message: error,
                code: errorCode.DB_ERROR
            }
        }
    }

    /**
     * Récupère la liste d'anime regardés par le serveur.
     * 
     * @param {Guild} guild - Le serveur pour lequel récupérer la liste d'anime.
     * @returns {Promise<Array>} La liste d'anime regardés par le serveur.
    */
    async list(guild) {
        if (!guild || !(guild instanceof Guild)) return { error: true, message: "Serveur invalide.", code: errorCode.INVALID_GUILD };

        let guildDb = await getDatabase(guild.id);
        if (!guildDb || !guildDb.data.length) return { error: true, message: 'Liste d\'anime du serveur vide.', code: errorCode.EMPTY_LIST };

        const entries = [],
            watched = guildDb.data;

        let page = 0,
            hasNextPage = false;

        do {
            const animes = await fetchAnime(AnimesQuery, { watched, page });

            if (animes.errors) return { error: true, errors: animes.errors };
            else if (!entries.length && !animes.data.Page.media.length) return { error: true, message: 'Liste d\'anime du serveur vide.', code: errorCode.EMPTY_LIST };
            else {
                page = animes.data.Page.pageInfo.currentPage + 1,
                    hasNextPage = animes.data.Page.hasNextPage;

                entries.push(...animes.data.Page.media);
            }
        } while (hasNextPage);

        return entries;
    }

    /**
     * Supprime les données d'un serveur de la base de données.
     * 
     * @param {Guild} guild - Le serveur dont les données doivent être supprimées.
     * @returns {Object} - Informations conçernant le résultat de la fonction.
    */
    async delete(guild) {
        if (!guild || !(guild instanceof Guild)) {
            return {
                error: true,
                message: 'Serveur invalide.',
                code: errorCode.INVALID_GUILD
            };
        }

        const guildDb = await getDatabase(guild.id);

        if (!guildDb || !guildDb.data.length) {
            return {
                error: true,
                message: 'Le serveur n\'est pas dans la base de données.',
                code: errorCode.NOT_IN_DB
            };
        }

        try {
            await require('../src/Models/Guild').findOneAndDelete({ _id: guild.id });
            return {
                error: false,
                message: 'Serveur supprimé de la base de données.',
                code: successCode.UPDATED
            };
        } catch (err) {
            return {
                error: true,
                message: err,
                code: errorCode.DB_ERROR
            };
        }
    }

    /**
     * Modifie le mode de notification du serveur spécifié.
     *
     * @async
     * @function setMode
     *
     * @param {Guild} guild - Le serveur pour lequel on veut définir le mode de notification.
     * @param {string} mode - Le mode de notification à définir ('all' pour recevoir toutes les notifications ou 'list' pour les notifications des animés présents dans la liste).
     *
     * @returns {Promise<{ error: boolean, message: string, code: string }>} Un objet qui indique si une erreur est survenue, un message associé et un code de retour.
     * Si tout s'est bien passé, le code de retour est `UPDATED` et le message indique le mode qui a été défini.
     * Si une erreur est survenue, le code de retour est : `INVALID_MODE` si le mode est invalide ou `DB_ERROR` si une erreur est survenue lors de la modification de la base de données.
     */
    async setMode(guild, mode) {
        const modes = ['all', 'list'];

        if (!modes.includes(mode)) return { error: true, message: 'Ce mode de notification n\'existe pas.', code: errorCode.INVALID_MODE };

        const guildDb = await getDatabase(guild.id, true);
        guildDb.mode = mode;

        try {
            guildDb.save()

            return {
                error: false,
                message: 'Mode défini sur ' + mode,
                code: successCode.UPDATED
            }
        } catch (error) {
            return { error: true, message: err, code: errorCode.DB_ERROR };
        }
    }

    /**
     * Initialise le scheduler
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
module.exports = Scheduler
