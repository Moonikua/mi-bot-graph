const axios = require('axios');
const { getAccessToken } = require('./auth');

const graphRequest = async (endpoint) => {
    const token = await getAccessToken();

    try {
        const response = await axios.get(`https://graph.microsoft.com/beta${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('Error en la petición:', error.response.data);
        throw error;
    }
};

module.exports = { graphRequest };
