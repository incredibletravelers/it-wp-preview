/* Incredible Travellers — front-end interactions (no dependencies). */
(function(){
  var cfg=window.IT_SITE||{};
  // Sticky header shadow
  var header=document.querySelector('.header');
  if(header){var onScroll=function(){header.classList.toggle('is-scrolled',window.scrollY>10)};window.addEventListener('scroll',onScroll,{passive:true});onScroll();}

  // Mega / dropdown menus: hover + focus are CSS; on touch, first tap opens, second tap follows the link
  document.querySelectorAll('.has-mega > .nav__link, .has-drop > .nav__link').forEach(function(a){
    a.addEventListener('click',function(e){
      var li=a.parentElement;
      if(window.matchMedia('(hover: none)').matches && !li.classList.contains('open')){
        e.preventDefault();
        document.querySelectorAll('.nav__item.open').forEach(function(o){o.classList.remove('open')});
        li.classList.add('open');a.setAttribute('aria-expanded','true');
      }
    });
  });
  document.addEventListener('click',function(e){
    document.querySelectorAll('.nav__item.open').forEach(function(li){if(!li.contains(e.target)){li.classList.remove('open');li.firstElementChild.setAttribute('aria-expanded','false')}});
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){document.querySelectorAll('.nav__item.open').forEach(function(li){li.classList.remove('open')});if(drawer&&drawer.classList.contains('open'))setDrawer(false);}
  });

  // Mobile drawer
  var drawer=document.getElementById('drawer'),burger=document.querySelector('.burger');
  function setDrawer(o){if(!drawer)return;drawer.classList.toggle('open',o);drawer.setAttribute('aria-hidden',!o);if(burger)burger.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':''}
  if(drawer&&burger){
    burger.addEventListener('click',function(){setDrawer(true)});
    drawer.querySelector('.drawer__close').addEventListener('click',function(){setDrawer(false)});
    drawer.addEventListener('click',function(e){if(e.target===drawer)setDrawer(false)});
    drawer.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setDrawer(false)})});
  }

  // Toast
  var toast=document.querySelector('.toast'),tt;
  function say(msg){if(!toast)return;toast.textContent=msg;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show')},3800)}
  window.itSay=say;

  // Eligibility pill → Eligibility Check page, pre-filled via query string
  var elig=document.getElementById('hero-form');
  if(elig){elig.addEventListener('submit',function(e){
    e.preventDefault();var f=e.target;
    var url=(cfg.eligibilityUrl||'/eligibility-check/')+'?type='+encodeURIComponent(f.elements['type'].value)+'&country='+encodeURIComponent(f.elements['country'].value);
    window.location.href=url;
  });}

  // Static preview: forms cannot be submitted, explain instead
  if(document.documentElement.hasAttribute('data-static-preview')){
    window.addEventListener('submit',function(e){
      var f=e.target;if(f&&f.id==='hero-form')return;
      e.preventDefault();e.stopImmediatePropagation();
      say('Preview only: on the live site this request goes straight to your team.');
    },true);
  }

  // Review carousel
  document.querySelectorAll('.carousel').forEach(function(c){
    var track=c.querySelector('.car-track');if(!track)return;
    var step=function(){var card=track.querySelector('.review');return card?card.getBoundingClientRect().width+24:300};
    var prev=c.querySelector('.car-btn--prev'),next=c.querySelector('.car-btn--next');
    if(prev)prev.addEventListener('click',function(){track.scrollBy({left:-step()})});
    if(next)next.addEventListener('click',function(){
      if(track.scrollLeft+track.clientWidth>=track.scrollWidth-4)track.scrollTo({left:0});else track.scrollBy({left:step()});
    });
  });

  // Only one FAQ open at a time
  var faqs=document.querySelectorAll('details.faq');
  faqs.forEach(function(d){d.addEventListener('toggle',function(){if(d.open)faqs.forEach(function(o){if(o!==d)o.open=false})})});

  // Scroll reveal (subtle)
  var els=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    els.forEach(function(el,i){el.style.transitionDelay=((i%3)*80)+'ms';io.observe(el)});
  } else els.forEach(function(el){el.classList.add('in')});
})();
