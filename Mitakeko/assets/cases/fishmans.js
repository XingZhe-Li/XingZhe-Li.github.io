// The structures are grounded in the named sources. Every timed note below is
// newly written for comparison; none is a transcription of the Fishmans record.
const cell = ['C4','G4','E4','G4','C5','G4','E4','G4'];
const raisedCell = ['D4','A4','F#4','A4','D5','A4','F#4','A4'];
const cellEvents = (notes,start) => notes.map((note,i)=>({beat:start+i*.5,duration:.5,notes:[note]}));
const twoBarPart = second => ({
  id:'piano',name:'原创钢琴音型',clef:'treble',layer:'melody',velocity:.48,
  events:[...cellEvents(cell,0),...cellEvents(second,4)]
});
const bars = (active,makeEvents) => active.flatMap(bar=>makeEvents(bar*4));
function ensembleParts(active={piano:[0,1,2,3],bass:[0,1,2,3],drums:[0,1,2,3]}) {
  return [
    {id:'piano',name:'音型层',clef:'treble',layer:'melody',velocity:.42,
      events:bars(active.piano,start=>['C5','E5','G5','E5'].map((note,i)=>({beat:start+i,duration:1,notes:[note]})))},
    {id:'bass',name:'低音层',clef:'bass',layer:'bass',velocity:.45,
      events:bars(active.bass,start=>[0,2].map(i=>({beat:start+i,duration:2,notes:['C3']})))},
    {id:'drums',name:'打击层',clef:'percussion',layer:'rhythm',velocity:.36,
      events:bars(active.drums,start=>Array.from({length:8},(_,i)=>({
        beat:start+i*.5,duration:.5,notes:[],kind:i%2?'hat':i%4===0?'kick':'snare'
      })))}
  ];
}

