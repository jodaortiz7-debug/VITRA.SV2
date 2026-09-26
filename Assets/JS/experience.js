/* Purposeful motion: chapter navigation, masked typography and scroll response. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.vitraMotion;
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('#navigation');
  root.classList.add('experience-ready');

  // One moving indicator connects the current page with the hovered destination.
  const indicator = document.createElement('span');
  indicator.className = 'nav-indicator'; indicator.setAttribute('aria-hidden','true');
  nav?.append(indicator);
  const positionIndicator = link => {
    if (!link || innerWidth < 761) return;
    const rect=link.getBoundingClientRect(), parent=nav.getBoundingClientRect();
    indicator.style.width=rect.width+24+'px';
    indicator.style.height=rect.height+'px';
    indicator.style.transform=`translate3d(${rect.left-parent.left-12}px,${rect.top-parent.top}px,0)`;
  };
  const resetIndicator=()=>positionIndicator(nav?.querySelector('[aria-current="page"]'));
  nav?.querySelectorAll('a').forEach(link=>{
    link.addEventListener('pointerenter',()=>positionIndicator(link));
    link.addEventListener('focus',()=>positionIndicator(link));
  });
  nav?.addEventListener('pointerleave',resetIndicator);
  nav?.addEventListener('focusout',()=>setTimeout(resetIndicator,0));
  requestAnimationFrame(resetIndicator);
  document.fonts?.ready.then(resetIndicator);

  // Preserve heading semantics and emphasis while moving individual words.
  const titles=[...document.querySelectorAll('h1, .section-heading h2, .story-split h2, .about-intro h2, .strategy-grid h2, .next-inner h2, .detail-copy h2')];
  titles.forEach(title=>{
    let number=0;
    const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    // Text remains in the accessibility tree; only decorative wrappers are added.
    nodes.forEach(node=>{
      const fragment=document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word=>{
        if(!word.trim()){fragment.append(document.createTextNode(word));return;}
        const mask=document.createElement('span'),inner=document.createElement('span');
        mask.className='word-mask';inner.className='word-inner';inner.textContent=word;
        inner.style.setProperty('--word',Math.min(number++,9));mask.append(inner);fragment.append(mask);
      });node.replaceWith(fragment);
    });
    title.classList.add('word-title');
  });
  let titleObserver;
  const startTitles=()=>{
    if(reduced.matches || !('IntersectionObserver' in window)){titles.forEach(t=>t.classList.add('is-written'));return;}
    if(titleObserver)return;
    titleObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-written');titleObserver.unobserve(entry.target);}
    }),{threshold:.15,rootMargin:'0px 0px -20px 0px'});
    titles.forEach(t=>titleObserver.observe(t));
  };
  document.addEventListener('vitra:ready',startTitles,{once:true});
  if(document.body.classList.contains('motion-started'))startTitles();
  // Independently recover visibility if another enhancement fails.
  setTimeout(startTitles,1800);

  const progress=document.createElement('span');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');header?.append(progress);
  const scenes=[...document.querySelectorAll('.hero-visual, .detail-visual, .identity-card, .film-frame')];
  scenes.forEach(scene=>scene.classList.add('scroll-scene'));
  const tabs=document.querySelector('.product-tabs');
  const chapters=[...document.querySelectorAll('.product-detail')];
  const resize=()=>{
    resetIndicator();
    if(tabs)root.style.scrollPaddingTop=(header.offsetHeight+tabs.offsetHeight+22)+'px';
    requestTick();
  };
  let frame=0;
  function requestTick(){if(!frame)frame=requestAnimationFrame(updateScroll);}
  function updateScroll(){
    frame=0;
    const height=innerHeight,range=root.scrollHeight-height;
    progress.style.transform=`scaleX(${range>0?Math.min(1,scrollY/range):0})`;
    scenes.forEach(scene=>{
      const rect=scene.getBoundingClientRect();
      if(rect.bottom<0||rect.top>height)return;
      const value=reduced.matches?0:Math.max(-1,Math.min(1,(height/2-(rect.top+rect.height/2))/(height*.75)));
      scene.style.setProperty('--scroll-shift',`${value*22}px`);
      scene.style.setProperty('--scene-progress',((value+1)/2).toFixed(3));
    });
    if(tabs){
      const line=header.offsetHeight+tabs.offsetHeight+90;
      let current=chapters[0]?.id;
      chapters.forEach(section=>{if(section.getBoundingClientRect().top<=line)current=section.id;});
      tabs.querySelectorAll('a').forEach(a=>{if(a.hash==='#'+current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    }
  }
  window.addEventListener('scroll',requestTick,{passive:true});window.addEventListener('resize',resize);resize();

  // Small depth and a traveling highlight, limited to precise pointers.
  document.querySelectorAll('.product-image,.portrait-button,.hero-visual').forEach(surface=>{
    surface.classList.add('depth-surface');let pointerFrame=0;
    surface.addEventListener('pointermove',event=>{
      if(!fine.matches||reduced.matches)return;
      const rect=surface.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
      cancelAnimationFrame(pointerFrame);pointerFrame=requestAnimationFrame(()=>{
        surface.style.setProperty('--tilt-x',`${(0.5-y)*6}deg`);surface.style.setProperty('--tilt-y',`${(x-0.5)*7}deg`);
        surface.style.setProperty('--shine-x',`${x*100}%`);surface.style.setProperty('--shine-y',`${y*100}%`);
        surface.classList.add('is-pointed');
      });
    });
    surface.addEventListener('pointerleave',()=>{cancelAnimationFrame(pointerFrame);surface.classList.remove('is-pointed');surface.style.setProperty('--tilt-x','0deg');surface.style.setProperty('--tilt-y','0deg');});
  });
  document.querySelectorAll('.button,.nav-contact,.next-arrow').forEach(button=>{
    let raf=0;
    button.addEventListener('pointermove',event=>{
      if(!fine.matches||reduced.matches)return;
      const r=button.getBoundingClientRect();const x=(event.clientX-r.left-r.width/2)*.1,y=(event.clientY-r.top-r.height/2)*.16;
      cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{button.style.translate=`${Math.max(-7,Math.min(7,x))}px ${Math.max(-5,Math.min(5,y))}px`;});
    });
    button.addEventListener('pointerleave',()=>{cancelAnimationFrame(raf);button.style.translate='0 0';});
    button.addEventListener('blur',()=>{button.style.translate='0 0';});
  });

  // Native details stay usable without JavaScript; animate both directions.
  document.querySelectorAll('.faq-list details').forEach(details=>{
    let animation=null;let wanted=details.open;
    details.querySelector('summary').addEventListener('click',event=>{
      if(reduced.matches)return;
      event.preventDefault();wanted=!wanted;
      const start=details.getBoundingClientRect().height;
      animation?.cancel();details.style.height='';details.open=true;
      const full=details.getBoundingClientRect().height;
      details.open=false;const closed=details.getBoundingClientRect().height;details.open=true;
      details.style.overflow='hidden';
      animation=details.animate([{height:start+'px'},{height:(wanted?full:closed)+'px'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
      animation.onfinish=()=>{details.open=wanted;details.style.overflow='';animation=null;};
    });
  });
  reduced.addEventListener('change',()=>{
    if(reduced.matches){titles.forEach(t=>t.classList.add('is-written'));document.querySelectorAll('.depth-surface').forEach(s=>s.classList.remove('is-pointed'));document.querySelectorAll('.button,.nav-contact,.next-arrow').forEach(b=>b.style.translate='0 0');}
    requestTick();
  });
})();

(() => {
  const motion = window.vitraMotion;
  const update = () => {
    document.querySelectorAll('[data-motion-toggle]').forEach(button => {
      const label = motion.matches ? 'Activar animaciones' : 'Reducir animaciones';
      button.setAttribute('aria-label', label);
      button.title = label;
      button.setAttribute('aria-pressed', String(!motion.matches));
      if (button.matches('.motion-text-toggle')) button.textContent = label;
    });
    document.querySelectorAll('[data-motion-status]').forEach(el => el.textContent = motion.matches ? 'Movimiento reducido' : 'Animaciones activas');
  };
  document.querySelectorAll('[data-motion-toggle]').forEach(button => button.addEventListener('click', () => {
    motion.set(motion.matches ? 'full' : 'reduce');
    update();
    if (!motion.matches) {
      // Replay the brand transition to confirm activation immediately.
      const root = document.documentElement;
      root.classList.add('motion-boot');
      root.classList.remove('motion-uncover');
      setTimeout(() => root.classList.add('motion-uncover'), 350);
      setTimeout(() => root.classList.remove('motion-boot', 'motion-uncover'), 1500);
    }
  }));
  motion.addEventListener('change', update);
  update();
})();
