document.onkeydown = function(){
    if(window.event && window.event.keyCode == 123) {
        alert("为了保密性,开发者工具于此界面被禁用");
        event.keyCode=0;
        event.returnValue=false;
    }
}
function submit(){
    if (document.getElementById('pass').value=='suibi'){
        document.getElementById('hidelay').style='opacity: 0;'
        setTimeout(
            "document.getElementById('hidelay').style='display:none;'"
            ,600);
        document.cookie='KEY=SUIBISUIBI'
    }else{
        alert("密码错误");
    }
}
function keyup_sub(e){
    var evt = window.event || e;
    if (evt.keyCode == 13){
        submit()
    }
}

function getCookie(name){
    var arr,reg=new RegExp("(^| )"+name+"=([^;]*)(;|$)");
    if(arr=document.cookie.match(reg))
    return unescape(arr[2]);
    else
    return null;
}

if (getCookie('KEY')=='SUIBISUIBI'){
    document.getElementById('hidelay').style='display:none;'
}