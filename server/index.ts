import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './db';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

// Socket.io for Realtime
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-tournament', (tournamentId: string) => {
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on('join-match', (matchId: string) => {
    socket.join(`match:${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Helper to notify changes
const notifyTournament = (id: string, type: string, data: any) => {
  io.to(`tournament:${id}`).emit('tournament-update', { type, data });
};

const notifyMatch = (id: string, tournamentId: string, type: string, data: any) => {
  io.to(`match:${id}`).emit('match-update', { type, data });
  io.to(`tournament:${tournamentId}`).emit('tournament-update', { type: 'match-updated', data });
};

// --- API Endpoints ---

// Tournaments
app.get('/tournaments/:id', async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.execute('SELECT * FROM tournaments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tournaments', async (req: Request, res: Response) => {
  console.log('POST /tournaments body:', req.body);
  const { organizer_id, max_teams } = req.body;
  const id = uuidv4();
  try {
    await pool.execute(
      'INSERT INTO tournaments (id, organizer_id, max_teams) VALUES (?, ?, ?)',
      [id, organizer_id, max_teams]
    );
    res.json({ id, organizer_id, max_teams, status: 'registration' });
  } catch (err: any) {
    console.error('Error in POST /tournaments:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/tournaments/:id', async (req: Request, res: Response) => {
  const { status } = req.body;
  try {
    await pool.execute('UPDATE tournaments SET status = ? WHERE id = ?', [status, req.params.id]);
    notifyTournament(req.params.id, 'tournament-patch', { status });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// Teams
app.get('/teams', async (req: Request, res: Response) => {
  const tournament_id = req.query.tournament_id as string;
  try {
    const [rows] = await pool.execute('SELECT * FROM teams WHERE tournament_id = ?', [tournament_id]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/teams', async (req: Request, res: Response) => {
  console.log('POST /teams body:', req.body);
  const { tournament_id, name, creator_id } = req.body;
  
  if (!creator_id) {
    console.error('ERROR: creator_id is missing from request body');
    return res.status(400).json({ error: 'creator_id is required' });
  }

  const id = uuidv4();
  try {
    await pool.execute(
      'INSERT INTO teams (id, tournament_id, creator_id, name) VALUES (?, ?, ?, ?)',
      [id, tournament_id, creator_id, name]
    );
    notifyTournament(tournament_id, 'team-added', { id, tournament_id, creator_id, name });
    res.json({ id, tournament_id, creator_id, name });
  } catch (err: any) {
    console.error('Error in POST /teams:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/teams/:id', async (req: Request, res: Response) => {
  const { name, user_id } = req.body;
  try {
    const [rows]: any = await pool.execute('SELECT creator_id, tournament_id FROM teams WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Team not found' });

    if (rows[0].creator_id !== user_id) {
      return res.status(403).json({ error: 'Only creator can edit team' });
    }

    await pool.execute('UPDATE teams SET name = ? WHERE id = ?', [name, req.params.id]);
    notifyTournament(rows[0].tournament_id, 'team-updated', { id: req.params.id, name });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/teams/:id', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  try {
    const [rows]: any = await pool.execute(`
      SELECT t.creator_id, t.tournament_id, tr.organizer_id 
      FROM teams t
      JOIN tournaments tr ON t.tournament_id = tr.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (rows.length > 0) {
      const { creator_id, tournament_id, organizer_id } = rows[0];

      // Permission check: admin of tournament OR creator of team
      if (user_id !== organizer_id && user_id !== creator_id) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      await pool.execute('DELETE FROM teams WHERE id = ?', [req.params.id]);
      notifyTournament(tournament_id, 'team-removed', { id: req.params.id });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Matches
app.get('/matches', async (req: Request, res: Response) => {
  const tournament_id = req.query.tournament_id as string;
  try {
    const [rows] = await pool.execute(`
      SELECT m.*, t1.creator_id as team1_creator_id, t2.creator_id as team2_creator_id
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE m.tournament_id = ? 
      ORDER BY round ASC, match_index ASC
    `, [tournament_id]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/matches-single/:id', async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.execute(`
      SELECT m.*, 
             t1.name as team1_name, t1.creator_id as team1_creator_id,
             t2.name as team2_name, t2.creator_id as team2_creator_id
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE m.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/matches/bulk', async (req: Request, res: Response) => {
  const { matches } = req.body;
  try {
    const results = [];
    for (const m of matches) {
      const id = uuidv4();
      await pool.execute(
        'INSERT INTO matches (id, tournament_id, round, match_index, team1_id, team2_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, m.tournament_id, m.round, m.match_index, m.team1_id, m.team2_id, m.status || 'waiting']
      );
      results.push({ ...m, id });
    }
    if (matches.length > 0) notifyTournament(matches[0].tournament_id, 'matches-created', results);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/matches/:id', async (req: Request, res: Response) => {
  const updates = req.body;
  console.log(`PATCH /matches/${req.params.id} updates:`, updates);
  
  try {
    // 1. Get current match state
    const [rows]: any = await pool.execute('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    
    const currentMatch = rows[0];
    console.log(`Current match state: round=${currentMatch.round}, index=${currentMatch.match_index}, status=${currentMatch.status}`);
    
    // 2. Automatic victory detection (Score >= 13)
    const team1Score = updates.team1_score !== undefined ? updates.team1_score : currentMatch.team1_score;
    const team2Score = updates.team2_score !== undefined ? updates.team2_score : currentMatch.team2_score;
    
    let justFinished = false;
    if (currentMatch.status !== 'finished' && (updates.status === 'finished' || team1Score >= 13 || team2Score >= 13)) {
      updates.status = 'finished';
      if (!updates.winner_id) {
        updates.winner_id = team1Score >= 13 ? currentMatch.team1_id : currentMatch.team2_id;
      }
      justFinished = true;
      console.log(`Match just finished! Winner: ${updates.winner_id}`);
    }

    // 3. Perform the update
    if (Object.keys(updates).length > 0) {
      const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      await pool.execute(`UPDATE matches SET ${fields} WHERE id = ?`, [...values, req.params.id] as any[]);
    }
    
    // 4. Handle Tournament Progression
    // Progression should happen if it just finished OR if it was already finished but we are force-updating winner (rare)
    if (justFinished && updates.winner_id) {
      const nextRound = currentMatch.round + 1;
      const nextMatchIndex = Math.floor(currentMatch.match_index / 2);
      const isTeam1 = currentMatch.match_index % 2 === 0;

      console.log(`Looking for next match: round=${nextRound}, index=${nextMatchIndex}`);

      // Find next match in tournament
      const [nextRows]: any = await pool.execute(
        'SELECT id FROM matches WHERE tournament_id = ? AND round = ? AND match_index = ?',
        [currentMatch.tournament_id, nextRound, nextMatchIndex]
      );

      if (nextRows.length > 0) {
        const nextMatchId = nextRows[0].id;
        const updateField = isTeam1 ? 'team1_id' : 'team2_id';
        console.log(`Updating next match ${nextMatchId}: ${updateField}=${updates.winner_id}`);
        
        await pool.execute(
          `UPDATE matches SET ${updateField} = ? WHERE id = ?`,
          [updates.winner_id, nextMatchId]
        );
        // Notify about next match update
        notifyMatch(nextMatchId, currentMatch.tournament_id, 'match-updated', { 
          id: nextMatchId, 
          [updateField]: updates.winner_id 
        });
      } else {
        console.log('No next match found. Checking if tournament is finished...');
        // No next match = Final match finished
        const [maxRoundRow]: any = await pool.execute(
          'SELECT MAX(round) as max_round FROM matches WHERE tournament_id = ?',
          [currentMatch.tournament_id]
        );
        
        if (maxRoundRow[0].max_round === currentMatch.round) {
          console.log('Tournament FINISHED!');
          await pool.execute(
            'UPDATE tournaments SET status = ? WHERE id = ?',
            ['finished', currentMatch.tournament_id]
          );
          notifyTournament(currentMatch.tournament_id, 'tournament-patch', { status: 'finished' });
        }
      }
    }

    notifyMatch(req.params.id, currentMatch.tournament_id, 'match-updated', { id: req.params.id, ...updates });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error in PATCH /matches/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
