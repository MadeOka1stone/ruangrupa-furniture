const response=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
const orderId=()=>`RR-${Date.now().toString().slice(-8)}`;

async function body(request){
 const length=Number(request.headers.get('content-length')||0);
 if(length>100000)throw new Error('Payload terlalu besar');
 return request.json();
}

async function api(request,env,url){
 if(request.method==='GET'&&url.pathname==='/api/health')return response({ok:true,database:'D1 ready'});
 if(request.method==='GET'&&url.pathname==='/api/products'){
  const {results}=await env.DB.prepare('SELECT id,slug,name,category,material,description,dimensions,price,stock FROM products WHERE is_active=1 ORDER BY id').all();
  return response({products:results});
 }
 if(request.method==='POST'&&url.pathname==='/api/customers'){
  const input=await body(request);if(!input.email||!input.fullName||!input.phone)return response({error:'Nama, email, dan telepon wajib diisi'},400);
  const email=input.email.trim().toLowerCase();await env.DB.prepare(`INSERT INTO customers(email,full_name,phone) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,updated_at=CURRENT_TIMESTAMP`).bind(email,input.fullName.trim(),input.phone.trim()).run();
  const customer=await env.DB.prepare('SELECT id,email,full_name AS fullName,phone FROM customers WHERE email=?').bind(email).first();return response({customer});
 }
 if(request.method==='POST'&&url.pathname==='/api/orders'){
  const input=await body(request),customerName=String(input.customerName||'').trim(),customerPhone=String(input.customerPhone||'').replace(/[\s-]/g,''),address=String(input.address||'').trim(),city=String(input.city||'').trim(),postalCode=String(input.postalCode||'').trim();if(customerName.length<3)return response({error:'Nama lengkap belum valid'},400);if(!/^(?:\+62|62|0)[0-9]{8,13}$/.test(customerPhone))return response({error:'Nomor telepon belum valid'},400);if(address.length<10)return response({error:'Alamat pengiriman perlu dilengkapi'},400);if(city.length<2)return response({error:'Nama kota belum valid'},400);if(!/^[0-9]{5}$/.test(postalCode))return response({error:'Kode pos harus terdiri dari 5 angka'},400);if(!Array.isArray(input.items)||!input.items.length)return response({error:'Keranjang kosong'},400);
  const ids=[...new Set(input.items.map(item=>Number(item.id)))];const placeholders=ids.map(()=>'?').join(',');const {results}=await env.DB.prepare(`SELECT id,name,price,stock FROM products WHERE is_active=1 AND id IN (${placeholders})`).bind(...ids).all();if(results.length!==ids.length)return response({error:'Produk tidak valid'},400);
  let subtotal=0;const items=input.items.map(item=>{const product=results.find(row=>row.id===Number(item.id)),quantity=Number(item.qty);if(!Number.isInteger(quantity)||quantity<1||quantity>product.stock)throw new Error(`Stok ${product.name} tidak mencukupi`);subtotal+=product.price*quantity;return{...product,quantity}});
  const shipping=[0,250000,450000].includes(Number(input.shipping))?Number(input.shipping):250000,discount=input.voucher==='RUANG10'?Math.round(subtotal*.1):0,total=subtotal+shipping-discount,id=orderId();
  const statements=[env.DB.prepare('INSERT INTO orders(id,customer_id,customer_name,customer_phone,shipping_address,shipping_city,postal_code,subtotal,shipping_cost,discount,total) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,input.customerId||null,customerName,customerPhone,address,city,postalCode,subtotal,shipping,discount,total),...items.map(item=>env.DB.prepare('INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,line_total) VALUES(?,?,?,?,?,?)').bind(id,item.id,item.name,item.price,item.quantity,item.price*item.quantity))];
  await env.DB.batch(statements);return response({order:{id,subtotal,shipping,discount,total,status:'pending'}},201);
 }
 const match=url.pathname.match(/^\/api\/orders\/([^/]+)$/);if(request.method==='GET'&&match){const order=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(match[1]).first();if(!order)return response({error:'Pesanan tidak ditemukan'},404);const {results}=await env.DB.prepare('SELECT product_id AS productId,product_name AS productName,unit_price AS unitPrice,quantity,line_total AS lineTotal FROM order_items WHERE order_id=?').bind(match[1]).all();return response({order:{...order,items:results}})}
 return response({error:'Endpoint tidak ditemukan'},404);
}

export default {async fetch(request,env){try{const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return await api(request,env,url);return env.ASSETS.fetch(request)}catch(error){console.error(error);return response({error:error.message||'Kesalahan server'},500)}}};
