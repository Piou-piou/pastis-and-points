import io from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const MERCURE_URL = process.env.EXPO_PUBLIC_MERCURE_URL || 'http://localhost:3001/.well-known/mercure';

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<(data: any) => void> = new Set();

  subscribe(topic: string, callback: (data: any) => void) {
    const url = new URL(MERCURE_URL);
    url.searchParams.append('topic', topic);
    
    this.eventSource = new EventSource(url.toString());
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
  }

  unsubscribe() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const realtime = new RealtimeClient();

// Legacy socket mock for compatibility or gradual migration
export const socket = {
  emit: () => {},
  on: (event: string, callback: any) => {
    // We'll handle this in the screens directly with the new realtime client
  },
  off: () => {}
};

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    return res.json();
  },
  async register(email: string, password: string) {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }
    return res.json();
  },
  async updateProfile(id: string, updates: { name?: string, email?: string, password?: string }) {
    const res = await fetch(`${API_URL}/profile/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Update failed');
    }
    return res.json();
  },
  async getTournament(id: string) {
    const res = await fetch(`${API_URL}/tournaments/${id}`);
    return res.json();
  },
  async getMyTournaments(userId: string) {
    const res = await fetch(`${API_URL}/my-tournaments/${userId}`);
    return res.json();
  },
  async createTournament(organizer_id: string, max_teams: number, type: string = 'bracket') {
    const res = await fetch(`${API_URL}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizer_id, max_teams, type })
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
  async getMatch(id: string) {
    const res = await fetch(`${API_URL}/matches/${id}`);
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
  async clearMatches(tournament_id: string) {
    const res = await fetch(`${API_URL}/matches?tournament_id=${tournament_id}`, {
      method: 'DELETE'
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
  },
  async generateTournament(id: string) {
    const res = await fetch(`${API_URL}/tournaments/${id}/generate`, {
      method: 'POST'
    });
    return res.json();
  },
  async finishMatch(id: string, winner_id: string) {
    const res = await fetch(`${API_URL}/matches/${id}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner_id })
    });
    return res.json();
  }
};
