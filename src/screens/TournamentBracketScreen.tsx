import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { api, socket } from '../lib/api';
import { Tournament, TournamentTeam, Match } from '../types/tournament';

interface TournamentBracketScreenProps {
  userId: string;
  tournamentId: string;
  onLaunchMatch: (matchId: string) => void;
  onBack: () => void;
}

export default function TournamentBracketScreen({ userId, tournamentId, onLaunchMatch, onBack }: TournamentBracketScreenProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchInitialData();

    socket.emit('join-tournament', tournamentId);

    socket.on('tournament-update', (payload) => {
      if (payload.type === 'tournament-patch') {
        setTournament(prev => prev ? ({ ...prev, ...payload.data }) : null);
      } else if (payload.type === 'team-added' || payload.type === 'team-removed' || payload.type === 'team-updated') {
        fetchTeams();
      } else if (payload.type === 'matches-created' || payload.type === 'match-updated') {
        fetchMatches();
      }
    });

    return () => {
      socket.off('tournament-update');
    };
  }, [tournamentId]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchTournament(), fetchTeams(), fetchMatches()]);
    setLoading(false);
  };

  const fetchTournament = async () => {
    const data = await api.getTournament(tournamentId);
    if (data) setTournament(data);
  };

  const fetchTeams = async () => {
    const data = await api.getTeams(tournamentId);
    if (data) setTeams(data);
  };

  const fetchMatches = async () => {
    const data = await api.getMatches(tournamentId);
    if (data) setMatches(data);
  };

  const deleteTeam = async (teamId: string) => {
    try {
      await api.deleteTeam(teamId, userId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const editTeam = async (team: TournamentTeam) => {
    const newName = prompt('Nouveau nom de l\'équipe:', team.name);
    if (newName && newName !== team.name) {
      try {
        await api.updateTeam(team.id, newName, userId);
        fetchTeams();
      } catch (error) {
        console.error('Error updating team:', error);
        alert('Erreur lors de la modification');
      }
    }
  };

  const generateBracket = async () => {
    setStarting(true);
    try {
      // 0. Force refresh of EVERYTHING before generating
      const [latestTournament, latestTeams] = await Promise.all([
        api.getTournament(tournamentId),
        api.getTeams(tournamentId)
      ]);
      
      setTournament(latestTournament);
      setTeams(latestTeams);
      
      if (latestTeams.length < 2) {
        alert("Il faut au moins 2 équipes pour lancer le concours.");
        return;
      }

      console.log(`Generating ${latestTournament.type} for ${latestTeams.length} teams`);
      
      // 1. Clear existing matches
      await api.clearMatches(tournamentId);

      const shuffledTeams = [...latestTeams].sort(() => Math.random() - 0.5);
      const matchEntries = [];

      if (latestTournament.type === 'round_robin') {
        // --- Round Robin Logic ---
        // Formula: n * (n-1) / 2 matches. For 3 teams: 3*2/2 = 3 matches.
        for (let i = 0; i < shuffledTeams.length; i++) {
          for (let j = i + 1; j < shuffledTeams.length; j++) {
            matchEntries.push({
              tournament_id: tournamentId,
              round: 0,
              match_index: matchEntries.length,
              team1_id: shuffledTeams[i].id,
              team2_id: shuffledTeams[j].id,
              status: 'waiting'
            });
          }
        }
        console.log(`RR: Created ${matchEntries.length} matches`);
        await api.createMatchesBulk(matchEntries);
      } else {
        // --- Bracket Logic ---
        const actualTeamCount = shuffledTeams.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(actualTeamCount)));
        const numRounds = Math.log2(bracketSize);

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

        const createdMatches = await api.createMatchesBulk(matchEntries);
        const firstRoundMatches = (createdMatches || []).filter((m: any) => m.round === 0).sort((a: any, b: any) => a.match_index - b.match_index);
        
        for (let i = 0; i < firstRoundMatches.length; i++) {
          const match = firstRoundMatches[i];
          const team1 = shuffledTeams[i * 2] || null;
          const team2 = shuffledTeams[i * 2 + 1] || null;

          if (team1 && !team2) {
            await api.updateMatch(match.id, {
              team1_id: team1.id,
              team2_id: null,
              winner_id: team1.id,
              status: 'finished',
              tournament_id: tournamentId
            });

            const nextMatchIndex = Math.floor(match.match_index / 2);
            const isTeam1 = match.match_index % 2 === 0;
            const nextMatch = (createdMatches || []).find((m: any) => m.round === 1 && m.match_index === nextMatchIndex);
            if (nextMatch) {
              await api.updateMatch(nextMatch.id, {
                [isTeam1 ? 'team1_id' : 'team2_id']: team1.id,
                tournament_id: tournamentId
              });
            }
          } else {
            await api.updateMatch(match.id, {
              team1_id: team1?.id || null,
              team2_id: team2?.id || null,
              tournament_id: tournamentId
            });
          }
        }
      }

      await api.updateTournament(tournamentId, { status: 'in_progress' });
      await fetchMatches();
    } catch (error) {
      console.error('Error starting tournament:', error);
      alert('Erreur lors du lancement');
    } finally {
      setStarting(false);
    }
  };

  const handleManualFinish = async (matchId: string, winnerId: string) => {
    try {
      setLoading(true);
      console.log('Manual finish for match:', matchId, 'winner:', winnerId);
      
      // 1. Get match details
      const allMatches = await api.getMatches(tournamentId);
      const match = allMatches.find((m: Match) => m.id === matchId);
      if (!match) return;

      // 2. Update current match
      await api.updateMatch(matchId, {
        status: 'finished',
        winner_id: winnerId,
        team1_score: winnerId === match.team1_id ? 13 : 0,
        team2_score: winnerId === match.team2_id ? 13 : 0,
        tournament_id: tournamentId
      });

      // 3. Handle progression
      if (tournament?.type === 'bracket') {
        const nextRound = match.round + 1;
        const nextMatchIndex = Math.floor(match.match_index / 2);
        const isTeam1Slot = match.match_index % 2 === 0;

        const nextMatch = allMatches.find((m: Match) => m.round === nextRound && m.match_index === nextMatchIndex);

        if (nextMatch) {
          await api.updateMatch(nextMatch.id, {
            [isTeam1Slot ? 'team1_id' : 'team2_id']: winnerId,
            tournament_id: tournamentId
          });
        } else {
          const maxRound = Math.max(...allMatches.map((m: Match) => m.round));
          if (match.round === maxRound) {
            await api.updateTournament(tournamentId, { status: 'finished' });
          }
        }
      } else {
        // Round Robin: Check if all finished
        const allFinished = allMatches.every((m: Match) => m.id === matchId ? true : m.status === 'finished');
        if (allFinished) {
          await api.updateTournament(tournamentId, { status: 'finished' });
        }
      }
      
      await fetchMatches();
    } catch (error) {
      console.error('Error manual finishing:', error);
      alert('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const getWinner = () => {
    if (tournament?.status !== 'finished') return null;
    const numRounds = Math.ceil(Math.log2(tournament?.max_teams || 2));
    const finalMatch = matches.find(m => m.round === numRounds - 1);
    return teams.find(t => t.id === finalMatch?.winner_id);
  };

  const winner = getWinner();

  const getStandings = () => {
    const stats: Record<string, { id: string, name: string, played: number, won: number, pointsFor: number, pointsAgainst: number }> = {};
    
    teams.forEach(team => {
      stats[team.id] = { id: team.id, name: team.name, played: 0, won: 0, pointsFor: 0, pointsAgainst: 0 };
    });

    matches.filter(m => m.status === 'finished').forEach(match => {
      if (match.team1_id && stats[match.team1_id]) {
        stats[match.team1_id].played++;
        stats[match.team1_id].pointsFor += match.team1_score;
        stats[match.team1_id].pointsAgainst += match.team2_score;
        if (match.winner_id === match.team1_id) stats[match.team1_id].won++;
      }
      if (match.team2_id && stats[match.team2_id]) {
        stats[match.team2_id].played++;
        stats[match.team2_id].pointsFor += match.team2_score;
        stats[match.team2_id].pointsAgainst += match.team1_score;
        if (match.winner_id === match.team2_id) stats[match.team2_id].won++;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      const diffB = b.pointsFor - b.pointsAgainst;
      const diffA = a.pointsFor - a.pointsAgainst;
      return diffB - diffA;
    });
  };

  const getTeamName = (id: string | null, matchStatus?: string) => {
    if (!id) {
      return matchStatus === 'finished' ? 'EXEMPT' : 'À définir';
    }
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
  const isRoundRobin = tournament?.type === 'round_robin';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>✕ Quitter</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {isRoundRobin ? 'Championnat' : 'Tableau du Concours'}
          </Text>
          <Text style={{ color: '#666', fontSize: 10 }}>ID: {userId.substring(0, 8)} {tournament?.organizer_id === userId ? '(Admin)' : '(Joueur)'}</Text>
        </View>
        <TouchableOpacity onPress={fetchInitialData} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {winner && !isRoundRobin && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerLabel}>🏆 Grand Vainqueur 🏆</Text>
            <Text style={styles.winnerName}>{winner.name}</Text>
          </View>
        )}

        {isRegistration ? (
          <View style={styles.registrationContainer}>
            <Text style={styles.infoTitle}>Inscriptions en cours</Text>
            <Text style={styles.infoText}>{teams.length} / {tournament?.max_teams} équipes</Text>
            {/* ... rest of registration UI remains same ... */}
            <View style={styles.teamList}>
              {teams.map((team, idx) => {
                const isTournamentAdmin = tournament?.organizer_id === userId;
                const isTeamCreator = team.creator_id === userId;
                const canDelete = isTournamentAdmin || isTeamCreator;
                const canEdit = isTeamCreator;

                return (
                  <View key={team.id} style={styles.teamRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={styles.teamNumber}>{idx + 1}.</Text>
                      <Text style={styles.teamNameText}>{team.name} {isTeamCreator && '(Moi)'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {canEdit && (
                        <TouchableOpacity onPress={() => editTeam(team)} style={styles.editButton}>
                          <Text style={styles.editButtonText}>Modifier</Text>
                        </TouchableOpacity>
                      )}
                      {canDelete && (
                        <TouchableOpacity onPress={() => deleteTeam(team.id)} style={styles.deleteButton}>
                          <Text style={styles.deleteButtonText}>Supprimer</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {teams.length >= 2 && tournament?.organizer_id === userId && (
              <TouchableOpacity 
                style={[styles.button, starting && styles.buttonDisabled]} 
                onPress={generateBracket}
                disabled={starting}
              >
                <Text style={styles.buttonText}>{starting ? 'Lancement...' : 'Lancer le concours'}</Text>
              </TouchableOpacity>
            )}
            
            {teams.length >= 2 && tournament?.organizer_id !== userId && (
              <View style={[styles.button, styles.buttonDisabled, { backgroundColor: '#333' }]}>
                <Text style={styles.buttonText}>En attente de l'organisateur...</Text>
              </View>
            )}
          </View>
        ) : isRoundRobin ? (
          <View style={styles.roundRobinContainer}>
            <View style={styles.leagueTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.columnLabel, { flex: 2 }]}>Équipe</Text>
                <Text style={styles.columnLabel}>J</Text>
                <Text style={styles.columnLabel}>V</Text>
                <Text style={styles.columnLabel}>Diff</Text>
              </View>
              {getStandings().map((row, idx) => (
                <View key={row.id} style={[styles.tableRow, idx === 0 && styles.leaderRow]}>
                  <Text style={[styles.cellText, { flex: 2, fontWeight: '700' }]}>{idx + 1}. {row.name}</Text>
                  <Text style={styles.cellText}>{row.played}</Text>
                  <Text style={styles.cellText}>{row.won}</Text>
                  <Text style={styles.cellText}>{row.pointsFor - row.pointsAgainst}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Matchs du Championnat</Text>
            {matches.map(match => {
              const isTournamentAdmin = tournament?.organizer_id === userId;
              const team1 = teams.find(t => t.id === match.team1_id);
              const team2 = teams.find(t => t.id === match.team2_id);
              const isTeam1Creator = team1?.creator_id === userId;
              const isTeam2Creator = team2?.creator_id === userId;
              const canLaunch = isTournamentAdmin || isTeam1Creator || isTeam2Creator;

              return (
                <TouchableOpacity 
                  key={match.id} 
                  style={[
                    styles.matchCard, 
                    match.status === 'finished' && styles.matchFinished,
                    match.status === 'in_progress' && styles.matchInProgress
                  ]}
                  onPress={() => {
                    if (match.status !== 'finished' && canLaunch) onLaunchMatch(match.id);
                  }}
                  disabled={match.status === 'finished'}
                >
                  <View style={styles.matchTeam}>
                    <Text style={[styles.matchTeamName, match.winner_id === match.team1_id && styles.winner]}>
                      {getTeamName(match.team1_id, match.status)}
                    </Text>
                    <Text style={styles.matchScore}>{match.team1_score}</Text>
                  </View>
                  <View style={styles.matchDivider} />
                  <View style={styles.matchTeam}>
                    <Text style={[styles.matchTeamName, match.winner_id === match.team2_id && styles.winner]}>
                      {getTeamName(match.team2_id, match.status)}
                    </Text>
                    <Text style={styles.matchScore}>{match.team2_score}</Text>
                  </View>
                  {match.status !== 'finished' && (
                    <View style={styles.matchActions}>
                      {isTournamentAdmin ? (
                        <View style={styles.adminActionContainer}>
                          <Text style={styles.adminTitle}>Admin - Vainqueur :</Text>
                          <View style={styles.adminButtonsRow}>
                            <TouchableOpacity 
                              style={styles.directFinishButton} 
                              onPress={() => handleManualFinish(match.id, match.team1_id!)}
                            >
                              <Text style={styles.adminFinishText}>{getTeamName(match.team1_id)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.directFinishButton, { borderColor: '#3498DB' }]} 
                              onPress={() => handleManualFinish(match.id, match.team2_id!)}
                            >
                              <Text style={[styles.adminFinishText, { color: '#3498DB' }]}>{getTeamName(match.team2_id)}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.launchHint}>{canLaunch ? 'Jouer le match' : 'Match à venir'}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.bracketContainer}>
            {/* ... current bracket UI ... */}
            {Array.from({ length: Math.ceil(Math.log2(tournament?.max_teams || 2)) }).map((_, r) => (
              <View key={r} style={styles.roundColumn}>
                <Text style={styles.roundTitle}>{r === 0 ? 'Premier tour' : r === 1 ? 'Demi-finales' : 'Finale'}</Text>
                {matches.filter(m => m.round === r).map(match => {
                  const isTournamentAdmin = tournament?.organizer_id === userId;
                  
                  // Prioritize creator_id from match object (backend join), fallback to local teams state
                  const team1 = teams.find(t => t.id === match.team1_id);
                  const team2 = teams.find(t => t.id === match.team2_id);
                  
                  const team1CreatorId = match.team1_creator_id || team1?.creator_id;
                  const team2CreatorId = match.team2_creator_id || team2?.creator_id;

                  const isTeam1Creator = team1CreatorId === userId;
                  const isTeam2Creator = team2CreatorId === userId;
                  const canLaunch = isTournamentAdmin || isTeam1Creator || isTeam2Creator;

                  return (
                    <TouchableOpacity 
                      key={match.id} 
                      style={[
                        styles.matchCard, 
                        match.status === 'finished' && styles.matchFinished,
                        match.status === 'in_progress' && styles.matchInProgress,
                        !canLaunch && match.status === 'waiting' && styles.matchDisabled
                      ]}
                      onPress={() => {
                        if (match.team1_id && match.team2_id && match.status !== 'finished') {
                          if (canLaunch) {
                            onLaunchMatch(match.id);
                          } else {
                            alert('Seuls les participants de ce match ou l\'organisateur peuvent le lancer.');
                          }
                        }
                      }}
                      disabled={!match.team1_id || !match.team2_id || match.status === 'finished'}
                    >
                      <View style={styles.matchTeam}>
                        <Text style={[styles.matchTeamName, match.winner_id === match.team1_id && styles.winner]}>
                          {getTeamName(match.team1_id, match.status)} {isTeam1Creator && '(Moi)'}
                        </Text>
                        <Text style={styles.matchScore}>{match.team1_score}</Text>
                      </View>
                      <View style={styles.matchDivider} />
                      <View style={styles.matchTeam}>
                        <Text style={[styles.matchTeamName, match.winner_id === match.team2_id && styles.winner]}>
                          {getTeamName(match.team2_id, match.status)} {isTeam2Creator && '(Moi)'}
                        </Text>
                        <Text style={styles.matchScore}>{match.team2_score}</Text>
                      </View>
                      {match.status !== 'finished' && match.team1_id && match.team2_id && (
                        <View style={styles.matchActions}>
                          {isTournamentAdmin ? (
                            <View style={styles.adminActionContainer}>
                              <Text style={styles.adminTitle}>Admin - Déclarer vainqueur :</Text>
                              <View style={styles.adminButtonsRow}>
                                <TouchableOpacity 
                                  style={styles.directFinishButton} 
                                  onPress={() => handleManualFinish(match.id, match.team1_id!)}
                                >
                                  <Text style={styles.adminFinishText}>{getTeamName(match.team1_id, match.status)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={[styles.directFinishButton, { borderColor: '#3498DB' }]} 
                                  onPress={() => handleManualFinish(match.id, match.team2_id!)}
                                >
                                  <Text style={[styles.adminFinishText, { color: '#3498DB' }]}>{getTeamName(match.team2_id, match.status)}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <Text style={styles.launchHint}>
                              {canLaunch ? 'Appuyez pour lancer' : 'Match en cours'}
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
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
  refreshButton: {
    padding: 10,
  },
  refreshText: {
    fontSize: 20,
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
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#3498DB',
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
  roundRobinContainer: {
    flex: 1,
  },
  leagueTable: {
    backgroundColor: '#333',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 10,
    marginBottom: 10,
  },
  columnLabel: {
    flex: 1,
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    alignItems: 'center',
  },
  leaderRow: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    borderRadius: 8,
  },
  cellText: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#27AE60',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  matchInProgress: {
    borderLeftColor: '#E67E22',
    backgroundColor: '#3d3d3d',
  },
  matchDisabled: {
    opacity: 0.5,
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
  matchActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  adminActionContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  adminTitle: {
    color: '#888',
    fontSize: 10,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  adminButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  directFinishButton: {
    flex: 1,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27AE60',
    alignItems: 'center',
  },
  adminFinishText: {
    color: '#27AE60',
    fontSize: 12,
    fontWeight: '700',
  },
  launchHint: {
    color: '#BDC3C7',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  }
});
