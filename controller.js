

let hornAudioCtx = null;
let lastLocalHorn = 0;
function ensureHornAudio(){
  try{
    if(!hornAudioCtx) hornAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(hornAudioCtx.state === "suspended") hornAudioCtx.resume();
  }catch(_){}
}
function playLocalHorn(){
  if(state && state.hornEnabled === false) return;
  ensureHornAudio();
  if(!hornAudioCtx) return;
  const now = hornAudioCtx.currentTime;
  const master = hornAudioCtx.createGain();
  const filter = hornAudioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(760, now);
  filter.Q.setValueAtTime(1.45, now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.65, now + 0.035);
  master.gain.setValueAtTime(0.65, now + 0.90);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.20);
  filter.connect(master);
  master.connect(hornAudioCtx.destination);
  [520, 660, 780, 1040].forEach((freq, i) => {
    const osc = hornAudioCtx.createOscillator();
    const gain = hornAudioCtx.createGain();
    osc.type = i === 3 ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(i === 3 ? 0.08 : 0.18, now);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
    osc.stop(now + 1.22);
  });
}
function maybePlayLocalHorn(){
  if(state.hornAt && state.hornAt !== lastLocalHorn){
    lastLocalHorn = state.hornAt;
    playLocalHorn();
  }
}

let state = loadState();
const startupParams = new URLSearchParams(window.location.search);
const startupMode = startupParams.get("mode");
if(startupMode === "clock" || startupMode === "scoreboard"){
  state.mode = startupMode;
  saveState(state);
}

let lastTick = Date.now();
let lastDisplayedSecond = null;

const $ = id => document.getElementById(id);

function sync(){
  saveState(state);
  render();
}

function tick(){
  const now = Date.now();
  let changed = false;

  // Deadline-based timing: elapsed browser/rendering delays cannot make the
  // game clock run slow. Remaining time is derived from wall-clock time.
  if(state.gameRunning){
    if(!Number(state.gameEndAt)){
      state.gameEndAt = now + Math.max(0, Number(state.gameRemaining || 0)) * 1000;
    }
    const remainingMs = Math.max(0, Number(state.gameEndAt) - now);
    const remainingSec = Math.ceil(remainingMs / 1000);

    if(remainingSec !== state.gameRemaining){
      state.gameRemaining = remainingSec;
      changed = true;
    }

    if(remainingMs <= 0){
      state.gameRemaining = 0;
      state.gameRunning = false;
      state.gameEndAt = 0;
      state.hornAt = Date.now();
      playLocalHorn();
      changed = true;
    }
  }

  if(state.timeoutRunning && state.timeoutRemaining > 0){
    const elapsed = Math.max(0, Math.floor((now - lastTick)/1000));
    if(elapsed > 0){
      state.timeoutRemaining = Math.max(0, state.timeoutRemaining - elapsed);
      lastTick = now;
      if(state.timeoutRemaining <= 0){
        state.timeoutRunning = false;
        state.hornAt = Date.now();
        playLocalHorn();
      }
      changed = true;
    }
  }else{
    lastTick = now;
  }

  if(changed) sync();
}
function updateRealClock(){
  const d = new Date();
  const h24 = d.getHours();
  const h12 = ((h24+11)%12)+1;
  const ampm = h24 >= 12 ? "PM" : "AM";
  $("previewCurrentTime").textContent = `${h12}:${String(d.getMinutes()).padStart(2,"0")} ${ampm}`;
}

