const axios =require ('axios');
const CONFIG = require('../config'); // ✅ Asegurar que config esté bien cargado

const graphRequest = async (endpoint, token) => {
    try {
        const response = await axios.get(`${CONFIG.GRAPH_API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error en la petición:', error.response?.data || error.message);
        throw error;
    }
};


module.exports = { graphRequest };
