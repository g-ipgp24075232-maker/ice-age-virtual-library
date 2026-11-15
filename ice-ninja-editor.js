/* Special-purpose Guru panel for book b6 only. Other books and Guru tools untouched. */
(function(){
"use strict";
const e=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;};
const clone=x=>JSON.parse(JSON.stringify(x));
const okUrl=x=>/^(https:\/\/[^\s"'<>]+|(?:\.\/)?(?:art|media)\/[\w./%-]+|data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+)$/i.test(String(x||""));
const b6=()=>{const i=window.IceEditingBook?.getIndex?.();const b=window.IceSiteData?.getBooks?.()?.[i];return b?.id==="b6"?b:null;};
let qIndex=0,timer=null;
function configFor(b){
 const d=window.IceNinja?.getDefaultConfig?.();
 if(!d)throw Error("Konfigurasi permainan belum tersedia");
 const x=b.gameConfig?clone(b.gameConfig):d;
 return {...d,...x,assets:{...d.assets,...x.assets},questions:Array.isArray(x.questions)&&x.questions.length?x.questions:d.questions};
}
function message(str){const status=document.getElementById("ngeStatus");if(status)status.textContent=str;}
function changed(b,config){
 b.gameConfig=config;
 if(timer)clearTimeout(timer);
 timer=setTimeout(()=>void persist(b,config),420);
}
async function persist(b,config){
 if(timer)clearTimeout(timer);
 b.gameConfig=config;
 message(" Menyimpan draf permainan...");
 try{
  const result=await window.IceSiteData?.saveBooksDraft?.();
  message(result?" Draf permainan disimpan. Eksport JSON / ZIP Media dan Commit untuk peranti lain.":" Draf gagal disimpan. Semak storan pelayar.");
  return result;
 }catch(err){message(" "+err.message);return false;}
}
function btn(parent,label,fn){
 const x=e("button",label);x.type="button";x.className="secondary";
 x.onclick=fn;parent.append(x);return x;
}
function field(parent,label,value,fn,textarea=false,type="text"){
 const wrap=e("label",label,"nge-field");
 const input=e(textarea?"textarea":"input");
 if(!textarea)input.type=type;input.value=value??"";
 input.addEventListener("input",()=>fn(input.value));
 wrap.append(input);parent.append(wrap);return input;
}
function uploadBox(parent,label,asset,onSet,b,config){
 const block=e("div",undefined,"nge-media");
 block.append(e("strong",label));
 const preview=e("img");preview.alt="Pratonton "+label;preview.hidden=true;block.append(preview);
 let current=asset||{type:"image",url:""};
 async function previewImage(){
  let path=current?.url||"";
  if(current?.mediaId){
   try{path=await window.IceBookMedia.getUrl(current.mediaId)||path;}catch(_){}
  }
  if(okUrl(path)){preview.src=path;preview.hidden=false;}
  else{preview.hidden=true;preview.removeAttribute("src");}
 }
 void previewImage();
 const picker=e("input");picker.type="file";picker.accept="image/*,.gif,.png,.jpg,.jpeg,.webp,.avif";block.append(picker);
 picker.addEventListener("change",async()=>{
  const file=picker.files?.[0];if(!file)return;
  if(!file.type.startsWith("image/")&&!/\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)){message(" Sila pilih gambar.");return;}
  picker.disabled=true;message(" Menyimpan "+file.name+"...");
  try{
   const target={type:"image",url:current.url||"",mediaId:current.mediaId||"",mediaName:current.mediaName||""};
   onSet(target);b.gameConfig=config;
   await window.IceBookMedia.upload(file,target);
   current=target;onSet(target);
   link.value="";await previewImage();
   message(" "+file.name+" telah disimpan. Foto akan dimasukkan dalam ZIP penerbitan.");
  }catch(err){message(" Muat naik gagal: "+err.message);}
  finally{picker.disabled=false;}
 });
 const link=field(block,"Pilihan lain: URL gambar (HTTPS / art/ / media/)",current?.mediaId?"":current?.url||"",value=>{
  if(value&&!okUrl(value)){message(" Pautan gambar tidak sah.");return;}
  current={type:"image",url:value,mediaId:"",mediaName:""};
  onSet(current);changed(b,config);void previewImage();
 });
 link.placeholder="https://.../gambar.png atau art/ais.png";
 const actions=e("div",undefined,"nge-actions");
 btn(actions," Buang Gambar",()=>{current={type:"image",url:""};onSet(current);link.value="";changed(b,config);void previewImage();});
 block.append(actions);parent.append(block);
}
function render(){
 document.getElementById("iceNinjaTeacherPanel")?.remove();
 const b=b6();if(!b)return;
 const cfg=configFor(b);
 const root=e("details");root.id="iceNinjaTeacherPanel";root.open=true;
 root.append(e("summary"," Sunting Game — MISI PENJAGA BUMI"));
 root.append(e("p","第六本书专用：编辑问题、四个答案、正确答案、图片、背景与结算画面。其他 Guru 功能不会改变。","nge-note"));
 const appearance=e("section",undefined,"nge-section");
 appearance.append(e("h3"," Reka Bentuk Permainan"));
 const common=e("div",undefined,"nge-grid");
 field(common,"Tajuk Permainan",cfg.title,v=>{cfg.title=v;changed(b,cfg);});
 field(common,"Subtajuk",cfg.subtitle,v=>{cfg.subtitle=v;changed(b,cfg);});
 field(common,"Warna Utama",cfg.themeColor||"#caeff3",v=>{cfg.themeColor=v;changed(b,cfg);},false,"color");
 field(common,"Warna Kristal",cfg.crystalColor||"#77b8d8",v=>{cfg.crystalColor=v;changed(b,cfg);},false,"color");
 field(common,"Tajuk Penamat",cfg.finishTitle,v=>{cfg.finishTitle=v;changed(b,cfg);});
 appearance.append(common);
 field(appearance,"Arahan / Pengenalan",cfg.intro,v=>{cfg.intro=v;changed(b,cfg);},true);
 field(appearance,"Mesej Penamat",cfg.finishMessage,v=>{cfg.finishMessage=v;changed(b,cfg);},true);
 appearance.append(e("h4"," Upload Background & Reka Bentuk"));
 const assets=e("div",undefined,"nge-grid");
 for(const [key,label] of [
  ["background","Latar permainan"],
  ["introBackground","Latar Mula"],
  ["finishBackground","Latar Tamat"],
  ["answerBackground","Gambar Bingkai/Kristal Jawapan"],
  ["cursorImage","Gambar Penunjuk Tangan (pilihan)"]
 ]){
  uploadBox(assets,label,cfg.assets[key],value=>{cfg.assets[key]=value;changed(b,cfg);},b,cfg);
 }
 appearance.append(assets);root.append(appearance);
 const bank=e("section",undefined,"nge-section");bank.append(e("h3"," Bank Soalan"));
 const tools=e("div",undefined,"nge-actions");
 const choice=e("select");choice.className="nge-select";
 cfg.questions.forEach((q,i)=>{const option=e("option",(i+1)+". "+(q.q||"Soalan").slice(0,40));option.value=i;choice.append(option);});
 qIndex=Math.min(qIndex,cfg.questions.length-1);choice.value=qIndex;
 choice.onchange=()=>{qIndex=Number(choice.value);render();};tools.append(choice);
 btn(tools,"+ Tambah Soalan",()=>{
  cfg.questions.push({q:"Soalan baharu?",explain:"",points:10,correct:0,
   answers:[1,2,3,4].map(i=>({text:"Jawapan "+i,image:{type:"image",url:""}}))});
  qIndex=cfg.questions.length-1;void persist(b,cfg);render();
 });
 btn(tools," Duplikasi",()=>{cfg.questions.splice(qIndex+1,0,clone(cfg.questions[qIndex]));qIndex++;void persist(b,cfg);render();});
 btn(tools,"↑",()=>{if(qIndex<1)return;[cfg.questions[qIndex],cfg.questions[qIndex-1]]=[cfg.questions[qIndex-1],cfg.questions[qIndex]];qIndex--;void persist(b,cfg);render();});
 btn(tools,"↓",()=>{if(qIndex>=cfg.questions.length-1)return;[cfg.questions[qIndex],cfg.questions[qIndex+1]]=[cfg.questions[qIndex+1],cfg.questions[qIndex]];qIndex++;void persist(b,cfg);render();});
 btn(tools," Padam",()=>{if(cfg.questions.length<=1){message("至少保留一道题目。");return;}if(!confirm("Padam soalan ini?"))return;cfg.questions.splice(qIndex,1);qIndex=Math.max(0,qIndex-1);void persist(b,cfg);render();});
 bank.append(tools);
 const q=cfg.questions[qIndex];
 if(q){
  field(bank,"Soalan",q.q,v=>{q.q=v;choice.selectedOptions[0].textContent=(qIndex+1)+". "+v.slice(0,40);changed(b,cfg);},true);
  field(bank,"Penjelasan selepas jawapan betul",q.explain,v=>{q.explain=v;changed(b,cfg);},true);
  const score=field(bank,"Markah (1–100)",q.points??10,v=>{q.points=Math.max(1,Math.min(100,Number(v)||10));changed(b,cfg);},false,"number");
  score.min="1";score.max="100";
  bank.append(e("p","每道题有四个答案；可以显示上传的图片、文字或图片加文字，不再使用 emoji。选择一个正确答案。","nge-note"));
  for(let i=0;i<4;i++){
   if(!q.answers[i])q.answers[i]={text:"Jawapan "+(i+1),image:{type:"image",url:""}};
   const a=q.answers[i],answer=e("div",undefined,"nge-answer");
   if(Number(q.correct)===i)answer.classList.add("nge-correct");
   answer.append(e("h4","Jawapan "+String.fromCharCode(65+i)));
   const radio=e("label"," Jawapan Betul","nge-right");
   const tick=e("input");tick.type="radio";tick.name="nge-correct-"+qIndex;tick.checked=Number(q.correct)===i;
   tick.onchange=()=>{q.correct=i;changed(b,cfg);render();};radio.prepend(tick);answer.append(radio);
   const columns=e("div",undefined,"nge-grid");
   field(columns,"Teks (boleh kosong)",a.text,v=>{a.text=v;changed(b,cfg);});

   answer.append(columns);
   uploadBox(answer,"Upload gambar Jawapan "+String.fromCharCode(65+i),a.image,value=>{a.image=value;changed(b,cfg);},b,cfg);
   bank.append(answer);
  }
 }
 root.append(bank);
 const actions=e("div",undefined,"nge-actions");
 btn(actions," Simpan Permainan",()=>void persist(b,cfg));
 btn(actions," Pratonton Game",async()=>{if(await persist(b,cfg))window.openBook?.(window.IceEditingBook?.getIndex?.());});
 btn(actions," Eksport JSON / ZIP",()=>void window.IceSiteCore?.download?.());
 root.append(actions);
 const status=e("p","","nge-note");status.id="ngeStatus";status.setAttribute("role","status");root.append(status);
 document.getElementById("editFields")?.prepend(root);
}
const css=document.createElement("style");css.textContent=[
 "#iceNinjaTeacherPanel{margin:8px 0 20px;padding:15px;border:3px solid #8dbfcf;border-radius:17px;background:#e5f7f9;color:#235c75}",
 "#iceNinjaTeacherPanel summary{font-size:1.15rem;font-weight:900;cursor:pointer;padding:8px}",
 ".nge-section{padding:14px;margin:12px 0;border:2px solid #bedcde;border-radius:12px;background:#fffdf9;display:grid;gap:9px}",
 ".nge-section h3{color:#28637f;margin:4px 0}",
 ".nge-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}",
 ".nge-field{display:grid;gap:6px;font-weight:700;font-size:.9rem;min-width:0}",
 ".nge-field input,.nge-field textarea{width:100%;padding:9px;border:2px solid #b7d8df;border-radius:9px;min-width:0}",
 ".nge-field textarea{min-height:76px}",
 ".nge-media{display:grid;gap:7px;padding:12px;border:1px solid #afced8;background:#eefafc;border-radius:11px;min-width:0}",
 ".nge-media input[type=file]{width:100%;min-width:0}",
 ".nge-media img{max-width:100%;height:105px;object-fit:contain}",
 ".nge-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:5px 0}",
 ".nge-actions button{font-size:.86rem;padding:8px 11px}",
 ".nge-select{padding:9px;border-radius:9px;border:2px solid #b7d8df;max-width:100%}",
 ".nge-answer{padding:12px;border:2px solid #cae1e2;border-radius:12px;background:#f3f9fb;display:grid;gap:7px}",
 ".nge-answer.nge-correct{border-color:#5eaf7c;background:#edfff1}",
 ".nge-right{display:flex;align-items:center;gap:5px;font-weight:bold}",
 ".nge-note{font-size:.87rem;color:#305a72;line-height:1.45}"
].join("\n");document.head.append(css);
window.IceNinjaEditor={render,version:"b6-custom-questions-images-background-v1"};
})();