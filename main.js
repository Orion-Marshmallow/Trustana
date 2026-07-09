// ── PUBLIC PAGE CONFIG ────────────────────────────────────────
// Mark that JS is running - enables reveal animations
document.body.classList.add('js-reveal-ready');

const WL_KEY = 'trustana_waitlist';
let histStack = [];
let session = null; // always null on public site

// ── FIREBASE HELPERS (stubs if not configured) ────────────────
window._fbReady = window._fbReady || false;
window._fbGet   = window._fbGet   || (()=>Promise.resolve(null));
window._fbSet   = window._fbSet   || (()=>Promise.resolve(false));

// ── SCREEN SWITCHING ──────────────────────────────────────────
function _showRaw(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = document.getElementById(id);
  if(el){ el.classList.add('active'); window.scrollTo(0,0); }
}

function goTo(id){
  histStack.push(id);
  if(histStack.length>20) histStack.shift();
  if(id==='s-waitlist'||id==='s-auth'){ goToWaitlist(); return; }  // public site: auth → waitlist
  if(id==='s-about'){ goToAbout(); return; }
  if(id==='s-contact'){ goToContact(); return; }
  if(id==='s-kwara'){ goToKwara(); return; }
  if(id==='s-land'){
    _showRaw('s-land');
    initLandCanvas();
    setTimeout(()=>{
      document.querySelectorAll('.reveal:not(.visible)').forEach(el=>{
        const io=new IntersectionObserver((en)=>{
          en.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
        },{threshold:0.12,rootMargin:'0px 0px -40px 0px'});
        io.observe(el);
      });
    },80);
    return;
  }
  _showRaw(id);
}

function _initHistory(){
  try{ history.replaceState({_ta:true},'',location.href); history.pushState({_ta:true},'',location.href); }catch(e){}
}
_initHistory();

window.addEventListener('popstate',function(){
  try{ history.pushState({_ta:true},'',location.href); }catch(e){}
  const openMdl=document.querySelector('.modal-bg.open');
  if(openMdl){ closeModal(openMdl.id); return; }
  if(histStack.length>1){ histStack.pop(); goTo(histStack[histStack.length-1]); }
});

// Stub functions referenced in HTML but not needed on public site
function stopDashTimer(){}
function renderDash(){}
function renderNaira(){}
function renderHome(){}
function renderDisputesCenter(){}
function renderNav(){}

function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function showToast(msg,err=false){const t=document.getElementById('toast');document.getElementById('tmsg').textContent=msg;t.style.borderColor=err?'var(--red)':'var(--green)';t.style.color=err?'var(--red)':'var(--green)';t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3200);}
function copyText(txt){navigator.clipboard.writeText(txt).then(()=>showToast('Copied!')).catch(()=>showToast('Copy failed',true));}

// ── WAITLIST ──────────────────────────────────────────────────
// WL_KEY already defined above

function goToWaitlist(){
  _showRaw('s-waitlist');
  initWlCanvas();
  // show live count if Firebase available
  _loadWlCount();
  // fade-in-on-scroll for left panel content
  setTimeout(()=>{
    document.querySelectorAll('#s-waitlist .reveal:not(.visible)').forEach(el=>{
      const _io=new IntersectionObserver((en)=>{
        en.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); _io.unobserve(e.target); } });
      },{threshold:0.12,rootMargin:'0px 0px -40px 0px'});
      _io.observe(el);
    });
  },80);
}

function toggleWlMenu(){
  const menu=document.getElementById('wl-mobile-menu');
  const btn=document.getElementById('wl-hamburger');
  if(!menu||!btn)return;
  const isOpen=menu.classList.contains('open');
  menu.classList.toggle('open',!isOpen);
  btn.classList.toggle('open',!isOpen);
}
function closeWlMenu(){
  const menu=document.getElementById('wl-mobile-menu');
  const btn=document.getElementById('wl-hamburger');
  if(menu)menu.classList.remove('open');
  if(btn)btn.classList.remove('open');
}
window.toggleWlMenu=toggleWlMenu;
window.closeWlMenu=closeWlMenu;

function _showRaw(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

function _loadWlCount(){
  let count=_getLocalWlEntries().length;
  const el=document.getElementById('wl-member-count');
  if(el)el.textContent=count>0?count+'+':(Math.floor(Math.random()*80)+120)+'';
  if(window._fbReady&&window._fbGet){
    window._fbGet('waitlist').then(data=>{
      if(data&&typeof data==='object'){
        const n=Object.keys(data).length;
        if(el&&n>0)el.textContent=n+'+';
      }
    }).catch(()=>{});
  }
}

function _getLocalWlEntries(){
  try{return JSON.parse(localStorage.getItem(WL_KEY)||'[]');}catch{return [];}
}

function submitWaitlist(){
  const fname=document.getElementById('wl-fname').value.trim();
  const lname=document.getElementById('wl-lname').value.trim();
  const email=document.getElementById('wl-email').value.trim().toLowerCase();
  const role=document.getElementById('wl-role').value;
  const country=document.getElementById('wl-country').value;
  const errEl=document.getElementById('wl-err');

  // Validate
  errEl.classList.remove('show');
  if(!fname){errEl.textContent='Please enter your first name.';errEl.classList.add('show');return;}
  if(!lname){errEl.textContent='Please enter your last name.';errEl.classList.add('show');return;}
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errEl.textContent='Please enter a valid email address.';errEl.classList.add('show');return;}
  if(!role){errEl.textContent='Please select your role.';errEl.classList.add('show');return;}
  if(!country){errEl.textContent='Please select your country.';errEl.classList.add('show');return;}

  // Check duplicate locally
  const existing=_getLocalWlEntries();
  if(existing.some(e=>e.email===email)){
    errEl.textContent='This email is already on the waitlist. We\'ll be in touch!';
    errEl.classList.add('show');
    return;
  }

  // Disable button
  const btn=document.getElementById('wl-btn');
  btn.disabled=true;
  btn.innerHTML='<span>⏳</span><span>SECURING YOUR SPOT…</span>';

  const entry={fname,lname,email,role,country,joinedAt:Date.now(),id:'WL-'+Date.now()};

  // Save locally
  existing.push(entry);
  try{localStorage.setItem(WL_KEY,JSON.stringify(existing));}catch{}

  // Save to Firebase if configured
  const saveRemote=window._fbReady&&window._fbSet
    ?window._fbSet('waitlist/'+entry.id,entry)
    :Promise.resolve(false);

  saveRemote.catch(()=>{}).finally(()=>{
    // Show success
    document.getElementById('wl-form-wrap').style.display='none';
    const succ=document.getElementById('wl-success');
    succ.classList.add('show');
    const nameTag=document.getElementById('wl-success-name');
    if(nameTag)nameTag.textContent='✦ '+fname.toUpperCase()+' — SPOT SECURED';
    _loadWlCount();
  });
}

