LazyUI.elements.counter = {
    template(LazyID,inner,attrs){
        function getDaysTo(y, m, d) {
            var toDate = new Date(y, m-1, d);
            var now = new Date();
            var tm = toDate.getTime() - now.getTime(); //相差毫秒数
            return Math.floor(tm/86400000); //每天有 86400 秒
        }
        let [year,month,day] = attrs['target'].split('-').map((n)=>parseInt(n))
        let full = parseInt(attrs['full'])
        let to_day = getDaysTo(year,month,day)+1;
        let percent = (1 - (to_day/full))*100
        if ('repeat' in attrs){
            let date = new Date()
            to_day = getDaysTo(date.getFullYear(),month,day)
            if (to_day<0){
                to_day = getDaysTo(date.getFullYear()+1,month,day)
            }
            full = 365;
            percent = (1 - (to_day/full))*100
        }
        return `<div class="counter" id='${LazyID}'><name>${attrs['name']}</name><timer style="background-image: linear-gradient(90deg,#07456F ${percent}%,#00000000 ${percent+1}%);">剩${to_day}天</timer></div>`
    }
}