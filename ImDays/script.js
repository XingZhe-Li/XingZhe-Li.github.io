function getDaysTo(y, m, d) {
    var toDate = new Date(y, m-1, d);
    var now = new Date();
    var tm = toDate.getTime() - now.getTime(); //相差毫秒数
    return Math.floor(tm/86400000); //每天有 86400 秒
}

window.onload = function(){
    to_day = getDaysTo(2024,6,7)+1;
    document.getElementById('countday').innerHTML = to_day+'天';
}