function render(){
  setTimeout(()=>{ if(typeof mssV66UpdateHornButtons==='function') mssV66UpdateHornButtons(); }, 0);
  setTimeout(()=>{ if(typeof mssV63RenderAdSlideList==='function') mssV63RenderAdSlideList(); }, 0);
  maybePlayLocalHorn();
  document.documentElement.style.setProperty("--scoreColor", state.scoreColor || "#ff4a2a");
  document.documentElement.style.setProperty("--timeColor", state.timeColor || "#00b7ff");
  document.documentElement.style.setProperty("--clockColor", state.clockColor || "#00b7ff");
  document.documentElement.style.setProperty("--wordColor", state.wordColor || "#bf5af2");

  $("previewCourt").textContent = state.courtName;
  $("previewHomeName").textContent = state.homeName;
  $("previewAwayName").textContent = state.awayName;
  $("previewHomeScore").textContent = state.home;
  $("previewAwayScore").textContent = state.away;
  $("previewGameClock").textContent = fmt(state.gameRemaining);
  $("previewPeriod").textContent = String(state.currentPeriod || "1") === "OT" ? "OT" : String(state.currentPeriod || "1");

  const allowedTO = Number(state.timeoutsPerGame || 0);
  $("previewHomeTO").textContent = Math.max(0, allowedTO - Number(state.homeTimeoutsTaken || 0));
  $("previewAwayTO").textContent = Math.max(0, allowedTO - Number(state.awayTimeoutsTaken || 0));
  $("previewHomeFouls").textContent = state.homeFouls || 0;
  $("previewAwayFouls").textContent = state.awayFouls || 0;

  $("previewSponsor").classList.toggle("hidden", !state.sponsorLogo);
  if(state.sponsorLogo) $("previewSponsorLogo").src = state.sponsorLogo;

  $("gameClockReadout").textContent = fmt(state.gameRemaining);
  $("homeReadout").textContent = state.home;
  $("awayReadout").textContent = state.away;
  $("homeScoreLabel").textContent = `Home (${state.homeName})`;
  $("awayScoreLabel").textContent = `Away (${state.awayName})`;
  $("homeStatsLabel").textContent = `Home (${state.homeName})`;
  $("awayStatsLabel").textContent = `Away (${state.awayName})`;
  $("timeoutReadout").textContent = fmt(state.timeoutRemaining);
  $("timeoutStartStop").textContent = state.timeoutRunning ? "Stop TO" : "Start TO";
  $("timeoutsPerGameReadout").textContent = state.timeoutsPerGame || 0;
  $("homeTimeoutReadout").textContent = state.homeTimeoutsTaken || 0;
  $("awayTimeoutReadout").textContent = state.awayTimeoutsTaken || 0;
  $("homeFoulReadout").textContent = state.homeFouls || 0;
  $("awayFoulReadout").textContent = state.awayFouls || 0;

  $("homeName").value = state.homeName;
  $("awayName").value = state.awayName;
  $("courtName").value = state.courtName;
  $("facilityName").value = state.facilityName;

  document.querySelectorAll("[data-period-count]").forEach(b=>b.classList.toggle("active", String(state.periodCount) === b.dataset.periodCount));
  document.querySelectorAll("[data-current-period]").forEach(b=>b.classList.toggle("active", String(state.currentPeriod) === b.dataset.currentPeriod));

  $("adsEnabled").checked = !!state.adsEnabled;
  $("adInterval").value = String(state.adInterval || 120);
  $("adDuration").value = String(state.adDuration || 30);
  $("adSlideCount").value = `${(state.adSlides || []).length} Slides`;
  $("sponsorStatus").value = state.sponsorLogo ? "Sponsor Loaded" : "No Sponsor";
  $("announcement1").value = (state.announcements || ["","",""])[0] || "";
  $("announcement2").value = (state.announcements || ["","",""])[1] || "";
  $("announcement3").value = (state.announcements || ["","",""])[2] || "";
  renderAdSlideList();
  renderPalettes();
}

function changeScore(team, pts){
  state[team] = Math.max(0, Number(state[team] || 0) + pts);
  sync();
}
document.querySelectorAll("[data-team][data-points]").forEach(btn => {
  btn.onclick = () => changeScore(btn.dataset.team, parseInt(btn.dataset.points,10));
});
$("resetScores").onclick = () => { state.home=0; state.away=0; sync(); };

