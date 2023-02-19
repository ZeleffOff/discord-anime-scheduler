# Discord Anime Scheduler

Notifie un serveur lorsqu'un anime est diffusé depuis [Anilist.co](https://anilist.co).

- Utilise la base de données MongoDB.
- Utilise la version v14 de Discord.js.
 
❗ Je ne suis pas developer pro, si vous avez des suggestions d'améliorations à apporter au projet n'hésitez pas à me contacter ou faites une pull request.

## 📁 Installation
```
npm i discord-anime-scheduler@latest
```

## 🚦 Initialisation du Scheduler
```javascript
// index.js
const client = new Client(...); // Discord#Client
const Scheduler = require('discord-anime-scheduler');

const sheduler = new Scheduler(client, {
    log: false, // par défaut: false | Affiche différentes informations dans la console.
    mongoUri: "", // Obligatoire | Lien vers votre base de données MongoDB
    autoPost: true // par défaut: true | Poste automatiquement les notifications pour tous les serveurs de la base de données
});
client.scheduler = scheduler;

// ready.js
client.scheduler.init(); // Très important ! Sans cette ligne, le scheduler ne se démarrera pas.
```

## 🔧 Fonctions

### setChannel
Défini le salon où les notifications seront envoyées pour un serveur.
```javascript
scheduler.setChannel(Guild, TextChannel)
.then(res => console.log(res));
```

### addAnime
Ajoute un anime à la liste d'un serveur.
Pour ajouter un anime vous devez vous rendre sur [Anilist.co](https://anilist.co) et récupérer l'une des informations suivante :

- Url de l'anime | Exemple: https://anilist.co/anime/21/ONE-PIECE

- Nom de l'anime | Exemple: One Piece

- Identifiant de l'anime **(Se trouve dans l'url)** | Exemple: 21
 
```javascript
scheduler.addAnime(Guild, Anime<id|name|url>)
.then(res => console.log(res));
```

### removeAnime()
Retire un anime de la liste d'un serveur.

```javascript
scheduler.removeAnime(Guild, Anime<id|name|url>)
.then(res => console.log(res));
```

### list()
Affiche la liste d'anime d'un serveur.

```javascript
scheduler.list(Guild)
.then(res => console.log(res));
```

### setMode()
Défini le mode de notification d'un serveur.

Modes : 
- **all** | Le serveur est notifié de tous les animes qui seront diffusés.
- **list** (par défaut) | Le serveur est notifié seulement si un anime de sa liste est diffusé.

```javascript
scheduler.setMode(Guild, Mode<all|list>)
.then(res => console.log(res));
```

### delete()
Supprime un serveur de la base de données.

```javascript
scheduler.delete(Guild)
.then(res => console.log(res));
```


#### ☎️ Contact
Discord : **Zeleff_#1615**
