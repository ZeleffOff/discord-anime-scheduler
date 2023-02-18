const { fetchAnime, convertTime, _checkUpdate} = require('./Utils/functions');
const { readFileSync } = require('fs');
const query = readFileSync(require.resolve('../src/Graphql/Query.graphql')).toString();
const EventEmitter = require('events');

_checkUpdate()

class Scheduler extends EventEmitter {
    constructor(client, options = { log: true }) {
        super();

        /**
         * @name Scheduler#client
         * @type {Scheduler}
         * @readonly
         */
        Object.defineProperty(this, 'client', { value: client });

        /**
         * Animes qui vont bientôt être diffusés.
         * @type {array}
         */
        this.notifications = [];

        /**
         * Affiche les animes qui vont être diffusés dans la console.
         * @type {boolean} 
         */
        this.log = options.log;

        if (!this.client) throw new Error("[Scheduler] Argument client manquant.");
    }

    /**
     * Récupère les animes en utilisant l'API d'Anilist.
     * @param {string} query Recherche via GraphQl
     * @param {object} variables Les variables à fetch
     * @returns {Promise<data>}
     */
    fetch(query, variables) {
        return fetchAnime(query, variables);
    }

    /**
     * Obtient la date du nombre de jour suivant.
     * @param {number} days Nombre de jour à ajouter au timestamp 
     * @returns {Date}
     */
    getFromNextDays(days = 1) {
        return new Date(new Date().getTime() + (864e5 * days));
    }

    /**
     * Corps du Scheduler
     * Fetch et push les animes dans le tableau notifications[] puis ajoute un timeout au prochain anime qui va être diffusé.
     * @param {*} nextDay Obtient les animes qui vont être diffusés dans les jours défini
     * @param {*} page Index de la page
     * @returns {Promise<void>} 
     */
    async handleSchedules(nextDay, page) {
        const res = await this.fetch(query, { page, nextDay });

        if (res.errors && this.log === true) return console.log("\x1b[33m[Scheduler] \x1b[0mFetch Error\n", res.errors.map(e => e.message).join("\n"));

        for (const anime of res.data.Page.airingSchedules) {
            if (this.notifications.find(a => a.anime === anime)) continue;

            this.notifications.push(anime);
            if (this.log === true) console.log(`\x1b[33m[Scheduler] \x1b[0mL'épisode \x1b[34m${anime.episode} \x1b[0mde l'anime \x1b[34m${anime.media.title.romaji || anime.media.title.userPreferred} \x1b[0msera diffusé dans \x1b[36m${convertTime(anime.timeUntilAiring)}`)
        }

        if (res.data.Page.pageInfo.hasNextPage) {
            this.handleSchedules(nextDay, res.data.Page.pageInfo.currentPage + 1);
        } else {
            let notification = null;

            const loopAiring = () => {
                const getAllSameDate = this.notifications.filter(a => a.timeUntilAiring === this.notifications[0].timeUntilAiring);
                if (getAllSameDate.length) {
                    this.emit('airing', getAllSameDate, this.notifications[1]);
                    this.notifications = this.notifications.filter(a => a.timeUntilAiring !== this.notifications[0].timeUntilAiring);

                    emitNotification();
                } else {
                    clearTimeout(notification);
                    if (this.log === true) console.log("\x1b[33[Scheduler] \x1b[0mTous les animes du jour ont été diffusés.");
                }
            }

            const emitNotification = () => {
                notification = setTimeout(loopAiring, this.notifications[0].timeUntilAiring * 1000);
            }

            emitNotification();
        }
    }

    /**
     * Initialise le Scheduler
     * @returns {Interval}
     */
    async init() {
        this.handleSchedules(Math.round(this.getFromNextDays().getTime() / 1000));

        return this.client.loop = setInterval(() => {
            return this.handleSchedules(Math.round(this.getFromNextDays().getTime() / 1000))
        }, 864e5);
    }
}
module.exports = Scheduler
