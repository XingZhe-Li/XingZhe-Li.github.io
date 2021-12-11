function getDaysTo(y, m, d) {
    var toDate = new Date(y, m-1, d);
    var now = new Date();
    var tm = toDate.getTime() - now.getTime(); //相差毫秒数
    return Math.floor(tm/86400000); //每天有 86400 秒
}

window.onload = function(){
    to_day = getDaysTo(2024,6,7)+1;
    document.getElementById('countday').innerHTML = to_day+'天';
    percent = (1 - (to_day/1000))*100
    document.getElementById('progress_rest').style='left:calc('+percent+'% + 15px);'
    var date = new Date()

    thisyear = date.getFullYear()
    to_day = getDaysTo(thisyear,10,25)+1;
    if (to_day<0){
        to_day = getDaysTo(thisyear+1,10,25)+1;
    }
    document.getElementById('mybirth').innerHTML = '剩余'+to_day+'天';

    thisyear = date.getFullYear()
    to_day = getDaysTo(thisyear,3,14)+1;
    if (to_day<0){
        to_day = getDaysTo(thisyear+1,3,14)+1;
    }
    document.getElementById('gfbirth').innerHTML = '剩余'+to_day+'天';

    thisyear = date.getFullYear()
    to_day = getDaysTo(thisyear,7,3)+1;
    if (to_day<0){
        to_day = getDaysTo(thisyear+1,7,3)+1;
    }
    document.getElementById('mobirth').innerHTML = '剩余'+to_day+'天';

    thisyear = date.getFullYear()
    to_day = getDaysTo(thisyear,9,6)+1;
    if (to_day<0){
        to_day = getDaysTo(thisyear+1,9,6)+1;
    }
    document.getElementById('fabirth').innerHTML = '剩余'+to_day+'天';
}