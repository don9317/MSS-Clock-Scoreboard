
let state = loadState();
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

  if(state.hornAt && state.hornAt !== lastHorn && state.hornAt >= displayStartedAt){
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

const soundBtn = document.getElementById("soundEnableOverlay");
if(soundBtn){
  soundBtn.onclick = () => {
    ensureAudio();
    soundBtn.textContent = "Horn Sound Enabled";
    soundBtn.classList.add("enabled");
    setTimeout(()=>soundBtn.style.display="none", 1400);
  };
}
document.addEventListener("click", ensureAudio);
document.addEventListener("keydown", ensureAudio);
