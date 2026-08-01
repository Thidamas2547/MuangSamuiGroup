const API = "http://localhost:5000";

export const loginAPI = async (form) => {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(form)
  });
  return res.json();
};

export const getTickets = async () => {
  const res = await fetch(`${API}/tickets`);
  return res.json();
};

export const createTicket = async (data) => {
  const res = await fetch(`${API}/tickets`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateTicket = async (id, status) => {
  const res = await fetch(`${API}/tickets/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ status })
  });
  return res.json();
};