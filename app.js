/* Native, dependency-free navigation and on-demand media loading. */
const names=['Portfolio','Get to know me','Skills','Biu!Tea and Me','The Hague App','Fashion, belonging & storytelling','And of course, Kors','Why Me?','Let’s Connect!'];
const stage=document.querySelector('#stage'),links=[...document.querySelectorAll('nav a')];
const mediaControls=document.querySelector('#media-controls'),pause=document.querySelector('#pause'),sound=document.querySelector('#sound');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let current=0,paused=reduced.matches,muted=false;
const videos=()=>[...stage.querySelectorAll('video')];
let mediaResizeObserver;

/* Keep native video outside SVG foreignObject. WebKit otherwise composites it
   at the wrong origin or above later artwork. SVG slices preserve paint order. */
function prepareVideoLayers(){
 mediaResizeObserver?.disconnect();
 const art=stage.querySelector('svg.artboard');
 const objects=[...art.querySelectorAll('foreignObject')];
 if(!objects.length)return;
 art.classList.add('measure-media');
 // Use one shared viewport: getCTM stops at nested SVG viewports.
 const rootInverse=art.getScreenCTM().inverse();
 const definitions=[...art.querySelectorAll('defs')];
 const clips=new Map([...art.querySelectorAll('clipPath')].map(c=>[c.id,c]));
 const width=art.viewBox.baseVal.width,height=art.viewBox.baseVal.height;
 const frame=document.createElement('div');frame.className='artboard-stack';
 frame.setAttribute('role','group');frame.setAttribute('aria-label',art.getAttribute('aria-label'));
 const space=document.createElement('div');space.className='artboard-space';
 space.style.width=width+'px';space.style.height=height+'px';frame.append(space);
 const nativeLayers=objects.map(object=>{
  const video=object.querySelector('video');
  const w=object.width.baseVal.value,h=object.height.baseVal.value;
  const matrix=rootInverse.multiply(object.getScreenCTM()).translate(object.x.baseVal.value,object.y.baseVal.value);
  const box=document.createElement('div');box.className='html-video-layer';
  box.style.width=w+'px';box.style.height=h+'px';
  box.style.transform=`matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`;
  let parent=box;
  const sourceMotion=object.closest('.motion');
  if(sourceMotion){
   const motion=document.createElement('div');motion.className=sourceMotion.getAttribute('class');
   motion.style.cssText=sourceMotion.getAttribute('style')||'';
   motion.style.width='100%';motion.style.height='100%';parent.append(motion);parent=motion;
  }
  for(let ancestor=object.parentElement;ancestor&&ancestor!==art;ancestor=ancestor.parentElement){
   const reference=ancestor.getAttribute('clip-path')?.match(/#([^)'\"]+)/)?.[1];
   const clip=clips.get(reference);
   if(!clip)continue;
   const local=matrix.inverse().multiply(rootInverse.multiply(ancestor.getScreenCTM()));
   for(const shape of clip.children){
    let points;
    if(shape.localName==='rect'){
     const x=shape.x.baseVal.value,y=shape.y.baseVal.value,cw=shape.width.baseVal.value,ch=shape.height.baseVal.value;
     points=[{x,y},{x:x+cw,y},{x:x+cw,y:y+ch},{x,y:y+ch}];
    }else if(shape.localName==='path'){
     const length=shape.getTotalLength(),count=Math.min(1200,Math.max(180,Math.ceil(length/2)));
     points=Array.from({length:count},(_,i)=>shape.getPointAtLength(length*i/count));
    }else continue;
    const crop=document.createElement('div');crop.className='html-video-crop';
    const polygon='polygon('+points.map(point=>{
     const p=new DOMPoint(point.x,point.y).matrixTransform(local);
     return `${p.x.toFixed(3)}px ${p.y.toFixed(3)}px`;
    }).join(',')+')';
    crop.style.clipPath=polygon;crop.style.webkitClipPath=polygon;
    parent.append(crop);parent=crop;
   }
  }
  return {box,parent,video};
 });
 // Ranges clone the ancestor chain on either side of each video, retaining
 // nested viewBoxes, transforms, opacity, clips and foreground decorations.
 function addSlice(previous,next,index){
  const range=document.createRange();
  if(previous)range.setStartAfter(previous);else range.setStart(art,0);
  if(next)range.setEndBefore(next);else range.setEnd(art,art.childNodes.length);
  const fragment=range.cloneContents();
  fragment.querySelectorAll('defs').forEach(d=>d.remove());
  const svg=art.cloneNode(false);svg.classList.remove('measure-media');svg.classList.add('artboard-slice');
  svg.removeAttribute('role');svg.removeAttribute('aria-label');
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  definitions.forEach(d=>[...d.children].forEach(child=>defs.append(child.cloneNode(true))));
  svg.append(defs,fragment);
  const ids=new Map([...defs.querySelectorAll('[id]')].map(el=>[el.id,el.id+'-slice-'+index]));
  for(const el of svg.querySelectorAll('*')){
   if(ids.has(el.id))el.id=ids.get(el.id);
   for(const attribute of ['clip-path','mask','filter','fill','stroke']){
    const value=el.getAttribute(attribute);if(!value)continue;
    el.setAttribute(attribute,value.replace(/url\(#([^)]*)\)/g,(all,id)=>ids.has(id)?`url(#${ids.get(id)})`:all));
   }
  }
  space.append(svg);
 }
 objects.forEach((object,i)=>{addSlice(i?objects[i-1]:null,object,i);space.append(nativeLayers[i].box);});
 addSlice(objects[objects.length-1],null,objects.length);
 nativeLayers.forEach(({parent,video})=>parent.append(video));
 art.replaceWith(frame);
 const resize=()=>{space.style.transform=`scale(${frame.clientWidth/width})`;};
 resize();mediaResizeObserver=new ResizeObserver(resize);mediaResizeObserver.observe(frame);
}
function updateButtons(){document.querySelector('#previous').disabled=current===1;document.querySelector('#next').disabled=current===9;pause.textContent=paused?'Play':'Pause';sound.textContent=muted?'Sound off':'Sound on';sound.setAttribute('aria-pressed',String(!muted));}
function attachVideos(){
 const list=videos();mediaControls.hidden=!list.length;
 list.forEach(v=>{v.muted=muted;v.controls=false;v.src=v.dataset.src;v.preload='metadata';
  if(!paused)v.play().catch(()=>{paused=true;updateButtons();});
  const toggle=()=>{if(v.paused){v.play().catch(()=>{});paused=false;}else{v.pause();paused=true;}updateButtons();};
  v.addEventListener('click',toggle);v.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle();}});
  v.addEventListener('ended',()=>{if(videos().every(x=>x.paused)){paused=true;updateButtons();}});
  v.addEventListener('error',()=>{v.controls=true;});
 });updateButtons();
}
function show(n){
 n=Math.min(9,Math.max(1,n));if(n===current)return;
 videos().forEach(v=>{v.pause();v.removeAttribute('src');v.load();});
 if(current!==0||n!==1)stage.replaceChildren(document.querySelector('#page-'+n).content.cloneNode(true));
 current=n;paused=reduced.matches;stage.classList.remove('page-enter');void stage.offsetWidth;stage.classList.add('page-enter');
 links.forEach((a,i)=>{if(i+1===n)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.title=names[n-1]+' — Eszter Szabó';document.querySelector('#page-label').textContent=n+' / 9 · '+names[n-1];
 prepareVideoLayers();attachVideos();
}
function fromHash(){const match=location.hash.match(/^#page-([1-9])$/);show(match?Number(match[1]):1);}
window.addEventListener('hashchange',fromHash);
function navigate(n){history.pushState(null,'','#page-'+n);show(n);}
window.addEventListener('popstate',fromHash);
links.forEach((a,i)=>a.addEventListener('click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();navigate(i+1);}));
document.querySelector('#previous').onclick=()=>{if(current>1)navigate(current-1);};
document.querySelector('#next').onclick=()=>{if(current<9)navigate(current+1);};
document.querySelector('#replay').onclick=()=>{paused=false;videos().forEach(v=>{v.currentTime=0;v.play().catch(()=>{paused=true;updateButtons();});});updateButtons();};
pause.onclick=()=>{paused=!paused;videos().forEach(v=>{if(paused)v.pause();else v.play().catch(()=>{});});updateButtons();};
sound.onclick=()=>{muted=!muted;videos().forEach(v=>v.muted=muted);updateButtons();};
document.addEventListener('keydown',e=>{if(e.target.closest('button,video,a,input,textarea'))return;if(e.key==='ArrowRight'&&current<9)navigate(current+1);if(e.key==='ArrowLeft'&&current>1)navigate(current-1);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){videos().forEach(v=>v.pause());paused=true;updateButtons();}});
fromHash();
