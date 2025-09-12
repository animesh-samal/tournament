// ====== CONFIG - replace these URLs with your published CSV URLs ======
// const PLAYERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzNnP5CEIBKzDrPsMMduIrFPxBCjWAQLGlfhDN0XUEcKrEtuY1HGFw5Kex9VpivvctV9V0mOuMnp_W/pub?gid=0&single=true&output=csv";
// const MATCHES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzNnP5CEIBKzDrPsMMduIrFPxBCjWAQLGlfhDN0XUEcKrEtuY1HGFw5Kex9VpivvctV9V0mOuMnp_W/pub?gid=428108000&single=true&output=csv";
// // =========================================================================

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

// ====== Supabase config ======
// Add this to your HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
const SUPABASE_URL = 'https://npdhqzlchdyydmwlfnnp.supabase.co'; // e.g. https://xxxx.supabase.co
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZGhxemxjaGR5eWRtd2xmbm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2OTQ5NzIsImV4cCI6MjA3MzI3MDk3Mn0.s426RAQ6rhVgvQq_g4Xtyit6k9xHgw9MtEqZAWDkJ-0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let teams = [];
let matches = [];

function idToName(id) {
  const p = players.find(x => x.id === id);
  return p ? p.name : id;
}

function teamIdToNames(teamId) {
  const t = teams.find(x => x.id === teamId);
  if (!t) return teamId;
  const p1 = idToName(t.player1_id);
  const p2 = idToName(t.player2_id);
  return `${p1} & ${p2}`;
}

function computePlayerStats() {
  // Individual player stats
  const map = {};
  players.forEach(p => {
    map[p.id] = {
      player_id: p.id,
      name: p.name,
      matches_played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      win_pct: 0
    };
  });
  matches.forEach(m => {
    if (!m.winner_team_id) return;
    const winTeam = teams.find(t => t.id === m.winner_team_id);
    if (!winTeam) return;
    const loseTeamId = m.team_a_id === m.winner_team_id ? m.team_b_id : m.team_a_id;
    const loseTeam = teams.find(t => t.id === loseTeamId);
    // Award points to winners
    [winTeam.player1_id, winTeam.player2_id].forEach(pid => {
      if (map[pid]) {
        map[pid].matches_played += 1;
        map[pid].wins += 1;
        map[pid].points += 5;
      }
    });
    // Add matches played and losses to losers
    if (loseTeam) {
      [loseTeam.player1_id, loseTeam.player2_id].forEach(pid => {
        if (map[pid]) {
          map[pid].matches_played += 1;
          map[pid].losses += 1;
        }
      });
    }
  });
  Object.values(map).forEach(p => {
    p.win_pct = p.matches_played ? Math.round((p.wins / p.matches_played) * 100) : 0;
  });
  return Object.values(map);
}

function computeTeamStats() {
  // Team stats
  const map = {};
  teams.forEach(t => {
    map[t.id] = {
      team_id: t.id,
      team_name: teamIdToNames(t.id),
      matches_played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      win_pct: 0
    };
  });
  matches.forEach(m => {
    if (!m.winner_team_id) return;
    if (map[m.team_a_id]) map[m.team_a_id].matches_played += 1;
    if (map[m.team_b_id]) map[m.team_b_id].matches_played += 1;
    if (map[m.winner_team_id]) {
      map[m.winner_team_id].wins += 1;
      map[m.winner_team_id].points += 10; // 5 per player, 10 per team
    }
    const loserId = m.team_a_id === m.winner_team_id ? m.team_b_id : m.team_a_id;
    if (map[loserId]) map[loserId].losses += 1;
  });
  Object.values(map).forEach(t => {
    t.win_pct = t.matches_played ? Math.round((t.wins / t.matches_played) * 100) : 0;
  });
  return Object.values(map);
}

function sortStandings(arr) {
  arr.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name ? a.name.localeCompare(b.name) : a.team_name.localeCompare(b.team_name);
  });
}

