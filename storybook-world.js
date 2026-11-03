/* Living storybook scenes and weather animations. No external scripts or libraries.
   Respects reduced-motion preferences and visibility for performance. */
(function () {
  "use strict";
  const root=document.body;
  const welcome=document.getElementById("welcome");
  const library=document.getElementById("library");
  if(!welcome||!library)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const key="iceStoryWeather";
  let mode="snow",active=true,stormTimer=null;
  try{const v=localStorage.getItem(key);if(["snow","gentle","off"].includes(v))mode=v;}catch(_){}
  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!=null)node.textContent=text;
    return node;
  }
  function decorated(parent,scene){
    const aurora=el("div","world-aurora");aurora.setAttribute("aria-hidden","true");
    parent.prepend(aurora);
    const mammoth=el("img","world-illustration world-mammoth");
    mammoth.src="art/story-mammoth.svg";mammoth.alt="";mammoth.loading="eager";
    mammoth.decoding="async";
    mammoth.setAttribute("aria-hidden","true");
    const tiger=el("img","world-illustration world-sabertooth");
    tiger.src="art/story-sabertooth.svg";tiger.alt="";tiger.loading="eager";
    tiger.decoding="async";
    tiger.setAttribute("aria-hidden","true");
    parent.append(mammoth,tiger);
    ["world-crystal-left","world-crystal-right"].forEach(name=>{
      const c=el("div","world-crystal "+name);c.setAttribute("aria-hidden","true");parent.append(c);
    });
    ["world-star-one","world-star-two","world-star-three"].forEach(name=>{
      const star=el("span","world-floating-star "+name,"✦");
      star.setAttribute("aria-hidden","true");parent.append(star);
    });
    if(scene==="welcome"){
      const label=el("div","world-story-caption","🦣 Mari jelajah dunia ais!");
      label.setAttribute("aria-hidden","true");
      parent.append(label);
    }
  }
  decorated(welcome,"welcome");
  decorated(library,"library");
  const weather=el("div");
  weather.id="iceWorldWeather";
  weather.setAttribute("aria-hidden","true");
  for(const name of ["snow-soft-light","snow-far","snow-mid","snow-near","snow-haze"]){
    weather.append(el("div",name==="snow-soft-light"?"snow-soft-light":
      name==="snow-haze"?"snow-haze":"snow-layer "+name));
  }
  root.prepend(weather);
  const bar=el("div","weather-controls");
  bar.setAttribute("aria-label","Kawalan kesan cuaca");
  const status=el("span","weather-status","❄️ Salji");
  const toggle=el("button","secondary");
  toggle.type="button";toggle.title="Hidupkan atau matikan animasi salji";
  toggle.setAttribute("aria-label","Hidupkan atau matikan animasi salji");
  const gentle=el("button","secondary","🌬️ Ribut");
  gentle.type="button";gentle.title="Lihat ribut salji sementara";
  gentle.setAttribute("aria-label","Tunjukkan kesan ribut salji sementara");
  bar.append(status,toggle,gentle);
  root.append(bar);
  function update(){
    root.classList.toggle("weather-off",mode==="off");
    root.classList.toggle("weather-gentle",mode==="gentle");
    weather.classList.remove("storm-burst");
    toggle.textContent=mode==="off"?"❄️ Salji: OFF":mode==="gentle"?"❄️ Salji: Lembut":"❄️ Salji: ON";
    status.textContent=mode==="off"?"Cuaca dimatikan":mode==="gentle"?"Salji lembut":"Cuaca bersalji";
    gentle.disabled=mode==="off"||reduced.matches;
    try{localStorage.setItem(key,mode);}catch(_){}
  }
  function burst(){
    if(mode==="off"||reduced.matches||document.hidden)return;
    weather.classList.remove("storm-burst");
    void weather.offsetWidth;
    weather.classList.add("storm-burst");
    status.textContent="🌬️ Ribut salji!";
    setTimeout(()=>{
      weather.classList.remove("storm-burst");
      status.textContent=mode==="gentle"?"Salji lembut":"Cuaca bersalji";
    },5600);
  }
  function scheduleGust(){
    if(stormTimer)clearTimeout(stormTimer);
    if(!active)return;
    stormTimer=setTimeout(()=>{
      if(!document.hidden&&mode==="snow")burst();
      scheduleGust();
    },18000+Math.random()*18000);
  }
  toggle.addEventListener("click",()=>{
    mode=mode==="snow"?"gentle":mode==="gentle"?"off":"snow";
    update();
  });
  gentle.addEventListener("click",burst);
  document.addEventListener("visibilitychange",()=>{
    active=!document.hidden;
    if(document.hidden){if(stormTimer)clearTimeout(stormTimer);weather.classList.remove("storm-burst");}
    else scheduleGust();
  });
  reduced.addEventListener?.("change",update);
  // Existing book covers dynamically re-render; decorate only covers that exist.
  const shelf=document.getElementById("shelves");
  if(shelf){
    const markCovers=()=>{
      shelf.querySelectorAll(".book").forEach((book,index)=>{
        book.style.setProperty("--book-index",String(index));
        if(!book.getAttribute("aria-label"))book.setAttribute("aria-label",book.textContent.trim());
      });
    };
    const observer=new MutationObserver(markCovers);
    observer.observe(shelf,{childList:true});
    markCovers();
  }
  update();scheduleGust();
  window.IceStoryWorld={
    burst,changeWeather:newMode=>{if(["snow","gentle","off"].includes(newMode)){mode=newMode;update();}},
    version:"storybook-world-20261103"
  };
})();