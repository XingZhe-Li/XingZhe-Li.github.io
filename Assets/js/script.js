
// Darkmode Detect
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
if (prefersDarkScheme.matches){
    document.getElementById('headicon').href="./Assets/svg/Terminal-Light.svg"// Darkmode
}else{
    document.getElementById('headicon').href="./Assets/svg/Terminal-Black.svg" // Lightmode
}

function aboutscroll(){
    window.scrollTo({
        top:document.body.scrollHeight,
        behavior:'smooth'
    })
}

function featurespane(){
    x = document.getElementById('featurepane')
    x.style = "display:flex;animation: ease blurin .8s"
}

function featuresquit(){
    x = document.getElementById('featurepane')
    x.style = "animation: ease blurout 0.8s;display:flex;"
    setTimeout(() => {
        x.style = ""
    }, 800);
}

function mirrorin(){
    x = document.getElementById('mirrorpane')
    x.style = "display:flex;animation: ease blurin .8s"
}

function mirrorquit(){
    x = document.getElementById('mirrorpane')
    x.style = "animation:ease blurout 0.8s;display:flex;"
    setTimeout(() => {
        x.style = ""
    }, 800);
}