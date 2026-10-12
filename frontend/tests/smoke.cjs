/* Controlled API fixtures only: this never creates real orders or sends messages. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--no-zygote','--single-process']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const products=[
 {id:1,slug:'lavender-crochet-bow-clip',name:'Lavender Crochet Bow Clip',price:'99.00',old_price:'149.00',stock:2,category_name:'Hair Accessories',category_slug:'hair-accessories',description:'Handmade lavender bow clip.',image_url:null},
 {id:2,slug:'daisy-crochet-keychain',name:'Daisy Crochet Keychain',price:'79.00',old_price:null,stock:4,category_name:'Keychains',category_slug:'keychains'},
 {id:3,slug:'crochet-rose-stems-set-2',name:'Crochet Rose Stems (Set of 2)',price:'149.00',old_price:'100.00',stock:0,category_name:'Crochet Flowers',category_slug:'crochet-flowers'},
 {id:4,slug:'missing-image',name:'A product without a photograph',price:'89.50',stock:5,category_name:'Accessories',image_url:'https://invalid.example/missing.jpg'}];
 let created=0,confirmations=0,failConfirmation=true,failCatalog=false; const orders=[];
 const user={id:7,first_name:'Test',last_name:'Customer',email:'test@example.com',phone:'9876543210'};
 const addresses=[{id:1,full_name:'Test Customer',phone:'9876543210',address_line1:'Test address',city:'Dehradun',state:'Uttarakhand',pin_code:'248001'}];
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());await context.route('https://invalid.example/**',r=>r.abort());
 await context.route('**/api/**',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(!url.pathname.startsWith('/api/')) return route.continue();
 const path=url.pathname.replace('/api','');
 let data={success:true},status=200;
 if(path==='/products'){
   if(failCatalog)return route.fulfill({status:503,json:{message:'Shop temporarily unavailable'}});
   let rows=products.filter(p=>(!url.searchParams.get('category')||p.category_slug===url.searchParams.get('category'))&&(!url.searchParams.get('search')||p.name.toLowerCase().includes(url.searchParams.get('search').toLowerCase())));
   if(url.searchParams.get('sort')==='price_asc') rows.sort((a,b)=>Number(a.price)-Number(b.price));
   data={products:rows,total:rows.length,pages:rows.length?1:0};
 }else if(path.startsWith('/products/')){
   const product=products.find(p=>p.slug===path.split('/')[2]);if(product)data={product,reviews:[]};else{status=404;data={message:'Product not found'};}
 }else if(path==='/auth/login'||path==='/auth/register'){data={token:'test-token',user};}
 else if(path==='/auth/me')data={user};
 else if(path==='/addresses')data={addresses};
 else if(path==='/orders'&&req.method()==='POST'){
   created++; const body=req.postDataJSON();assert.equal(body.payment_method,'cod');assert.equal(body.items[0].quantity,2);
   orders.push({id:22,order_number:'PL-TEST',status:'pending',payment_method:'cod',payment_status:'pending',total_amount:268,shipping_charge:50,created_at:'2026-10-12T12:00:00Z',items:[{id:1,product_name:products[0].name,quantity:2,subtotal:218}]});data={order_id:22,total:268};
 }else if(path==='/payment/cod-confirm'){confirmations++;if(failConfirmation){failConfirmation=false;return route.fulfill({status:503,json:{message:'Please retry confirmation'}});}orders[0].status='confirmed';}
 else if(path==='/orders')data={orders};
 else if(path==='/orders/22')data={order:orders[0]};
 else if(path==='/orders/22/cancel'){orders[0].status='cancelled';}
 else {status=404;data={message:`Unhandled fixture ${path}`};}
 await route.fulfill({status,json:data});
 });
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
 await page.goto(base);await page.locator('.product-card').first().waitFor();
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));
 fs.mkdirSync('test-output',{recursive:true});await page.screenshot({path:'test-output/home-desktop.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Add Lavender Crochet Bow Clip to bag'}).click();
 await page.getByRole('button',{name:'Add Lavender Crochet Bow Clip to bag'}).click();
 assert.equal(await page.getByRole('button',{name:'Stock limit reached'}).first().isDisabled(),true);
 await page.getByRole('link',{name:'Shopping bag, 2 items'}).click();await page.getByRole('button',{name:'Continue to checkout'}).waitFor();
 await page.getByRole('button',{name:'Continue to checkout'}).click();await page.waitForURL('**/login');
 await page.getByLabel('Email',{exact:true}).fill('test@example.com');await page.getByLabel('Password',{exact:true}).fill('testpassword');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/checkout');
 products[0].price='109.00';
 await page.getByRole('button',{name:'Place COD order'}).click();await page.getByText('Prices have changed. Please review the updated total, then place your order again.').waitFor();assert.equal(created,0);
 await page.getByRole('button',{name:'Place COD order'}).click();await page.getByRole('button',{name:'Retry order confirmation'}).waitFor();
 assert.equal(created,1);await page.getByRole('button',{name:'Retry order confirmation'}).click();await page.waitForURL('**/orders/22');assert.equal(created,1);assert.equal(confirmations,2);
 await page.getByRole('button',{name:'Cancel order',exact:true}).click();await page.getByRole('button',{name:'Yes, cancel order'}).click();await page.getByText('cancelled',{exact:true}).waitFor();
 await page.goto(base+'/shop');await page.locator('.product-card').first().waitFor();
 await page.getByRole('textbox',{name:'Search products'}).fill('not-a-product');await page.getByRole('button',{name:'Submit search'}).click();await page.getByText('No little treasures here yet').waitFor();
 await page.goto(base+'/shop');await page.locator('.product-card').first().waitFor();
 assert.equal(await page.locator('.product-card').nth(2).locator('del').count(),0);
 await page.waitForFunction(()=>{const img=document.querySelector('img[alt="A product without a photograph"]');return img?.src.endsWith('/product-placeholder.svg')&&img.complete;});
 failCatalog=true;await page.goto(base+'/shop');await page.getByText('Shop temporarily unavailable').waitFor();failCatalog=false;await page.getByRole('button',{name:'Try again'}).click();await page.locator('.product-card').first().waitFor();
 await page.setViewportSize({width:390,height:844});await page.goto(base);await page.locator('.product-card').first().waitFor();await page.screenshot({path:'test-output/home-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Open menu'}).click();await page.locator('#mobile-nav').getByRole('link',{name:'Keychains',exact:true}).click();await page.waitForURL('**/shop/keychains');await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===1);assert.equal(await page.locator('.product-card').count(),1);
 await page.screenshot({path:'test-output/shop-mobile.png',fullPage:true});
 for(const path of ['/product/lavender-crochet-bow-clip','/cart','/account','/orders','/not-found']){await page.goto(base+path);await page.locator('main h1').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path);}
 assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile rendering, image fallback, stock limits, bag count, price-change confirmation, login return, COD confirmation retry without duplicate orders, cancellation, search, category filter, invalid discount suppression, API retry, direct routes, and no page errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
