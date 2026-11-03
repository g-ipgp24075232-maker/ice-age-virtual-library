/* Original Ice Age ambience: procedural audio, no external downloads.
   Extinct animal calls are artistic simulations, NOT authentic recordings. */
(function(){
"use strict";
const AudioContextClass=window.AudioContext||window.webkitAudioContext;
const key="iceAgeSoundV2";
const defaults={enabled:true,master:.65,music:.55,wind:.48,mammoth:.5,animals:.4,ice:.35};
const s={...defaults};
try{
 const old=JSON.parse(localStorage.getItem(key)||"null");
 if(old&&typeof old==="object")for(const name of Object.keys(defaults)){
  if(name==="enabled"&&typeof old[name]==="boolean")s[name]=old[name];
  else if(name!=="enabled"&&Number.isFinite(Number(old[name])))s[name]=Math.max(0,Math.min(1,Number(old[name])));
 }
}catch(_){}
let ctx=null,output=null,narrationBus=null,layers={},timer=0;
let nextChord=0,nextBell=0,nextMammoth=0,nextAnimal=0,nextIce=0;
let chordIndex=0,bellIndex=0,callIndex=0,wasHidden=false;
const $=id=>document.getElementById(id);
const random=(min,max)=>min+Math.random()*(max-min);
const chords=[
 [146.83,174.61,220,293.66],
 [116.54,146.83,174.61,233.08],
 [130.81,164.81,196,261.63],
 [130.81,164.81,196,246.94]
];
const noteOrder=[0,2,3,1,2,0,1,3,2,1,0,2,3,2,1,0];
function save(){try{localStorage.setItem(key,JSON.stringify(s));}catch(_){}}
function report(text){$("iceSoundStatus").textContent=text}
function mark(){const b=$("soundBtn");if(b)b.textContent=s.enabled?"🔊 Bunyi: ON":"🔇 Bunyi: OFF";
 $("iceSoundMute").textContent=s.enabled?"🔇 Senyapkan semua":"🔊 Hidupkan semua";}
const box=document.createElement("section");
box.id="iceSoundPanel";box.hidden=true;
box.setAttribute("aria-label","Tetapan bunyi dan muzik Zaman Air Batu");
box.innerHTML=[
 '<div class="iceSoundTop"><strong>🎧 Suasana Zaman Air Batu</strong><button class="secondary" id="iceSoundClose" type="button">✕</button></div>',
 '<p>🎵 Muzik ais &nbsp; 🌬️ Ribut salji &nbsp; 🦣 Mamot &nbsp; 🐾 Haiwan purba &nbsp; 🧊 Retakan ais</p>',
 '<p class="iceDisclaimer">Bunyi haiwan pupus ialah imaginasi artistik untuk pembelajaran, bukan rakaman sebenar.</p>',
 '<div id="iceSoundSliders"></div>',
 '<div class="iceSoundButtons"><button type="button" id="iceSoundPlay">▶ Mulakan suasana</button>',
 '<button class="secondary" type="button" id="iceSoundMute">🔇 Senyapkan semua</button>',
 '<button class="secondary" type="button" id="iceSoundSample">🦣 Cuba bunyi mamot</button></div>',
 '<p id="iceSoundStatus" role="status" aria-live="polite">Bunyi bermula apabila kamu masuk ke perpustakaan.</p>'
].join("");
const css=document.createElement("style");
css.textContent=[
 "#iceSoundPanel{position:fixed;left:15px;bottom:14px;z-index:1300;max-height:85vh;overflow:auto;width:min(405px,calc(100vw - 30px));background:#f8fdff;color:#194e73;border:3px solid #92d4ec;border-radius:19px;padding:17px;box-shadow:0 15px 50px #28649688;font-size:14px}",
 "#iceSoundPanel[hidden]{display:none}",
 "#iceSoundPanel .iceSoundTop{display:flex;align-items:center;justify-content:space-between;gap:10px}",
 "#iceSoundPanel .iceSoundTop strong{font-size:18px}",
 "#iceSoundPanel .iceSoundRow{display:grid;grid-template-columns:1fr minmax(110px,42%);gap:12px;align-items:center;margin:12px 0}",
 "#iceSoundPanel input[type=range]{width:100%;accent-color:#1774aa}",
 "#iceSoundPanel .iceSoundButtons{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}",
 "#iceSoundPanel button{padding:8px 10px}",
 "#iceSoundPanel #iceSoundStatus{font-size:12px;min-height:30px;color:#2b668c}",
 "#iceSoundPanel .iceDisclaimer{font-size:12px;color:#59738a}"
].join("\n");
document.head.appendChild(css);document.body.appendChild(box);
for(const [name,label] of [
 ["master","🎚️ Jumlah bunyi"],["music","🎵 Muzik latar"],
 ["wind","🌬️ Ribut salji"],["mammoth","🦣 Panggilan mamot"],
 ["animals","🐾 Haiwan purba"],["ice","🧊 Retakan ais"]
]){
 const row=document.createElement("label");row.className="iceSoundRow";
 const title=document.createElement("span");title.textContent=label;
 const input=document.createElement("input");input.type="range";input.min="0";input.max="100";input.step="1";
 input.id="iceVolume-"+name;input.value=Math.round(s[name]*100);input.setAttribute("aria-label",label);
 input.addEventListener("input",()=>{s[name]=Math.max(0,Math.min(1,Number(input.value)/100));save();applyMix()});
 row.append(title,input);$("iceSoundSliders").appendChild(row);
}
function gain(name){const node=ctx.createGain();node.gain.value=s[name];node.connect(narrationBus);layers[name]=node}
function env(param,t,amplitude,attack,hold,release){
 param.setValueAtTime(.0001,t);
 param.linearRampToValueAtTime(amplitude,t+attack);
 param.setValueAtTime(amplitude,t+attack+hold);
 param.exponentialRampToValueAtTime(.0001,t+attack+hold+release);
}
function tone(f,t,d,v,type,destination,endRatio){
 const osc=ctx.createOscillator(),g=ctx.createGain();
 osc.type=type||"sine";osc.frequency.setValueAtTime(f,t);
 if(endRatio)osc.frequency.exponentialRampToValueAtTime(Math.max(30,f*endRatio),t+d*.8);
 env(g.gain,t,v,Math.min(.2,d*.2),Math.max(.01,d*.44),Math.max(.12,d*.3));
 osc.connect(g);g.connect(destination);osc.start(t);osc.stop(t+d+.24);
 osc.onended=()=>{osc.disconnect();g.disconnect()};
}
function createWind(){
 const rate=ctx.sampleRate,length=Math.round(rate*3);
 const buf=ctx.createBuffer(1,length,rate),data=buf.getChannelData(0);
 let low=0;
 for(let i=0;i<length;i++){
  const white=Math.random()*2-1;low=low*.82+white*.18;
  data[i]=low*.8+white*.2;
 }
 const seam=Math.floor(rate*.15);
 for(let i=0;i<seam;i++)data[length-seam+i]=(1-i/seam)*data[length-seam+i]+(i/seam)*data[i];
 for(const spec of [[440,.16,.08,.075,"lowpass"],[160,.14,.09,.048,"bandpass"],[1100,.04,.03,.12,"bandpass"]]){
  const [freq,base,depth,speed,filterType]=spec;
  const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;
  const filter=ctx.createBiquadFilter();filter.type=filterType;filter.frequency.value=freq;
  const amp=ctx.createGain();amp.gain.value=base;
  const osc=ctx.createOscillator(),oscAmp=ctx.createGain();
  osc.frequency.value=speed;oscAmp.gain.value=depth;
  osc.connect(oscAmp);oscAmp.connect(amp.gain);
  src.connect(filter);filter.connect(amp);amp.connect(layers.wind);
  src.start();osc.start();
 }
}
function pad(t){
 const chord=chords[chordIndex%chords.length];chordIndex++;
 chord.forEach((f,i)=>{tone(f,t,11.5,i===0?.07:.055,"sine",layers.music,1.002);
   if(i<2)tone(f*2,t+.09,11,.013,"triangle",layers.music,.998)});
}
function bell(t){
 const notes=chords[(chordIndex+chords.length-1)%chords.length];
 const freq=notes[noteOrder[bellIndex%noteOrder.length]]*(bellIndex%7===0?2:4);
 bellIndex++;
 const osc=ctx.createOscillator(),g=ctx.createGain();
 osc.type="sine";osc.frequency.value=freq;
 g.gain.setValueAtTime(.0001,t);
 g.gain.exponentialRampToValueAtTime(.06,t+.018);
 g.gain.exponentialRampToValueAtTime(.0001,t+2.2);
 osc.connect(g);g.connect(layers.music);osc.start(t);osc.stop(t+2.3);
 osc.onended=()=>{osc.disconnect();g.disconnect()};
}
function mammoth(t){
 // An invented call shaped like a far-away low brass/trumpet: not historical audio evidence.
 const lowpass=ctx.createBiquadFilter();lowpass.type="lowpass";
 lowpass.frequency.setValueAtTime(320,t);
 lowpass.frequency.linearRampToValueAtTime(590,t+1.0);
 lowpass.frequency.linearRampToValueAtTime(260,t+3.4);
 const bus=ctx.createGain();bus.gain.value=.21;bus.connect(lowpass);lowpass.connect(layers.mammoth);
 for(const [freq,level,type] of [[89,.38,"sawtooth"],[178,.10,"triangle"],[118,.19,"sine"]]){
  const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
  o.frequency.setValueAtTime(freq*.78,t);
  o.frequency.exponentialRampToValueAtTime(freq*1.17,t+.95);
  o.frequency.exponentialRampToValueAtTime(freq*.79,t+3.4);
  env(g.gain,t,level,.42,1.1,1.75);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+3.5);
  o.onended=()=>{o.disconnect();g.disconnect()};
 }
 tone(107,t+2.4,2.4,.037,"triangle",layers.mammoth,.68);
}
function otherAnimal(t){
 const mode=callIndex++%3;
 if(mode===0){
   tone(182,t,1.7,.12,"triangle",layers.animals,.68);
   tone(256,t+.14,1.3,.055,"sine",layers.animals,.78);
 }else if(mode===1){
   for(let j=0;j<3;j++)tone(850+j*195,t+j*.31,.38,.045,"sine",layers.animals,1.18);
 }else{
   tone(133,t,1.5,.09,"sawtooth",layers.animals,.73);
   tone(171,t+.37,1.4,.046,"sine",layers.animals,.86);
 }
}
function iceCrack(t){
 const buffer=ctx.createBuffer(1,Math.round(ctx.sampleRate*.24),ctx.sampleRate);
 const arr=buffer.getChannelData(0);
 for(let i=0;i<arr.length;i++)arr[i]=(Math.random()*2-1)*Math.pow(1-i/arr.length,3);
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();
 source.buffer=buffer;filter.type="highpass";filter.frequency.value=750;g.gain.value=.095;
 source.connect(filter);filter.connect(g);g.connect(layers.ice);
 source.start(t);
 source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect()};
 tone(620,t+.06,1.1,.025,"sine",layers.ice,.45);
}
function mixTarget(param,value,seconds){
 param.setTargetAtTime(Math.max(0,value),ctx.currentTime,seconds);
}
function applyMix(){
 if(!ctx)return;
 mixTarget(output.gain,s.enabled?s.master*.65:0,.13);
 for(const name of ["music","wind","mammoth","animals","ice"])mixTarget(layers[name].gain,s[name],.15);
}
function schedule(){
 if(!ctx||ctx.state!=="running")return;
 const end=ctx.currentTime+1.6;
 while(nextChord<end){pad(nextChord);nextChord+=10.4}
 while(nextBell<end){bell(nextBell);nextBell+=1.3}
 if(nextMammoth<end){mammoth(nextMammoth);nextMammoth+=random(28,45)}
 if(nextAnimal<end){otherAnimal(nextAnimal);nextAnimal+=random(15,25)}
 if(nextIce<end){iceCrack(nextIce);nextIce+=random(18,33)}
}
function setup(){
 if(ctx)return true;
 if(!AudioContextClass){report("Pelayar ini tidak menyokong Web Audio.");return false}
 try{
  ctx=new AudioContextClass();
  output=ctx.createGain();output.gain.value=0;output.connect(ctx.destination);
  narrationBus=ctx.createGain();narrationBus.gain.value=1;narrationBus.connect(output);
  for(const name of ["music","wind","mammoth","animals","ice"])gain(name);
  createWind();
  const t=ctx.currentTime;
  nextChord=t+.08;nextBell=t+.15;nextMammoth=t+random(9,14);
  nextAnimal=t+random(13,18);nextIce=t+random(11,18);
  timer=setInterval(schedule,200);
  applyMix();return true;
 }catch(error){
  report("Ralat audio: "+(error?.message||String(error)));console.error(error);return false;
 }
}
async function enter(){
 if(!s.enabled){mark();report("Bunyi dimatikan. Klik Bunyi: OFF untuk hidupkan.");return}
 if(!setup())return;
 try{
   if(ctx.state==="suspended"||ctx.state==="interrupted")await ctx.resume();
   applyMix();schedule();
   report("✅ Suasana Zaman Air Batu bermain sepanjang penerokaan.");
 }catch(error){report("Klik Mulakan suasana untuk membenarkan audio: "+(error?.message||String(error)))}
 mark();
}
function toggle(){
 s.enabled=!s.enabled;save();mark();
 if(s.enabled)enter();
 else{applyMix();report("🔇 Bunyi telah disenyapkan.")}
}
function showSettings(){box.hidden=false;mark()}
function duckForNarration(active){
 if(ctx)narrationBus.gain.setTargetAtTime(active?.24:1,ctx.currentTime,.14);
}
function uiClick(){
 if(!ctx||ctx.state!=="running"||!s.enabled)return;
 tone(620,ctx.currentTime+.015,.17,.026,"sine",layers.ice,1.12);
}
function preview(){
 if(!s.enabled){s.enabled=true;save();mark()}
 if(!setup())return;
 ctx.resume().then(()=>{
  mammoth(ctx.currentTime+.12);
  report("🦣 Suara mamot simulasi sedang dimainkan.");
 }).catch(error=>report("Audio belum dibenarkan: "+error.message));
}
$("iceSoundClose").addEventListener("click",()=>{box.hidden=true});
$("iceSoundPlay").addEventListener("click",()=>{s.enabled=true;save();enter()});
$("iceSoundMute").addEventListener("click",toggle);
$("iceSoundSample").addEventListener("click",preview);
document.addEventListener("visibilitychange",()=>{
 if(!ctx)return;
 if(document.hidden){wasHidden=true;ctx.suspend().catch(()=>{})}
 else if(wasHidden&&s.enabled){ctx.resume().then(()=>{wasHidden=false;schedule()}).catch(()=>report("Klik Mulakan suasana untuk sambung audio."))}
});
window.addEventListener("pagehide",()=>{
 if(timer)clearInterval(timer);
 if(ctx)ctx.close().catch(()=>{});
});
mark();
window.IceSoundscape={enter,toggle,showSettings,duckForNarration,uiClick,isPlaying:()=>!!ctx&&ctx.state==="running"&&s.enabled,version:"original-ice-sound-20261103"};
})();