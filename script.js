// La iconografía es un conjunto de SVG propios; ningún emoji depende de fuentes del SO.
    const GLYPH_MAP = {"🔢":"digits","🟩":"seed","🟦":"mirror","🟪":"clock","💗":"heart","🟨":"wild","🌈":"rainbow","💣":"bomb","☠️":"skull","🧊":"ice","🌟":"miracle","🎲":"dice","🧽":"eraser","🧯":"defuse","🐷":"pig","🍀":"clover","🧲":"magnet","🛟":"life","🔮":"prism","🏦":"bank","🥇":"medal","🥈":"medal","🥉":"medal","🔥":"fire","💥":"burst","🏆":"trophy","📦":"box","🎵":"music","🔊":"volume","🔇":"mute","⭐":"star","🎮":"gamepad","👤":"user","🏁":"flag","📋":"clipboard","✨":"sparkle","♻️":"recycle","🔒":"lock","✅":"check","⚙️":"gear","🔄":"refresh","💔":"broken","⚠️":"warning","⏸️":"pause","⏸":"pause","▶":"play","📤":"share","❔":"help","🛒":"shop","🪙":"coin","🌱":"seed","💸":"coin","💀":"skull","⚡":"burst","↩️":"back","💎":"gem","✖":"cross","😎":"cool","⏳":"hourglass","🃏":"wild","↻":"refresh","⌂":"home"};
    const GLYPH_REGEX = new RegExp(Object.keys(GLYPH_MAP)
      .sort((a,b)=>b.length-a.length)
      .map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
    const SVG_NS = 'http://www.w3.org/2000/svg';
    function makeGlyph(name){
      const svg=document.createElementNS(SVG_NS,'svg');
      svg.setAttribute('class','ui-glyph');
      svg.setAttribute('aria-hidden','true');
      svg.setAttribute('focusable','false');
      const use=document.createElementNS(SVG_NS,'use');
      use.setAttribute('href','#glyph-'+name);
      svg.appendChild(use);
      return svg;
    }
    function replaceGlyphsInText(textNode){
      if(!textNode?.nodeValue)return;
      const value=textNode.nodeValue;
      GLYPH_REGEX.lastIndex=0;
      const matches=[...value.matchAll(GLYPH_REGEX)];
      if(!matches.length)return;
      const fragment=document.createDocumentFragment();
      let previous=0;
      for(const hit of matches){
        if(hit.index>previous)fragment.appendChild(document.createTextNode(value.slice(previous,hit.index)));
        fragment.appendChild(makeGlyph(GLYPH_MAP[hit[0]]));
        previous=hit.index+hit[0].length;
      }
      if(previous<value.length)fragment.appendChild(document.createTextNode(value.slice(previous)));
      textNode.replaceWith(fragment);
    }
    function applyGlyphs(root){
      if(root.nodeType===Node.TEXT_NODE){
        if(!root.parentElement?.closest('svg,script,style,textarea'))replaceGlyphsInText(root);
        return;
      }
      if(root.nodeType!==Node.ELEMENT_NODE||root.closest('svg,script,style,textarea'))return;
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      const nodes=[];
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(!node.parentElement?.closest('svg,script,style,textarea'))nodes.push(node);
      }
      nodes.forEach(replaceGlyphsInText);
    }
    applyGlyphs(document.body);
    const glyphObserver=new MutationObserver(changes=>{
      for(const change of changes){
        if(change.type==='characterData')applyGlyphs(change.target);
        else for(const node of change.addedNodes)applyGlyphs(node);
      }
    });
    glyphObserver.observe(document.body,{childList:true,characterData:true,subtree:true});

    'use strict';
    // ================================================
    // Configuración: cambia aquí probabilidades y poderes
    // ================================================
    const TYPES = {
      normal:  {icon:'🔢', name:'Normal', color:'text-slate-100', weight:43},
      green:   {icon:'🟩', name:'Semilla', color:'text-green-300', weight:18},
      blue:    {icon:'🟦', name:'Espejo', color:'text-sky-300', weight:12},
      purple:  {icon:'🟪', name:'Reloj +12s', color:'text-violet-300', weight:9},
      pink:    {icon:'💗', name:'Corazón +3🪙', color:'text-pink-300', weight:8},
      gold:    {icon:'🟨', name:'Comodín', color:'text-yellow-300', weight:7},
      rainbow: {icon:'🌈', name:'Doble comodín', color:'text-orange-300', weight:3},
      bomb:    {icon:'💣', name:'Bomba', color:'text-rose-300', weight:5},
      curse:   {icon:'☠️', name:'Maldito −10s', color:'text-red-300', weight:7},
      ice:     {icon:'🧊', name:'Hielo: bloquea guardados', color:'text-cyan-300', weight:6},
      miracle: {icon:'🌟', name:'MILAGRO LEGENDARIO', color:'text-fuchsia-300', weight:0}
    };
    const TYPE_HELP = {
      normal: 'Número normal. Solo encaja entre los valores que ya estén colocados a su izquierda y derecha.',
      green: 'Semilla: al colocarlo, intenta completar el hueco inmediatamente anterior con un número menor.',
      blue: 'Espejo: al colocarlo, intenta completar el hueco inmediatamente siguiente con un número mayor.',
      purple: 'Reloj: si lo colocas, recuperas 12 segundos de partida.',
      pink: 'Corazón: ganas 3 monedas y el próximo número que salga será especial.',
      gold: 'Comodín: ocupa cualquier hueco libre, sin valor numérico y sin alterar el orden.',
      rainbow: 'Arcoíris: ocupa este hueco y otro adyacente libre si está disponible.',
      bomb: 'Bomba: debes colocarla antes de que termine su mecha, o guardarla para pausarla. Caduca tras tres pisos contando el actual.',
      curse: 'Maldito: pierdes 10 segundos al colocarlo, pero obtienes 160 puntos extra.',
      ice: 'Hielo: al colocarlo bloqueas temporalmente el acceso a guardados durante dos colocaciones.',
      miracle: 'Milagro legendario: completa todas las casillas restantes sin alterar el orden. Probabilidad natural muy baja.',
      auto: 'Casilla completada automáticamente por un poder especial.'
    };
    const FLOOR = [
      {n:5,max:50,sec:100,rerolls:2}, {n:6,max:80,sec:95,rerolls:2},
      {n:7,max:120,sec:90,rerolls:1}, {n:8,max:170,sec:85,rerolls:1},
      {n:9,max:230,sec:77,rerolls:1}, {n:10,max:300,sec:66,rerolls:0}
    ];
    // Desafío más intenso, con límite de dificultad a partir del piso 6.
    const floorPressure = floor => ({
      saveCost:floor>=10?7:floor>=7?5:floor>=5?3:0,
      rerollCost:floor>=10?4:floor>=7?3:floor>=5?2:0,
      specialFactor:floor>=10?.3:floor>=6?.42:floor>=4?.72:1,
      hazardFactor:floor<3?0:floor<=4?.58:floor<=6?1:floor<=9?1.35:1.6
    });
    const CAPACITY_PRICES={1:8,2:14};
    const BOMB_FUSE = floor => floor>=10?8:floor>=7?10:13;
    function breakPct(item){return item.breakChance??0;}
    function currentRerolls(){return state.baseRerolls+state.bonusRerolls;}
    // Todas las reliquias tienen probabilidad de rotura, mostrada en la tienda.
    // Se comprueba al superar cada piso. El salvavidas tiene una tirada adicional al activarse.
    const GOODS = [
      {id:'gold',icon:'🟨',title:'Comodín dorado',desc:'Un comodín que cabe en cualquier hueco.',price:4,rarity:'Común',kind:'token',token:'gold',weight:8},
      {id:'blue',icon:'🟦',title:'Número espejo',desc:'Genera un número mayor a su derecha.',price:4,rarity:'Común',kind:'token',token:'blue',weight:7},
      {id:'pink',icon:'💗',title:'Número corazón',desc:'+3 monedas y otro especial asegurado.',price:4,rarity:'Común',kind:'token',token:'pink',weight:7},
      {id:'rainbow',icon:'🌈',title:'Número arcoíris',desc:'Ocupa 2 casillas consecutivas vacías.',price:9,rarity:'Épico',kind:'token',token:'rainbow',weight:3},
      {id:'rerolls',icon:'🎲',title:'Dados cargados',desc:'+2 cambios de número para usar cuando quieras.',price:4,rarity:'Común',kind:'consumable',action:'rerolls',weight:9},
      {id:'eraser',icon:'🧽',title:'Goma mágica',desc:'Borra 1 número colocado y libera su casilla.',price:5,rarity:'Raro',kind:'consumable',action:'eraser',weight:6},
      {id:'defuser',icon:'🧯',title:'Kit antibombas',desc:'Desactiva 1 bomba, esté activa o guardada. Sin recompensa por desactivarla.',price:8,rarity:'Raro',kind:'consumable',action:'defuser',weight:6},
      {id:'miracle',icon:'🌟',title:'Milagro legendario',desc:'Un bloque que completa todo el tablero. Extremadamente raro.',price:22,rarity:'Legendario',kind:'token',token:'miracle',weight:.16},
      {id:'pig',icon:'🐷',title:'Hucha infinita',desc:'+1 moneda extra por cada casilla completada.',price:7,rarity:'Raro',kind:'joker',weight:6,breakChance:16},
      {id:'clock',icon:'⏳',title:'Reloj de arena',desc:'+12 segundos al inicio de cada piso.',price:6,rarity:'Común',kind:'joker',weight:7,breakChance:20},
      {id:'clover',icon:'🍀',title:'Trébol travieso',desc:'Aumenta la aparición de números especiales.',price:6,rarity:'Raro',kind:'joker',weight:7,breakChance:18},
      {id:'magnet',icon:'🧲',title:'Imán de la suerte',desc:'+2 monedas cuando un efecto rellena otra casilla.',price:7,rarity:'Raro',kind:'joker',weight:5,breakChance:18},
      {id:'lifebuoy',icon:'🛟',title:'Última oportunidad',desc:'Rescata un bloqueo total: 90% de romperse al activarse y, si sobrevive, 2 pisos de enfriamiento.',price:9,rarity:'Épico',kind:'joker',weight:3,breakChance:25},
      {id:'prism',icon:'🔮',title:'Prisma loco',desc:'Multiplica la posibilidad de que salga arcoíris.',price:9,rarity:'Épico',kind:'joker',weight:4,breakChance:23},
      {id:'interest',icon:'🏦',title:'Intereses',desc:'+3 monedas al acabar piso si tienes 8 o más.',price:6,rarity:'Raro',kind:'joker',weight:5,breakChance:14}
    ];
    const $ = id => document.getElementById(id);
    const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
    const pos = i => String(i+1).padStart(2,'0');
    const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
      phase:'menu', floor:1, size:5, max:50, timeLeft:105, lastTime:0, timer:null,
      board:[], current:null, stored:[], capacity:1, selected:-1, eraseMode:false, baseRerolls:2, bonusRerolls:0, erasers:0, defusers:0, iceLockTurns:0, bombsDrawnThisFloor:0,
      coins:0, jokers:[], offers:[], shopRerolls:0, guaranteeSpecial:false, rescueUsed:false, rescueReadyFloor:1,
      info:false, managerOpen:false, managerFrom:null, lastBreaks:[], brokenCount:0,
      streak:0, maxStreak:0, announcedRecord:false, milestones:new Set(),
      score:0, completedFloors:0, scoredSlots:new Set(), resultSaved:false, lastResult:null, lastFloorAward:0
    };
    // Ayudas accesibles: un único popup para ratón/teclado y un icono i en pantallas táctiles.
    function setHelp(el,title,description){
      el.dataset.helpTitle=title;
      el.dataset.helpText=description;
    }
    const tooltip=$('helpTooltip');
    let helpAnchor=null,helpPinned=false;
    function placeHelp(el){
      const r=el.getBoundingClientRect(),w=Math.min(280,innerWidth-24),h=tooltip.offsetHeight||80;
      tooltip.style.width=w+'px';
      tooltip.style.left=Math.max(12,Math.min(innerWidth-w-12,r.left+r.width/2-w/2))+'px';
      let y=r.bottom+11;
      if(y+h>innerHeight-12)y=r.top-h-11;
      tooltip.style.top=Math.max(10,Math.min(innerHeight-h-10,y))+'px';
    }
    function showHelp(el,pinned=false){
      if(tutorial.active||!el?.dataset?.helpTitle)return;
      helpAnchor=el;helpPinned=pinned;
      $('helpTitle').textContent=el.dataset.helpTitle;
      $('helpText').textContent=el.dataset.helpText;
      tooltip.classList.remove('hidden');tooltip.setAttribute('aria-hidden','false');
      placeHelp(el);
    }
    function hideHelp(){
      helpAnchor=null;helpPinned=false;tooltip.classList.add('hidden');tooltip.setAttribute('aria-hidden','true');
    }
    document.addEventListener('pointerover',e=>{
      if(e.pointerType==='touch'||helpPinned||tutorial.active)return;
      const el=e.target.closest?.('[data-help-title]');
      if(el&&el!==helpAnchor)showHelp(el);
    });
    document.addEventListener('pointerout',e=>{
      if(helpPinned||!helpAnchor)return;
      if(helpAnchor.contains(e.relatedTarget))return;
      hideHelp();
    });
    document.addEventListener('focusin',e=>{
      if(e.target.matches?.('[data-help-title]')&&!tutorial.active)showHelp(e.target);
    });
    document.addEventListener('focusout',e=>{
      if(helpPinned)return;
      if(helpAnchor===e.target)hideHelp();
    });
    document.addEventListener('click',e=>{
      const trigger=e.target.closest?.('[data-help-toggle]');
      if(trigger){
        e.preventDefault();e.stopPropagation();
        const el=trigger.dataset.helpToggle==='parent'?trigger.closest('.shop-card'):$(trigger.dataset.helpToggle);
        if(helpPinned&&helpAnchor===el)hideHelp();else showHelp(el,true);
      }else if(helpPinned)hideHelp();
    });
    addEventListener('scroll',()=>{if(helpAnchor&&!tooltip.classList.contains('hidden'))placeHelp(helpAnchor);},{passive:true});
    addEventListener('resize',()=>{if(helpAnchor)placeHelp(helpAnchor);});

    const TUTORIAL_KEY='sotiorno_tutorial_v2';
    let tutorialSeen={game:false,shop:false};
    try{tutorialSeen={...tutorialSeen,...JSON.parse(localStorage.getItem(TUTORIAL_KEY)||'{}')};}catch(_){}
    const tutorial={active:false,kind:null,index:0};
    const TUTORIAL_STEPS={
      game:[
        {target:'currentCard',title:'Este es tu número',text:'Cada turno recibes un número al azar. Aquí ves su valor, su tipo y qué efecto tiene. Antes de colocarlo, piensa dónde debe ir.'},
        {target:'board',title:'Ordena de menor a mayor',text:'El tablero se lee de arriba abajo. Los números pequeños van arriba y los grandes abajo. No se pueden intercambiar los que ya has colocado.'},
        {target:'board',title:'Las casillas verdes te guían',text:'Solo puedes colocar el número en un hueco iluminado en verde. Si el tablero se llena, superas el piso y recibes puntos y monedas.'},
        {target:'storeButton',title:'Guardar te da otra oportunidad',text:'¿No te convence el número? Guárdalo para más tarde. Empiezas con un espacio y podrás comprar otros dos en la tienda.'},
        {target:'rerollButton',title:'Cambiar el número',text:'El dado descarta tu número actual y saca otro. Tienes pocos cambios por piso: úsalos cuando no encuentres un buen hueco.'},
        {target:'currentCard',title:'Presta atención a los especiales',text:'Algunos números dan tiempo, monedas o rellenan otros huecos. Pasa el ratón por el número para ver su efecto, o pulsa la i si juegas en móvil.'},
        {target:'timeUI',title:'El tiempo es limitado',text:'El reloj corre mientras juegas. Encadena colocaciones para aumentar tu multiplicador y consigue monedas para las mejoras de la tienda.'},
        {target:'board',title:'Ahora te toca',text:'Coloca tu número en uno de los huecos verdes. Al completar todas las casillas llegarás a una tienda: también te enseñaremos a usarla.'}
      ],
      shop:[
        {target:'shopCards',title:'Has llegado a la tienda',text:'Después de cada piso puedes gastar las monedas que hayas ganado. Las ofertas incluyen números especiales, herramientas y reliquias.'},
        {target:'buyCapacityButton',title:'Amplía tus guardados',text:'Empiezas con un espacio de guardado. Puedes comprar el segundo por 8 monedas y el tercero por 14; permanecen desbloqueados durante esta partida.'},
        {target:'shopManageRelicsButton',title:'Las reliquias tienen riesgo',text:'Sus efectos duran varios pisos, pero pueden romperse. Solo puedes llevar cinco: aquí puedes vender o sustituir las que no quieras.'},
        {target:'nextFloorButton',title:'Decide cuándo continuar',text:'Puedes comprar varias cosas, cambiar las ofertas pagando monedas o ir directamente al siguiente piso. Cada piso será más exigente.'}
      ]
    };
    function saveTutorialSeen(){
      try{localStorage.setItem(TUTORIAL_KEY,JSON.stringify(tutorialSeen));}catch(_){}
    }
    function tutorialPosition(){
      if(!tutorial.active)return;
      const steps=TUTORIAL_STEPS[tutorial.kind],step=steps[tutorial.index];
      const target=$(step.target),spot=$('tutorialSpotlight'),panel=$('tutorialPanel');
      if(!target)return;
      const r=target.getBoundingClientRect();
      const pad=6;
      spot.style.left=Math.max(5,r.left-pad)+'px';
      spot.style.top=Math.max(5,r.top-pad)+'px';
      spot.style.width=Math.min(innerWidth-10,r.width+pad*2)+'px';
      spot.style.height=Math.min(innerHeight-10,r.height+pad*2)+'px';
      const w=Math.min(360,innerWidth-24);
      panel.style.width=w+'px';
      const h=panel.offsetHeight||220;
      let top=r.bottom+20;
      if(top+h>innerHeight-12)top=r.top-h-20;
      if(top<12)top=Math.max(12,(innerHeight-h)/2);
      let left=Math.max(12,Math.min(innerWidth-w-12,r.left+(r.width-w)/2));
      panel.style.top=Math.round(top)+'px';panel.style.left=Math.round(left)+'px';
    }
    function drawTutorial(){
      if(!tutorial.active)return;
      const steps=TUTORIAL_STEPS[tutorial.kind],item=steps[tutorial.index];
      $('tutorialChapter').textContent=tutorial.kind==='game'?'PRIMEROS PASOS':'PRIMERA TIENDA';
      $('tutorialProgress').textContent=(tutorial.index+1)+' / '+steps.length;
      $('tutorialProgressFill').style.width=((tutorial.index+1)/steps.length*100)+'%';
      $('tutorialTitle').textContent=item.title;
      $('tutorialText').textContent=item.text;
      $('tutorialPrev').hidden=tutorial.index===0;
      $('tutorialNext').textContent=tutorial.index===steps.length-1?(tutorial.kind==='shop'?'¡A comprar!':'¡A jugar!'):'Siguiente';
      $('tutorialNext').append(makeGlyph('play'));
      const focusTarget=$(item.target);
      if(focusTarget){
        const rect=focusTarget.getBoundingClientRect();
        if(rect.top<12||rect.bottom>innerHeight-12)focusTarget.scrollIntoView({block:'center',behavior:'instant'});
      }
      requestAnimationFrame(tutorialPosition);
      $('tutorialPanel').focus({preventScroll:true});
    }
    function startTutorial(kind){
      if(tutorial.active)closeTutorial(false);
      if(!TUTORIAL_STEPS[kind])return;
      hideHelp();
      tutorial.active=true;tutorial.kind=kind;tutorial.index=0;
      if(state.phase==='playing')stopClock();
      $('tutorialLayer').classList.remove('hidden');
      requestAnimationFrame(drawTutorial);
    }
    function closeTutorial(resume=true){
      if(!tutorial.active)return;
      tutorialSeen[tutorial.kind]=true;saveTutorialSeen();
      tutorial.active=false;tutorial.kind=null;
      $('tutorialLayer').classList.add('hidden');
      if(resume&&state.phase==='playing'&&!state.managerOpen&&!state.info)startClock();
    }
    $('tutorialNext').addEventListener('click',()=>{
      if(!tutorial.active)return;
      if(tutorial.index>=TUTORIAL_STEPS[tutorial.kind].length-1){closeTutorial();return;}
      tutorial.index++;drawTutorial();
    });
    $('tutorialPrev').addEventListener('click',()=>{if(tutorial.active&&tutorial.index>0){tutorial.index--;drawTutorial();}});
    $('tutorialSkip').addEventListener('click',()=>closeTutorial());
    addEventListener('resize',tutorialPosition);
    document.addEventListener('scroll',tutorialPosition,true);

    // Ranking: solo cinco mejores partidas, guardadas en este navegador.
    const SCORE_KEY = 'numeros_ciegos_top5_v1';
    const NAME_KEY = 'numeros_ciegos_nombre_v1';
    const fmtPoints = n => Math.max(0,Math.floor(Number(n)||0)).toLocaleString('es-ES');
    let records=[];
    let storageAvailable=true;
    function cleanRecord(r){
      if(!r || typeof r!=='object' || !Number.isFinite(r.score) || !Number.isFinite(r.floor))return null;
      return {
        id:String(r.id||''), name:String(r.name||'Jugador').trim().slice(0,18)||'Jugador',
        score:Math.max(0,Math.floor(r.score)), floor:Math.max(1,Math.floor(r.floor)),
        completed:Math.max(0,Math.floor(r.completed||0)), maxStreak:Math.max(0,Math.floor(r.maxStreak||0)), broken:Math.max(0,Math.floor(r.broken||0)), date:String(r.date||''),
        status:r.status==='Abandonada'?'Abandonada':'Derrota'
      };
    }
    const rankSort=(a,b)=>b.score-a.score || b.floor-a.floor || b.completed-a.completed || b.date.localeCompare(a.date);
    function loadRecords(){
      try{
        const stored=JSON.parse(localStorage.getItem(SCORE_KEY)||'[]');
        records=(Array.isArray(stored)?stored:[]).map(cleanRecord).filter(Boolean).sort(rankSort).slice(0,5);
      }catch(_){storageAvailable=false;records=[];}
      $('storageWarning').classList.toggle('hidden',storageAvailable);
    }
    function saveRecord(result){
      records=[...records,result].sort(rankSort).slice(0,5);
      try{localStorage.setItem(SCORE_KEY,JSON.stringify(records));}
      catch(_){storageAvailable=false;$('storageWarning').classList.remove('hidden');}
      renderRanking();
      return records.findIndex(r=>r.id===result.id)+1; // 0: no entró en el top 5
    }
    function currentName(){return $('playerName').value.trim().slice(0,18)||'Jugador';}
    function savePlayerName(){
      try{localStorage.setItem(NAME_KEY,currentName());}catch(_){storageAvailable=false;$('storageWarning').classList.remove('hidden');}
    }
    function displayDate(iso){
      const d=new Date(iso);
      return Number.isNaN(d.getTime())?'':d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'2-digit'});
    }
    function renderRankRows(id){
      const root=$(id);root.replaceChildren();
      if(!records.length){
        const empty=document.createElement('p');empty.className='text-slate-400 text-xs py-2';
        empty.textContent='Todavía no hay partidas. ¡La primera puede ser un récord!';root.append(empty);return;
      }
      records.forEach((r,i)=>{
        const row=document.createElement('div');
        row.className='flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-slate-800/90 px-2 py-1.5'+(state.lastResult?.id===r.id?' ring-1 ring-yellow-300/60':'');
        const left=document.createElement('span');left.className='min-w-0 truncate text-slate-200';
        left.textContent=(i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.')+' '+r.name+' · Piso '+r.floor;
        const right=document.createElement('span');right.className='flex-shrink-0 text-right';
        const score=document.createElement('strong');score.className='text-yellow-300 tabular-nums';score.textContent=fmtPoints(r.score);
        const date=document.createElement('small');date.className='text-[9px] text-slate-500 block';date.textContent=displayDate(r.date);
        right.append(score,date);row.append(left,right);root.append(row);
      });
    }
    function renderRanking(){
      renderRankRows('menuTop5');renderRankRows('endTop5');
      $('shareBestButton').disabled=records.length===0;
      $('bestScoreUI').textContent=fmtPoints(records[0]?.score||0);
    }
    function finalResult(status){
      if(state.resultSaved)return null;
      // No guardamos un menú inicial sin movimientos ni puntos.
      state.resultSaved=true;
      if(state.score<=0 && state.completedFloors===0)return null;
      const result={
        id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
        name:currentName(), score:state.score, floor:state.floor,
        completed:state.completedFloors, maxStreak:state.maxStreak, broken:state.brokenCount, date:new Date().toISOString(), status
      };
      state.lastResult=result;
      savePlayerName();
      const rank=saveRecord(result);
      return rank;
    }
    function showResult(rank){
      $('resultPanel').classList.remove('hidden');
      $('endScore').textContent=fmtPoints(state.score);
      $('endFloor').textContent=state.floor;
      $('endCompleted').textContent=state.completedFloors;
      $('endChallenge').textContent='🔥 Mejor racha: '+state.maxStreak+' · 💥 Reliquias rotas: '+state.brokenCount;
      $('rankingNotice').textContent=rank===1?'🏆 ¡Nuevo récord personal!':rank>1?'✨ ¡Top '+rank+' de tus mejores partidas!':
        rank===0?'Sigue jugando para entrar entre tus 5 mejores partidas.':'Partida terminada.';
      renderRanking();
    }
    async function shareResult(result){
      if(!result)return;
      const best=records[0]?.score||result.score;
      const msg='🎮 SOTIORNO — Mi partida\n'+
        '👤 '+result.name+'\n'+
        '⭐ Puntuación: '+fmtPoints(result.score)+'\n'+
        '🏁 Piso alcanzado: '+result.floor+'\n'+
        '✅ Pisos superados: '+result.completed+'\n'+
        '🔥 Mejor racha: '+(result.maxStreak||0)+'\n'+
        '💥 Reliquias rotas: '+(result.broken||0)+'\n'+
        '🏆 Mi récord: '+fmtPoints(best)+'\n\n¿Puedes superarme? 😎'+
        ((location.protocol==='https:'||location.protocol==='http:')?'\n🎮 Juega aquí: '+location.origin+location.pathname:'');
      // Compartir de forma nativa en móviles; si no está disponible, copiar texto.
      if(navigator.share){
        try{await navigator.share({title:'Mi resultado en SOTIORNO',text:msg});return;}
        catch(e){if(e?.name==='AbortError')return;}
      }
      try{if(!navigator.clipboard?.writeText)throw Error('Sin acceso al portapapeles');await navigator.clipboard.writeText(msg);toast('📋 ¡Resultado copiado!');return;}
      catch(_){
        const area=document.createElement('textarea');area.value=msg;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();
        let copied=false;try{copied=document.execCommand('copy');}catch(_){}area.remove();
        if(copied)toast('📋 ¡Resultado copiado!');else prompt('Copia este resultado para compartirlo:',msg);
      }
    }

    let toastTimer=null;
    let audioCtx=null, musicTimer=null, musicStep=0, nextMusicNote=0;
    let masterBus=null, musicBus=null, sfxBus=null, audioCompressor=null, noiseBuffer=null;
    let audioSettings={music:true,sfx:true,volume:.8};
    try {
      const saved=JSON.parse(localStorage.getItem('nc_audio')||'null');
      if(saved && typeof saved.music==='boolean'){
        audioSettings={music:saved.music,sfx:saved.sfx!==false,volume:Number.isFinite(saved.volume)?Math.min(1,Math.max(0,saved.volume)):.8};
      }
    } catch(_) {}

    // Nueva mezcla: compresor, canales separados y sintetizador polifónico.
    // No hace falta descargar ficheros de música o efectos.
    function initAudio(){
      if(audioCtx)return;
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC){return;}
      try{
        audioCtx=new AC();
        masterBus=audioCtx.createGain();
        audioCompressor=audioCtx.createDynamicsCompressor();
        audioCompressor.threshold.value=-18;
        audioCompressor.knee.value=18;
        audioCompressor.ratio.value=3.5;
        audioCompressor.attack.value=.005;
        audioCompressor.release.value=.19;
        musicBus=audioCtx.createGain();sfxBus=audioCtx.createGain();
        musicBus.gain.value=audioSettings.music?.62:0;
        sfxBus.gain.value=audioSettings.sfx?.9:0;
        musicBus.connect(audioCompressor);sfxBus.connect(audioCompressor);
        audioCompressor.connect(masterBus);masterBus.connect(audioCtx.destination);
        applyAudioGain();
        // Ruido corto original, utilizado en percusión y explosiones.
        noiseBuffer=audioCtx.createBuffer(1,Math.round(audioCtx.sampleRate*.6),audioCtx.sampleRate);
        const arr=noiseBuffer.getChannelData(0);
        for(let i=0;i<arr.length;i++)arr[i]=(Math.random()*2-1);
      }catch(_){audioCtx=null;}
    }
    function applyAudioGain(){
      if(!audioCtx)return;
      const t=audioCtx.currentTime;
      // Curva perceptual: niveles medios de la antigua versión ahora se oyen claramente.
      masterBus.gain.setTargetAtTime(Math.pow(audioSettings.volume,.65)*.98,t,.015);
      musicBus.gain.setTargetAtTime(audioSettings.music && musicTimer ? .62 : 0,t,.045);
      sfxBus.gain.setTargetAtTime(audioSettings.sfx ? .9 : 0,t,.025);
    }
    function unlockAudio(){
      initAudio();
      if(!audioCtx)return Promise.resolve(false);
      if(audioCtx.state==='suspended')return audioCtx.resume().then(()=>true).catch(()=>false);
      return Promise.resolve(audioCtx.state==='running');
    }
    // Una voz con ataque y caída suave; el filtro redondea los sonidos agudos en móviles.
    function synth(freq,duration=.12,shape='triangle',level=.16,when=null,bus='sfx',endFreq=null){
      if(!audioCtx||audioCtx.state==='closed')return;
      const t=Math.max(audioCtx.currentTime,when??audioCtx.currentTime),end=t+Math.max(.025,duration);
      const osc=audioCtx.createOscillator(),env=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
      osc.type=shape;osc.frequency.setValueAtTime(Math.max(50,freq),t);
      if(endFreq && endFreq>40)osc.frequency.exponentialRampToValueAtTime(endFreq,end);
      filter.type='lowpass';filter.frequency.value=(shape==='sawtooth'||shape==='square')?3200:7200;
      env.gain.setValueAtTime(.0001,t);
      env.gain.exponentialRampToValueAtTime(Math.max(.001,level),t+.008);
      env.gain.exponentialRampToValueAtTime(.0001,end);
      osc.connect(filter);filter.connect(env);env.connect(bus==='music'?musicBus:sfxBus);
      osc.start(t);osc.stop(end+.025);
    }
    function noise(duration=.1,level=.12,when=null,highpass=220){
      if(!audioCtx||!noiseBuffer)return;
      const t=Math.max(audioCtx.currentTime,when??audioCtx.currentTime);
      const src=audioCtx.createBufferSource(),hp=audioCtx.createBiquadFilter(),env=audioCtx.createGain();
      src.buffer=noiseBuffer;hp.type='highpass';hp.frequency.value=highpass;
      env.gain.setValueAtTime(Math.max(.001,level),t);
      env.gain.exponentialRampToValueAtTime(.0001,t+duration);
      src.connect(hp);hp.connect(env);env.connect(sfxBus);
      src.start(t);src.stop(t+duration+.02);
    }
    function sfx(kind){
      if(!audioSettings.sfx)return;
      initAudio();if(!audioCtx)return;
      const t=audioCtx.currentTime+.012;
      const n=(f,d,shape='triangle',vol=.16,delay=0,to=null)=>synth(f,d,shape,vol,t+delay,'sfx',to);
      switch(kind){
        case 'tap': n(520,.085,'square',.17,0,750);n(780,.06,'sine',.11,.035);break;
        case 'store': n(440,.15,'triangle',.20,0,310);n(660,.13,'sine',.14,.075,500);break;
        case 'coin': n(900,.11,'sine',.16);n(1350,.16,'triangle',.12,.07);break;
        case 'buy': n(480,.11,'square',.17);n(720,.12,'triangle',.17,.085);n(960,.2,'sine',.18,.17);break;
        case 'error': n(260,.15,'sawtooth',.18,0,145);n(145,.17,'square',.1,.07,110);break;
        case 'pause': n(390,.15,'square',.13,0,240);break;
        case 'special': n(660,.1,'triangle',.22,0,880);n(1150,.17,'sine',.15,.07);break;
        case 'win': [523,659,784,1047].forEach((f,i)=>n(f,.19,'triangle',.19,i*.095));break;
        case 'break': n(510,.23,'sawtooth',.20,0,95);noise(.16,.17,t+.03,600);break;
        case 'combo': [750,940,1175].forEach((f,i)=>n(f,.12,'square',.16,i*.05));break;
        case 'tick': n(980,.06,'square',.20,0,690);noise(.035,.09,t,1800);break;
        case 'bombSpawn':
          n(550,.21,'sawtooth',.22,0,300);
          n(740,.20,'square',.14,.20,450);
          n(1050,.13,'triangle',.20,.39,820);
          noise(.17,.12,t,1000);
          break;
        case 'bombCritical': n(880,.11,'square',.20);n(440,.1,'sawtooth',.11,.12);break;
        case 'bombSafe': n(670,.13,'triangle',.2);n(990,.2,'sine',.15,.09);break;
        case 'bomb':
          n(240,.48,'sawtooth',.27,0,60);
          n(105,.44,'square',.17,.06,52);
          noise(.42,.25,t,120);
          break;
        case 'miracle': [784,988,1175,1568,1976].forEach((f,i)=>n(f,.26,'sine',.19,i*.09));break;
        default: n(520,.09,'triangle',.15);
      }
    }
    // Banda sonora original: tres composiciones procedurales con motivos que evolucionan.
    // Cada escena cambia el tempo, la armonía, el timbre y la percusión.
    const midi=m=>440*Math.pow(2,(m-69)/12);
    const MUSIC_SCENES={
      menu:{
        bpm:86,lead:'sine',bass:'triangle',leadLevel:.092,bassLevel:.082,chordLevel:.026,beatLevel:.025,
        chords:[[57,60,64],[53,57,60],[55,59,62],[52,55,59],[57,60,64],[60,64,67],[53,57,60],[55,59,62]],
        motifs:[[69,null,72,null,76,null,72,71,null,69,null,67,null,69,null],
                [72,null,null,76,79,null,76,null,74,null,72,null,69,null,null,null],
                [76,null,79,81,null,79,null,76,74,null,72,74,null,null,69,null],
                [72,null,69,null,null,67,69,null,71,null,72,null,69,null,null,null]]
      },
      playing:{
        bpm:126,lead:'square',bass:'sawtooth',leadLevel:.072,bassLevel:.072,chordLevel:.021,beatLevel:.09,
        chords:[[62,65,69],[58,62,65],[60,64,67],[57,60,64],[62,65,69],[65,69,72],[58,62,65],[60,64,67]],
        motifs:[[74,null,77,null,81,79,77,null,74,null,72,74,77,null,74,null],
                [77,79,81,null,84,null,81,79,77,null,74,72,74,null,77,null],
                [81,null,84,86,84,null,81,null,79,81,77,null,74,null,72,null],
                [74,77,79,null,81,null,79,77,74,72,74,null,69,null,null,null]]
      },
      shop:{
        bpm:100,lead:'triangle',bass:'sine',leadLevel:.093,bassLevel:.105,chordLevel:.032,beatLevel:.033,
        chords:[[60,64,67,71],[57,60,64,67],[62,65,69,72],[55,59,62,65],[60,64,67,71],[65,69,72,76],[62,65,69,72],[55,59,62,65]],
        motifs:[[76,null,79,null,83,null,79,null,76,74,72,null,74,null,76,null],
                [79,null,81,83,null,81,null,79,76,null,74,76,null,72,null,null],
                [83,81,79,null,76,null,79,null,81,79,76,null,74,null,72,null],
                [76,null,74,72,71,null,72,null,74,null,76,null,null,null,79,null]]
      }
    };
    let musicScene=null;
    function desiredMusicScene(){
      return state.phase==='menu'?'menu':state.phase==='playing'?'playing':state.phase==='shop'?'shop':null;
    }
    function scheduleMusic(){
      if(!audioCtx||!musicTimer||!audioSettings.music||!musicScene)return;
      const theme=MUSIC_SCENES[musicScene];
      const stepTime=60/theme.bpm/4;
      while(nextMusicNote<audioCtx.currentTime+.15){
        const step=musicStep%16;
        const bar=Math.floor(musicStep/16);
        const phrase=Math.floor(bar/8);
        const chord=theme.chords[bar%theme.chords.length];
        const phraseVariation=(phrase+Math.floor(bar/2))%theme.motifs.length;
        const melody=theme.motifs[phraseVariation][step];
        // Se alternan espacios silenciosos, respuestas y octavas por frase.
        const mutedBar=musicScene==='menu'&&bar%8===7;
        if(melody!=null && !mutedBar && !(step%4===3&&phrase%3===2)){
          const note=melody + (phrase%4===3 && musicScene==='playing' ? -12 : 0);
          const accent=step%4===0?1.12:.83;
          synth(midi(note),stepTime*(musicScene==='menu'?1.65:1.18),theme.lead,theme.leadLevel*accent,nextMusicNote,'music');
        }
        if(step===0||step===8){
          const chordLength=musicScene==='menu'?stepTime*6.6:stepTime*3.3;
          chord.forEach((note,i)=>synth(midi(note),chordLength,'sine',theme.chordLevel*(i===0?1.12:1),nextMusicNote,'music'));
        }
        if(step%4===0 || (musicScene==='playing' && (step===6||step===14))){
          const root=chord[0]-12+(step===12?7:0);
          synth(midi(root),stepTime*(musicScene==='menu'?3.2:2.4),theme.bass,theme.bassLevel,nextMusicNote,'music');
        }
        if(musicScene==='playing'){
          // Percusión más marcada y una retirada al final de cada cuatro compases.
          if(step%4===0) synth(85,stepTime*.88,'sine',theme.beatLevel,nextMusicNote,'music',49);
          if(step===4||step===12) synth(240,stepTime*.38,'triangle',.043,nextMusicNote,'music',95);
          if(step%2===0 && !(bar%4===3 && step>8)) synth(1600,stepTime*.23,'triangle',.016,nextMusicNote,'music',800);
        }else if(musicScene==='shop'){
          if(step===0||step===10) synth(110,stepTime*.7,'sine',theme.beatLevel,nextMusicNote,'music',66);
          if(step===4||step===12) synth(700,stepTime*.22,'triangle',.021,nextMusicNote,'music',480);
        }else if(musicScene==='menu' && step===0 && bar%2===0){
          synth(95,stepTime*1.4,'sine',theme.beatLevel,nextMusicNote,'music',60);
        }
        nextMusicNote+=stepTime;
        musicStep++;
      }
    }
    function startMusic(){
      initAudio();
      if(!audioSettings.music||!audioCtx)return;
      const desired=desiredMusicScene();
      if(!desired){stopMusic();return;}
      if(musicTimer&&musicScene===desired)return;
      if(musicTimer)clearInterval(musicTimer);
      musicScene=desired;
      musicStep=0;
      nextMusicNote=audioCtx.currentTime+.10;
      musicTimer=setInterval(scheduleMusic,50);
      applyAudioGain();scheduleMusic();
    }
    function stopMusic(){
      if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
      musicScene=null;
      applyAudioGain();
    }
    function updateMusicScene(){
      if(!audioSettings.music || !desiredMusicScene()){stopMusic();return;}
      startMusic();
    }
    function syncAudio(){
      for(const s of ['Menu','Pause']){
        $('music'+s).checked=audioSettings.music;
        $('sfx'+s).checked=audioSettings.sfx;
        $('volume'+s).value=Math.round(audioSettings.volume*100);
      }
      $('musicSceneMenu').textContent='Banda sonora: menú · ambiente relajado';
      $('musicScenePause').textContent='Banda sonora: '+(state.phase==='paused'?'pausada':'partida');
      if(!audioSettings.music)stopMusic();
      else updateMusicScene();
      applyAudioGain();
      try{localStorage.setItem('nc_audio',JSON.stringify(audioSettings));}catch(_){}
    }
    for(const suffix of ['Menu','Pause']){
      $('music'+suffix).addEventListener('change',e=>{unlockAudio();audioSettings.music=e.target.checked;syncAudio();});
      $('sfx'+suffix).addEventListener('change',e=>{unlockAudio();audioSettings.sfx=e.target.checked;syncAudio();});
      $('volume'+suffix).addEventListener('input',e=>{audioSettings.volume=Number(e.target.value)/100;syncAudio();});
    }
    // El navegador necesita un gesto del jugador antes de reproducir audio.
    for(const name of ['audioTestMenu','audioTestPause']){
      $(name).addEventListener('click',async()=>{
        const ready=await unlockAudio();
        if(!ready){toast('🔇 No se pudo activar el audio. Revisa el silencio del dispositivo.',true);return;}
        if(!audioSettings.sfx){audioSettings.sfx=true;syncAudio();}
        sfx('buy');updateMusicScene();toast('🔊 ¡Audio activado!');
      });
    }
    // Animaciones ligeras, compatibles con móvil.
    function animate(el){ if(!el||prefersReduced||!el.animate) return;el.animate([{transform:'scale(.88)'},{transform:'scale(1.09)'},{transform:'scale(1)'}],{duration:310,easing:'ease-out'}); }
    function particles(element,count=14){
      if(prefersReduced||!element)return;
      const rect=element.getBoundingClientRect(); const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
      const colors=['#facc15','#86efac','#93c5fd','#f0abfc','#fb7185'];
      for(let i=0;i<count;i++){
        const p=document.createElement('i'),rad=Math.random()*Math.PI*2,dist=28+Math.random()*72;
        p.className='floating-particle';p.style.left=x+'px';p.style.top=y+'px';
        p.style.backgroundColor=colors[rand(0,colors.length-1)];
        p.style.setProperty('--dx',Math.cos(rad)*dist+'px');p.style.setProperty('--dy',Math.sin(rad)*dist+'px');p.style.setProperty('--rot',rand(-280,280)+'deg');
        document.body.append(p);setTimeout(()=>p.remove(),850);
      }
    }
    function moneyFloat(value,element){
      if(prefersReduced)return;
      const rect=element.getBoundingClientRect(),p=document.createElement('span');
      p.textContent=(value>0?'+':'')+value+' 🪙';p.className='floating-money';p.style.left=(rect.left+rect.width/2-14)+'px';p.style.top=rect.top+'px';
      document.body.append(p);setTimeout(()=>p.remove(),1000);
    }
    function toast(message,bad=false){
      const el=$('toast');clearTimeout(toastTimer);el.textContent=message;
      el.classList.remove('hidden');el.classList.toggle('text-rose-300',bad);el.classList.toggle('text-yellow-200',!bad);
      toastTimer=setTimeout(()=>el.classList.add('hidden'),1800);
    }
    function scoreFloat(n,element){
      if(prefersReduced||!element||n<=0)return;
      const rect=element.getBoundingClientRect(),p=document.createElement('span');
      p.className='floating-score';p.textContent='+'+fmtPoints(n)+' ⭐';p.style.left=Math.max(8,rect.left+rect.width/2-32)+'px';p.style.top=rect.top+'px';
      document.body.append(p);setTimeout(()=>p.remove(),1100);
    }
    function flash(color='#fbbf24'){
      if(prefersReduced)return;
      const el=$('impactFlash');el.style.background=color;el.classList.remove('hidden','impact-flash');void el.offsetWidth;el.classList.add('impact-flash');setTimeout(()=>el.classList.add('hidden'),360);
    }
    function comboBanner(text){
      if(prefersReduced)return;
      const el=$('comboBanner');el.textContent=text;el.classList.remove('hidden','combo-reveal');void el.offsetWidth;el.classList.add('combo-reveal');setTimeout(()=>el.classList.add('hidden'),850);
    }
    function pulseError(el){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');}
    function setStatus(msg){$('statusUI').textContent=msg;}
    function showOverlay(name){
      if(name)hideBombPopup();
      for(const n of ['menu','pause','shop']){
        const el=$(n+'Overlay');el.classList.toggle('hidden',n!==name);el.classList.toggle('flex',n===name);
      }
      updateMusicScene();
    }
    function hasJoker(id){return state.jokers.includes(id);}
    function addCoins(n,el=null){state.coins=Math.max(0,state.coins+n);if(el && n>0)moneyFloat(n,el);$('coinsUI').textContent='🪙 '+state.coins;}
    function addScore(n,element=null){
      const gain=Math.max(0,Math.floor(n));state.score+=gain;$('scoreUI').textContent=fmtPoints(state.score);
      if(element&&gain){scoreFloat(gain,element);animate($('scoreUI'));}
      if(records.length && !state.announcedRecord && state.score>records[0].score){
        state.announcedRecord=true;flash('#fde047');toast('🏆 ¡HAS SUPERADO TU RÉCORD!');sfx('win');particles($('scoreUI'),24);
      }
      const milestone=Math.floor(state.score/2500);
      if(milestone>0&&!state.milestones.has(milestone)){
        state.milestones.add(milestone);particles($('scoreUI'),14);
      }
    }
    function streakMultiplier(){return state.streak>=8?2:state.streak>=5?1.5:state.streak>=3?1.25:1;}
    function resetStreak(){state.streak=0;renderHUD();}
    function scoreNewCasillas(indices){
      let count=0;
      for(const i of indices){if(!state.scoredSlots.has(i)){state.scoredSlots.add(i);count++;}}
      return Math.round(count*100*streakMultiplier());
    }
    function addTime(n){state.timeLeft+=n;renderHUD();}
    function configFloor(){
      const c=FLOOR[Math.min(state.floor-1,FLOOR.length-1)];
      state.size=c.n;state.max=c.max+Math.max(0,state.floor-6)*60;
      state.timeLeft=Math.max(42,c.sec-Math.max(0,state.floor-6)*3)+(hasJoker('clock')?12:0);
      // Las tiradas gratuitas NO se acumulan de un piso a otro. Las compradas sí.
      state.baseRerolls=c.rerolls;state.rescueUsed=false;state.eraseMode=false;state.iceLockTurns=0;state.bombsDrawnThisFloor=0;
      state.board=Array(state.size).fill(null);state.current=null;state.selected=-1;
      state.streak=0;state.scoredSlots=new Set();
      render();
    }
    function validSlots(token){
      if(!token)return[];
      const result=[];
      for(let i=0;i<state.size;i++){
        if(state.board[i])continue;
        if(token.type==='gold'||token.type==='rainbow'||token.type==='miracle'){result.push(i);continue;}
        let left=0,right=state.max+1;
        for(let j=i-1;j>=0;j--)if(state.board[j] && typeof state.board[j].value==='number'){left=state.board[j].value;break;}
        for(let j=i+1;j<state.size;j++)if(state.board[j] && typeof state.board[j].value==='number'){right=state.board[j].value;break;}
        if(left<token.value && token.value<right)result.push(i);
      }
      return result;
    }
    function activeToken(){return state.selected>=0 ? state.stored[state.selected] : state.current;}
    function isBomb(token){return token?.type==='bomb';}
    function liveBombs(){return state.stored.filter(isBomb);}
    function bombTimerText(token){return (Math.max(0,token.fuseLeft??0)).toFixed(1)+'s';}
    let bombPopupToken=null, bombPopupAutoTimer=null, bombPopupExpandedByUser=false;
    function minimizeBombPopup(){
      $('bombPopup').classList.add('bomb-pop-compact');
      $('bombMinimize').setAttribute('aria-label','Reducir alerta de bomba');
    }
    function expandBombPopup(){
      bombPopupExpandedByUser=true;clearTimeout(bombPopupAutoTimer);
      $('bombPopup').classList.remove('bomb-pop-compact');
    }
    function hideBombPopup(){
      clearTimeout(bombPopupAutoTimer);$('bombPopup').classList.add('hidden');
      $('bombPopup').classList.remove('bomb-pop-critical');
      // Al guardar o colocar una bomba, se permite un nuevo aviso si se recupera después.
      if(state.phase==='playing'&&!isBomb(activeToken()))bombPopupToken=null;
    }
    function updateBombHUD(){
      const token=activeToken(),active=state.phase==='playing'&&isBomb(token);
      $('bombWarning').classList.toggle('hidden',!active);
      if(!active){hideBombPopup();return;}
      const total=Math.max(1,token.fuseTotal||BOMB_FUSE(state.floor));
      const left=Math.max(0,token.fuseLeft||0);
      const pct=Math.min(100,Math.max(0,left/total*100));
      $('bombSeconds').textContent=bombTimerText(token);
      $('bombBar').style.width=pct+'%';
      $('bombPopupTime').textContent=left.toFixed(1);
      $('bombCompactTime').textContent=left.toFixed(1)+'s';
      $('bombPopupBar').style.width=pct+'%';
      $('bombDial').style.setProperty('--angle',(pct*3.6)+'deg');
      $('bombPopupAdvice').textContent=state.selected>=0?'Bomba recuperada: colócala antes de que explote.':
        (state.stored.length<state.capacity?'¡Una casilla verde o GUARDAR!':'¡Tu mochila está llena! Colócala ya.');
      $('bombPopupStore').disabled=state.selected>=0||state.stored.length>=state.capacity||state.iceLockTurns>0||state.eraseMode||state.managerOpen;
      $('bombPopupDefuse').disabled=state.defusers<=0||state.managerOpen;
      $('bombPopupDefuse').textContent='🧯 Desactivar ('+state.defusers+')';
      const popup=$('bombPopup');
      popup.classList.toggle('bomb-pop-critical',left<=4);
      if(bombPopupToken!==token){
        bombPopupToken=token;bombPopupExpandedByUser=false;
        popup.classList.remove('bomb-pop-compact','bomb-pop-enter');void popup.offsetWidth;
        popup.classList.add('bomb-pop-enter');
        $('bombAnnouncement').textContent='¡Atención! Ha aparecido una bomba. Tienes '+Math.ceil(left)+' segundos para colocarla, guardarla o desactivarla.';
        sfx('bombSpawn');flash('#fb7185');particles($('currentUI'),24);comboBanner('💣 ¡BOMBA!');pulseError($('board'));
        if(!prefersReduced&&navigator.vibrate)navigator.vibrate([80,45,110]);
        clearTimeout(bombPopupAutoTimer);
        bombPopupAutoTimer=setTimeout(()=>{if(state.phase==='playing'&&activeToken()===token&&!bombPopupExpandedByUser)minimizeBombPopup();},3300);
      }
      popup.classList.remove('hidden');
    }
    function createToken(forcedType=null){
      let type=forcedType;
      if(!type){
        // Leyenda: 0,1% por generación natural desde el piso 3, sin depender del trébol.
        if(state.floor>=3 && Math.random()<.001)type='miracle';
        else {
          const rule=floorPressure(state.floor),positive=['green','blue','purple','pink','gold','rainbow'];
          const hasBomb=state.bombsDrawnThisFloor>0||isBomb(state.current)||liveBombs().length>0;
          const weights=Object.entries(TYPES).filter(([id])=>id!=='miracle').map(([id,info])=>{
            let w=id==='normal'?info.weight:positive.includes(id)?info.weight*rule.specialFactor:info.weight*rule.hazardFactor;
            if(id==='ice'&&state.floor<5)w=0;
            if(id==='curse'&&state.floor<4)w=0;
            if(id==='bomb'&&hasBomb)w=0;
            if(state.guaranteeSpecial && !positive.includes(id))w=0;
            if(positive.includes(id)&&hasJoker('clover'))w*=1.55;
            if(id==='rainbow'&&hasJoker('prism'))w+=7*rule.specialFactor;
            return {id,w};
          });
          const total=weights.reduce((n,w)=>n+w.w,0);let roll=Math.random()*total;
          for(const item of weights){roll-=item.w;if(roll<0){type=item.id;break;}}
        }
        state.guaranteeSpecial=false;
      }
      const token={type:type||'normal',value:['gold','rainbow','miracle'].includes(type)?null:rand(1,state.max)};
      if(token.type==='bomb'){
        token.fuseTotal=BOMB_FUSE(state.floor);token.fuseLeft=token.fuseTotal;
        // Una sola bomba natural por piso para evitar muertes inevitables por acumulación.
        state.bombsDrawnThisFloor++;
      }
      return token;
    }
    function rollCurrent(){
      state.selected=-1;
      const guaranteed=state.guaranteeSpecial;
      state.current=createToken();
      if(isBomb(state.current)&&validSlots(state.current).length===0&&state.stored.length>=state.capacity){
        // No generamos bombas imposibles si la mochila ya está llena.
        for(let t=0;t<25&&validSlots(state.current).length===0;t++)state.current.value=rand(1,state.max);
        if(validSlots(state.current).length===0)state.current=createToken('normal');
      }
      // En los dos primeros pisos, evitamos números imposibles al generarlos.
      if(state.floor<=2){
        let tries=0;
        const specialTypes=['green','blue','purple','pink','gold','rainbow'];
        while(validSlots(state.current).length===0 && tries++<40){
          state.current=guaranteed?createToken(specialTypes[rand(0,specialTypes.length-1)]):createToken();
        }
        if(validSlots(state.current).length===0)state.current=createToken('gold');
      }
      render();checkStuck();
    }
    function nextFloor(){
      if(state.phase!=='shop')return;
      const upcomingFloor=state.floor+1;
      const expired=state.stored.find(t=>isBomb(t)&&t.expiresAtFloor<=upcomingFloor);
      if(expired){
        flash('#f43f5e');comboBanner('💥 ¡BOMBA OLVIDADA!');
        endRun('La bomba guardada ha caducado: debías utilizarla antes de terminar el piso '+(expired.expiresAtFloor-1)+'.');return;
      }
      state.floor=upcomingFloor;state.phase='playing';showOverlay(null);configFloor();rollCurrent();startClock();sfx('tap');toast('🏁 Piso '+state.floor);
    }
    function startRun(forceTutorial=false){
      unlockAudio();stopClock();
      if(['playing','paused','shop'].includes(state.phase))finalResult('Abandonada');
      savePlayerName();
      state.info=false;
      state.phase='playing';state.floor=1;state.coins=0;state.stored=[];state.capacity=1;state.jokers=[];state.erasers=0;state.defusers=0;state.iceLockTurns=0;state.baseRerolls=0;state.bonusRerolls=0;state.guaranteeSpecial=false;state.shopRerolls=0;state.rescueReadyFloor=1;state.managerOpen=false;state.managerFrom=null;state.lastBreaks=[];state.brokenCount=0;state.streak=0;state.maxStreak=0;state.announcedRecord=false;state.milestones=new Set();
      state.score=0;state.completedFloors=0;state.scoredSlots=new Set();state.resultSaved=false;state.lastResult=null;state.lastFloorAward=0;
      $('resultPanel').classList.add('hidden');
      showOverlay(null);configFloor();rollCurrent();startClock();startMusic();toast('✨ ¡Nueva partida!');
      if(forceTutorial || !tutorialSeen.game)startTutorial('game');
    }
    function endRun(reason){
      if(!['playing','shop'].includes(state.phase))return;
      state.phase='over';stopClock();stopMusic();sfx(reason.toLowerCase().includes('bomba')?'bomb':'error');
      $('pauseEmoji').textContent='💀';$('pauseTitle').textContent='FIN DE PARTIDA';
      $('pauseDetail').textContent='Llegaste al piso '+state.floor+' y superaste '+state.completedFloors+' pisos. '+reason;
      const rank=finalResult('Derrota');showResult(rank);
      $('resumeButton').classList.add('hidden');showOverlay('pause');render();
    }
    function pause(){
      if(state.phase!=='playing')return;
      if(tutorial.active)closeTutorial(false);
      state.phase='paused';stopClock();stopMusic();sfx('pause');
      $('pauseEmoji').textContent='⏸️';$('pauseTitle').textContent='PAUSA';
      $('pauseDetail').textContent='El cronómetro está detenido. Piso '+state.floor+' · '+fmtPoints(state.score)+' puntos.';
      $('resultPanel').classList.add('hidden');
      $('resumeButton').classList.remove('hidden');showOverlay('pause');syncAudio();render();
    }
    function resume(){
      if(state.phase!=='paused')return;
      unlockAudio();state.phase='playing';showOverlay(null);startClock();startMusic();render();
    }
    function backMenu(){
      if(['playing','paused','shop'].includes(state.phase))finalResult('Abandonada');
      state.phase='menu';stopClock();stopMusic();showOverlay('menu');render();renderRanking();
    }
    function startClock(){
      stopClock();if(tutorial.active||state.info)return;state.lastTime=performance.now();
      state.timer=setInterval(()=>{
        if(state.phase!=='playing')return;
        const now=performance.now(),elapsed=Math.max(0,(now-state.lastTime)/1000);state.timeLeft-=elapsed;state.lastTime=now;
        const bomb=activeToken();
        if(isBomb(bomb)){
          const oldSec=Math.ceil(bomb.fuseLeft);
          bomb.fuseLeft=Math.max(0,bomb.fuseLeft-elapsed);
          if(Math.ceil(bomb.fuseLeft)<oldSec && bomb.fuseLeft<=5)sfx(bomb.fuseLeft<=2?'bombCritical':'tick');
          if(bomb.fuseLeft<=0){renderHUD();flash('#f43f5e');comboBanner('💥 ¡BOOM!');endRun('La bomba explotó antes de colocarla.');return;}
        }
        if(state.timeLeft<=0){state.timeLeft=0;renderHUD();endRun('Se acabó el tiempo.');}
        else renderHUD();
      },100);
    }
    function stopClock(){if(state.timer){clearInterval(state.timer);state.timer=null;}}

    function spendTime(cost,action){
      state.timeLeft=Math.max(0,state.timeLeft-cost);renderHUD();
      if(state.timeLeft<=0){endRun('Agotaste el tiempo al usar '+action+'.');return false;}
      toast('⏳ '+action+': −'+cost+' segundos');return true;
    }
    function grantForPlaced(count,fromElement){addCoins(count*(1+(hasJoker('pig')?1:0)),fromElement);}
    function legalFill(target){
      if(target<0||target>=state.size||state.board[target])return false;
      let low=1,high=state.max;
      for(let i=target-1;i>=0;i--)if(state.board[i]&&typeof state.board[i].value==='number'){low=state.board[i].value+1;break;}
      for(let i=target+1;i<state.size;i++)if(state.board[i]&&typeof state.board[i].value==='number'){high=state.board[i].value-1;break;}
      if(low>high)return false;
      state.board[target]={type:'auto',value:Math.floor((low+high)/2)};
      return true;
    }
    function place(index){
      if(state.phase!=='playing'||state.managerOpen)return;
      if(state.eraseMode){
        if(!state.board[index]){sfx('error');return;}
        state.board[index]=null;state.erasers--;state.eraseMode=false;resetStreak();
        sfx('special');toast('🧽 Casilla liberada');render();checkStuck();return;
      }
      const token=activeToken();if(!token || !validSlots(token).includes(index)){sfx('error');pulseError($('board'));return;}
      const playedFromStorage=state.selected>=0;
      // Hielo cancela la racha del jugador, pero no bloquea el tablero.
      if(token.type==='ice')resetStreak();
      if(token.type==='curse')resetStreak();
      const element=document.querySelector('[data-board-index="'+index+'"]');
      state.board[index]={...token};
      let extra=0,extraIndices=[];let message='¡Bien colocado!';
      if(token.type==='green'){
        if(legalFill(index-1)){extra=1;extraIndices.push(index-1);message='🟩 ¡Semilla! Casilla anterior completada.';}
        else message='🟩 Semilla colocada.';
      }
      if(token.type==='blue'){
        if(legalFill(index+1)){extra=1;extraIndices.push(index+1);message='🟦 ¡Espejo! Casilla siguiente completada.';}
        else message='🟦 Espejo colocado.';
      }
      if(token.type==='rainbow'){
        const target=[index+1,index-1].find(i=>i>=0&&i<state.size&&!state.board[i]);
        if(target!==undefined){state.board[target]={type:'gold',value:null};extra=1;extraIndices.push(target);message='🌈 ¡DOBLE COMODÍN!';}
        else message='🌈 ¡Comodín arcoíris!';
      }
      if(token.type==='purple'){addTime(12);message='🟪 ¡+12 segundos!';}
      if(token.type==='pink'){addCoins(3,element);state.guaranteeSpecial=true;message='💗 +3 monedas. ¡Próximo número especial!';}
      if(token.type==='gold')message='🟨 ¡Casilla asegurada!';
      if(token.type==='bomb'){message='💣 ¡BOMBA DESACTIVADA A TIEMPO!';flash('#fb923c');comboBanner('💣 ¡SALVADO!');sfx('bombSafe');particles(element,34);}
      if(token.type==='curse'){state.timeLeft=Math.max(0,state.timeLeft-10);message='☠️ Maldición: −10 segundos · +160 puntos';flash('#ef4444');}
      if(token.type==='ice'){state.iceLockTurns=3;message='🧊 Hielo: los guardados quedan bloqueados 2 colocaciones';flash('#67e8f9');}
      if(token.type==='miracle'){
        // Las estrellas son comodines sin valor numérico: completan el tablero sin alterar el orden ya fijado.
        for(let i=0;i<state.size;i++)if(!state.board[i]){state.board[i]={type:'auto',value:null};extraIndices.push(i);}
        extra=extraIndices.length;message='🌟 ¡MILAGRO! ¡TABLERO COMPLETO!';
        flash('#e879f9');comboBanner('🌟 ¡MILAGRO LEGENDARIO!');sfx('miracle');particles($('board'),65);
      }
      // Puntuar casillas nuevas; la goma no sirve para repetir puntos.
      // La racha recompensa decidir rápido sin usar guardar/dados/borrador.
      state.streak++;state.maxStreak=Math.max(state.maxStreak,state.streak);
      const multiplier=streakMultiplier();
      const points=scoreNewCasillas([index,...extraIndices])+(token.type==='normal'?0:40)+(extra?75:0)+(token.type==='curse'?160:0)+(token.type==='bomb'?200:0)+(token.type==='miracle'?2000:0);
      addScore(points,element);
      if(state.streak===3||state.streak===5||state.streak===8){
        comboBanner('🔥 RACHA '+state.streak+' · x'+multiplier.toFixed(2));
        sfx('combo');particles(element,Math.min(36,14+state.streak*2));
      }
      if(extra){flash(token.type==='rainbow'?'#e879f9':'#4ade80');comboBanner('⚡ ¡COMBO! +75');}
      grantForPlaced(1+extra,element);
      if(extra && hasJoker('magnet'))addCoins(2,element);
      if(playedFromStorage){state.stored.splice(state.selected,1);state.selected=-1;}
      else state.current=null;
      if(state.iceLockTurns>0)state.iceLockTurns--;
      sfx(token.type==='normal'?'tap':'special');particles(element,extra?22:10);
      setStatus(message);toast(message);render();animate(document.querySelector('[data-board-index="'+index+'"]'));
      if(state.timeLeft<=0){endRun('La maldición consumió tus últimos segundos.');return;}
      if(state.board.every(Boolean)){floorClear();return;}
      if(state.current===null)rollCurrent();else {render();checkStuck();}
    }
    function checkStuck(){
      if(state.phase!=='playing'||!state.current)return;
      if(state.selected>=0){if(!validSlots(activeToken()).length)setStatus('↩️ No encaja el guardado: tócalo otra vez para volver al número de mano.');return;}
      const bombInHand=isBomb(state.current);
      const possible=validSlots(state.current).length>0 || (state.iceLockTurns===0&&!bombInHand&&state.stored.some(t=>validSlots(t).length>0));
      if(possible)return;
      if(state.stored.length<state.capacity&&state.iceLockTurns===0){setStatus(bombInHand?'💣 Guarda la bomba antes de que explote.':'📦 No encaja: guárdalo o utiliza otro.');return;}
      if(currentRerolls()>0&&!bombInHand){setStatus('🎲 Ninguno encaja: utiliza un reroll.');return;}
      if(state.erasers>0){setStatus('🧽 Puedes borrar una casilla para salir del bloqueo.');return;}
      if(state.defusers>0&&bombInHand){setStatus('🧯 Desactiva la bomba para sobrevivir.');return;}
      if(!bombInHand&&hasJoker('lifebuoy')&&!state.rescueUsed&&state.floor>=state.rescueReadyFloor){
        state.rescueUsed=true;state.current={type:'gold',value:null};state.selected=-1;
        resetStreak();
        // Se salva el bloqueo, pero el salvavidas casi siempre se rompe.
        const broke=Math.random()<.90;
        if(broke){breakRelic('lifebuoy','al rescatarte (90%)');}
        else {state.rescueReadyFloor=state.floor+3;toast('🛟 ¡Rescate! Sobrevivió, pero descansa 2 pisos');}
        sfx('special');flash('#38bdf8');comboBanner('🛟 ¡SALVADO!');render();return;
      }
      endRun('No quedan movimientos, guardados útiles ni objetos de rescate.');
    }
    function store(){
      if(state.phase!=='playing'||state.managerOpen||!state.current||state.selected>=0||state.stored.length>=state.capacity||state.eraseMode||state.iceLockTurns>0)return;
      const cost=floorPressure(state.floor).saveCost;
      if(cost&&!spendTime(cost,'Guardar'))return;
      if(isBomb(state.current)){
        // La bomba cuenta el piso actual y los dos siguientes: al empezar el cuarto, explota.
        state.current.expiresAtFloor=state.floor+3;
        sfx('bombSafe');toast('💣 Bomba guardada: úsala antes de terminar el piso '+(state.current.expiresAtFloor-1));
      }else toast('📦 Número guardado');
      state.stored.push(state.current);state.current=null;state.selected=-1;resetStreak();
      sfx('store');rollCurrent();
    }
    function selectStored(i){
      if(state.phase!=='playing'||state.managerOpen||!state.stored[i]||state.eraseMode||state.iceLockTurns>0)return;
      if(isBomb(state.current)&&state.selected<0){toast('💣 La bomba activa no permite cambiar de número. Colócala o guárdala.',true);return;}
      state.selected=state.selected===i?-1:i;sfx('tap');render();checkStuck();
    }
    function reroll(){
      if(state.phase!=='playing'||state.managerOpen||currentRerolls()<=0||state.eraseMode||isBomb(activeToken()))return;
      if(state.baseRerolls>0)state.baseRerolls--;else state.bonusRerolls--;state.selected=-1;state.current=null;resetStreak();
      const cost=floorPressure(state.floor).rerollCost;if(cost&&!spendTime(cost,'Reroll'))return;
      sfx('store');toast('🎲 ¡Nuevo número!');rollCurrent();
    }
    function toggleErase(){
      if(state.phase!=='playing'||state.managerOpen||state.erasers<=0)return;
      state.eraseMode=!state.eraseMode;state.selected=-1;sfx('tap');render();
      if(state.eraseMode)toast('🧽 Toca una casilla ocupada');
    }
    function useDefuser(){
      if(!['playing','shop'].includes(state.phase)||state.managerOpen||state.defusers<=0)return;
      let target=null;
      if(state.phase==='playing'&&isBomb(activeToken()))target=activeToken();
      else target=state.stored.find(isBomb);
      if(!target){toast('🧯 No hay ninguna bomba que desactivar');return;}
      state.defusers--;resetStreak();
      if(target===state.current){state.current=null;state.selected=-1;}
      else {
        const index=state.stored.indexOf(target);state.stored.splice(index,1);
        state.selected=-1;
      }
      sfx('bombSafe');flash('#fb923c');comboBanner('🧯 ¡DESACTIVADA!');toast('🧯 Bomba eliminada sin puntos');
      if(state.phase==='shop'){render();renderShop();return;}
      if(!state.current)rollCurrent();else{render();checkStuck();}
    }
    function floorClear(){
      if(state.phase!=='playing')return;
      stopClock();state.phase='shop';state.eraseMode=false;
      // +4 monedas y hasta +3 por acabar con tiempo de sobra.
      const bonus=4+Math.min(3,Math.floor(state.timeLeft/30));addCoins(bonus);
      state.completedFloors++;
      state.lastFloorAward=400*state.floor+Math.floor(Math.max(0,state.timeLeft)*3);
      addScore(state.lastFloorAward);
      $('shopPointsAward').textContent='⭐ Bono de piso: +'+fmtPoints(state.lastFloorAward);
      $('shopScoreTotal').textContent='TOTAL: '+fmtPoints(state.score);
      if(hasJoker('interest')&&state.coins>=8)addCoins(3);
      // Las reliquias se desgastan después de aplicar sus efectos de este piso.
      state.lastBreaks=rollEndFloorBreaks();
      sfx('win');particles($('board'),32);flash('#fde047');setStatus('🏆 Piso completado. ¡A la tienda!');
      state.shopRerolls=0;generateOffers();renderShop();render();showOverlay('shop');
      toast('🏆 ¡Piso '+state.floor+' completado!');
      if(!tutorialSeen.shop)startTutorial('shop');
    }

    // Desgaste aleatorio después de cada piso y rescate frágil.
    function breakRelic(id,reason){
      const ix=state.jokers.indexOf(id);if(ix<0)return null;
      const item=GOODS.find(x=>x.id===id);state.jokers.splice(ix,1);state.brokenCount++;
      const chip=Array.from($('jokers').children).find(x=>x.textContent.includes(item.title));
      if(chip&&!prefersReduced){const clone=chip.cloneNode(true),r=chip.getBoundingClientRect();clone.classList.add('relic-breaking');clone.style.cssText='position:fixed;z-index:90;left:'+r.left+'px;top:'+r.top+'px;pointer-events:none;';document.body.append(clone);setTimeout(()=>clone.remove(),580);}
      sfx('break');flash('#fb7185');particles($('jokers'),18);
      toast('💥 '+item.icon+' '+item.title+' se ha roto '+reason);
      renderJokers();return item;
    }
    function rollEndFloorBreaks(){
      const broken=[];
      for(const id of [...state.jokers]){
        const item=GOODS.find(x=>x.id===id);
        if(item&&Math.random()*100<breakPct(item)){const lost=breakRelic(id,'al terminar el piso');if(lost)broken.push(lost);}
      }
      if(broken.length){comboBanner('💥 '+broken.length+' RELIQUIA'+(broken.length===1?' ROTA':'S ROTAS'));}
      return broken;
    }
    function sellValue(item){return Math.max(1,Math.floor(item.price*.4));}
    function openRelicManager(){
      if(state.managerOpen||!['playing','shop'].includes(state.phase))return;
      state.managerOpen=true;state.managerFrom=state.phase;
      if(state.phase==='playing')stopClock();
      $('relicOverlay').classList.remove('hidden');$('relicOverlay').classList.add('flex');
      renderRelicManager();render();
    }
    function closeRelicManager(){
      if(!state.managerOpen)return;
      const from=state.managerFrom;state.managerOpen=false;state.managerFrom=null;
      $('relicOverlay').classList.add('hidden');$('relicOverlay').classList.remove('flex');
      if(from==='playing'&&state.phase==='playing')startClock();
      if(state.phase==='shop')renderShop();
      render();
    }
    function renderRelicManager(){
      const root=$('relicList');root.replaceChildren();
      if(!state.jokers.length){const p=document.createElement('p');p.className='text-slate-400 text-sm py-4 text-center';p.textContent='No tienes reliquias. Puedes comprar en la siguiente tienda.';root.append(p);}
      for(const id of state.jokers){
        const item=GOODS.find(x=>x.id===id),row=document.createElement('div');
        row.className='rounded-xl bg-slate-900/75 border border-white/10 p-3 flex items-center justify-between gap-2';
        const details=document.createElement('div');details.className='min-w-0 flex-1';
        const title=document.createElement('div');title.className='text-sm font-black text-white';title.textContent=item.icon+' '+item.title;
        const description=document.createElement('div');description.className='text-[11px] text-slate-400 mt-1';description.textContent=item.desc;
        const risk=document.createElement('div');risk.className='text-[11px] font-bold text-rose-300 mt-1';
        risk.textContent='💔 '+breakPct(item)+'% al completar un piso'+(id==='lifebuoy'?' · 90% si te salva':'');
        const sell=document.createElement('button');sell.type='button';sell.className='rounded-lg bg-rose-700 hover:bg-rose-600 px-3 py-2 text-xs font-black whitespace-nowrap';sell.textContent='♻️ +'+sellValue(item)+' 🪙';
        sell.addEventListener('click',()=>{
          if(!state.managerOpen)return;
          state.jokers.splice(state.jokers.indexOf(id),1);addCoins(sellValue(item),sell);sfx('buy');particles(row,12);
          toast('♻️ '+item.title+' vendida');renderRelicManager();render();if(state.phase==='shop')renderShop();
        });
        details.append(title,description,risk);row.append(details,sell);root.append(row);
      }
      $('relicFooter').textContent='Huecos: '+state.jokers.length+'/5 · La venta devuelve el 40% del precio (redondeando hacia abajo).';
    }

    function availableGoods(){return GOODS.filter(item=>item.kind!=='joker'||!hasJoker(item.id));}
    function weightedItem(options){
      const sum=options.reduce((n,o)=>n+o.weight,0);let r=Math.random()*sum;
      for(const item of options){r-=item.weight;if(r<=0)return item;}return options.at(-1);
    }
    function generateOffers(){
      const pool=availableGoods().slice();state.offers=[];
      while(pool.length&&state.offers.length<4){const pick=weightedItem(pool),idx=pool.indexOf(pick);pool.splice(idx,1);state.offers.push({...pick,sold:false});}
    }
    function purchase(index){
      if(state.phase!=='shop')return;
      const offer=state.offers[index];if(!offer||offer.sold)return;
      if(state.coins<offer.price){toast('💸 Faltan monedas',true);sfx('error');return;}
      if(offer.kind==='token'&&state.stored.length>=state.capacity){toast('📦 Inventario lleno: compra otro hueco',true);return;}
      if(offer.kind==='joker'&&(state.jokers.length>=5||hasJoker(offer.id))){toast('🃏 Vende una reliquia para dejar hueco',true);openRelicManager();return;}
      addCoins(-offer.price);offer.sold=true;
      if(offer.kind==='joker'){state.jokers.push(offer.id);if(offer.id==='lifebuoy')state.rescueReadyFloor=Math.min(state.rescueReadyFloor,state.floor+1);}
      else if(offer.kind==='token'){
        const next=FLOOR[Math.min(state.floor,FLOOR.length-1)].max+Math.max(0,state.floor-5)*60;
        const token=createToken(offer.token);if(token.value!==null)token.value=rand(1,next);
        state.stored.push(token);
      }
      else if(offer.action==='rerolls')state.bonusRerolls+=2;
      else if(offer.action==='eraser')state.erasers++;
      else if(offer.action==='defuser')state.defusers++;
      sfx('buy');toast('✨ ¡'+offer.title+' conseguido!');
      if(offer.rarity==='Legendario'){flash('#e879f9');comboBanner('🌟 ¡OBJETO LEGENDARIO!');sfx('miracle');particles($('shopCoinsUI'),55);}
      else if(offer.rarity==='Épico'){flash('#c084fc');comboBanner('💎 ¡RELIQUIA ÉPICA!');particles($('shopCoinsUI'),38);}
      else if(offer.rarity==='Raro')particles($('shopCoinsUI'),22);
      render();renderShop();particles($('shopCoinsUI'),12);
    }
    function buyCapacity(){
      if(state.phase!=='shop'||state.capacity>=3)return;
      const price=CAPACITY_PRICES[state.capacity];
      if(state.coins<price){sfx('error');toast('💸 No tienes suficientes monedas para ampliar la mochila',true);return;}
      addCoins(-price);state.capacity++;sfx('buy');flash('#38bdf8');particles($('buyCapacityButton'),26);
      comboBanner('📦 ¡NUEVO HUECO!');toast('📦 Mochila ampliada a '+state.capacity+' guardados');
      render();renderShop();
    }
    function rerollOffers(){
      if(state.phase!=='shop')return;
      const cost=2+2*state.shopRerolls;
      if(state.coins<cost){toast('💸 No tienes suficientes monedas',true);return;}
      addCoins(-cost);state.shopRerolls++;generateOffers();renderShop();sfx('store');toast('🔄 Nuevas ofertas');
    }

    function renderHUD(){
      $('floorUI').textContent=state.floor;
      setHelp($('timeUI'),'Tiempo restante','Cuando llegue a cero, termina la partida. Algunos números te dan segundos extra.');
      $('timeUI').textContent=Math.floor(Math.max(0,state.timeLeft)/60)+':'+String(Math.floor(Math.max(0,state.timeLeft)%60)).padStart(2,'0');
      $('timeUI').className='text-base sm:text-lg tabular-nums '+(state.timeLeft<16?'text-rose-400':'');
      $('rangeUI').textContent='1–'+state.max;
      $('coinsUI').textContent='🪙 '+state.coins;
      $('filledUI').textContent=state.board.filter(Boolean).length+'/'+state.size;
      $('scoreUI').textContent=fmtPoints(state.score);
      const pressure=floorPressure(state.floor);
      $('dangerUI').textContent=state.floor<=4?'🌱 Dificultad progresiva':
        '☠️ Guardar −'+pressure.saveCost+'s · Dados −'+pressure.rerollCost+'s';
      $('streakUI').textContent=state.iceLockTurns>0?'🧊 Guardados bloqueados: '+state.iceLockTurns+' turno(s)':'🔥 Racha '+state.streak+' · x'+streakMultiplier().toFixed(2);
      updateBombHUD();
    }
    function slotBounds(index){
      let low=0,high=state.max+1;
      for(let j=index-1;j>=0;j--)if(state.board[j]&&typeof state.board[j].value==='number'){low=state.board[j].value;break;}
      for(let j=index+1;j<state.size;j++)if(state.board[j]&&typeof state.board[j].value==='number'){high=state.board[j].value;break;}
      return {low,high};
    }
    function renderBoard(){
      const root=$('board');root.replaceChildren();
      const token=activeToken(),valid=state.phase==='playing'&&!state.eraseMode?validSlots(token):[];
      for(let i=0;i<state.size;i++){
        const cell=state.board[i],ok=valid.includes(i),erase=state.eraseMode&&!!cell;
        const b=document.createElement('button');b.type='button';b.dataset.boardIndex=i;
        const kind=erase?'is-erasable':cell?'is-filled':ok?'is-valid':'is-blocked';
        b.className='board-slot relative w-full rounded-lg border active:scale-[.985] '+kind+' '+(ok?'slot-available ':'')+(cell?.type==='miracle'?'rare-glow ':'');
        const index=document.createElement('span');index.className='board-slot__index';index.textContent=pos(i);
        const num=document.createElement('span');num.className='board-slot__number';num.textContent=cell?(cell.value===null?'★':cell.value):'—';
        const right=document.createElement('span');right.className='board-slot__status';
        let name,text;
        if(erase){name='Borrar casilla '+pos(i);text='Pulsa para liberar esta casilla. No recuperas los puntos que ya habías ganado.';right.textContent='BORRAR';}
        else if(cell){
          const type=cell.type==='auto'?'auto':cell.type;
          const typeName=TYPES[type]?.name || 'Automático';
          const icon=cell.type==='auto'?'sparkle':GLYPH_MAP[TYPES[type]?.icon]||'digits';
          right.append(makeGlyph(icon),document.createTextNode(typeName));
          name='Casilla '+pos(i)+' · '+(cell.value===null?'comodín':cell.value);
          text=TYPE_HELP[type]||'Este hueco ya está ocupado.';
        }else if(ok){right.textContent='VÁLIDO';name='Casilla '+pos(i)+' · disponible';
          const bounds=slotBounds(i);
          text='Puedes colocar aquí '+(token.value===null?'este comodín':'el '+token.value)+'. '+(token.value!==null?'Debe estar entre '+bounds.low+' y '+bounds.high+'.':'No altera los límites de orden.');
        }else{right.textContent='SIN HUECO';name='Casilla '+pos(i)+' · no disponible';
          text=state.phase!=='playing'?'Comienza una partida para colocar números.':!token?'No hay ningún número en mano.':'Aquí no encaja tu número. Solo puedes usar casillas verdes para mantener el orden.';
        }
        setHelp(b,name,text);
        b.setAttribute('aria-label',name+'. '+text);
        b.append(index,num,right);
        b.addEventListener('click',()=>{unlockAudio();place(i);});root.append(b);
      }
    }
    function renderStorage(){
      const root=$('storage');root.replaceChildren();
      for(let i=0;i<3;i++){
        const token=state.stored[i],locked=i>=state.capacity,b=document.createElement('button');b.type='button';
        const selected=state.selected===i;
        b.className='min-w-0 rounded-lg border h-11 sm:h-12 text-center transition active:scale-95 '+(locked?'bg-slate-950/90 border-dashed border-slate-700 opacity-70':selected?'bg-sky-800 border-sky-300 ring-2 ring-sky-400/50':isBomb(token)?'bg-rose-900/80 border-rose-400 bomb-alert':token?'bg-slate-700 border-white/15':'bg-slate-900/50 border-dashed border-white/15');
        const top=document.createElement('div');top.className='text-sm font-black';top.textContent=locked?'🔒':token?(TYPES[token.type].icon+' '+(token.value===null?'★':token.value)):'+';
        const bottom=document.createElement('div');bottom.className='text-[9px] text-slate-300 truncate px-1';
        bottom.textContent=locked?'Compra en tienda':isBomb(token)?'Hasta piso '+(token.expiresAtFloor-1):token?TYPES[token.type].name:'Vacío';
        setHelp(b,locked?'Espacio bloqueado':token?TYPES[token.type].name:'Espacio disponible',locked?'Compra otro hueco de guardado en la tienda.':token?(TYPE_HELP[token.type]+' '+(isBomb(token)?'Mecha pausada: '+bombTimerText(token)+'. Usar antes del piso '+token.expiresAtFloor+'.':'Pulsa para usar este número guardado.')):'Puedes guardar aquí un número para usarlo después.');
        b.append(top,bottom);b.disabled=locked||!token||state.phase!=='playing'||state.eraseMode||state.iceLockTurns>0||(isBomb(state.current)&&state.selected<0);
        b.addEventListener('click',()=>selectStored(i));root.append(b);
      }
      $('storedCountUI').textContent=state.stored.length+'/'+state.capacity;
      $('storageLockUI').textContent=state.iceLockTurns>0?'🧊 '+state.iceLockTurns+' turnos':'';
    }
    function renderJokers(){
      const root=$('jokers');root.replaceChildren();
      if(!state.jokers.length){const p=document.createElement('span');p.className='text-xs text-slate-500';p.textContent='Todavía no tienes reliquias.';root.append(p);}
      for(const id of state.jokers){
        const item=GOODS.find(x=>x.id===id),d=document.createElement('button');
        d.type='button';setHelp(d,item.title,item.desc+' Riesgo de romperse al superar un piso: '+breakPct(item)+'%. Pulsa para gestionarla.');
        d.className='joker-shine rounded-lg px-2 py-1 text-[11px] bg-indigo-500/20 border border-indigo-300/25 text-indigo-100 font-semibold active:scale-95';
        d.textContent=item.icon+' '+item.title+' · 💔'+breakPct(item)+'%';
        d.addEventListener('click',openRelicManager);root.append(d);
      }
      $('jokerCountUI').textContent=state.jokers.length+'/5';
      $('shopRelicCount').textContent=state.jokers.length+'/5';
    }
    function render(){
      renderHUD();renderBoard();renderStorage();renderJokers();
      const active=activeToken();
      if(helpAnchor && !helpPinned)hideHelp();
      $('currentUI').textContent=active?(active.value===null?'★':active.value):'—';
      $('kindUI').textContent=active?TYPES[active.type].icon+' '+TYPES[active.type].name:'Sin número';
      $('kindUI').className='text-xs font-semibold leading-snug '+(active?TYPES[active.type].color:'text-slate-300');
      const description=active?TYPE_HELP[active.type]:'Cada número tiene su lugar.';
      $('currentDescription').textContent=description;
      setHelp($('currentCard'),active?TYPES[active.type].name+(active.value===null?'':' · '+active.value):'Número en mano',description);
      setHelp($('storeButton'),'Guardar número','Guarda temporalmente el número que tienes en mano. Empiezas con un hueco de inventario; comprarás más en la tienda.');
      setHelp($('rerollButton'),'Volver a tirar','Descarta el número actual y muestra otro al azar. El número de cambios está limitado por piso.');
      setHelp($('eraserButton'),'Goma mágica','Si tienes una goma, puedes borrar una casilla ocupada para corregir tu estrategia.');
      setHelp($('defuseButton'),'Kit antibombas','Si tienes un kit, elimina una bomba activa o guardada. No da puntos por la eliminación.');
      $('storeButton').disabled=state.phase!=='playing'||state.managerOpen||!state.current||state.selected>=0||state.stored.length>=state.capacity||state.eraseMode||state.iceLockTurns>0;
      $('rerollButton').disabled=state.phase!=='playing'||state.managerOpen||currentRerolls()<=0||state.eraseMode||isBomb(active);
      $('rerollCount').textContent=currentRerolls();
      $('eraserButton').disabled=state.phase!=='playing'||state.managerOpen||state.erasers<=0;
      $('eraserButton').classList.toggle('ring-2',state.eraseMode);$('eraserButton').classList.toggle('ring-rose-300',state.eraseMode);
      $('eraserCount').textContent=state.erasers;
      $('defuseButton').disabled=state.phase!=='playing'||state.managerOpen||state.defusers<=0||(!isBomb(active)&&liveBombs().length===0);
      $('defuseCount').textContent=state.defusers;
      $('pauseButton').disabled=state.phase!=='playing'||state.managerOpen;
      $('manageRelicsButton').disabled=!['playing','shop'].includes(state.phase)||state.managerOpen;
      $('infoButton').setAttribute('aria-expanded',String(state.info));
      $('infoPanel').classList.toggle('hidden',!state.info);
    }
    function renderShop(){
      setHelp($('shopCards'),'Ofertas de la tienda','Elige cartas para comprar. Cada objeto muestra su efecto, precio y rareza.');
      setHelp($('buyCapacityButton'),'Más espacios para guardar','Compra el segundo espacio por 8 monedas y el tercero por 14. Son mejoras para esta partida.');
      setHelp($('shopManageRelicsButton'),'Gestionar reliquias','Puedes llevar cinco reliquias; tienen probabilidad de romperse. Aquí puedes venderlas para recuperar monedas.');
      setHelp($('nextFloorButton'),'Siguiente piso','Termina tus compras y empieza el próximo piso, con una dificultad mayor.');
      $('shopCoinsUI').textContent='🪙 '+state.coins;
      const cost=2+state.shopRerolls*2;
      $('shopRerollButton').textContent='🔄 Ofertas · '+cost+' 🪙';$('shopRerollButton').disabled=state.coins<cost;
      $('capacityDescription').textContent=state.capacity>=3?'3/3 desbloqueados · Mochila al máximo':state.capacity+'/3 desbloqueados · Mejora permanente durante esta partida';
      const price=CAPACITY_PRICES[state.capacity];
      $('buyCapacityButton').textContent=state.capacity>=3?'✅ MÁXIMO':price+' 🪙 · DESBLOQUEAR';
      $('buyCapacityButton').disabled=state.capacity>=3||state.coins<price;
      const bombs=liveBombs(),bombNotice=$('shopBombNotice');
      bombNotice.classList.toggle('hidden',bombs.length===0);
      $('shopBombText').textContent=bombs.length?'💣 ¡BOMBA GUARDADA! Debes usarla antes de terminar el piso '+Math.min(...bombs.map(b=>b.expiresAtFloor-1))+' o perderás toda la partida.':'';
      $('shopDefuseButton').textContent='🧯 Desactivar bomba ('+state.defusers+' kits)';
      $('shopDefuseButton').disabled=state.defusers<=0;
      const root=$('shopCards');root.replaceChildren();
      state.offers.forEach((it,i)=>{
        const card=document.createElement('article');
        const color=it.rarity==='Legendario'?'border-yellow-300/80 bg-fuchsia-800/40 rare-glow':it.rarity==='Épico'?'border-fuchsia-400/60 bg-fuchsia-900/20':it.rarity==='Raro'?'border-sky-400/50 bg-sky-900/20':'border-white/15 bg-slate-900/70';
        card.className='shop-card '+(it.sold?'sold opacity-50 ':'')+'rounded-xl p-2.5 sm:p-3 border flex flex-col '+color;
        setHelp(card,it.title,it.desc+(it.kind==='joker'?' Riesgo de rotura: '+breakPct(it)+'% por piso.':'')+' Precio: '+it.price+' monedas.');
        const headline=document.createElement('div');headline.className='flex justify-between items-start gap-1';
        const emoji=document.createElement('span');emoji.className='text-2xl sm:text-3xl';emoji.textContent=it.icon;
        const rarity=document.createElement('span');rarity.className='text-[9px] rounded px-1.5 py-1 border border-white/15 text-slate-300';rarity.textContent=it.rarity;
        headline.append(emoji,rarity);
        const helpButton=document.createElement('button');helpButton.type='button';helpButton.className='help-dot ml-auto';helpButton.textContent='i';helpButton.setAttribute('aria-label','Detalles de '+it.title);helpButton.dataset.helpToggle='parent';headline.insertBefore(helpButton,rarity);
        const title=document.createElement('strong');title.className='text-xs sm:text-sm mt-2 leading-tight';title.textContent=it.title;
        const desc=document.createElement('p');desc.className='text-[10px] sm:text-xs text-slate-400 mt-1 flex-1 leading-snug';desc.textContent=it.desc+(it.kind==='joker'?' · 💔 '+breakPct(it)+'% rotura/piso':'');
        const btn=document.createElement('button');btn.className='rounded-lg mt-2 py-2 text-xs font-black '+(it.sold?'bg-slate-700 text-slate-400':'bg-yellow-300 hover:bg-yellow-200 text-slate-950 disabled:bg-slate-600 disabled:text-slate-300');
        const full=it.kind==='token'&&state.stored.length>=state.capacity;
        const limit=it.kind==='joker'&&state.jokers.length>=5;
        btn.textContent=it.sold?'COMPRADO':full?'SIN ESPACIO':limit?'⚙️ VENDER UNA':it.price+' 🪙 · COMPRAR';
        btn.disabled=it.sold||state.coins<it.price||full;
        btn.addEventListener('click',()=>{unlockAudio();if(limit)openRelicManager();else purchase(i);});
        card.append(headline,title,desc,btn);root.append(card);
      });
      $('shopNote').textContent='Guardados '+state.stored.length+'/'+state.capacity+' · Reliquias '+state.jokers.length+'/5 · ⚠️ Las reliquias pueden romperse al superar pisos';
      const notice=$('shopBreakNotice');notice.classList.toggle('hidden',state.lastBreaks.length===0);
      notice.textContent=state.lastBreaks.length?'💥 ¡Rotura! '+state.lastBreaks.map(x=>x.icon+' '+x.title).join(' · ')+' — puedes comprar otras para recuperarte.':'';
    }

    // Botones, opciones y atajos.
    $('playButton').addEventListener('click',()=>startRun());
    $('menuTutorialButton').addEventListener('click',()=>startRun(true));
    $('repeatTutorialButton').addEventListener('click',()=>{if(state.phase==='playing')startTutorial('game');else if(state.phase==='shop')startTutorial('shop');else startRun(true);});
    $('pauseButton').addEventListener('click',pause);
    $('resumeButton').addEventListener('click',resume);
    $('restartButton').addEventListener('click',()=>startRun());
    $('menuButton').addEventListener('click',backMenu);
    $('nextFloorButton').addEventListener('click',nextFloor);
    $('shopRerollButton').addEventListener('click',()=>{unlockAudio();rerollOffers();});
    $('manageRelicsButton').addEventListener('click',openRelicManager);
    $('shopManageRelicsButton').addEventListener('click',openRelicManager);
    $('closeRelicButton').addEventListener('click',closeRelicManager);
    $('storeButton').addEventListener('click',()=>{unlockAudio();store();});
    $('rerollButton').addEventListener('click',()=>{unlockAudio();reroll();});
    $('eraserButton').addEventListener('click',()=>{unlockAudio();toggleErase();});
    $('defuseButton').addEventListener('click',()=>{unlockAudio();useDefuser();});
    $('bombPopupStore').addEventListener('click',()=>{unlockAudio();store();});
    $('bombPopupDefuse').addEventListener('click',()=>{unlockAudio();useDefuser();});
    $('bombMinimize').addEventListener('click',minimizeBombPopup);
    $('bombCollapsed').addEventListener('click',expandBombPopup);
    $('buyCapacityButton').addEventListener('click',()=>{unlockAudio();buyCapacity();});
    $('shopDefuseButton').addEventListener('click',()=>{unlockAudio();useDefuser();});
    function toggleGuide(force){
      const open=typeof force==='boolean'?force:!state.info;
      state.info=open;
      if(open&&state.phase==='playing')stopClock();
      if(!open&&state.phase==='playing'&&!tutorial.active&&!state.managerOpen)startClock();
      render();
      if(open){requestAnimationFrame(()=>$('infoPanel').scrollIntoView({behavior:prefersReduced?'instant':'smooth',block:'start'}));}
      else if(state.phase==='playing')window.scrollTo({top:0,behavior:prefersReduced?'instant':'smooth'});
    }
    $('infoButton').addEventListener('click',()=>toggleGuide());
    $('closeInfoButton').addEventListener('click',()=>toggleGuide(false));
    addEventListener('keydown',e=>{
      if(tutorial.active && (e.key==='ArrowRight'||e.key==='Enter'&&e.target===document.body)){e.preventDefault();$('tutorialNext').click();return;}
      if(tutorial.active && e.key==='ArrowLeft'){e.preventDefault();$('tutorialPrev').click();return;}
      if(e.key==='Escape'){if(tutorial.active){closeTutorial();return;}if(state.managerOpen)closeRelicManager();else if(state.phase==='playing')pause();else if(state.phase==='paused')resume();return;}
      if(tutorial.active||state.phase!=='playing'||state.managerOpen||e.target instanceof HTMLInputElement)return;
      if(e.key.toLowerCase()==='g')store();
      else if(e.key.toLowerCase()==='r')reroll();
      else if(e.key.toLowerCase()==='e')toggleErase();
      else if('1234567890'.includes(e.key)&&e.key.length===1)place(e.key==='0'?9:Number(e.key)-1);
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='playing'){if(tutorial.active)closeTutorial(false);pause();}});
    // Compartir resultados, ranking persistente y nombre de jugador.
    $('playerName').addEventListener('change',savePlayerName);
    $('playerName').addEventListener('blur',savePlayerName);
    $('shareResultButton').addEventListener('click',()=>shareResult(state.lastResult));
    $('shareBestButton').addEventListener('click',()=>shareResult(records[0]));
    try{$('playerName').value=localStorage.getItem(NAME_KEY)||'';}catch(_){storageAvailable=false;}
    loadRecords();renderRanking();
    // Estado inicial del juego
    state.board=Array(5).fill(null);syncAudio();render();showOverlay('menu');
