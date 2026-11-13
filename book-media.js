/* Native book image/video uploads with IndexedDB Blob storage.
   No arbitrary size cap; real storage, browser and GitHub limits still apply.
   URL links remain optional. Published ZIP contains JSON and media originals. */
(function(){
"use strict";
const DB="iceAgeBookMedia", STORE="assets";
const urls=new Map();
let zipObjectUrl=null;
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!indexedDB){reject(Error("Browser does not support IndexedDB"));return;}
  const q=indexedDB.open(DB,1);
  q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE,{keyPath:"id"});};
  q.onsuccess=()=>resolve(q.result);
  q.onerror=()=>reject(q.error||Error("Unable to open local media storage"));
  q.onblocked=()=>reject(Error("Close other website tabs to update media storage"));
 });
}
async function transaction(mode,action){
 const db=await openDB();
 return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  const result=action(tx.objectStore(STORE));
  let value;
  result.onsuccess=()=>{value=result.result;};
  result.onerror=()=>reject(result.error||Error("Media storage operation failed"));
  tx.oncomplete=()=>{db.close();resolve(value);};
  tx.onabort=()=>{db.close();reject(tx.error||Error("Media storage was interrupted"));};
 });
}
const read=id=>transaction("readonly",store=>store.get(String(id)));
const storeBlob=item=>transaction("readwrite",store=>store.put(item));
function mediaName(file){
 const name=String(file.name||"file").normalize("NFKD")
 .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9._-]/gi,"-").replace(/-+/g,"-")
 .slice(-95).replace(/^\.+/,"");
 const ext=String(file.type||"").startsWith("video/")?"video":
   String(file.type||"").startsWith("image/")?"image":
   String(file.type||"").startsWith("audio/")?"audio":"file";
 return name||ext+"-upload";
}
function validFile(file,kind){
 if(!file||typeof file.size!=="number")throw Error("Choose an image or video");
 const v=String(file.type||"");
 const ext=(file.name||"").toLowerCase();
 const image=v.startsWith("image/")||/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(ext);
 const video=v.startsWith("video/")||/\.(mp4|webm|ogv|mov|m4v)$/i.test(ext);
 const audio=v.startsWith("audio/")||/\.(mp3)$/i.test(ext);
 if(kind==="image"&&!image)throw Error("请上传图片（PNG、JPG、GIF、WebP 等）。");
 if(kind==="video"&&!video)throw Error("请上传视频（MP4、WebM、MOV 等）。");
 if(kind==="audio"&&(!audio||!/\.mp3$/i.test(ext)))throw Error("请选择 MP3 文件。");
}
async function upload(file,block){
 validFile(file,block.type);
 // Store original bytes as a Blob; never convert a large video to Base64 JSON.
 const id="book-"+crypto.randomUUID();
 const path="media/"+id+"-"+mediaName(file);
 const record={id,path,blob:file,name:file.name,type:file.type,
  size:file.size,modified:Date.now()};
 await storeBlob(record);
 const previous={url:block.url,mediaId:block.mediaId,mediaName:block.mediaName};
 block.mediaId=id;
 block.mediaName=file.name;
 block.url=path;
 const saved=await window.IceSiteData?.saveBooksDraft?.();
 if(!saved){
  block.url=previous.url;block.mediaId=previous.mediaId;block.mediaName=previous.mediaName;
  throw Error("图片／视频已读取，但草稿保存失败。请检查浏览器储存权限。");
 }
 return record;
}
async function uploadAudio(file){
 validFile(file,"audio");
 const id="bookaudio-"+crypto.randomUUID();
 const path="media/"+id+"-"+mediaName(file);
 const record={id,path,blob:file,name:file.name,type:"audio/mpeg",
   size:file.size,modified:Date.now()};
 await storeBlob(record);
 return {url:path,mediaId:id,name:file.name};
}
async function getUrl(id){
 if(urls.has(id))return urls.get(id);
 const record=await read(id);
 if(!record||!record.blob)return null;
 const url=URL.createObjectURL(record.blob);
 urls.set(id,url);
 return url;
}
async function hydrate(root){
 const elements=root?.querySelectorAll?.("[data-book-media-id]")||[];
 for(const el of elements){
  const id=el.getAttribute("data-book-media-id");
  const fallback=el.getAttribute("data-book-media-path");
  const url=await getUrl(id).catch(()=>null);
  if(!el.isConnected)continue;
  if(url){el.src=url;if(el.tagName==="VIDEO")el.load();}
  else if(fallback&&/^media\/[\w./-]+$/i.test(fallback)){
   el.src=fallback;if(el.tagName==="VIDEO")el.load();
  }else{
   const message=document.createElement("p");message.className="muted";
   message.textContent="⚠️ Fail media tidak tersedia pada peranti ini. Guru perlu terbitkan fail media ke GitHub.";
   el.replaceWith(message);
  }
 }
}
function fileSize(size){
 const n=Number(size)||0;
 return n<1024?n+" B":n<1048576?(n/1024).toFixed(1)+" KB":
 (n/1048576).toFixed(2)+" MB";
}
function saveAs(blob,name){
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function downloadSingle(id){
 const record=await read(id);
 if(!record||!record.blob)throw Error("File missing from this browser");
 saveAs(record.blob,record.path.split("/").pop());
}
async function getReferencedFiles(){
 const map=new Map();
 for(const book of window.IceSiteData?.getBooks?.()||[]){
  for(const track of book.audioTracks||[]){
   if(track?.mediaId&&track.url?.startsWith("media/"))map.set(track.mediaId,track.url);
  }
  for(const page of book.pages||[]){
   for(const block of page.blocks||[]){
    if(block.mediaId&&block.url?.startsWith("media/")){
     map.set(block.mediaId,block.url);
    }
   }
   for(const track of page.audioTracks||[]){
    if(track?.mediaId&&track.url?.startsWith("media/")){
     map.set(track.mediaId,track.url);
    }
   }
  }
 }
 const out=[];
 for(const [id,path] of map.entries()){
  const item=await read(id);
  if(!item?.blob)throw Error("Media not found for "+path+". Re-upload before exporting.");
  out.push({...item,path});
 }
 return out;
}
// Store-only ZIP encoder. Keeps originals without re-encoding, and avoids
// converting large media into base64. CRC is streamed in small chunks.
const enc=new TextEncoder();
function u16(view,at,n){view.setUint16(at,n,true);}
function u32(view,at,n){view.setUint32(at,n>>>0,true);}
const table=new Uint32Array(256);
for(let i=0;i<256;i++){
 let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;
 table[i]=c>>>0;
}
async function crc32(blob){
 let crc=0xffffffff;
 const reader=blob.stream().getReader();
 for(;;){
  const r=await reader.read();if(r.done)break;
  for(const byte of r.value)crc=table[(crc^byte)&255]^(crc>>>8);
 }
 return (crc^0xffffffff)>>>0;
}
function localHeader(name){
 const h=new Uint8Array(30+name.length),v=new DataView(h.buffer);
 u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0808);u16(v,8,0);
 u16(v,26,name.length);h.set(name,30);return h;
}
function descriptor(crc,size){
 const h=new Uint8Array(16),v=new DataView(h.buffer);
 u32(v,0,0x08074b50);u32(v,4,crc);u32(v,8,size);u32(v,12,size);return h;
}
function centralHeader(name,crc,size,offset){
 const h=new Uint8Array(46+name.length),v=new DataView(h.buffer);
 u32(v,0,0x02014b50);u16(v,4,20);u16(v,6,20);
 u16(v,8,0x0808);u16(v,10,0);
 u32(v,16,crc);u32(v,20,size);u32(v,24,size);
 u16(v,28,name.length);u32(v,42,offset);h.set(name,46);return h;
}
function zipEnd(count,size,offset){
 const h=new Uint8Array(22),v=new DataView(h.buffer);
 u32(v,0,0x06054b50);u16(v,8,count);u16(v,10,count);
 u32(v,12,size);u32(v,16,offset);return h;
}
async function buildZip(entries){
 if(entries.length>65535)throw Error("Terlalu banyak fail dalam pakej ZIP.");
 const parts=[],directory=[];
 let pos=0;
 for(const {path,blob} of entries){
  const name=enc.encode(path);
  const size=blob.size;
  if(size>0xffffffff||pos+size>0xffffffff)throw Error("Pakej ZIP melebihi had format 4 GB. Gunakan fail GitHub atau storan video luar dan URL pilihan.");
  const crc=await crc32(blob);
  const head=localHeader(name);
  const trailer=descriptor(crc,size);
  parts.push(head,blob,trailer);
  directory.push(centralHeader(name,crc,size,pos));
  pos+=head.length+size+trailer.length;
 }
 const dirBytes=directory.reduce((a,b)=>a+b.length,0);
 if(pos+dirBytes>0xffffffff)throw Error("ZIP melebihi had teknikal 4 GB. Gunakan pautan video yang dihoskan.");
 return new Blob([...parts,...directory,zipEnd(directory.length,dirBytes,pos)],
  {type:"application/zip"});
}
async function exportPackage(report){
 const say=typeof report==="function"?report:()=>{};
 say("Mengumpulkan fail yang dimuat naik…");
 const media=await getReferencedFiles();
 const data=window.IceSiteCore?.bundle?.();
 if(!data)throw Error("Content bundle is unavailable");
 const json=new Blob([JSON.stringify(data,null,2)+"\n"],{type:"application/json"});
 const entries=[{path:"published-content.json",blob:json},
  ...media.map(x=>({path:x.path,blob:x.blob}))];
 say("Menyediakan ZIP ("+media.length+" fail media, "+fileSize(media.reduce((n,x)=>n+x.size,0))+")…");
 const zip=await buildZip(entries);
 if(zipObjectUrl)URL.revokeObjectURL(zipObjectUrl);
 zipObjectUrl=URL.createObjectURL(zip);
 const a=document.createElement("a");a.href=zipObjectUrl;
 a.download="Ice-Age-Library-Publish-Package.zip";
 document.body.append(a);a.click();a.remove();
 say("✅ ZIP telah dimuat turun. Nyahzip dan muat naik fail media/ ke GitHub bersama published-content.json. URL hanya pilihan.");
 return {count:media.length,size:zip.size};
}
window.addEventListener("pagehide",()=>{
 for(const url of urls.values())URL.revokeObjectURL(url);
 urls.clear();if(zipObjectUrl)URL.revokeObjectURL(zipObjectUrl);
});
window.IceBookMedia={upload,uploadAudio,read,getUrl,hydrate,fileSize,downloadSingle,
 getReferencedFiles,exportPackage,version:"book-media-with-mp3-playlists-20261113"};
})();