// Waitlist canvas — same hex-particle style as auth screen
function initWlCanvas(){
  const canvas=document.getElementById('wl-canvas');
  if(!canvas||canvas._init)return;
  canvas._init=true;
  const ctx=canvas.getContext('2d');
  let W,H,pts=[];
  function resize(){W=canvas.width=canvas.offsetWidth;H=canvas.height=canvas.offsetHeight;}
  resize();
  window.addEventListener('resize',resize);
  const N=38;
  for(let i=0;i<N;i++)pts.push({
    x:Math.random()*W,y:Math.random()*H,
    vx:(Math.random()-.5)*.7,vy:(Math.random()-.5)*.7,
    size:Math.random()*20+9,
    a:Math.random()*.16+.05,
    col:'245,166,35',
    pulse:Math.random()*Math.PI*2,
    pulseSpeed:Math.random()*.035+.015
  });
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.pulse+=p.pulseSpeed;
      const glow=.5+.5*Math.sin(p.pulse);
      const alpha=p.a*(0.6+glow*.4);
      const sz=p.size*(1+glow*.15);
      // Soft halo
      const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*1.8);
      grad.addColorStop(0,`rgba(${p.col},${(alpha*0.28).toFixed(3)})`);
      grad.addColorStop(1,`rgba(${p.col},0)`);
      ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,sz*1.8,0,Math.PI*2);
      ctx.fillStyle=grad;ctx.fill();ctx.restore();
      // Hex
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.strokeStyle=`rgba(${p.col},1)`;
      ctx.lineWidth=0.9;
      ctx.shadowBlur=0;
      ctx.beginPath();
      for(let i=0;i<6;i++){
        const angle=Math.PI/3*i-Math.PI/6;
        const method=i===0?'moveTo':'lineTo';
        ctx[method](p.x+Math.cos(angle)*sz,p.y+Math.sin(angle)*sz);
      }
      ctx.closePath();ctx.stroke();
      ctx.restore();
      p.x+=p.vx;p.y+=p.vy;
      if(Math.random()<.01){p.vx+=(Math.random()-.5)*.2;p.vy+=(Math.random()-.5)*.2;}
      const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if(spd>1.4){p.vx=p.vx/spd*1.4;p.vy=p.vy/spd*1.4;}
      if(p.x<-30)p.x=W+30;if(p.x>W+30)p.x=-30;
      if(p.y<-30)p.y=H+30;if(p.y>H+30)p.y=-30;
    });
    requestAnimationFrame(draw);
  }
  draw();
}
// ── END WAITLIST ──────────────────────────────────────────────


// ── LANDING CANVAS ───────────────────────────────────────────
function initLandCanvas(){
  const canvas=document.getElementById('land-canvas');
  if(!canvas||canvas._init)return;
  canvas._init=true;
  const ctx=canvas.getContext('2d');
  let W,H,pts=[];

  function getCanvasHeight(){
    // Cover everything up to (but not including) the footer
    const footer=document.querySelector('.land-footer');
    const land=document.getElementById('s-land');
    if(footer&&land){
      const landTop=land.getBoundingClientRect().top+window.scrollY;
      const footerTop=footer.getBoundingClientRect().top+window.scrollY;
      return footerTop-landTop;
    }
    return document.body.scrollHeight;
  }

  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=getCanvasHeight();
    // Scatter any out-of-bounds particles back in after resize
    pts.forEach(p=>{
      if(p.x>W)p.x=Math.random()*W;
      if(p.y>H)p.y=Math.random()*H;
    });
  }

  // Density: ~1 particle per 14000px² spread across full page area
  function buildParticles(){
    pts=[];
    // Estimate full-page area for density calculation
    const area=W*(getCanvasHeight()||window.innerHeight*3);
    const N=Math.min(Math.floor(area/14000),90);
    for(let i=0;i<N;i++)pts.push({
      x:Math.random()*W,
      y:Math.random()*(getCanvasHeight()||H),
      vx:(Math.random()-.5)*.55,
      vy:(Math.random()-.5)*.55,
      size:Math.random()*20+7,
      a:Math.random()*.15+.05,
      col:'245,166,35',
      pulse:Math.random()*Math.PI*2,
      pulseSpeed:Math.random()*.025+.012
    });
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.pulse+=p.pulseSpeed;
      const glow=.5+.5*Math.sin(p.pulse);
      const alpha=p.a*(0.6+glow*.4);   // stays subtle
      const sz=p.size*(1+glow*.15);

      // Soft halo — much smaller radius, very low alpha
      const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*1.8);
      grad.addColorStop(0,`rgba(${p.col},${(alpha*0.28).toFixed(3)})`);
      grad.addColorStop(1,`rgba(${p.col},0)`);
      ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,sz*1.8,0,Math.PI*2);
      ctx.fillStyle=grad;ctx.fill();ctx.restore();

      // Hex outline — thin, no shadow blur
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.strokeStyle=`rgba(${p.col},1)`;
      ctx.lineWidth=0.9;
      ctx.shadowBlur=0;  // no blur — keeps it crisp and subtle
      ctx.beginPath();
      for(let i=0;i<6;i++){
        const angle=Math.PI/3*i-Math.PI/6;
        ctx[i===0?'moveTo':'lineTo'](p.x+Math.cos(angle)*sz,p.y+Math.sin(angle)*sz);
      }
      ctx.closePath();ctx.stroke();
      ctx.restore();

      // Move
      p.x+=p.vx;p.y+=p.vy;
      if(Math.random()<.008){p.vx+=(Math.random()-.5)*.15;p.vy+=(Math.random()-.5)*.15;}
      const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if(spd>1.3){p.vx=p.vx/spd*1.3;p.vy=p.vy/spd*1.3;}
      // Wrap around
      if(p.x<-40)p.x=W+40;if(p.x>W+40)p.x=-40;
      if(p.y<-40)p.y=H+40;if(p.y>H+40)p.y=-40;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize',()=>{resize();});
  // Re-measure after fonts/layout settle
  setTimeout(()=>{resize();buildParticles();draw();},120);
}
// Init landing canvas on first load since it's the active screen
initLandCanvas();
// Auto-run escrow sim after GSAP loads (with a short delay for drama)
(function(){
  function tryAutoSim(){
    if(typeof gsap!=='undefined'){
      // Auto-run the desktop sim if the element exists
      setTimeout(()=>{
        if(document.getElementById('escCard')&&!_simRunning) runEscrowSim();
        if(document.getElementById('escCardLand')&&!_simRunningLand) runEscrowSimLand();
        if(document.getElementById('escCardMob')&&!_simRunningMob) runEscrowSimMob();
      },1200);
    } else {
      setTimeout(tryAutoSim,300);
    }
  }
  tryAutoSim();
})();
// ── END LANDING ───────────────────────────────────────────────


// ── SCROLL REVEAL (IntersectionObserver) ──────────────────────
(function(){
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  },{threshold:0.12,rootMargin:'0px 0px -40px 0px'});

  function observeReveal(){
    document.querySelectorAll('.reveal:not(.visible)').forEach(el=>io.observe(el));
  }
  observeReveal();

  window._showRaw = (function(_orig){
    return function(id){
      _orig(id);
      setTimeout(observeReveal, 80);
    };
  })(window._showRaw||function(){});
})();
// ── END SCROLL REVEAL ─────────────────────────────────────

// ── REVEAL FALLBACK (ensures content shows even if IntersectionObserver
//    doesn't fire — e.g. local file on Android) ──────────────────────────
(function(){
  function forceReveal(){
    // Scoped to the currently active screen only — revealing elements on
    // screens the user hasn't visited yet would mark them 'visible' before
    // they're ever shown, killing the fade-up animation when navigated to.
    document.querySelectorAll('.screen.active .reveal:not(.visible)').forEach(function(el){
      el.classList.add('visible');
    });
  }
  // Single belt-and-suspenders pass, given generously after the normal
  // IntersectionObserver should have already handled it.
  setTimeout(forceReveal, 1200);
  window.addEventListener('load', function(){ setTimeout(forceReveal,1200); });

  // Re-arm the fallback every time the active screen changes
  window._showRaw = (function(_orig){
    return function(id){
      _orig(id);
      setTimeout(forceReveal, 1200);
    };
  })(window._showRaw||function(){});
})();
// ── END REVEAL FALLBACK ────────────────────────────────────────────


