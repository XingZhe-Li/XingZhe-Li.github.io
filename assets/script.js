document.addEventListener('DOMContentLoaded',()=>{
    new Typed('.typed-text-1', {
        strings: typings[randint(0,typings.length-1)],
        typeSpeed: 100,
        backSpeed: 50,
        backDelay: 2000,
        smartBackspace: true,
        loop: true
    });
    new Typed('.typed-text-2', {
        strings: features,
        typeSpeed: 100,
        backSpeed: 50,
        backDelay: 2000,
        smartBackspace: true,
        loop: true
    });
})

features = [
    "这儿真没什么能干的。",
    "要不来打盘<p class=\"inblock\" onclick=\"window.open('./Pong/index.html')\">乒乓</p>？",
    "或者来<p class=\"inblock\" onclick=\"window.open('./MusicBoard/index.html')\">听听歌</p>？",
    "或者来<p class=\"inblock\" onclick=\"window.open('./MusicBoard/guess.html')\">猜猜歌</p>？",
    "再不行就只能看看<p class=\"inblock\" onclick=\"window.open('https://www.github.com/XingZhe-Li')\">代码</p>了。"
]

typings = [
    [
        "不要走在我后面",
        "因为我可能不会引路",
        "不要走在我前面",
        "因为我可能不会跟随",
        "请走在我的身边",
        "做我的朋友"
    ],
    [
        "一个人只要学会了回忆",
        "就再不会孤独",
        "哪怕只在世上生活一日",
        "你也能毫无困难地凭回忆在囚牢中独处百年"
    ],
    [
        "亲爱的朋友",
        "牺牲者会被遗忘",
        "牺牲者会被讥讽",
        "牺牲者会被利用",
        "三者必居其一",
        "至于",
        "至于被理解",
        "则不可能"
    ],
    [
        "我不说话",
        "那是因为",
        "我从来觉得没有什么好说的",
        "所以宁可把嘴闭上"
    ],
    [
        "和朋友谈心",
        "不必留心",
        "但和敌人对面",
        "却必须刻刻防备"
    ],
    [
        "人与其生活的这种离异",
        "演员与其背景的离异",
        "正是荒诞感"
    ],
    [
        "人生之荒诞",
        "难道非要世人或抱希望",
        "或用自杀来逃避吗"
    ],
    [
        "在所有失去的人中",
        "我最怀念我自己"
    ],
    [
        "死是一件不必急于求成的事",
        "死是一个必将到来的节日",
        "这样想过之后我安心多了",
        "眼前的一切不再那么可怕"
    ]
]

function randint(a,b){ // a int between [a,b]
    return Math.round(Math.random()*(b-a))+a
}