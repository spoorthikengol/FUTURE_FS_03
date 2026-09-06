import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, BrainCircuit, CalendarClock, CheckCircle2, ChevronRight, Clock3, ShieldCheck, Sparkles, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="site">
      <nav className="site-nav wrap">
        <Link href="/" className="brand"><i /> SALORA</Link>
        <div className="navlinks">
          <a href="#engine">Decision Engine</a>
          <a href="#how">How it works</a>
          <Link href="/login" className="nav-cta">Staff login <ArrowRight size={15}/></Link>
        </div>
      </nav>

      <section className="hero-v2 wrap">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={13}/> REAL-TIME WALK-IN DECISION INTELLIGENCE</div>
          <h1>Know before<br/><em>you say yes.</em></h1>
          <p className="hero-lead">SALORA helps independent salons accept more walk-ins without turning today's bookings into tomorrow's complaints.</p>
          <div className="hero-actions">
            <Link href="/login" className="hero-primary">Open the command center <ArrowRight size={17}/></Link>
            <a href="#engine" className="hero-secondary">Watch the decision flow <ChevronRight size={17}/></a>
          </div>
          <div className="hero-proof"><span><CheckCircle2 size={15}/> Predict</span><b>→</b><span>Recommend</span><b>→</b><span>Act</span></div>
        </div>

        <div className="hero-visual" aria-label="SALORA decision engine preview">
          <div className="orb orb-a"/><div className="orb orb-b"/>
          <div className="glass-shell">
            <div className="glass-top"><span className="status-dot"/> SALORA INTELLIGENCE <span>LIVE</span></div>
            <div className="simulation-label">WHAT IF WE ACCEPT THIS WALK-IN?</div>
            <div className="walkin-card"><div><small>WALK-IN REQUEST</small><strong>Hair Color</strong><span>120 min · ₹1,800</span></div><div className="pulse-ring"><Zap size={18}/></div></div>
            <div className="flow-line"><i/><i/><i/><i/></div>
            <div className="mini-schedule">
              <div className="mini-row"><span>04:04</span><b>Ananya · Haircut</b><em>BOOKED</em></div>
              <div className="mini-row simulated"><span>05:20</span><b>WALK-IN · Hair Color</b><em>SIMULATED</em></div>
              <div className="mini-row"><span>06:04</span><b>Ananya · Color</b><em>BOOKED</em></div>
            </div>
            <div className="decision-preview"><div className="decision-icon"><CheckCircle2 size={21}/></div><div><small>RECOMMENDATION</small><strong>SAFE TO ACCEPT</strong><span>0 min downstream delay · 0 customers affected</span></div><div className="decision-value">₹1,800<small>opportunity</small></div></div>
          </div>
          <div className="floating-chip chip-one"><span className="chip-dot green"/> Schedule pressure <b>32%</b></div>
          <div className="floating-chip chip-two"><Clock3 size={13}/> Best window <b>05:20 PM</b></div>
        </div>
      </section>

      <section className="marquee"><div><span>WALK-INS</span><i/> <span>SCHEDULES</span><i/> <span>CAPACITY</span><i/> <span>REVENUE</span><i/> <span>DECISIONS</span><i/> <span>WALK-INS</span><i/> <span>SCHEDULES</span></div></section>

      <section id="how" className="section-v2 wrap">
        <div className="section-kicker">THE SALORA DIFFERENCE</div>
        <div className="split-heading"><h2>A calendar tells you <em>what is booked.</em><br/>SALORA tells you what happens next.</h2><p>Built for independent salons where every chair, stylist and minute matters.</p></div>
        <div className="feature-grid">
          <Feature n="01" icon={<CalendarClock/>} title="See the live state" text="Appointments, stylist skills, service durations and current capacity become one operational snapshot."/>
          <Feature n="02" icon={<BrainCircuit/>} title="Simulate the what-if" text="SALORA tests candidate placements and propagates downstream schedule effects before anything is changed."/>
          <Feature n="03" icon={<ShieldCheck/>} title="Act with confidence" text="Every recommendation includes revenue, wait, delay and affected-appointment impact."/>
        </div>
      </section>

      <section id="engine" className="engine-showcase">
        <div className="wrap showcase-grid">
          <div className="showcase-copy"><div className="eyebrow violet"><Sparkles size={13}/> THE SIGNATURE FEATURE</div><h2>Don't guess.<br/><em>Simulate.</em></h2><p>When a walk-in arrives, SALORA can test the schedule before the receptionist commits to a yes.</p><div className="decision-list"><Decision color="green" title="ACCEPT" text="No scheduled customer is delayed."/><Decision color="amber" title="ACCEPT WITH WARNING" text="Feasible, but the schedule gets tighter."/><Decision color="blue" title="WAIT" text="Protect the schedule with a later slot."/><Decision color="red" title="RESCHEDULE" text="No safe placement under current constraints."/></div></div>
          <div className="theater"><div className="theater-head"><span><i/> SIMULATION THEATER</span><small>DETERMINISTIC · EXPLAINABLE</small></div><div className="theater-title">WHAT-IF SCHEDULE</div><div className="timeline"><div className="timeaxis"><span>4 PM</span><span>5 PM</span><span>6 PM</span><span>7 PM</span></div><div className="track"><label>Ananya</label><div className="block booked b1">Haircut<small>4:04</small></div><div className="block walk">WALK-IN<small>5:20</small></div><div className="block booked b2">Color<small>6:04</small></div></div><div className="track"><label>Meera</label><div className="block booked b3">Blow Dry<small>4:04</small></div><div className="open-window">SAFE WINDOW</div></div></div><div className="theater-result"><div className="big-check"><CheckCircle2/></div><div><small>ENGINE OUTPUT</small><strong>ACCEPT</strong><p>Immediate slot · 0 min delay · 0 affected</p></div><b>₹1,800<small>revenue opportunity</small></b></div><Link href="/login" className="theater-button">Run this for your salon <ArrowRight size={16}/></Link></div>
        </div>
      </section>

      <section className="impact-section wrap"><div className="section-kicker">ONE COMMAND CENTER</div><h2>From empty chair to <em>actionable opportunity.</em></h2><div className="impact-grid"><Impact value="82%" label="Chair utilization"/><Impact value="₹2,450" label="Walk-in opportunity"/><Impact value="0 min" label="Avoidable delay"/><Impact value="4" label="Decision outcomes"/></div></section>

      <footer className="footer-v2 wrap"><Link href="/" className="brand"><i/> SALORA</Link><span>Real-Time Walk-In Decision Intelligence</span><Link href="/login">Staff command center <ArrowRight size={14}/></Link></footer>
    </main>
  );
}

function Feature({n,icon,title,text}:{n:string;icon:ReactNode;title:string;text:string}){return <article className="feature-card"><div className="feature-top"><span>{n}</span><div>{icon}</div></div><h3>{title}</h3><p>{text}</p></article>}
function Decision({color,title,text}:{color:string;title:string;text:string}){return <div className="decision-item"><i className={color}/><div><b>{title}</b><span>{text}</span></div></div>}
function Impact({value,label}:{value:string;label:string}){return <div className="impact-card"><strong>{value}</strong><span>{label}</span></div>}
