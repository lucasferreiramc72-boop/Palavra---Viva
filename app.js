const DATA_URL = './mensagens.json';
const $ = (id) => document.getElementById(id);
const today = new Date();
const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
let currentMessage = null;
let messages = [];
const storageKey = 'palavra-viva-favoritos-v1';

$('todayDate').textContent = new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(today);

function getFavorites(){ try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return []} }
function saveFavorites(items){ localStorage.setItem(storageKey,JSON.stringify(items)); updateFavoriteUI(); }
function updateFavoriteUI(){
  const favorites=getFavorites();
  const isSaved=currentMessage && favorites.some(m=>m.id===currentMessage.id);
  $('favoriteBtn').classList.toggle('active',!!isSaved);
  $('favoriteBtn').textContent=isSaved?'♥':'♡';
  $('favoriteSummary').textContent=favorites.length?`${favorites.length} mensagem(ns) salva(s) neste aparelho.`:'Nenhuma mensagem salva ainda.';
}
function render(message){
  currentMessage=message;
  $('messageTitle').textContent=message.titulo;
  $('reference').textContent=message.referencia;
  $('messageText').textContent=message.reflexao;
  $('prayerText').textContent=message.oracao;
  updateFavoriteUI();
}
function selectMessage(items){
  const dated=items.filter(m=>m.data).sort((a,b)=>a.data.localeCompare(b.data));
  const exact=dated.find(m=>m.data===dateKey);
  if(exact)return exact;
  const prior=dated.filter(m=>m.data<=dateKey).at(-1);
  return prior||items[0];
}
async function loadMessages(){
  const cached=localStorage.getItem('palavra-viva-cache');
  if(cached){try{messages=JSON.parse(cached);render(selectMessage(messages))}catch{}}
  try{
    const response=await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error('Conteúdo indisponível');
    const data=await response.json();
    if(!Array.isArray(data.mensagens)||!data.mensagens.length)throw new Error('Sem mensagens');
    messages=data.mensagens;
    localStorage.setItem('palavra-viva-cache',JSON.stringify(messages));
    render(selectMessage(messages));
    $('connectionState').textContent='Atualizado online';
    $('connectionState').classList.remove('offline');
  }catch{
    $('connectionState').textContent=navigator.onLine?'Usando conteúdo salvo':'Offline · conteúdo salvo';
    $('connectionState').classList.add('offline');
    if(!currentMessage){
      $('messageTitle').textContent='Volte em instantes';
      $('reference').textContent='';
      $('messageText').textContent='Não foi possível carregar as mensagens. Confira sua conexão e tente novamente.';
      $('prayerText').textContent='';
    }
  }
}
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
$('favoriteBtn').addEventListener('click',()=>{
  if(!currentMessage)return;
  let favorites=getFavorites();
  const exists=favorites.some(m=>m.id===currentMessage.id);
  favorites=exists?favorites.filter(m=>m.id!==currentMessage.id):[currentMessage,...favorites];
  saveFavorites(favorites);toast(exists?'Removida dos favoritos':'Salva nos favoritos');
});
$('shareBtn').addEventListener('click',async()=>{
  if(!currentMessage)return;
  const text=`${currentMessage.titulo}\n${currentMessage.referencia}\n\n${currentMessage.reflexao}\n\nOração: ${currentMessage.oracao}\n\nPalavra Viva`;
  try{if(navigator.share)await navigator.share({title:'Palavra Viva',text});else{await navigator.clipboard.writeText(text);toast('Mensagem copiada para compartilhar')}}catch(e){if(e.name!=='AbortError')toast('Não foi possível compartilhar agora')}
});
$('showFavoritesBtn').addEventListener('click',()=>{
  const favorites=getFavorites();
  if(!favorites.length){toast('Toque no coração para salvar uma mensagem');return}
  const list=favorites.map((m,i)=>`${i+1}. ${m.titulo} — ${m.referencia}`).join('\n');
  alert(`Mensagens favoritas:\n\n${list}`);
});
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
loadMessages();
