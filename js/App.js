// Feito por: Jonathan Szablevski (Nº matrícula: 0134469), Márcio Metz (Nº matrícula: 0135682). Feevale 2014.

var App={
    
    data:{
        states:[],
        transitions:[],
        zIndexState:0
    },
    html:{},
    modes:{
        drag:0,
        trans:1,
        run:2
    },
    
    setMode:function(s){
        switch(this.data.mode){
            case this.modes.drag:
                this.automaton.setDrags(false);
            break;
            case this.modes.trans:
                this.transitionManager.dismount();
            break;
            case this.modes.run:
                this.automaton.dismount();
            break;
        }
        
        this.data.mode=s;
        
        switch(this.data.mode){
            case this.modes.drag:
                this.automaton.setDrags(true);
            break;
            case this.modes.trans:
                this.transitionManager.prepare();
            break;
            case this.modes.run:
                this.automaton.execute();
            break;
        }
        
        return this;
    },
    
    models:{
        Circle:function(){
            this.getSize=function(){
                return this.size=Jesm.Cross.offsetSize(this.el);
            };
            this.getPos=function(){
                return this.pos=Jesm.Cross.offset(this.el);
            };
            this.setPosition=function(pos){
                var size=this.getSize();
                for(var c=['left', 'top'], x=2;x--;this.el.style[c[x]]=(pos[x]-size[x]/2).toFixed(2)+'px');
                return this;
            };
            this.getCenterPosition=function(){
                var pos=this.getPos(), size=this.getSize(), ret=[];
                for(var x=2;x--;ret[x]=pos[x]+size[x]/2);
                return ret;
            };
        },
        State:function(app, e, name){            
            this.name=name;
            this.transIn=[];
            this.transOut={};
            this.isInitial=false;
            this.isFinal=false;
            
            this.addTransIn=function(t){
                this.transIn.push(t);
            };
            this.addTransOut=function(t){
                if(this.transOut[t.str])
                    this.transOut[t.str].delete();
                this.transOut[t.str]=t;
            };
            this.removeTransIn=function(t){
                this.transIn.removeIfExists(t);
            };
            this.removeTransOut=function(t){
                delete this.transOut[t.str];
            };
            
            this.rename=function(){
                var name=prompt('Digite o nome do estado:', this.name);
                if(name!=null)
                    this.el.innerHTML=this.name=name;
            };
            this.delete=function(){
                this.drag.drop();
                this.el.del();
                for(var arr=this.transIn.slice(), len=arr.length;len--;arr[len].delete());
                for(var k in this.transOut)
                    this.transOut[k].delete();                       
                app.automaton.delState(this);
                this.removeAsInitialDirectly().removeAsFinal();
            };
            
            this.setAsInitial=function(){
                if(this.isInitial)
                    return;                
                this.isInitial=true;
                this.el.classList.add('initial');
                app.automaton.setInitialSate(this);
            };
            this.removeAsInitial=function(){
                this.isInitial=false;
                this.el.classList.remove('initial');
            };
            this.removeAsInitialDirectly=function(){
                if(this.isInitial){
                    this.removeAsInitial();
                    app.automaton.removeInitialState();
                }
                return this;
            };
            this.setAsFinal=function(){
                if(this.isFinal)
                    return;
                this.isFinal=true;
                this.el.classList.add('final');
                app.automaton.addFinalSate(this);
            };
            this.removeAsFinal=function(){
                if(this.isFinal){
                    this.isFinal=false;
                    this.el.classList.remove('final');
                    app.automaton.removeFinalSate(this);
                }
                return this;
            };
            
            this.selected=function(b){
                this.el.classList[b?'add':'remove']('selected');
                return this;
            };
            
            this.contextMenu=function(){
                if(App.data.mode!=App.modes.drag)
                    return null;
                
                var ret={'Renomear':this.rename};
                this.isInitial?ret['Remover como inicial']=this.removeAsInitialDirectly:ret['Definir como inicial']=this.setAsInitial;
                this.isFinal?ret['Remover como final']=this.removeAsFinal:ret['Definir como final']=this.setAsFinal;
                ret['Deletar estado']=this.delete;
                return ret;
            };
            
            var main=app.html.main;
            this.el=Jesm.el('div', 'class=state', main, name);
            this.drag=new Jesm.Drag(this.el, null, main);
            this.drag.ativo=!app.data.mode;
            this.setPosition(Jesm.Cross.getMouse(e));
            
            app.contextMenu.addTo(this.el, this);
            
            Jesm.addEvento(this.el, 'click', function(e){
                if(app.data.mode==app.modes.trans)
                    app.transitionManager.setState(this, e);
            }, this);
        },
        Transition:function(from, to, str, app){
            this.str=str;
            this.stateFrom=from;
            this.stateTo=to;
            
            this.delete=function(){
                this.stateFrom.removeTransOut(this);
                this.stateTo.removeTransIn(this);
                app.transitionManager.delTransition(this);
                this.drag.drop();
                this.el.del();
            };            
            this.contextMenu=function(){
                if(App.data.mode!=App.modes.run)
                    return {'Deletar transição':this.delete};
            };
            
            to.addTransIn(this);
            from.addTransOut(this);
            
            this.el=Jesm.el('div', 'class=transition', app.html.main, str);            
            this.drag=new Jesm.Drag(this.el, null, app.html.main);
            
            var pos=[];
            for(var p1=from.getCenterPosition(), p2=to.getCenterPosition(), x=2;x--;pos[x]=(p1[x]+p2[x])/2);
            this.setPosition(pos);
            
            app.contextMenu.addTo(this.el, this);
        },
        Reader:function(app, col, line, pos){
            this.startCol=col;
            this.startLine=line;
            this.startPos=pos;
            
            var state=app.automaton.initialState;
            
            this.read=function(c){
                if(state.transOut[c]){
                    state=state.transOut[c].stateTo;
                    if(state.isFinal)
                        this.sucess=true;
                    return state.isFinal;
                }
                return true;
            };
        }
    },
    
    transitionManager:{
        setState:function(s, e){
            if(this.app.data.mode!=this.app.modes.trans)
                return;
            if(this.selected){
                s.selected(true);
                var label='Defina o símbolo responsável pela transição:', tecla='';
                do{
                    tecla=prompt(label, tecla)||'';
                    str='Símbolo inválido! Insira novamente:';
                }while(tecla.length!=1);
                s.selected(false);
                
                var novo=new this.app.models.Transition(this.selected, s, tecla, this.app);
                this.transitions.push(novo);
                this.setStateAux2();
            }
            else{
                this.selected=s.selected(true);
                this.setStateAux1(e);
                this.idEv=Jesm.addEvento(window, 'mousemove', this.setStateAux1, this, true);
            }
        },
        setStateAux1:function(e){
            this.mousePos=Jesm.Cross.getMouse(e);
        },
        setStateAux2:function(){
            if(this.selected)
                this.selected.selected(false);                
            this.selected=null;
            Jesm.delEvento(this.idEv);            
        },
        delTransition:function(t){
            this.transitions.removeIfExists(t);
        },
        drawLines:function(){
            var c=this.canvasCtxt, inn=Jesm.Cross.inner();
            for(var dim=['width', 'height'], x=2;x--;this.html.canvas[dim[x]]=inn[x]);            
            c.clearRect(0, 0, inn[0], inn[1]);
            if(this.selected){
                c.lineWidth=2;
                c.strokeStyle='#F00';
                this.drawLine(this.selected.getCenterPosition(), this.mousePos);
            }
            for(var len=this.transitions.length;len--;){
                var t=this.transitions[len], pos=t.getCenterPosition();
                c.lineWidth=4;
                c.strokeStyle='#FFF';
                this.drawLine(t.stateFrom.getCenterPosition(), pos);
                c.lineWidth=3;
                c.strokeStyle='#AAA';
                this.drawLine(pos, t.stateTo.getCenterPosition());
                this.drawLimitCircle(t);
            }
        },
        drawLine:function(from, to){
            var c=this.canvasCtxt;
            c.beginPath();
            c.moveTo(from[0], from[1]);
            c.lineTo(to[0], to[1]);
            c.closePath();
            c.stroke();
        },
        prepare:function(){            
            this.app.html.main.classList.add('trans');
        },
        dismount:function(){
            this.app.html.main.classList.remove('trans');
            this.setStateAux2();
        },
        drawLimitCircle:function(t){
            var pos=[], sub=[], dis=0, f=t.stateFrom, ct=t.getCenterPosition(), cf=f.getCenterPosition();
            for(var x=2;x--;){
                pos[x]=cf[x];
                sub[x]=ct[x]-cf[x];
                dis+=Math.pow(sub[x], 2);
            }
            var disPoints=Math.sqrt(dis), c=this.canvasCtxt;
            for(var x=2;x--;){
                var r=sub[x]/disPoints;
                pos[x]+=(f.size[x]/2-3)*r;
            }
            c.fillStyle='#FFF';
            c.beginPath();            
            c.arc(pos[0], pos[1], 8, 0, Math.PI*2, 1);
            c.closePath();
            c.fill();
        },
        drawArrow:function(t){
            var pos=[], sub=[], dis=0, f=t.stateTo, ct=t.getCenterPosition(), cf=f.getCenterPosition();
            for(var x=2;x--;){
                pos[x]=cf[x];
                sub[x]=ct[x]-cf[x];
                dis+=Math.pow(sub[x], 2);
            }
            var disPoints=Math.sqrt(dis), c=this.canvasCtxt;
            for(var x=2;x--;){
                var r=sub[x]/disPoints;
                pos[x]+=(f.size[x]/2)*r;
            }
            
            c.beginPath();
            c.moveTo(pos[0], pos[1]);
            this.calc.t1=[];
            this.lineTo(pos, sub, 22.5, 20);
            this.lineTo(pos, sub, -22.5, 20);
            c.lineTo(pos[0], pos[1]);
            c.closePath();
            c.fillStyle='#FFF';
            c.fill();
        },
        lineTo:function(pos, sub, add, larg){
            var ca=sub[1]/sub[0],
            ang=this.calc.coeToDeg(ca);
            ang+=add;
            var novoCoeAng=this.calc.degToCoe(ang),
            p=this.calc.getPointIn(novoCoeAng, larg, pos, sub);            
            this.canvasCtxt.lineTo(p[0], p[1]);            
        },
        calc:{
            coeToDeg:function(a){
                var ret=Math.atan(a)/Math.PI*180;
//                if(ret<0)
//                    ret+=180;
                return ret;
            },
            degToCoe:function(a){
                return Math.tan(a/180*Math.PI);
            },
            getPointIn:function(c, dis, pos, dir){
                c=Math.abs(c);
                var ret=[];
                for(var x=2;x--;){
                    var d=dis, coe=c;
//                    if(this.getSinal(dir[0])!=this.getSinal(dir[1]))
//                        coe*=-1;
                    d*=this.getSinal(dir[x]);
                    var aux=Math[x?'cos':'sin'](Math.atan(coe))*d;
                    ret[x]=x?(aux*coe)+pos[1]:(aux/coe)+pos[0];
                    if(x)
                        this.t1.push([Math[x?'cos':'sin'](Math.atan(coe)), d, aux, ret[x]]);
                }
                return ret;
            },
            getSinal:function(num){
                return num<0?-1:1;
            },
            t:function(){
                console.dir(this.t1);
            }
        },
        setup:function(app){
            this.app=app;
            this.transitions=[];
            this.html={
                canvas:pega('canvas', 0)  
            };
            this.canvasCtxt=this.html.canvas.getContext('2d');
            Jesm.Core.animator.addTarefa(this.drawLines, this);
        }
    },
    
    automaton:{
        addState:function(e){
            var name=prompt('Digite o nome do estado:');
            if(name!=null)
                this.states.push(new this.app.models.State(this.app, e, name));
        },
        delState:function(s){
            this.states.removeIfExists(s);
        },
        setInitialSate:function(s){
            if(this.initialState)
                this.initialState.removeAsInitial();
            this.initialState=s;
        },
        removeInitialState:function(){
            this.initialState=null;
        },
        addFinalSate:function(s){
            this.finalStates.push(s);
        },
        removeFinalSate:function(s){
            this.finalStates.removeIfExists(s);
        },
        
        
        verify:function(){
            if(this.app.data.mode!=this.app.modes.run)
                this.app.setMode(his.app.modes.run);
        },
        execute:function(){
            if(!this.initialState)
                return this.app.console.error('Você precisa selecionar um estado inicial!');
            if(!this.finalStates.length)
                return this.app.console.error('Você precisa selecionar ao menos um estado final!');
            
            this.app.console.log('Iniciando leitura.');
            var readers=[], matches=[], txt=this.textarea.html.el.value;
            for(var x=0, len=txt.length, col=1, line=1;x<len;x++, col++){
                var c=txt.charAt(x);
                if(c=='\n'){
                    col=0;
                    line++;
                    continue;
                }
                var n=new this.app.models.Reader(this.app, col, line, x);
                readers.push(n);
                for(var l=readers.length;l--;){
                    var r=readers[l];
                    if(r.read(c)){
                        if(r.sucess){
                            r.finalPos=x;
                            matches.push(r);
                        }
                        readers.splice(l, 1);
                    }
                }
            }
            this.app.console.log('Fim da leitura.');
            var len=matches.length;
            this.app.console.log('Palavra: '+len+' ocorrência'+(len!=1?'s':'')+'.');
            for(var x=0;x<len;x++){
                var r=matches[x], w=txt.slice(r.startPos, 1+r.finalPos);
                this.app.console.sucess('Palavra "'+w+'" encontrada em ('+r.startLine+', '+r.startCol+')');
            }
            //this.app.setMode(this.app.modes.move);
        },   
        dismount:function(){
        },
        
        setDrags:function(bol){
            for(var len=this.states.length;len--;this.states[len].drag.ativo=bol);
        },
        
        textarea:{
            html:{},
            readFile:function(){
                var input=this.html.input;
                if(input.files){
                    var THIS=this, fr=new FileReader();
                    fr.onload=function(e){
                        THIS.html.el.value=e.target.result;
                    };
                    fr.readAsText(input.files[0]);
                }
            }
        },
    
        contextMenu:function(){
            if(App.data.mode==App.modes.drag){
                return {'Adicionar estado':function(e){
                    this.addState(e);
                }};
            }
        },        
        setup:function(app){
            this.app=app;
            this.states=[];
            this.initialState=null;
            this.finalStates=[];

            var div=pega('#text_edit');
            this.textarea.html={
                el:div.pega('textarea', 0),
                input:div.pega('input', 0)
            };
            Jesm.addEvento(div.pega('button', 0), 'click', function(){
                this.textarea.html.input.click();
            }, this);
            Jesm.addEvento(this.textarea.html.input, 'change', this.textarea.readFile, this.textarea);
        }
    },
    
    console:{        
        insert:function(str, c){
            var d=new Date(), z=this.insertAux;
            str='<span>'+([z(d, 'Hours'), z(d, 'Minutes'), z(d, 'Seconds'), z(d, 'Milliseconds', 3)]).join(':')+'</span>'+(str||'');
            Jesm.el('li', 'class='+(c||''), this.html.ul, str).scrollIntoView();
        },
        insertAux:function(d, cmd, num){
            return ('00'+d['get'+cmd]()).slice(-(num||2));
        },
        
        log:function(str){
            this.insert(str);
        },        
        sucess:function(str){
            this.insert(str, 'sucess');
        },        
        error:function(str){
            this.insert(str, 'error');
        },        
        clear:function(){
            this.html.ul.innerHTML='';
        },
        
        setup:function(app){
            var div=pega('#console'), clearButton=div.pega('button', 0);
            
            this.html={
                ul:div.pega('ul', 0)
            };
            Jesm.addEvento(clearButton, 'click', function(){
                this.clear();
            }, this); 
        }
    },
    contextMenu:{        
        addTo:function(el, obj){
            Jesm.addEvento(el, 'contextmenu', function(e){
                this.open(e, obj);
                e.preventDefault();
                e.stopPropagation();
            }, this);
        },
        
        open:function(e, obj){
            var opt=obj.contextMenu();
            if(!opt)
                return;
            this.html.ul.innerHTML='';
            var THIS=this, frag=document.createDocumentFragment();
            for(var k in opt){
                (function(str){
                    var a=Jesm.el('a', 'href=javascript:void(0)', Jesm.el('li', null, frag), str);
                    Jesm.addEvento(a, 'click', function(e){
                        THIS.close();
                        opt[str].call(obj, e);
                    }, obj);
                })(k);
            }
            this.html.ul.appendChild(frag);
            
            var div=this.html.div, ms=Jesm.Cross.getMouse(e);
            Jesm.css(div, 'left:'+ms[0]+'px;top:'+ms[1]+'px');
            div.classList.add('active');
            
            // fazer codigo para realocar contexto
        },        
        close:function(){
            this.html.div.classList.remove('active');
            this.html.ul.innerHTML='';
        },
        
        setup:function(app){
            var div=Jesm.el('div', 'id=context_menu', app.html.main);
            this.html={
                div:div,
                ul:Jesm.el('ul', null, div)
            };
            Jesm.addEvento(div, 'mousedown', function(e){
                e.stopPropagation();
            }, this);
            Jesm.addEvento(document.documentElement, 'mousedown', function(){
                this.close();
            }, this);        
            Jesm.addEvento(document.documentElement, 'contextmenu', function(e){
                e.preventDefault();
                e.stopPropagation();
            });
            
            return this;
        }
    },
    
    setup:function(){
        Array.prototype.removeIfExists=function(t){
            var index=this.indexOf(t);
            if(index>-1)
                this.splice(index, 1);
        };
        
        // Realiza a herança
        var m=this.models, t=new m.Circle();
        for(var k in t)
            m.State.prototype[k]=m.Transition.prototype[k]=t[k];
        
        this.html={
            main:pega('main', 0)
        };
        
        this.contextMenu.setup(this).addTo(this.html.main, this.automaton);
        this.console.setup(this);       
        this.automaton.setup(this);
        this.transitionManager.setup(this);
       
       var nav=pega('nav', 0),
       frag=document.createDocumentFragment(),
       itensNav={
           move:function(){
               this.setMode(this.modes.drag);
           },
           trans:function(){
               this.setMode(this.modes.trans);
           },
           run:function(){
               this.setMode(this.modes.run);
           }
       },
       s;
       for(var k in itensNav){
           (function(key){
               var a=Jesm.el('a', 'href=javascript:void(0);class='+key, frag);
               Jesm.addEvento(a, 'click', function(){
                   itensNav[key].call(this);
                   if(s)
                       s.classList.remove('selected');
                   s=a;
                   a.classList.add('selected');
               }, App);
           })(k);
       }
       frag.children[0].click();
       nav.pega('div', 0).appendChild(frag);
    }
};