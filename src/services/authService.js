// src/services/authService.js

// Backend API එකේ base URL එක. ඇත්ත project එකකදී මේක .env file එකකින් ගන්න එක හොඳයි.
const API_BASE_URL = 'http://localhost:5001/api'; // Backend එක run වෙන port එක 5001 නම්

export const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json(); // Response එක JSON විදිහට parse කරගන්නවා

    if (!response.ok) {
      // Status code එක 2xx නැත්නම් (උදා: 400, 401, 500) error එකක් විදිහට handle කරනවා
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    // සාර්ථක නම්, data එක (token සහ user details එක්ක) return කරනවා
    return data;

  } catch (error) {
    console.error('Login service error:', error);
    // Error එක re-throw කරනවා component එකට handle කරන්න
    throw error;
  }
};

// Register function එකත් මෙතනට දාන්න පුළුවන් පසුව අවශ්‍ය නම්
// export const register = async (username, password, role) => { ... };