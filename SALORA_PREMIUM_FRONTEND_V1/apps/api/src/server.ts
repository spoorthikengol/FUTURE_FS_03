import 'dotenv/config';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rate from '@fastify/rate-limit';
import {z} from 'zod';
import crypto from 'node:crypto';
import {pool} from './db.js';
import {login,user} from './auth.js';
import {simulate} from './engine.js';

const app=Fastify({logger:true,bodyLimit:64*1024});
await app.register(cookie);
await app.register(cors,{origin:process.env.APP_ORIGIN||'http://localhost:3000',credentials:true});
await app.register(helmet,{contentSecurityPolicy:false});
await app.register(rate,{max:120,timeWindow:'1 minute'});
const fail=(reply:any,code:number,error:string)=>reply.code(code).send({error});
const uuid=z.string().uuid();

app.get('/health',async()=>({ok:true,service:'salora-api',version:'1.0.0',time:new Date().toISOString()}));
app.post('/api/auth/login',async(req,reply)=>{const b=z.object({email:z.string().email().max(160),password:z.string().min(8).max(200)}).parse(req.body);const r=await login(b.email,b.password);if(!r)return fail(reply,401,'Invalid email or password');reply.setCookie('salora_session',r.token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:43200});return r.user});
app.get('/api/me',{preHandler:user},async(req:any)=>req.user);
app.post('/api/auth/logout',{preHandler:user},async(req:any,reply)=>{const t=req.cookies.salora_session;if(t){const h=crypto.createHash('sha256').update(t).digest('hex');await pool.query('DELETE FROM sessions WHERE token_hash=$1',[h])}reply.clearCookie('salora_session',{path:'/'});return {ok:true}});

app.get('/api/dashboard',{preHandler:user},async(req:any)=>{
 const id=req.user.salon_id;
 const salon=(await pool.query('SELECT id,name,timezone,currency,open_time,close_time FROM salons WHERE id=$1',[id])).rows[0];
 if(!salon) return {error:'Salon not found'};
 const [st,sv,a,c]=await Promise.all([
  pool.query('SELECT id,name FROM stylists WHERE salon_id=$1 AND active=true ORDER BY name',[id]),
  pool.query('SELECT id,name,duration_min,price_inr,buffer_min FROM services WHERE salon_id=$1 AND active=true ORDER BY name',[id]),
  pool.query(`SELECT a.id,a.scheduled_start,a.scheduled_end,a.status,c.name customer,s.name service,st.name stylist FROM appointments a JOIN services s ON s.id=a.service_id JOIN stylists st ON st.id=a.stylist_id LEFT JOIN customers c ON c.id=a.customer_id WHERE a.salon_id=$1 AND a.scheduled_start >= now()-interval '2 hours' ORDER BY a.scheduled_start LIMIT 50`,[id]),
  pool.query(`SELECT count(*)::int total FROM customers WHERE salon_id=$1`,[id])
 ]);
 return {salon,stylists:st.rows,services:sv.rows,appointments:a.rows,customerCount:c.rows[0].total};
});

app.get('/api/customers',{preHandler:user},async(req:any)=>{const q=z.object({search:z.string().trim().max(80).optional()}).parse(req.query);const s=q.search?`%${q.search}%`:'%';return (await pool.query(`SELECT id,name,phone,created_at FROM customers WHERE salon_id=$1 AND (name ILIKE $2 OR COALESCE(phone,'') ILIKE $2) ORDER BY name LIMIT 50`,[req.user.salon_id,s])).rows});
app.post('/api/customers',{preHandler:user},async(req:any,reply)=>{const b=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().max(20).optional()}).parse(req.body);const r=await pool.query('INSERT INTO customers(salon_id,name,phone) VALUES($1,$2,$3) RETURNING id,name,phone',[req.user.salon_id,b.name,b.phone||null]);return reply.code(201).send(r.rows[0])});

app.get('/api/appointments',{preHandler:user},async(req:any)=>{const q=z.object({from:z.string().datetime().optional(),to:z.string().datetime().optional()}).parse(req.query);const from=q.from||new Date(Date.now()-86400000).toISOString(),to=q.to||new Date(Date.now()+7*86400000).toISOString();return (await pool.query(`SELECT a.*,c.name customer,s.name service,st.name stylist FROM appointments a JOIN services s ON s.id=a.service_id JOIN stylists st ON st.id=a.stylist_id LEFT JOIN customers c ON c.id=a.customer_id WHERE a.salon_id=$1 AND a.scheduled_start >= $2 AND a.scheduled_start < $3 ORDER BY a.scheduled_start`,[req.user.salon_id,from,to])).rows});

app.post('/api/walk-ins/simulate',{preHandler:user},async(req:any,reply)=>{
 const id=req.user.salon_id,b=z.object({serviceId:uuid,now:z.string().datetime().optional(),customerName:z.string().trim().max(100).optional(),customerPhone:z.string().trim().max(20).optional()}).parse(req.body);
 const salon=(await pool.query('SELECT timezone FROM salons WHERE id=$1',[id])).rows[0];
 const sv=(await pool.query('SELECT * FROM services WHERE id=$1 AND salon_id=$2 AND active=true',[b.serviceId,id])).rows[0]; if(!sv)return fail(reply,404,'Service not found');
 const sts=(await pool.query('SELECT st.id FROM stylists st JOIN stylist_skills ss ON ss.stylist_id=st.id WHERE st.salon_id=$1 AND ss.service_id=$2 AND st.active=true',[id,sv.id])).rows.map(r=>r.id);
 if(!sts.length)return fail(reply,409,'No active stylist is qualified for this service.');
 const aa=(await pool.query(`SELECT id,stylist_id,scheduled_start,scheduled_end,status FROM appointments WHERE salon_id=$1 AND status NOT IN('CANCELLED','COMPLETED','NO_SHOW') AND scheduled_start < $2::timestamptz + interval '1 day'`,[id,b.now||new Date().toISOString()])).rows;
 const results=simulate({now:b.now?new Date(b.now):new Date(),duration:sv.duration_min,price:sv.price_inr,buffer:sv.buffer_min,maxDelay:30,maxWait:45,stylists:sts,appointments:aa.map(a=>({id:a.id,stylistId:a.stylist_id,start:new Date(a.scheduled_start),end:new Date(a.scheduled_end),status:a.status}))});
 const best=results[0]||null;
 return {recommendation:best,candidates:results.slice(0,8),meta:{service:sv.name,timezone:salon.timezone,engineVersion:'1.0'}};
});

