import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Tournament, TournamentTeam, Match } from '../types/tournament';

interface TournamentBracketScreenProps {
  tournamentId: string;
  onLaunchMatch: (matchId: string) => void;
  onBack: () => void;
}

export default function TournamentBracketScreen({ tournamentId, onLaunchMatch, onBack }: TournamentBracketScreenProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchInitialData();

    const tournamentSub = supabase
      .channel('tournament-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` }, (payload) => {
        setTournament(payload.new as Tournament);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${tournamentId}` }, () => {
        fetchTeams();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentSub);
    };
  }, [tournamentId]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchTournament(), fetchTeams(), fetchMatches()]);
    setLoading(false);
  };

  const fetchTournament = async () => {
    const { data } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
    if (data) setTournament(data);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId);
    if (data) setTeams(data);
  };

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true }).order('match_index', { ascending: true });
    if (data) setMatches(data);
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const generateBracket = async () => {
    if (!tournament || teams.length < 2) return;
    setStarting(true);
    try {
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const numRounds = Math.ceil(Math.log2(tournament.max_teams));
      const matchEntries = [];

      // Create all match placeholders first
      for (let r = 0; r < numRounds; r++) {
        const numMatchesInRound = Math.pow(2, numRounds - r - 1);
        for (let i = 0; i < numMatchesInRound; i++) {
          matchEntries.push({
            tournament_id: tournamentId,
            round: r,
            match_index: i,
            team1_id: null,
            team2_id: null,
            status: 'waiting'
          });
        }
      }

      const { data: createdMatches, error: matchError } = await supabase
        .from('matches')
        .insert(matchEntries)
        .select();

      if (matchError) throw matchError;

      // Fill first round and handle "byes"
      const firstRoundMatches = (createdMatches || []).filter(m => m.round === 0).sort((a, b) => a.match_index - b.match_index);
      
      for (let i = 0; i < firstRoundMatches.length; i++) {
        const match = firstRoundMatches[i];
        const team1 = shuffledTeams[i * 2] || null;
        const team2 = shuffledTeams[i * 2 + 1] || null;

        if (team1 && !team2) {
          // Automatic winner for bye
          await supabase.from('matches').update({
            team1_id: team1.id,
            winner_id: team1.id,
            status: 'finished'
          }).eq('id', match.id);

          // Move to next round
          const nextMatchIndex = Math.floor(match.match_index / 2);
          const isTeam1 = match.match_index % 2 === 0;
          const nextMatch = (createdMatches || []).find(m => m.round === 1 && m.match_index === nextMatchIndex);
          
          if (nextMatch) {
            await supabase.from('matches').update({
              [isTeam1 ? 'team1_id' : 'team2_id']: team1.id
            }).eq('id', nextMatch.id);
          }
        } else {
          await supabase.from('matches').update({
            team1_id: team1?.id || null,
            team2_id: team2?.id || null,
          }).eq('id', match.id);
        }
      }

      await supabase.from('tournaments').update({ status: 'in_progress' }).eq('id', tournamentId);
    } catch (error) {
      console.error('Error starting tournament:', error);
      alert('Erreur lors du lancement');
    } finally {
      setStarting(false);
    }
  };

  const getWinner = () => {
    if (tournament?.status !== 'finished') return null;
    const numRounds = Math.ceil(Math.log2(tournament?.max_teams || 2));
    const finalMatch = matches.find(m => m.round === numRounds - 1);
    return teams.find(t => t.id === finalMatch?.winner_id);
  };

  const winner = getWinner();

  const getTeamName = (id: string | null) => {
    if (!id) return 'À définir';
    return teams.find(t => t.id === id)?.name || 'Inconnu';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#27AE60" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  const isRegistration = tournament?.status === 'registration';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>✕ Quitter</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tableau du Concours</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerLabel}>🏆 Grand Vainqueur 🏆</Text>
            <Text style={styles.winnerName}>{winner.name}</Text>
          </View>
        )}

        {isRegistration ? (
          <View style={styles.registrationContainer}>
            <Text style={styles.infoTitle}>Inscriptions en cours</Text>
            <Text style={styles.infoText}>{teams.length} / {tournament?.max_teams} équipes</Text>
            
            <View style={styles.teamList}>
              {teams.map((team, idx) => (
                <View key={team.id} style={styles.teamRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={styles.teamNumber}>{idx + 1}.</Text>
                    <Text style={styles.teamNameText}>{team.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteTeam(team.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {teams.length >= 2 && (
              <TouchableOpacity 
                style={[styles.button, starting && styles.buttonDisabled]} 
                onPress={generateBracket}
                disabled={starting}
              >
                <Text style={styles.buttonText}>{starting ? 'Lancement...' : 'Lancer le concours'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.bracketContainer}>
            {Array.from({ length: Math.ceil(Math.log2(tournament?.max_teams || 2)) }).map((_, r) => (
              <View key={r} style={styles.roundColumn}>
                <Text style={styles.roundTitle}>{r === 0 ? 'Premier tour' : r === 1 ? 'Demi-finales' : 'Finale'}</Text>
                {matches.filter(m => m.round === r).map(match => (
                  <TouchableOpacity 
                    key={match.id} 
                    style={[
                      styles.matchCard, 
                      match.status === 'finished' && styles.matchFinished,
                      match.status === 'in_progress' && styles.matchInProgress
                    ]}
                    onPress={() => {
                      if (match.team1_id && match.team2_id && match.status !== 'finished') {
                        onLaunchMatch(match.id);
                      }
                    }}
                    disabled={!match.team1_id || !match.team2_id || match.status === 'finished'}
                  >
                    <View style={styles.matchTeam}>
                      <Text style={[styles.matchTeamName, match.winner_id === match.team1_id && styles.winner]}>
                        {getTeamName(match.team1_id)}
                      </Text>
                      <Text style={styles.matchScore}>{match.team1_score}</Text>
                    </View>
                    <View style={styles.matchDivider} />
                    <View style={styles.matchTeam}>
                      <Text style={[styles.matchTeamName, match.winner_id === match.team2_id && styles.winner]}>
                        {getTeamName(match.team2_id)}
                      </Text>
                      <Text style={styles.matchScore}>{match.team2_score}</Text>
                    </View>
                    {match.status === 'waiting' && match.team1_id && match.team2_id && (
                      <Text style={styles.launchHint}>Appuyez pour lancer</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(26, 26, 26)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backText: {
    color: '#BDC3C7',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
  },
  registrationContainer: {
    alignItems: 'center',
  },
  infoTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 5,
  },
  infoText: {
    color: '#BDC3C7',
    fontSize: 18,
    marginBottom: 30,
  },
  teamList: {
    width: '100%',
    marginBottom: 40,
  },
  teamRow: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  teamNumber: {
    color: '#27AE60',
    fontWeight: '800',
    marginRight: 10,
    fontSize: 18,
  },
  teamNameText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(230, 57, 70, 0.2)',
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#E63946',
    fontSize: 12,
    fontWeight: '700',
  },
  winnerBanner: {
    backgroundColor: '#F1C40F',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#F1C40F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  winnerLabel: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },
  winnerName: {
    color: '#000',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#27AE60',
    paddingVertical: 18,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bracketContainer: {
    flex: 1,
  },
  roundColumn: {
    marginBottom: 40,
  },
  roundTitle: {
    color: '#27AE60',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  matchCard: {
    backgroundColor: '#333',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#7F8C8D',
  },
  matchFinished: {
    opacity: 0.7,
    borderLeftColor: '#27AE60',
  },
  matchInProgress: {
    borderLeftColor: '#E67E22',
    backgroundColor: '#3d3d3d',
  },
  matchTeam: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  matchTeamName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  winner: {
    color: '#27AE60',
    fontWeight: '800',
  },
  matchScore: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  matchDivider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 10,
  },
  launchHint: {
    color: '#BDC3C7',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  }
});
