LazyUI = {
    ID:0,
    thisTimeFound:false,
    version:'0.0.2.1',
    elements:{},
    createFrag(HTMLcontent){
        return document.createRange().createContextualFragment(HTMLcontent)
    },
    runInits(){
        for (let element in LazyUI.elements){
            if ('init' in LazyUI.elements[element]){
                LazyUI.elements[element].init()
            }
        }
    },
    getAttrs(object){
        let attrs = {}
        for (let i of object.attributes){
            attrs[i.name] = i.value
        }
        return attrs
    },
    replace(origin,target){
        origin.parentNode.replaceChild(target,origin)
    },
    render(root){
        LazyUI.thisTimeFound = false
        let dict = {}
        let childBinds = []
        let deepScan = (root,dict) => {
            for (let child of root.childNodes){
                deepScan(child,dict)
                if (child.tagName=='LAZYUI'){
                    let attrs = LazyUI.getAttrs(child)
                    if (attrs['template'] in LazyUI.elements){
                        if ('template' in LazyUI.elements[attrs['template']]){
                            let inner = child.innerHTML
                            let content = LazyUI.elements[attrs['template']].template(`LAZYID-${LazyUI.ID}`,inner,attrs)
                            let Fragment = LazyUI.createFrag(content)
                            let idcache = LazyUI.ID // For Closure
                            LazyUI.replace(child,Fragment)
                            let binder=()=>{
                                if('bind' in LazyUI.elements[attrs['template']]){
                                    let obj = LazyUI.elements[attrs['template']].bind(`LAZYID-${idcache}`,inner,attrs)
                                    if ('id' in attrs){
                                        dict[attrs.id] = obj
                                    }
                                }
                            }
                            childBinds.push(binder)
                            LazyUI.ID++
                        }else{
                            child.remove()
                        }
                    }else{
                        child.remove()
                    }
                    LazyUI.thisTimeFound = true
                }
            }

        }
        deepScan(root,dict)
        while(LazyUI.thisTimeFound){
            LazyUI.thisTimeFound = false
            deepScan(root,dict)
        }
        for(let binder of childBinds){
            binder()
        }
        return dict
    },
    createEvent(){
        let EventObj = {
            events:{},
            bind(name,func){
                if (name in this.events){
                    this.events[name].push(func)
                }else{
                    this.events[name] = [func]
                }
            },
            call(name,props){
                if (name in this.events){
                    for (let f of this.events[name]){
                        f(props)
                    }
                }
            },
            clear(name){
                this.events[name] = undefined
            }
        }
        return EventObj
    }
}
LazyUI.gEvent = LazyUI.createEvent()