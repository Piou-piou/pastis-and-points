import io from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const socket = io(API_URL);

export const api = {
  async getTournament(id: string) {
    const res = await fetch(`${API_URL}/tournaments/${id}`);
    return res.json();
  },
  async createTournament(organizer_id: string, max_teams: number) {
    const res = await fetch(`${API_URL}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizer_id, max_teams })
    });
    return res.json();
  },
  async updateTournament(id: string, updates: any) {
    const res = await fetch(`${API_URL}/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  async getTeams(tournament_id: string) {
    const res = await fetch(`${API_URL}/teams?tournament_id=${tournament_id}`);
    return res.json();
  },
  async addTeam(tournament_id: string, name: string, creator_id: string) {
    if (!creator_id) {
      console.error('addTeam error: creator_id is missing');
      throw new Error('Identifiant utilisateur manquant. Veuillez rafraîchir la page.');
    }
    const res = await fetch(`${API_URL}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournament_id, name, creator_id })
    });
    return res.json();
  },
  async updateTeam(id: string, name: string, user_id: string) {
    const res = await fetch(`${API_URL}/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, user_id })
    });
    return res.json();
  },
  async deleteTeam(id: string, user_id: string) {
    const res = await fetch(`${API_URL}/teams/${id}?user_id=${user_id}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  async getMatches(tournament_id: string) {
    const res = await fetch(`${API_URL}/matches?tournament_id=${tournament_id}`);
    return res.json();
  },
  async createMatchesBulk(matches: any[]) {
    const res = await fetch(`${API_URL}/matches/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches })
    });
    return res.json();
  },
  async updateMatch(id: string, updates: any) {
    const res = await fetch(`${API_URL}/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  }
};