export const fishmansStudy = {
  id:'fishmans-long-season',
  caseId:'fishmans-long-season',
  title:'《LONG SEASON》：让循环成为参照，让声音层次推动长篇',
  thesis:'固定材料与持续推进可以同时存在。钢琴循环建立可辨认的参照，演奏层的活动和合奏前景的转移，再在更长尺度上组织变化与回归。',
  scope:'以1996录音室作品为对象，依据成员访谈分析固定音型、演奏与音序的关系，以及四个创作部分。本文结构谱表示经证言确认的宏观关系；两个可播放的音符谱例均为本站原创对照，不冒充原曲钢琴、低音或鼓的转写。',
  recording:{
    label:'Fishmans · LONG SEASON · 1996录音室作品（收藏中的LONG SEASON专辑）',
    scoreEdition:'结构谱据茂木欣一访谈整理；音符对照谱由本站编写。',
    locator:'前半合奏中的循环，以及合奏—鼓与打击—原声质地—合奏回归四个听觉地标。',
    caveat:'1998年12月28日现场的编配与时长不同。2016再版的五个曲目索引也不等于四个创作部分；本页不预填未经版本核对的秒数、原曲音名或和弦进行。'
  },
  sources:[
    {id:'fish-osaji',title:'OSAJI Journal · 茂木欣一与茂田正和对谈',url:'https://osaji-journal.net/journal/journal-1610/',locator:'「互いにアイデアを引き出し合いながらしていた“音のデッサン”」：四部分、HONZI钢琴循环与排练中的创作。',kind:'作者访谈'},
    {id:'fish-drummer-1997',title:'Drums Magazine · 茂木欣一采访（1997年8月号存档）',url:'https://drumsmagazine.jp/player/archive-interview-fishmans-5/',locator:'「反省点と言いますと？」后的回答：从LONG SEASON起跟随sequence演奏，并希望更自由。原采访1997年；网页存档2021年。',kind:'发行期作者访谈'},
    {id:'fish-official-history',title:'Universal Music · Fishmans官方履历',url:'https://www.universal-music.co.jp/fishmans/biography/',locator:'1996年10月25日条目：单曲目专辑、四部分；1998—1999年条目另列最后现场与现场专辑。',kind:'官方版本资料'},
    {id:'fish-2016-index',title:'Universal Music · LONG SEASON [SHM-CD] UPCY-7175',url:'https://www.universal-music.co.jp/fishmans/products/upcy-7175/',locator:'2016年9月7日再版的「曲目」栏：Long Season .1至.5五个索引；商品说明注明zAk再母带。',kind:'官方发行目录'}
  ],
  sections:[
    {
      id:'fish-loop',heading:'1. 固定音型：同一个材料，成为听觉参照',
      claim:'标志性钢琴循环来自HONZI在排练中的手弹。它的反复出现，使其他声音的变化有一个可以比较的背景。',
      evidenceKind:'作者证言＋本站分析',evidence:['fish-osaji'],
      listen:[
        '在前半合奏中先追踪反复出现的钢琴音型，辨认“一轮又回来”的感觉。',
        '保持这条参照，再把注意转向它旁边的低音、打击和旋律，区分背景重复与前景活动。'
      ],
      explanation:[
        '茂木回忆，HONZI在排练中手弹出那个钢琴循环，乐队随即将它纳入作品。这为一个具体的材料来源提供了证据；下面关于它如何影响聆听的解释，是本站对固定音型作用的分析。',
        '固定音型不必每轮提供新旋律。反复先让人记住一个单位；当这个单位再次被认出时，周围声部的进入、留白、发音和密度便更容易成为前景。因此，材料在一个尺度上保持相近，音乐仍可以在另一个尺度上推进。',
        '采访里的sequence指反复的音序或演奏单位，不能直接等同课程中的“模进”。模进需要检查同一材料是否移到新的音高位置。谱例中，版本A两小节原高重复；版本B只把第二小节整体移高大二度，E也随之变成F♯。相同节奏保留了材料身份，整体移位又产生了明确的音高方向。',
        '这组谱例只比较“固定”与“移位”两个组织办法。它没有给出Fishmans钢琴循环的原曲音名，也不据此给原曲指定调性。'
      ],
      lessonIds:['u05-01','u05-02','u09-02'],excerptId:'fish-fixed-sequence'
    },
    {
      id:'fish-sequence-performance',heading:'2. 跟着音序演奏：共同参照，保留不同的活动',
      claim:'发行次年的茂木采访谈到与sequence一起演奏并追求更自由。稳定参照与生演奏的变化，应分开观察。',
      evidenceKind:'作者证言＋本站分析',evidence:['fish-drummer-1997'],
      listen:[
        '跟随循环的回返，同时听打击声的填充、重音和留白；先描述事件怎样组织。',
        '重听同一段，分别跟钢琴与鼓；核对两层是否需要每次同时起音，才让你感觉时间仍在继续。'
      ],
      explanation:[
        '1997年的采访中，茂木提到从LONG SEASON开始跟着sequence演奏，并希望相对于它更自由。这支持一种重要的区分：有固定参考，并不意味着所有声音只能复制同一排起音。',
        '拍点是共同跟随的参照，节奏则是具体声音的起音、持续和重音安排。一个声部可以在拍点上支撑，另一个声部可以错开、填充或暂时留白；这些活动由时间关系联结。循环稳定时，演奏层的差异有机会被听成“同一背景上的变化”，而不是另起一首曲子。',
        '可以在四小节原创对照谱里独听打击层，再加入音型层：两者并不在所有细分位置同时起音，却共享四拍小节。该模型演示声部与时间的组织，不重现真实演奏的微时值、发音或录音质感；也不能从“自由”一词反推出原录音具体偏移了多少毫秒。'
      ],
      lessonIds:['u02-01','u02-04','u09-01','u10-04'],relatedExcerptId:'fish-layer-returns'
    },
    {
      id:'fish-large-form',heading:'3. 合奏—打击—原声—合奏：回归如何被准备',
      claim:'茂木把作品描述为A合奏、B鼓与打击、C原声质地、D合奏回归。声音关系的改变本身可以承担长程结构。',
      evidenceKind:'作者证言＋本站分析',evidence:['fish-osaji','fish-official-history'],
      listen:[
        '先认出四个地标：前半合奏、打击成为焦点、原声质地、合奏重新汇聚。',
        '比较合奏回来前后的前景、密度与音色关系；回归感需要放在前面的经历中判断。'
      ],
      explanation:[
        '下面的结构谱整理的是成员对四个部分的描述。四列只表示先后关系，既不表示等长，也不是逐声部的开关记录。这里将声音状态放在第一行，是为了先解释可以直接追踪的结构证据。',
        'D的到达可以由此前的撤出与前景转移来准备：先建立集体声音的参照，再让打击或原声质地占据注意，合奏重新汇聚时，就有了可比较的对象。这是从织体、密度和听觉记忆推导的解释；不必先假设每次推进都依赖新的复杂和弦。',
        '合奏回归也不等于所有音符原样再现。A、B、C、D是成员描述创作过程的工作分段，不能仅凭四个字母，就把它判定为四个古典乐章或奏鸣曲的再现结构。',
        '四小节原创对照只保留C大三和弦音与低音C，比较“始终全奏”和“撤出—转移前景—再汇聚”。剩余事件的音高、时点和各声部力度都保持一致。增加声部时合成响度也可能增加，因此先比较前景与连续性；这个16拍实验不是35分钟作品的缩编。'
      ],
      lessonIds:['u01-01','u09-03','u10-02','u11-04'],structure:true,excerptId:'fish-layer-returns'
    },
    {
      id:'fish-editions',heading:'4. 四个创作部分，为什么又会看到五轨',
      claim:'官方履历的四部分与2016再版目录的五个索引，描述的是不同层级。文件切轨不能代替曲式分析。',
      evidenceKind:'官方版本资料＋本站分析',evidence:['fish-official-history','fish-2016-index'],
      listen:[
        '先确认自己播放的是1996录音室作品、2016五轨再版，还是1998现场；记录文件与录音身份。',
        '让播放越过一个文件边界，再判断听觉上是否同时出现材料、织体或段落功能的变化。'
      ],
      explanation:[
        'Universal官方履历把1996年的LONG SEASON记为单曲目、四部分作品；2016年SHM-CD官方产品页则列出Long Season .1至.5五个索引。两个数字可以同时成立，因为它们不必在回答同一个问题。',
        '发行索引可以服务于检索和播放，乐段边界则需要结合材料、织体和段落作用来判断。边界有时重合，有时不同。因此，结构图使用四个创作部分，播放器则遵循用户实际文件；这里不猜五个切轨点与A、B、C、D之间的一一对应。',
        '同样，1998年12月28日现场也不能仅因标题相同，就直接套用录音室版本的编配或时间码。先写清版本，是为了让分析结论可以被同一段声音检验，而不是给听觉判断增加形式手续。'
      ],
      lessonIds:['u01-02','u11-01','u11-04']
    }
  ],
  structure:{
    title:'作者四部分结构谱：按声音状态辨认长程关系',
    caption:'据茂木欣一对谈整理。四列只表示先后，不按实际时长比例绘制；不是逐音总谱，也不声称所有声层在某段持续存在或完全消失。',
    columns:[
      {id:'A',title:'合奏',description:'前半集体演奏的状态。',listen:'先建立对集体声音与循环材料的记忆。',analysis:'为后来改变前景和回归建立参照。'},
      {id:'B',title:'鼓与打击',description:'作者描述为鼓与打击活跃的部分。',listen:'把注意转向打击的事件、密度与互动。',analysis:'前景的变化可以形成段落作用，不只依靠换和弦。'},
      {id:'C',title:'原声质地',description:'作者描述为acoustic的部分。',listen:'比较它与前面集体声响、打击前景的质地差别。',analysis:'另一种声音状态拓宽了接下来回归的对比。'},
      {id:'D',title:'合奏回归',description:'重新回到全体演奏的状态。',listen:'同时参考眼前声音与先前对合奏的记忆。',analysis:'回归感来自跨段关系；不能据此断言逐音复制A。'}
    ],
    indexContrast:true
  },
  excerpts:[
    {
      id:'fish-fixed-sequence',title:'原创对照一：原高重复与整体移位',identity:'本站原创对照谱',sourceIds:['fish-osaji'],
      locator:'用于解释钢琴循环与“模进”的术语区别；音高与节奏由本站新写，无原录音时间位置。',
      caption:'访谈支持循环材料的来源，不提供以下音名。两版第一小节相同；版本B把第二小节整体移高大二度，节奏与力度保持不变。',
      meter:'4/4',beatsPerBar:4,bars:2,barLabels:['原创第1小节','原创第2小节'],bpm:90,
      variants:[
        {id:'fixed',label:'A · 原高重复',description:'两小节均为同一个C—G—E—G—C—G—E—G音型。',identity:'本站原创',parts:[twoBarPart(cell)]},
        {id:'shifted',label:'B · 第二小节整体移高大二度',description:'第二小节改为D—A—F♯—A—D—A—F♯—A；其他节奏、时长和力度相同。',identity:'本站原创',parts:[twoBarPart(raisedCell)]}
      ]
    },
    {
      id:'fish-layer-returns',title:'原创对照二：相同材料，改变声层的进入与撤出',identity:'本站原创对照谱',sourceIds:['fish-osaji','fish-drummer-1997'],
      locator:'四小节原创实验，用来检验声音层次的结构作用；不对应原曲四段的音符、长度或具体配器。',
      caption:'三个声部的材料、事件时点与各自力度固定。A版四小节始终全奏；B版依次为合奏、打击、单层音型、合奏，仅删除指定声部的事件。',
      meter:'4/4',beatsPerBar:4,bars:4,barLabels:['原创第1小节','原创第2小节','原创第3小节','原创第4小节'],bpm:90,
      variants:[
        {id:'continuous',label:'A · 始终全奏',description:'音型、低音与打击在四小节中持续参与，作为对照参照。',identity:'本站原创',parts:ensembleParts()},
        {id:'withdraw-return',label:'B · 撤出、转移前景、再汇聚',description:'第2小节只保留打击，第3小节只保留音型，第4小节恢复三层；保留事件的位置和音高均不改变。',identity:'本站原创',parts:ensembleParts({piano:[0,2,3],bass:[0,3],drums:[0,1,3]})}
      ]
    }
  ],
  practice:{
    title:'为自己的四段短作品安排一次有依据的回归',
    instructions:[
      '先在自己的录音版本中找出四个声音地标，记录你实际听见的前景和变化；与成员描述不同的局部细分可以保留，但注明尺度和证据。',
      '试听两个原创对照谱，分别描述整体移位与声层撤出改变了什么；把听觉描述与谱面中真正改变的事件对应起来。',
      '用自己的短音型做一版持续合奏和一版撤出后回归的草稿。先固定音高材料、速度与声部力度，只改变声层参与；再说明还需要哪些变化才能把它扩展成更长的作品。'
    ],
    criteria:[
      '明确写出录音版本，并区分作者证言、自己的听觉观察与分析解释。',
      '能用谱例指出重复、整体移位或声层出入的实际变量，不把本站原创谱称为Fishmans转写。',
      '能解释回归前的对比如何起作用，同时说明四小节模型没有覆盖原作的长程发展。'
    ]
  },
  takeaways:[
    '反复材料可以建立参照，变化则发生在与它同时或先后活动的其他层次。',
    '固定音序不等于音高模进；共同拍点也不要求各声部每次同时起音。',
    '声音层次、密度与记忆关系可以承担结构；合奏回归不自动等于逐音再现。',
    '四个创作部分与五个发行索引属于不同层级，分析必须回到具体版本与声音证据。'
  ]
};
