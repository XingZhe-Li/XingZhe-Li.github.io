player = new Audio()
player.volume = 0.5

// config
json_to_load = './data/background_ids_name_nonVIP.json'
option_count = 6

// Logics
rangecount = 0
data = {}
answer = ''
songinfo = []
record = window.localStorage.getItem('record')
if (record==null)record = []
else record = JSON.parse(record)
record_view = 0

document.addEventListener('alpine:init',()=>{
    viewdata = {
        view:0,
        options:[],
        selected:'',
        answer:'',
        showAns:false,
        mainbtn:'确认',
        ranks:[],

        averate:'0%',
        avetext:'0%',
        rankbg:'#01bd75',
        rankmode:'正确率',

        playBtn:'./assets/play.svg',
        volBtn:'./assets/volume-1.svg',
        songName:''
    }
    viewdata = Alpine.reactive(viewdata)
    async function dataInit(){
        let res = await fetch(json_to_load)
        let jsoned = await res.json()
        data  = jsoned
        console.log('data fetched')
        loadSong()
        loadRecord()
    }
    dataInit()
    setInterval(playerStateSync, 200);
})

function gotoNetease(){
    window.open(`https://music.163.com/#/song?id=${songinfo[0]}`)
}

player.onerror = ()=>{
    loadSong()
}

function addToRecord(){
    let found = false
    for (let i of record){
        if (i[0]==answer){ // i -> [album,correct,total]
            i[2] += 1
            if (viewdata.selected==answer)i[1] += 1
            found = true
            break
        }
    }
    if (!found){
        let ifright = 0;
        if (viewdata.selected==answer) ifright = 1;
        record.push([answer,ifright,1])
    }
    window.localStorage.setItem('record',JSON.stringify(record))
    loadRecord()
}

function clearRecord(){
    window.localStorage.removeItem('record')
    console.log('record removed')
    record = []
    loadRecord()
}

function changeViewMode(){
    record_view = (record_view+1)%4
    loadRecord()
}

function loadRecord(){
    viewdata.rankmode = ['正确率(1)','正确率(2)','正确数','回答数'][record_view]
    viewdata.rankbg   = ['#01bd7580','#01bd7580','#01bd7580','#1779e280'][record_view]
    if (record.length==0){
        viewdata.ranks = []
        viewdata.averate = '0%'
        viewdata.avetext = ''
        return
    }

    if (record_view==0){
        record.sort((a,b)=>(b[1]/b[2])-(a[1]/a[2]))
        let render_cache = []
        let corcount = 0
        let totalcount = 0
        record.forEach(el => {
            let corate = (el[1]/el[2]*100).toFixed(1)
            corcount   += el[1]
            totalcount += el[2]
            render_cache.push([el[0],corate+'%',corate+'%'])
        });
        viewdata.averate = (corcount/totalcount*100).toFixed(1)+'%'
        viewdata.avetext = (corcount/totalcount*100).toFixed(1)+'%'
        setTimeout(() => { // 为什么会出现这个bug?
            viewdata.ranks = render_cache
        }, 0);
    }else if(record_view==1){
        record.sort((a,b)=>(b[1]/b[2])-(a[1]/a[2]))
        let corcount = 0
        let totalcount = 0
        let render_cache = []
        record.forEach(el => {
            let corate = (el[1]/el[2]*100).toFixed(1)
            corcount   += el[1]
            totalcount += el[2]
            render_cache.push([el[0],corate+'%',`${el[1]}/${el[2]}`])
        });
        viewdata.averate = (corcount/totalcount*100).toFixed(1)+'%'
        viewdata.avetext = `${corcount}/${totalcount}`
        setTimeout(() => { // 为什么会出现这个bug?
            viewdata.ranks = render_cache
        }, 0);
    }else if(record_view==2){
        record.sort((a,b)=>b[1]-a[1])
        let maxValue=record[0][1]
        let render_cache = []
        let corcount = 0
        let totalcount = 0
        record.forEach(el => {
            let corate = (el[1]/maxValue*100).toFixed(1)
            corcount += el[1]
            totalcount += 1
            render_cache.push([el[0],corate+'%',el[1].toString()])
        });
        viewdata.averate = (corcount/totalcount/maxValue*100).toFixed(1)+'%'
        viewdata.avetext = (corcount/totalcount).toFixed(1)
        setTimeout(() => { // 为什么会出现这个bug?
            viewdata.ranks = render_cache
        }, 0);
    }else{
        record.sort((a,b)=>b[2]-a[2])
        let maxValue=record[0][2]
        let corcount = 0
        let totalcount = 0
        let render_cache = []
        record.forEach(el => {
            let corate = (el[2]/maxValue*100).toFixed(1)
            corcount += el[2]
            totalcount += 1
            render_cache.push([el[0],corate+'%',el[2].toString()])
        });
        viewdata.averate = (corcount/totalcount/maxValue*100).toFixed(1)+'%'
        viewdata.avetext = (corcount/totalcount).toFixed(1)
        setTimeout(() => { // 为什么会出现这个bug?
            viewdata.ranks = render_cache
        }, 0);
    }
}

function verify(){
    if (viewdata.answer==''){
        viewdata.answer = answer
        viewdata.songName = songinfo[1]
        viewdata.showAns  = true
        viewdata.mainbtn  = '下一首'
        addToRecord()
        return
    }
    viewdata.selected = ''
    viewdata.answer = ''
    viewdata.songName = ''
    viewdata.showAns  = false
    viewdata.mainbtn  = '确认'
    loadSong()
}

function loadSong(){
    let albums = []
    for (let i in data){
        albums.push(i)
    }

    answer = albums[randint(0,albums.length-1)]
    let c = data[answer]
    songinfo = c[randint(0,c.length-1)]

    let options  = [answer]
    while (options.length < option_count){
        let pick = albums[randint(0,albums.length-1)]
        if (options.indexOf(pick)!=-1)continue
        options.push(pick)
    }
    options.sort()
    viewdata.options = options

    player.src = `http://music.163.com/song/media/outer/url?id=${songinfo[0]}.mp3`
    player.play()
}

function randint(a,b){ // a int between [a,b]
    return Math.round(Math.random()*(b-a))+a
}

function itemColor(i){
    if (viewdata.answer!=''){
        if (i==viewdata.answer){
            return '--bg:#01bd75e4'
        }
        if (i==viewdata.selected){
            return '--bg:#da2929e4'
        }
    }
    if (i==viewdata.selected){
        return '--bg:#DDD4';
    }
}

function selectItem(i){
    if (viewdata.answer==''){
        viewdata.selected = i;
    }
}

function playerStateSync(){
    if (isNaN(player.duration)){
        viewdata.playBtn = './assets/play.svg'
        return
    }

    if (player.paused){
        viewdata.playBtn = './assets/play.svg'
    }else{
        viewdata.playBtn = './assets/pause.svg'
    }
    let timer = document.querySelector('.timer')
    if (rangecount==0){
        timer.value = player.currentTime / player.duration
    }
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

function ChangeVolume(value){
    player.volume=value;
    if (value==0){
        viewdata.volBtn = './assets/volume-0.svg'
    }else if (value < 0.5){
        viewdata.volBtn = './assets/volume-1.svg'
    }else{
        viewdata.volBtn = './assets/volume-2.svg'
    }
}

function playOrPause(){
    if (isNaN(player.duration))return
    if (player.paused){
        player.play()
    }else{
        player.pause()
    }
}