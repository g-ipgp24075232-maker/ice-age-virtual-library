/* MISI PENJAGA BUMI — Ice Age Ninja quiz.
   Scope is intentionally limited to this single named book.
   Camera frames remain on-device in the existing MediaPipe gesture system. */
(function(){
"use strict";
const ID="b6";
const isGameBook=b=>!!b&&(b.id===ID||String(b.title||"").trim().toUpperCase()==="MISI PENJAGA BUMI");
const questions=[
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
const mount=document.createElement("section");mount.id="iceNinjaMount";mount.hidden=true;mount.setAttribute("aria-label","Permainan Misi Penjaga Bumi");
document.getElementById("reader")?.querySelector(".reader-head")?.insertAdjacentElement("afterend",mount);
let active=false,mode="intro",questionIndex=0,points=0,combo=0,correctAnswers=0,wrongAnswers=0,selected=-1,hovered=-1,hoverSince=0,locked=-1,fistSince=0,armed=true,pending=false;
let cursorX=.5,cursorY=.5,remaining=[],currentQuestion=null,feedbackTimer=0,transitionTimer=0,currentSet=null;
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function area(){return mount.querySelector(".ninja-arena");}
function status(message){const x=mount.querySelector(".ninja-feedback");if(x)x.textContent=message;}
function clearTimers(){if(feedbackTimer)clearTimeout(feedbackTimer);if(transitionTimer)clearTimeout(transitionTimer);feedbackTimer=transitionTimer=0;}
function resetHand(){selected=-1;hovered=-1;hoverSince=0;locked=-1;fistSince=0;armed=true;}
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
}
function topStats(){
 return '<div class="ninja-top"><div class="ninja-brand"><span class="ninja-top-icon">🦣</span> MISI PENJAGA BUMI <span class="ninja-top-icon">❄️</span></div>'+
 '<div class="ninja-stats"><span class="ninja-stat">⭐ Markah <strong id="ninjaScore">'+points+'</strong></span>'+
 '<span class="ninja-stat">🏆 Betul <strong id="ninjaCorrect">'+correctAnswers+'</strong></span>'+
 '<span class="ninja-stat">📖 <strong>'+(questionIndex+1)+'</strong> / '+questions.length+'</span></div></div>';
}
function showIntro(){
 mode="intro";resetHand();
 shell('<div class="ninja-start"><div class="ninja-mascot">🦣❄️</div>'+
 '<small>PERMAINAN INTERAKTIF SEJARAH TAHUN 4</small><h2>❄️ MISI PENJAGA BUMI ❄️</h2>'+
 '<p>Ayuh jelajah Zaman Air Batu! Pecahkan kristal ais yang mengandungi jawapan betul untuk memperoleh markah. Bersediakah kamu?</p>'+
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
 points=0;combo=0;correctAnswers=0;wrongAnswers=0;questionIndex=0;remaining=questions.map((_,i)=>i);
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
 currentSet.map((answerIndex,i)=>'<button type="button" class="ninja-target" data-ninja-answer="'+i+'" aria-label="Jawapan '+(i+1)+': '+esc(q.answers[answerIndex][1])+'">'+
 '<span class="ninja-emoji" aria-hidden="true">'+q.answers[answerIndex][0]+'</span>'+
 '<span class="ninja-label">'+esc(q.answers[answerIndex][1])+'</span></button>').join("")+
 '<span class="ninja-cursor" aria-hidden="true">✋</span></div>'+
 '<p class="ninja-feedback" role="status" aria-live="polite">✋ Gerakkan tapak tangan ke kristal, tunggu sehingga terkunci, kemudian ✊ genggam untuk memecahkan!</p>'+
 '<div class="ninja-guide">📸 Kamera diproses pada peranti sahaja. <b>Tiada kamera?</b> Klik kristal jawapan kemudian tekan PECAHKAN AIS.</div>'+
 '<div class="ninja-bottom"><button id="ninjaSmash">💥 PECAHKAN AIS</button><button id="ninjaCamera" class="secondary">✋ Kamera Gestur</button>'+
 '<button id="ninjaRestart" class="secondary">↻ Mula Semula</button></div>');
 for(const button of mount.querySelectorAll(".ninja-target")){
  button.addEventListener("click",()=>lockChoice(Number(button.dataset.ninjaAnswer),"mouse"));
 }
 mount.querySelector("#ninjaSmash").onclick=()=>{if(locked>=0)submitChoice(locked);else status("👉 Pilih kristal jawapan dahulu, kemudian tekan PECAHKAN AIS.");};
 mount.querySelector("#ninjaCamera").onclick=startCamera;
 mount.querySelector("#ninjaRestart").onclick=showIntro;
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
 const arena=area(),rect=button.getBoundingClientRect(),parent=arena.getBoundingClientRect();
 const x=rect.left-parent.left+rect.width/2,y=rect.top-parent.top+rect.height/2;
 const symbols=["❄️","✦","💎","✧","❅","✦","🧊","✧"];
 symbols.forEach((symbol,i)=>{
  const element=document.createElement("span");element.className="ninja-spark";element.textContent=symbol;
  element.style.left=x+"px";element.style.top=y+"px";
  const angle=i/8*Math.PI*2;
  element.style.setProperty("--dx",Math.round(Math.cos(angle)*(85+i*5))+"px");
  element.style.setProperty("--dy",Math.round(Math.sin(angle)*(75+i*4))+"px");
  element.style.setProperty("--rot",(i%2?-170:180)+"deg");
  arena.append(element);setTimeout(()=>element.remove(),850);
 });
}
function submitChoice(slot){
 if(!isActive()||locked<0)return;
 pending=true;armed=false;
 const q=currentQuestion,optionIndex=currentSet[slot],button=mount.querySelector('.ninja-target[data-ninja-answer="'+slot+'"]');
 const correct=optionIndex===q.correct;
 if(correct){
  const gained=10;
  points+=gained;correctAnswers++;combo++;
  button?.classList.add("ninja-broken");createShards(button);
  status("✅ SYABAS! +"+gained+" MARKAH ❄️ "+q.explain);
  const score=mount.querySelector("#ninjaScore");if(score)score.textContent=points;
  const count=mount.querySelector("#ninjaCorrect");if(count)count.textContent=correctAnswers;
  transitionTimer=setTimeout(()=>{questionIndex++;nextQuestion();},2100);
 }else{
  wrongAnswers++;combo=0;
  button?.classList.add("ninja-wrong");
  status("💙 Belum tepat! Cuba sasaran yang lain. Tiada markah ditolak.");
  transitionTimer=setTimeout(()=>{
   pending=false;resetHand();displayTarget(-1,0);
   button?.classList.remove("ninja-wrong");
   status("✋ Cari jawapan yang betul dan cuba sekali lagi.");
  },1050);
 }
}
function showFinish(){
 clearTimers();mode="finish";pending=false;
 shell('<div class="ninja-finish"><div class="ninja-mascot">🏆🦣❄️</div>'+
 '<h2>TAHNIAH, PENJAGA BUMI!</h2>'+
 '<p>Kamu berjaya melengkapkan semua misi Zaman Air Batu!</p>'+
 '<div class="ninja-stats"><span class="ninja-stat">⭐ Jumlah markah <strong>'+points+' / '+questions.length*10+'</strong></span>'+
 '<span class="ninja-stat">✅ Jawapan betul <strong>'+correctAnswers+' / '+questions.length+'</strong></span></div>'+
 '<p>Teruskan meneroka sejarah, menjaga alam dan belajar daripada bukti masa lalu.</p>'+
 '<div class="ninja-bottom"><button id="ninjaAgain">↻ MAIN SEMULA</button><button id="ninjaBack" class="secondary">📚 Kembali ke Rak Buku</button></div></div>');
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
function onHandLost(){
 if(!isActive())return;
 const cur=mount.querySelector(".ninja-cursor");cur?.classList.remove("visible");
 if(locked<0){hovered=-1;hoverSince=0;displayTarget(-1,0);}
 fistSince=0;
}
function handleHand(points,now,mirrored){
 if(!isActive()||!Array.isArray(points)||points.length<21)return;
 const wrist=points[0],scale=Math.max(.001,Math.hypot(points[9].x-wrist.x,points[9].y-wrist.y));
 const curled=[8,12,16,20].filter((tip,i)=>{
  const pip=[6,10,14,18][i];
  return Math.hypot(points[tip].x-wrist.x,points[tip].y-wrist.y)<
   Math.hypot(points[pip].x-wrist.x,points[pip].y-wrist.y)*1.16;
 }).length;
 const extended=[8,12,16,20].filter((tip,i)=>{
  const pip=[6,10,14,18][i];
  return Math.hypot(points[tip].x-wrist.x,points[tip].y-wrist.y)>
    Math.hypot(points[pip].x-wrist.x,points[pip].y-wrist.y)*1.16;
 }).length;
 const fist=curled>=3&&extended<=1;
 const open=extended>=3&&!fist;
 if(!fist&&!open){fistSince=0;return;}
 if(open){armed=true;fistSince=0;}
 const hand=points[9];
 const x=Math.min(.98,Math.max(.02,mirrored?1-hand.x:hand.x));
 const y=Math.min(.98,Math.max(.02,hand.y));
 const cursor=mount.querySelector(".ninja-cursor");
 if(cursor){
  cursor.classList.add("visible");cursor.textContent=fist?"✊":"✋";
  cursor.style.left=(x*100)+"%";cursor.style.top=(y*100)+"%";
 }
 if(open){
  const i=(y<.5?0:2)+(x<.5?0:1);
  if(locked>=0){displayTarget(locked,1);return;}
  if(i!==hovered){hovered=i;hoverSince=now;}
  const ratio=Math.min(1,(now-hoverSince)/650);
  displayTarget(i,ratio);
  if(ratio>=1)lockChoice(i,"gesture");
 }else if(fist&&locked>=0&&armed){
  if(!fistSince)fistSince=now;
  if(now-fistSince>=175){armed=false;submitChoice(locked);}
 }
}
window.IceNinja={isGameBook,enter,exit,isActive,isInGame:()=>active,handleHand,onHandLost,
 version:"ice-age-ninja-gesture-game-v1"};
})();