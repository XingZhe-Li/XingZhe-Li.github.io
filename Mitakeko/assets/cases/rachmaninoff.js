// Checked against the public-domain full score, B. & H. 16425, printed pp.44–45.
// All pitches below are concert pitches. The opening F-horn part is transposed
// down a perfect fifth; the piano reduction deliberately omits most LH notes.
const tone=(beat,duration,note,label)=>({beat,duration,notes:[note],...(label?{label}:{})});
const rest=(beat,duration,label)=>({beat,duration,notes:[],...(label?{label}:{})});
const hornPart=even=>({
  id:'horn',name:'独奏圆号 · 实音',clef:'treble',layer:'melody',waveform:'triangle',velocity:.58,
  events:even?[
    tone(0,.5,'B3'),tone(.5,.5,'C#4'),tone(1,.5,'D4'),
    tone(1.5,4,'D4','本摘录在小节末截断；原谱继续延音')
  ]:[
    tone(0,.5,'B3'),tone(.5,.75,'C#4'),tone(1.25,.25,'D4'),
    tone(1.5,4,'D4','本摘录在小节末截断；原谱继续延音')
  ]
});
const pianoMelody=()=>({
  id:'melody',name:'钢琴右手上方旋律',clef:'treble',layer:'melody',velocity:.64,
  events:[
    rest(0,1,'m10第一拍休止'),tone(1,2,'D5'),tone(3,1,'A4'),
    tone(4,3,'C#5'),tone(7,2/3,'A4','三连音中的四分音符：占2/3拍'),
    tone(7+2/3,1/3,'B4','三连音中的八分音符：占1/3拍')
  ]
});
const firstBass=onBeat=>({
  id:'bass',name:'左手首个低音 · 仅取D2',clef:'bass',layer:'bass',velocity:.5,
  events:[tone(onBeat?0:1/3,1/3,'D2',onBeat?'本站改写：移到第一拍拍头':'原谱：先休止一个八分三连音，再出现D2')]
});

