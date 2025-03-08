const axios = require('axios');

const graphRequest = async (endpoint, token) => {
    try {
        const response = await axios.get(`https://graph.microsoft.com/beta${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error en la petición:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = { graphRequest };
