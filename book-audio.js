(function(){
"use strict";
const $=id=>document.getElementById(id);
const books=()=>window.IceSiteData?.getBooks?.()||[];
const book=()=>books()[window.BookPageState?.getBookIndex?.()||0];
const page=()=>book()?.pages?.[window.BookPageState?.getIndex?.()||0];
const valid=u=>/^(https:\/\/|audio\/|media\/|data:audio\/(?:mpeg|mp3|x-mpeg);base64,)/i.test(String(u||""));
function tracks(obj){
 const list=Array.isArray(obj?.audioTracks)?obj.audioTracks.slice(0,3):[];
 const out=Array.from({length:3},(_,i)=>list[i]&&valid(list[i].url)?list[i]:null);
 if(!out.some(Boolean)&&valid(obj?.audioUrl))
  out[0]={url:obj.audioUrl,name:obj.audioName||"MP3 asal"};
 return out;
}
function current(){
 const p=tracks(page()).filter(Boolean);
 return p.length?{tracks:p,scope:"Halaman"}:{tracks:tracks(book()).filter(Boolean),scope:"Buku"};
}
const panel=document.createElement("section");
panel.style.cssText="text-align:center;background:#fff7e5;border:2px solid #bfdde7;border-radius:15px;padding:13px;margin:12px auto;display:grid;gap:8px;justify-items:center";
const status=document.createElement("p");status.id="mp3StudentStatus";status.setAttribute("role","status");status.setAttribute("aria-live","polite");panel.append(status);
const step=document.createElement("small");panel.append(step);
const tts=document.createElement("button");tts.className="secondary";tts.type="button";tts.textContent="🔊 Suara automatik";
tts.onclick=()=>{stop();window.readTTS?.();};panel.append(tts);
$("reader")?.querySelector(".controls")?.insertAdjacentElement("afterend",panel);
let player=null,playing=false,generation=0,index=0,queue=[],scope="";
function note(msg){status.textContent=msg;}
function stop(){
 generation++;playing=false;queue=[];index=0;
 if(player){player.pause();player.removeAttribute("src");player.load();}
 window.IceSoundscape?.duckForNarration(false);
 step.textContent="";sync();
}
async function playItem(token){
 if(!playing||token!==generation)return;
 const item=queue[index];if(!item)return;
 let url=null;
 if(item.mediaId)url=await window.IceBookMedia?.getUrl(item.mediaId).catch(()=>null);
 if(!url&&valid(item.url))url=item.url;
 if(!playing||token!==generation)return;
 if(!url){advance(token);return;}
 if(!player){
  player=new Audio();player.preload="auto";
  player.addEventListener("ended",()=>advance(generation));
  player.addEventListener("error",()=>{if(playing)advance(generation);});
 }
 player.src=url;
 step.textContent="🎵 MP3 "+(index+1)+" / "+queue.length+" — "+(item.name||"Rakaman");
 note("▶ "+scope+": MP3 "+(index+1)+" sedang dimainkan. Selepas tamat, MP3 berikutnya dimainkan secara automatik.");
 window.IceSoundscape?.duckForNarration(true);
 try{await player.play();}
 catch(error){
  if(token!==generation)return;
  playing=false;window.IceSoundscape?.duckForNarration(false);
  note("⚠️ MP3 tidak dapat dimainkan: "+(error?.message||error));
 }
}
function advance(token){
 if(!playing||token!==generation)return;
 if(index+1<queue.length){index++;void playItem(token);}
 else{
  playing=false;window.IceSoundscape?.duckForNarration(false);
  step.textContent="✅ Semua MP3 selesai";
  note("✅ Semua rakaman telah dimainkan mengikut susunan.");
 }
}
function start(items,label){
 if(!items.length)return false;
 stop();window.speechSynthesis?.cancel();
 queue=items;scope=label;playing=true;index=0;
 void playItem(generation);return true;
}
function playCurrent(){const x=current();return start(x.tracks,x.scope);}
function sync(){
 if(playing){note("▶ MP3 sedang dimainkan. Flip halaman tidak menghentikan audio.");return;}
 if(window.speechSynthesis?.speaking){note("🔊 Suara automatik sedang berjalan.");return;}
 const x=current();
 note(x.tracks.length?"🎙️ "+x.scope+": "+x.tracks.length+" MP3 tersedia. Tekan Dengar Cerita.":"🔊 Tiada MP3, boleh gunakan suara automatik.");
}
function normalize(obj){
 if(!Array.isArray(obj.audioTracks))obj.audioTracks=[];
 obj.audioTracks=obj.audioTracks.slice(0,3);
 while(obj.audioTracks.length<3)obj.audioTracks.push(null);
 if(!obj.audioTracks.some(Boolean)&&valid(obj.audioUrl))
  obj.audioTracks[0]={url:obj.audioUrl,name:obj.audioName||"MP3 asal"};
 return obj.audioTracks;
}
async function setTrack(obj,i,track,message){
 const old=Array.isArray(obj.audioTracks)?obj.audioTracks.map(x=>x?{...x}:null):null;
 const oldUrl=obj.audioUrl,oldName=obj.audioName;
 normalize(obj)[i]=track;
 obj.audioUrl=obj.audioTracks[0]?.url||"";
 obj.audioName=obj.audioTracks[0]?.name||"";
 message.textContent="💾 Menyimpan MP3 "+(i+1)+"…";
 try{
  if(!await window.IceSiteData?.saveBooksDraft?.())throw Error("Storan tidak tersedia");
  message.textContent="✅ MP3 "+(i+1)+" disimpan. Eksport JSON / ZIP Media dan Commit GitHub untuk murid lain.";
  sync();return true;
 }catch(error){
  if(old) obj.audioTracks=old;else delete obj.audioTracks;
  obj.audioUrl=oldUrl;obj.audioName=oldName;
  message.textContent="❌ Simpan gagal: "+(error?.message||error);return false;
 }
}
function makeEditor(parent,obj,title){
 const box=document.createElement("section");box.className="mp3-editor";
 box.style.cssText="background:#e8f7f2;border:2px solid #a7caca;border-radius:15px;padding:14px;margin:14px 0;display:grid;gap:12px";
 const h=document.createElement("h3");h.textContent=title+" — 3 MP3";box.append(h);
 const p=document.createElement("p");
 p.textContent="🎵 MP3 1 → MP3 2 → MP3 3 自动连续播放。上传音频或填写 URL；学生翻页不打断录音。";
 box.append(p);
 for(let i=0;i<3;i++){
  const row=document.createElement("div");row.style.cssText="display:grid;gap:7px;background:#fffdf7;padding:12px;border:1px solid #d2e5e1;border-radius:10px";
  const label=document.createElement("b");label.textContent="🎵 MP3 "+(i+1);row.append(label);
  const info=document.createElement("small");info.textContent=tracks(obj)[i]?.name||"尚未上传";row.append(info);
  const upload=document.createElement("input");upload.type="file";upload.accept=".mp3,audio/mpeg";
  upload.style.cssText="width:100%;padding:8px;border:1px solid #bed9dd;border-radius:8px";row.append(upload);
  const url=document.createElement("input");url.type="text";url.style.cssText="width:100%;padding:10px;border:1px solid #bed9dd;border-radius:8px";
  url.placeholder="可选：HTTPS MP3 URL 或 audio/cerita.mp3";
  const old=tracks(obj)[i];url.value=old?.mediaId||old?.url?.startsWith("data:")?"":old?.url||"";row.append(url);
  const actions=document.createElement("div");actions.style.cssText="display:flex;gap:7px;flex-wrap:wrap";
  const message=document.createElement("small");message.setAttribute("role","status");message.setAttribute("aria-live","polite");
  const button=(caption,run)=>{let b=document.createElement("button");b.type="button";b.className="secondary";b.textContent=caption;b.onclick=run;actions.append(b);};
  upload.onchange=async()=>{
   const file=upload.files?.[0];if(!file)return;
   if(!/\.mp3$/i.test(file.name)){message.textContent="❌ 请选择 MP3 文件。";return;}
   upload.disabled=true;message.textContent="💾 上传 "+file.name+"…";
   try{
    const track=await window.IceBookMedia.uploadAudio(file);
    if(await setTrack(obj,i,track,message)){info.textContent="✅ "+file.name;url.value="";}
   }catch(e){message.textContent="❌ "+e.message}
   finally{upload.disabled=false;}
  };
  button("💾 保存 URL",async()=>{
   const v=url.value.trim();
   if(v&&!valid(v)){message.textContent="❌ MP3 URL 无效。";return;}
   const track=v?{url:v,name:v.split("/").pop().split("?")[0]}:null;
   if(await setTrack(obj,i,track,message))info.textContent=track?.name||"尚未上传";
  });
  button("▶ 试听",()=>start(tracks(obj)[i]?[tracks(obj)[i]]:[],"Pratonton"));
  button("🗑 移除",async()=>{
   if(await setTrack(obj,i,null,message)){url.value="";info.textContent="尚未上传";}
  });
  row.append(actions,message);box.append(row);
 }
 const all=document.createElement("button");all.type="button";all.textContent="▶ 试听全部 MP3（1 → 2 → 3）";
 all.onclick=()=>start(tracks(obj).filter(Boolean),"Pratonton 3 MP3");
 box.append(all);parent.append(box);
}
function decorateEditor(){
 const b=books()[window.IceEditingBook?.getIndex?.()||0],fields=$("editFields"),pageEditor=$("pageEditor");
 if(!b||!fields||!pageEditor)return;
 fields.querySelectorAll(".mp3-editor").forEach(x=>x.remove());
 pageEditor.querySelectorAll(".mp3-editor").forEach(x=>x.remove());
 const wrap=document.createElement("div");makeEditor(wrap,b,"🎙️ Dengar Cerita — Buku");
 const select=$("ePage")?.closest("label");
 if(select)fields.insertBefore(wrap.firstElementChild,select);else fields.append(wrap.firstElementChild);
 const pg=b.pages?.[window.IceEditingBook?.getPageIndex?.()||0];
 if(pg)makeEditor(pageEditor,pg,"🎙️ Dengar Cerita — Halaman");
}
window.IceBookAudio={playCurrent,stop,sync,onPageTurn:sync,decorateEditor,
 version:"three-ordered-mp3-auto-next-20261113"};
sync();
})();