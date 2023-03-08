# Discord Anime Scheduler

Notification when a new anime episode airs. [Anilist.co](https://anilist.co)

- This package use MongoDB.
- This package use DiscordJS v14.
- Npm : https://www.npmjs.com/package/discord-anime-scheduler

## 📁 Installation
```
npm i discord-anime-scheduler@latest
```

## 🚦 Initialize the Scheduler
```javascript
// index.js
const client = new Client(...); // Discord#Client
const Scheduler = require('discord-anime-scheduler');

const sheduler = new Scheduler(client, {
    log: false, // by default: false | Displays various information in the console.
    mongoUri: "", // Required | MongoDB URI
    autoPost: true // by default: true | Auto Send the notification in anime channel.
});
client.scheduler = scheduler;

// ready.js
client.scheduler.init(); // Init the scheduler ! If you don't initialize the scheduler, then it won't start.
```

## 🔧 Features

### setChannel
Define the channel where notifications will be sent.
```javascript
scheduler.setChannel(Guild, TextChannel);
```

### addAnime
Add an anime to the anime list.
Go to [Anilist.co](https://anilist.co) and get:

- Anime URL | Exemple: https://anilist.co/anime/21/ONE-PIECE

or

- Anime Name | Exemple: One Piece

or

- Anime ID **(is in url)** | Exemple: 21
 
```javascript
scheduler.addAnime(Guild, Anime<id|name|url>);
```

### removeAnime()
Remove an anime from the anime list.

```javascript
scheduler.removeAnime(Guild, Anime<id|name|url>)
.then(res => console.log(res));
```

### list()
Get server anime list.

```javascript
scheduler.list(Guild)
.then(list => console.log(list));
```

### setMode()
Set notification mode.

Modes : 
- **all** | Notifies all Anilist anime broadcasts.
- **list** (by default) | Notifies of anime broadcasts from the server's anime list only.

```javascript
scheduler.setMode(Guild, Mode);
```

### delete()
Delete a server from the database.

```javascript
scheduler.delete(Guild);
```


#### ☎️ Contact
Discord : **Zeleff_#1615**
