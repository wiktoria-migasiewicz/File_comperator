const BASE_URL = "https://localhost:5000/api";   // jeden punkt prawdy ✔

// ----------- AUTH ----------
export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function register(username, email, password) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
}

// ----------- DELETE ----------
export async function deleteComparison(token, id) {
  const res = await fetch(`${BASE_URL}/comparison/${id}`, {
    method: "DELETE",
    headers: { Authorization: token },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
}

// ----------- PORÓWNYWANIE ----------
export async function compareFiles(token, file1, file2) {
  const formData = new FormData();
  formData.append("file1", file1);
  formData.append("file2", file2);

  const res = await fetch(`${BASE_URL}/compare`, {
    method: "POST",
    headers: { Authorization: token },
    body: formData,
  });
  return res.json();
}

// ----------- ZAPIS ----------
export async function saveComparison(token, filename1, filename2, diff) {
  const res = await fetch(`${BASE_URL}/save-comparison`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ filename1, filename2, diff }),
  });
  return res.json();
}

// ----------- LISTA ----------
export async function getMyComparisons(token) {
  const res = await fetch(`${BASE_URL}/my-comparisons`, {
    headers: { Authorization: token },
  });
  return res.json();
}
