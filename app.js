/* Native, dependency-free navigation and on-demand media loading. */
const names=['Portfolio','Get to know me','Skills','Biu!Tea and Me','The Hague App','Fashion, belonging & storytelling','And of course, Kors','Why Me?','Let’s Connect!'];
const stage=document.querySelector('#stage'),links=[...document.querySelectorAll('nav a')];
const mediaControls=document.querySelector('#media-controls'),pause=document.querySelector('#pause'),sound=document.querySelector('#sound');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let current=0,paused=reduced.matches,muted=false;
const videos=()=>[...stage.querySelectorAll('video')];
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
 attachVideos();
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
