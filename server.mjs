import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const root=fileURLToPath(new URL('.',import.meta.url)),publicDir=join(root,'dist'),dataDir=join(root,'data');
mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(join(dataDir,'ruangrupa.sqlite'));
db.exec(readFileSync(join(root,'db','schema.sql'),'utf8'));
const seed=[
 [1,'sofa-nara','Sofa Nara','Sofa','Linen','Sofa tiga dudukan dengan bantalan empuk.','220 × 92 × 78 cm',8490000,8],
 [2,'kursi-sela','Kursi Sela','Kursi','Kayu jati','Kursi santai dengan anyaman rotan.','68 × 74 × 82 cm',2150000,12],
 [3,'meja-aruna','Meja Aruna','Meja','Kayu solid','Meja kopi bundar dari kayu solid.','Ø 90 × 38 cm',3790000,6],
 [4,'lemari-bumi','Lemari Bumi','Lemari','Kayu mindi','Lemari dua pintu dengan ruang simpan lapang.','110 × 48 × 185 cm',6250000,2],
 [5,'sofa-loka','Sofa Loka','Sofa','Linen','Sofa ringkas untuk ruang kecil.','174 × 88 × 76 cm',6950000,5],
 [6,'meja-sora','Meja Sora','Meja','Kayu jati','Meja makan kayu jati untuk empat orang.','140 × 78 × 75 cm',4290000,7],
 [7,'tempat-tidur-senja','Tempat Tidur Senja','Tempat tidur','Kayu mindi','Ranjang queen dengan sandaran berlapis kain.','168 × 208 × 95 cm',7890000,4],
 [8,'kursi-aksa','Kursi Aksa','Kursi','Kayu solid','Kursi makan dengan dudukan bouclé.','58 × 62 × 79 cm',1890000,9]
];
const seedProduct=db.prepare('INSERT OR IGNORE INTO products(id,slug,name,category,material,description,dimensions,price,stock) VALUES(?,?,?,?,?,?,?,?,?)');
for(const item of seed)seedProduct.run(...item);

const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data))};
const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw new Error('Payload terlalu besar')}return raw?JSON.parse(raw):{}};
const orderId=()=>`RR-${Date.now().toString().slice(-8)}`;

async function api(req,res,url){
 if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true,database:'ready'});
 if(req.method==='GET'&&url.pathname==='/api/products')return json(res,200,{products:db.prepare('SELECT id,slug,name,category,material,description,dimensions,price,stock FROM products WHERE is_active=1 ORDER BY id').all()});
 if(req.method==='POST'&&url.pathname==='/api/customers'){
  const input=await body(req);if(!input.email||!input.fullName||!input.phone)return json(res,400,{error:'Nama, email, dan telepon wajib diisi'});
  db.prepare(`INSERT INTO customers(email,full_name,phone) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,updated_at=CURRENT_TIMESTAMP`).run(input.email.trim().toLowerCase(),input.fullName.trim(),input.phone.trim());
  return json(res,200,{customer:db.prepare('SELECT id,email,full_name AS fullName,phone FROM customers WHERE email=?').get(input.email.trim().toLowerCase())});
 }
 if(req.method==='POST'&&url.pathname==='/api/orders'){
  const input=await body(req),customerName=String(input.customerName||'').trim(),customerPhone=String(input.customerPhone||'').replace(/[\s-]/g,''),address=String(input.address||'').trim(),city=String(input.city||'').trim(),postalCode=String(input.postalCode||'').trim();if(customerName.length<3)return json(res,400,{error:'Nama lengkap belum valid'});if(!/^(?:\+62|62|0)[0-9]{8,13}$/.test(customerPhone))return json(res,400,{error:'Nomor telepon belum valid'});if(address.length<10)return json(res,400,{error:'Alamat pengiriman perlu dilengkapi'});if(city.length<2)return json(res,400,{error:'Nama kota belum valid'});if(!/^[0-9]{5}$/.test(postalCode))return json(res,400,{error:'Kode pos harus terdiri dari 5 angka'});if(!Array.isArray(input.items)||!input.items.length)return json(res,400,{error:'Keranjang kosong'});
  const ids=input.items.map(item=>Number(item.id));const placeholders=ids.map(()=>'?').join(',');const rows=db.prepare(`SELECT id,name,price,stock FROM products WHERE is_active=1 AND id IN (${placeholders})`).all(...ids);if(rows.length!==new Set(ids).size)return json(res,400,{error:'Produk tidak valid'});
  let subtotal=0;const items=input.items.map(item=>{const product=rows.find(row=>row.id===Number(item.id)),quantity=Number(item.qty);if(!Number.isInteger(quantity)||quantity<1||quantity>product.stock)throw new Error(`Stok ${product.name} tidak mencukupi`);subtotal+=product.price*quantity;return{...product,quantity}});
  const shipping=[0,250000,450000].includes(Number(input.shipping))?Number(input.shipping):250000,discount=input.voucher==='RUANG10'?Math.round(subtotal*.1):0,total=subtotal+shipping-discount,id=orderId();
  const order=db.prepare('INSERT INTO orders(id,customer_id,customer_name,customer_phone,shipping_address,shipping_city,postal_code,subtotal,shipping_cost,discount,total) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  const itemStmt=db.prepare('INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,line_total) VALUES(?,?,?,?,?,?)');
  db.exec('BEGIN');try{order.run(id,input.customerId||null,customerName,customerPhone,address,city,postalCode,subtotal,shipping,discount,total);for(const item of items)itemStmt.run(id,item.id,item.name,item.price,item.quantity,item.price*item.quantity);db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}
  return json(res,201,{order:{id,subtotal,shipping,discount,total,status:'pending'}});
 }
 const match=url.pathname.match(/^\/api\/orders\/([^/]+)$/);if(req.method==='GET'&&match){const order=db.prepare('SELECT * FROM orders WHERE id=?').get(match[1]);if(!order)return json(res,404,{error:'Pesanan tidak ditemukan'});const items=db.prepare('SELECT product_id AS productId,product_name AS productName,unit_price AS unitPrice,quantity,line_total AS lineTotal FROM order_items WHERE order_id=?').all(match[1]);return json(res,200,{order:{...order,items}})}
 return json(res,404,{error:'Endpoint tidak ditemukan'});
}

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);let pathname=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)),file=normalize(join(publicDir,pathname));if(!file.startsWith(publicDir)||!existsSync(file)){res.writeHead(404);return res.end('Tidak ditemukan')}res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file))}catch(error){console.error(error);json(res,500,{error:error.message||'Kesalahan server'})}});
const port=Number(process.env.PORT||3000);server.listen(port,'127.0.0.1',()=>console.log(`RuangRupa aktif di http://localhost:${port}`));
