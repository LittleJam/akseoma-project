import { supabase } from './supabaseClient';

const ROW_ID = 'default';

// Состояние лежит одной строкой, и вместе с ним — отметка времени последней
// записи. По ней устройства понимают, у кого свежее: без неё приложение, не
// перечитывая облако, затирало бы своим состоянием чужие правки
export async function loadRemoteState() {
  const { data, error } = await supabase
    .from('app_state')
    .select('data, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) throw error;
  return { data: data?.data || null, updatedAt: data?.updated_at || null };
}

// Только отметка времени: ею проверяют «не изменилось ли там что-то» при
// возвращении в приложение, не выкачивая всё состояние целиком
export async function loadRemoteStamp() {
  const { data, error } = await supabase
    .from('app_state')
    .select('updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) throw error;
  return data?.updated_at || null;
}

export async function saveRemoteState(data) {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from('app_state')
    .upsert({ id: ROW_ID, data, updated_at: updatedAt });

  if (error) throw error;
  // Возвращаем то, что записали: это и есть «наша» отметка, с которой потом
  // сравнивается облако
  return updatedAt;
}
