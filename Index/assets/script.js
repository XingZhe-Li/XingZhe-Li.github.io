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

function renderHighlight(scope){
    let ekeys = scope.querySelectorAll('.key')
    let edes  = scope.querySelectorAll('.descript')

    for (let toRep of [ekeys,edes]){
        for (let node of toRep){
            let content = node.textContent
            for (let childNode of node.childNodes){
                childNode.remove()
            }
            let lastIndex = 0
            for (let matchArray of content.matchAll(/<HighLight>(.*?)<\/HighLight>/g)){
                node.appendChild(document.createTextNode(content.slice(lastIndex,matchArray.index)))
                let highlightElement = document.createElement('div')
                highlightElement.classList.add('highlight')
                highlightElement.textContent = matchArray[1]
                node.appendChild(highlightElement)
                lastIndex = matchArray.index + matchArray[0].length
            }
            node.appendChild(document.createTextNode(content.slice(lastIndex)))
        }
    }
}

function filter(keyword,lst){
    keyword = keyword.toLowerCase();
    let result = []
    if (keyword == ''){
        for (let key in lst){
            result.push([key,lst[key].des,lst[key].lnk])
        }
        return result
    }
    for (let key in lst){
        if (globalConfig['use_regex']){
            if (key.toLowerCase().search(RegExp(keyword,'gi'))!=-1 ||lst[key].des.toLowerCase().search(RegExp(keyword,'gi'))!=-1){
                if (globalConfig['use_highlight']){
                    let matchObj = key.match(RegExp(keyword,'gi'))
                    let rating = (matchObj && matchObj[0] == key) ? 1000 : 0
                    rating += [...key.matchAll(RegExp(keyword,'gi'))].length * 5 
                    rating += [...lst[key]['des'].matchAll(RegExp(keyword,'gi'))].length
                    let repkey = key.replaceAll(RegExp(keyword,'gi'),'<HighLight>$&</HighLight>')
                    let repdes = lst[key]['des'].replaceAll(RegExp(keyword,'gi'),'<HighLight>$&</HighLight>')
                    result.push([repkey,repdes,lst[key].lnk,rating])
                }else{
                    result.push([key,lst[key].des,lst[key].lnk])
                }
            }
        }else{
            if (key.toLowerCase().indexOf(keyword)!=-1 ||lst[key].des.toLowerCase().indexOf(keyword)!=-1){
                result.push([key,lst[key].des,lst[key].lnk])
            }
        }
    }

    if (result.length > 0 && result[0].length == 4){
        result.sort((a,b)=>{
            return b[3] - a[3]
        })
    }
    console.log(result)

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

function popout(name,descript,lnks){
    let ename = document.querySelector('.panel > .key');
    ename.textContent = name;
    let edes  = document.querySelector('.panel > .descript');    
    edes.textContent  = descript;
    let elnks = document.querySelectorAll('.lnk-list > .lnk')
    for (let elnk of elnks){
        elnk.remove()
    }
    let elnklist = document.querySelector('.lnk-list')
    let frag = document.createDocumentFragment()
    for (let lnk of lnks){
        let list_item = document.createElement('div')
        list_item.classList.add('lnk')
        list_item.textContent = lnk
        list_item.addEventListener('click',()=>{
            window.open(lnk)
        })
        frag.appendChild(list_item)
    }
    
    elnklist.appendChild(frag)
    let epopout = document.querySelector('.popout');
    if (globalConfig['use_highlight']){
        renderHighlight(epopout)
    }
    epopout.classList.add('show');

}

function popoutClose(){
    let epopout = document.querySelector('.popout');
    epopout.classList.remove('show');
}

function renderList(lst){

    let frag = document.createDocumentFragment()
    for (let [key,des,lnk] of lst){
        let eitem = document.createElement('div')
        eitem.classList.add('item')
        eitem.addEventListener('click',()=>{
            popout(key,des,lnk)
        })
        let ekey  = document.createElement('div')
        ekey.classList.add('key')
        ekey.textContent = key
        let edescript = document.createElement('div')
        edescript.classList.add('descript')
        edescript.textContent = des

        eitem.appendChild(ekey)
        eitem.appendChild(edescript)
        frag.append(eitem)
    }

    let elst = document.querySelector('.list')
    for (let child of document.querySelectorAll('.list > .item')){
        child.remove()
    }
    
    if (globalConfig['use_highlight']){
        renderHighlight(frag)
    }
    elst.appendChild(frag)
}