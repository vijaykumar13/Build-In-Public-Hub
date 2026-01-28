// Spar Mode Types

export type SparStatus = 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled';

export interface User {
  id: string;
  github_id: string;
  github_username: string;
  email?: string;
  avatar_url?: string;
  stripe_customer_id?: string;
  spar_wins: number;
  spar_losses: number;
  created_at: string;
  updated_at: string;
}

export interface Spar {
  id: string;
  creator_id: string;
  opponent_id?: string;
  opponent_github_username?: string;
  title: string;
  description?: string;
  duration_hours: number;
  entry_fee_cents: number;
  status: SparStatus;
  scheduled_start?: string;
  actual_start?: string;
  actual_end?: string;
  winner_id?: string;
  creator_commits: number;
  opponent_commits: number;
  creator_paid: boolean;
  opponent_paid: boolean;
  stripe_payment_intent_creator?: string;
  stripe_payment_intent_opponent?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  creator?: User;
  opponent?: User;
  winner?: User;
}

export interface SparCommit {
  id: string;
  spar_id: string;
  user_id: string;
  commit_sha: string;
  commit_message?: string;
  repo_name?: string;
  repo_url?: string;
  committed_at: string;
  created_at: string;
  // Joined relation
  user?: User;
}

// API request/response types
export interface CreateSparRequest {
  title: string;
  description?: string;
  duration_hours: 24 | 48 | 72;
  opponent_github_username?: string;
}

export interface AcceptSparRequest {
  spar_id: string;
}

// Helper to get status display text
export function getSparStatusText(status: SparStatus): string {
  switch (status) {
    case 'pending': return 'Waiting for Opponent';
    case 'accepted': return 'Starting Soon';
    case 'active': return 'Live Battle';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

// Helper to get status color
export function getSparStatusColor(status: SparStatus): string {
  switch (status) {
    case 'pending': return 'text-yellow-400 bg-yellow-400/10';
    case 'accepted': return 'text-blue-400 bg-blue-400/10';
    case 'active': return 'text-green-400 bg-green-400/10';
    case 'completed': return 'text-muted-foreground bg-muted/10';
    case 'cancelled': return 'text-red-400 bg-red-400/10';
    default: return 'text-muted-foreground';
  }
}
