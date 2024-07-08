document.addEventListener('DOMContentLoaded',()=>{
    document.querySelector('.panel > .close').addEventListener('click',popoutClose)
    document.querySelector('.title').addEventListener('click',switchIndex)
    document.querySelector('.input').addEventListener('input',renderAll)
    renderAll()
})

index = [
    {
        title:'Software Index',
        lst:[],
        url:'./json/Softwares.json'
    },
    {
        title:'Framework Index',
        lst:[],
        url:'./json/Frameworks.json'
    }
]
index_ptr   = 0

function filter(keyword,lst){
    keyword = keyword.toLowerCase();
    let result = {}
    for (let key in lst){
        if (key.toLowerCase().indexOf(keyword)!=-1 ||lst[key].des.toLowerCase().indexOf(keyword)!=-1){
            result[key] = lst[key]
        }
    }
    return result
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
    if (index[index_ptr].lst.length!=0){
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
    epopout.classList.add('show');
}

function popoutClose(){
    let epopout = document.querySelector('.popout');
    epopout.classList.remove('show');
}

function renderList(lst){

    let frag = document.createDocumentFragment()
    for (let key in lst){
        let eitem = document.createElement('div')
        eitem.classList.add('item')
        eitem.addEventListener('click',()=>{
            popout(key,lst[key].des,lst[key].lnk)
        })
        let ekey  = document.createElement('div')
        ekey.classList.add('key')
        ekey.textContent = key
        let edescript = document.createElement('div')
        edescript.classList.add('descript')
        edescript.textContent = lst[key]['des']

        eitem.appendChild(ekey)
        eitem.appendChild(edescript)
        frag.append(eitem)
    }

    let elst = document.querySelector('.list')
    for (let child of document.querySelectorAll('.list > .item')){
        child.remove()
    }

    elst.appendChild(frag)
}