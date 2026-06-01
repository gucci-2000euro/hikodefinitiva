// ─── CommunityMessage arricchito con profilo autore ──────────────
export interface MessageProfile {
  id: string;
  nome: string | null;
  avatar_url: string | null;
}

export interface CommunityMessageWithProfile extends CommunityMessage {
  profiles: MessageProfile | null;
}

// ─── Run ─────────────────────────────────────────────────────────
export interface Run {
  id: string;
  user_id: string;
  route_id: string | null;
  distanza_km: number;
  durata_sec: number;
  pace_medio: number; // secondi/km
  waypoints: { lat: number; lng: number }[] | null;
  completata: boolean;
  created_at: string;
}

// ─── Community core ──────────────────────────────────────────────
export interface Community {
  id: string;
  nome: string;
  descrizione: string;
  tipo: 'aperta' | 'approvazione' | 'privata';
  fondatore_id: string | null;
  immagine_url: string | null;
  citta: string | null;
  livello_runner: 'principiante' | 'intermedio' | 'avanzato' | null;
  membri_count: number;
  badge_ufficiale: boolean;
  created_at: string;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  ruolo: 'admin' | 'moderatore' | 'membro';
  stato: 'attivo' | 'bannato' | 'silenziato' | 'in_attesa';
  joined_at: string;
}

export interface CommunityChannel {
  id: string;
  community_id: string;
  nome: string;
  tipo: 'generale' | 'annunci' | 'percorsi' | 'sfide';
  solo_admin: boolean;
  created_at: string;
}

export interface CommunityMessage {
  id: string;
  channel_id: string;
  user_id: string;
  contenuto: string;
  tipo: 'testo' | 'percorso' | 'sfida' | 'run' | 'immagine';
  image_url?: string | null;
  riferimento_id: string | null;
  thread_parent_id: string | null;
  moderazione_stato: 'approvato' | 'segnalato' | 'bloccato' | 'pending';
  created_at: string;
  eliminato: boolean;
}

export interface CommunityReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  community_id: string;
  user_id: string;
  risposte_json: Record<string, string> | null;
  stato: 'in_attesa' | 'approvata' | 'rifiutata';
  created_at: string;
}

export interface CommunityInvite {
  id: string;
  token: string;
  community_id: string;
  creato_da: string;
  usato_da: string | null;
  scadenza: string | null;
  tipo: 'link' | 'nominativo';
}

export interface CommunityChallenge {
  id: string;
  community_id: string;
  nome: string;
  tipo: 'collettiva' | 'competitiva';
  route_id: string | null;
  obiettivo_tipo: 'km' | 'tempo' | 'corse';
  obiettivo_valore: number;
  punti: number;
  scadenza: string;
  created_by: string;
}

export interface ChallengeProgress {
  challenge_id: string;
  user_id: string;
  valore_attuale: number;
  completata: boolean;
  data_completamento: string | null;
}

export interface Streak {
  user_id: string;
  current_length: number;
  longest_length: number;
  last_day_local: string;
  freezes_available: number;
  freeze_used_on: string | null;
  updated_at: string;
}

export interface Badge {
  id: string;
  key: string;
  nome: string;
  descrizione: string;
  tipo: 'permanente' | 'temporaneo';
  scadenza_giorni: number | null;
  icona_url: string;
  xp_reward: number;
  categoria: 'streak' | 'sfida' | 'community' | 'percorso' | 'ruolo';
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  earned_at: string;
  scade_at: string | null;
}

export interface XpHistoryEntry {
  id: string;
  user_id: string;
  amount: number;
  source: 'run' | 'sfida' | 'streak_milestone' | 'badge' | 'community_challenge';
  riferimento_id: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  km_totali: number;
  posizione: number;
  delta_vs_prev_week: number | null;
}

export interface ModerationResult {
  decision: 'approved' | 'flagged' | 'blocked';
  confidence: number;
  reason: string;
  category: 'HATE' | 'INSULT' | 'BLASPHEMY' | 'THREAT' | 'BODY' | 'ELITISM' | 'DRUG' | 'SEXUAL' | 'SPAM' | null;
}

export interface ModerationQueueItem {
  id: string;
  message_id: string;
  segnalazioni_count: number;
  ai_raccomandazione: ModerationResult['decision'];
  ai_summary: string;
  ai_confidence: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  azione_finale: ModerationResult['decision'] | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  community_id: string;
  channel_id: string | null;
  livello: 'tutte' | 'menzioni' | 'silenzioso';
  streak_reminder: boolean;
  classifica_update: boolean;
  sfida_scadenza: boolean;
}

export interface UserPresence {
  user_id: string;
  community_id: string | null;
  lat: number;
  lng: number;
  stato: 'corsa' | 'idle';
  last_seen: string;
  condivisione: 'tutti' | 'amici' | 'community' | 'nessuno';
}
