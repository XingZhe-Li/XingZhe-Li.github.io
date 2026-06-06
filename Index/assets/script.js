document.addEventListener('DOMContentLoaded',()=>{
    document.querySelector('.panel > .close').addEventListener('click',popoutClose)
    document.querySelector('.title').addEventListener('click',switchIndex)
    document.querySelector('.input').addEventListener('input',debounceInput)
    document.querySelector('.popout').addEventListener('click',clickOutSideHide)
    document.addEventListener('keydown',captureKeydown)
    renderAll()
})

globalConfig = {
    'use_regex' : true, // Otherwise use string pattern matching
    'use_highlight' : true
}

index = [
    {
        title:'Software Index',
        lst:null,
        url:'./json/Softwares.json'
    },
    {
        title:'Framework Index',
        lst:null,
        url:'./json/Frameworks.json'
    }
]
index_ptr   = 0

debounceCounter = 0 

function clickOutSideHide(e){
    if (e.target == e.currentTarget){
        popoutClose()
    }
}

function captureKeydown(e){
    switch (e.keyCode) {
        case 27:
            popoutClose()
            break;
        default:
            return;
    }
}

// Splits text by regex matches and returns a DocumentFragment with mixed text/highlight nodes
function highlightText(text, regex) {
    let frag = document.createDocumentFragment()
    let lastIndex = 0
    for (let match of text.matchAll(regex)) {
        if (match.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
        let hl = document.createElement('span')
        hl.className = 'highlight'
        hl.textContent = match[0]
        frag.appendChild(hl)
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)))
    return frag
}

function filter(keyword, lst){
    keyword = keyword.toLowerCase()
    let result = []

    if (keyword === ''){
        for (let key in lst) {
            let entry = lst[key]
            result.push({key, des: entry.des, lnk: entry.lnk, rating: 0, regex: null})
        }
        return result
    }

    let regex = null
    let useSimple = !globalConfig.use_regex
    if (!useSimple) {
        try { regex = new RegExp(keyword, 'gi') } catch { useSimple = true }
    }

    for (let key in lst) {
        let entry = lst[key]
        let des = entry.des

        if (useSimple) {
            if (key.toLowerCase().includes(keyword) || des.toLowerCase().includes(keyword)) {
                result.push({key, des, lnk: entry.lnk, rating: 0, regex: null})
            }
            continue
        }

        // Regex mode — test once
        if (!regex.test(key) && !regex.test(des)) continue

        if (!globalConfig.use_highlight) {
            result.push({key, des, lnk: entry.lnk, rating: 0, regex: null})
            continue
        }

        // Score: exact match on key = 1000, +5 per key match, +1 per des match
        regex.lastIndex = 0
        let keyMatches = key.match(regex)
        regex.lastIndex = 0
        let desMatches = des.match(regex)
        let rating = (keyMatches && keyMatches[0] === key) ? 1000 : 0
        if (keyMatches) rating += keyMatches.length * 5
        if (desMatches) rating += desMatches.length

        result.push({key, des, lnk: entry.lnk, rating, regex})
    }

    if (globalConfig.use_highlight && globalConfig.use_regex && result.length > 1) {
        result.sort((a, b) => b.rating - a.rating)
    }

    return result
}

function debounceInput(){
    debounceCounter ++;
    setTimeout(()=>{
        debounceCounter --;
        if (debounceCounter == 0){
            renderAll()
        }
    },100)
}

async function renderAll(){
    let etitle = document.querySelector('.title')
    etitle.textContent = index[index_ptr].title
    let lst = await fetchLst();
    let keyword = document.querySelector('.input').value;
    renderList(filter(keyword,lst));
}

function switchIndex(){
    index_ptr = (index_ptr+1)%2;
    renderAll()
}

async function fetchLst(){
    if (index[index_ptr].lst!=null){
        return index[index_ptr].lst
    }
    let jsoned = await (await fetch(index[index_ptr].url)).json()
    index[index_ptr].lst = jsoned
    return jsoned
}

function popout(name, descript, lnks){
    let ename = document.querySelector('.panel > .key')
    ename.textContent = name
    let edes  = document.querySelector('.panel > .descript')
    edes.textContent  = descript

    let elnklist = document.querySelector('.lnk-list')
    // Remove all .lnk children
    for (let elnk of elnklist.querySelectorAll(':scope > .lnk')) {
        elnk.remove()
    }

    let frag = document.createDocumentFragment()
    for (let lnk of lnks){
        let elnk = document.createElement('div')
        elnk.className = 'lnk'
        elnk.textContent = lnk
        elnk.addEventListener('click', () => window.open(lnk))
        frag.appendChild(elnk)
    }
    elnklist.appendChild(frag)

    document.querySelector('.popout').classList.add('show')
}

function popoutClose(){
    let epopout = document.querySelector('.popout');
    epopout.classList.remove('show');
}

const CHUNK_SIZE = 30

function renderItem(item) {
    let eitem = document.createElement('div')
    eitem.className = 'item'
    eitem.addEventListener('click', () => popout(item.key, item.des, item.lnk))
    let ekey = document.createElement('div')
    ekey.className = 'key'
    let edes = document.createElement('div')
    edes.className = 'descript'

    if (item.regex && globalConfig.use_highlight) {
        // Clone regex for independence (matchAll advances lastIndex)
        let re = new RegExp(item.regex.source, item.regex.flags)
        ekey.appendChild(highlightText(item.key, re))
        re.lastIndex = 0
        edes.appendChild(highlightText(item.des, re))
    } else {
        ekey.textContent = item.key
        edes.textContent = item.des
    }

    eitem.appendChild(ekey)
    eitem.appendChild(edes)
    return eitem
}

let renderCancel = null

function renderList(lst) {
    // Cancel any in-progress chunked render
    if (renderCancel) {
        cancelAnimationFrame(renderCancel)
        renderCancel = null
    }

    let elst = document.querySelector('.list')
    elst.innerHTML = ''

    if (lst.length === 0) return

    let i = 0
    function renderChunk() {
        let frag = document.createDocumentFragment()
        let end = Math.min(i + CHUNK_SIZE, lst.length)
        for (; i < end; i++) {
            frag.appendChild(renderItem(lst[i]))
        }
        elst.appendChild(frag)
        if (i < lst.length) {
            renderCancel = requestAnimationFrame(renderChunk)
        }
    }
    renderCancel = requestAnimationFrame(renderChunk)
}