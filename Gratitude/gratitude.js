const form = document.getElementById('gratitudeForm');
    const entriesList = document.getElementById('entriesList');
    const emptyState = document.getElementById('emptyState');
    const streakEl = document.getElementById('streak');
    const quoteEl = document.getElementById('quote');

    const LS_KEY = 'gratitude_entries_v1';

    function uid(){return Math.random().toString(36).slice(2,9)}

    function load(){
      const raw = localStorage.getItem(LS_KEY);
      try{
        return raw? JSON.parse(raw) : []
      }catch(e){return []}
    }

    function saveAll(entries){localStorage.setItem(LS_KEY, JSON.stringify(entries))}

    function render(){
      const entries = load();
      entriesList.innerHTML='';
      if(entries.length===0){emptyState.style.display='block'} else {emptyState.style.display='none'}
      entries.slice().reverse().forEach(e=>{
        const el = document.createElement('div'); el.className='entry fade-in';
        el.innerHTML = `<div style="flex:1"><div class=meta><span class=pill>${new Date(e.created).toLocaleString()}</span> ${e.mood?('<span class=pill>'+e.mood+'</span>') : ''} ${e.timeSpent?('<span class=pill>'+e.timeSpent+'m</span>'):''}</div><div class=text>${escapeHtml(e.text)}</div></div><div class=controls><button class=ghost data-id="${e.id}" data-action="delete">Delete</button></div>`;
        entriesList.appendChild(el);
      })
      updateStreak();
    }

    function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const text = document.getElementById('gratefulFor').value.trim();
      if(!text) return;
      const mood = document.getElementById('mood').value.trim();
      const timeSpent = document.getElementById('timeSpent').value.trim();
      const entries = load();
      entries.push({id:uid(), text, mood, timeSpent, created: new Date().toISOString()});
      saveAll(entries);
      form.reset();
      render();
    })

    document.getElementById('quickBtn').addEventListener('click', ()=>{
      const examples = [
        'A warm cup of tea this morning',
        'My friend checking in on me',
        'Finishing a tricky exercise',
        'A comfortable place to sleep',
        'The sound of rain on the roof'
      ];
      const text = examples[Math.floor(Math.random()*examples.length)];
      document.getElementById('gratefulFor').value = text;
      document.getElementById('mood').value = 'content';
      document.getElementById('timeSpent').value = '3';
    })

    entriesList.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('button');
      if(!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if(action==='delete'){
        let entries = load();
        entries = entries.filter(e=>e.id!==id);
        saveAll(entries);
        render();
      }
    })

    document.getElementById('clearBtn').addEventListener('click', ()=>{
      if(confirm('Clear all saved gratitude entries?')){ localStorage.removeItem(LS_KEY); render() }
    })

    document.getElementById('exportBtn').addEventListener('click', ()=>{
      const entries = load();
      if(entries.length===0){alert('No entries to export');return}
      const content = entries.map(e=>`${new Date(e.created).toLocaleString()}\n${e.text}\nMood: ${e.mood|| '-'} | Minutes: ${e.timeSpent|| '-'}\n---`).join('\n');
      const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='gratitude_entries.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    })

    // simple streak calculation: consecutive days with at least one entry
    function updateStreak(){
      const entries = load();
      if(entries.length===0){streakEl.textContent='0';return}
      // build set of dates (yyyy-mm-dd)
      const days = new Set(entries.map(e=>e.created.slice(0,10)));
      // start from today and count backwards
      let count = 0; const today = new Date();
      for(let i=0;;i++){
        const d = new Date(today); d.setDate(today.getDate()-i);
        const key = d.toISOString().slice(0,10);
        if(days.has(key)) count++; else break;
      }
      streakEl.textContent = ''+count;
    }

    // breathing guide (1 minute) simple text guidance
    document.getElementById('breatheBtn').addEventListener('click', ()=>{
      const guide = document.getElementById('breathGuide');
      let step = 0; const steps = ['Breathe in (4s)','Hold (4s)','Breathe out (6s)'];
      guide.textContent = steps[0];
      const interval = setInterval(()=>{
        step++;
        if(step<steps.length) guide.textContent = steps[step]; else { clearInterval(interval); guide.textContent='Done — feel the calm'; setTimeout(()=>guide.textContent='Ready',1500)}
      }, 4000);
    })

    // daily rotating quote from tiny list
    const quotes = [
      'Gratitude turns what we have into enough. — Anonymous',
      'When you are grateful, fear disappears and abundance appears. — Tony Robbins',
      'Gratitude is the fairest blossom which springs from the soul. — Henry Ward Beecher',
      'Cultivate the habit of being grateful for every good thing that comes to you. — Ralph Waldo Emerson'
    ];
    (function pickQuote(){
      const idx = new Date().getDate() % quotes.length; quoteEl.textContent = quotes[idx];
    })();

    // init
    render();