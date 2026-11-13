/* E-Sumber: Editable reference library for Malaysian Year 4 History.
   Edits are local drafts; a teacher must export JSON and publish via GitHub
   for changes to appear to everyone. No login or GitHub credentials stored. */
(function () {
  "use strict";
  const adapter=window.IceReferenceData;
  const container=document.getElementById("sourceList");
  const editor=document.getElementById("referenceEditorArea");
  const search=document.getElementById("referenceSearch");
  const filter=document.getElementById("referenceFilter");
  const toggle=document.getElementById("referenceEditToggle");
  if(!adapter||!container||!editor||!search||!filter||!toggle)return;
  // Kategori Institusi Maklumat (bukan jenis fail seperti jurnal/laman web).
  const categories=[
    ["arkib","Arkib"],
    ["muzium","Muzium"],
    ["memorial","Memorial"],
    ["warisan","Tapak Warisan Sejarah"],
    ["galeri","Galeri"],
    ["perpustakaan","Perpustakaan"],
    ["persatuan","Persatuan Sejarah"],
    ["pusat","Pusat Sumber"],
    ["bstp","Bahagian Sumber Teknologi Pendidikan (BSTP)"],
    ["kerajaan","Kementerian/Jabatan/Agensi Kerajaan"]
  ];
  // Also recognise drafts created before institution-based categories existed.
  const legacyType={"artikel":"Perpustakaan","laman":"Pusat Sumber",
    "buku":"Perpustakaan","dokumen":"Pusat Sumber","video":"Pusat Sumber","lain":"Lain-lain"};
  const previousType={"artikel":"perpustakaan","laman":"pusat",
    "buku":"perpustakaan","dokumen":"pusat","video":"pusat","lain":"pusat"};
  const categoryKey=item=>categories.some(pair=>pair[0]===item?.type)?
    item.type:(previousType[item?.type]||"pusat");
  filter.replaceChildren();
  const all=document.createElement("option");all.value="";all.textContent="Semua Kategori Institusi";filter.append(all);
  categories.forEach(([id,label])=>{
    const option=document.createElement("option");option.value=id;option.textContent=label;filter.append(option);
  });
  filter.setAttribute("aria-label","Tapis kategori institusi maklumat");
  search.placeholder="🔎 Cari sumber, institusi atau sinopsis...";
  const checks=[
    ["kredibiliti","Kredibiliti (autoriti sumber)"],
    ["ketepatan","Ketepatan (fakta & bukti)"],
    ["konteks","Konteks (latar sejarah)"],
    ["kesepadanan","Kesepadanan (sesuai Tahun 4)"],
    ["keselamatan","Keselamatan (selamat dibuka)"]
  ];
  let editMode=false;
  let editingId=null;
  const uid=()=>"ref-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
  const text=(value)=>String(value==null?"":value).trim();
  const roots=()=>adapter.getSources();
  const isUrl=url=>/^https:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(text(url));
  const css=document.createElement("style");
  css.textContent=[
    ".reference-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:17px 0}",
    ".reference-controls input{flex:2;min-width:175px;padding:11px;border:2px solid #b4ddec;border-radius:10px}",
    ".reference-controls select{flex:1;min-width:160px;padding:11px;border:2px solid #b4ddec;border-radius:10px;background:white}",
    ".reference-list{display:grid;gap:14px}",
    ".reference-group{display:grid;gap:12px;margin:10px 0 20px}",
    ".reference-group-title{font-size:1.17rem;color:#285977;border-bottom:3px solid #b7dce8;padding:9px 3px;margin:8px 0}",
    ".reference-group-count{font-size:.8rem;font-weight:normal;color:#50738a;margin-left:8px}",
    ".reference-linkbox{display:grid;gap:5px;background:#e6f5f9;border:1px solid #b9dde9;border-radius:11px;padding:11px;margin:13px 0;overflow-wrap:anywhere}",
    ".reference-linkbox a{font-weight:700;text-decoration:underline;color:#115c9a}",
    ".reference-linkbox .reference-url{font-size:.75rem;color:#506d85;overflow-wrap:anywhere}",
    ".reference-synopsis-title{font-size:1.02rem;color:#315d77;margin:15px 0 4px}",
    ".reference-institution{margin:8px 0;color:#385f7b}",
    ".reference-card details.reference-bibliography{border-top:1px solid #d2e7ee;padding-top:10px}",
    ".reference-card{background:#f8fcff;border:2px solid #d5e9f3;border-radius:15px;padding:17px;border-left:7px solid #5ab0cf}",
    ".reference-card h3{margin:6px 0 4px;color:#174c72;font-size:1.2rem}",
    ".reference-card .reference-meta{display:flex;flex-wrap:wrap;gap:7px;align-items:center;color:#406785;font-size:.86rem}",
    ".reference-card .reference-pill{display:inline-block;padding:4px 9px;border-radius:12px;background:#def2fc;color:#1c597d;font-size:.8rem}",
    ".reference-card .reference-warning{background:#fff6d9;color:#8b601e}",
    ".reference-card .reference-apa{background:white;border-left:3px solid #84bdd9;padding:10px 12px;margin:12px 0;font-size:.92rem;overflow-wrap:anywhere}",
    ".reference-card .reference-apa em{font-style:italic}",
    ".reference-card p{line-height:1.55;margin:10px 0}",
    ".reference-card a{display:inline-block;overflow-wrap:anywhere}",
    ".reference-card details{margin:10px 0}",
    ".reference-card details p{margin:6px 0;font-size:.88rem}",
    ".reference-form{margin:16px 0;padding:20px;background:#e9f8ff;border:2px solid #7fbcd9;border-radius:17px}",
    ".reference-form h2{color:#175779;margin:0 0 10px}",
    ".reference-form-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:14px}",
    ".reference-form label{display:block;font-weight:bold;color:#315d7d;font-size:.92rem;margin:12px 0 4px}",
    ".reference-form input,.reference-form textarea,.reference-form select{width:100%;border:2px solid #b1d9ea;border-radius:10px;padding:10px;font:inherit;background:white}",
    ".reference-form textarea{resize:vertical;min-height:74px}",
    ".reference-form .reference-note{font-size:.86rem;color:#52718a}",
    ".reference-form .reference-error{color:#a72c2c;font-weight:bold}",
    ".reference-edit-banner{padding:12px;margin:14px 0;border-radius:12px;background:#fff6df;border:1px solid #e9d09a}",
    ".reference-empty{padding:22px;border:2px dashed #c1dae8;border-radius:12px;text-align:center}",
    "@media(max-width:650px){.reference-form-grid{grid-template-columns:1fr}.reference-form{padding:12px}}"
  ].join("\n");
  document.head.appendChild(css);
  container.classList.add("reference-list");
  function node(tag,className,content){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(content!=null)el.textContent=String(content);
    return el;
  }
  function button(caption,onClick,secondary=false){
    const btn=node("button",secondary?"secondary":"",caption);
    btn.type="button";btn.addEventListener("click",onClick);return btn;
  }
  function appendTextBlock(parent,value,tag="p",className=""){
    if(!text(value))return;
    parent.appendChild(node(tag,className,value));
  }
  function categoryLabel(key){
    return categories.find(pair=>pair[0]===key)?.[1]||legacyType[key]||"Kategori Institusi Maklumat";
  }
  function sourceAuthor(item){
    return text(item.author)||text(item.institution)||"Penulis tidak dinyatakan";
  }
  function sourceYear(item){
    const year=text(item.year);
    return /^[12]\d{3}$/.test(year)?year:"n.d.";
  }
  function citation(item){
    const author=sourceAuthor(item);
    const year=sourceYear(item);
    const title=text(item.title)||"Tajuk tidak dinyatakan";
    const publisher=text(item.publisher);
    const url=isUrl(item.url)?text(item.url):"";
    const noPublisher=publisher.toLowerCase()===author.toLowerCase();
    return author+". ("+year+"). "+title+"."+
      (publisher&&!noPublisher?" "+publisher+".":"")+(url?" "+url:"");
  }
  function notify(message){
    const el=document.getElementById("referenceMessage");
    if(el)el.textContent=message;
  }
  function persist(message){
    adapter.saveDraft();
    notify(message||"Perubahan disimpan sebagai draf dalam pelayar ini sahaja.");
  }
  function buildCard(item,index){
    const card=node("article","reference-card");
    const meta=node("div","reference-meta");
    meta.appendChild(node("span","reference-pill",categoryLabel(item.type)));
    if(text(item.topic))meta.appendChild(node("span","reference-pill",item.topic));
    card.appendChild(meta);
    card.appendChild(node("h3","",text(item.title)||"Rujukan tanpa tajuk"));
    const institution=node("p","reference-institution");
    institution.append(node("strong","","Institusi: "),document.createTextNode(text(item.institution)||text(item.publisher)||text(item.author)||"Tidak dinyatakan"));
    card.appendChild(institution);
    // Direct original URL ABOVE the synopsis, as required for teacher references.
    const linkBox=node("div","reference-linkbox");
    linkBox.appendChild(node("strong","","Pautan Sumber Asal"));
    if(isUrl(item.url)){
      const link=node("a","reference-primary-link","🔗 Buka Sumber Asal");
      link.href=text(item.url);link.target="_blank";link.rel="noopener noreferrer";
      linkBox.appendChild(link);
      linkBox.appendChild(node("small","reference-url",text(item.url)));
    }else{
      linkBox.appendChild(node("span","reference-note","Pautan HTTPS belum disediakan. Guru boleh tambah pautan melalui Edit E-Sumber."));
    }
    card.appendChild(linkBox);
    card.appendChild(node("h4","reference-synopsis-title","Sinopsis Kandungan"));
    appendTextBlock(card,item.description||item.synopsis||"Sinopsis belum ditambah.");
    // Optional bibliographic details after the synopsis.
    if(text(item.year)||text(item.author)||text(item.publisher)){
      const details=document.createElement("details");details.className="reference-bibliography";
      details.appendChild(node("summary","","Maklumat bibliografi"));
      details.appendChild(node("p","reference-apa",citation(item)));
      card.appendChild(details);
    }
    const ev=item.evaluation||{};
    if(checks.some(pair=>text(ev[pair[0]]))){
      const details=document.createElement("details");
      details.appendChild(node("summary","","Penilaian Sumber 5K"));
      checks.forEach(([key,label])=>{
        if(text(ev[key]))appendTextBlock(details,label+": "+ev[key]);
      });
      card.appendChild(details);
    }
    if(editMode){
      const actions=node("div","actions");
      actions.appendChild(button("✏️ Edit",()=>openForm(item.id??index),true));
      actions.appendChild(button("📄 Duplikasi",()=>{
        const clone=JSON.parse(JSON.stringify(item));
        clone.id=uid();clone.title=(text(clone.title)||"Rujukan")+" (Salinan)";
        roots().push(clone);persist("Rujukan telah diduplikasi.");render();openForm(clone.id);
      },true));
      actions.appendChild(button("🗑 Padam",()=>{
        if(!window.confirm("Padam rujukan ini daripada draf setempat?"))return;
        const list=roots(),i=list.indexOf(item);
        if(i<0)return;
        list.splice(i,1);
        if(editingId===item.id)editingId=null;
        persist("Rujukan dipadam daripada draf setempat.");render();
      },true));
      card.appendChild(actions);
    }
    return card;
  }
  function render(){
    const q=text(search.value).toLowerCase();
    const type=text(filter.value);
    const entries=roots().filter(item=>
      (!type||categoryKey(item)===type)&&
      (!q||[item.title,item.author,item.institution,item.publisher,item.year,item.description,item.synopsis,item.topic,item.url,categoryLabel(item.type)]
        .some(value=>text(value).toLowerCase().includes(q)))
    );
    container.replaceChildren();
    const count=document.getElementById("referenceCount");
    if(count)count.textContent=entries.length+" daripada "+roots().length+" sumber rujukan";
    if(!entries.length)container.append(node("p","reference-empty","Tiada rujukan sepadan. Cuba kategori atau carian lain."));
    else{
      const groups=new Map();
      entries.forEach((item,index)=>{
        const key=categoryKey(item);
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push({item,index});
      });
      // When no category filter is active, group by institution category.
      for(const [category,items] of groups){
        const group=node("section","reference-group");
        const header=node("h2","reference-group-title",categoryLabel(category));
        header.appendChild(node("span","reference-group-count","("+items.length+" sumber)"));
        group.appendChild(header);
        items.forEach(({item,index})=>group.appendChild(buildCard(item,index)));
        container.appendChild(group);
      }
    }
    toggle.textContent=editMode?"✕ Tutup Mod Suntingan":"✏️ Edit E-Sumber (Guru)";
  }
  function input(parent,label,key,value,kind="input",hint=""){
    const wrapper=node("div","");
    const id="refField-"+key;
    const l=node("label","",label);l.htmlFor=id;
    const el=document.createElement(kind==="textarea"?"textarea":"input");
    el.id=id;el.name=key;el.value=text(value);
    if(kind==="textarea")el.rows=3;
    if(key==="url"){el.type="url";el.placeholder="https://...";el.inputMode="url";}
    if(key==="year"){el.placeholder="2025 atau n.d.";}
    if(key==="title"){el.required=true;el.maxLength=500;}
    wrapper.append(l,el);
    if(hint)wrapper.append(node("small","reference-note",hint));
    parent.append(wrapper);
    return el;
  }
  function openForm(id){
    if(!editMode)setEditMode(true);
    editingId=id??null;
    const list=roots();
    const item=id==null?null:list.find((it,index)=>String(it.id??index)===String(id));
    const record=item?JSON.parse(JSON.stringify(item)):{
      id:uid(),type:"kerajaan",author:"",institution:"",year:"",title:"",publisher:"",
      topic:"Zaman Air Batu",description:"",url:"",evaluation:{}
    };
    const frm=node("form","reference-form");
    frm.id="referenceForm";
    frm.noValidate=true;
    frm.append(node("h2","",item?"✏️ Sunting sumber rujukan":"➕ Tambah sumber rujukan"));
    frm.append(node("p","reference-note","Masukkan maklumat daripada sumber asal. Jangan reka nama penulis atau tahun penerbitan. Format rujukan disediakan sebagai panduan sahaja."));
    const grid=node("div","reference-form-grid");
    const titleField=input(grid,"Tajuk sumber *","title",record.title);
    const institution=input(grid,"Institusi / Organisasi","institution",record.institution);
    const author=input(grid,"Penulis / Penyedia (pilihan)","author",record.author);
    const year=input(grid,"Tahun penerbitan","year",record.year);
    const publisher=input(grid,"Penerbit / Nama laman","publisher",record.publisher);
    const url=input(grid,"Pautan sumber (HTTPS)","url",record.url);
    const topic=input(grid,"Topik / Kata kunci","topic",record.topic);
    frm.append(grid);
    const typeLabel=node("label","","Kategori Institusi Maklumat");typeLabel.htmlFor="refType";
    const sel=document.createElement("select");sel.name="type";sel.id="refType";
    categories.forEach(([value,label])=>{
      const option=document.createElement("option");option.value=value;option.textContent=label;
      sel.append(option);
    });sel.value=categoryKey(record);
    frm.append(typeLabel,sel);
    input(frm,"Sinopsis Kandungan","description",record.description,"textarea");
    const details=document.createElement("details");
    const summary=node("summary","","Penilaian 5K (pilihan)");details.append(summary);
    checks.forEach(([key,label])=>{
      input(details,label,key,record.evaluation?.[key]||"","textarea");
    });
    frm.append(details);
    const errors=node("p","reference-error");errors.setAttribute("role","alert");frm.append(errors);
    const actions=node("div","actions");
    actions.append(button("💾 Simpan rujukan",()=>frm.requestSubmit()));
    actions.append(button("Batal",()=>{editingId=null;editor.replaceChildren();},true));
    frm.append(actions);
    frm.addEventListener("submit",ev=>{
      ev.preventDefault();
      const values=Object.fromEntries(new FormData(frm).entries());
      if(!text(values.title)){errors.textContent="Sila masukkan tajuk sumber.";titleField.focus();return;}
      if(text(values.url)&&!isUrl(values.url)){
        errors.textContent="Sila guna pautan HTTPS lengkap, atau kosongkan jika belum disahkan.";
        url.focus();return;
      }
      if(text(values.year)&&!(/^([12]\d{3}|n\.d\.)$/i.test(text(values.year)))){
        errors.textContent="Tahun: 4 digit (cth. 2024) atau n.d.";
        year.focus();return;
      }
      const saved={
        ...record,
        title:text(values.title),author:text(values.author),
        institution:text(values.institution),year:text(values.year),publisher:text(values.publisher),
        url:text(values.url),topic:text(values.topic),type:values.type,
        description:text(values.description),evaluation:{}
      };
      checks.forEach(([key])=>saved.evaluation[key]=text(values[key]));
      if(item)Object.assign(item,saved);
      else roots().push(saved);
      editingId=null;
      persist("✅ Rujukan disimpan dalam pelayar ini. Eksport JSON untuk menerbitkan melalui GitHub.");
      editor.replaceChildren();
      render();
    });
    editor.replaceChildren(frm);
    frm.scrollIntoView({behavior:"smooth",block:"start"});
    if(!item)titleField.focus({preventScroll:true});
  }
  function setEditMode(on){
    editMode=Boolean(on);
    editor.replaceChildren();
    const note=document.getElementById("referenceEditNote");
    if(note)note.hidden=!editMode;
    const add=document.getElementById("referenceAdd");
    if(add)add.hidden=!editMode;
    render();
  }
  search.addEventListener("input",render);
  filter.addEventListener("change",render);
  toggle.addEventListener("click",()=>setEditMode(!editMode));
  document.getElementById("referenceAdd")?.addEventListener("click",()=>openForm(null));
  window.IceReferences={
    render,openEditor(){
      if(!editMode)setEditMode(true);
      document.getElementById("resources")?.scrollIntoView({behavior:"smooth",block:"start"});
    },
    add(){openForm(null);},version:"editable-sources-20261103"
  };
  render();
})();