$("startStop").onclick = () => {
  if(state.gameRemaining <= 0) state.gameRemaining = state.gamePreset;
  state.gameRunning = true;
  state.gameEndAt = Date.now() + Math.max(0, Number(state.gameRemaining || 0))*1000;
  lastTick = Date.now();
  sync();
};
$("stopClock").onclick = () => {
  if(state.gameRunning && Number(state.gameEndAt)){
    state.gameRemaining = Math.max(0, Math.ceil((state.gameEndAt - Date.now())/1000));
  }
  state.gameRunning = false;
  state.gameEndAt = 0;
  sync();
};
$("resetTimer").onclick = () => {
  state.gameRunning = false;
  state.gameEndAt = 0;
  state.gameRemaining = state.gamePreset;
  sync();
};
document.querySelectorAll("[data-preset]").forEach(btn => {
  btn.onclick = () => { const sec=parseInt(btn.dataset.preset,10); state.gamePreset=sec; state.gameRemaining=sec; state.gameRunning=false; state.gameEndAt=0; sync(); };
});
document.querySelectorAll("[data-adjust]").forEach(btn => {
  btn.onclick = () => { state.gameRemaining=Math.max(0,state.gameRemaining + parseInt(btn.dataset.adjust,10)); state.gamePreset=state.gameRemaining; state.gameRunning=false; state.gameEndAt=0; sync(); };
});
function readCorrectionSeconds(){
  const min=parseInt($("correctionMinutes").value,10);
  const sec=parseInt($("correctionSeconds").value,10);
  return (Number.isFinite(min)&&min>=0?min:0)*60 + (Number.isFinite(sec)&&sec>=0?Math.min(sec,59):0);
}
$("addCorrection").onclick = () => { const total=readCorrectionSeconds(); if(total<=0)return alert("Enter minutes and/or seconds."); state.gameRemaining+=total; state.gamePreset=state.gameRemaining; sync(); };
$("setCorrection").onclick = () => { const total=readCorrectionSeconds(); state.gameRemaining=total; state.gamePreset=total; state.gameRunning=false; state.gameEndAt=0; sync(); };
$("testHorn").onclick = () => { if(state.hornEnabled === false){ alert("Horn is OFF. Turn Horn ON first."); return; } ensureHornAudio(); state.hornAt=Date.now(); sync(); playLocalHorn(); };
$("newGame").onclick = () => {
  const keepPreset = Number(state.gamePreset || 600);
  const keepPeriods = state.periodCount || "4";
  const keepTimeouts = Number(state.timeoutsPerGame || 0);

  state.gameRunning = false;
  state.gameEndAt = 0;
  state.gamePreset = keepPreset;
  state.gameRemaining = keepPreset;

  state.home = 0;
  state.away = 0;
  state.homeName = "HOME";
  state.awayName = "VISITOR";

  state.periodCount = keepPeriods;
  state.currentPeriod = "1";

  state.timeoutsPerGame = keepTimeouts;
  state.homeTimeoutsTaken = 0;
  state.awayTimeoutsTaken = 0;
  state.homeFouls = 0;
  state.awayFouls = 0;

  state.timeoutRunning = false;
  state.timeoutRemaining = 0;

  sync();
};

document.querySelectorAll("[data-period-count]").forEach(btn => btn.onclick = () => { state.periodCount = btn.dataset.periodCount; sync(); });
document.querySelectorAll("[data-current-period]").forEach(btn => btn.onclick = () => { state.currentPeriod = btn.dataset.currentPeriod; sync(); });
$("resetPeriod").onclick = () => { state.currentPeriod="1"; sync(); };

$("timeout30").onclick = () => { state.timeoutPreset=30; state.timeoutRemaining=30; state.timeoutRunning=false; sync(); };
$("timeout60").onclick = () => { state.timeoutPreset=60; state.timeoutRemaining=60; state.timeoutRunning=false; sync(); };
$("timeoutStartStop").onclick = () => {
  if(state.timeoutRemaining<=0) state.timeoutRemaining=state.timeoutPreset;
  state.timeoutRunning=!state.timeoutRunning;
  if(state.timeoutRunning){
    if(state.gameRunning && Number(state.gameEndAt)){
      state.gameRemaining = Math.max(0, Math.ceil((state.gameEndAt - Date.now())/1000));
    }
    state.gameRunning = false;
    state.gameEndAt = 0;
  }
  lastTick=Date.now();
  sync();
};
$("timeoutReset").onclick = () => { state.timeoutRunning=false; state.timeoutRemaining=0; sync(); };

