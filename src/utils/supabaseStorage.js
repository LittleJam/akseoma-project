import { supabase } from './supabaseClient';

const ROW_ID = 'default';

export async function loadRemoteState() {
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) throw error;
  return data?.data || null;
}

export async function saveRemoteState(data) {
  const { error } = await supabase
    .from('app_state')
    .upsert({ id: ROW_ID, data, updated_at: new Date().toISOString() });

  if (error) throw error;
}
