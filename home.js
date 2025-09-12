// home.js: logic for the fancy home page
let players = [], matches = [];
async function loadHome(){
  try{
    players = await fetchCSV(PLAYERS_CSV_URL);
    matches = await fetchCSV(MATCHES_CSV_URL);
    let standings = computeStats(players, matches);
    sortStandings(standings);
    renderLeaderboard(standings);
  }catch(err){
    document.getElementById('leaderboardSection').innerHTML = '<div class="error">Failed to load data</div>';
  }
}
function renderLeaderboard(standings){
  let html = '<table class="leaderboard-table"><thead><tr><th>#</th><th>Player</th><th>MP</th><th>W</th><th>L</th><th>Pts</th><th>Win %</th></tr></thead><tbody>';
  standings.forEach((p,i)=>{
    html += `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.matches_played}</td><td>${p.wins}</td><td>${p.losses}</td><td>${p.points % 1 === 0 ? p.points : p.points.toFixed(1)}</td><td>${p.win_pct}%</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('leaderboardSection').innerHTML = html;
}
window.addEventListener('DOMContentLoaded', loadHome);
