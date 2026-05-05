let playbackSpeed = 1;
const speedControl = document.getElementById("speedControl");
const speedLabel = document.getElementById("speedLabel");

speedControl.oninput = () => {
  playbackSpeed = parseFloat(speedControl.value);
  speedLabel.textContent = "Speed: " + playbackSpeed.toFixed(1) + "x";
};

let audioCtx = null;
const audioBuffers = {};
const heldFrets = {};
let barreFret = null;
let currentChord = null;
let pointerDown = false;
const touchedStrings = new Set();
const audios = {};



function preloadSound(key){
  if(!audios[key]){
    audios[key] = new Audio(`sounds/${key}.mp3`);
  }
}



function playSound(key){
  preloadSound(key);
  const audio = audios[key];
  if(!audio) return;
  audio.currentTime = 0;
  audio.play().catch(()=>{});
}



/* BARRE */
const barreColumn = document.getElementById("barreColumn");

for(let f=1; f<=6; f++){
  const b = document.createElement("div");
  b.className = "barre";
  b.dataset.fret = f;
  b.textContent = f;

  b.addEventListener("pointerdown", () => {
    barreFret = f;
    updateBarreUI();
  });

  b.addEventListener("pointermove", e => {
    if(e.pressure === 0) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if(!el || !el.classList.contains("barre")) return;

    const newF = +el.dataset.fret;
    if(barreFret === newF) return;

    barreFret = newF;
    updateBarreUI();
  });

  b.addEventListener("pointerup", releaseBarre);
  b.addEventListener("pointerleave", releaseBarre);
  b.addEventListener("pointercancel", releaseBarre);

  barreColumn.appendChild(b);
}

function updateBarreUI(){
  document.querySelectorAll(".barre").forEach(b => b.classList.remove("active"));
  if(barreFret){
    document.querySelector(`.barre[data-fret="${barreFret}"]`)
      ?.classList.add("active");
  }
}


function releaseBarre(){
  barreFret = null;
  updateBarreUI();
}


/* STRINGS */
const box = document.getElementById("box");

for(let s=6; s>=1; s--){
  const stringEl = document.createElement("div");
  stringEl.className = "string";
  stringEl.dataset.string = s;

  for(let f=1; f<=6; f++){
    const fret = document.createElement("div");
    fret.className = "fret";
    fret.textContent = f;
    fret.dataset.string = s;
    fret.dataset.fret = f;

    fret.addEventListener("pointerdown", e => {
      e.stopPropagation();

      heldFrets[s] = f;
      clearFrets(s);
      fret.classList.add("active");

      playNote(s, f);
    });

    fret.addEventListener("pointermove", e => {
      if(e.pressure === 0) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      if(!el || !el.classList.contains("fret")) return;
      if(el.dataset.string !== String(s)) return;

      const newF = +el.dataset.fret;
      if(heldFrets[s] === newF) return;

      heldFrets[s] = newF;
      clearFrets(s);
      el.classList.add("active");

      playNote(s, newF);
    });

    const release = () => {
      delete heldFrets[s];
      clearFrets(s);
    };

    fret.addEventListener("pointerup", release);
    fret.addEventListener("pointerleave", release);
    fret.addEventListener("pointercancel", release);

    stringEl.appendChild(fret);
  }

  const strum = document.createElement("div");
  strum.className = "strum";
  strum.dataset.string = s;

  stringEl.appendChild(strum);
  box.appendChild(stringEl);
}

/* HELPERS */
function clearFrets(s){
  document.querySelectorAll(`.fret[data-string="${s}"]`)
    .forEach(el => el.classList.remove("active"));
}



/* PLAY */
function playNote(s,f){
  const key = f ? `${s}-${f}` : String(s);

  playSound(key);

  const stringEl = document.querySelector(`.string[data-string="${s}"]`);

  if(stringEl){
    stringEl.classList.add("active-string");
    setTimeout(() => stringEl.classList.remove("active-string"), 150);

    stringEl.classList.add("vibrate");
    setTimeout(() => stringEl.classList.remove("vibrate"), 150);
  }

  if(f){
    const fretEl = document.querySelector(
      `.fret[data-string="${s}"][data-fret="${f}"]`
    );

    if(fretEl){
      fretEl.classList.add("active");

      setTimeout(() => {
        if(!heldFrets[s]) fretEl.classList.remove("active");
      }, 150);
    }
  }
}



function playString(s){
  let f = null;

  if(barreFret) f = barreFret;
  else if(heldFrets[s] != null) f = heldFrets[s];
  else if(currentChord && chords[currentChord]?.[s]) f = chords[currentChord][s];

  playNote(s, f);
}



/* SWIPE */
function handleStrum(e){
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if(!el) return;

  const stringEl = el.closest(".string");
  if(!stringEl) return;

  const s = stringEl.dataset.string;

  const key = `s-${s}`;
  if(touchedStrings.has(key)) return;

  touchedStrings.add(key);
  playString(s);
}



