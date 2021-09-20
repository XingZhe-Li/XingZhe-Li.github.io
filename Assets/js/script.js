
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