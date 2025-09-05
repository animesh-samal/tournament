// ====== CONFIG - replace these URLs with your published CSV URLs ======
const PLAYERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzNnP5CEIBKzDrPsMMduIrFPxBCjWAQLGlfhDN0XUEcKrEtuY1HGFw5Kex9VpivvctV9V0mOuMnp_W/pub?gid=0&single=true&output=csv";
const MATCHES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzNnP5CEIBKzDrPsMMduIrFPxBCjWAQLGlfhDN0XUEcKrEtuY1HGFw5Kex9VpivvctV9V0mOuMnp_W/pub?gid=428108000&single=true&output=csv";
// =========================================================================

const DEFAULT_WIN_POINTS = 3;

// --- small CSV parser that respects quoted fields ---
function parseCSV(text) {
  const rows = text.trim().split('\n').map(r => r.replace(/\r$/, ''));
  const header = rows.shift().split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(h=>h.replace(/^"|"$/g, '').trim());
  const data = rows.map(row => {
    const cols = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c=>c.replace(/^"|"$/g, '').trim());
    const obj = {};
    header.forEach((h,i)=> obj[h] = cols[i]===undefined ? '' : cols[i]);
    return obj;
  });
  return data;
}

async function fetchCSV(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('Failed to fetch: '+res.status);
  const txt = await res.text();
  return parseCSV(txt);
}

// --- main data holders ---
let players = []; // array of {player_id,name,...}
let matches = []; // array of match rows

// --- utility ---
function idToName(id){
  const p = players.find(x=>x.player_id === id);
  return p ? p.name : id;
}

function splitTeam(teamStr){
  if(!teamStr) return [];
  return teamStr.split('|').map(s=>s.trim()).filter(Boolean);
}

function computeStats(){
  const map = {};
  players.forEach(p => { map[p.player_id] = {
    player_id: p.player_id,
    name: p.name,
    matches_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    match_diff:0
  }});

  matches.forEach(m => {
    const teamA = splitTeam(m.team_a || '');
    const teamB = splitTeam(m.team_b || '');
    const winner = (m.winner||'').trim().toLowerCase(); // expected: 'team_a' or 'team_b' or player id
    const pointsForWin = Number(m.win_points || DEFAULT_WIN_POINTS) || DEFAULT_WIN_POINTS;

    // helper to award points
    function award(team, pts, isWin=false, isDraw=false){
      const per = pts / Math.max(1, team.length);
      team.forEach(pid => {
        if(!map[pid]) return; // unknown
        map[pid].matches_played += 1;
        map[pid].points += per;
        if(isWin) { map[pid].wins += 1; map[pid].match_diff += 1; }
        else if(isDraw) { map[pid].draws += 1; }
        else { map[pid].losses += 1; map[pid].match_diff -= 1; }
      });
    }

    // decide result
    if(winner === 'team_a' || winner === 'team_b'){
      if(winner === 'team_a'){
        award(teamA, pointsForWin, true, false);
        award(teamB, 0, false, false);
      } else {
        award(teamB, pointsForWin, true, false);
        award(teamA, 0, false, false);
      }
    } else if(winner === 'draw' || winner === 'tie'){
      const drawPts = Number(m.draw_points || 1) || 1;
      award(teamA, drawPts, false, true);
      award(teamB, drawPts, false, true);
    } else if(players.some(p=>p.player_id === winner)){
      if(teamA.includes(winner)){
        award(teamA, pointsForWin, true,false);
        award(teamB, 0,false,false);
      } else if(teamB.includes(winner)){
        award(teamB, pointsForWin, true,false);
        award(teamA, 0,false,false);
      } else {
        award(teamA,0,false,false);
        award(teamB,0,false,false);
      }
    } else {
      // unknown winner: just count matches as played
      award(teamA,0,false,false);
      award(teamB,0,false,false);
    }
  });

  // compute win_pct
  Object.values(map).forEach(p=>{
    p.win_pct = p.matches_played ? Math.round((p.wins / p.matches_played)*100) : 0;
  });

  return Object.values(map);
}

