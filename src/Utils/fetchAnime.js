const fetch = require('node-fetch');
const anilist_link = 'https://graphql.anilist.co';

async function fetchAnime(query, variables) {
    return fetch(anilist_link, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ query, variables })
    })
    .then(res => res.json())
    .catch(err => err);
}

module.exports = fetchAnime;