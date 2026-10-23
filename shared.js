
const MSS_KEY = "mss_scoreboard_signage_v4_final";

const defaultState = {
  mode: "scoreboard",
  facilityName: "MY SPORT SPACE",
  courtName: "THE HIVE COURT 3",
  homeName: "HOME",
  awayName: "VISITOR",
  home: 3,
  away: 2,
  gameRemaining: 600,
  gamePreset: 600,
  gameRunning: false,
  gameEndAt: 0,
  periodCount: "4",
  currentPeriod: "1",
  timeoutsPerGame: 3,
  homeTimeoutsTaken: 0,
  awayTimeoutsTaken: 0,
  homeFouls: 0,
  awayFouls: 0,
  timeoutRemaining: 0,
  timeoutPreset: 30,
  timeoutRunning: false,
  facilityLogo: "",
  sponsorLogo: "",
  background: "",
  backgroundColor: "",
  bgIndex: 0,
  scoreColor: "#ff4a2a",
  timeColor: "#00b7ff",
  clockColor: "#00b7ff",
  wordColor: "#bf5af2",
  adsEnabled: false,
  adSlides: [],
  announcements: ["", "", ""],
  adInterval: 120,
  adDuration: 30,
  previewAdAt: 0,
  hornAt: 0,
  hornEnabled: true,
  systemCommand: ""
};

const gradients = [
  "radial-gradient(circle at center,#23272b 0%,#101417 45%,#050708 100%)",
  "linear-gradient(135deg,#141e30,#243b55)",
  "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
  "linear-gradient(135deg,#000428,#004e92)",
  "linear-gradient(135deg,#232526,#414345)",
  "linear-gradient(135deg,#1f4037,#99f2c8)",
  "linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)"
];

const colors = ["#ffffff","#ff4a2a","#ffcc00","#34c759","#00b7ff","#bf5af2","#ff9500"];

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(MSS_KEY)) || {};
    const merged = {...defaultState, ...saved};
    if(["Runaways","Say What?","Say What"].includes(merged.awayName)) merged.awayName = "VISITOR";
    if(merged.homeName === "Rascals") merged.homeName = "HOME";
    if(merged.homeName === "HOME") merged.homeName = "HOME";
    if(merged.awayName === "VISITOR") merged.awayName = "VISITOR";
    return merged;
  }
  catch { return {...defaultState}; }
}

function saveState(state){
  state.updatedAt = Date.now();
  localStorage.setItem(MSS_KEY, JSON.stringify(state));
  try{
    if(window.BroadcastChannel){
      const bc = new BroadcastChannel("mss_scoreboard_signage_v4_channel");
      bc.postMessage(state);
      bc.close();
    }
  }catch(_){}
}

function fmt(total){
  total = Math.max(0, Math.round(total || 0));
  const m = Math.floor(total/60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function fileToDataUrl(file, cb){
  if(!file) return;
  if(!file.type.startsWith("image/")){ alert("Please choose an image file."); return; }
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.onerror = () => alert("Could not read that image file.");
  r.readAsDataURL(file);
}
