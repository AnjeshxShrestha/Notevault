/**
 * NoteVault API Client
 * Handles all communication with the backend.
 * JWT is managed via HTTP-only cookies — no token handling needed in JS.
 */

const API = {
  BASE: '/api',

  /**
   * Generic fetch wrapper
   */
  async request(method, endpoint, data = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // Send cookies with every request
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const res = await fetch(`${this.BASE}${endpoint}`, options);
      const json = await res.json();

      if (!res.ok) {
        // Throw an error with the server's message
        const err = new Error(json.message || 'Request failed');
        err.status = res.status;
        err.errors = json.errors;
        throw err;
      }

      return json;
    } catch (err) {
      if (err.name === 'TypeError') {
        throw new Error('Network error. Please check your connection.');
      }
      throw err;
    }
  },

  get: (endpoint) => API.request('GET', endpoint),
  post: (endpoint, data) => API.request('POST', endpoint, data),
  put: (endpoint, data) => API.request('PUT', endpoint, data),
  delete: (endpoint) => API.request('DELETE', endpoint),

  // Auth
  auth: {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    logout: () => API.post('/auth/logout'),
    me: () => API.get('/auth/me'),
  },

  // Notes
  notes: {
    list: () => API.get('/notes'),
    create: (data) => API.post('/notes', data),
    update: (id, data) => API.put(`/notes/${id}`, data),
    delete: (id) => API.delete(`/notes/${id}`),
  },

  // Reminders
  reminders: {
    list: () => API.get('/reminders'),
    triggered: () => API.get('/reminders/triggered'),
    create: (data) => API.post('/reminders', data),
    delete: (id) => API.delete(`/reminders/${id}`),
  },
};
