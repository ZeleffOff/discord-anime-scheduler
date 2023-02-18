
# Discord Anime Scheduler
[![npm](https://img.shields.io/github/downloads/ZeleffOff/discord-anime-scheduler/total?style=for-the-badge)](https://npmjs.com/discord-anime-scheduler) [![version](https://img.shields.io/github/package-json/v/ZeleffOff/discord-anime-scheduler?style=for-the-badge)](https://npmjs.com/discord-anime-scheduler)


Un package simple qui vous permettra d'être au courant lorsqu'un anime est diffusé depuis [Anilist](https://anilist.co).

Sachez premièrement que je ne suis pas un monstre du développement. 
S'il y a des améliorations ou autres à faire n'hésitez pas à me contacter sur discord ou fork le repo !

## Installation
```
npm install discord-anime-scheduler@latest
```

## Exemples

Vous pouvez voir un exemple de bot discord utilisant le package : [discord-anime-scheduler-bot](https://github.com/ZeleffOff/discord-anime-scheduler-bot) 
Bien-sûr, vous pouvez l'utiliser pour autre chose qu'un bot discord.

### Init
Initialise le Scheduler.

- Client: Instance de la class **Discord#Client** | Object.
- log: Recoit les animes mis en cache dans la console si le paramètre est défini sur **true**.

```js
const Scheduler = require('discord-anime-scheduler');
const client = {};

client.scheduler = new Scheduler(client, { log: boolean });

// Lance le sheduler
client.scheduler.init();
```

### Reçevoir les animes diffusés
Lorsqu'un ou plusieurs aimes sont diffusés, vous recevrez les animes via l'event **airing**.
Vous pouvez avoir plusieurs animes diffusés en même temps, c'est pour cela que les animes diffusés seront toujours dans un Array[].

- anime: Les animes diffusés.
- nextAnime: L'anime qui sera diffusé ensuite.

**Important:** Le scheduler doit être **Initialiser** avant de pouvoir écouter l'event **airing**.
```js
<Scheduler>.on('airing', (anime, nextAnime) => {
    console.log(anime);
})
```

La réponse attendu devrait ressembler à ça :
```
{
  media: {
    id: number,
    siteUrl: string,
    format: string,
    duration: 1,
    episodes: 2,
    title: {...},
    coverImage: {...},
    externalLinks: [ [Object] ],
    studios: { edges: [] }
  },
  episode: number,
  airingAt: number,
  timeUntilAiring: number,
  id: number
}
```

En cas de problème ou si vous avez une amélioration à apportée au package, contacter moi sur discord. [Zeleff_#1615]()