function bump(key, amount, maxVal=null){
  const current=Number(state[key]||0);
  let next=Math.max(0,current+amount);
  if(maxVal!==null) next=Math.min(maxVal,next);
  state[key]=next; sync();
}
$("timeoutsPerGameMinus").onclick=()=>bump("timeoutsPerGame",-1);
$("timeoutsPerGamePlus").onclick=()=>bump("timeoutsPerGame",1);
$("homeTimeoutMinus").onclick=()=>bump("homeTimeoutsTaken",-1);
$("homeTimeoutPlus").onclick=()=>bump("homeTimeoutsTaken",1,state.timeoutsPerGame||null);
$("awayTimeoutMinus").onclick=()=>bump("awayTimeoutsTaken",-1);
$("awayTimeoutPlus").onclick=()=>bump("awayTimeoutsTaken",1,state.timeoutsPerGame||null);
$("homeFoulMinus").onclick=()=>bump("homeFouls",-1);
$("homeFoulPlus").onclick=()=>bump("homeFouls",1);
$("awayFoulMinus").onclick=()=>bump("awayFouls",-1);
$("awayFoulPlus").onclick=()=>bump("awayFouls",1);

$("saveNames").onclick = () => {
  state.homeName = $("homeName").value.trim() || "HOME";
  state.awayName = $("awayName").value.trim() || "AWAY";
  state.courtName = $("courtName").value.trim() || "COURT / LOCATION";
  state.facilityName = $("facilityName").value.trim() || "MY SPORT SPACE";
  sync();
};

function sendSystemCommand(cmd){
  state.systemCommand = cmd + ":" + Date.now();
  sync();
  if(cmd === "exitProgram"){
    setTimeout(()=>{ window.close(); alert("If the Controller did not close, press Alt + F4."); }, 250);
  }
}
let mssDisplayWindow = null;

function openOrSetTvDisplay(mode){
  mode = mode === "clock" ? "clock" : "scoreboard";
  state.mode = mode;
  sync();

  const displayUrl = "display.html#" + mode;

  try{
    if(!mssDisplayWindow || mssDisplayWindow.closed){
      mssDisplayWindow = window.open(
        displayUrl,
        "MSSDisplay",
        "width=1280,height=720"
      );
    }else{
      // Changing the hash is reliable for locally opened HTML files.
      mssDisplayWindow.location.href = displayUrl;
      mssDisplayWindow.focus();
    }

    if(mssDisplayWindow){
      setTimeout(() => {
        try{
          mssDisplayWindow.postMessage(
            {type:"MSS_SET_DISPLAY_MODE", mode:mode},
            "*"
          );
        }catch(_){}
      }, 250);
    }
  }catch(_){
    window.open(displayUrl, "MSSDisplay", "width=1280,height=720");
  }
}

$("modeClock").onclick = () => openOrSetTvDisplay("clock");
if($("topModeClock")) $("topModeClock").onclick = () => openOrSetTvDisplay("clock");

$("modeScoreboard").onclick = () => openOrSetTvDisplay("scoreboard");
if($("topModeScoreboard")) $("topModeScoreboard").onclick = () => openOrSetTvDisplay("scoreboard");

$("openDisplay").onclick = () => openOrSetTvDisplay(state.mode || "scoreboard");
if($("topOpenDisplay")) $("topOpenDisplay").onclick = () => openOrSetTvDisplay(state.mode || "scoreboard");

$("exitDisplay").onclick = () => sendSystemCommand("exitDisplay");
$("exitProgram").onclick = () => sendSystemCommand("exitProgram");

$("setFacilityLogo").onclick = () => { $("facilityLogoPicker").value=""; $("facilityLogoPicker").click(); };
$("clearFacilityLogo").onclick = () => { state.facilityLogo=""; sync(); };
$("facilityLogoPicker").onchange = () => fileToDataUrl($("facilityLogoPicker").files[0], data => { state.facilityLogo=data; sync(); });
$("setSponsorLogo").onclick = () => { $("sponsorPicker").value=""; $("sponsorPicker").click(); };
$("clearSponsorLogo").onclick = () => { state.sponsorLogo=""; sync(); };
$("sponsorPicker").onchange = () => fileToDataUrl($("sponsorPicker").files[0], data => { state.sponsorLogo=data; sync(); });
$("addAdSlide").onclick = () => { $("adSlidePicker").value=""; $("adSlidePicker").click(); };
$("adSlidePicker").onchange = () => {
  const files = Array.from($("adSlidePicker").files || []);
  if(!files.length) return;
  let loaded = 0;
  const slides = state.adSlides || [];

  files.forEach(file => {
    const isImage = (file.type && file.type.startsWith("image/")) || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || "");
    if(!isImage){
      alert(`${file.name || "Selected file"} is not an image.`);
      loaded++;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      slides.push({ name: file.name || `Slide ${slides.length + 1}`, src: reader.result });
      loaded++;
      if(loaded === files.length){
        state.adSlides = slides;
        state.adsEnabled = true;
        state.previewAdAt = Date.now();
        sync();
      }
    };
    reader.onerror = () => {
      alert(`Could not read ${file.name || "that image"}.`);
      loaded++;
      if(loaded === files.length){ state.adSlides = slides; sync(); }
    };
    reader.readAsDataURL(file);
  });
};
$("clearAdSlides").onclick = () => { if(confirm("Clear all ad slides?")){ state.adSlides=[]; sync(); } };
$("previewAd").onclick = () => { state.mode="clock"; state.adsEnabled=true; state.previewAdAt=Date.now(); sync(); };
$("adsEnabled").onchange = () => { state.adsEnabled=$("adsEnabled").checked; sync(); };
$("adInterval").onchange = () => { state.adInterval=parseInt($("adInterval").value,10)||120; sync(); };
$("adDuration").onchange = () => { state.adDuration=parseInt($("adDuration").value,10)||30; sync(); };
$("saveAnnouncements").onclick = () => { state.announcements=[$("announcement1").value.trim(),$("announcement2").value.trim(),$("announcement3").value.trim()]; sync(); };

