/* Ice Age Whole Site Configuration — safe editable site content with GitHub publishing.
   Page copy, backgrounds, mascots, styles, animations and custom section blocks. */
(function(){
"use strict";
const K="iceWholeSiteConfigV1";
const initial={
 text:{
  brand:"❄️ Jelajah Dunia Ais",siteTitle:"Perpustakaan Maya Zaman Air Batu",
  navHome:"🏠 Perpustakaan",navSources:"📚 E-Sumber",navGuru:"✏️ Guru",
  navAudio:"🎚️ Audio",navGesture:"✋ Gesture Flip",
  welcomeStamp:"✦ ❄️ JELAJAH DUNIA AIS ❄️ ✦",welcomeTitle:"PERPUSTAKAAN MAYA ZAMAN AIR BATU",
  welcomeSubtitle:"Jelajah Dunia Ais — pengembaraan Sejarah Tahun 4",
  welcomeDescription:"Selamat datang, Penjelajah Cilik! Bersediakah kamu untuk meneroka dunia Zaman Air Batu?",
  welcomeButton:"MASUK KE PERPUSTAKAAN ✨",animalCaption:"🦣 Mari jelajah dunia ais!",
  libraryTitle:"Perpustakaan Ais",libraryDescription:"Pilih sebuah buku untuk memulakan pengembaraan kamu!",
  libraryHint:"✨ Klik buku untuk membaca, mendengar cerita dan menjawab soalan ✨",
  readerBack:"← Kembali ke rak buku",
  readerInstruction:"📖 Gestur selfie: cubit ibu jari dan telunjuk di kanan, seret ke kiri, kemudian lepaskan untuk menyelak halaman. Tetikus dan sentuhan juga disokong.",
  readerPrevious:"← Sebelum",readerNarrate:"🔊 Dengar Cerita",readerStop:"⏹ Henti",readerNext:"Seterusnya →",
  sourcesTitle:"📚 Pusat E-Sumber & Sumber Rujukan",
  sourcesIntro:"Ruang rujukan untuk pengembaraan Zaman Air Batu. Semak maklumat penulis, tajuk, tahun dan pautan sumber asal sebelum digunakan. Penilaian 5K: Kredibiliti, Ketepatan, Konteks, Kesepadanan dan Keselamatan.",
  sourcesNotice:"Senarai asal hanyalah cadangan institusi dan belum disahkan sebagai rujukan akademik. Guru boleh menambah sumber yang sebenar.",
  teacherTitle:"Panel Suntingan Guru",
  teacherNotice:"Semua halaman dan bahan boleh disunting di sini. Simpan draf dan terbit melalui GitHub untuk dikongsi kepada murid.",
  footer:"Sejarah Tahun 4 · KSSR Semakan · Bahan interaktif boleh disunting oleh guru"
 },
 images:{welcome:"art/ice-age-landscape.svg",library:"art/ice-cave-library.svg",
  mammoth:"art/story-mammoth.svg",tiger:"art/story-sabertooth.svg"},
 design:{ink:"#214c69",paper:"#fff7e8",accent:"#3587b0",font:"Trebuchet MS",
  width:1320,snow:"snow",animals:true,animalMotion:true,animalScale:100,
  mammothSize:100,tigerSize:100,mammothLibrarySize:100,tigerLibrarySize:100,
  mammothOffsetX:0,mammothOffsetY:0,tigerOffsetX:0,tigerOffsetY:0,gestureSensitivity:17},
 audio:{music:"",volume:35},
 blocks:{welcome:[],library:[],reader:[],resources:[],edit:[]}
};
const d=v=>JSON.parse(JSON.stringify(v));
const max=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number(v)||0));
const str=v=>String(v==null?"":v);
const colors=v=>/^#[a-fA-F0-9]{6}$/.test(str(v));
const asset=v=>/^https:\/\/[^\s"'<>()]+$/i.test(str(v))||
 /^art\/[\w./-]+\.(svg|webp|png|jpg|jpeg|gif)$/i.test(str(v))||
 /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(str(v));
const http=v=>/^https:\/\/[^\s"'<>()]+$/i.test(str(v));
const groups=[
 ["🏠 首页",["welcomeStamp","welcomeTitle","welcomeSubtitle","welcomeDescription","welcomeButton","animalCaption"]],
 ["🧭 网站名称与菜单",["brand","siteTitle","navHome","navSources","navGuru","navAudio","navGesture","footer"]],
 ["📚 图书馆",["libraryTitle","libraryDescription","libraryHint"]],
 ["📖 阅读器",["readerBack","readerInstruction","readerPrevious","readerNarrate","readerStop","readerNext"]],
 ["🔎 E-Sumber",["sourcesTitle","sourcesIntro","sourcesNotice"]],
 ["✏️ Guru",["teacherTitle","teacherNotice"]]
];
const sections=[["welcome","首页 Welcome"],["library","图书馆 Library"],
 ["reader","阅读 Reader"],["resources","参考资料 E-Sumber"],["edit","教师后台 Guru"]];
function normalize(raw){
 const out=d(initial);if(!raw||typeof raw!=="object")return out;
 for(const key of Object.keys(out.text)){
  if(typeof raw.text?.[key]==="string")out.text[key]=raw.text[key].slice(0,6000);
 }
 for(const key of Object.keys(out.images)){
  if(asset(raw.images?.[key]))out.images[key]=raw.images[key];
 }
 for(const key of ["ink","paper","accent"]){
  if(colors(raw.design?.[key]))out.design[key]=raw.design[key];
 }
 if(["Trebuchet MS","Comic Sans MS","Verdana","Georgia","Arial"].includes(raw.design?.font))
  out.design.font=raw.design.font;
 if(Number.isFinite(Number(raw.design?.width)))out.design.width=max(raw.design.width,880,1650);
 if(["snow","gentle","off"].includes(raw.design?.snow))out.design.snow=raw.design.snow;
 if(typeof raw.design?.animals==="boolean")out.design.animals=raw.design.animals;
 if(typeof raw.design?.animalMotion==="boolean")out.design.animalMotion=raw.design.animalMotion;
 if(Number.isFinite(Number(raw.design?.animalScale)))out.design.animalScale=max(raw.design.animalScale,30,500);
 for(const key of ["mammothSize","tigerSize","mammothLibrarySize","tigerLibrarySize"]){
  if(Number.isFinite(Number(raw.design?.[key])))out.design[key]=max(raw.design[key],30,500);
 }
 for(const key of ["mammothOffsetX","tigerOffsetX"]){
  if(Number.isFinite(Number(raw.design?.[key])))out.design[key]=max(raw.design[key],-250,350);
 }
 for(const key of ["mammothOffsetY","tigerOffsetY"]){
  if(Number.isFinite(Number(raw.design?.[key])))out.design[key]=max(raw.design[key],-150,250);
 }
 if(Number.isFinite(Number(raw.design?.gestureSensitivity)))out.design.gestureSensitivity=max(raw.design.gestureSensitivity,10,26);
 if(typeof raw.audio?.music==="string"&&(!raw.audio.music||http(raw.audio.music)))out.audio.music=raw.audio.music;
 if(Number.isFinite(Number(raw.audio?.volume)))out.audio.volume=max(raw.audio.volume,0,100);
 for(const [key] of sections){
  if(Array.isArray(raw.blocks?.[key])){
   out.blocks[key]=raw.blocks[key].slice(0,60).filter(x=>x&&["heading","text","image","video","link"].includes(x.type))
   .map(x=>({id:str(x.id)||"b"+Math.random().toString(36).slice(2),
    type:x.type,text:str(x.text).slice(0,7000),
    url:str(x.url).slice(0,3300000),alt:str(x.alt).slice(0,500)}));
  }
 }
 return out;
}
let config=normalize(null),hasDraft=false,lastSaveError="";
try{
 const saved=localStorage.getItem(K);
 if(saved){config=normalize(JSON.parse(saved));hasDraft=true;}
}catch(error){console.warn("Site settings:",error);}
function save(){
 try{localStorage.setItem(K,JSON.stringify(config));hasDraft=true;lastSaveError="";return true;}
 catch(error){
  lastSaveError=error&&error.name==="QuotaExceededError"?
   "浏览器储存空间不足，请压缩图片或先导出 JSON。":
   "无法将编辑内容保存到浏览器："+String(error&&error.message||error);
  console.error("Site draft saving failed:",error);
  return false;
 }
}
function apply(){
 document.title=config.text.siteTitle;
 document.querySelectorAll("[data-site-key]").forEach(node=>{
  const key=node.dataset.siteKey;
  if(key in config.text && node.textContent!==config.text[key])node.textContent=config.text[key];
 });
 document.querySelectorAll(".world-story-caption").forEach(node=>{
  node.textContent=config.text.animalCaption;node.dataset.siteKey="animalCaption";
 });
 for(const [name,id] of [["welcome","welcome"],["library","library"]]){
  const node=document.getElementById(id);
  const image=config.images[name];
  if(node&&asset(image))node.style.backgroundImage=
   "linear-gradient(180deg,#27557b71,#4f95a52e,#ffffff00),url('"+image+"')";
 }
 for(const [cls,animalId] of [["world-mammoth","mammoth"],["world-sabertooth","tiger"]]){
  document.querySelectorAll("."+cls).forEach(node=>{
   const v=config.images[animalId];
   if(!asset(v))return;
   if(node.getAttribute("src")!==v)node.setAttribute("src",v);
   const welcome=!!node.closest("#welcome");
   // Set the actual width, NOT only max-width. The storybook CSS defines a
   // separate width with clamp(), so max-width alone could never enlarge it.
   const mobile=window.matchMedia("(max-width:650px)").matches;
   const preferred=welcome ? (animalId==="mammoth"?"mammothSize":"tigerSize") :
     (animalId==="mammoth"?"mammothLibrarySize":"tigerLibrarySize");
   const base=welcome?(animalId==="mammoth"?(mobile?145:415):(mobile?145:315)):
     (animalId==="mammoth"?(mobile?120:190):(mobile?120:175));
   const size=config.design.animalScale*config.design[preferred]/10000;
   node.style.setProperty("width",Math.round(base*size)+"px","important");
   node.style.setProperty("max-width","none","important");
   node.style.setProperty("height","auto","important");
   node.style.setProperty("min-width","0","important");
   node.style.setProperty("object-fit","contain","important");
   // Relative left/right positioning stays independent of the animated
   // SVG's internal trunk/tail movements.
   const x=config.design[animalId==="mammoth"?"mammothOffsetX":"tigerOffsetX"];
   const y=config.design[animalId==="mammoth"?"mammothOffsetY":"tigerOffsetY"];
   node.style.setProperty(animalId==="mammoth"?"left":"right",x+"px","important");
   node.style.setProperty("bottom",y+"px","important");
   node.style.removeProperty(animalId==="mammoth"?"right":"left");
   node.dataset.assetSource=animalId;
  });
 }
 const root=document.documentElement;
 root.style.setProperty("--ice-ink",config.design.ink);
 root.style.setProperty("--ice-paper",config.design.paper);
 root.style.setProperty("--ice-user-accent",config.design.accent);
 document.body.style.fontFamily='"'+config.design.font+'",Verdana,Arial,sans-serif';
 document.querySelectorAll(".panel").forEach(node=>node.style.backgroundColor=config.design.paper);
 const shell=document.querySelector(".shell");
 if(shell)shell.style.maxWidth=config.design.width+"px";
 document.body.classList.toggle("site-hide-animals",!config.design.animals);
 document.body.classList.toggle("site-stop-animals",!config.design.animalMotion);
 document.body.style.setProperty("--site-accent",config.design.accent);
 const sensitivity=document.getElementById("gestureSensitivity");
 if(sensitivity)sensitivity.value=str(config.design.gestureSensitivity);
 if(window.IceStoryWorld?.changeWeather)window.IceStoryWorld.changeWeather(config.design.snow);
 renderBlocks();
 updateAudio();
}
function safeMedia(block){
 const url=block.url.trim();if(!url)return null;
 if(block.type==="image"&&asset(url)){
  const el=document.createElement("img");el.src=url;el.alt=block.alt||"Ilustrasi pembelajaran";el.loading="lazy";return el;
 }
 if(block.type==="link"&&http(url)){
  const el=document.createElement("a");el.href=url;el.target="_blank";el.rel="noopener noreferrer";
  el.textContent=block.text||"Buka sumber";el.className="site-custom-link";return el;
 }
 if(block.type==="video"){
  const found=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if(found){
   const el=document.createElement("iframe");
   el.src="https://www.youtube-nocookie.com/embed/"+found[1];el.title=block.alt||"Video";
   el.loading="lazy";el.allowFullscreen=true;return el;
  }
  if(/^https:\/\/[^\s"'<>()]+\.mp4(?:\?.*)?$/i.test(url)){
   const el=document.createElement("video");el.src=url;el.controls=true;return el;
  }
 }
 return null;
}
function renderBlocks(){
 for(const [name] of sections){
  const root=document.getElementById("siteBlocks-"+name);
  if(!root)continue;
  root.replaceChildren();
  for(const block of config.blocks[name]){
   let child=null;
   if(block.type==="heading"||block.type==="text"){
    child=document.createElement(block.type==="heading"?"h3":"p");
    child.className=block.type==="heading"?"site-custom-heading":"site-custom-text";
    child.textContent=block.text;
   }else child=safeMedia(block);
   if(child)root.appendChild(child);
  }
 }
}
let music=null;
function updateAudio(){
 if(!music&&!config.audio.music)return;
 if(!music){music=document.createElement("audio");music.loop=true;music.preload="none";music.id="siteCustomMusic";document.body.append(music);}
 music.volume=config.audio.volume/100;
 if(http(config.audio.music)){
  if(music.getAttribute("data-music")!==config.audio.music){
   music.src=config.audio.music;music.dataset.music=config.audio.music;music.load();
  }
 }else{music.pause();music.removeAttribute("src");delete music.dataset.music;}
}
function playAudio(){
 if(!http(config.audio.music))return;
 updateAudio();music.play().catch(err=>console.warn("Custom music needs interaction:",err));
}
function syncAudio(){if(!music)return;
 if(window.IceSoundscape?.isPlaying?.())playAudio();else music.pause();
}
function update(path,value){
 const [scope,key]=path.split(".");
 if(!["text","images","design","audio"].includes(scope)||!(key in config[scope]))return false;
 const candidate=d(config);candidate[scope][key]=value;
 config=normalize(candidate);const saved=save();apply();return saved;
}
function importConfig(raw,storeIt){
 config=normalize(raw);if(storeIt)save();apply();return d(config);
}
function bundle(){
 return {version:1,site:d(config),books:window.IceSiteData?.getBooks?.()||[],
  sources:window.IceSiteData?.getSources?.()||[],publishedAt:new Date().toISOString()};
}
function download(){
 const blob=new Blob([JSON.stringify(bundle(),null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="published-content.json";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function reset(){
 config=normalize(null);save();apply();return d(config);
}
window.addEventListener("resize",()=>{
 // Responsive base dimensions change between laptop and mobile; keep saved scale.
 applyAnimalSizing();
});
function applyAnimalSizing(){
 const mobile=window.matchMedia("(max-width:650px)").matches;
 for(const [cls,key] of [["world-mammoth","mammoth"],["world-sabertooth","tiger"]]){
  document.querySelectorAll("."+cls).forEach(node=>{
   const welcome=!!node.closest("#welcome");
   const preferred=welcome?(key==="mammoth"?"mammothSize":"tigerSize"):
     (key==="mammoth"?"mammothLibrarySize":"tigerLibrarySize");
   const base=welcome?(key==="mammoth"?(mobile?145:415):(mobile?145:315)):
     (key==="mammoth"?(mobile?120:190):(mobile?120:175));
   const size=config.design.animalScale*config.design[preferred]/10000;
   node.style.setProperty("width",Math.round(base*size)+"px","important");
   node.style.setProperty("max-width","none","important");
  });
 }
}
window.IceSiteCore={initial:d(initial),groups,sections,config:()=>d(config),get:()=>config,
 update,apply,save,reset,importConfig,bundle,download,playAudio,syncAudio,
 lastSaveError:()=>lastSaveError,
 validAsset:asset,validUrl:http,normalize,hasDraft:()=>hasDraft,
 version:"full-site-core-20261103"};
// Prefer a teacher's current draft over a published version. Others see the
// committed public data file, not this device's localStorage.
apply();
fetch("./published-content.json",{cache:"no-store"}).then(response=>{
 if(!response.ok)throw Error("no published settings");
 return response.json();
}).then(published=>{
 if(!published||typeof published!=="object")return;
 if(!hasDraft&&published.site)importConfig(published.site,false);
 if(!window.IceSiteData?.hasDraft?.()){
  const books=Array.isArray(published.books)?published.books:null;
  const sources=Array.isArray(published.sources)?published.sources:null;
  if(books||sources)window.IceSiteData?.applyPublished(books,sources);
 }
}).catch(()=>{});
})();