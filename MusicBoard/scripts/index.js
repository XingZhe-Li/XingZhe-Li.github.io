title = 'Playlists'
json_to_load = './data/playlist_ids_name_strict.json'
url = new URL(location.href)
if (url.searchParams.get('bgm')!=null){
    json_to_load = './data/background_ids_name_nonVIP.json'
    title = 'Backgrounds'
}
document.addEventListener('DOMContentLoaded',()=>{
    document.querySelector('.mode').textContent = title
})

function globalSwitch(){
    if (title=='Playlists'){
        window.open(location.href+'?bgm','_self')
    }else{
        window.open(location.href.replace('?bgm',''),'_self')
    }
}

// Config
player = new Audio()
data   = {}
player.volume = 0.5

play_index = -1
play_list = []
play_mode = 0
rangecount = 0

player.onerror = playNext

document.addEventListener('alpine:init',()=>{
    // Playerbar States
    playerbar = {
        playBtnIcon:"./assets/play.svg",
        playModeIcon:"./assets/repeat.svg",
        playVolIcon:"./assets/volume-1.svg"
    }
    playerbar = Alpine.reactive(playerbar)

    // ListPanel States
    listpanel = Alpine.reactive({
        lists:[],
        display:true
    })

    // SongsPanel States
    songspanel = Alpine.reactive({
        lists:[],
        display:false,
        now_play_id:-1
    })

    async function dataInit(){
        let res = await fetch(json_to_load)
        let jsoned = await res.json()
        data  = jsoned
        cache = []
        for (let l in jsoned){
            cache.push(l)
        }
        listpanel.lists = cache
        console.log('dataInit: playlists loaded')
    }
    dataInit()
    setInterval(playerStateSync, 200);
})

function listpanelItemClick(name){
    listpanel.display = false;
    cache = []
    data[name].forEach((el,index) => {
        cache.push([index,...el])
    });
    songspanel.lists = cache
    songspanel.display = true;
}

function songspanelReturn(){
    listpanel.display = true
    songspanel.display = false
}

function playItem(index,id){
    player.src = `http://music.163.com/song/media/outer/url?id=${id}.mp3`
    player.play()
    play_index = index
    play_list  = songspanel.lists
    songspanel.now_play_id = id
}

function secToMs(time){
    let min = Math.floor(time/60).toString()
    let sec = parseInt(time%60).toString()
    if (min.length==1) min = '0'+min
    if (sec.length==1) sec = '0'+sec
    return min+':'+sec
}

function playerStateSync(){
    if (isNaN(player.duration)){
        playerbar.playBtnIcon = './assets/play.svg'
        let playTime = document.querySelector('.playerbar-time')
        playTime.textContent = "00:00/00:00"
        return
    }

    if (player.paused){
        playerbar.playBtnIcon = './assets/play.svg'
    }else{
        playerbar.playBtnIcon = './assets/pause.svg'
    }
    for (let timer of document.querySelectorAll('.playerbar-ranger')){
        if (rangecount==0){
            timer.value = player.currentTime / player.duration
        }
    }
    var cur = secToMs(player.currentTime)
    var len = secToMs(player.duration)
    let playTime = document.querySelector('.playerbar-time')
    playTime.textContent = cur+"/"+len
}

function playerChangePlayTime(value){
    if (isNaN(player.duration))return
    rangecount += 1;
    setTimeout(() => {
        rangecount -= 1
        if (rangecount==0){
            player.currentTime = player.duration*value;
        }
    }, 200);
}

function SwitchMode(){
    play_mode=(play_mode+1)%3;
    playerbar.playModeIcon = [
        './assets/repeat.svg',
        './assets/repeat-1.svg',
        './assets/shuffle.svg'
    ][play_mode]
}

function ChangeVolume(value){
    player.volume=value;
    if (value==0){
        playerbar.playVolIcon = './assets/volume-0.svg'
    }else if (value < 0.5){
        playerbar.playVolIcon = './assets/volume-1.svg'
    }else{
        playerbar.playVolIcon = './assets/volume-2.svg'
    }
}

function PlayButton(){
    if (isNaN(player.duration))return
    if (player.paused)player.play()
    else player.pause()
}

function randint(a,b){ // a int between [a,b]
    return Math.round(Math.random()*(b-a))+a
}

function playNext(){
    if (play_mode==0){
        if (play_index<play_list.length-1 && play_index >= 0){
            play_index += 1
        }else{play_index = 0}
        songspanel.now_play_id = play_list[play_index][1]
        player.src = `http://music.163.com/song/media/outer/url?id=${play_list[play_index][1]}.mp3`
        player.play()
    }else if(play_mode==1){
        player.currentTime = 0
        player.play()
    }else{
        play_index = randint(0,play_list.length-1)
        songspanel.now_play_id = play_list[play_index][1]
        player.src = `http://music.163.com/song/media/outer/url?id=${play_list[play_index][1]}.mp3`
        player.play()
    }
}
player.onended = playNext