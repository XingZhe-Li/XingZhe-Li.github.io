function GetRequest() {
   var url = location.search; //获取url中"?"符后的字串
   if (url.indexOf("?") != -1) {    //判断是否有参数
      var str = url.substr(1); //从第一个字符开始 因为第0个是?号 获取所有除问号的所有符串
      strs = str.split("=");   //用等号进行分隔 （因为知道只有一个参数 所以直接用等号进分隔 如果有多个参数 要用&号分隔 再用等号进行分隔）
      return(strs[1]);          //直接弹出第一个参数 （如果有多个参数 还要进行循环的）
   }
}
document.onkeydown = function(){
   if(window.event && window.event.keyCode == 123) {
       alert("为了保密性,开发者工具于此界面被禁用");
       event.keyCode=0;
       event.returnValue=false;
   }
}
function getCookie(name){
   var arr,reg=new RegExp("(^| )"+name+"=([^;]*)(;|$)");
   if(arr=document.cookie.match(reg))
   return unescape(arr[2]);
   else
   return null;
}