export const rachmaninoffStudy={
  id:'rachmaninoff-concerto-1-ii',caseId:'rachmaninoff-concerto-1-ii',
  title:'第一钢琴协奏曲第二乐章：弱起、长音与错开的进入',
  thesis:'这里的歌唱性不只来自音高。圆号把短弱起引向延长音；钢琴把旋律、低音与分解活动错开，让同一件乐器里有不同的呼吸层。',
  scope:'只细读最终修订总谱中的开头圆号弱起和钢琴主题m10–11，并用控制单一变量的改写说明听觉效果。不是整乐章的和声总览，也不把合成示例当作Ashkenazy录音的演奏速度与发音。',
  recording:{
    label:'Vladimir Ashkenazy · Concertgebouworkest · Bernard Haitink；Rachmaninov: Complete Works For Piano；Piano Concerto No.1 in F Sharp Minor, Op.1: II. Andante（收藏录音）',
    scoreEdition:'Gutheil最终修订版总谱，Boosey & Hawkes再版，版号B. & H. 16425；印刷第44–45页。通常称1917修订，书目将本谱列入1919最终版。',
    locator:'先从第二乐章开头独奏圆号的三个弱起音定位，再找乐队引子后的钢琴自由独白；其后的Solo espress.是本页m10–11。开头不足一小节的弱起不计作第1完整小节。',
    caveat:'不沿用1891初版，也不混用IMSLP另列的1917?中间版。录音再发行与文件前后静音可能不同，因此使用谱页、小节与声音地标，不预填未经录音对齐的秒数。'
  },
  sources:[
    {id:'rach-full-score',title:'Rachmaninoff · Piano Concerto No.1, Op.1 · 最终修订总谱',url:'https://s9.imslp.org/files/imglnks/usimg/f/fe/IMSLP24804-PMLP08809-Rachmaninoff_-_Piano_Concerto_No._1,_Op._1_(orch._score).pdf',kind:'公版原谱',locator:'IMSLP #24804；B. & H. 16425。PDF第44/45页即印刷44/45页：II开头；Solo espress. m10–11。音符、时值、休止与乐器标识均由本谱核对。'},
    {id:'rach-editions',title:'IMSLP · 第一钢琴协奏曲版本与书目',url:'https://imslp.org/wiki/Piano_Concerto_No.1,_Op.1_(Rachmaninoff,_Sergei)',kind:'谱源书目',locator:'Full Scores → Final Version (1919) → #24804；与First Version (1890–91)及Interim Version (1917)?分开列出。'},
    {id:'rach-laphil',title:'Los Angeles Philharmonic · Piano Concerto No.1',url:'https://www.laphil.com/works/piano-concerto-no-1-rachmaninoff',kind:'乐团作品说明',locator:'Orrin Howard作品说明末段：第二乐章由独奏圆号发起，其后是延展的钢琴独奏；At a Glance列1891、1917、1919。'},
    {id:'rach-wong',title:'Hio Teng Wong · A “Misleading” Opus Number（2023）',url:'https://digital.lib.washington.edu/server/api/core/bitstreams/74c5404b-6e81-4a88-bc5b-b5196356c95b/content',kind:'版本比较研究',locator:'University of Washington DMA论文，第2章印刷78–81页，Ex.37b、38b、40b：开头与主题m10–17的修订比较。这里的音符摘录另据公版总谱逐音核对。'}
  ],
  sections:[
    {
      id:'rach-foreground',heading:'1. 圆号先说，钢琴后来展开：前景有明确的交接',
      claim:'第二乐章开始时，钢琴先休止；第一个可追踪的独奏线条属于圆号。钢琴主题的出现是一种声音角色与时间密度的改变。',
      evidenceKind:'读谱＋编配分析',evidence:['rach-full-score','rach-laphil'],
      explanation:[
        '看第44页：Piano双谱表从弱起至这一页末都写着休止，圆号I上方则标有Solo。第一声并不是“钢琴旋律加乐队背景”。先由一件能延长气息的管乐器发起，再由钢琴的击弦与分解活动占据前景，发声方式本身就参与了段落的区别。',
        '第45页先保留乐队的长音与钢琴近似华彩的自由独白，随后Solo espress.开始有清楚小节组织的钢琴主题。原谱同一页里同时有延续的长音、密集的自由音群与新的歌唱线；“旋律呼吸”因此要看起音、持续、休止与织体，不能仅按每秒响了多少个音来判断。',
        '这说明独奏者的身份与当前旋律承担者是两件事。钢琴可以暂时休止、独白、呈现旋律或提供活动背景；乐队也可以主动发起材料。本页先用两个很小的谱例核对这些关系，不替整乐章指定一种固定的声部分工。'
      ],
      listen:[
        '从乐章开头追踪温和的圆号短起句，留意它的延长音与其后乐队声音的加入。',
        '找到钢琴第一次较自由地活动，再等到连续的歌唱主题出现；把“钢琴发出第一声”与“m10主题开始”分开标记。'
      ],
      lessonIds:['u01-01','u01-02','u09-03','u10-02']
    },
    {
      id:'rach-pickup',heading:'2. 三个弱起音，怎样走向一个长音',
      claim:'圆号以B—C♯—D的实音级进起步；短音并不等长，随后同音D被重新起奏并延长。方向来自节奏和时值差，而非不断换音。',
      evidenceKind:'逐音摘录＋节奏对照',evidence:['rach-full-score','rach-editions'],
      explanation:[
        '圆号是移调乐器。第44页写着Corni in F：书写音F♯4、G♯4、A4，分别发出低纯五度的B3、C♯4、D4。本页可播放谱示使用实音；键盘上的C4为中央C，不能把总谱圆号的字面音高直接与钢琴键盘比。',
        '三个弱起音依次为八分、附点八分、十六分，以四分音符为1拍就是1/2、3/4、1/4拍，共1.5拍。这是4/4语境中不足一小节的起步；“3/8弱起”指三个八分音符的总长度，不表示另换3/8拍号。不应为了凑四拍添加原谱没有的休止。下一完整小节是D4全音符：音高暂时保持，起音由短促转为延展。',
        '在本乐章D大调的语境中，这三个实音可以记为6—7—1；B到C♯是大二度，C♯到D是小二度。但三音本身不能独立证明整乐章的调，调性还要由更长的音高和和声语境确认。这里先确认的是“上行—靠近—延长”这条可听的组织。',
        '版本B只把弱起改为三个等长八分音符，音高、弱起总长与长D的起点都不变。比较最后一个短D的提前以及中间C♯停留时间的缩短。差别来自音符内部的时间安排，不是B版改变了拍号、调性或整体速度。原谱长D仍向后延音，本摘录到第1完整小节末截断，循环终点不代表原句终止。'
      ],
      listen:[
        '先在合成谱示中听到B与C♯的较长起步、很短的D，以及随后延长的同音D；再回原录音寻找相同的方向。',
        '切换A/B时保持示例BPM相同，先比较音符起点，再比较你感到的停留与推进；原演奏的自由速度和渐强不在这个单变量实验里。'
      ],
      lessonIds:['u02-02','u02-04','u03-03','u03-04','u05-03'],excerptId:'rach-horn-pickup'
    },
    {
      id:'rach-piano-line',heading:'3. 钢琴旋律：长音与休止，让句子可以呼吸',
      claim:'m10的旋律先空一拍，再以D5二分音符接A4四分音符；m11把C♯5延长三拍，最后才用三连音的A—B继续活动。',
      evidenceKind:'逐音读谱＋旋律分析',evidence:['rach-full-score'],
      explanation:[
        '第45页Solo espress.处右手第一拍是休止，随后D5占两拍、A4占一拍。下一小节C♯5为附点二分音符，占三拍；末拍的A4与B4属于三连音，分别占2/3拍与1/3拍。三连音并不要求每组一定有三个重新起音的音符：一个较长音也可以占其中两份。',
        'D5到A4向下跳纯四度，A4到下一小节C♯5又向上跳大三度；这些距离与长短时值一起构成线条。旋律并非每一个细分都必须发声，长音和休止也不是创作尚未填满的空格。',
        '下方谱例保留了两小节的上方旋律，只另外抽出左手最初的D2。省略的左手分解音与中间声部，不能当作原谱里的真实安静；这是一份带有明确选择的分析减缩。先独听旋律，注意长D与长C♯；再加入低音，观察两只手的进入为何不是同时发生。'
      ],
      listen:[
        '在录音的Solo espress.主题处先跟最上方的歌唱线，听D到A的下降与随后更长的C♯。',
        '重听同一段时再把注意转向旋律下方的活动；保持两条注意线分开，避免把所有钢琴起音合并成同一条旋律。'
      ],
      lessonIds:['u02-02','u03-03','u05-03','u05-04','u09-03'],excerptId:'rach-piano-offset'
    },
    {
      id:'rach-delayed-bass',heading:'4. 第一拍先留一格：低音与旋律不必同时进入',
      claim:'m10左手先休止一个八分三连音，D2才在第一拍后1/3拍出现；右手旋律D5更晚，要到第二拍才开始。',
      evidenceKind:'时点核对＋单变量改写',evidence:['rach-full-score','rach-wong'],
      explanation:[
        '这段的四分拍可以按三等分来细数。以m10第一拍拍头为0，左手D2的谱面起点为1/3，右手D5的起点为1。两只手并不是先对齐一个厚和弦，再让上方旋律装饰它；不同层次从一开始就在不同位置活动。',
        '在谱例二中开启本站添加的拍点参照，再独听首个低音：A版D2稍后于第一拍的参照声；B版只将同一D2移至拍头，音高、力度、时值和右手旋律都不改。这个实验只检验一个入口的时间关系，没有把真实演奏的自由速度解释成错误，也不声称B版是另一份历史版本。',
        '原谱左手随后还有跨度较大的分解音与复合声部，本页没有逐音播放它们。Wong的版本比较把延迟的低音与线性声部写法联系起来；这里选择最容易直接核对的第一拍，先建立“共同拍点不等于同时起音”的概念，再回完整录音听更丰富的连接。'
      ],
      listen:[
        '有拍点参照时，先只听首个D2与第一拍之间的小空隙，再加入右手，确认旋律还要更晚才进入。',
        '回到录音，追踪上方长线和下方流动各自的持续性；如果不能凭耳朵确定1/3拍的位置，可以同时看原谱，不必无提示猜拍。'
      ],
      lessonIds:['u02-01','u02-04','u07-03','u09-01']
    }
  ],
  excerpts:[
    {
      id:'rach-horn-pickup',title:'谱例一：圆号弱起与第1完整小节',identity:'公版原谱实音摘录＋本站改写',
      sourceIds:['rach-full-score'],locator:'最终修订总谱印刷第44页，II Andante开头，F圆号I：3/8弱起＋第1完整小节。',
      caption:'A保留所摘圆号线的音高与谱面时值，转为实音；省略渐强、发音与后续延音。B仅把弱起改为等长八分音符。摘录的长D在原谱继续延至后面；此处截取不是一个完整乐句。循环每轮从弱起重新比较，不表示连续的4/4演奏。',
      sourceImage:{href:'./scores/rach1-ii-horn-source.png',alt:'总谱第44页F调圆号谱表，含弱起、首完整小节和后续延音上下文，保留Corni in F标签与谱号。',caption:'公版总谱，B. & H. 16425，印刷p44。原样裁图含下一小节作为延音上下文；可播放减缩只截至第1完整小节末。'},
      meter:'4/4',beatsPerBar:4,bars:2,barBeats:[1.5,4],barLabels:['3/8弱起 · 不足一小节','第1完整小节 · 摘录至此'],keySignature:2,bpm:64,
      variants:[
        {id:'score',label:'A · 原谱弱起时值',identity:'原谱实音摘录',description:'B3八分、C♯4附点八分、D4十六分；下一完整小节D4全音。F圆号书写音按纯五度换算为实音。',parts:[hornPart(false)]},
        {id:'even',label:'B · 弱起改为三个等长八分',identity:'本站单变量改写',description:'三个弱起音各半拍，其余音高、音量、弱起总长及随后长D起点与时值保持不变。不是历史版本对比。',parts:[hornPart(true)]}
      ]
    },
    {
      id:'rach-piano-offset',title:'谱例二：m10–11旋律与首个低音的不同入口',identity:'公版原谱分析减缩＋本站改写',
      sourceIds:['rach-full-score','rach-wong'],locator:'最终修订总谱印刷第45页底部，Solo espress.第一行前两个完整小节，即II m10–11。',
      caption:'A保留m10–11右手上方旋律及m10左手首个D2的音高、时值与起点。左手其余分解音、和弦及其他声部均省略；其空白不表示原曲沉默。B仅把同一D2从拍后1/3移到拍头，方便有拍点参照时比较。',
      sourceImage:{href:'./scores/rach1-ii-piano-m10-11-source.png',alt:'总谱第45页钢琴Solo espress.主题m10–11的双谱表，右手旋律与左手完整分解活动同时可见。',caption:'公版总谱，B. & H. 16425，印刷p45，m10–11。原样裁图保留两只手；下方合成谱示只选其中两层证据。'},
      meter:'4/4',beatsPerBar:4,bars:2,barLabels:['第10小节','第11小节'],keySignature:2,bpm:64,
      variants:[
        {id:'score',label:'A · 原谱入口：D2在拍后1/3',identity:'原谱分析减缩',description:'右手旋律保持原谱；左手只抽出首个D2，第一拍先有一个八分三连音休止。量化示例未重现原录音的自由速度。',parts:[pianoMelody(),firstBass(false)]},
        {id:'onbeat',label:'B · 同一D2移到拍头',identity:'本站单变量改写',description:'只将D2从1/3拍移到0拍；其音高、时值、力度以及右手全部音符都与A相同。其余省略的左手材料仍未加入。',parts:[pianoMelody(),firstBass(true)]}
      ]
    }
  ],
  practice:{
    title:'写一次“先引入、再延长”，并安排不同层的入口',
    instructions:[
      '先对照原谱文字表，在琴键上核对圆号的书写音与实音；说明弱起总长为何是1.5拍，不给它补上虚构休止。',
      '用自己的三个音，写一版等长弱起、一版不等长弱起；保持三音音高、总长和后续长音起点不变，比较进入长音前的推动。',
      '再写两小节旋律与一个低音入口。让旋律至少保留一个休止或长音，比较低音在拍头与拍内进入的两个版本；用拍点参照说明自己真正改变了什么。'
    ],
    criteria:[
      '能区分4/4语境中的弱起小节、完整小节和本页为了分析截取的终点。',
      '能用确切拍数解释附点与三连音的时值，而非把每一次起音都当作一拍。',
      '清楚标注原谱摘录、分析省略与自己的改写，且A/B只改变事先约定的变量。'
    ]
  },
  takeaways:[
    '弱起的总长、内部长短与随后长音的位置共同组织方向；音高暂时不变也可以继续表达。',
    '移调乐器的书写音不等于实音。读总谱与用键盘核对时，先明确转换规则。',
    '同一架钢琴可以同时容纳歌唱线、低音与流动材料，它们不需要同时起音。',
    '分析减缩让关系更清楚，但省略的声部不等于真实安静，合成循环终点也不等于原曲句末。'
  ]
};
