import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import vm from 'node:vm';
import worker from '../dist/_worker.js';
const db=new DatabaseSync(':memory:');
for(const file of readdirSync('migrations').filter(file=>file.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+file,'utf8'));
db.exec("INSERT INTO products(id,slug,name,category,material,description,dimensions,price,stock,color_options) VALUES(99,'test','Lemari uji','Lemari','Kayu','Uji warna','100 cm',100000,3,'[{\"name\":\"Cokelat\",\"hex\":\"#74472d\"},{\"name\":\"Krem\",\"hex\":\"#eeeeee\"}]')");
const DB={prepare(sql){return{params:[],bind(...params){this.params=params;return this},async first(){return db.prepare(sql).get(...this.params)||null},async all(){return{results:db.prepare(sql).all(...this.params)}},async run(){if(/^SELECT/i.test(sql))return{results:db.prepare(sql).all(...this.params),meta:{changes:0}};const result=db.prepare(sql).run(...this.params);return{meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}}}},async batch(statements){const previous=this.tail||Promise.resolve();let release;this.tail=new Promise(resolve=>release=resolve);await previous;db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results}catch(error){db.exec('ROLLBACK');throw error}finally{release()}}};
const env={DB,ADMIN_PASSWORD:'test-only-secret'},ctx={waitUntil(){}};
const payload={acceptedTerms:true,customerName:'Pelanggan uji',customerPhone:'081234567890',customerEmail:'uji@example.com',address:'Alamat pengujian panjang',city:'Gianyar',postalCode:'80561'};
async function order(items){return worker.fetch(new Request('https://test.example/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,items})}),env,ctx)}
assert.equal((await order([{id:99,qty:1,colorName:'Tidak tersedia'}])).status,400);
assert.equal((await order([{id:99,qty:1}])).status,400);
assert.equal(db.prepare('SELECT stock FROM products WHERE id=99').get().stock,3);
const overstock=await order([{id:99,qty:2,colorName:'Krem'},{id:99,qty:2,colorName:'Cokelat'}]);assert.equal(overstock.status,409,await overstock.text());
const response=await order([{id:99,qty:1,colorName:'Krem'},{id:99,qty:1,colorName:'Cokelat'},{id:99,qty:1,colorName:'Krem'}]);
assert.equal(response.status,201);const data=await response.json();
assert.equal(db.prepare('SELECT stock FROM products WHERE id=99').get().stock,0);
const lines=db.prepare('SELECT color_name,quantity FROM order_items WHERE order_id=? ORDER BY id').all(data.order.id);
assert.deepEqual(lines.map(line=>[line.color_name,line.quantity]),[['Krem',2],['Cokelat',1]]);
const track=await worker.fetch(new Request('https://test.example/api/track/'+data.order.id+'?token='+data.order.paymentToken),env,ctx);
assert.equal(track.status,200);assert.equal((await track.json()).items[0].colorName,'Krem');
db.exec("INSERT INTO admin_accounts(id,email,password_salt,password_hash) VALUES(1,'admin@example.com','test','test')");
const expires=Date.now()+60000,signature=createHmac('sha256',env.ADMIN_PASSWORD).update('admin.1.1.'+expires).digest('hex');
const product={name:'Lemari uji',category:'Lemari',material:'Kayu',description:'Uji warna',dimensions:'100 cm',price:100000,stock:3,status:'Aktif',colors:[{name:'Putih',hex:'#ffffff'}]};
const updated=await worker.fetch(new Request('https://test.example/api/products/99',{method:'PATCH',headers:{'content-type':'application/json',cookie:'rr_admin=1.1.'+expires+'.'+signature},body:JSON.stringify(product)}),env,ctx);
assert.equal(updated.status,200);assert.equal(JSON.parse(db.prepare('SELECT color_options FROM products WHERE id=99').get().color_options)[0].name,'Putih');
const source=readFileSync('dist/catalog.js','utf8');
const sandbox={cart:[{id:99,qty:1,colorName:'Krem'}],products:[{id:99,stock:3}],selectedColor:{name:'Cokelat'},saveCart(){},productDialog:{close(){}},cartDialog:{showModal(){}}};
vm.createContext(sandbox);
for(const name of ['colorStock','addToCart','changeQty']){const match=source.match(new RegExp('function '+name+'\\([^\\n]+'));vm.runInContext(match[0],sandbox)}
vm.runInContext('addToCart(99);addToCart(99);addToCart(99);changeQty(0,1)',sandbox);
assert.equal(sandbox.cart.length,2);assert.equal(sandbox.cart.reduce((sum,item)=>sum+item.qty,0),3);
// console.log('PASS: warna wajib/valid, stok gabungan, snapshot pesanan, pelacakan, edit admin, keranjang multiwarna.');


const adminCookie='rr_admin=1.1.'+expires+'.'+signature;
async function admin(path,method,body){return worker.fetch(new Request('https://test.example'+path,{method,headers:{'content-type':'application/json',cookie:adminCookie},body:JSON.stringify(body)}),env,ctx)}
const created=await admin('/api/products','POST',{...product,name:'Varian uji',variantStock:true,colors:[{name:'Cokelat',hex:'#74472d',stock:3},{name:'Krem',hex:'#eeeeee',stock:1}]});
assert.equal(created.status,201,await created.clone().text());const variantProductId=(await created.json()).id;
const stockFor=name=>db.prepare('SELECT stock FROM product_variants WHERE product_id=? AND name=? AND is_active=1').get(variantProductId,name).stock;
assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(variantProductId).stock,4);
assert.equal((await order([{id:variantProductId,qty:2,colorName:'Krem'}])).status,409);
const variantOrderResponse=await order([{id:variantProductId,qty:1,colorName:'Cokelat'},{id:variantProductId,qty:1,colorName:'Krem'}]);
assert.equal(variantOrderResponse.status,201);const variantOrder=(await variantOrderResponse.json()).order;
assert.equal(stockFor('Cokelat'),2);assert.equal(stockFor('Krem'),0);
assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(variantProductId).stock,2);
const editPayload={...product,variantStock:true,colors:[{name:'Cokelat',hex:'#74472d',stock:3},{name:'Krem',hex:'#eeeeee',stock:1}]};
assert.equal((await admin('/api/products/'+variantProductId,'PATCH',editPayload)).status,409);
async function fail(order){return worker.fetch(new Request('https://test.example/api/payments/'+order.id+'/simulate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status:'failed',token:order.paymentToken})}),env,ctx)}
assert.equal((await fail(variantOrder)).status,200);assert.equal(stockFor('Cokelat'),3);assert.equal(stockFor('Krem'),1);
await fail(variantOrder);assert.equal(stockFor('Krem'),1);
const cancelledResponse=await order([{id:variantProductId,qty:1,colorName:'Krem'}]);const cancelled=(await cancelledResponse.json()).order;
assert.equal((await admin('/api/orders/'+cancelled.id,'PATCH',{status:'cancelled'})).status,200);assert.equal(stockFor('Krem'),1);
await admin('/api/orders/'+cancelled.id,'PATCH',{status:'cancelled'});assert.equal(stockFor('Krem'),1);
const expiryResponse=await order([{id:variantProductId,qty:1,colorName:'Krem'}]);const expiry=(await expiryResponse.json()).order;
await admin('/api/orders/'+expiry.id,'PATCH',{status:'expired'});assert.equal(stockFor('Krem'),1);
const noticeResponse=await order([{id:variantProductId,qty:1,colorName:'Krem'}]);const notice=(await noticeResponse.json()).order;
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({order_id:notice.id,gross_amount:notice.total,transaction_status:'deny',transaction_id:'test-transaction',payment_type:'bank_transfer'});
const noticeRequest=()=>new Request('https://test.example/api/midtrans/notification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({order_id:notice.id})});
try{assert.equal((await worker.fetch(noticeRequest(),{...env,MIDTRANS_SERVER_KEY:'test-only-key'},ctx)).status,200);assert.equal(stockFor('Krem'),1);await worker.fetch(noticeRequest(),{...env,MIDTRANS_SERVER_KEY:'test-only-key'},ctx);assert.equal(stockFor('Krem'),1)}finally{globalThis.fetch=originalFetch}
const pendingBefore=db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
const racing=await Promise.all([order([{id:variantProductId,qty:1,colorName:'Krem'}]),order([{id:variantProductId,qty:1,colorName:'Krem'}])]);
assert.deepEqual(racing.map(response=>response.status).sort(),[201,409]);
assert.equal(stockFor('Krem'),0);assert.equal(stockFor('Cokelat'),3);assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(variantProductId).stock,3);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,pendingBefore+1);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM inventory_checks').get().n,0);
const racingOrder=(await racing.find(response=>response.status===201).json()).order;await fail(racingOrder);
const apiProductResponse=await worker.fetch(new Request('https://test.example/api/products?admin=1',{headers:{cookie:adminCookie}}),env,ctx);
const apiProduct=(await apiProductResponse.json()).products.find(product=>product.id===variantProductId);
assert.equal(apiProduct.variantStock,1);assert.equal(JSON.parse(apiProduct.colorOptions).find(color=>color.name==='Krem').stock,1);
const invalidStocks=await admin('/api/products','POST',{...product,variantStock:true,colors:[{name:'Krem',hex:'#ffffff',stock:''}]});assert.equal(invalidStocks.status,400);
const snapshot=db.prepare('SELECT color_name,variant_id FROM order_items WHERE order_id=? ORDER BY id').all(variantOrder.id);assert.equal(snapshot[0].color_name,'Cokelat');assert.ok(snapshot[0].variant_id);
sandbox.products[0]={id:99,stock:4,variantStock:1,colors:[{name:'Krem',stock:1},{name:'Cokelat',stock:3}]};sandbox.cart=[];sandbox.selectedColor={name:'Krem'};
vm.runInContext('addToCart(99);addToCart(99)',sandbox);assert.equal(sandbox.cart[0].qty,1);
sandbox.selectedColor={name:'Cokelat'};vm.runInContext('addToCart(99);addToCart(99);addToCart(99);addToCart(99)',sandbox);assert.equal(sandbox.cart[1].qty,3);
console.log('PASS: stok per warna, stok total otomatis, varian habis, rollback checkout bersamaan, keranjang, gagal/cancel/expired/Midtrans idempoten, edit pending diblokir, legacy aman.');

const updatedColors=JSON.parse(apiProduct.colorOptions);updatedColors[0].stock=2;updatedColors[1].stock=2;
const versionedEdit=await admin('/api/products/'+variantProductId,'PATCH',{...product,variantStock:true,inventoryVersion:apiProduct.inventoryVersion,colors:updatedColors});assert.equal(versionedEdit.status,200);
const staleEdit=await admin('/api/products/'+variantProductId,'PATCH',{...product,variantStock:true,inventoryVersion:apiProduct.inventoryVersion,colors:updatedColors});assert.equal(staleEdit.status,409);
const legacyConversion=await admin('/api/products/99','PATCH',{...product,variantStock:true,colors:[{name:'Putih',hex:'#ffffff',stock:3}]});assert.equal(legacyConversion.status,409);
assert.equal(db.prepare('SELECT variant_stock FROM products WHERE id=99').get().variant_stock,0);
const backup=await worker.fetch(new Request('https://test.example/api/admin/export',{headers:{cookie:adminCookie}}),env,ctx);assert.equal(backup.status,200);assert.ok((await backup.json()).variants.length>=2);
console.log('PASS: editor version guard, konversi legacy dengan pending diblokir, backup stok varian.');