// ── COUNTER ANIMATION ─────────────────────────────────────────
(function(){
  function animateCount(el){
    const target=parseInt(el.dataset.count)||0;
    const isStatic=el.dataset.static;
    if(isStatic) return; // already set
    const duration=1600;
    const start=performance.now();
    const suffix=el.dataset.suffix||'';
    const prefix=el.dataset.prefix||'';
    function step(now){
      const p=Math.min((now-start)/duration,1);
      // ease out cubic
      const ease=1-Math.pow(1-p,3);
      const val=Math.round(ease*target);
      el.textContent=prefix+(val>=1000?val.toLocaleString():val)+suffix;
      if(p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const cio=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        animateCount(e.target);
        cio.unobserve(e.target);
      }
    });
  },{threshold:0.5});
  document.querySelectorAll('.land-stat-num[data-count]').forEach(el=>cio.observe(el));

  // Headline "1 IN 3" count-up — snappy quad-ease
  const hio=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const target=parseInt(e.target.dataset.count)||0;
        const dur=900,t0=performance.now();
        function step(now){
          const p=Math.min((now-t0)/dur,1);
          e.target.textContent=Math.round((1-Math.pow(1-p,2))*target);
          if(p<1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        hio.unobserve(e.target);
      }
    });
  },{threshold:0.6});
  document.querySelectorAll('.headline-count').forEach(el=>hio.observe(el));
})();
// ── END COUNTER ───────────────────────────────────────────────


// ── SCROLL PROGRESS BAR ──────────────────────────────────────
(function(){
  const bar=document.getElementById('scroll-progress');
  if(!bar)return;
  function updateBar(){
    const land=document.getElementById('s-land');
    if(!land||!land.classList.contains('active')){bar.style.width='0%';return;}
    const footer=document.querySelector('.land-footer');
    const total=(footer?footer.getBoundingClientRect().top+window.scrollY:document.body.scrollHeight)-window.innerHeight;
    const pct=total>0?Math.min(100,(window.scrollY/total)*100):0;
    bar.style.width=pct+'%';
    bar.style.display='block';
  }
  window.addEventListener('scroll',updateBar,{passive:true});
  updateBar();
})();
// ── END SCROLL PROGRESS ───────────────────────────────────────


// ── NAV SCROLL TINT ───────────────────────────────────────────
(function(){
  const nav=document.querySelector('.land-nav');
  if(!nav)return;
  function onScroll(){
    const scrolled=window.scrollY>60;
    nav.style.background=scrolled
      ?'rgba(13,13,15,.98)':'rgba(13,13,15,.92)';
    nav.style.boxShadow=scrolled
      ?'0 2px 24px rgba(0,0,0,.4)':'none';
  }
  window.addEventListener('scroll',onScroll,{passive:true});
})();
// ── END NAV SCROLL ────────────────────────────────────────────


// ── SCAN LINE — activate on page load & loop ──────────────────
(function(){
  const cards=document.querySelectorAll('.esc-card');
  cards.forEach(card=>{
    setTimeout(()=>{
      card.classList.add('scanning');
    },800);
  });
})();
// ── END SCAN LINE ─────────────────────────────────────────────


// ── ESCROW SIM: Load GSAP for animation only ──────────────────
(function(){
  function inject(src, cb){
    const s = document.createElement('script');
    s.src = src; s.onload = cb; s.onerror = function(){ cb(false); };
    document.head.appendChild(s);
  }
  inject('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', function(ok){
    // GSAP is now available globally for runEscrowSim()
    // No further setup needed — sim runs on button click
  });
})();

function initEscrowSim(){
  // Idle float loop (breathing)
  const card = document.getElementById('escCard');
  if(!card) return;
  // Float is handled by CSS animation; GSAP takes over during active sim
}

let _simRunning = false;

