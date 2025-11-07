// API client with enhanced error handling and retry logic
const api = {
  async request(url, options = {}, retryCount = 0) {
    const maxRetries = options.maxRetries || 2;
    const timeout = options.timeout || 30000; // 30 seconds
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API error:', {
        url,
        attempt: retryCount + 1,
        error: error.message,
        type: error.name
      });
      
      // Retry logic for network errors
      if ((error.name === 'TypeError' || error.name === 'AbortError' || error.message.includes('Failed to fetch')) && retryCount < maxRetries) {
        console.log(`Retrying request (${retryCount + 1}/${maxRetries}) in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.request(url, options, retryCount + 1);
      }
      
      throw error;
    }
  },

  get(url) {
    return this.request(url);
  },

  post(url, body) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(url, body) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  },
};

// Specific API functions
const garageAPI = {
  async search(filters = {}) {
    const query = toQuery(filters);
    return api.get(ENDPOINTS.garageSearch(query));
  },

  async getLocations() {
    return api.get(ENDPOINTS.garageLocations());
  },

  async getById(id) {
    return api.get(ENDPOINTS.garageById(id));
  },
};

const bookingAPI = {
  async create(booking) {
    return api.post(ENDPOINTS.bookingCreate(), booking);
  },

  async track(bookingId) {
    return api.get(ENDPOINTS.bookingTrack(bookingId));
  },

  async getByUser(phone) {
    return api.get(ENDPOINTS.bookingByUser(phone));
  },
};

const userAPI = {
  async getDashboard(phone) {
    return api.get(ENDPOINTS.userDashboard(phone));
  },
};
