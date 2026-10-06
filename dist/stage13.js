const checkoutSubmit=document.querySelector('.submit-order[type="submit"]');
if(checkoutSubmit){
  const consent=document.createElement('label');
  consent.className='checkout-consent';
  consent.innerHTML='<input id="termsConsent" type="checkbox" required> <span>Saya menyetujui <a href="terms.html" target="_blank" rel="noopener">Syarat Penggunaan</a>, <a href="privacy.html" target="_blank" rel="noopener">Kebijakan Privasi</a>, dan memahami bahwa transaksi ini masih berupa simulasi.</span>';
  checkoutSubmit.before(consent);
}

const stageStyle=document.createElement('style');
stageStyle.textContent='.checkout-consent{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;margin:18px 0 2px;padding:14px;border:1px solid var(--line);border-radius:13px;background:#fff}.checkout-consent input{width:18px;height:18px;margin-top:2px;accent-color:var(--forest)}.checkout-consent a{color:var(--rust);text-decoration:underline}.production-note{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:#fff3dc;color:#80551f;font-size:.78rem;font-weight:700}';
document.head.append(stageStyle);

const nativeFetch=window.fetch.bind(window);
window.fetch=(input,options={})=>{
  const path=typeof input==='string'?input:input?.url;
  if(path==='/api/orders'&&options.method==='POST'&&typeof options.body==='string'){
    try{const payload=JSON.parse(options.body);payload.acceptedTerms=Boolean(document.querySelector('#termsConsent')?.checked);options={...options,body:JSON.stringify(payload)}}catch{}
  }
  return nativeFetch(input,options);
};

const modeBadge=document.querySelector('.production-note');
if(modeBadge)nativeFetch('/api/health').then(response=>response.ok?response.json():Promise.reject()).then(data=>{modeBadge.textContent=data.status==='ok'?'Demo online · Database terhubung':'Lingkungan demonstrasi'}).catch(()=>{modeBadge.textContent='Demo online · Status database belum tersedia'});

nativeFetch('/api/store-settings').then(response=>response.ok?response.json():Promise.reject()).then(({settings={}})=>{
  if(settings.primaryColor){document.documentElement.style.setProperty('--forest',settings.primaryColor);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',settings.primaryColor)}
  if(settings.storeName){document.title=`${settings.storeName} — Mebel untuk Hidup yang Lebih Nyaman`;document.querySelectorAll('.brand').forEach(brand=>{if(settings.logoUrl){brand.innerHTML='';const logo=document.createElement('img');logo.src=settings.logoUrl;logo.alt=settings.storeName;logo.className='store-logo';brand.append(logo)}else brand.textContent=settings.storeName})}
  if(settings.tagline)document.querySelector('.topnote').textContent=settings.tagline;
  if(settings.heroTitle)document.querySelector('.hero h1').textContent=settings.heroTitle;
  if(settings.heroText)document.querySelector('.hero-copy>p').textContent=settings.heroText;
  if(settings.address){const footerCopy=document.querySelector('.footer-row>div>p');if(footerCopy)footerCopy.textContent=`${settings.tagline||'Toko mebel modern'} · ${settings.address}`}
  if(settings.whatsapp){const digits=settings.whatsapp.replace(/\D/g,'').replace(/^0/,'62'),link=document.createElement('a');link.className='whatsapp-float';link.href=`https://wa.me/${digits}?text=${encodeURIComponent(`Halo ${settings.storeName||'RuangRupa'}, saya tertarik dengan produk Anda.`)}`;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label','Hubungi toko melalui WhatsApp');link.title='Hubungi melalui WhatsApp';link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.04 2a9.84 9.84 0 0 0-8.5 14.78L2 22l5.36-1.5A9.98 9.98 0 1 0 12.04 2Zm0 17.95a8.08 8.08 0 0 1-4.12-1.13l-.3-.18-3.18.89.85-3.1-.2-.32a8.08 8.08 0 1 1 6.95 3.84Zm4.43-6.05c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.26 7.26 0 0 1-1.34-1.66c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.59 4.11 3.63.58.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/></svg>';document.body.append(link)}
}).catch(()=>{});

stageStyle.textContent+='.store-logo{display:block;max-width:170px;max-height:48px;object-fit:contain}.whatsapp-float{position:fixed;right:22px;bottom:22px;z-index:30;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#238b57;color:white!important;text-decoration:none;font-weight:800;box-shadow:0 12px 30px rgba(0,0,0,.2);transition:transform .2s,box-shadow .2s}.whatsapp-float svg{width:32px;height:32px}.whatsapp-float:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(0,0,0,.24)}@media(max-width:600px){.whatsapp-float{right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));width:48px;height:48px;box-shadow:0 8px 22px rgba(0,0,0,.2)}.whatsapp-float svg{width:30px;height:30px}}';