function runEscrowSim(){
  // If GSAP hasn't loaded yet, retry in 300ms
  if(typeof gsap === 'undefined'){
    document.getElementById('escBtnText').textContent = 'Loading...';
    setTimeout(runEscrowSim, 300);
    return;
  }
  if(_simRunning) return;
  _simRunning = true;

  const card    = document.getElementById('escCard');
  const amount  = document.getElementById('escAmount');
  const status  = document.getElementById('escStatus');
  const dot     = document.getElementById('escStatusDot');
  const subtext = document.getElementById('escSubtext');
  const badge   = document.getElementById('escAiBadge');
  const dot1    = document.getElementById('escFlowDot');
  const dot2    = document.getElementById('escFlowDot2');
  const check   = document.getElementById('escCheck');
  const btn     = document.getElementById('escBtn');
  const btnText = document.getElementById('escBtnText');

  // Disable button
  btn.disabled = true;
  card.classList.add('animating');

  const ease = 'power3.out';
  const tl = gsap.timeline({
    onComplete: () => {
      _simRunning = false;
      btn.disabled = false;
      btnText.textContent = 'Run Again';
      btn.querySelector('.esc-btn-icon').textContent = '↺';
      // GSAP fade-out → reset → fade-in → replay
      setTimeout(()=>{
        const _rc=document.getElementById('escCard');
        if(_rc){
          gsap.to(_rc,{opacity:0,y:6,duration:.5,ease:'power2.in',onComplete:()=>{
            const _dot=_rc.querySelector('.esc-status-dot');
            const _amt=_rc.querySelector('.esc-amount');
            const _stl=_rc.querySelector('.esc-status-label');
            const _aib=document.getElementById('escAiBadge');
            if(_dot) _dot.className='esc-status-dot';
            if(_amt) _amt.textContent='0';
            if(_stl) _stl.textContent='Awaiting deposit...';
            if(_aib){_aib.classList.remove('verified');const _sp=_aib.querySelector('span:last-child');if(_sp)_sp.textContent='AI Verify';}
            gsap.set(_rc,{boxShadow:'none'});
            gsap.to(_rc,{opacity:1,y:0,duration:.5,ease:'power2.out',delay:.1,onComplete:()=>{
              if(!_simRunning) runEscrowSim();
            }});
          }});
        } else if(!_simRunning) runEscrowSim();
      }, 2000);
    }
  });

  // ── STEP 1: DEPOSIT ─────────────────────────────────
  tl.to(card, { opacity: 1, y: 0, duration: 0 })
    .to(card, { y: -4, duration: 0.5, ease }, 0)
    .call(() => {
      dot.className = 'esc-status-dot depositing';
      status.textContent = 'Depositing...';
      status.classList.add('active');
      subtext.textContent = 'Locking client funds...';
    }, [], 0)
    // Count up amount
    .to({ val: 0 }, {
      val: 2400,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: function(){
        amount.textContent = Math.round(this.targets()[0].val).toLocaleString();
      }
    }, 0.1);

  // ── STEP 2: LOCK FUNDS ───────────────────────────────
  tl.call(() => {
      dot.className = 'esc-status-dot locked';
      status.textContent = 'Funds Secured';
      subtext.textContent = 'Locked in escrow vault · Unhackable';
      card.classList.remove('glow-verified','glow-success');
      card.classList.add('glow-locked');
      btnText.textContent = 'Securing...';
    }, [], 1.6)
    // Glow pulse
    .fromTo(card, { boxShadow: '0 8px 48px rgba(0,0,0,.5), 0 0 0px rgba(91,139,245,0)' },
    { boxShadow: '0 8px 48px rgba(0,0,0,.5), 0 0 60px rgba(91,139,245,.45), 0 0 0 1px rgba(91,139,245,.4)', duration: 0.7, ease: 'power2.out', yoyo: true, repeat: 1 }, 1.6);

  // ── STEP 3: AI VERIFICATION ──────────────────────────
  tl.call(() => {
      dot.className = 'esc-status-dot verifying';
      status.textContent = 'Verifying...';
      subtext.textContent = 'SmartVerify™ AI scanning delivery...';
      card.classList.remove('glow-locked');
      card.classList.add('glow-verified');
      btnText.textContent = 'AI Verifying...';
    }, [], 3.1)
    .to(badge, { scale: 1.18, duration: 0.28, ease: 'back.out(2)', yoyo: true, repeat: 3 }, 3.15)
    .to(badge, { opacity: 0.5, duration: 0.15, yoyo: true, repeat: 5 }, 3.2);

  // ── STEP 4: PAYMENT RELEASE ──────────────────────────
  tl.call(() => {
      dot.className = 'esc-status-dot sent';
      status.textContent = 'Payment Sent';
      subtext.textContent = 'Funds released to developer · Done';
      card.classList.remove('glow-verified');
      card.classList.add('glow-success');
      btnText.textContent = 'Releasing...';
    }, [], 4.5)
    // Animate dot along first segment (Client → Escrow)
    .fromTo(dot1, { left: '0%', opacity: 1 }, { left: '100%', opacity: 1, duration: 0.7, ease: 'power2.inOut' }, 4.5)
    .to(dot1, { opacity: 0, duration: 0.2 }, 5.1)
    // Animate dot along second segment (Escrow → Dev)
    .fromTo(dot2, { left: '0%', opacity: 1 }, { left: '100%', opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 5.0)
    .to(dot2, { opacity: 0, duration: 0.2 }, 5.7);

  // ── STEP 5: COMPLETE ─────────────────────────────────
  tl.call(() => {
      status.textContent = '✓ Complete';
      subtext.textContent = 'Transaction verified & closed';
    }, [], 5.9)
    .to(check, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, 5.9)
    .to(card, { y: 0, duration: 0.5, ease }, 5.9);
}

window.runEscrowSim = runEscrowSim;

// -- LANDING HERO ESCROW SIM --
let _simRunningLand = false;
function runEscrowSimLand(){
  if(typeof gsap==='undefined'){const bt=document.getElementById('escBtnTextLand');if(bt)bt.textContent='Loading...';setTimeout(runEscrowSimLand,300);return;}
  if(_simRunningLand)return;
  _simRunningLand=true;
  const card=document.getElementById('escCardLand'),amount=document.getElementById('escAmountLand'),status=document.getElementById('escStatusLand'),dot=document.getElementById('escStatusDotLand'),subtext=document.getElementById('escSubtextLand'),badge=document.getElementById('escAiBadgeLand'),dot1=document.getElementById('escFlowDotLand'),dot2=document.getElementById('escFlowDot2Land'),check=document.getElementById('escCheckLand'),btn=document.getElementById('escBtnLand'),btnText=document.getElementById('escBtnTextLand');
  if(!card){_simRunningLand=false;return;}
  btn.disabled=true;card.classList.add('animating');
  const tl=gsap.timeline({onComplete:()=>{_simRunningLand=false;btn.disabled=false;btnText.textContent='Run Again';btn.querySelector('.esc-btn-icon').textContent='\u21ba';setTimeout(()=>{
        const _rl=document.getElementById('escCardLand');
        if(_rl){
          gsap.to(_rl,{opacity:0,y:6,duration:.5,ease:'power2.in',onComplete:()=>{
            const _d=_rl.querySelector('.esc-status-dot'),_a=_rl.querySelector('.esc-amount'),_s=_rl.querySelector('.esc-status-label'),_b=document.getElementById('escAiBadgeLand');
            if(_d)_d.className='esc-status-dot';if(_a)_a.textContent='0';if(_s)_s.textContent='Awaiting deposit...';
            if(_b){_b.classList.remove('verified');const _sp=_b.querySelector('span:last-child');if(_sp)_sp.textContent='AI Verify';}
            gsap.set(_rl,{boxShadow:'none'});
            gsap.to(_rl,{opacity:1,y:0,duration:.5,ease:'power2.out',delay:.1,onComplete:()=>{if(!_simRunningLand)runEscrowSimLand();}});
          }});
        } else if(!_simRunningLand)runEscrowSimLand();
      },2000);}});
  tl.to(card,{y:-4,duration:0.5,ease:'power3.out'},0)
    .call(()=>{dot.className='esc-status-dot depositing';status.textContent='Depositing...';status.classList.add('active');subtext.textContent='Locking client funds...';},[], 0)
    .to({val:0},{val:2400,duration:1.4,ease:'power2.out',onUpdate:function(){amount.textContent=Math.round(this.targets()[0].val).toLocaleString();}},0.1)
    .call(()=>{dot.className='esc-status-dot locked';status.textContent='Funds Secured';subtext.textContent='Locked in escrow vault';card.classList.remove('glow-verified','glow-success');card.classList.add('glow-locked');btnText.textContent='Securing...';},[], 1.6)
    .fromTo(card,{boxShadow:'0 8px 48px rgba(0,0,0,.5),0 0 0px rgba(91,139,245,0)'},{boxShadow:'0 8px 48px rgba(0,0,0,.5),0 0 60px rgba(91,139,245,.45),0 0 0 1px rgba(91,139,245,.4)',duration:0.7,ease:'power2.out',yoyo:true,repeat:1},1.6)
    .call(()=>{dot.className='esc-status-dot verifying';status.textContent='Verifying...';subtext.textContent='SmartVerify AI scanning delivery...';card.classList.remove('glow-locked');card.classList.add('glow-verified');btnText.textContent='AI Verifying...';},[], 3.1)
    .to(badge,{scale:1.18,duration:0.28,ease:'back.out(2)',yoyo:true,repeat:3},3.15)
    .to(badge,{opacity:0.5,duration:0.15,yoyo:true,repeat:5},3.2)
    .call(()=>{dot.className='esc-status-dot sent';status.textContent='Payment Sent';subtext.textContent='Funds released to developer';card.classList.remove('glow-verified');card.classList.add('glow-success');btnText.textContent='Releasing...';},[], 4.5)
    .fromTo(dot1,{left:'0%',opacity:1},{left:'100%',opacity:1,duration:0.7,ease:'power2.inOut'},4.5)
    .to(dot1,{opacity:0,duration:0.2},5.1)
    .fromTo(dot2,{left:'0%',opacity:1},{left:'100%',opacity:1,duration:0.8,ease:'power2.inOut'},5.0)
    .to(dot2,{opacity:0,duration:0.2},5.7)
    .call(()=>{status.textContent='\u2713 Complete';subtext.textContent='Transaction verified & closed';},[], 5.9)
    .to(check,{opacity:1,scale:1,duration:0.5,ease:'back.out(2)'},5.9)
    .to(card,{y:0,duration:0.5,ease:'power3.out'},5.9);
}
window.runEscrowSimLand=runEscrowSimLand;
// -- MOBILE HERO ESCROW SIM --
let _simRunningMob = false;
function runEscrowSimMob(){
  if(typeof gsap==='undefined'){const bt=document.getElementById('escBtnTextMob');if(bt)bt.textContent='Loading...';setTimeout(runEscrowSimMob,300);return;}
  if(_simRunningMob)return;
  _simRunningMob=true;
  const card=document.getElementById('escCardMob'),amount=document.getElementById('escAmountMob'),status=document.getElementById('escStatusMob'),dot=document.getElementById('escStatusDotMob'),subtext=document.getElementById('escSubtextMob'),badge=document.getElementById('escAiBadgeMob'),dot1=document.getElementById('escFlowDotMob'),dot2=document.getElementById('escFlowDot2Mob'),check=document.getElementById('escCheckMob'),btn=document.getElementById('escBtnMob'),btnText=document.getElementById('escBtnTextMob');
  if(!card){_simRunningMob=false;return;}
  btn.disabled=true;card.classList.add('animating');
  const tl=gsap.timeline({onComplete:()=>{_simRunningMob=false;btn.disabled=false;btnText.textContent='Run Again';btn.querySelector('.esc-btn-icon').textContent='\u21ba';setTimeout(()=>{
        const _rm=document.getElementById('escCardMob');
        if(_rm){
          gsap.to(_rm,{opacity:0,y:6,duration:.5,ease:'power2.in',onComplete:()=>{
            const _d=_rm.querySelector('.esc-status-dot'),_a=_rm.querySelector('.esc-amount'),_s=_rm.querySelector('.esc-status-label'),_b=document.getElementById('escAiBadgeMob');
            if(_d)_d.className='esc-status-dot';if(_a)_a.textContent='0';if(_s)_s.textContent='Awaiting deposit...';
            if(_b){_b.classList.remove('verified');const _sp=_b.querySelector('span:last-child');if(_sp)_sp.textContent='AI Verify';}
            gsap.set(_rm,{boxShadow:'none'});
            gsap.to(_rm,{opacity:1,y:0,duration:.5,ease:'power2.out',delay:.1,onComplete:()=>{if(!_simRunningMob)runEscrowSimMob();}});
          }});
        } else if(!_simRunningMob)runEscrowSimMob();
      },2000);}});
  tl.to(card,{y:-4,duration:0.5,ease:'power3.out'},0)
    .call(()=>{dot.className='esc-status-dot depositing';status.textContent='Depositing...';status.classList.add('active');subtext.textContent='Locking client funds...';},[], 0)
    .to({val:0},{val:2400,duration:1.4,ease:'power2.out',onUpdate:function(){amount.textContent=Math.round(this.targets()[0].val).toLocaleString();}},0.1)
    .call(()=>{dot.className='esc-status-dot locked';status.textContent='Funds Secured';subtext.textContent='Locked in escrow vault';card.classList.remove('glow-verified','glow-success');card.classList.add('glow-locked');btnText.textContent='Securing...';},[], 1.6)
    .fromTo(card,{boxShadow:'0 8px 48px rgba(0,0,0,.5),0 0 0px rgba(91,139,245,0)'},{boxShadow:'0 8px 48px rgba(0,0,0,.5),0 0 60px rgba(91,139,245,.45),0 0 0 1px rgba(91,139,245,.4)',duration:0.7,ease:'power2.out',yoyo:true,repeat:1},1.6)
    .call(()=>{dot.className='esc-status-dot verifying';status.textContent='Verifying...';subtext.textContent='SmartVerify AI scanning...';card.classList.remove('glow-locked');card.classList.add('glow-verified');btnText.textContent='AI Verifying...';},[], 3.1)
    .to(badge,{scale:1.18,duration:0.28,ease:'back.out(2)',yoyo:true,repeat:3},3.15)
    .to(badge,{opacity:0.5,duration:0.15,yoyo:true,repeat:5},3.2)
    .call(()=>{dot.className='esc-status-dot sent';status.textContent='Payment Sent';subtext.textContent='Funds released to developer';card.classList.remove('glow-verified');card.classList.add('glow-success');btnText.textContent='Releasing...';},[], 4.5)
    .fromTo(dot1,{left:'0%',opacity:1},{left:'100%',opacity:1,duration:0.7,ease:'power2.inOut'},4.5)
    .to(dot1,{opacity:0,duration:0.2},5.1)
    .fromTo(dot2,{left:'0%',opacity:1},{left:'100%',opacity:1,duration:0.8,ease:'power2.inOut'},5.0)
    .to(dot2,{opacity:0,duration:0.2},5.7)
    .call(()=>{status.textContent='\u2713 Complete';subtext.textContent='Transaction verified & closed';},[], 5.9)
    .to(check,{opacity:1,scale:1,duration:0.5,ease:'back.out(2)'},5.9)
    .to(card,{y:0,duration:0.5,ease:'power3.out'},5.9);
}
window.runEscrowSimMob=runEscrowSimMob;


let _rateEscId=null, _rateTarget=null, _rateVal=0;
const RATE_LABELS=['','😞 Poor','😐 Fair','🙂 Good','😊 Great','🤩 Excellent'];

function openRateModal(escId, target){
  const u=getUser();
  const e=u.escrows.find(x=>x.id===escId);
  if(!e)return;
  _rateEscId=escId; _rateTarget=target; _rateVal=0;
  setRating(0);
  document.getElementById('rate-text').value='';

  const isRatingClient=(target==='client');
  const partyEmail=isRatingClient?e.clientEmail:e.flEmail;
  const store=loadStore();
  const party=partyEmail?store[partyEmail]:null;
  const partyName=party?((party.fname||'')+' '+(party.lname||'')).trim()
    :(isRatingClient?(e.clientName||'Client'):(e.flName||'Freelancer'));
  const partyRole=isRatingClient?'Client':'Freelancer';
  const partyColor=isRatingClient?'#F5A623':'#2DD4A0';
  const partyInitial=partyName.charAt(0).toUpperCase()||'?';

  document.getElementById('rate-ico').textContent=isRatingClient?'👤':'💻';
  document.getElementById('rate-title').textContent=isRatingClient?'RATE THIS CLIENT':'RATE THIS FREELANCER';
  document.getElementById('rate-sub').textContent=`Your honest review helps the Trustana community.`;
  document.getElementById('rate-party-av').textContent=partyInitial;
  document.getElementById('rate-party-av').style.background=partyColor+'22';
  document.getElementById('rate-party-av').style.borderColor=partyColor;
  document.getElementById('rate-party-name').textContent=partyName;
  document.getElementById('rate-party-role').textContent=partyRole+' · '+e.job.slice(0,36)+(e.job.length>36?'…':'');

  // Sub-ratings
  const subCats=isRatingClient
    ?[{k:'communication',l:'Communication'},
      {k:'payment_speed',l:'Payment Speed'},
      {k:'clarity',l:'Brief Clarity'}]
    :[{k:'quality',l:'Work Quality'},
      {k:'communication',l:'Communication'},
      {k:'timeliness',l:'Timeliness'}];
  document.getElementById('rate-sub-ratings').innerHTML=subCats.map(c=>`
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:.72rem;color:var(--stone2)">${c.l}</span>
        <span id="sub-lbl-${c.k}" style="font-size:.65rem;color:var(--amber);font-weight:600;min-width:16px;text-align:right"></span>
      </div>
      <div class="rating-stars" id="sub-stars-${c.k}" data-key="${c.k}" style="gap:3px">
        ${[1,2,3,4,5].map(v=>`<span data-v="${v}" onclick="setSubRating('${c.k}',${v})">★</span>`).join('')}
      </div>
    </div>
  `).join('');
  openModal('m-rate');
}
window.openRateModal=openRateModal;

function setRating(v){
  _rateVal=v;
  document.querySelectorAll('#rate-stars span').forEach(s=>{
    const sv=parseInt(s.dataset.v);
    s.classList.toggle('lit',sv<=v);
  });
  document.getElementById('rate-label').textContent=v?RATE_LABELS[v]:'Tap to rate';
}
window.setRating=setRating;

function setSubRating(key,v){
  document.querySelectorAll(`#sub-stars-${key} span`).forEach(s=>{
    s.classList.toggle('lit',parseInt(s.dataset.v)<=v);
  });
  const lbl=document.getElementById('sub-lbl-'+key);
  if(lbl)lbl.textContent=v+'/5';
}
window.setSubRating=setSubRating;

function _getSubRatings(key){
  const stars=document.querySelectorAll(`#sub-stars-${key} span`);
  let v=0;
  stars.forEach(s=>{ if(s.classList.contains('lit'))v=Math.max(v,parseInt(s.dataset.v)); });
  return v;
}

function submitRating(){
  if(!_rateVal){showToast('Please tap a star rating',true);return;}
  const u=getUser();
  const e=u.escrows.find(x=>x.id===_rateEscId);
  if(!e)return;
  const text=document.getElementById('rate-text').value.trim();

  // Collect sub-ratings
  const isRatingClient=(_rateTarget==='client');
  const subKeys=isRatingClient?['communication','payment_speed','clarity']:['quality','communication','timeliness'];
  const subs={};
  subKeys.forEach(k=>{ subs[k]=_getSubRatings(k)||_rateVal; });

  const reviewObj={
    overall:_rateVal,
    subs,
    text,
    ratedAt:Date.now(),
    job:e.job,
    byEmail:u.email,
    byName:(u.fname||'')+' '+(u.lname||''),
    byRole:u.role
  };

  // Save rating into escrow.ratings.byClient or .byFreelancer
  if(!e.ratings)e.ratings={};
  if(isRatingClient) e.ratings.byFreelancer=reviewObj;
  else e.ratings.byClient=reviewObj;
  saveUser(u);

  // Push rating to the rated person's profile ratings array
  const store=loadStore();
  const targetEmail=isRatingClient?e.clientEmail:e.flEmail;
  if(targetEmail&&store[targetEmail]){
    const tp=store[targetEmail];
    if(!tp.profileRatings)tp.profileRatings=[];
    tp.profileRatings.unshift({...reviewObj,escId:_rateEscId});
    store[targetEmail]=tp;
    localStorage.setItem(STORE_KEY,JSON.stringify(store));
    if(window._fbReady)window._fbSet('store',store);
  }

  closeModal('m-rate');
  pushNotif('info','Review Submitted',`You rated ${isRatingClient?'the client':'the freelancer'} ⭐${_rateVal}/5`,null);
  showToast('⭐ Review submitted! Thank you.');
  if(document.getElementById('s-detail').classList.contains('active'))viewDetail(_rateEscId);
}
window.submitRating=submitRating;

// ── REVIEWS panel (account modal) ──

// ── FAQ ───────────────────────────────────────────────────────
function toggleFaq(qEl){
  const item = qEl.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  // Close all others
  document.querySelectorAll('.faq-item.open').forEach(el=>{
    if(el!==item) el.classList.remove('open');
  });
  item.classList.toggle('open', !isOpen);
}
window.toggleFaq=toggleFaq;
// ── END FAQ ───────────────────────────────────────────────────


// ── PAGE TITLE PER SCREEN ────────────────────────────────────
(function(){
  const _TITLES={
    's-land':"Trustana — Nigeria's Freelance Escrow",
    's-about':"About — Trustana",'s-contact':"Contact — Trustana",'s-kwara':"Built in Kwara — Trustana",
    's-auth':"Sign In — Trustana",
    's-waitlist':"Join the Waitlist — Trustana",
    's-home':"Dashboard — Trustana",
    's-create':"Create Escrow — Trustana",
    's-dash':"My Escrows — Trustana",
    's-detail':"Escrow Detail — Trustana",
    's-disputes':"Disputes — Trustana",
    's-naira':"Naira Wallet — Trustana",
    's-profile':"Profile — Trustana"
  };
  const _origShow=window._showRaw||function(){};
  // Patch document title on every screen change
  const _showObserver=new MutationObserver(()=>{
    const active=document.querySelector('.screen.active');
    if(active&&_TITLES[active.id]) document.title=_TITLES[active.id];
  });
  _showObserver.observe(document.body,{subtree:true,attributeFilter:['class']});
})();
// ── END PAGE TITLE ────────────────────────────────────────────


// ── CONTACT PAGE ──────────────────────────────────────────────
function goToContact(){
  histStack.push('s-contact');
  if(histStack.length>20) histStack.shift();
  _showRaw('s-contact');
  initContactCanvas();
  // Re-run scroll reveal for contact page elements
  setTimeout(()=>{
    document.querySelectorAll('#s-contact .reveal:not(.visible)').forEach(el=>{
      const _io=new IntersectionObserver((en)=>{en.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');_io.unobserve(e.target);}});},{threshold:0.12});
      _io.observe(el);
    });
  },80);
}
window.goToContact=goToContact;
function goToAbout(){
  histStack.push('s-about');
  if(histStack.length>20) histStack.shift();
  _showRaw('s-about');
  initAboutCanvas();
  setTimeout(()=>{
    document.querySelectorAll('#s-about .reveal:not(.visible)').forEach(el=>{
      const _io=new IntersectionObserver((en)=>{en.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');_io.unobserve(e.target);}});},{threshold:0.12});
      _io.observe(el);
    });
  },80);
}
window.goToAbout=goToAbout;

function goToKwara(){
  histStack.push('s-kwara');
  if(histStack.length>20) histStack.shift();
  _showRaw('s-kwara');
  initKwaraCanvas();
  setTimeout(()=>{
    document.querySelectorAll('#s-kwara .reveal:not(.visible)').forEach(el=>{
      const _io=new IntersectionObserver((en)=>{en.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');_io.unobserve(e.target);}});},{threshold:0.12});
      _io.observe(el);
    });
  },80);
}
window.goToKwara=goToKwara;

function toggleKwaraMenu(){
  const menu=document.getElementById('kwara-mobile-menu');
  const btn=document.getElementById('kwara-hamburger');
  if(!menu||!btn)return;
  const isOpen=menu.classList.contains('open');
  menu.classList.toggle('open',!isOpen);
  btn.classList.toggle('open',!isOpen);
}
window.toggleKwaraMenu=toggleKwaraMenu;

function initKwaraCanvas(){
  const c=document.getElementById('kwara-canvas');
  if(!c||c._init)return;c._init=true;
  const ctx=c.getContext('2d');let W,H,pts=[];
  function resize(){W=c.width=window.innerWidth;H=c.height=Math.max(document.getElementById('s-kwara').scrollHeight||0,window.innerHeight*2);c.style.height=H+'px';}
  function build(){pts=[];const N=Math.min(Math.floor((W*H)/13000),55);for(let i=0;i<N;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,size:Math.random()*18+7,a:Math.random()*.15+.05,col:'245,166,35',pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*.025+.012});}
  function draw(){ctx.clearRect(0,0,W,H);pts.forEach(p=>{p.pulse+=p.pulseSpeed;const glow=.5+.5*Math.sin(p.pulse);const alpha=p.a*(0.6+glow*.4);const sz=p.size*(1+glow*.15);const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*1.8);grad.addColorStop(0,`rgba(${p.col},${(alpha*0.28).toFixed(3)})`);grad.addColorStop(1,`rgba(${p.col},0)`);ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,sz*1.8,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.restore();ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=`rgba(${p.col},1)`;ctx.lineWidth=0.9;ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;ctx[i===0?'moveTo':'lineTo'](p.x+Math.cos(a)*sz,p.y+Math.sin(a)*sz);}ctx.closePath();ctx.stroke();ctx.restore();p.x+=p.vx;p.y+=p.vy;if(Math.random()<.008){p.vx+=(Math.random()-.5)*.15;p.vy+=(Math.random()-.5)*.15;}const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);if(spd>1.2){p.vx=p.vx/spd*1.2;p.vy=p.vy/spd*1.2;}if(p.x<-40)p.x=W+40;if(p.x>W+40)p.x=-40;if(p.y<-40)p.y=H+40;if(p.y>H+40)p.y=-40;});requestAnimationFrame(draw);}
  window.addEventListener('resize',()=>{resize();build();});
  setTimeout(()=>{resize();build();draw();},80);
}

function initAboutCanvas(){
  const c=document.getElementById('about-canvas');
  if(!c||c._init)return;c._init=true;
  const ctx=c.getContext('2d');let W,H,pts=[];
  function resize(){W=c.width=window.innerWidth;H=c.height=Math.max(document.getElementById('s-about').scrollHeight||0,window.innerHeight*2);c.style.height=H+'px';}
  function build(){pts=[];const N=Math.min(Math.floor((W*H)/13000),55);for(let i=0;i<N;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,size:Math.random()*18+7,a:Math.random()*.15+.05,col:'245,166,35',pulse:Math.random()*Math.PI*2,pulseSpeed:Math.random()*.025+.012});}
  function draw(){ctx.clearRect(0,0,W,H);pts.forEach(p=>{p.pulse+=p.pulseSpeed;const glow=.5+.5*Math.sin(p.pulse);const alpha=p.a*(0.6+glow*.4);const sz=p.size*(1+glow*.15);const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*1.8);grad.addColorStop(0,`rgba(${p.col},${(alpha*0.28).toFixed(3)})`);grad.addColorStop(1,`rgba(${p.col},0)`);ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,sz*1.8,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.restore();ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=`rgba(${p.col},1)`;ctx.lineWidth=0.9;ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;ctx[i===0?'moveTo':'lineTo'](p.x+Math.cos(a)*sz,p.y+Math.sin(a)*sz);}ctx.closePath();ctx.stroke();ctx.restore();p.x+=p.vx;p.y+=p.vy;if(Math.random()<.008){p.vx+=(Math.random()-.5)*.15;p.vy+=(Math.random()-.5)*.15;}const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);if(spd>1.2){p.vx=p.vx/spd*1.2;p.vy=p.vy/spd*1.2;}if(p.x<-40)p.x=W+40;if(p.x>W+40)p.x=-40;if(p.y<-40)p.y=H+40;if(p.y>H+40)p.y=-40;});requestAnimationFrame(draw);}
  window.addEventListener('resize',()=>{resize();build();});
  setTimeout(()=>{resize();build();draw();},80);
}

