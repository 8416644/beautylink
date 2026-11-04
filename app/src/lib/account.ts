import { supabase } from './supabase';

// Removes every photo she uploaded (her profile photo and portfolio, kept under her id in
// the portfolio bucket). Leftover files are not worth blocking the deletion over.
async function removeMyFiles(userId: string) {
  const bucket = supabase.storage.from('portfolio');
  for (let round = 0; round < 20; round++) {
    const { data, error } = await bucket.list(userId, { limit: 100 });
    if (error || !data || data.length === 0) return;
    const paths = data.map((f) => `${userId}/${f.name}`);
    const { error: removeError } = await bucket.remove(paths);
    if (removeError) return;
  }
}

// Deletes the signed-in user's account and everything that belongs to it, then signs out
// on this device. The account no longer exists afterwards, so there is no undo.
export async function deleteMyAccount(userId: string) {
  await removeMyFiles(userId).catch(() => {});
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
