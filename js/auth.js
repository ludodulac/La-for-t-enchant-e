async function signIn(email, password) {
  const { data, error } = await dbClient.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signOut() {
  await dbClient.auth.signOut();
  window.location.href = 'index.html';
}

async function getSession() {
  const { data } = await dbClient.auth.getSession();
  return data?.session ?? null;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) window.location.href = 'login.html';
  return session;
}
