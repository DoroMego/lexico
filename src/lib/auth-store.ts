import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

let currentUser: User | null = null;
const listeners: Array<(user: User | null) => void> = [];

function notify(user: User | null) {
  currentUser = user;
  listeners.forEach(cb => cb(user));
}

export function getUser(): User | null {
  return currentUser;
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  listeners.push(cb);
  cb(currentUser);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export async function initAuth(): Promise<void> {
  if (!supabase) { notify(null); return; }
  const { data } = await supabase.auth.getSession();
  notify(data.session?.user ?? null);

  supabase.auth.onAuthStateChange((_event, session) => {
    notify(session?.user ?? null);
  });
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Cloud accounts are optional; this demo stores data locally.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Cloud accounts are optional; this demo stores data locally.');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