function renderAdSlideList(){
  const box=$("adSlideList");
  const parts=[];
  (state.adSlides||[]).forEach((slide,idx)=>{
    const name=typeof slide==="string"?`Slide ${idx+1}`:(slide.name||`Slide ${idx+1}`);
    parts.push(`<span class="adSlideItem"><span class="adSlideType">Ad ${idx+1}</span>${name}</span>`);
  });
  (state.announcements||[]).filter(x=>x&&x.trim()).forEach((text,idx)=>{
    parts.push(`<span class="adSlideItem"><span class="adSlideType">Announcement ${idx+1}</span>${text}</span>`);
  });
  box.innerHTML = parts.length ? parts.join("") : "No slides or announcements loaded.";
}

$("setBackground").onclick = () => { $("bgPicker").value=""; $("bgPicker").click(); };
$("bgPicker").onchange = () => fileToDataUrl($("bgPicker").files[0], data => { state.background=data; state.backgroundColor=""; sync(); });
$("clearBackground").onclick = () => { state.background=""; state.backgroundColor=""; state.bgIndex=0; sync(); };

function makePalette(id,key){
  const box=$(id); box.innerHTML="";
  colors.forEach(c=>{
    const b=document.createElement("button");
    b.className="swatch"+(((state[key]||"").toLowerCase()===c.toLowerCase())?" selected":"");
    b.style.background=c;
    b.onclick=()=>{ state[key]=c; sync(); };
    box.appendChild(b);
  });
}
function makeBackgroundPalette(){
  const box=$("backgroundPalette"); box.innerHTML="";
  gradients.forEach((g,idx)=>{
    const b=document.createElement("button");
    b.className="bgSwatch"+(!state.background&&!state.backgroundColor&&state.bgIndex===idx?" selected":"");
    b.style.backgroundImage=g;
    b.onclick=()=>{ state.background=""; state.backgroundColor=""; state.bgIndex=idx; sync(); };
    box.appendChild(b);
  });
  colors.forEach(c=>{
    const b=document.createElement("button");
    b.className="swatch"+(((state.backgroundColor||"").toLowerCase()===c.toLowerCase())?" selected":"");
    b.style.background=c;
    b.onclick=()=>{ state.background=""; state.backgroundColor=c; sync(); };
    box.appendChild(b);
  });
}
function renderPalettes(){
  makePalette("scorePalette","scoreColor");
  makePalette("timePalette","timeColor");
  makePalette("clockPalette","clockColor");
  makePalette("wordPalette","wordColor");
  makeBackgroundPalette();
}

try{
  if(window.BroadcastChannel){
    const bc = new BroadcastChannel("mss_scoreboard_signage_v4_channel");
    bc.onmessage = ev => { if(ev.data){ state={...state,...ev.data}; render(); } };
  }
}catch(_){}

setInterval(tick,100);
setInterval(updateRealClock,1000);
updateRealClock();
render();
sync();

document.addEventListener("click", ensureHornAudio);
document.addEventListener("keydown", ensureHornAudio);

