
let state = loadState();
const startupParams = new URLSearchParams(window.location.search);
const startupMode = startupParams.get("mode");
if(startupMode === "clock" || startupMode === "scoreboard"){
  state.mode = startupMode;
  saveState(state);
}

let lastHorn = state.hornAt || 0;
const displayStartedAt = Date.now();
let audioCtx = null;
let adMode = false;
let adIndex = 0;
let lastRotationStart = Date.now();
let lastStateText = "";

const $ = id => document.getElementById(id);

function ensureAudio(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === "suspended") audioCtx.resume();
  }catch(_){}
}

function playHorn(){
  ensureAudio();
  if(!audioCtx) return;
  const now = audioCtx.currentTime;
  const master = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type="bandpass";
  filter.frequency.setValueAtTime(680, now);
  filter.Q.setValueAtTime(1.35, now);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.50, now+0.035);
  master.gain.setValueAtTime(0.50, now+0.82);
  master.gain.exponentialRampToValueAtTime(0.0001, now+1.05);
  filter.connect(master);
  master.connect(audioCtx.destination);
  [440,554,660,880].forEach((freq,i)=>{
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    osc.type=i===3?"sawtooth":"square";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(i===3?0.08:0.20, now);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
    osc.stop(now+1.08);
  });
  document.body.classList.remove("flash");
  void document.body.offsetWidth;
  document.body.classList.add("flash");
}

