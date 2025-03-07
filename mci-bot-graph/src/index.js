const { graphRequest } = require('./graphClient');

const main = async () => {
    try {
        const userProfile = await graphRequest('/me');
        console.log('Perfil del usuario:', userProfile);
    } catch (error) {
        console.error('Error en la ejecución:', error);
    }
};

main();
