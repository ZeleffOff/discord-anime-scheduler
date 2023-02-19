function convertTime(time) {
    time = Number(time);
    var d = Math.floor(time / (3600*24));
    var h = Math.floor(time % (3600*24) / 3600);
    var m = Math.floor(time % 3600 / 60);
    var s = Math.floor(time % 60);
    
    var dDisplay = d > 0 ? d + (d == 1 ? " jour, " : " jours, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " heure, " : " heures, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " seconde" : " secondes") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

module.exports = convertTime;