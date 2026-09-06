export type State = 'ACCEPT' | 'ACCEPT_WITH_WARNING' | 'WAIT' | 'RESCHEDULE';
export type A = { id:string; stylistId:string; start:Date; end:Date; status?:string };
export type Input = { now:Date; duration:number; price:number; buffer:number; maxDelay:number; maxWait:number; stylists:string[]; appointments:A[] };
export type Result = { state:State; stylistId:string; start:Date; end:Date; revenue:number; totalDelay:number; maxDelay:number; wait:number; affected:number; reason:string };
const add=(d:Date,m:number)=>new Date(d.getTime()+m*60000);
const active=(a:A)=>!['CANCELLED','NO_SHOW','COMPLETED'].includes(a.status||'BOOKED');
export function simulate(x:Input):Result[]{
  const starts=new Set<number>([x.now.getTime()]);
  for(const a of x.appointments.filter(a=>active(a)&&a.end.getTime()>=x.now.getTime())) starts.add(a.end.getTime());
  const out:Result[]=[];
  for(const sid of x.stylists){
    const ap=x.appointments.filter(a=>a.stylistId===sid&&active(a)).sort((a,b)=>a.start.getTime()-b.start.getTime());
    for(const ms of starts){
      const start=new Date(ms), end=add(start,x.duration);
      let valid=true,total=0,max=0,affected=0;
      for(const a of ap){
        if(a.end<=start){ if(add(a.end,x.buffer)>start){valid=false;break;} continue; }
        if(a.start<end&&a.end>start){valid=false;break;}
      }
      if(!valid) continue;
      let cursor=end;
      for(const a of ap.filter(a=>a.start>=start)){
        if(cursor>a.start){
          const d=(cursor.getTime()-a.start.getTime())/60000;
          total+=d; max=Math.max(max,d); affected++;
          cursor=add(a.end,d);
        } else cursor=new Date(a.end);
      }
      const wait=Math.max(0,(start.getTime()-x.now.getTime())/60000);
      const state:State = max===0&&wait===0?'ACCEPT':max===0&&wait<=x.maxWait?'WAIT':max===0?'RESCHEDULE':max<=x.maxDelay?'ACCEPT_WITH_WARNING':'RESCHEDULE';
      out.push({state,stylistId:sid,start,end,revenue:x.price,totalDelay:total,maxDelay:max,wait,affected,
        reason:state==='ACCEPT'?'Immediate slot with no scheduled customer delay.':state==='WAIT'?`A safe slot opens in ${Math.round(wait)} minutes.`:state==='ACCEPT_WITH_WARNING'?`Acceptable trade-off: up to ${Math.round(max)} minutes of downstream delay.`:'No safe placement satisfies the current delay and wait limits.'});
    }
  }
  return out.sort((a,b)=>rank(a.state)-rank(b.state)||a.totalDelay-b.totalDelay||a.wait-b.wait||a.stylistId.localeCompare(b.stylistId)||a.start.getTime()-b.start.getTime());
}
function rank(s:State){return {ACCEPT:0,WAIT:1,ACCEPT_WITH_WARNING:2,RESCHEDULE:3}[s]}
