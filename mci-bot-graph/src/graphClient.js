const axios = require('axios');
const { getToken } = require('./auth');

const graphRequest = async (endpoint) => {
    const token = await getToken();

    try {
        const response = await axios.get(`https://graph.microsoft.com/v1.0${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('Error en la petición:', error.response.data);
        throw error;
    }
};

module.exports = { graphRequest };
