/* MISI PENJAGA BUMI — Ice Age Ninja quiz.
   Scope is intentionally limited to this single named book.
   Camera frames remain on-device in the existing MediaPipe gesture system. */
(function(){
"use strict";
const ID="b6";
const isGameBook=b=>!!b&&(b.id===ID||String(b.title||"").trim().toUpperCase()==="MISI PENJAGA BUMI");
const defaultQuestions=[
 {q:"Buah apakah yang dihasilkan oleh pokok oak?",answers:[["🌰","Buah oak (acorn)"],["🦣","Mamot"],["🧊","Ais"],["🪨","Batu"]],correct:0,explain:"Buah oak dikenali sebagai acorn. Pokok oak tumbuh di sesetengah kawasan beriklim sederhana."},
 {q:"Apakah haiwan besar yang terkenal hidup pada Zaman Air Batu?",answers:[["🐟","Ikan"],["🦣","Mamot berbulu"],["🌰","Acorn"],["🪨","Batu"]],correct:1,explain:"Mamot berbulu mempunyai bulu tebal yang membantu menyesuaikan diri dengan persekitaran sejuk."},
 {q:"Apakah yang berlaku apabila ais daratan mencair dalam jumlah besar?",answers:[["🪨","Batu bertambah"],["🌰","Acorn membeku"],["🌊","Paras laut naik"],["🐅","Harimau bertambah"]],correct:2,explain:"Air daripada ais daratan yang mencair boleh mengalir ke laut dan menaikkan paras air laut."},
 {q:"Antara berikut, yang manakah tempat perlindungan manusia prasejarah?",answers:[["❄️","Kepingan salji"],["🐟","Ikan"],["🦣","Mamot"],["🏔️","Gua"]],correct:3,explain:"Sesetengah manusia prasejarah berlindung di gua, bergantung pada tempat dan zaman."},
 {q:"Apakah bukti yang boleh membantu ahli sains mengkaji haiwan purba?",answers:[["🦴","Fosil"],["🌊","Ombak"],["❄️","Salji"],["🌰","Acorn"]],correct:0,explain:"Fosil memberi maklumat tentang haiwan dan tumbuhan yang pernah hidup pada masa dahulu."},
 {q:"Apakah yang boleh digunakan oleh manusia prasejarah untuk membuat alat?",answers:[["🐅","Harimau"],["🪨","Batu"],["❄️","Salji"],["🐟","Ikan"]],correct:1,explain:"Manusia prasejarah menggunakan batu untuk menghasilkan pelbagai alat."},
 {q:"Apakah nama kawasan daratan luas yang pernah menghubungkan sebahagian Asia Tenggara ketika paras laut rendah?",answers:[["🐅","Habitat harimau"],["🌰","Hutan oak"],["🗺️","Pentas Sunda"],["🦴","Tapak fosil"]],correct:2,explain:"Pentas Sunda pernah terdedah lebih luas apabila paras laut lebih rendah semasa tempoh glasier."},
 {q:"Apakah keadaan suhu dunia ketika tempoh glasier Zaman Air Batu?",answers:[["🌊","Semua laut kering"],["🐟","Semua ikan pupus"],["🌰","Semua pokok menjadi oak"],["❄️","Lebih sejuk"]],correct:3,explain:"Suhu dunia secara purata lebih sejuk semasa tempoh glasier, tetapi bukan seluruh Bumi dilitupi ais."},
 {q:"Apakah yang membantu manusia prasejarah memanaskan badan dan memasak makanan?",answers:[["🔥","Api"],["🧊","Ais"],["🌊","Air laut"],["🪨","Batu mentah"]],correct:0,explain:"Penggunaan api membantu menyediakan haba dan memasak makanan."},
 {q:"Apakah kesan kenaikan paras laut terhadap daratan rendah di Asia Tenggara?",answers:[["🌰","Buah oak bertambah"],["🌊","Sebahagian daratan ditenggelami air"],["🦣","Semua mamot berhijrah ke Malaysia"],["❄️","Laut menjadi glasier"]],correct:1,explain:"Kenaikan paras laut telah menenggelamkan sebahagian kawasan rendah Pentas Sunda."}
];

function getDefaultConfig(){
 return {
  title:"MISI PENJAGA BUMI",subtitle:"PERMAINAN INTERAKTIF SEJARAH TAHUN 4",
  intro:"Ayuh jelajah Zaman Air Batu! Pecahkan kristal ais yang mengandungi jawapan betul untuk memperoleh markah. Bersediakah kamu?",
  finishTitle:"TAHNIAH, PENJAGA BUMI!",finishMessage:"Teruskan meneroka sejarah, menjaga alam dan belajar daripada bukti masa lalu.",
  themeColor:"#caeff3",crystalColor:"#77b8d8",
  assets:{background:{url:""},introBackground:{url:""},finishBackground:{url:""},answerBackground:{url:""},cursorImage:{url:""}},
  questions:defaultQuestions.map(q=>({...q,points:10,answers:q.answers.map(([emoji,text])=>({emoji,text,image:{url:""}}))}))
 };
}
function config(){
 const b=window.IceSiteData?.getBooks?.()?.find(x=>isGameBook(x));
 const def=getDefaultConfig(),saved=b?.gameConfig;
 if(!saved||typeof saved!=="object")return def;
 return {...def,...saved,assets:{...def.assets,...saved.assets},
  questions:Array.isArray(saved.questions)&&saved.questions.length?saved.questions:def.questions};
}
const questions=new Proxy([],{
 get(_target,property){
  const value=config().questions;
  const result=Reflect.get(value,property,value);
  return typeof result==="function"?result.bind(value):result;
 }
});
const imageValid=value=>/^(https:\/\/[^\s"'<>]+|(?:\.\/)?(?:art|media)\/[\w./%-]+|data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+)$/i.test(String(value||""));
function withImage(asset,callback){
 if(!asset)return;
 if(imageValid(asset.url))callback(asset.url);
 if(asset.mediaId)window.IceBookMedia?.getUrl?.(asset.mediaId).then(url=>{if(url)callback(url)}).catch(()=>{});
}
function theme(stage){
 const cfg=config(),box=mount.querySelector(".ninja-game");if(!box)return;
 box.style.setProperty("--ninja-primary",/^#[\da-f]{6}$/i.test(cfg.themeColor)?cfg.themeColor:"#caeff3");
 box.style.setProperty("--ninja-crystal",/^#[\da-f]{6}$/i.test(cfg.crystalColor)?cfg.crystalColor:"#77b8d8");
 const background=stage==="intro"?cfg.assets.introBackground:stage==="finish"?cfg.assets.finishBackground:cfg.assets.background;
 const chosen=background?.url||background?.mediaId?background:cfg.assets.background;
 withImage(chosen,url=>{if(box.isConnected)box.style.backgroundImage='linear-gradient(180deg,#0d3d6bcc,#2b739895),url("'+url.replace(/["\\]/g,"")+'")';});
 withImage(cfg.assets.answerBackground,url=>{if(box.isConnected)box.style.setProperty("--ninja-answer-bg",'url("'+url.replace(/["\\]/g,"")+'")');});
 withImage(cfg.assets.cursorImage,url=>{if(box.isConnected){box.style.setProperty("--ninja-cursor-url",'url("'+url.replace(/["\\]/g,"")+'")');box.classList.add("ninja-has-custom-cursor");}});
}
function answerHTML(answer){
 const a=Array.isArray(answer)?{emoji:answer[0],text:answer[1]}:answer||{};
 const photo=a.image||{},url=imageValid(photo.url)?photo.url:"";
 const hasPicture=!!(url||photo.mediaId);
 return (hasPicture?'<img class="ninja-answer-photo" alt="'+esc(a.text||"Gambar jawapan")+'" src="'+esc(url||photo.url||"")+'" '+(photo.mediaId?'data-book-media-id="'+esc(photo.mediaId)+'" data-book-media-path="'+esc(photo.url||"")+'"':'')+'>':
 '<span class="ninja-emoji" aria-hidden="true">'+esc(a.emoji||"❄️")+'</span>')+
 (a.text?'<span class="ninja-label">'+esc(a.text)+'</span>':'');
}
const mount=document.createElement("section");mount.id="iceNinjaMount";mount.hidden=true;mount.setAttribute("aria-label","Permainan Misi Penjaga Bumi");
document.getElementById("reader")?.querySelector(".reader-head")?.insertAdjacentElement("afterend",mount);
let active=false,mode="intro",questionIndex=0,points=0,combo=0,correctAnswers=0,wrongAnswers=0,selected=-1,hovered=-1,hoverSince=0,locked=-1,fistSince=0,armed=true,pending=false;
let cursorX=.5,cursorY=.5,remaining=[],currentQuestion=null,feedbackTimer=0,transitionTimer=0,currentSet=null;
const wrongLog=new Map();let reviewIndices=[],reviewAt=0;
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function area(){return mount.querySelector(".ninja-arena");}
function status(message){const x=mount.querySelector(".ninja-feedback");if(x)x.textContent=message;}
function clearTimers(){if(feedbackTimer)clearTimeout(feedbackTimer);if(transitionTimer)clearTimeout(transitionTimer);feedbackTimer=transitionTimer=0;}
function resetHand(){selected=-1;hovered=-1;hoverSince=0;locked=-1;fistSince=0;armed=true;smoothX=null;smoothY=null;}
function isActive(){return active&&mode==="question"&&!pending;}
function enter(){
 exit();active=true;mode="intro";
 document.getElementById("reader")?.classList.add("ice-ninja-mode");
 document.body.classList.add("ice-ninja-active");
 mount.hidden=false;
 showIntro();
}
function exit(){
 active=false;pending=false;mode="intro";clearTimers();resetHand();
 mount.replaceChildren();mount.hidden=true;
 document.getElementById("reader")?.classList.remove("ice-ninja-mode");
 document.body.classList.remove("ice-ninja-active");
}
function shell(inner){
 mount.innerHTML='<div class="ninja-game">'+inner+'</div>';
 theme(mode);
}
function topStats(){
 return '<div class="ninja-top"><div class="ninja-brand"><span class="ninja-top-icon">🦣</span> '+esc(config().title)+' <span class="ninja-top-icon">❄️</span></div>'+
 '<div class="ninja-stats"><span class="ninja-stat">⭐ Markah <strong id="ninjaScore">'+points+'</strong></span>'+
 '<span class="ninja-stat">🏆 Betul <strong id="ninjaCorrect">'+correctAnswers+'</strong></span>'+
 '<span class="ninja-stat">📖 <strong>'+(questionIndex+1)+'</strong> / '+questions.length+'</span></div></div>';
}
function showIntro(){
 mode="intro";resetHand();const cfg=config();
 shell('<div class="ninja-start"><div class="ninja-mascot">🦣❄️</div>'+
 '<small>'+esc(cfg.subtitle)+'</small><h2>❄️ '+esc(cfg.title)+' ❄️</h2>'+
 '<p>'+esc(cfg.intro)+'</p>'+
 '<div class="ninja-howto"><div><span>✋</span> Buka tapak tangan dan halakan ke jawapan.</div>'+
 '<div><span>🔒</span> Tahan selama seketika untuk mengunci sasaran.</div>'+
 '<div><span>✊</span> Genggam tangan untuk memecahkan ais!</div></div>'+
 '<p>Jika tiada kamera, klik jawapan kemudian tekan <b>PECAHKAN AIS</b>. Soalan dipelajari secara santai, tanpa had masa.</p>'+
 '<div class="ninja-bottom"><button id="ninjaBegin">🎮 MULA MISI</button><button id="ninjaCamera" class="secondary">📷 Aktifkan Kamera Gestur</button></div></div>');
 mount.querySelector("#ninjaBegin").onclick=startGame;
 mount.querySelector("#ninjaCamera").onclick=startCamera;
}
function shuffleOptions(){
 // Shuffle choices and maintain the correct answer; each question remains factual.
 const order=[0,1,2,3];
 for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
function startGame(){
 points=0;combo=0;correctAnswers=0;wrongAnswers=0;questionIndex=0;remaining=questions.map((_,i)=>i);wrongLog.clear();reviewIndices=[];reviewAt=0;
 nextQuestion();
}
function nextQuestion(){
 clearTimers();pending=false;resetHand();
 if(questionIndex>=questions.length){showFinish();return;}
 mode="question";
 const q=questions[questionIndex];currentQuestion=q;
 currentSet=shuffleOptions();const scorePercent=Math.round(questionIndex*100/questions.length);
 shell(topStats()+
 '<div class="ninja-progress"><div class="ninja-progress-fill" style="width:'+scorePercent+'%"></div></div>'+
 '<div class="ninja-question"><small>SOALAN '+(questionIndex+1)+' / '+questions.length+' · PILIH JAWAPAN BETUL</small><h2>'+esc(q.q)+'</h2></div>'+
 '<div class="ninja-arena" role="group" aria-label="Empat pilihan jawapan">'+
 currentSet.map((answerIndex,i)=>'<button type="button" class="ninja-target" data-ninja-answer="'+i+'" aria-label="Jawapan '+(i+1)+': '+esc(Array.isArray(q.answers[answerIndex])?q.answers[answerIndex][1]:q.answers[answerIndex]?.text||"Gambar jawapan")+'">'+
 answerHTML(q.answers[answerIndex])+'</button>').join("")+
 '<span class="ninja-cursor" aria-hidden="true">✋</span></div>'+
 '<p class="ninja-feedback" role="status" aria-live="polite">✋ Gerakkan tapak tangan ke kristal, tunggu sehingga terkunci, kemudian ✊ genggam untuk memecahkan!</p>'+
 '<div id="ninjaTracking" class="ninja-tracker" role="status" aria-live="polite">📷 Tekan Kamera Gestur, kemudian gerakkan tangan untuk mengawal penunjuk ✋.</div><div class="ninja-guide">📸 Kamera diproses pada peranti sahaja. <b>Tiada kamera?</b> Klik kristal jawapan kemudian tekan PECAHKAN AIS.</div>'+
 '<div class="ninja-bottom"><button id="ninjaSmash">💥 PECAHKAN AIS</button><button id="ninjaCamera" class="secondary">✋ Kamera Gestur</button>'+
 '<button id="ninjaRestart" class="secondary">↻ Mula Semula</button></div>');
 for(const button of mount.querySelectorAll(".ninja-target")){
  button.addEventListener("click",()=>lockChoice(Number(button.dataset.ninjaAnswer),"mouse"));
 }
 mount.querySelector("#ninjaSmash").onclick=()=>{if(locked>=0)submitChoice(locked);else status("👉 Pilih kristal jawapan dahulu, kemudian tekan PECAHKAN AIS.");};
 mount.querySelector("#ninjaCamera").onclick=startCamera;
 mount.querySelector("#ninjaRestart").onclick=showIntro;
 window.IceBookMedia?.hydrate?.(mount);
}
function displayTarget(index,ratio){
 const targets=[...mount.querySelectorAll(".ninja-target")];
 targets.forEach((button,i)=>{
  button.classList.toggle("ninja-hover",index===i&&locked!==i);
  button.classList.toggle("ninja-locked",locked===i);
  button.querySelector(".ninja-lock-meter")?.remove();
  if(i===index&&ratio>0&&locked!==i){
   const meter=document.createElement("span");meter.className="ninja-lock-meter";meter.textContent=Math.min(100,Math.round(ratio*100))+"%";button.append(meter);
  }
  if(i===locked){
   const marker=document.createElement("span");marker.className="ninja-lock-meter";marker.textContent="🔒";button.append(marker);
  }
 });
}
function lockChoice(i,input){
 if(!isActive()||i<0||i>3)return;
 locked=i;selected=i;hovered=i;hoverSince=0;
 displayTarget(i,1);
 status(input==="mouse"?"🔒 Sasaran dipilih. Tekan PECAHKAN AIS untuk menjawab.":"🔒 Sasaran terkunci! Genggam tangan ✊ untuk memecahkan ais.");
}
function createShards(button){
 if(!button)return;
 const arena=area(),card=button.getBoundingClientRect(),frame=arena?.getBoundingClientRect();
 if(!arena||!frame)return;
 const x=card.left-frame.left,y=card.top-frame.top,w=card.width,h=card.height;
 const xs=[0,34,67,100],ys=[0,33,69,100];
 const angles=[-36,17,-12,24,-21,31,-28,12,-15];
 const pieces=[];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const i=row*3+col;
  const l=xs[col],r=xs[col+1],t=ys[row],b=ys[row+1];
  const jitter=(i%3-1)*5;
  const polygon='polygon('+
   l+'% '+t+'%,'+((l+r)/2)+'% '+(t+6+jitter)+'%,'+r+'% '+t+'%,'+
   (r+jitter)+'% '+((t+b)/2)+'%,'+r+'% '+b+'%,'+
   ((l+r)/2)+'% '+(b-5)+'%,'+l+'% '+b+'%,'+
   (l-jitter)+'% '+((t+b)/2)+'%)';
  const fragment=button.cloneNode(true);
  fragment.removeAttribute("data-ninja-answer");
  fragment.removeAttribute("aria-label");
  fragment.tabIndex=-1;fragment.disabled=true;
  fragment.className="ninja-fragment";
  fragment.setAttribute("aria-hidden","true");
  fragment.style.left=x+"px";fragment.style.top=y+"px";
  fragment.style.width=w+"px";fragment.style.height=h+"px";
  fragment.style.clipPath=polygon;
  fragment.style.setProperty("--dx",Math.round((col-1)*120+(i%2?30:-20))+"px");
  fragment.style.setProperty("--dy",Math.round((row-1)*88-50+(i%2?-25:15))+"px");
  fragment.style.setProperty("--spin",angles[i]+"deg");
  fragment.style.setProperty("--delay",(i%4*32)+"ms");
  arena.append(fragment);pieces.push(fragment);
 }
 const cracks=document.createElement("div");
 cracks.className="ninja-crack-overlay";cracks.setAttribute("aria-hidden","true");
 cracks.style.left=x+"px";cracks.style.top=y+"px";
 cracks.style.width=w+"px";cracks.style.height=h+"px";
 arena.append(cracks);
 button.classList.add("ninja-impact");
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  pieces.forEach(piece=>piece.classList.add("ninja-fragment-fly"));
 }));
 setTimeout(()=>{button.style.visibility="hidden";cracks.remove();},220);
 setTimeout(()=>pieces.forEach(piece=>piece.remove()),1400);
}
function submitChoice(slot){
 if(!isActive()||locked<0)return;
 pending=true;armed=false;
 const q=currentQuestion,optionIndex=currentSet[slot],button=mount.querySelector('.ninja-target[data-ninja-answer="'+slot+'"]');
 const correct=optionIndex===q.correct;
 if(correct){
  const gained=Math.max(1,Math.min(100,Number(q.points)||10));
  points+=gained;correctAnswers++;combo++;
  createShards(button);
  status("✅ SYABAS! +"+gained+" MARKAH ❄️ "+q.explain);
  const score=mount.querySelector("#ninjaScore");if(score)score.textContent=points;
  const count=mount.querySelector("#ninjaCorrect");if(count)count.textContent=correctAnswers;
  transitionTimer=setTimeout(()=>{questionIndex++;nextQuestion();},2100);
 }else{
  wrongAnswers++;combo=0;
  if(!wrongLog.has(questionIndex))wrongLog.set(questionIndex,new Set());
  wrongLog.get(questionIndex).add(optionIndex);
  button?.classList.add("ninja-wrong");
  status("💙 Belum tepat! Cuba sasaran yang lain. Tiada markah ditolak.");
  transitionTimer=setTimeout(()=>{
   pending=false;resetHand();displayTarget(-1,0);
   button?.classList.remove("ninja-wrong");
   status("✋ Cari jawapan yang betul dan cuba sekali lagi.");
  },1050);
 }
}
function answerName(answer){
 const a=Array.isArray(answer)?{text:answer[1]}:answer||{};
 return String(a.text||"").trim()||"Jawapan bergambar";
}
function reviewWrong(){
 return [...wrongLog.keys()].sort((a,b)=>a-b);
}
function showReview(){
 clearTimers();mode="review";pending=false;
 const questionNumber=reviewIndices[reviewAt];
 if(questionNumber===undefined){showFinish();return;}
 const q=questions[questionNumber],wrong=wrongLog.get(questionNumber)||new Set();
 const correctIndex=Number(q.correct)||0;
 shell('<div class="ninja-review"><p class="ninja-review-kicker">SEMAKAN · SOALAN '+(questionNumber+1)+' / '+questions.length+'</p>'+
 '<h2>'+esc(q.q)+'</h2>'+
 '<p class="ninja-review-context">'+(wrong.size?
 'Kamu pernah memilih '+wrong.size+' jawapan kurang tepat. Lihat pembetulan di bawah.':
 'Soalan ini telah dijawab dengan betul tanpa kesilapan.')+'</p>'+
 '<div class="ninja-review-options">'+(q.answers||[]).slice(0,4).map((answer,i)=>
 '<div class="ninja-review-choice'+(i===correctIndex?' is-right':'')+(wrong.has(i)?' is-wrong':'')+'">'+
 '<div class="ninja-review-choice-media">'+answerHTML(answer)+'</div>'+
 '<div class="ninja-review-tag">'+(i===correctIndex?'JAWAPAN BETUL':wrong.has(i)?'JAWAPAN SALAH DIPILIH':'PILIHAN '+String.fromCharCode(65+i))+'</div></div>').join("")+'</div>'+
 '<div class="ninja-review-explanation"><strong>Penjelasan Jawapan</strong><p>'+esc(q.explain||"Lihat jawapan betul di atas.")+'</p></div>'+
 '<p class="ninja-review-counter">Semakan '+(reviewAt+1)+' daripada '+reviewIndices.length+'</p>'+
 '<div class="ninja-bottom"><button id="ninjaReviewPrev" class="secondary">Soalan Sebelumnya</button>'+
 '<button id="ninjaReviewNext">Soalan Seterusnya</button>'+
 '<button id="ninjaReviewBack" class="secondary">Kembali ke Keputusan</button></div></div>');
 mount.querySelector("#ninjaReviewPrev").disabled=reviewAt===0;
 mount.querySelector("#ninjaReviewNext").disabled=reviewAt>=reviewIndices.length-1;
 mount.querySelector("#ninjaReviewPrev").onclick=()=>{reviewAt--;showReview();};
 mount.querySelector("#ninjaReviewNext").onclick=()=>{reviewAt++;showReview();};
 mount.querySelector("#ninjaReviewBack").onclick=showFinish;
 window.IceBookMedia?.hydrate?.(mount);
}
function openReview(indices,index){
 reviewIndices=indices.slice();
 reviewAt=Math.max(0,reviewIndices.indexOf(index));
 showReview();
}
function showFinish(){
 clearTimers();mode="finish";pending=false;
 const cfg=config(),wrong=reviewWrong();
 const total=questions.reduce((sum,q)=>sum+Math.max(1,Math.min(100,Number(q.points)||10)),0);
 shell('<div class="ninja-finish"><div class="ninja-ice-crest" aria-hidden="true"><span></span><span></span><span></span></div>'+
 '<h2>'+esc(cfg.finishTitle)+'</h2>'+
 '<p>Kamu berjaya melengkapkan semua soalan Zaman Air Batu.</p>'+
 '<div class="ninja-stats"><span class="ninja-stat">Jumlah Markah <strong>'+points+' / '+total+'</strong></span>'+
 '<span class="ninja-stat">Jawapan Betul <strong>'+correctAnswers+' / '+questions.length+'</strong></span>'+
 '<span class="ninja-stat">Soalan Perlu Disemak <strong>'+wrong.length+'</strong></span></div>'+
 '<div class="ninja-mistake-summary"><h3>Semak Kesilapan Saya</h3>'+
 (wrong.length?'<p>Pilih soalan yang pernah dijawab salah untuk melihat jawapan yang betul dan sebabnya.</p>'+
 '<div class="ninja-mistake-list">'+wrong.map(i=>'<button class="ninja-mistake-item" data-review-question="'+i+'">'+
 '<strong>Soalan '+(i+1)+'</strong><span>'+esc(questions[i].q)+'</span><small>Lihat pembetulan</small></button>').join("")+'</div>':
 '<p>Tiada kesilapan direkodkan. Kamu juga boleh menyemak semua soalan.</p>')+
 '</div><p>'+esc(cfg.finishMessage)+'</p>'+
 '<div class="ninja-bottom">'+(wrong.length?'<button id="ninjaReviewWrong">Semak Semua Soalan Salah</button>':'')+
 '<button id="ninjaReviewAll" class="secondary">Semak Semua Soalan</button>'+
 '<button id="ninjaAgain">Main Semula</button>'+
 '<button id="ninjaBack" class="secondary">Kembali ke Rak Buku</button></div></div>');
 mount.querySelectorAll("[data-review-question]").forEach(button=>{
  button.onclick=()=>openReview(wrong,Number(button.dataset.reviewQuestion));
 });
 if(wrong.length)mount.querySelector("#ninjaReviewWrong").onclick=()=>openReview(wrong,wrong[0]);
 mount.querySelector("#ninjaReviewAll").onclick=()=>openReview(questions.map((_,i)=>i),0);
 mount.querySelector("#ninjaAgain").onclick=startGame;
 mount.querySelector("#ninjaBack").onclick=()=>window.home?.();
}
function startCamera(){
 const camera=window.IceGesture;
 if(!camera){status("⚠️ Modul kamera tidak tersedia. Klik jawapan menggunakan tetikus atau sentuhan.");return;}
 camera.show?.();
 if(camera.isActive?.())return;
 camera.start?.();
}
// The game cursor must track every detected hand, not only perfect palm/fist
// classifications. Coordinates map to the visible answer crystals.
let smoothX=null,smoothY=null,lastHandAt=0,handNotice="";
function handNoticeUpdate(message){
 const tag=mount.querySelector("#ninjaTracking");
 if(tag&&tag.textContent!==message)tag.textContent=message;
}
function onHandLost(){
 if(!isActive())return;
 if(performance.now()-lastHandAt<270)return; // tolerate a couple dropped frames
 const cur=mount.querySelector(".ninja-cursor");
 cur?.classList.remove("visible");
 handNoticeUpdate("📷 Tangan belum dikesan. Letakkan seluruh tapak tangan dalam kamera dan pastikan pencahayaan mencukupi.");
 hovered=-1;hoverSince=0;fistSince=0;smoothX=null;smoothY=null;
 if(locked<0)displayTarget(-1,0);
}
function palmPose(points){
 // Compare fingertip and PIP-to-wrist lengths. A relaxed/partly bent palm is
 // still tracked; classification is used only for locking and smashing.
 const wrist=points[0];
 let openCount=0,closedCount=0;
 for(const [tip,pip,mcp] of [[8,6,5],[12,10,9],[16,14,13],[20,18,17]]){
  const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const tipW=d(points[tip],wrist),pipW=d(points[pip],wrist);
  const tipBase=d(points[tip],points[mcp]),pipBase=d(points[pip],points[mcp]);
  if(tipW>pipW*1.09&&tipBase>pipBase*1.08)openCount++;
  else if(tipW<pipW*1.07||tipBase<pipBase*1.07)closedCount++;
 }
 return {open:openCount>=3, fist:closedCount>=3&&openCount<=1,
         extended:openCount,curled:closedCount};
}
function handTargetAt(x,y){
 const arena=area();if(!arena)return -1;
 const rect=arena.getBoundingClientRect();
 const atX=rect.left+rect.width*x,atY=rect.top+rect.height*y;
 const targets=[...arena.querySelectorAll(".ninja-target")];
 let hit=-1;
 // Real DOM boxes, not an approximation of video quadrants.
 for(let i=0;i<targets.length;i++){
  const r=targets[i].getBoundingClientRect();
  if(atX>=r.left&&atX<=r.right&&atY>=r.top&&atY<=r.bottom){hit=i;break;}
 }
 return hit;
}
function handleHand(points,now,mirrored){
 if(!isActive()||!Array.isArray(points)||points.length<21)return;
 const palm=points[9];
 if(!Number.isFinite(palm.x)||!Number.isFinite(palm.y))return;
 lastHandAt=performance.now();
 const targetX=Math.max(.01,Math.min(.99,mirrored?1-palm.x:palm.x));
 const targetY=Math.max(.01,Math.min(.99,palm.y));
 // Light smoothing removes camera jitter while visibly tracking every frame.
 smoothX=smoothX===null?targetX:smoothX*.53+targetX*.47;
 smoothY=smoothY===null?targetY:smoothY*.53+targetY*.47;
 const pose=palmPose(points);
 const cursor=mount.querySelector(".ninja-cursor");
 if(cursor){
  cursor.classList.add("visible");
  cursor.textContent=pose.fist?"✊":"✋";
  cursor.style.left=(smoothX*100)+"%";
  cursor.style.top=(smoothY*100)+"%";
  cursor.dataset.pose=pose.fist?"fist":pose.open?"palm":"tracking";
 }
 const hit=handTargetAt(smoothX,smoothY);
 if(pose.fist){
  handNoticeUpdate("✊ Genggaman dikesan. "+(locked>=0?"Pecahkan kristal terkunci!":"Buka tapak tangan dan kunci jawapan dahulu."));
  if(locked>=0&&armed){
   if(!fistSince)fistSince=now;
   if(now-fistSince>=145){armed=false;submitChoice(locked);}
  }else fistSince=0;
  return;
 }
 fistSince=0;
 if(!pose.open){
  // Critical: NEVER freeze the cursor when fingers are partially curled.
  handNoticeUpdate("✋ Tangan dikesan dan penunjuk bergerak. Buka sekurang-kurangnya 3 jari untuk mengunci kristal.");
  if(locked<0){hovered=-1;hoverSince=0;displayTarget(-1,0);}
  return;
 }
 armed=true;
 handNoticeUpdate(locked>=0?"🔒 Kristal terkunci! Genggam tangan ✊ untuk memecahkannya.":
  hit>=0?"✋ Tapak tangan dikesan — tahan di atas kristal untuk mengunci.":
  "✋ Tapak tangan dikesan — gerakkan tangan ke atas satu kristal ais.");
 if(locked>=0){
  // Keep tracking even while locked. Moving deliberately to another crystal
  // clears the old lock so children can correct their aim before smashing.
  if(hit>=0&&hit!==locked){
   if(hovered!==hit){hovered=hit;hoverSince=now;}
   if(now-hoverSince>420){locked=-1;hoverSince=now;displayTarget(hit,0);}
  }else{hovered=hit;hoverSince=now;}
  if(locked>=0){displayTarget(locked,1);return;}
 }
 if(hit<0){hovered=-1;hoverSince=0;displayTarget(-1,0);return;}
 if(hit!==hovered){hovered=hit;hoverSince=now;}
 const ratio=Math.min(1,(now-hoverSince)/600);
 displayTarget(hit,ratio);
 if(ratio>=1)lockChoice(hit,"gesture");
}
window.IceNinja={isGameBook,enter,exit,isActive,isInGame:()=>active,handleHand,onHandLost,getDefaultConfig,
 version:"ice-age-ninja-hand-pointer-fix-v2"};
})();