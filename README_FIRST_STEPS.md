Badminton Tournament Tracker — Quick README

1) Google Sheets setup (one spreadsheet with three tabs):
   - Players (header row exactly):
     player_id,name,photo_url,notes
   - Matches (header row exactly):
     match_id,date,stage,match_type,team_a,team_b,score,winner,notes,win_points,draw_points
     - team_a/team_b: singles = P1, doubles = P1|P2
     - winner: use 'team_a' or 'team_b' (or player id for singles)
   - SeasonConfig (optional): for future use

2) Publish sheets to the web:
   - File -> Publish to the web -> choose sheet (Players) -> format CSV -> Publish -> copy link
   - Do the same for Matches sheet
   - The public CSV URL will look like:
     https://docs.google.com/spreadsheets/d/<SHEET_ID>/pub?output=csv&gid=<GID>

3) Replace the two placeholders in app.js:
   - PLAYERS_CSV_URL and MATCHES_CSV_URL
   - Replace sheetUrl in the openSheetBtn handler with the edit URL of your sheet

4) Local testing:
   - Open index.html in browser OR
   - Install Live Server VS Code extension and right-click index.html -> Open with Live Server

5) Deploy to GitHub Pages:
   - Create repo on GitHub (name: badminton-tracker)
   - In terminal:
       git init
       git add .
       git commit -m "Initial site"
       git branch -M main
       git remote add origin https://github.com/<your-user>/badminton-tracker.git
       git push -u origin main
   - On GitHub: Settings -> Pages -> Set source to main branch (root) -> Save
   - Wait a minute: site will be at https://<your-user>.github.io/badminton-tracker/

6) Admin workflow:
   - After each matchday, add rows to Matches sheet, Publish updates remain visible.
   - On the site, click "Refresh data" to fetch latest CSV and recalc.
