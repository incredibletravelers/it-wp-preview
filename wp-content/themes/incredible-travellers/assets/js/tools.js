/* Points calculator, eligibility wizard, booking UI. */
(function(){
  var cfg = window.IT_TOOLS || {};
  var staticPreview = document.documentElement.hasAttribute('data-static-preview');

  function qs(s, el){ return (el||document).querySelector(s); }
  function qsa(s, el){ return Array.prototype.slice.call((el||document).querySelectorAll(s)); }
  function say(msg){ if (window.itSay) window.itSay(msg); }

  /* ---------------- CRS-lite (indicative) ---------------- */
  var CRS = {
    age: {
      solo: {18:99,19:105,20:110,21:110,22:110,23:110,24:110,25:110,26:110,27:110,28:110,29:110,30:105,31:99,32:94,33:88,34:83,35:77,36:72,37:66,38:61,39:55,40:50,41:39,42:28,43:17,44:6},
      with: {18:90,19:95,20:100,21:100,22:100,23:100,24:100,25:100,26:100,27:100,28:100,29:100,30:95,31:90,32:85,33:80,34:75,35:70,36:65,37:60,38:55,39:50,40:45,41:35,42:25,43:15,44:5}
    },
    edu: { secondary: [30,28], one_year: [90,84], two_year: [98,91], bachelor: [120,112], two_or_more: [128,119], master: [135,126], phd: [150,140] },
    lang: { 4:[6,6], 5:[6,6], 6:[9,8], 7:[17,16], 8:[23,22], 9:[31,29], 10:[34,32] }, // per ability approx; we treat as overall CLB * 4 / simplified
    // Use official per-ability * 4 for a single overall CLB (all four abilities at that level).
    langTotal: function(clb, withSpouse){
      var map = {4:6,5:6,6:9,7:16,8:22,9:29,10:32};
      var each = map[clb] || 0;
      // with spouse slightly lower at some bands; keep simple official without-spouse table * 4, then note
      if (withSpouse){
        var w = {4:6,5:6,6:8,7:16,8:22,9:29,10:32};
        each = w[clb] || 0;
      }
      return each * 4;
    },
    canWork: {0:0,1:40,2:46,3:56,4:63,5:70}
  };

  function crsAge(age, withSpouse){
    if (age < 18 || age >= 45) return 0;
    var t = withSpouse ? CRS.age.with : CRS.age.solo;
    return t[age] || 0;
  }

  function calcCanada(f){
    var withS = f.spouse === 'yes';
    var age = parseInt(f.age,10) || 0;
    var edu = (CRS.edu[f.education] || [0,0])[withS?1:0];
    var clb = parseInt(f.language,10) || 0;
    var lang = CRS.langTotal(clb, withS);
    var workKey = Math.min(5, parseInt(f.can_work,10) || 0);
    var work = CRS.canWork[workKey] || 0;
    if (withS) {
      // Canadian work with spouse is slightly lower in the official table
      var w = {0:0,1:35,2:40,3:50,4:55,5:60};
      work = w[workKey] || 0;
    }
    var extra = 0;
    var bits = [];
    if (f.sibling === 'yes'){ extra += 15; bits.push(['Sibling in Canada', 15]); }
    if (f.can_edu === 'one'){ extra += 15; bits.push(['Canadian education (1–2 years)', 15]); }
    if (f.can_edu === 'three'){ extra += 30; bits.push(['Canadian education (3+ years)', 30]); }
    if (f.pnp === 'yes'){ extra += 600; bits.push(['Provincial nomination', 600]); }
    var rows = [
      ['Age', crsAge(age, withS)],
      ['Education', edu],
      ['Official language (all abilities at this CLB)', lang],
      ['Canadian work experience', work]
    ].concat(bits);
    var total = rows.reduce(function(s,r){return s+r[1];},0);
    return { total: total, rows: rows, cap: 1200, label: 'Indicative CRS-lite score' };
  }

  var AUS = {
    age: function(a){
      if (a>=18&&a<=24) return 25;
      if (a>=25&&a<=32) return 30;
      if (a>=33&&a<=39) return 25;
      if (a>=40&&a<=44) return 15;
      return 0;
    },
    english: { competent:0, proficient:10, superior:20 },
    overseas: {0:0,1:0,2:0,3:5,5:10,8:15},
    auswork: {0:0,1:5,3:10,5:15,8:20},
    edu: { diploma:10, bachelor:15, master:15, phd:20 }
  };
  function bandYears(map, y){
    var keys = Object.keys(map).map(Number).sort(function(a,b){return a-b;});
    var v = 0;
    keys.forEach(function(k){ if (y>=k) v=map[k]; });
    return v;
  }
  function calcAustralia(f){
    var age = parseInt(f.age,10)||0;
    var rows = [
      ['Age', AUS.age(age)],
      ['English', AUS.english[f.english]||0],
      ['Skilled employment outside Australia', bandYears(AUS.overseas, parseInt(f.os_work,10)||0)],
      ['Skilled employment in Australia', bandYears(AUS.auswork, parseInt(f.au_work,10)||0)],
      ['Education', AUS.edu[f.education]||0]
    ];
    if (f.au_study==='yes'){ rows.push(['Australian study requirement', 5]); }
    if (f.partner==='yes'){ rows.push(['Partner skills (if eligible)', 5]); }
    var total = rows.reduce(function(s,r){return s+r[1];},0);
    return { total:total, rows:rows, cap: 100, label:'Indicative points (skilled, GSM-style)' };
  }

  function renderResult(el, res){
    if (!el) return;
    var rows = res.rows.map(function(r){
      return '<li><span>'+r[0]+'</span><strong>'+r[1]+'</strong></li>';
    }).join('');
    el.innerHTML = '<p class="tool-result__score">'+res.total+' <small>'+res.label+(res.cap?' (scale to '+res.cap+')':'')+'</small></p>'
      +'<ul class="tool-breakdown">'+rows+'</ul>'
      +'<p class="indicative"><strong>Indicative only.</strong> This is a simplified, unofficial estimate based on publicly known factors. It is not an assessment by IRCC or the Australian Department of Home Affairs, and it is not a visa decision. A counsellor will reconfirm the current official rules with you.</p>';
  }

  function bindCalc(root){
    if (!root) return;
    qsa('[data-calc-tabs] .tool-tab', root).forEach(function(btn){
      btn.addEventListener('click', function(){
        qsa('[data-calc-tabs] .tool-tab', root).forEach(function(b){ b.setAttribute('aria-selected', b===btn?'true':'false'); b.classList.toggle('is-on', b===btn); });
        qsa('[data-calc-panel]', root).forEach(function(p){ p.hidden = p.getAttribute('data-calc-panel') !== btn.getAttribute('data-calc-target'); });
      });
    });
    qsa('form[data-calc]', root).forEach(function(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var data = {};
        Array.prototype.forEach.call(form.elements, function(el){
          if (el.name) data[el.name]=el.value;
        });
        var res = form.getAttribute('data-calc')==='australia' ? calcAustralia(data) : calcCanada(data);
        renderResult(qs('[data-calc-result="'+form.getAttribute('data-calc')+'"]', root), res);
      });
    });
  }

  /* ---------------- Eligibility wizard ---------------- */
  function bindElig(root){
    if (!root) return;
    var steps = qsa('.elig-step', root);
    var bars = qsa('.elig-progress span', root);
    var i = 0;
    function show(n){
      i = Math.max(0, Math.min(steps.length-1, n));
      steps.forEach(function(s,idx){ s.hidden = idx!==i; });
      bars.forEach(function(b,idx){ b.classList.toggle('is-on', idx<=i); });
    }
    show(0);
    root.addEventListener('click', function(e){
      var t = e.target.closest('[data-elig-next],[data-elig-prev]');
      if (!t) return;
      if (t.hasAttribute('data-elig-prev')) { show(i-1); return; }
      var step = steps[i];
      var required = qsa('[required]', step);
      for (var k=0;k<required.length;k++){
        if (!required[k].value){ required[k].focus(); return; }
      }
      show(i+1);
    });
    var form = qs('form', root);
    if (!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (staticPreview){
        say('Preview only: on the live site this enquiry goes straight to your team.');
        return;
      }
      var fd = new FormData(form);
      var payload = {};
      fd.forEach(function(v,k){ payload[k]=v; });
      var btn = qs('[type=submit]', form);
      if (btn) btn.disabled = true;
      fetch((cfg.rest||'') + 'enquiry', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-WP-Nonce': cfg.nonce||'' },
        body: JSON.stringify(payload)
      }).then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
        .then(function(res){
          if (!res.ok){ throw new Error(res.j && res.j.message ? res.j.message : 'Could not send'); }
          var done = qs('.elig-done', root);
          steps.forEach(function(s){ s.hidden = true; });
          if (done){ done.hidden = false; }
          say('Thank you. We have your enquiry.');
        })
        .catch(function(err){ say(err.message||'Could not send just now. Please WhatsApp or call us.'); if (btn) btn.disabled=false; });
    });
  }

  /* ---------------- Booking ---------------- */
  function ymd(d){
    var m = (d.getMonth()+1), day=d.getDate();
    return d.getFullYear()+'-'+(m<10?'0'+m:m)+'-'+(day<10?'0'+day:day);
  }
  function bindBook(root){
    if (!root) return;
    var date = qs('[name=booking_date]', root);
    var slotBox = qs('.it-slots', root);
    var chosen = qs('[name=booking_slot]', root);
    var form = qs('form', root);
    var success = qs('.it-book__success', root);

    function isSun(val){
      var p = val.split('-').map(Number);
      var d = new Date(p[0], p[1]-1, p[2]);
      return d.getDay()===0;
    }
    function loadSlots(){
      if (!date || !slotBox) return;
      slotBox.innerHTML = '<p class="muted">Loading times…</p>';
      if (!date.value || isSun(date.value)){
        slotBox.innerHTML = '<p class="muted">Please pick a weekday (Monday to Saturday).</p>';
        return;
      }
      if (staticPreview){
        // Show typical slots so the layout can be reviewed; payment is disabled.
        var demo=['10:00','10:15','10:30','10:45','11:00','11:15','11:30','11:45','12:00','12:15','12:30','12:45','14:00','14:15','14:30','14:45','15:00','15:15','15:30','15:45','16:00','16:15','16:30','16:45','17:00','17:15','17:30','17:45'];
        slotBox.innerHTML = demo.map(function(t){ return '<button type="button" class="it-slot" data-slot="'+t+'">'+t+'</button>'; }).join('');
        return;
      }
      var url = (cfg.rest||'')+'slots?date='+encodeURIComponent(date.value);
      fetch(url, { headers:{ 'X-WP-Nonce': cfg.nonce||'' } })
        .then(function(r){ return r.json(); })
        .then(function(j){
          var slots = (j && j.slots) || [];
          if (!slots.length){ slotBox.innerHTML = '<p class="muted">No times left on this date. Please try another weekday.</p>'; return; }
          slotBox.innerHTML = slots.map(function(s){
            var dis = s.available ? '' : ' disabled';
            return '<button type="button" class="it-slot" data-slot="'+s.time+'"'+dis+'>'+s.label+'</button>';
          }).join('');
        })
        .catch(function(){ slotBox.innerHTML = '<p class="muted">Could not load times. Please refresh, or WhatsApp us.</p>'; });
    }
    if (date){
      date.addEventListener('change', function(){ if (chosen) chosen.value=''; loadSlots(); });
      if (date.value) loadSlots();
    }
    if (slotBox){
      slotBox.addEventListener('click', function(e){
        var b = e.target.closest('.it-slot');
        if (!b || b.disabled) return;
        qsa('.it-slot', slotBox).forEach(function(x){ x.classList.toggle('is-on', x===b); });
        if (chosen) chosen.value = b.getAttribute('data-slot')||'';
      });
    }
    if (!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (staticPreview){
        say('Preview only: booking and payment run on the live WordPress site. This static preview cannot take payments or hold a slot.');
        return;
      }
      var payload = {};
      Array.prototype.forEach.call(form.elements, function(el){ if (el.name) payload[el.name]=el.value; });
      if (!payload.booking_date || !payload.booking_slot){ say('Please pick a date and a time slot.'); return; }
      var btn = qs('[type=submit]', form);
      if (btn) btn.disabled = true;
      fetch((cfg.rest||'')+'order', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-WP-Nonce': cfg.nonce||'' },
        body: JSON.stringify(payload)
      }).then(function(r){ return r.json().then(function(j){ return {ok:r.ok, status:r.status, j:j}; }); })
        .then(function(res){
          if (!res.ok){ throw new Error(res.j && res.j.message ? res.j.message : 'Could not start booking'); }
          var j = res.j;
          if (j.mode === 'keys_pending' || j.mode === 'test'){
            return finish({ booking_id:j.booking_id, mode:j.mode, message:j.message });
          }
          if (j.mode === 'razorpay' && window.Razorpay){
            return new Promise(function(resolve, reject){
              var rz = new Razorpay({
                key: j.key_id,
                amount: j.amount,
                currency: j.currency || 'INR',
                name: 'Incredible Travellers',
                description: j.description || '15-minute detailed consultation',
                order_id: j.order_id,
                prefill: { name: payload.name, email: payload.email, contact: payload.phone },
                handler: function(resp){
                  fetch((cfg.rest||'')+'verify', {
                    method:'POST',
                    headers:{ 'Content-Type':'application/json', 'X-WP-Nonce': cfg.nonce||'' },
                    body: JSON.stringify({
                      booking_id: j.booking_id,
                      razorpay_payment_id: resp.razorpay_payment_id,
                      razorpay_order_id: resp.razorpay_order_id,
                      razorpay_signature: resp.razorpay_signature
                    })
                  }).then(function(r){ return r.json().then(function(x){ if(!r.ok) throw new Error(x.message||'Verify failed'); resolve(x); }); })
                    .catch(reject);
                }
              });
              rz.on('payment.failed', function(){ reject(new Error('Payment was not completed.')); });
              rz.open();
            });
          }
          return finish(j);
        })
        .then(function(done){ if (done) finish(done); })
        .catch(function(err){ say(err.message||'Booking could not be completed.'); if (btn) btn.disabled=false; });

      function finish(done){
        form.hidden = true;
        if (success){
          success.hidden = false;
          var msg = qs('[data-book-msg]', success);
          if (msg) msg.textContent = done && done.message ? done.message : 'Your consultation is booked.';
        }
        say('Booking received.');
      }
    });
  }

  bindCalc(qs('#it-points-calc') || qs('[data-tool=points]'));
  bindElig(qs('#it-eligibility') || qs('[data-tool=eligibility]'));
  bindBook(qs('#it-booking') || qs('[data-tool=booking]'));
})();
