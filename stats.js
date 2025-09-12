// stats.js: Individual player and team stats page for Badminton Tournament Tracker
const SUPABASE_URL = 'https://npdhqzlchdyydmwlfnnp.supabase.co';
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
    [winTeam.player1_id, winTeam.player2_id].forEach(pid => {
      if (map[pid]) {
        map[pid].matches_played += 1;
        map[pid].wins += 1;
        map[pid].points += 5;
      }
    });
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
      map[m.winner_team_id].points += 10;
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

function renderPlayerStats(standings) {
  const section = document.getElementById('playerStatsSection');
  let html = '<div class="player-cards">';
  standings.forEach((p, i) => {
    html += `<div class="player-card" data-player-id="${p.player_id}">
      <div class="player-rank">#${i + 1}</div>
      <div class="player-name">${p.name}</div>
      <div class="player-meta">MP: ${p.matches_played} | W: ${p.wins} | L: ${p.losses}</div>
      <div class="player-points">Points: <strong>${p.points}</strong></div>
      <div class="player-win">Win %: ${p.win_pct}%</div>
      <div class="player-details" style="display:none;"></div>
    </div>`;
  });
  html += '</div>';
  section.innerHTML = html;

  // Add click event listeners for expansion
  document.querySelectorAll('.player-card').forEach(card => {
    card.addEventListener('click', function(e) {
      // Prevent toggling if clicking inside details
      if (e.target.closest('.player-details')) return;
      const details = this.querySelector('.player-details');
      if (details.style.display === 'none' || details.style.display === '') {
        // Fill in details
        const pid = this.getAttribute('data-player-id');
        const player = standings.find(p => p.player_id == pid);
        details.innerHTML = `
          <div class="player-details-content">
            <hr style="margin:10px 0;">
            <div><strong>Matches Played:</strong> ${player.matches_played}</div>
            <div><strong>Wins:</strong> ${player.wins}</div>
            <div><strong>Losses:</strong> ${player.losses}</div>
            <div><strong>Points:</strong> ${player.points}</div>
            <div><strong>Win %:</strong> ${player.win_pct}%</div>
          </div>
        `;
        details.style.display = 'block';
        this.classList.add('expanded');
      } else {
        details.style.display = 'none';
        this.classList.remove('expanded');
      }
    });
  });
}

function renderTeamStats(standings) {
  const section = document.getElementById('teamStatsSection');
  let html = '<div class="team-cards">';
  standings.forEach((t, i) => {
    html += `<div class="team-card">
      <div class="team-rank">#${i + 1}</div>
      <div class="team-name">${t.team_name}</div>
      <div class="team-meta">MP: ${t.matches_played} | W: ${t.wins} | L: ${t.losses}</div>
      <div class="team-points">Points: <strong>${t.points}</strong></div>
      <div class="team-win">Win %: ${t.win_pct}%</div>
    </div>`;
  });
  html += '</div>';
  section.innerHTML = html;
}

async function loadStats() {
  try {
    const { data: pData, error: pErr } = await supabase.from('players').select('*');
    if (pErr) throw pErr;
    players = pData;
    const { data: tData, error: tErr } = await supabase.from('teams').select('*');
    if (tErr) throw tErr;
    teams = tData;
    const { data: mData, error: mErr } = await supabase.from('matches').select('*');
    if (mErr) throw mErr;
    matches = mData;
    const playerStats = computePlayerStats();
    sortStandings(playerStats);
    renderPlayerStats(playerStats);
    const teamStats = computeTeamStats();
    sortStandings(teamStats);
    renderTeamStats(teamStats);
  } catch (err) {
    document.getElementById('playerStatsSection').innerHTML = '<div class="error">Failed to load data</div>';
    document.getElementById('teamStatsSection').innerHTML = '';
    console.error(err);
  }
}

window.addEventListener('DOMContentLoaded', loadStats);