function submitContactForm(){
  const fn=(document.getElementById('cf-fn')||{}).value?.trim();
  const ln=(document.getElementById('cf-ln')||{}).value?.trim();
  const em=(document.getElementById('cf-em')||{}).value?.trim();
  const subj=(document.getElementById('cf-subj')||{}).value;
  const msg=(document.getElementById('cf-msg')||{}).value?.trim();
  const errEl=document.getElementById('cf-err');
  if(!fn||!ln){errEl.textContent='Please enter your full name.';errEl.style.display='block';return;}
  if(!em||!em.includes('@')){errEl.textContent='Please enter a valid email address.';errEl.style.display='block';return;}
  if(!subj){errEl.textContent='Please select a subject.';errEl.style.display='block';return;}
  if(!msg||msg.length<10){errEl.textContent='Please write a message (at least 10 characters).';errEl.style.display='block';return;}
  errEl.style.display='none';
  const btn=document.getElementById('cf-btn-text');
  if(btn){btn.textContent='Sending…';}
  // POST to Formspree (free tier — swap in real endpoint before launch)
  const _FORMSPREE='https://formspree.io/f/xvzjozny'; // placeholder endpoint
  const _formData={name:fn+' '+ln,email:em,phone:(document.getElementById('cf-ph')||{}).value||'',subject:subj,message:msg};
  fetch(_FORMSPREE,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(_formData)})
    .catch(()=>{}); // silent fail — still show success in demo
  setTimeout(()=>{
    document.getElementById('contact-form-inner').style.opacity='0';
    document.getElementById('contact-form-inner').style.pointerEvents='none';
    setTimeout(()=>{
      document.getElementById('contact-form-inner').style.display='none';
      const successEl=document.getElementById('contact-success');
      if(successEl){successEl.style.display='block';}
    },300);
    showToast('✅ Message sent! We\'ll reply within 24 hours.');
  },1200);
}
window.submitContactForm=submitContactForm;

