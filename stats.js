// stats.js: logic for the stats page
let players = [], matches = [];
async function loadStats(){
  try{
    players = await fetchCSV(PLAYERS_CSV_URL);
    matches = await fetchCSV(MATCHES_CSV_URL);
    let standings = computeStats(players, matches);
    sortStandings(standings);
    renderPlayerStats(standings);
    renderMatchdayStats(matches, players);
  }catch(err){
    document.getElementById('playerStatsSection').innerHTML = '<div class="error">Failed to load data</div>';
    document.getElementById('matchdayStatsSection').innerHTML = '';
  }
}
function renderPlayerStats(standings){
  let html = '<table class="player-table"><thead><tr><th>#</th><th>Player</th><th>MP</th><th>W</th><th>L</th><th>D</th><th>Pts</th><th>Win %</th></tr></thead><tbody>';
  standings.forEach((p,i)=>{
    html += `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.matches_played}</td><td>${p.wins}</td><td>${p.losses}</td><td>${p.draws}</td><td>${p.points % 1 === 0 ? p.points : p.points.toFixed(1)}</td><td>${p.win_pct}%</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('playerStatsSection').innerHTML = html;
}
function renderMatchdayStats(matches, players){
  let html = '<ul class="match-list">';
  matches.sort((a,b)=> (a.date||'').localeCompare(b.date));
  matches.forEach(m => {
    const aTeam = splitTeam(m.team_a||'').map(id=>{
      const p = players.find(x=>x.player_id===id); return p?p.name:id;
    }).join(' + ');
    const bTeam = splitTeam(m.team_b||'').map(id=>{
      const p = players.find(x=>x.player_id===id); return p?p.name:id;
    }).join(' + ');
    html += `<li><strong>${m.date||''}</strong> — <span>${aTeam} <b>vs</b> ${bTeam}</span> | Score: ${m.score||'-'} | Winner: ${m.winner||'-'}</li>`;
  });
  html += '</ul>';
  document.getElementById('matchdayStatsSection').innerHTML = html;
}
window.addEventListener('DOMContentLoaded', loadStats);
