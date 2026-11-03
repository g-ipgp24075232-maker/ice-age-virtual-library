/* Perpustakaan Ais: physical page dragging with mouse / touchscreen.
   Uses only same-origin JavaScript, independent of webcam or MediaPipe. */
(function () {
  "use strict";
  const stage=document.getElementById("bookStage");
  const page=document.getElementById("pageContent");
  const state=window.BookPageState;
  if(!stage||!page||!state)return;
  const style=document.createElement("style");
  style.textContent=[
    "#reader{max-width:1080px;background:linear-gradient(135deg,#f5fcff,#e7f4fc)}",
    ".flipbook-stage{position:relative;isolation:isolate;perspective:1400px;min-height:390px;padding:12px;margin:18px 0;background:linear-gradient(90deg,#825e43 0 2%,#daeffb 2% 98%,#85674b 98%);box-shadow:0 18px 33px #3674a64d,inset 11px 0 12px #4e3a2c33;border-radius:12px;touch-action:pan-y}",
    ".flipbook-stage .page{position:relative;min-height:365px;margin:0;background:linear-gradient(90deg,#eee6d6,#fffef8 7%,#fffdf4 96%,#e8dfcc);border:2px solid #d3c4a4;border-radius:5px 16px 16px 5px;box-shadow:inset 16px 0 25px #8e765128;touch-action:pan-y}",
    ".flipbook-stage .page:not(.turning){cursor:grab}",
    ".flipbook-stage .page:has(button:hover){cursor:default}",
    ".flipbook-stage .page.turning{cursor:grabbing}",
    ".flip-edge{position:absolute;top:50%;z-index:3;transform:translateY(-50%);border-radius:50%;background:#e4f6ffeb;color:#165782;padding:8px 12px;box-shadow:0 2px 13px #32799a70}",
    "#flipPrev{left:-5px}#flipNext{right:-5px}",
    ".flip-edge[disabled]{opacity:.3;cursor:not-allowed}",
    ".paper-overlay{position:absolute!important;z-index:6;margin:0!important;pointer-events:none!important;overflow:hidden;backface-visibility:hidden;transform-style:preserve-3d;will-change:transform;box-shadow:18px 8px 25px #38567575!important}",
    ".paper-overlay *{pointer-events:none!important}",
    ".paper-preview{position:absolute!important;z-index:5;margin:0!important;pointer-events:none!important;overflow:hidden;backface-visibility:hidden;transform:translateZ(0)}",
    ".paper-preview *{pointer-events:none!important}",
    ".flip-guide{text-align:center;color:#235b85;font-size:.9rem;margin:8px}",
    "@media(max-width:600px){.flipbook-stage{padding:7px;min-height:350px}.flipbook-stage .page{padding:18px;min-height:340px}.flip-edge{top:auto;bottom:6px;transform:none;padding:7px}#flipPrev{left:5px}#flipNext{right:5px}}",
    "@media(prefers-reduced-motion:reduce){.paper-overlay{transition:none!important}}"
  ].join("\n");
  document.head.append(style);
  function createEdge(id,sign,dir,label){
    const btn=document.createElement("button");
    btn.type="button";btn.className="flip-edge";btn.id=id;btn.textContent=sign;
    btn.setAttribute("aria-label",label);btn.title=label;
    btn.addEventListener("click",()=>window.changePage(dir));
    stage.append(btn);return btn;
  }
  const prev=createEdge("flipPrev","❮",-1,"Halaman sebelumnya");
  const next=createEdge("flipNext","❯",1,"Halaman seterusnya");
  let busy=false,overlay=null,preview=null,pointer=null;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration=540;
  const getIndex=()=>state.getIndex();
  const setIndex=n=>state.setIndex(n);
  const valid=d=>getIndex()+d>=0&&getIndex()+d<state.pageCount();
  function update(){
    prev.disabled=!valid(-1);next.disabled=!valid(1);
    stage.setAttribute("aria-label","Halaman "+(getIndex()+1)+" daripada "+state.pageCount());
  }
  function visualClone(className){
    const copy=page.cloneNode(true);
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach(node=>node.removeAttribute("id"));
    // Avoid duplicate video decoders/iframes and animation flicker while cloning a page.
    copy.querySelectorAll("iframe,video,audio").forEach(node=>node.remove());
    copy.querySelectorAll("button,input,select,textarea,a").forEach(node=>{
      node.setAttribute("tabindex","-1");
    });
    copy.classList.add(className);
    copy.setAttribute("aria-hidden","true");
    copy.style.left=page.offsetLeft+"px";
    copy.style.top=page.offsetTop+"px";
    copy.style.width=page.offsetWidth+"px";
    copy.style.height=page.offsetHeight+"px";
    copy.style.boxSizing="border-box";
    return copy;
  }
  function prepare(d){
    if(!valid(d))return false;
    const from=getIndex();
    const outgoing=visualClone("paper-overlay");
    // Build the incoming preview synchronously, then restore the REAL current
    // page before the browser can paint. No actual page change until release.
    try {
      setIndex(from+d);
      window.renderPage();
      const incoming=visualClone("paper-preview");
      setIndex(from);
      window.renderPage();
      preview=incoming;
      outgoing.style.transformOrigin=d===1?"left center":"right center";
      outgoing.style.transform="rotateY(0deg)";
      stage.append(incoming);
      stage.append(outgoing);
      overlay=outgoing;
      page.classList.add("turning");
      update();
      return true;
    } catch(error) {
      setIndex(from);
      window.renderPage();
      incomingCleanup();
      throw error;
    }
  }
  function incomingCleanup(){
    if(preview){preview.remove();preview=null;}
    if(overlay){overlay.remove();overlay=null;}
    page.classList.remove("turning");
  }
  function rotation(d,p){
    if(overlay)overlay.style.transform="rotateY("+((d===1?-180:180)*p)+"deg)";
  }
  function clear(){
    incomingCleanup();
    busy=false;pointer=null;
    update();
  }
  function animate(d,from,to,finished){
    if(!overlay||reduced){rotation(d,to);finished();return;}
    const layer=overlay;
    layer.style.transition="none";
    rotation(d,from);
    void layer.offsetWidth;
    layer.style.transition="transform "+duration+"ms cubic-bezier(.2,.75,.2,1)";
    requestAnimationFrame(()=>rotation(d,to));
    let done=false;
    function complete(){if(done)return;done=true;layer.removeEventListener("transitionend",onEnd);finished();}
    function onEnd(e){if(e.propertyName==="transform")complete();}
    layer.addEventListener("transitionend",onEnd);
    setTimeout(complete,duration+120);
  }
  function turn(d){
    if(busy||!valid(d)){update();return true;}
    const from=getIndex();
    busy=true;
    if(!prepare(d)){clear();return true;}
    animate(d,0,1,()=>{
      // Commit only when the animation completes.
      setIndex(from+d);
      window.renderPage();
      clear();
      window.stopVoice?.();
      window.playSound?.();
    });
    return true;
  }
  // Webcam API: begin a page grab, follow the pupil's pinched hand and release.
  // Reuses exactly the same 3D page layer as mouse dragging.
  let webcamGrab=null;
  function beginGesture(direction){
    const d=Number(direction);
    if(busy||webcamGrab||!valid(d))return false;
    busy=true;
    const old=getIndex();
    if(!prepare(d)){clear();return false;}
    webcamGrab={direction:d,old,progress:0};
    return true;
  }
  function moveGesture(progress){
    if(!webcamGrab||!overlay)return false;
    const p=Math.max(0,Math.min(1,Number(progress)||0));
    webcamGrab.progress=p;
    rotation(webcamGrab.direction,p);
    return true;
  }
  function finishGesture(commit){
    if(!webcamGrab)return false;
    const grabbed=webcamGrab;
    webcamGrab=null;
    const shouldTurn=Boolean(commit);
    animate(grabbed.direction,grabbed.progress,shouldTurn?1:0,()=>{
      // Cancel: the real page was never changed. No rollback or flash.
      if(shouldTurn){
        setIndex(grabbed.old+grabbed.direction);
        window.renderPage();
      }
      clear();
      if(shouldTurn){
        window.stopVoice?.();
        window.playSound?.();
      }
    });
    return true;
  }
    function canStart(target){
    return !target.closest("button,a,input,textarea,select,video,iframe,audio,[contenteditable=true],.block-card");
  }
  stage.addEventListener("pointerdown",e=>{
    if(busy||e.button!==0||!canStart(e.target))return;
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),started:false,dir:0,progress:0,old:getIndex()};
  });
  stage.addEventListener("pointermove",e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    if(!pointer.started){
      if(Math.abs(dx)<22)return;
      if(Math.abs(dy)>Math.abs(dx)*1.2){pointer=null;return;}
      const dir=dx<0?1:-1;
      const bounds=page.getBoundingClientRect();
      if(!valid(dir)){pointer=null;return;}
      if(e.pointerType==="mouse"){
        const correctSide=dir>0?pointer.x>bounds.left+bounds.width*.38:pointer.x<bounds.left+bounds.width*.62;
        if(!correctSide){pointer=null;return;}
      }
      busy=true;
      const data=pointer;
      if(!prepare(dir)){clear();return;}
      pointer=data;pointer.started=true;pointer.dir=dir;
      try{stage.setPointerCapture(e.pointerId);}catch(_){}
    }
    if(pointer?.started){
      if(e.cancelable)e.preventDefault();
      pointer.progress=Math.min(1,Math.abs(dx)/Math.max(160,page.offsetWidth*.72));
      rotation(pointer.dir,pointer.progress);
    }
  },{passive:false});
  function end(e,cancel){
    if(!pointer||pointer.id!==e.pointerId)return;
    const p=pointer;
    if(!p.started){pointer=null;return;}
    const dx=e.clientX-p.x;
    const fast=Math.abs(dx)>75&&performance.now()-p.t<460;
    const success=!cancel&&(p.progress>=.34||fast);
    animate(p.dir,p.progress,success?1:0,()=>{
      if(success){
        setIndex(p.old+p.dir);
        window.renderPage();
      }
      clear();
      if(success){window.stopVoice?.();window.playSound?.();}
    });
    try{stage.releasePointerCapture(e.pointerId);}catch(_){}
  }
  stage.addEventListener("pointerup",e=>end(e,false));
  stage.addEventListener("pointercancel",e=>end(e,true));
  update();
  window.IceFlipbook={
    turn, syncButtons:update, beginGesture, moveGesture, finishGesture,
    canTurn:valid, isBusy:()=>busy, version:"no-flash-release-commit-20261103"
  };
})();