/* v6.3 AD UPLOAD / LIST FIX */
function mssV63RenderAdSlideList(){
  const box = $("adSlideList");
  if(!box) return;
  const slides = state.adSlides || [];
  const announcements = (state.announcements || []).filter(x => x && x.trim());
  const parts = [];
  slides.forEach((slide, idx) => {
    const name = typeof slide === "string" ? `Ad Slide ${idx+1}` : (slide.name || `Ad Slide ${idx+1}`);
    parts.push(`<span class="adSlideItem"><span class="adSlideType">Ad ${idx+1}</span>${name}</span>`);
  });
  announcements.forEach((text, idx) => {
    parts.push(`<span class="adSlideItem"><span class="adSlideType">Announcement ${idx+1}</span>${text}</span>`);
  });
  box.innerHTML = parts.length ? parts.join("") : "No ad slides or announcements loaded yet.";
  if($("adSlideCount")) $("adSlideCount").value = `${slides.length} Ad Slide${slides.length === 1 ? "" : "s"}`;
  if($("sponsorStatus")) $("sponsorStatus").value = state.sponsorLogo ? "Sponsor Loaded" : "No Sponsor";
}
function mssV63ReadImageFile(file){
  return new Promise((resolve, reject) => {
    if(!file) return reject(new Error("No file selected."));
    const ok = (file.type && file.type.startsWith("image/")) || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || "");
    if(!ok) return reject(new Error(`${file.name || "Selected file"} is not an image.`));
    const reader = new FileReader();
    reader.onload = () => resolve({name:file.name || "Ad Slide", src:reader.result});
    reader.onerror = () => reject(new Error(`Could not read ${file.name || "that image"}.`));
    reader.readAsDataURL(file);
  });
}
if($("addAdSlide")){
  $("addAdSlide").onclick = () => {
    $("adSlidePicker").value = "";
    $("adSlidePicker").click();
  };
}
if($("adSlidePicker")){
  $("adSlidePicker").onchange = async () => {
    const files = Array.from($("adSlidePicker").files || []);
    if(!files.length) return;
    const slides = state.adSlides || [];
    let added = 0;
    for(const file of files){
      try{
        const slide = await mssV63ReadImageFile(file);
        slides.push(slide);
        added++;
      }catch(err){
        alert(err.message || "Could not upload that image.");
      }
    }
    state.adSlides = slides;
    state.adsEnabled = true;
    state.mode = "clock";
    state.previewAdAt = Date.now();
    sync();
    mssV63RenderAdSlideList();
    if(added){
      alert(`${added} ad slide${added === 1 ? "" : "s"} loaded. Click Preview Ad or wait for the rotation.`);
    }
  };
}
if($("clearAdSlides")){
  $("clearAdSlides").onclick = () => {
    if(confirm("Clear all ad slides?")){
      state.adSlides = [];
      sync();
      mssV63RenderAdSlideList();
    }
  };
}
if($("previewAd")){
  $("previewAd").onclick = () => {
    state.mode = "clock";
    state.adsEnabled = true;
    state.previewAdAt = Date.now();
    sync();
    mssV63RenderAdSlideList();
  };
}
if($("saveAnnouncements")){
  $("saveAnnouncements").onclick = () => {
    state.announcements = [
      $("announcement1").value.trim(),
      $("announcement2").value.trim(),
      $("announcement3").value.trim()
    ];
    state.adsEnabled = true;
    sync();
    mssV63RenderAdSlideList();
  };
}
mssV63RenderAdSlideList();


/* v6.6 controller horn ON/OFF */
function mssV66UpdateHornButtons(){
  const on = state.hornEnabled !== false;
  ["hornToggle","topHornToggle"].forEach(id => {
    const btn = $(id);
    if(!btn) return;
    btn.textContent = on ? "Horn ON" : "Horn OFF";
    btn.classList.toggle("hornOn", on);
    btn.classList.toggle("hornOff", !on);
  });
}
function mssV66ToggleHorn(){
  state.hornEnabled = !(state.hornEnabled !== false);
  sync();
  mssV66UpdateHornButtons();
}
if($("hornToggle")) $("hornToggle").onclick = mssV66ToggleHorn;
if($("topHornToggle")) $("topHornToggle").onclick = mssV66ToggleHorn;
mssV66UpdateHornButtons();