function initContactCanvas(){
  const c=document.getElementById('contact-canvas');
  if(!c||c._init)return;c._init=true;
  // Reuse the exact same hexagon logic as landing canvas
  const ctx=c.getContext('2d');
  let W,H,pts=[];
  function resize(){W=c.width=window.innerWidth;H=c.height=Math.max(document.getElementById('s-contact').scrollHeight||0,window.innerHeight*2);c.style.height=H+'px';}
  function buildPts(){
    pts=[];
    const N=Math.min(Math.floor((W*H)/12000),60);
    for(let i=0;i<N;i++)pts.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,
      size:Math.random()*18+7,
      a:Math.random()*.15+.05,
      col:'245,166,35',
      pulse:Math.random()*Math.PI*2,
      pulseSpeed:Math.random()*.025+.012
    });
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.pulse+=p.pulseSpeed;
      const glow=.5+.5*Math.sin(p.pulse);
      const alpha=p.a*(0.6+glow*.4);
      const sz=p.size*(1+glow*.15);
      const grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*1.8);
      grad.addColorStop(0,`rgba(${p.col},${(alpha*0.28).toFixed(3)})`);
      grad.addColorStop(1,`rgba(${p.col},0)`);
      ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,sz*1.8,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.restore();
      ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=`rgba(${p.col},1)`;ctx.lineWidth=0.9;ctx.shadowBlur=0;
      ctx.beginPath();
      for(let i=0;i<6;i++){const angle=Math.PI/3*i-Math.PI/6;ctx[i===0?'moveTo':'lineTo'](p.x+Math.cos(angle)*sz,p.y+Math.sin(angle)*sz);}
      ctx.closePath();ctx.stroke();ctx.restore();
      p.x+=p.vx;p.y+=p.vy;
      if(Math.random()<.008){p.vx+=(Math.random()-.5)*.15;p.vy+=(Math.random()-.5)*.15;}
      const spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);if(spd>1.2){p.vx=p.vx/spd*1.2;p.vy=p.vy/spd*1.2;}
      if(p.x<-40)p.x=W+40;if(p.x>W+40)p.x=-40;if(p.y<-40)p.y=H+40;if(p.y>H+40)p.y=-40;
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',()=>{resize();buildPts();});
  setTimeout(()=>{resize();buildPts();draw();},80);
}
// ── END CONTACT PAGE ──────────────────────────────────────────


