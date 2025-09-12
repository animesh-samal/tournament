// tournament.js: shared logic for data fetching, parsing, and stats
// const PLAYERS_CSV_URL = "YOUR_PLAYERS_CSV_URL";
// const MATCHES_CSV_URL = "YOUR_MATCHES_CSV_URL";
// const DEFAULT_WIN_POINTS = 3;

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

function splitTeam(teamStr){
  if(!teamStr) return [];
  return teamStr.split('|').map(s=>s.trim()).filter(Boolean);
}

function computeStats(players, matches){
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
    const winner = (m.winner||'').trim().toLowerCase();
    const pointsForWin = Number(m.win_points || DEFAULT_WIN_POINTS) || DEFAULT_WIN_POINTS;
    function award(team, pts, isWin=false, isDraw=false){
      const per = pts / Math.max(1, team.length);
      team.forEach(pid => {
        if(!map[pid]) return;
        map[pid].matches_played += 1;
        map[pid].points += per;
        if(isWin) { map[pid].wins += 1; map[pid].match_diff += 1; }
        else if(isDraw) { map[pid].draws += 1; }
        else { map[pid].losses += 1; map[pid].match_diff -= 1; }
      });
    }
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
      award(teamA,0,false,false);
      award(teamB,0,false,false);
    }
  });
  Object.values(map).forEach(p=>{
    p.win_pct = p.matches_played ? Math.round((p.wins / p.matches_played)*100) : 0;
  });
  return Object.values(map);
}

function sortStandings(arr){
  arr.sort((a,b)=>{
    if(b.points !== a.points) return b.points - a.points;
    if(b.match_diff !== a.match_diff) return b.match_diff - a.match_diff;
    if(b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });
}
