module.exports = (client) => {
    client.on('airing', data => {
        console.log(data);
    })
}