app.post('/api/walk-ins/accept',{preHandler:user},async(req:any,reply)=>{
 const salonId=req.user.salon_id,b=z.object({serviceId:uuid,stylistId:uuid,startAt:z.string().datetime(),customerId:uuid.optional(),customerName:z.string().trim().min(2).max(100).optional(),customerPhone:z.string().trim().max(20).optional(),decisionState:z.enum(['ACCEPT','ACCEPT_WITH_WARNING','WAIT']).optional()}).parse(req.body);
 const key=req.headers['idempotency-key']; if(typeof key!=='string'||key.length<16||key.length>100)return fail(reply,400,'A valid Idempotency-Key is required.');
 const c=await pool.connect();
 try{await c.query('BEGIN');
  const old=await c.query('SELECT response FROM idempotency_keys WHERE salon_id=$1 AND user_id=$2 AND key=$3 FOR UPDATE',[salonId,req.user.id,key]); if(old.rows[0]){await c.query('COMMIT');return old.rows[0].response}
  await c.query('SELECT id FROM salons WHERE id=$1 FOR UPDATE',[salonId]);
  const sv=(await c.query('SELECT * FROM services WHERE id=$1 AND salon_id=$2 AND active=true',[b.serviceId,salonId])).rows[0]; if(!sv){await c.query('ROLLBACK');return fail(reply,404,'Service not found')}
  const stylist=(await c.query('SELECT 1 FROM stylists st JOIN stylist_skills ss ON ss.stylist_id=st.id WHERE st.id=$1 AND st.salon_id=$2 AND st.active=true AND ss.service_id=$3',[b.stylistId,salonId,b.serviceId])).rows[0]; if(!stylist){await c.query('ROLLBACK');return fail(reply,409,'Stylist is not eligible for this service.')}
  let customerId=b.customerId;
  if(customerId){const ok=(await c.query('SELECT 1 FROM customers WHERE id=$1 AND salon_id=$2',[customerId,salonId])).rows[0];if(!ok){await c.query('ROLLBACK');return fail(reply,400,'Customer does not belong to this salon.')}}
  if(!customerId&&b.customerName)customerId=(await c.query('INSERT INTO customers(salon_id,name,phone) VALUES($1,$2,$3) RETURNING id',[salonId,b.customerName,b.customerPhone||null])).rows[0].id;
  const start=new Date(b.startAt),end=new Date(start.getTime()+sv.duration_min*60000);
  const conflict=await c.query(`SELECT 1 FROM appointments WHERE salon_id=$1 AND stylist_id=$2 AND status NOT IN('CANCELLED','NO_SHOW') AND scheduled_start<$4 AND scheduled_end>$3 LIMIT 1`,[salonId,b.stylistId,start,end]);
  if(conflict.rows[0]){await c.query('ROLLBACK');return fail(reply,409,'The schedule changed. Simulate again before accepting.')}
  const ap=(await c.query(`INSERT INTO appointments(salon_id,customer_id,stylist_id,service_id,scheduled_start,scheduled_end,status,source) VALUES($1,$2,$3,$4,$5,$6,'CONFIRMED','WALK_IN') RETURNING id,scheduled_start,scheduled_end`,[salonId,customerId,b.stylistId,b.serviceId,start,end])).rows[0];
  const walk=(await c.query(`INSERT INTO walk_ins(salon_id,customer_id,service_id,status,decision_state) VALUES($1,$2,$3,'ACCEPTED',$4) RETURNING id`,[salonId,customerId,b.serviceId,b.decisionState||'ACCEPT'])).rows[0];
  const out={ok:true,appointmentId:ap.id,walkInId:walk.id,startAt:ap.scheduled_start,endAt:ap.scheduled_end};
  await c.query('INSERT INTO idempotency_keys(salon_id,user_id,key,response) VALUES($1,$2,$3,$4)',[salonId,req.user.id,key,JSON.stringify(out)]);
  await c.query('INSERT INTO audit_events(salon_id,actor_id,event_type,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[salonId,req.user.id,'WALK_IN_ACCEPTED','APPOINTMENT',ap.id,JSON.stringify({walkInId:walk.id,decisionState:b.decisionState||'ACCEPT'})]);
  await c.query('INSERT INTO notifications(salon_id,channel,recipient,payload) VALUES($1,$2,$3,$4)',[salonId,'OUTBOX','internal',JSON.stringify({type:'WALK_IN_ACCEPTED',appointmentId:ap.id})]);
  await c.query('COMMIT');return out;
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
});

app.setErrorHandler((err,req,reply)=>{req.log.error(err);if(err instanceof z.ZodError)return reply.code(400).send({error:'Invalid request',details:err.issues.map(i=>i.path.join('.')+': '+i.message)});return reply.code(500).send({error:'Internal server error'});});
await app.listen({host:'0.0.0.0',port:Number(process.env.API_PORT||4000)});
