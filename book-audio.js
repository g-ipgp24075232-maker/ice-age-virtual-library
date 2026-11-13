(function(){
"use strict";
const get=id=>document.getElementById(id);
const books=()=>window.IceSiteData?.getBooks?.()||[];
const b=()=>books()[window.BookPageState?.getBookIndex?.()||0];
const p=()=>b()?.pages?.[window.BookPageState?.getIndex?.()||0];
const valid=x=>/^(https:\/\/|audio\/|data:audio\/mpeg;base64,)/i.test(String(x||""));
let player=null;
let playingSource="";
const status=document.createElement("p");
status.id="mp3StudentStatus";status.setAttribute("role","status");status.style.textAlign="center";
status.textContent="🔊 Dengar Cerita: MP3 guru atau suara automatik";
get("reader")?.querySelector(".controls")?.insertAdjacentElement("afterend",status);
const ttsBtn=document.createElement("button");
ttsBtn.type="button";ttsBtn.className="secondary";
ttsBtn.textContent="🔊 Suara automatik (jika MP3 tiada)";
ttsBtn.setAttribute("aria-label","Guna suara automatik Bahasa Melayu");
ttsBtn.addEventListener("click",()=>{stop();window.readTTS?.();});
status.insertAdjacentElement("afterend",ttsBtn);
ttsBtn.style.cssText="display:block;margin:8px auto 18px;font-size:.88rem";
function note(x){status.textContent=x;}
function stop(){
if(player){player.pause();player.removeAttribute("src");player.load();}
playingSource="";
window.IceSoundscape?.duckForNarration(false);
sync();
}
function play(src){
if(!valid(src))return false;
stop();
player=player||new Audio();player.src=src;playingSource=src;
player.onended=()=>{playingSource="";window.IceSoundscape?.duckForNarration(false);note("✅ Cerita tamat.");};
player.onerror=()=>{playingSource="";window.IceSoundscape?.duckForNarration(false);note("⚠️ Fail MP3 gagal dimainkan. Cuba suara automatik.");};
window.IceSoundscape?.duckForNarration(true);
note("▶ Memainkan rakaman MP3...");
player.play().catch(e=>{window.IceSoundscape?.duckForNarration(false);note("⚠️ "+e.message);});
return true;
}
function playCurrent(){
const page=p(),book=b();const src=valid(page?.audioUrl)?page.audioUrl:book?.audioUrl;
if(!valid(src))return false;
return play(src);
}
function sync(){
 if(player && !player.paused && playingSource){
  note("▶ Rakaman MP3 masih dimainkan. Anda boleh terus menyelak halaman tanpa menghentikan audio.");
  return;
 }
 if(window.speechSynthesis?.speaking){
  note("🔊 Bacaan suara automatik sedang berjalan dan tidak terhenti ketika menyelak.");
  return;
 }
 note(valid(p()?.audioUrl)?"🎙️ Halaman ini ada rakaman MP3.":valid(b()?.audioUrl)?"🎙️ Buku ini ada rakaman MP3.":"🔊 Tiada MP3, bacaan suara automatik Bahasa Melayu tersedia.");
}
function onPageTurn(){
 // Deliberately keep the same Audio and SpeechSynthesisUtterance alive, even
 // when a different page has its own narration. Starting that narration is an
 // explicit choice via the Dengar Cerita button.
 sync();
}
function count(){
let n=0;for(const book of books())for(const x of [book.audioUrl,...(book.pages||[]).map(p=>p.audioUrl)])
if(String(x||"").startsWith("data:audio/"))n+=String(x).length;
return n;
}
function store(obj,src,name,msg){
const a=obj.audioUrl,old=obj.audioName;
obj.audioUrl=src;obj.audioName=name||"";
if(count()>2500000){obj.audioUrl=a;obj.audioName=old;msg.textContent="⚠️ Had storan MP3 dalam JSON. Guna pautan GitHub audio/ untuk fail besar.";return;}
try{localStorage.setItem("iceLibraryDraft",JSON.stringify({books:books(),sources:window.IceSiteData.getSources()}));
msg.textContent="✅ MP3 disimpan sebagai draf. Export JSON dan Commit untuk semua murid.";sync();
}catch(e){obj.audioUrl=a;obj.audioName=old;msg.textContent="❌ Storan penuh. Guna URL MP3 di GitHub.";}
}
function make(parent,obj,label){
const box=document.createElement("section");box.className="mp3-editor";
box.style.cssText="background:#e6f5f5;border:2px solid #8ebcc8;border-radius:15px;padding:13px;margin:12px 0;display:grid;gap:9px";
const h=document.createElement("h3");h.textContent=label;box.append(h);
const info=document.createElement("p");info.textContent=obj.audioUrl?"✅ "+(obj.audioName||"Rakaman MP3 tersedia"):"Tiada MP3 (suara automatik tersedia)";box.append(info);
const upload=document.createElement("input");upload.type="file";upload.accept=".mp3,audio/mpeg";
const l=document.createElement("label");l.textContent="📂 Upload MP3 (maksimum 1.2 MB): ";l.append(upload);box.append(l);
const url=document.createElement("input");url.placeholder="https://.../cerita.mp3 atau audio/cerita.mp3";
url.style.cssText="width:100%;padding:10px";url.value=String(obj.audioUrl||"").startsWith("data:")?"":(obj.audioUrl||"");
box.append(url);
const m=document.createElement("p");m.setAttribute("role","status");
function button(text,fn){const a=document.createElement("button");a.type="button";a.textContent=text;a.onclick=fn;box.append(a);}
upload.onchange=()=>{
const f=upload.files?.[0];if(!f)return;
if(!f.name.toLowerCase().endsWith(".mp3")){m.textContent="❌ Pilih MP3.";return;}
if(f.size>1258291){m.textContent="⚠️ MP3 lebih 1.2MB. Muat naik ke GitHub folder audio/ dan letak URL.";return;}
const reader=new FileReader();
reader.onload=()=>{
const data="data:audio/mpeg;base64,"+String(reader.result).split(",")[1];
store(obj,data,f.name,m);info.textContent=obj.audioUrl?"✅ "+f.name:"Tiada MP3";url.value="";
};
reader.onerror=()=>m.textContent="❌ MP3 gagal dibaca";
reader.readAsDataURL(f);
};
button("💾 Simpan URL MP3",()=>{const v=url.value.trim();
if(v&&!valid(v)){m.textContent="❌ URL MP3 tidak sah.";return;}
store(obj,v,v.split("/").pop(),m);info.textContent=v?"✅ MP3 URL":"Tiada MP3";
});
button("▶ Uji MP3",()=>obj.audioUrl?play(obj.audioUrl):(m.textContent="Tiada MP3"));
button("🗑 Buang audio",()=>{store(obj,"","",m);url.value="";info.textContent="Tiada MP3";});
box.append(m);parent.append(box);
}
function decorateEditor(){
const book=books()[window.IceEditingBook?.getIndex?.()||0];const fields=get("editFields"),pageEditor=get("pageEditor");
if(!book||!fields||!pageEditor)return;
fields.querySelectorAll(".mp3-editor").forEach(n=>n.remove());
pageEditor.querySelectorAll(".mp3-editor").forEach(n=>n.remove());
const anchor=get("ePage")?.closest("label");const slot=document.createElement("div");
make(slot,book,"🎙️ Audio Dengar Cerita — Buku");
if(anchor)fields.insertBefore(slot.firstElementChild,anchor);else fields.append(slot.firstElementChild);
const page=book.pages?.[window.BookPageState?.getIndex?.()||0];
if(page)make(pageEditor,page,"🎙️ Audio Dengar Cerita — Halaman");
}
window.IceBookAudio={playCurrent,stop,sync,onPageTurn,decorateEditor,version:"continuous-audio-across-page-turns-v2"};
})();