// ── END TAB TITLE CYCLING ─────────────────────────────────────
(function(){
  const _cycles=["Trustana — Nigeria's Freelance Escrow","🔐 Escrow-Protected Payments","✦ SmartVerify™ AI","🇳🇬 Get Paid. No Scams. Guaranteed.","Trustana — Nigeria's Freelance Escrow"];
  let _cidx=0,_cInt=null;
  function startCycle(){if(_cInt)return;_cInt=setInterval(()=>{_cidx=(_cidx+1)%_cycles.length;document.title=_cycles[_cidx];},4000);}
  function stopCycle(){clearInterval(_cInt);_cInt=null;document.title="Trustana \u2014 Nigeria's Freelance Escrow";}
  new MutationObserver(()=>{const a=document.querySelector('.screen.active');if(a&&a.id==='s-land')startCycle();else stopCycle();}).observe(document.body,{subtree:true,attributeFilter:['class']});
  setTimeout(()=>{const l=document.getElementById('s-land');if(l&&l.classList.contains('active'))startCycle();},2000);
})();
// ── END TAB TITLE CYCLING ─────────────────────────────────────


// ── MOBILE NAV MENU ──────────────────────────────────────────
function toggleMobileMenu(){
  const menu=document.getElementById('land-mobile-menu');
  const btn=document.getElementById('land-hamburger');
  if(!menu||!btn)return;
  const isOpen=menu.classList.contains('open');
  menu.classList.toggle('open',!isOpen);
  btn.classList.toggle('open',!isOpen);
}
function closeMobileMenu(){
  const menu=document.getElementById('land-mobile-menu');
  const btn=document.getElementById('land-hamburger');
  if(menu)menu.classList.remove('open');
  if(btn)btn.classList.remove('open');
}
// Close mobile menu when navigating away
const _origGoTo=window.goTo||goTo;
// patch: close menu on any goTo
(function(){
  const _g=goTo;
  window.goTo=function(id){ closeMobileMenu(); _g(id); };
})();
window.toggleMobileMenu=toggleMobileMenu;
window.closeMobileMenu=closeMobileMenu;

function toggleAboutMenu(){
  const menu=document.getElementById('about-mobile-menu');
  const btn=document.getElementById('about-hamburger');
  if(!menu||!btn)return;
  const isOpen=menu.classList.contains('open');
  menu.classList.toggle('open',!isOpen);
  btn.classList.toggle('open',!isOpen);
}
window.toggleAboutMenu=toggleAboutMenu;

function toggleContactMenu(){
  const menu=document.getElementById('contact-mobile-menu');
  const btn=document.getElementById('contact-hamburger');
  if(!menu||!btn)return;
  const isOpen=menu.classList.contains('open');
  menu.classList.toggle('open',!isOpen);
  btn.classList.toggle('open',!isOpen);
}
window.toggleContactMenu=toggleContactMenu;
// ── END MOBILE NAV MENU ───────────────────────────────────────

