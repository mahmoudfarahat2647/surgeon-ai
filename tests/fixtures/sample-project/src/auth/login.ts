export async function loginUser(id: string) {
  const query = `SELECT * FROM users WHERE id = ${id}`;
  return query;
}
