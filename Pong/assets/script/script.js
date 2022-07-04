function getCookie(cname)
{
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) 
  {
    var c = ca[i].trim();
    if (c.indexOf(name)==0) return c.substring(name.length,c.length);
  }
  return "";
}
if (getCookie('highsc')=="NaN" || getCookie('highsc')==""){document.cookie="highsc=0"}

state_menu_display = 'show'
state_about_display = 'hide'
state_score_display = 'hide'
state_game_display = 'hide'
state_over_display = 'hide'
this_hi = 0
count = 0
ping_last_tick = 0

keymap = {
    up:false,
    down:false,
    w:false,
    s:false,
}

pong = {
    x: 960,
    y: 540,
    speed:30,
    toward: Math.PI+0,
    rand(){
        this.toward = this.toward + Math.random()*(Math.PI/4)-Math.PI/8
    },
    next(){
        this.x = this.x + Math.cos(this.toward)*this.speed;
        this.y = this.y + Math.sin(this.toward)*this.speed;
        if (this.x<=0 || this.x>=1920){
            // this.toward = Math.PI - this.toward;
            // game over
            setTimeout(()=>{
                pong_run = 0
                over_show()
                game_hide()
            },500)
        }if (this.y<=0 || this.y>= 1080){
            this.toward = - this.toward;
        }
        if (this.x<=70 && this.x>= 30 
            && panelA.y-panelA.height/2 <= this.y 
            && this.y <= panelA.y+panelA.height/2 
            && ping_last_tick==0){

            this.toward = Math.PI - this.toward;
            count_add()
            ping_last_tick = 5
            this.rand()
        }
        else if (this.x<=1890 && this.x>= 1850
            && panelB.y-panelB.height/2 <= this.y 
            && this.y <= panelB.y+panelB.height/2 
            && ping_last_tick==0){

            this.toward = Math.PI - this.toward;
            count_add()
            ping_last_tick = 5
            this.rand()
        }else if(ping_last_tick > 0){
            ping_last_tick -= 1;
        }
    },out(){
        console.log(pong)
    }
}
panelA = {
    y:540,
    height:300,
    speed:30,
    next(){
        if (keymap.w){
            if (this.y>=0)this.y = this.y - this.speed;
        }
        else if (keymap.s){
            if (this.y<=1080)this.y = this.y + this.speed;
        }
    }
}

panelB = {
    y:540,
    height:300,
    speed:30,
    next(){
        if (keymap.up){
            if (this.y>=0)this.y = this.y - this.speed;
        }
        else if (keymap.down){
            if (this.y<= 1080)this.y = this.y + this.speed;
        }
    }
}

function count_add(){
    let score = document.getElementById('single')
    count += 1
    score.innerText = `${count}`
    tick = 1000 / (count*2+50)
}

tick = 1000 / 50
pong_run = 1
function game_run(){
    setTimeout(()=>{
        pong.next()
        panelA.next()
        panelB.next()
        frame_update(panelA.y,panelB.y,pong.x,pong.y)
        if (pong_run==1){
            game_run()
        }
    },tick)
}

function keydown(e){
    if (e.keyCode==38)keymap.up = true
    else if(e.keyCode==40)keymap.down = true
    else if(e.keyCode==87)keymap.w = true
    else if(e.keyCode==83)keymap.s = true
}

function keyup(e){
    if (e.keyCode==38)keymap.up = false
    else if(e.keyCode==40)keymap.down = false
    else if(e.keyCode==87)keymap.w = false
    else if(e.keyCode==83)keymap.s = false
}

window.onkeydown = keydown
window.onkeyup = keyup

function set_playground_size(){
    let playground = document.getElementsByClassName('playground')[0];
    let scale_rate = Math.min(Math.min(document.body.offsetHeight,document.body.clientHeight)/1080,Math.min(document.body.clientWidth,document.body.offsetWidth)/1920);
    console.log(document.body.offsetHeight,document.body.offsetWidth)
    playground.setAttribute('style',`zoom:${scale_rate};`)
}

function menu_hide(){
    if (state_menu_display=='show'){
        document.querySelector('menu').setAttribute('style','-webkit-transform:translate(1920px);transform:translate(1920px);');
        setTimeout(()=>{
            document.querySelector('menu').setAttribute('style','display:none;');
            console.log('hidden')
            state_menu_display = 'hide'
        },500)
    }
}

function menu_show(){
    if (state_menu_display=='hide'){
        document.querySelector('menu').setAttribute('style','-webkit-transform:translate(1920px);transform:translate(1920px);');
        setTimeout(()=>{
            document.querySelector('menu').setAttribute('style','');
            console.log('shown')
            state_menu_display = 'show'
        },0)
    }
}

function score_hide(){
    if (state_score_display=='show'){
        document.querySelector('score').setAttribute('style','-webkit-transform:translate(-1920px);transform:translate(-1920px);');
        setTimeout(()=>{
            document.querySelector('score').setAttribute('style','display:none;');
            console.log('hidden')
            state_score_display = 'hide'
        },500)
    }
}

function score_show(){
    // Prepare the page
    document.getElementById('score-hi').innerText = "本次最高:"+this_hi
    let highsc = getCookie('highsc')
    document.getElementById('score-co').innerText = "Cookie最高:"+parseInt(highsc)

    if (state_score_display=='hide'){
        document.querySelector('score').setAttribute('style','-webkit-transform:translate(-1920px);transform:translate(-1920px);');
        setTimeout(()=>{
            document.querySelector('score').setAttribute('style','');
            console.log('shown')
            state_score_display = 'show'
        },0)
    }
}