function sortStandings(arr){
  // sort by points desc, then match_diff desc, then wins desc, then name
  arr.sort((a,b)=>{
    if(b.points !== a.points) return b.points - a.points;
    if(b.match_diff !== a.match_diff) return b.match_diff - a.match_diff;
    if(b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });
}

// --- rendering ---
function renderLeaderboard(standings){
  const tbody = document.querySelector('#leaderboardTable tbody');
  tbody.innerHTML = '';
  standings.forEach((p,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${p.name}</td>
      <td>${p.matches_played}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td>${p.points % 1 === 0 ? p.points : p.points.toFixed(1)}</td>
      <td>${p.win_pct}%</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPlayerFilter(standings){
  const sel = document.getElementById('playerFilter');
  sel.innerHTML = '<option value="all">All players</option>' + standings.map(p=>`<option value="${p.player_id}">${p.name}</option>`).join('');
}

function renderMatches(filterPlayer='all', stage='all', type='all'){
  const ul = document.getElementById('matches');
  ul.innerHTML = '';
  const filtered = matches.filter(m => {
    if(stage !== 'all' && (m.stage||'').toLowerCase() !== stage) return false;
    if(type !== 'all' && (m.match_type||'').toLowerCase() !== type) return false;
    if(filterPlayer === 'all') return true;
    const ids = [...splitTeam(m.team_a||''), ...splitTeam(m.team_b||'')];
    return ids.includes(filterPlayer);
  }).sort((a,b)=> (a.date||'').localeCompare(b.date));

  filtered.forEach(m => {
    const li = document.createElement('li');
    li.className = 'match-item';
    const aTeam = splitTeam(m.team_a||'').map(idToName).join(' + ');
    const bTeam = splitTeam(m.team_b||'').map(idToName).join(' + ');
    li.innerHTML = `
      <div>
        <div><strong>${m.date || ''}</strong> — <span class="match-meta">${m.stage || ''} / ${m.match_type || ''}</span></div>
        <div style="margin-top:6px">${aTeam} <strong>vs</strong> ${bTeam}</div>
        <div class="match-meta">Score: ${m.score || '-'} — Winner: ${m.winner || '-'}</div>
      </div>
      <div class="match-meta">${m.notes || ''}</div>
    `;
    ul.appendChild(li);
  });
}

function renderPlayerSummary(playerId){
  if(!playerId || playerId === 'all'){
    document.getElementById('playerSummary').hidden = true;
    return;
  }
  const p = computeStats().find(x=>x.player_id === playerId);
  if(!p) return;
  document.getElementById('playerSummary').hidden = false;
  document.getElementById('playerName').textContent = p.name + ' — Summary';
  document.getElementById('playerStats').innerHTML = `
    <ul>
      <li>Matches played: ${p.matches_played}</li>
      <li>Wins: ${p.wins}</li>
      <li>Losses: ${p.losses}</li>
      <li>Draws: ${p.draws}</li>
      <li>Points: ${p.points % 1 === 0 ? p.points : p.points.toFixed(1)}</li>
      <li>Win %: ${p.win_pct}%</li>
    </ul>
  `;
}

// --- main load ---
async function loadAll(){
  try{
    document.getElementById('refreshBtn').disabled = true;
    // fetch players and matches
    players = await fetchCSV(PLAYERS_CSV_URL);
    matches = await fetchCSV(MATCHES_CSV_URL);

    const standings = computeStats();
    sortStandings(standings);
    renderLeaderboard(standings);
    renderPlayerFilter(standings);
    renderMatches();

  } catch(err){
    alert('Error loading data: '+err.message);
    console.error(err);
  } finally{
    document.getElementById('refreshBtn').disabled = false;
  }
}

// --- event wiring ---
document.getElementById('refreshBtn').addEventListener('click', loadAll);
document.getElementById('playerFilter').addEventListener('change', (e)=>{
  const pid = e.target.value;
  const stage = document.getElementById('stageFilter').value;
  const type = document.getElementById('typeFilter').value;
  renderMatches(pid, stage, type);
  renderPlayerSummary(pid);
});
document.getElementById('stageFilter').addEventListener('change', ()=>{
  const pid = document.getElementById('playerFilter').value;
  renderMatches(pid, document.getElementById('stageFilter').value, document.getElementById('typeFilter').value);
});
document.getElementById('typeFilter').addEventListener('change', ()=>{
  const pid = document.getElementById('playerFilter').value;
  renderMatches(pid, document.getElementById('stageFilter').value, document.getElementById('typeFilter').value);
});

document.getElementById('openSheetBtn').addEventListener('click', ()=>{
  // open a new tab to the Google Sheet (replace below with your edit URL)
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/15Nr08LFeWLQsaIu8YIqSxhDeynxZbrrqoU6a3VIQI0M/edit?gid=0#gid=0';
  window.open(sheetUrl, '_blank');
});

// initial load
loadAll();