function renderLeaderboard(standings) {
  const tbody = document.querySelector('#leaderboardTable tbody');
  tbody.innerHTML = '';
  standings.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.matches_played}</td>
      <td>${p.wins}</td>
      <td>${p.losses}</td>
      <td>${p.points}</td>
      <td>${p.win_pct}%</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPlayerFilter(standings) {
  const sel = document.getElementById('playerFilter');
  sel.innerHTML = '<option value="all">All players</option>' + standings.map(p => `<option value="${p.player_id}">${p.name}</option>`).join('');
}

function renderMatches(filterPlayer = 'all') {
  const ul = document.getElementById('matches');
  ul.innerHTML = '';
  let filtered = matches;
  if (filterPlayer !== 'all') {
    filtered = matches.filter(m => {
      const tA = teams.find(t => t.id === m.team_a_id);
      const tB = teams.find(t => t.id === m.team_b_id);
      return (tA && (tA.player1_id === filterPlayer || tA.player2_id === filterPlayer)) ||
             (tB && (tB.player1_id === filterPlayer || tB.player2_id === filterPlayer));
    });
  }
  filtered.sort((a, b) => (a.date || '').localeCompare(b.date));
  filtered.forEach(m => {
    const li = document.createElement('li');
    li.className = 'match-item';
    const aTeam = teamIdToNames(m.team_a_id);
    const bTeam = teamIdToNames(m.team_b_id);
    const winner = teamIdToNames(m.winner_team_id);
    li.innerHTML = `
      <div>
        <div><strong>${m.date || ''}</strong></div>
        <div style="margin-top:6px">${aTeam} <strong>vs</strong> ${bTeam}</div>
        <div class="match-meta">Score: ${m.score || '-'} — Winner: ${winner || '-'}</div>
      </div>
      <div class="match-meta">${m.notes || ''}</div>
    `;
    ul.appendChild(li);
  });
}

function renderPlayerSummary(playerId) {
  if (!playerId || playerId === 'all') {
    document.getElementById('playerSummary').hidden = true;
    return;
  }
  const p = computePlayerStats().find(x => x.player_id == playerId);
  if (!p) return;
  document.getElementById('playerSummary').hidden = false;
  document.getElementById('playerName').textContent = p.name + ' — Summary';
  document.getElementById('playerStats').innerHTML = `
    <ul>
      <li>Matches played: ${p.matches_played}</li>
      <li>Wins: ${p.wins}</li>
      <li>Losses: ${p.losses}</li>
      <li>Points: ${p.points}</li>
      <li>Win %: ${p.win_pct}%</li>
    </ul>
  `;
}

// --- main load ---
async function loadAll() {
  try {
    document.getElementById('refreshBtn').disabled = true;
    // fetch players, teams, matches from Supabase
    const { data: pData, error: pErr } = await supabase.from('players').select('*');
    if (pErr) throw pErr;
    players = pData;
    const { data: tData, error: tErr } = await supabase.from('teams').select('*');
    if (tErr) throw tErr;
    teams = tData;
    const { data: mData, error: mErr } = await supabase.from('matches').select('*');
    if (mErr) throw mErr;
    matches = mData;
    const standings = computePlayerStats();
    sortStandings(standings);
    renderLeaderboard(standings);
    renderPlayerFilter(standings);
    renderMatches();
  } catch (err) {
    alert('Error loading data: ' + err.message);
    console.error(err);
  } finally {
    document.getElementById('refreshBtn').disabled = false;
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadAll);
document.getElementById('playerFilter').addEventListener('change', (e) => {
  const pid = e.target.value;
  renderMatches(pid);
  renderPlayerSummary(pid);
});

document.getElementById('openSheetBtn').addEventListener('click', () => {
  window.open('https://app.supabase.com/project', '_blank');
});

// initial load
loadAll();
