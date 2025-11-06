const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

export function authHeader(){
  const token = localStorage.getItem('token');
  return token ? { Authorization: Bearer  } : {};
}

export async function api(path, { method='GET', body, headers={} } = {}){
  const res = await fetch(${BASE}, {
    method,
    headers: { 'Content-Type':'application/json', ...authHeader(), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}