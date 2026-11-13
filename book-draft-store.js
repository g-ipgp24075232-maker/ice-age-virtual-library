/* Persistent book / MP3 drafts for Perpustakaan Maya Zaman Air Batu.
   IndexedDB avoids the ~5 MB localStorage cap after uploading narration
   for several books. This only saves the teacher's local drafts; publishing
   to all devices still requires committing published-content.json to GitHub. */
(function(){
"use strict";
const DATABASE="iceAgeBookAudioDrafts";
const STORE="teacherDrafts";
const KEY="current";
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(new Error("IndexedDB not supported"));return;}
  let request;
  try{request=window.indexedDB.open(DATABASE,1);}
  catch(error){reject(error);return;}
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains(STORE)){
    request.result.createObjectStore(STORE);
   }
  };
  request.onsuccess=()=>{
   const db=request.result;
   db.onversionchange=()=>db.close();
   resolve(db);
  };
  request.onerror=()=>reject(request.error||new Error("Cannot open book draft database"));
  request.onblocked=()=>reject(new Error("Book draft database blocked by another tab"));
 });
}
async function read(){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,"readonly");
  const req=tx.objectStore(STORE).get(KEY);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error||new Error("Cannot load book draft"));
  tx.oncomplete=()=>db.close();
  tx.onabort=()=>{db.close();reject(tx.error||new Error("Draft read was aborted"));};
 });
}
async function write(data){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).put(data,KEY);
  tx.oncomplete=()=>{db.close();resolve(true);};
  tx.onerror=()=>reject(tx.error||new Error("Cannot save book draft"));
  tx.onabort=()=>{db.close();reject(tx.error||new Error("Book draft quota exceeded"));};
 });
}
async function clear(){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).delete(KEY);
  tx.oncomplete=()=>{db.close();resolve(true);};
  tx.onerror=()=>reject(tx.error||new Error("Cannot clear book draft"));
 });
}
window.IceBookDrafts={read,write,clear,version:"indexeddb-multi-book-mp3-v1"};
})();