document.addEventListener("pointerdown", e => {
  pointerDown = true;
  touchedStrings.clear();
  handleStrum(e);
});

document.addEventListener("pointermove", e => {
  if(pointerDown){
    e.preventDefault();
    handleStrum(e);
  }
}, {passive:false});

document.addEventListener("pointerup", () => {
  pointerDown = false;
  touchedStrings.clear();
});

/* CHORDS */
const chords = {
  "Am":{2:1,3:2,4:2},
  "Em":{5:2,4:2},
  "C":{2:1,4:2,5:3},
  "G":{1:3,6:3,5:2},
  "Dm":{1:1,2:3,3:2},
  "E":{3:1,4:2,5:2},
  "A":{2:2,3:2,4:2},
  "D":{1:2,2:3,3:2}
};

const buttons = document.querySelectorAll(".chords button");

buttons.forEach(btn => {
  btn.addEventListener("pointerdown", () => {
    const name = btn.dataset.chord;

    if(currentChord === name){
      currentChord = null;
      btn.classList.remove("active");
      document.querySelectorAll(".fret")
        .forEach(f => f.classList.remove("chord-active"));
      return;
    }

    buttons.forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".fret")
      .forEach(f => f.classList.remove("chord-active"));

    currentChord = name;
    btn.classList.add("active");

    for(let s in chords[name]){
      const f = chords[name][s];
      const el = document.querySelector(
        `.fret[data-string="${s}"][data-fret="${f}"]`
      );
      el?.classList.add("chord-active");
    }
  });
});

/* MELODY */
document.getElementById("playBtn").onclick = () => {
  const text = document.getElementById("melodyInput").value.trim();
  if(!text) return;

  buttons.forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".fret")
    .forEach(f => f.classList.remove("chord-active","active"));

  currentChord = null;
  for(let k in heldFrets) delete heldFrets[k];

  playMelody(text);
};



function strum(s1,s2,sp,ch){
  let step = s1<=s2?1:-1;

  for(let s=s1,i=0; step>0 ? s<=s2 : s>=s2; s+=step,i++){
    setTimeout(()=>{
      let fret=null;
      if(ch && chords[ch]?.[s]) fret=chords[ch][s];
      playNote(s,fret);
    }, i*sp/playbackSpeed);
  }
}

document.addEventListener("contextmenu", e => e.preventDefault());


function playMelody(text){

  // 🔥 нормализация + гарантируем токены
  const tokens = text
    .replace(/\s+/g, " ")
    .replace(/\s*\+\s*/g, "+")
    .replace(/=/g, " = ")   // 👈 "=" всегда отдельный токен
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let i = 0;

  function step(){
    if(i >= tokens.length) return;

    let t = tokens[i];

    // 🔥 1. ПАУЗЫ (=, ==, ===)
    if(/^=+$/.test(t)){
      const pauses = t.length;

      i++;
      setTimeout(step, (250 * pauses) / playbackSpeed);
      return;
    }

    // 🔥 2. d / u (единственное место где есть "-")
    if(t.startsWith("d") || t.startsWith("u")){
      const dir = t[0];

      const range = t.match(/:(\d+)-(\d+)/);
      const speed = t.match(/@(\d+)/);

      let s1, s2, sp = 80;

      if(range){
        s1 = +range[1];
        s2 = +range[2];
      } else {
        s1 = dir === "d" ? 6 : 1;
        s2 = dir === "d" ? 1 : 6;
      }

      if(speed) sp = +speed[1];

      strum(s1, s2, sp);

      i++;
      setTimeout(step, (sp * Math.abs(s2 - s1) + sp) / playbackSpeed);
      return;
    }

    // 🔥 3. АККОРДЫ (+)
    if(t.includes("+")){
      const parts = t.split("+");

      parts.forEach(part => {
        if(part.includes("/")){
          const [s,f] = part.split("/").map(Number);
          playNote(s,f);
        }
        else if(/^[1-6]$/.test(part)){
          playString(+part);
        }
      });

      i++;
      setTimeout(step, 250 / playbackSpeed);
      return;
    }

    // 🔥 4. последовательность струн (12, 234)
    if(/^[1-6]{2,}$/.test(t)){
      t.split("").map(Number).forEach(playString);

      i++;
      setTimeout(step, 200 / playbackSpeed);
      return;
    }

    // 🔥 5. одиночная нота 6/2
    if(t.includes("/")){
      const [s,f] = t.split("/").map(Number);
      playNote(s,f);
    }

    // 🔥 6. одиночная струна
    else if(/^[1-6]$/.test(t)){
      playString(+t);
    }

    i++;
    setTimeout(step, 250 / playbackSpeed);
  }

  step();
}