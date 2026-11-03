/* All-site teacher control panel. Pure browser authoring without GitHub tokens. */
(function(){
"use strict";
const core=window.IceSiteCore,host=document.getElementById("siteMasterEditor");
if(!core||!host)return;
const $=id=>document.getElementById(id);
const s=x=>String(x==null?"":x);
const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=s(text);if(cls)node.className=cls;return node;};
const button=(label,action,secondary=false)=>{
 const b=make("button",label,secondary?"secondary":"");b.type="button";
 b.addEventListener("click",action);return b;
};
let tab="texts",quick=false;
const state=()=>core.get();
const panel=make("div",null,"whole-editor");
host.append(panel);
const bar=make("div",null,"whole-edit-toolbar");
bar.append(make("h2","🎨 Edit Seluruh Laman · 全站编辑"));
bar.append(make("p","首页、所有页面、图片、动画、颜色、音乐及自定义内容，都可以在这里编辑。修改后可实时预览。"));
const actions=make("div",null,"whole-edit-actions");
actions.append(button("👁 Pratonton 首页",()=>{if(typeof window.home==="function")window.home();window.scrollTo({top:0,behavior:"smooth"});},true));
actions.append(button("✍️ Klik Teks untuk Edit",()=>setQuick(!quick),true));
actions.append(button("💾 Simpan Semua Draf",()=>{window.saveDraft?.();core.save();message("✅ 设计、书本和资料已保存在这台设备。");}));
bar.append(actions);panel.append(bar);
const tabs=make("div",null,"whole-edit-tabs");tabs.setAttribute("role","tablist");
const choices=[["texts","📝 Semua Teks"],["media","🖼 Gambar & Audio"],["design","🎨 Tema & Animasi"],["blocks","🧩 Elemen Semua Halaman"],["publish","🚀 Terbit / Backup"]];
choices.forEach(([id,label])=>{
 const b=button(label,()=>{tab=id;render();},true);b.dataset.tab=id;b.setAttribute("role","tab");
 tabs.append(b);
});
panel.append(tabs);
const body=make("div",null,"whole-edit-body");panel.append(body);
const msg=make("p","", "whole-edit-message");msg.setAttribute("role","status");msg.setAttribute("aria-live","polite");panel.append(msg);
function message(t){msg.textContent=t}
function hint(parent,txt){parent.append(make("p",txt,"whole-edit-note"))}
function card(parent,title){
 const section=make("section",null,"whole-edit-card");
 section.append(make("h3",title));parent.append(section);return section;
}
function input(parent,label,value,kind,onChange,options){
 const wrapper=make("label",null,"whole-edit-field");
 wrapper.append(make("span",label));
 let el;
 if(kind==="textarea")el=make("textarea");
 else if(kind==="select"){
  el=make("select");
  (options||[]).forEach(([v,title])=>{const option=make("option",title);option.value=v;el.append(option);});
 }else{el=make("input");el.type=kind||"text";}
 el.value=s(value);
 if(kind==="range"){
  el.min=options?.min??0;el.max=options?.max??100;el.step=options?.step??1;
 }
 el.addEventListener(kind==="select"?"change":"input",()=>onChange(el.value,el));
 wrapper.append(el);parent.append(wrapper);return el;
}
function textFields(){
 hint(body,"所有原有页面文字都能修改。也可以开启「Klik Teks untuk Edit」，直接在页面点击标题或段落修改。");
 const data=state();
 const labels={
  brand:"网站名称",siteTitle:"浏览器标签标题",navHome:"主页菜单",navSources:"参考资料菜单",navGuru:"教师菜单",navAudio:"音频菜单",navGesture:"手势菜单",
  welcomeStamp:"首页装饰标签",welcomeTitle:"首页大标题",welcomeSubtitle:"首页副标题",
  welcomeDescription:"首页欢迎语",welcomeButton:"进入按钮",animalCaption:"猛犸象对话",
  libraryTitle:"书架标题",libraryDescription:"书架说明",libraryHint:"书架提示",
  readerBack:"返回书架按钮",readerInstruction:"翻书说明",readerPrevious:"上一页",
  readerNarrate:"朗读按钮",readerStop:"暂停按钮",readerNext:"下一页",
  sourcesTitle:"E-Sumber 标题",sourcesIntro:"参考资料说明",sourcesNotice:"参考资料提醒",
  teacherTitle:"教师面板标题",teacherNotice:"教师面板说明",footer:"底部版权与说明"
 };
 for(const [group,keys] of core.groups){
  const area=card(body,group),grid=make("div",null,"whole-edit-grid");area.append(grid);
  for(const key of keys){
   input(grid,labels[key]||key,data.text[key],
    ["welcomeDescription","libraryHint","readerInstruction","sourcesIntro","sourcesNotice","teacherNotice","footer"].includes(key)?"textarea":"text",
    v=>core.update("text."+key,v));
  }
 }
}
async function imageToDataURL(file){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error("请上传 JPG、PNG 或 WebP。");
 if(file.size>9e6)throw Error("图像超过 9MB，请先压缩。");
 const url=URL.createObjectURL(file);
 let img;
 try{
  img=await new Promise((resolve,reject)=>{
   const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error("图片无法读取"));im.src=url;
  });
 }finally{URL.revokeObjectURL(url);}
 const canvas=document.createElement("canvas");
 const scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
 canvas.width=Math.round(img.naturalWidth*scale);
 canvas.height=Math.round(img.naturalHeight*scale);
 canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
 const data=canvas.toDataURL("image/webp",.75);
 if(data.length>1750000)throw Error("压缩后图片仍太大，请使用图片 URL。");
 return data;
}
function mediaFields(){
 const d=state();
 hint(body,"替换欢迎页背景、冰洞背景、猛犸象和剑齿虎图片。可以直接粘贴 HTTPS 图片链接或上传 PNG/JPG/WebP。原 SVG 动画中的耳朵/鼻子等细节需在 GitHub 修改 SVG 文件。");
 const media=[["welcome","🏠 首页背景"],["library","📚 冰洞书架背景"],["mammoth","🦣 猛犸象"],["tiger","🐅 剑齿虎"]];
 for(const [key,title] of media){
  const area=card(body,title);
  const img=make("img");img.src=d.images[key];img.alt=title;img.className="whole-edit-preview";area.append(img);
  const src=input(area,"图片 URL（HTTPS / art/...）",d.images[key],"text",v=>{
   if(core.validAsset(v)){core.update("images."+key,v);img.src=v;}
  });
  const upload=make("label",null,"whole-edit-field");upload.append(make("span","📁 上传新图片"));
  const file=make("input");file.type="file";file.accept="image/png,image/jpeg,image/webp";
  file.addEventListener("change",async()=>{
   if(!file.files?.length)return;
   try{const data=await imageToDataURL(file.files[0]);core.update("images."+key,data);render();message("✅ 图片已更新到本地草稿。请导出 JSON 发布到 GitHub。");}
   catch(e){message("⚠️ "+e.message);}
  });
  upload.append(file);area.append(upload);
  area.append(button("↺ 恢复默认图片",()=>{core.update("images."+key,core.initial.images[key]);render();},true));
 }
 const audio=card(body,"🎼 自定义背景音乐");
 hint(audio,"可加入你自己的 MP3/OGG/WAV/M4A HTTPS 直链，与现有冰河时代风声和动物声并存。浏览器需要点击才会播放。");
 input(audio,"音频文件 URL",d.audio.music,"text",v=>{
  if(!v||core.validUrl(v))core.update("audio.music",v);
 });
 input(audio,"音量 (%)",d.audio.volume,"range",v=>core.update("audio.volume",Number(v)),{min:0,max:100,step:5});
 audio.append(button("▶ 试听自定义音乐",()=>core.playAudio()));
}
function designFields(){
 const d=state();const area=card(body,"🎨 主题颜色与字体");
 const grid=make("div",null,"whole-edit-grid");area.append(grid);
 for(const [key,label] of [["ink","主要文字颜色"],["paper","页面纸张颜色"],["accent","强调颜色"]]){
  input(grid,label,d.design[key],"color",v=>core.update("design."+key,v));
 }
 input(area,"字体",d.design.font,"select",v=>core.update("design.font",v),[
  ["Trebuchet MS","Trebuchet MS"],["Comic Sans MS","Comic Sans MS"],["Verdana","Verdana"],["Georgia","Georgia"],["Arial","Arial"]
 ]);
 input(area,"内容最大宽度",d.design.width,"range",v=>core.update("design.width",Number(v)),{min:880,max:1650,step:50});
 const effects=card(body,"❄️ 暴风雪、动物与手势");
 input(effects,"雪与暴风雪特效",d.design.snow,"select",v=>core.update("design.snow",v),[
  ["snow","正常飘雪 + 阵风暴雪"],["gentle","轻柔飘雪"],["off","关闭飘雪"]
 ]);
 input(effects,"显示动物",d.design.animals?"yes":"no","select",v=>core.update("design.animals",v==="yes"),[
  ["yes","显示"],["no","隐藏"]
 ]);
 input(effects,"动物动画",d.design.animalMotion?"yes":"no","select",v=>core.update("design.animalMotion",v==="yes"),[
  ["yes","动画"],["no","静止"]
 ]);
 input(effects,"动物大小 (%)",d.design.animalScale,"range",v=>core.update("design.animalScale",Number(v)),{min:50,max:160,step:10});
 input(effects,"手势敏感度 (10–26)",d.design.gestureSensitivity,"range",v=>core.update("design.gestureSensitivity",Number(v)),{min:10,max:26,step:1});
 effects.append(button("🌬 预览暴风雪",()=>window.IceStoryWorld?.burst()));
}
function addBlock(section,type){
 const d=state();
 d.blocks[section].push({id:"block"+Math.random().toString(36).slice(2),type,
  text:type==="heading"?"新的标题":type==="link"?"打开资料":"在这里输入教学内容",url:"",alt:""});
 core.importConfig(d,true);render();
}
function modifyBlock(section,index,field,value,live=true){
 const d=state();d.blocks[section][index][field]=value;core.importConfig(d,true);
 if(!live)render();
}
function moveBlock(section,index,delta){
 const d=state(),list=d.blocks[section],next=index+delta;
 if(next<0||next>=list.length)return;
 [list[index],list[next]]=[list[next],list[index]];
 core.importConfig(d,true);render();
}
function deleteBlock(section,index){
 const d=state();d.blocks[section].splice(index,1);core.importConfig(d,true);render();
}
function blockFields(){
 hint(body,"在任何页面加入新段落、标题、图片、影片或链接，并可以重新排序、复制、删除。原本的书本页面和 E-Sumber 已有专门编辑器。");
 const config=state();
 const types=[["heading","标题"],["text","文字"],["image","图片"],["video","YouTube/MP4"],["link","网站链接"]];
 for(const [section,label] of core.sections){
  const area=card(body,label);
  const buttons=make("div",null,"whole-edit-actions");
  for(const [type,title] of types)buttons.append(button("+ "+title,()=>addBlock(section,type),true));
  area.append(buttons);
  const list=config.blocks[section];
  if(!list.length)area.append(make("p","暂无新增元素。"));
  list.forEach((entry,i)=>{
   const card=make("div",null,"whole-edit-item");
   card.append(make("strong","元素 "+(i+1)));
   input(card,"种类",entry.type,"select",v=>modifyBlock(section,i,"type",v,false),types);
   if(["text","heading","link"].includes(entry.type)){
    input(card,"文字／标题",entry.text,"textarea",v=>modifyBlock(section,i,"text",v));
   }
   if(["image","video","link"].includes(entry.type)){
    input(card,"URL 地址",entry.url,"text",v=>modifyBlock(section,i,"url",v));
    input(card,"图片说明／视频标题",entry.alt,"text",v=>modifyBlock(section,i,"alt",v));
   }
   if(entry.type==="image"){
    const picker=make("input");picker.type="file";picker.accept="image/png,image/jpeg,image/webp";
    picker.addEventListener("change",async()=>{
     if(!picker.files?.length)return;
     try{const value=await imageToDataURL(picker.files[0]);modifyBlock(section,i,"url",value,false);}
     catch(e){message("⚠️ "+e.message);}
    });
    card.append(make("span","上传图片："),picker);
   }
   const itemActions=make("div",null,"whole-edit-actions");
   itemActions.append(button("↑",()=>moveBlock(section,i,-1),true));
   itemActions.append(button("↓",()=>moveBlock(section,i,1),true));
   itemActions.append(button("复制",()=>{
    const d=state();d.blocks[section].splice(i+1,0,{...d.blocks[section][i],id:"clone"+Math.random()});core.importConfig(d,true);render();
   },true));
   itemActions.append(button("🗑 删除",()=>deleteBlock(section,i),true));
   card.append(itemActions);area.append(card);
  });
 }
}
function copyText(text){
 navigator.clipboard.writeText(text).then(()=>message("✅ 已复制内容，可到 GitHub 粘贴。"))
 .catch(()=>{core.download();message("复制失败，已改为下载 JSON 文件。");});
}
function publishing(){
 const area=card(body,"🚀 把所有修改发布给学生");
 hint(area,"这是 GitHub Pages 静态网站。老师编辑后先保存在自己的浏览器，其他学生暂时看不到；把 published-content.json 提交到 GitHub 后，全班便能看到新版。");
 const list=make("ol");
 ["先确认首页、书本、题目和 E-Sumber 都编辑完成。",
  "点击「下载整站 JSON」，或复制整站 JSON。",
  "打开 GitHub 的 published-content.json，点击编辑铅笔。",
  "把文件内容全部换成导出的 JSON，并点击 Commit changes。",
  "GitHub Pages 部署为 Success 后，所有学生刷新网页即可查看更新。"].forEach(t=>list.append(make("li",t)));
 area.append(list);
 const buttons=make("div",null,"whole-edit-actions");
 buttons.append(button("⬇ 下载整站 JSON",()=>{core.download();message("✅ 已下载 published-content.json。");}));
 buttons.append(button("📋 复制整站 JSON",()=>copyText(JSON.stringify(core.bundle(),null,2)),true));
 buttons.append(button("🐙 打开 GitHub 发布文件",()=>window.open(
  "https://github.com/g-ipgp24075232-maker/ice-age-virtual-library/edit/main/published-content.json","_blank","noopener,noreferrer"),true));
 buttons.append(button("⬆ 导入备份 JSON",()=>document.getElementById("importFile")?.click(),true));
 area.append(buttons);
 hint(area,"安全提示：任何人都可在自己的浏览器里编辑草稿，但只有你的 GitHub 账户有提交权限，才能把修改发布到正式网站。这里不收集 GitHub 密码或 Token。");
}
function render(){
 tabs.querySelectorAll("button").forEach(b=>{
  const current=b.dataset.tab===tab;
  b.classList.toggle("whole-selected",current);
  b.setAttribute("aria-selected",current?"true":"false");
 });
 body.replaceChildren();
 if(tab==="texts")textFields();
 if(tab==="media")mediaFields();
 if(tab==="design")designFields();
 if(tab==="blocks")blockFields();
 if(tab==="publish")publishing();
}
function setQuick(enabled){
 quick=Boolean(enabled);
 document.body.classList.toggle("whole-quick-mode",quick);
 actions.querySelectorAll("button")[1].textContent=quick?"✕ 结束点击编辑":"✍️ Klik Teks untuk Edit";
 message(quick?"现在打开任意页面，点击有虚线框的文字即可修改。":"点击编辑模式已关闭。");
}
function inlineEdit(key){
 let current=document.getElementById("wholeInlineEdit");
 if(current)current.remove();
 const dialog=make("div",null,"whole-inline-dialog");dialog.id="wholeInlineEdit";
 dialog.setAttribute("role","dialog");dialog.setAttribute("aria-label","编辑页面文字");
 dialog.append(make("h3","✏️ 直接编辑："+key));
 const textarea=make("textarea");textarea.value=state().text[key];dialog.append(textarea);
 const bar=make("div",null,"whole-edit-actions");
 bar.append(button("💾 保存",()=>{
  core.update("text."+key,textarea.value);dialog.remove();
  message("✅ 文字已更新。");
 }));
 bar.append(button("取消",()=>dialog.remove(),true));dialog.append(bar);
 document.body.append(dialog);textarea.focus();
}
document.addEventListener("click",event=>{
 if(!quick)return;
 const target=event.target.closest?.("[data-site-key]");
 if(!target||event.target.closest("#siteMasterEditor"))return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(target.dataset.siteKey in state().text)inlineEdit(target.dataset.siteKey);
},true);
const reset=button("↺ 恢复默认设计",()=>{
 if(!window.confirm("恢复全站设计默认值吗？书本和 E-Sumber 不会删除。"))return;
 core.reset();render();message("设计已经恢复默认状态。");
},true);actions.append(reset);
render();
window.IceWholeEditor={openTab:name=>{tab=name;render();host.scrollIntoView({behavior:"smooth",block:"start"});},render,version:"whole-editor-ui-20261103"};
})();