function over_hide(){
    if (state_over_display=='show'){
        document.querySelector('over').setAttribute('style','-webkit-transform:translate(-1920px);transform:translate(-1920px);');
        setTimeout(()=>{
            document.querySelector('over').setAttribute('style','display:none;');
            console.log('hidden')
            state_over_display = 'hide'
        },500)
    }
}

function over_show(){
    // Prepare the page
    document.getElementById('over-sc').innerText = "本次分数:"+count
    this_hi = Math.max(count,this_hi)
    document.getElementById('over-hi').innerText = "本次最高:"+this_hi
    let highsc = getCookie('highsc')
    highsc = Math.max(count,parseInt(highsc))
    document.cookie = "highsc="+highsc
    document.getElementById('over-co').innerText = "Cookie最高:"+highsc

    if (state_over_display=='hide'){
        document.querySelector('over').setAttribute('style','-webkit-transform:translate(1920px);transform:translate(1920px);');
        setTimeout(()=>{
            document.querySelector('over').setAttribute('style','');
            console.log('shown')
            state_over_display = 'show'
        },0)
    }
}

function game_hide(){
    if (state_game_display=='show'){
        document.querySelector('game').setAttribute('style','-webkit-transform:translate(-1920px);transform:translate(-1920px);');
        setTimeout(()=>{
            document.querySelector('game').setAttribute('style','display:none;');
            console.log('hidden')
            state_game_display = 'hide'
        },500)
    }
}

function game_show(){
    if (state_game_display=='hide'){
        document.querySelector('game').setAttribute('style','-webkit-transform:translate(-1920px);transform:translate(-1920px);');
        setTimeout(()=>{
            document.querySelector('game').setAttribute('style','');
            console.log('shown')
            state_game_display = 'show'
        },0)
    }
}

function about_hide(){
    if (state_about_display=='show'){
        document.querySelector('about').setAttribute('style','-webkit-transform:translate(-1920px);transform:translate(-1920px);');
        setTimeout(()=>{
            document.querySelector('about').setAttribute('style','display:none;');
            console.log('hidden')
            state_about_display = 'hide'
        },500)
    }
}

function about_show(){
    if (state_about_display=='hide'){
        document.querySelector('about').setAttribute('style','transform:translate(-1920px);transform:translate(-1920px);');
        setTimeout(()=>{
            document.querySelector('about').setAttribute('style','');
            console.log('shown')
            state_about_display = 'show'
        },0)
    }
}

function events_bind(){
    document.getElementById('btn-about-back').addEventListener('click',()=>{
        about_hide()
        menu_show()
    })
    document.getElementById('btn-score-back').addEventListener('click',()=>{
        score_hide()
        menu_show()
    })
    document.getElementById('btn-about').addEventListener('click',()=>{
        menu_hide()
        about_show()
    })
    document.getElementById('btn-score').addEventListener('click',()=>{
        menu_hide()
        score_show()
    })
    document.getElementById('btn-play').addEventListener('click',()=>{
        menu_hide()
        game_show()
        pong.x = 1920/2
        pong.y = 1080/2
        pong.toward = Math.PI
        panelA.y = 1080/2
        panelB.y = 1080/2
        document.getElementById('single').innerText = '0'
        frame_update(panelA.y,panelB.y,pong.x,pong.y)
        count = 0
        pong_run=1
        setTimeout(game_run,2000)
    })
    document.getElementById('btn-over-back').addEventListener('click',()=>{
        over_hide()
        menu_show()
    })
}

function frame_update(panelA_y,panelB_y,pong_x,pong_y){
    let pa = document.getElementById('panelA')
    let pb = document.getElementById('panelB')
    let pong = document.querySelector('pong')
    pa.setAttribute('style',`top:${panelA_y}`)
    pb.setAttribute('style',`top:${panelB_y}`)
    pong.setAttribute('style',`left:${pong_x};top:${pong_y}`)
}

function set_toucher(){
    let touch_hg = document.body.clientHeight ;
    let touch_wd = document.body.clientWidth ;
    let playground = document.getElementsByClassName("playground")[0]
    let toucher = (e)=>{
        let key_cache = {up:false,down:false,w:false,s:false}
        for (touch of e.targetTouches){
            if (touch.clientX<(touch_wd/2) && touch.clientY<(touch_hg/2)){
                key_cache.w = true
            }if (touch.clientX<(touch_wd/2) && touch.clientY>(touch_hg/2)){
                key_cache.s = true
            }if (touch.clientX>(touch_wd/2) && touch.clientY<(touch_hg/2)){
                key_cache.up = true
            }if (touch.clientX>(touch_wd/2) && touch.clientY>(touch_hg/2)){
                key_cache.down = true
            }
        }
        if (key_cache.w)keymap.w = true;
        else keymap.w = false;
        if (key_cache.s)keymap.s = true;
        else keymap.s = false;
        if (key_cache.up)keymap.up = true;
        else keymap.up = false;
        if (key_cache.down)keymap.down = true;
        else keymap.down = false;
        console.log(keymap)
    }
    playground.addEventListener('touchstart',toucher)
    playground.addEventListener('touchend',toucher)
}

window.onload = () => {
    set_toucher()
    events_bind()
    set_playground_size()
}