let lastSystemCommand = state.systemCommand || "";
function handleSystemCommand(){
  const cmd = state.systemCommand || "";
  if(!cmd || cmd === lastSystemCommand) return;
  lastSystemCommand = cmd;
  const parts = cmd.split(":");
  const cmdTime = Number(parts[1] || 0);
  if(cmdTime && cmdTime < displayStartedAt) return;
  if(cmd.startsWith("exitDisplay") || cmd.startsWith("exitProgram")){
    try{ window.close(); }catch(_){}
    setTimeout(()=>{ document.body.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-content:center;background:#111;color:white;font-family:system-ui;font-size:36px;text-align:center;padding:40px;">Display closed.<br><span style="font-size:22px;opacity:.75;">If this window did not close, press Alt + F4.</span></div>'; }, 300);
  }
}

function updateRealClock(){
  const d = new Date();
  const h24 = d.getHours();
  const h12 = ((h24+11)%12)+1;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const main = `${h12}:${String(d.getMinutes()).padStart(2,"0")} ${ampm}`;
  $("realClock").textContent = main;
  $("seconds").textContent = String(d.getSeconds()).padStart(2,"0");
  $("scoreboardCurrentTime").textContent = main;
  $("date").textContent = d.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
}

function render(){
  updateHornButton();
  handleSystemCommand();

  document.documentElement.style.setProperty("--scoreColor", state.scoreColor || "#ff4a2a");
  document.documentElement.style.setProperty("--timeColor", state.timeColor || "#00b7ff");
  document.documentElement.style.setProperty("--clockColor", state.clockColor || "#00b7ff");
  document.documentElement.style.setProperty("--wordColor", state.wordColor || "#bf5af2");

  $("facilityName").textContent = state.facilityName || "MY SPORT SPACE";
  $("courtName").textContent = state.courtName || "COURT / LOCATION";
  $("clockCourtName").textContent = state.courtName || "COURT / LOCATION";
  $("homeLabel").textContent = state.homeName || "HOME";
  $("awayLabel").textContent = state.awayName || "AWAY";

  document.body.classList.toggle("clockMode", state.mode === "clock");
  document.body.classList.toggle("scoreboardMode", state.mode === "scoreboard");
  $("clockView").classList.toggle("hidden", state.mode !== "clock");
  $("scoreboardView").classList.toggle("hidden", state.mode !== "scoreboard");

  $("homeScore").textContent = state.home;
  $("awayScore").textContent = state.away;
  $("gameClock").textContent = fmt(state.gameRemaining);

  const allowedTO = Number(state.timeoutsPerGame || 0);
  $("homeTimeoutDisplay").textContent = Math.max(0, allowedTO - Number(state.homeTimeoutsTaken || 0));
  $("awayTimeoutDisplay").textContent = Math.max(0, allowedTO - Number(state.awayTimeoutsTaken || 0));
  $("homeFoulDisplay").textContent = Number(state.homeFouls || 0);
  $("awayFoulDisplay").textContent = Number(state.awayFouls || 0);
  $("periodTile").textContent = String(state.currentPeriod || "1") === "OT" ? "OT" : String(state.currentPeriod || "1");

  $("timeoutPanel").classList.toggle("hidden", !(state.timeoutRunning || state.timeoutRemaining > 0));
  $("timeoutClock").textContent = fmt(state.timeoutRemaining);

  const bg = $("bg");
  if(state.background){
    bg.style.backgroundImage = `url("${state.background}")`;
    bg.style.backgroundColor = "";
  } else if(state.backgroundColor){
    bg.style.backgroundImage = "none";
    bg.style.backgroundColor = state.backgroundColor;
  } else {
    bg.style.backgroundImage = gradients[(state.bgIndex || 0) % gradients.length];
    bg.style.backgroundColor = "";
  }

  $("clockSponsorBox").classList.toggle("hidden", !state.sponsorLogo || state.mode !== "clock");
  if(state.sponsorLogo) $("clockSponsorLogo").src = state.sponsorLogo;

  $("scoreboardSponsorBox").classList.toggle("hidden", !state.sponsorLogo || state.mode !== "scoreboard");
  if(state.sponsorLogo) $("scoreboardSponsorLogo").src = state.sponsorLogo;

  if(state.hornEnabled !== false && state.hornAt && state.hornAt !== lastHorn && state.hornAt >= displayStartedAt){
    lastHorn = state.hornAt;
    playHorn();
  }
}

function availableAdItems(){
  const items = [];
  (state.adSlides || []).forEach(slide => items.push({type:"image", src: (typeof slide === "string" ? slide : slide.src), name: (typeof slide === "string" ? "" : slide.name)}));
  (state.announcements || []).filter(x => x && x.trim()).forEach(text => items.push({type:"announcement", text}));
  return items;
}
function showAdItem(item){
  const overlay = $("adOverlay"), img = $("adImage"), ann = $("announcementSlide");
  if(!overlay || !item) return;
  overlay.classList.remove("hidden");
  img.classList.add("hidden");
  ann.classList.add("hidden");
  if(item.type === "image"){ img.src = item.src; img.classList.remove("hidden"); }
  else { ann.textContent = item.text; ann.classList.remove("hidden"); }
}
function hideAd(){
  const overlay = $("adOverlay");
  if(overlay) overlay.classList.add("hidden");
}
function updateAdRotation(){
  const items = availableAdItems();
  const now = Date.now();
  const enabled = state.adsEnabled && state.mode === "clock" && items.length > 0;
  if(!enabled){ adMode=false; hideAd(); lastRotationStart=now; return; }
  if(state.previewAdAt && state.previewAdAt !== window.lastPreviewAdAt){
    window.lastPreviewAdAt = state.previewAdAt;
    adMode = true;
    adIndex = adIndex % items.length;
    showAdItem(items[adIndex]);
    lastRotationStart = now;
    return;
  }
  const intervalMs = (state.adInterval || 120) * 1000;
  const durationMs = (state.adDuration || 30) * 1000;
  const elapsed = now - lastRotationStart;
  if(!adMode && elapsed >= intervalMs){
    adMode = true;
    adIndex = adIndex % items.length;
    showAdItem(items[adIndex]);
    lastRotationStart = now;
  } else if(adMode && elapsed >= durationMs){
    adMode = false;
    hideAd();
    adIndex = (adIndex + 1) % items.length;
    lastRotationStart = now;
  }
}

function pullLatestState(){
  try{
    const txt = localStorage.getItem(MSS_KEY) || "";
    if(txt && txt !== lastStateText){
      lastStateText = txt;
      state = loadState();
      render();
    }
  }catch(_){}
}

window.addEventListener("storage", e => { if(e.key===MSS_KEY){ state=loadState(); render(); }});
try{
  if(window.BroadcastChannel){
    const bc = new BroadcastChannel("mss_scoreboard_signage_v4_channel");
    bc.onmessage = ev => {
      if(ev.data){
        state = {...state, ...ev.data};
        render();
      }
    };
  }
}catch(_){}

window.addEventListener("click", ensureAudio);
setInterval(updateRealClock, 1000);
setInterval(updateAdRotation, 500);
setInterval(pullLatestState, 500);
updateRealClock();
pullLatestState();
render();

function updateHornButton(){
  const btn = document.getElementById("soundEnableOverlay");
  if(!btn) return;
  const on = state.hornEnabled !== false;
  btn.textContent = on ? "Horn ON" : "Horn OFF";
  btn.classList.toggle("hornOn", on);
  btn.classList.toggle("hornOff", !on);
}
const soundBtn = document.getElementById("soundEnableOverlay");
if(soundBtn){
  soundBtn.onclick = () => {
    ensureAudio();
    state.hornEnabled = !(state.hornEnabled !== false);
    saveState(state);
    updateHornButton();
  };
}
const switchToClockBtn = document.getElementById("switchToClock");
if(switchToClockBtn){
  switchToClockBtn.onclick = () => { state.mode = "clock"; saveState(state); render(); };
}
const switchToScoreboardBtn = document.getElementById("switchToScoreboard");
if(switchToScoreboardBtn){
  switchToScoreboardBtn.onclick = () => { state.mode = "scoreboard"; saveState(state); render(); };
}
document.addEventListener("click", ensureAudio);
document.addEventListener("keydown", ensureAudio);
updateHornButton();


/* v6.2 ad rotation override */
function availableAdItems(){
  const items = [];
  (state.adSlides || []).forEach((slide, idx) => {
    const src = typeof slide === "string" ? slide : slide && slide.src;
    const name = typeof slide === "string" ? `Ad ${idx+1}` : (slide && slide.name) || `Ad ${idx+1}`;
    if(src) items.push({type:"image", src, name});
  });
  (state.announcements || []).filter(x => x && x.trim()).forEach((text, idx) => items.push({type:"announcement", text, name:`Announcement ${idx+1}`}));
  return items;
}

function showAdItem(item){
  const overlay = $("adOverlay"), img = $("adImage"), ann = $("announcementSlide");
  if(!overlay || !item) return;
  overlay.classList.remove("hidden");
  img.classList.add("hidden");
  ann.classList.add("hidden");
  img.removeAttribute("src");

  if(item.type === "image" && item.src){
    img.onload = () => { ann.classList.add("hidden"); img.classList.remove("hidden"); };
    img.onerror = () => {
      img.classList.add("hidden");
      ann.textContent = item.name ? `Could not display: ${item.name}` : "Could not display ad slide";
      ann.classList.remove("hidden");
    };
    img.src = item.src;
  } else {
    ann.textContent = item.text || "";
    ann.classList.remove("hidden");
  }
}

function updateAdRotation(){
  const items = availableAdItems();
  const now = Date.now();
  const enabled = state.adsEnabled && state.mode === "clock" && items.length > 0;
  if(!enabled){ adMode=false; hideAd(); lastRotationStart=now; return; }

  if(state.previewAdAt && state.previewAdAt !== window.lastPreviewAdAt){
    window.lastPreviewAdAt = state.previewAdAt;
    adMode = true;
    adIndex = adIndex % items.length;
    showAdItem(items[adIndex]);
    lastRotationStart = now;
    return;
  }

  const intervalMs = (state.adInterval || 120) * 1000;
  const durationMs = (state.adDuration || 30) * 1000;
  const elapsed = now - lastRotationStart;

  if(!adMode && elapsed >= intervalMs){
    adMode = true;
    adIndex = adIndex % items.length;
    showAdItem(items[adIndex]);
    lastRotationStart = now;
  } else if(adMode && elapsed >= durationMs){
    adMode = false;
    hideAd();
    adIndex = (adIndex + 1) % items.length;
    lastRotationStart = now;
  }
}

/* v6.3 AD DISPLAY OVERRIDE */
function mssV63AdItems(){
  const items = [];
  (state.adSlides || []).forEach((slide, idx) => {
    const src = typeof slide === "string" ? slide : slide && slide.src;
    const name = typeof slide === "string" ? `Ad Slide ${idx+1}` : (slide && slide.name) || `Ad Slide ${idx+1}`;
    if(src) items.push({type:"image", src, name});
  });
  (state.announcements || []).filter(x => x && x.trim()).forEach((text, idx) => {
    items.push({type:"announcement", text, name:`Announcement ${idx+1}`});
  });
  return items;
}
function availableAdItems(){ return mssV63AdItems(); }
function showAdItem(item){
  const overlay = $("adOverlay");
  const img = $("adImage");
  const ann = $("announcementSlide");
  if(!overlay || !img || !ann || !item) return;
  overlay.classList.remove("hidden");
  img.classList.add("hidden");
  ann.classList.add("hidden");
  img.removeAttribute("src");
  if(item.type === "image" && item.src){
    img.onload = () => { ann.classList.add("hidden"); img.classList.remove("hidden"); };
    img.onerror = () => {
      img.classList.add("hidden");
      ann.textContent = `Could not display ${item.name || "ad slide"}`;
      ann.classList.remove("hidden");
    };
    img.src = item.src;
  } else {
    ann.textContent = item.text || "";
    ann.classList.remove("hidden");
  }
}
function updateAdRotation(){
  const items = mssV63AdItems();
  const now = Date.now();
  const enabled = state.adsEnabled && state.mode === "clock" && items.length > 0;
  if(!enabled){ adMode = false; hideAd(); lastRotationStart = now; return; }
  if(state.previewAdAt && state.previewAdAt !== window.lastPreviewAdAt){
    window.lastPreviewAdAt = state.previewAdAt;
    adMode = true;
    adIndex = adIndex % items.length;
    showAdItem(items[adIndex]);
    lastRotationStart = now;
    return;
  }
  const intervalMs = (state.adInterval || 120) * 1000;
  const durationMs = (state.adDuration || 30) * 1000;
  const elapsed = now - lastRotationStart;
  if(!adMode && elapsed >= intervalMs){
    adMode = true;
    adIndex = adIndex % items.length;
    showAdItem(items[adIndex]);
    lastRotationStart = now;
  } else if(adMode && elapsed >= durationMs){
    adMode = false;
    hideAd();
    adIndex = (adIndex + 1) % items.length;
    lastRotationStart = now;
  }
}








/* v7.0e revised — Start Scoreboard workflow */
(function(){
  const btn = document.getElementById("displayModeToggle");
  if(!btn) return;

  function normalizeMode(value){
    return value === "scoreboard" ? "scoreboard" : "clock";
  }

  function modeFromHash(){
    const hash = (window.location.hash || "").replace("#","").toLowerCase();
    if(hash === "clock" || hash === "scoreboard") return hash;
    return null;
  }

  function applyMode(mode, updateHash){
    mode = normalizeMode(mode);
    state.mode = mode;
    saveState(state);

    if(updateHash && window.location.hash !== "#" + mode){
      history.replaceState(null, "", "#" + mode);
    }

    if(typeof render === "function"){
      render();
    }

    btn.textContent = mode === "clock" ? "Start Scoreboard" : "Return to Clock";
    const home = document.getElementById("displayHomeButton");
    if(home) home.style.display = mode === "clock" ? "inline-block" : "none";

  }

  function openScoreboardController(){
    try{
      const controller = window.open(
        "controller.html",
        "MSSController",
        "width=1500,height=950,left=40,top=40"
      );
      if(controller){
        try{ controller.focus(); }catch(_){}
      }
    }catch(_){
      window.open("controller.html", "MSSController");
    }
  }

  const startupHashMode = modeFromHash();
  if(startupHashMode){
    applyMode(startupHashMode, false);
  }else{
    applyMode(normalizeMode(state.mode), true);
  }

  btn.addEventListener("click", function(event){
    event.preventDefault();
    event.stopPropagation();

    const current = normalizeMode(state.mode);

    if(current === "clock"){
      // Game is starting: switch the TV to Scoreboard and open laptop controls.
      applyMode("scoreboard", true);
      openScoreboardController();
    }else{
      // Game is over: return TV to the everyday clock.
      applyMode("clock", true);
    }
  });

  window.addEventListener("hashchange", function(){
    const requested = modeFromHash();
    if(requested){
      applyMode(requested, false);
    }
  });

  window.addEventListener("message", function(event){
    const data = event.data || {};
    if(data.type === "MSS_SET_DISPLAY_MODE" &&
       (data.mode === "clock" || data.mode === "scoreboard")){
      applyMode(data.mode, true);
    }
  });
})();