// ── SUPERTEAM NG MODAL ────────────────────────────────────────
function openSuperteamModal(){
  const m=document.getElementById('m-superteam');
  if(!m)return;
  m.style.display='flex';
  document.body.style.overflow='hidden';
  m.querySelector('div[style*="position:relative"]').style.animation='sIn .25s ease';
}
function closeSuperteamModal(){
  const m=document.getElementById('m-superteam');
  if(!m)return;
  m.style.display='none';
  document.body.style.overflow='';
}
window.openSuperteamModal=openSuperteamModal;
window.closeSuperteamModal=closeSuperteamModal;
// ── END SUPERTEAM NG MODAL ────────────────────────────────────

// ── TESTIMONIALS CAROUSEL ──────────────────────────────────────
const testimonialData=[
  {stars:'★★★★★',body:"I built a full e-commerce site for a client in the UK who found me on Twitter. He locked £800 equivalent in Crypto before I wrote a single line of code. SmartVerify gave me 94%. I got paid in 20 minutes. I've never felt that safe on a remote job.",name:'Chidera Umeh',role:'Full-stack Developer · Lagos',av:'CU',bg:'rgba(45,212,160,.15)',color:'var(--green)'},
  {stars:'★★★★★',body:'I hired 3 designers in 6 months before Trustana. Two of them ghosted after taking upfront. On Trustana, I locked ₦120,000 for a brand kit. The designer delivered in 4 days, AI verified it, and the funds went to her automatically. No drama.',name:'Tunde Afolabi',role:'Startup Founder · Abuja',av:'TA',bg:'rgba(245,166,35,.15)',color:'var(--amber)'},
  {stars:'★★★★☆',body:'The milestone feature is a game changer. I split a ₦350,000 React project into 3 milestones. Client released each one as I delivered. When they raised a dispute on milestone 3, the AI sided with me — I had the GitHub commits and demo link. Got paid in full.',name:'Adaeze Nwosu',role:'React Developer · Port Harcourt',av:'AN',bg:'rgba(91,139,245,.15)',color:'var(--blue)'},
  {stars:'★★★★★',body:'My client kept saying "let me pay after I check it properly" — that\'s how I\'ve lost money before. This time we locked $150 in USDC. I delivered the landing page, SmartVerify scored it 91%, and the WhatsApp alert hit my phone the second it released. Instant.',name:'Fisayo Ogunleye',role:'UI/UX Designer · Ibadan',av:'FO',bg:'rgba(168,85,247,.15)',color:'var(--purple)'},
  {stars:'★★★★★',body:"I've been freelancing for 5 years and this is the first platform that actually protects the client too, not just the freelancer. I locked ₦480,000 for a mobile app rebuild. Watching the escrow status update in real time gave me way more confidence than any invoice ever did.",name:'Kemi Eze',role:'Product Manager · Lagos',av:'KE',bg:'rgba(255,90,90,.15)',color:'var(--red)'},
  {stars:'★★★★☆',body:'A client tried to claim my logo design "wasn\'t what we agreed on" after approving the brief himself. I hit dispute, uploaded my Figma revision history and our chat log. Arbitration froze the funds, reviewed both sides, and ruled in my favor within a day.',name:'Bolaji Okafor',role:'Graphic Designer · Enugu',av:'BO',bg:'rgba(45,212,160,.15)',color:'var(--green)'},
  {stars:'★★★★★',body:'Getting paid in Naira without losing money to conversion fees was the deciding factor for me. My client paid through Paystack, I got my payout the same day the milestone was approved. No more waiting a week for a bank transfer to clear.',name:'Ngozi Ibe',role:'Content Writer · Owerri',av:'NI',bg:'rgba(245,166,35,.15)',color:'var(--amber)'}
];

function openTestimonialModal(i){
  const t=testimonialData[i];
  if(!t)return;
  document.getElementById('tm-stars').textContent=t.stars;
  document.getElementById('tm-body').textContent=t.body;
  document.getElementById('tm-name').textContent=t.name;
  document.getElementById('tm-role').textContent=t.role;
  const av=document.getElementById('tm-av');
  av.textContent=t.av;
  av.style.background=t.bg;
  av.style.color=t.color;
  openModal('m-testimonial');
}
window.openTestimonialModal=openTestimonialModal;

function testimonialScroll(dir){
  const vp=document.getElementById('testViewport');
  if(!vp)return;
  const slide=vp.querySelector('.test-slide');
  const step=slide?slide.getBoundingClientRect().width+20:300;
  vp.scrollBy({left:dir*step,behavior:'smooth'});
}
window.testimonialScroll=testimonialScroll;

function initTestimonialDots(){
  const vp=document.getElementById('testViewport');
  const dotsWrap=document.getElementById('testDots');
  if(!vp||!dotsWrap)return;
  const slides=vp.querySelectorAll('.test-slide');
  const getPerView=()=>{
    const w=window.innerWidth;
    if(w<720)return 1;
    if(w<960)return 2;
    return 3;
  };
  function build(){
    const perView=getPerView();
    const pages=Math.max(1,Math.ceil(slides.length/perView));
    dotsWrap.innerHTML='';
    for(let p=0;p<pages;p++){
      const d=document.createElement('button');
      d.className='test-dot'+(p===0?' act':'');
      d.setAttribute('aria-label','Go to testimonial page '+(p+1));
      d.onclick=()=>{
        const target=slides[p*perView];
        if(target)vp.scrollTo({left:target.offsetLeft,behavior:'smooth'});
      };
      dotsWrap.appendChild(d);
    }
  }
  build();
  let resizeT;
  window.addEventListener('resize',()=>{clearTimeout(resizeT);resizeT=setTimeout(build,200)});

  let scrollT;
  vp.addEventListener('scroll',()=>{
    clearTimeout(scrollT);
    scrollT=setTimeout(()=>{
      const perView=getPerView();
      const dots=dotsWrap.querySelectorAll('.test-dot');
      let closestIdx=0,closestDist=Infinity;
      slides.forEach((s,idx)=>{
        const dist=Math.abs(s.offsetLeft-vp.scrollLeft);
        if(dist<closestDist){closestDist=dist;closestIdx=idx}
      });
      const page=Math.round(closestIdx/perView);
      dots.forEach((d,i)=>d.classList.toggle('act',i===page));
    },100);
  });
}
function initTestimonialAutoSlide(){
  const vp=document.getElementById('testViewport');
  if(!vp)return;
  const AUTO_DELAY=2000;
  let timer=null;
  function next(){
    const maxScroll=vp.scrollWidth-vp.clientWidth;
    if(vp.scrollLeft>=maxScroll-4){
      vp.scrollTo({left:0,behavior:'smooth'});
    }else{
      testimonialScroll(1);
    }
  }
  function start(){
    stop();
    timer=setInterval(next,AUTO_DELAY);
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null}
  }
  function pauseThenResume(){
    stop();
    setTimeout(start,AUTO_DELAY);
  }
  vp.addEventListener('mouseenter',stop);
  vp.addEventListener('mouseleave',start);
  vp.addEventListener('touchstart',stop,{passive:true});
  vp.addEventListener('touchend',pauseThenResume,{passive:true});
  vp.addEventListener('wheel',pauseThenResume,{passive:true});
  const prevBtn=document.querySelector('.test-arrow-prev');
  const nextBtn=document.querySelector('.test-arrow-next');
  if(prevBtn)prevBtn.addEventListener('click',pauseThenResume);
  if(nextBtn)nextBtn.addEventListener('click',pauseThenResume);
  const dotsWrap=document.getElementById('testDots');
  if(dotsWrap)dotsWrap.addEventListener('click',pauseThenResume);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop();else start();
  });
  start();
}
function initTestimonialsAll(){
  initTestimonialDots();
  initTestimonialAutoSlide();
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initTestimonialsAll);
}else{
  initTestimonialsAll();
}
// ── END TESTIMONIALS CAROUSEL ──────────────────────────────────
