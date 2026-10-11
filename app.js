const $ = (id) => document.getElementById(id);
const now = new Date();
const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const dailyCacheKey = 'palavra-viva-mensagens-cache-v1';
const verseFavKey = 'palavra-viva-versiculos-favoritos-v1';
const messageFavKey = 'palavra-viva-favoritos-v1';
let currentMessage = null;
let messages = [];
let bible = null;
let bookIndex = 0;
let chapterIndex = 0;

$('todayDate').textContent = new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(now);

function getStored(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
function saveStored(key,value){localStorage.setItem(key,JSON.stringify(value))}
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
function dateSort(list){return list.filter(m=>m.data).sort((a,b)=>a.data.localeCompare(b.data))}
function chooseMessage(list){
  const dated=dateSort(list);
  return dated.find(m=>m.data===dateKey)||dated.filter(m=>m.data<=dateKey).at(-1)||list[0];
}
function updateMessageFavorite(){
  const favs=getStored(messageFavKey);
  const saved=currentMessage&&favs.some(m=>m.id===currentMessage.id);
  $('favoriteBtn').classList.toggle('active',!!saved);
  $('favoriteBtn').textContent=saved?'♥':'♡';
  $('favoriteSummary').textContent=favs.length?`${favs.length} mensagem(ns) salva(s) neste aparelho.`:'Nenhuma mensagem salva ainda.';
}
function renderMessage(message){
  if(!message)return;
  currentMessage=message;
  $('messageTitle').textContent=message.titulo;
  $('reference').textContent=message.referencia;
  $('messageText').textContent=message.reflexao;
  $('prayerText').textContent=message.oracao;
  updateMessageFavorite();
}
async function loadMessages(){
  try{const cached=localStorage.getItem(dailyCacheKey);if(cached){messages=JSON.parse(cached);renderMessage(chooseMessage(messages));}}
  catch{}
  try{
    const r=await fetch(`./mensagens.json?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('mensagens indisponíveis');
    const data=await r.json();
    if(!Array.isArray(data.mensagens)||!data.mensagens.length)throw new Error('sem mensagens');
    messages=data.mensagens;localStorage.setItem(dailyCacheKey,JSON.stringify(messages));renderMessage(chooseMessage(messages));
    $('connectionState').textContent='Atualizado online';$('connectionState').classList.remove('offline');
  }catch{
    $('connectionState').textContent=navigator.onLine?'Usando conteúdo salvo':'Offline · conteúdo salvo';$('connectionState').classList.add('offline');
    if(!currentMessage){$('messageTitle').textContent='Volte em instantes';$('reference').textContent='';$('messageText').textContent='Não foi possível carregar a mensagem. Confira sua conexão e tente novamente.';$('prayerText').textContent='';}
  }
}

$('favoriteBtn').addEventListener('click',()=>{
  if(!currentMessage)return;
  let favs=getStored(messageFavKey);const exists=favs.some(m=>m.id===currentMessage.id);
  favs=exists?favs.filter(m=>m.id!==currentMessage.id):[currentMessage,...favs];saveStored(messageFavKey,favs);updateMessageFavorite();toast(exists?'Removida dos favoritos':'Mensagem salva nos favoritos');
});
$('shareBtn').addEventListener('click',async()=>{
  if(!currentMessage)return;
  const text=`${currentMessage.titulo}\n${currentMessage.referencia}\n\n${currentMessage.reflexao}\n\nOração: ${currentMessage.oracao}\n\nPalavra Viva`;
  try{if(navigator.share)await navigator.share({title:'Palavra Viva',text});else{await navigator.clipboard.writeText(text);toast('Mensagem copiada para compartilhar')}}catch(e){if(e.name!=='AbortError')toast('Não foi possível compartilhar agora')}
});
$('showFavoritesBtn').addEventListener('click',()=>{
  const favs=getStored(messageFavKey);if(!favs.length){toast('Toque no coração para salvar uma mensagem');return;}
  alert(`Mensagens favoritas:\n\n${favs.map((m,i)=>`${i+1}. ${m.titulo} — ${m.referencia}`).join('\n')}`);
});

function setTab(viewId){
  document.querySelectorAll('.tab-btn').forEach(btn=>{const active=btn.dataset.tab===viewId;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));});
  document.querySelectorAll('.view').forEach(view=>{const active=view.id===viewId;view.hidden=!active;view.classList.toggle('active-view',active);});
  $('favoriteBtn').hidden=viewId!=='todayView';
  if(viewId==='bibleView')loadBible();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.tab)));

function normalizeText(text){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}
async function loadBible(){
  if(bible){return;}
  $('chapterText').innerHTML='<p class="loading-text">Carregando os 66 livros…</p>';
  try{
    const r=await fetch('./biblia.json');if(!r.ok)throw new Error('arquivo da Bíblia não encontrado');
    const data=await r.json();if(!Array.isArray(data.livros)||data.livros.length!==66)throw new Error('a Bíblia precisa ter 66 livros');
    bible=data.livros;populateBooks();renderChapter();
  }catch(e){$('chapterText').textContent='Não consegui carregar a Bíblia. Verifique se biblia.json foi enviado junto com os arquivos do app e tente novamente.';toast('Arquivo da Bíblia não carregou');}
}
function populateBooks(){
  const select=$('bookSelect');select.replaceChildren();
  bible.forEach((book,index)=>{const op=document.createElement('option');op.value=String(index);op.textContent=book.nome;select.append(op);});
  select.value=String(bookIndex);select.disabled=false;
  select.addEventListener('change',()=>{bookIndex=Number(select.value);chapterIndex=0;populateChapters();renderChapter();});
  populateChapters();
}
function populateChapters(){
  const select=$('chapterSelect');select.replaceChildren();
  const book=bible[bookIndex];
  book.capitulos.forEach((_,index)=>{const op=document.createElement('option');op.value=String(index);op.textContent=`Capítulo ${index+1}`;select.append(op);});
  select.value=String(chapterIndex);select.disabled=false;
  if(!select.dataset.bound){select.addEventListener('change',()=>{chapterIndex=Number(select.value);renderChapter();});select.dataset.bound='1';}
}
function updateChapterPosition(delta){
  chapterIndex+=delta;
  if(chapterIndex<0){if(bookIndex===0){chapterIndex=0;return;}bookIndex--;chapterIndex=bible[bookIndex].capitulos.length-1;}
  if(chapterIndex>=bible[bookIndex].capitulos.length){if(bookIndex>=bible.length-1){chapterIndex=bible[bookIndex].capitulos.length-1;return;}bookIndex++;chapterIndex=0;}
  $('bookSelect').value=String(bookIndex);populateChapters();renderChapter();
}
$('prevChapter').addEventListener('click',()=>{if(bible)updateChapterPosition(-1)});
$('nextChapter').addEventListener('click',()=>{if(bible)updateChapterPosition(1)});
function verseId(bi,ci,vi){return `${bible[bi].id}-${ci+1}-${vi+1}`}
function renderChapter(targetVerse=null){
  if(!bible)return;
  const book=bible[bookIndex],verses=book.capitulos[chapterIndex];
  $('chapterTitle').textContent=`${book.nome} ${chapterIndex+1}`;
  const container=$('chapterText');container.replaceChildren();
  const favs=getStored(verseFavKey);
  verses.forEach((text,index)=>{
    const row=document.createElement('div');row.className='verse';row.id=`verse-${verseId(bookIndex,chapterIndex,index)}`;
    const num=document.createElement('span');num.className='verse-num';num.textContent=String(index+1);
    const body=document.createElement('span');body.className='verse-text';body.textContent=text;
    const fav=document.createElement('button');fav.className='verse-fav';fav.type='button';fav.setAttribute('aria-label',`Salvar ${book.nome} ${chapterIndex+1}:${index+1}`);
    const id=verseId(bookIndex,chapterIndex,index),saved=favs.includes(id);fav.textContent=saved?'♥':'♡';fav.classList.toggle('saved',saved);
    fav.addEventListener('click',()=>toggleVerseFavorite(id,fav));
    row.append(num,body,fav);container.append(row);
  });
  $('chapterSelect').value=String(chapterIndex);
  if(targetVerse){setTimeout(()=>document.getElementById(`verse-${targetVerse}`)?.scrollIntoView({behavior:'smooth',block:'center'}),50);}
}
function toggleVerseFavorite(id,button){
  let favs=getStored(verseFavKey);const exists=favs.includes(id);favs=exists?favs.filter(x=>x!==id):[...favs,id];saveStored(verseFavKey,favs);
  button.textContent=exists?'♡':'♥';button.classList.toggle('saved',!exists);toast(exists?'Versículo removido':'Versículo salvo');
}
function getVerseById(id){
  const [bookId,chapterNo,verseNo]=id.split('-');const bi=bible.findIndex(b=>b.id===bookId),ci=Number(chapterNo)-1,vi=Number(verseNo)-1;
  if(bi<0||!bible[bi].capitulos[ci]?.[vi])return null;
  return {bi,ci,vi,text:bible[bi].capitulos[ci][vi],reference:`${bible[bi].nome} ${chapterNo}:${verseNo}`};
}
function showSearchResults(term){
  const results=$('searchResults'),chapter=$('chapterCard');results.replaceChildren();chapter.hidden=true;results.hidden=false;
  const heading=document.createElement('p');heading.className='results-heading';heading.textContent=`Resultados para “${term}”`;results.append(heading);
  const query=normalizeText(term);let count=0;const max=80;
  outer:for(let bi=0;bi<bible.length;bi++)for(let ci=0;ci<bible[bi].capitulos.length;ci++)for(let vi=0;vi<bible[bi].capitulos[ci].length;vi++){
    const text=bible[bi].capitulos[ci][vi];if(!normalizeText(text).includes(query))continue;
    const item=document.createElement('button');item.type='button';item.className='result-item';
    const ref=document.createElement('span');ref.className='result-ref';ref.textContent=`${bible[bi].nome} ${ci+1}:${vi+1}`;
    const excerpt=document.createElement('span');excerpt.className='result-text';excerpt.textContent=text;item.append(ref,excerpt);
    const selectedId=verseId(bi,ci,vi);item.addEventListener('click',()=>{bookIndex=bi;chapterIndex=ci;$('bookSelect').value=String(bi);populateChapters();$('searchResults').hidden=true;$('chapterCard').hidden=false;$('bibleSearch').value='';renderChapter(selectedId);});
    results.append(item);count++;if(count>=max)break outer;
  }
  if(!count){const empty=document.createElement('p');empty.className='no-results';empty.textContent='Nenhum versículo encontrado. Tente outra palavra.';results.append(empty);}
  else if(count===max){const note=document.createElement('p');note.className='search-hint';note.textContent='Exibindo até 80 resultados. Refine a busca para encontrar outros.';results.append(note);}
}
$('searchForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!bible)await loadBible();const term=$('bibleSearch').value.trim();if(!term||!bible)return;
  if(!normalizeText(term)){toast('Digite uma palavra ou frase');return;}showSearchResults(term);
});
$('bibleSearch').addEventListener('input',()=>{if(!$('bibleSearch').value.trim()){$('searchResults').hidden=true;$('chapterCard').hidden=false;}});
$('showVerseFavoritesBtn').addEventListener('click',()=>{
  if(!bible){toast('Aguarde a Bíblia carregar');return;}
  const saved=getStored(verseFavKey);if(!saved.length){toast('Toque no coração ao lado de um versículo para salvá-lo');return;}
  const results=$('searchResults');results.replaceChildren();$('chapterCard').hidden=true;results.hidden=false;
  const heading=document.createElement('p');heading.className='results-heading';heading.textContent='Versículos salvos';results.append(heading);
  saved.forEach(id=>{const verse=getVerseById(id);if(!verse)return;const item=document.createElement('button');item.type='button';item.className='result-item';const ref=document.createElement('span');ref.className='result-ref';ref.textContent=verse.reference;const text=document.createElement('span');text.className='result-text';text.textContent=verse.text;item.append(ref,text);item.addEventListener('click',()=>{bookIndex=verse.bi;chapterIndex=verse.ci;$('bookSelect').value=String(bookIndex);populateChapters();$('searchResults').hidden=true;$('chapterCard').hidden=false;renderChapter(id);});results.append(item);});
});

loadMessages();
