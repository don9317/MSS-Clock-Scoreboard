(() => {
  const CFG_KEY = "mssSchedulePrototype_v71";
  const $ = id => document.getElementById(id);

  let cfg = {
    facilityName: "MY SPORT SPACE",
    courtName: "COURT 3",
    facilityId: "Vg0Kw0dgPIguZax5GzFsUutQyYU2",
    bridgeUrl: "",
    refreshSeconds: 60,
    useDemo: true
  };

  let serverOffsetMs = 0;
  let refreshTimer = null;

  try{
    const saved = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
    cfg = {...cfg, ...saved};
  }catch(_){}

  function persist(){
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }

  function now(){
    return new Date(Date.now() + serverOffsetMs);
  }

  function formatClock(d){
    return d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  }

  function formatDate(d){
    return d.toLocaleDateString([], {weekday:"long", month:"long", day:"numeric", year:"numeric"});
  }

  function formatRange(start,end){
    if(!start || !end) return "";
    const a = new Date(start), b = new Date(end);
    if(Number.isNaN(a.valueOf()) || Number.isNaN(b.valueOf())) return "";
    return `${a.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} – ${b.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
  }

  function tick(){
    const d = now();
    $("liveTime").textContent = formatClock(d);
    $("liveDate").textContent = formatDate(d);
  }

  function setSync(serverTime, label){
    if(serverTime){
      const s = new Date(serverTime);
      if(!Number.isNaN(s.valueOf())){
        serverOffsetMs = s.valueOf() - Date.now();
      }
    }else{
      serverOffsetMs = 0;
    }
    $("syncBadge").textContent = label;
    tick();
  }

  function renderReservation(prefix, item, emptyTitle, emptyTime){
    $(prefix+"Title").textContent = item?.title || emptyTitle;
    $(prefix+"Time").textContent = item ? formatRange(item.start,item.end) : emptyTime;
    $(prefix+"Sport").textContent = item?.sport || "";
  }

  function render(data, sourceLabel){
    $("courtLabel").textContent = (data.court || cfg.courtName || "COURT").toUpperCase();
    renderReservation("now", data.current, "Open Court", "No current reservation");
    renderReservation("next", data.next, "No upcoming reservation", "");
    setSync(data.serverTime, sourceLabel);
  }

  function demoData(){
    const base = new Date();
    base.setSeconds(0,0);

    const currentStart = new Date(base.valueOf() - 25*60000);
    const currentEnd = new Date(base.valueOf() + 35*60000);
    const nextStart = new Date(currentEnd.valueOf());
    const nextEnd = new Date(nextStart.valueOf() + 60*60000);

    return {
      serverTime: new Date().toISOString(),
      court: cfg.courtName,
      current: {
        title: "Swarm Practice",
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
        sport: "Basketball"
      },
      next: {
        title: "Court Rental",
        start: nextStart.toISOString(),
        end: nextEnd.toISOString(),
        sport: "Basketball"
      }
    };
  }

  // Tolerant bridge parser: supports the recommended normalized response,
  // or an events[] array if Clint prefers returning a short event list.
  function normalizeBridgeResponse(raw){
    if(raw && (raw.current || raw.next)){
      return {
        serverTime: raw.serverTime || raw.now || null,
        court: raw.court || cfg.courtName,
        current: raw.current || null,
        next: raw.next || null
      };
    }

    if(raw && Array.isArray(raw.events)){
      const courtWanted = (cfg.courtName || "").trim().toLowerCase();
      const t = now().valueOf();
      const events = raw.events
        .filter(e => !courtWanted || String(e.court || e.area || "").trim().toLowerCase() === courtWanted)
        .map(e => ({
          title: e.title || e.name || "Reservation",
          start: e.start || e.startTime || e.startDateTime,
          end: e.end || e.endTime || e.endDateTime,
          sport: e.sport || ""
        }))
        .filter(e => e.start && e.end)
        .sort((a,b) => new Date(a.start)-new Date(b.start));

      const current = events.find(e => new Date(e.start).valueOf() <= t && new Date(e.end).valueOf() > t) || null;
      const next = events.find(e => new Date(e.start).valueOf() > t) || null;

      return {
        serverTime: raw.serverTime || raw.now || null,
        court: cfg.courtName,
        current,
        next
      };
    }

    throw new Error("Bridge returned JSON, but not in a recognized Clock + Schedule format.");
  }

  async function fetchLive(showAlert=false){
    if(!cfg.bridgeUrl){
      if(showAlert) alert("No bridge URL has been entered yet. Use Demo Data until Clint provides the read-only endpoint.");
      return;
    }

    const url = new URL(cfg.bridgeUrl);
    if(cfg.facilityId && !url.searchParams.has("facilityId")) url.searchParams.set("facilityId", cfg.facilityId);
    if(cfg.courtName && !url.searchParams.has("court")) url.searchParams.set("court", cfg.courtName);

    $("connectionStatus").textContent = "Connecting to MSS schedule bridge…";

    try{
      const res = await fetch(url.toString(), {cache:"no-store"});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const data = normalizeBridgeResponse(raw);
      render(data, "MSS LIVE");
      $("connectionStatus").textContent = `Live schedule updated ${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`;
      cfg.useDemo = false;
      persist();
      scheduleRefresh();
      if(showAlert) alert("Live bridge connection succeeded.");
    }catch(err){
      $("syncBadge").textContent = "CONNECTION ERROR";
      $("connectionStatus").textContent = `Could not read the bridge: ${err.message}`;
      if(showAlert) alert("Bridge test failed: " + err.message);
    }
  }

  function useDemo(){
    cfg.useDemo = true;
    persist();
    render(demoData(), "DEMO DATA");
    $("connectionStatus").textContent = "Prototype is running with sample reservations.";
    scheduleRefresh();
  }

  function scheduleRefresh(){
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if(cfg.useDemo) render(demoData(), "DEMO DATA");
      else fetchLive(false);
    }, Math.max(15, Number(cfg.refreshSeconds)||60)*1000);
  }

  function loadForm(){
    $("facilityName").value = cfg.facilityName || "";
    $("courtName").value = cfg.courtName || "";
    $("facilityId").value = cfg.facilityId || "";
    $("bridgeUrl").value = cfg.bridgeUrl || "";
    $("refreshSeconds").value = String(cfg.refreshSeconds || 60);
  }

  function saveForm(){
    cfg.facilityName = $("facilityName").value.trim() || "MY SPORT SPACE";
    cfg.courtName = $("courtName").value.trim().toUpperCase() || "COURT 3";
    cfg.facilityId = $("facilityId").value.trim();
    cfg.bridgeUrl = $("bridgeUrl").value.trim();
    cfg.refreshSeconds = Number($("refreshSeconds").value) || 60;
    persist();

    $("courtLabel").textContent = cfg.courtName;
    if(cfg.useDemo) useDemo();
    else scheduleRefresh();
  }

  $("showSetup").onclick = () => { loadForm(); $("setupPanel").hidden = false; };
  $("closeSetup").onclick = () => $("setupPanel").hidden = true;
  $("saveScheduleSetup").onclick = () => { saveForm(); $("connectionStatus").textContent = "Schedule setup saved."; };
  $("testBridge").onclick = () => { saveForm(); fetchLive(true); };
  $("useDemo").onclick = () => { saveForm(); useDemo(); $("setupPanel").hidden = true; };

  $("fullScreen").onclick = async () => {
    try{
      if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    }catch(_){}
  };

  $("startScoreboard").onclick = () => {
    try{
      const display = window.open("display.html#scoreboard","MSSDisplay","width=1280,height=720");
      const controller = window.open("controller.html","MSSController","width=1500,height=950,left=40,top=40");
      if(display) display.focus();
      if(controller) controller.focus();
    }catch(_){
      window.location.href = "controller.html";
    }
  };

  setInterval(tick,1000);
  tick();
  if(cfg.useDemo || !cfg.bridgeUrl) useDemo();
  else fetchLive(false);
})();