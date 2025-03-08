const { getManagedDevices, generateExcelReport, sendEmailWithAttachment } = require('./deviceManager');
const { getToken  } = require('./auth');

const main = async () => {
    try {
        console.log("🚀 Iniciando el BOT de gestión de dispositivos...");

        // Obtener el token de autenticación
        const token = await getToken();
        if (!token) {
            throw new Error("❌ No se pudo obtener el token de autenticación.");
        }
        console.log("🔑 Token obtenido con éxito.");

        // Obtener dispositivos y procesar datos
        await getManagedDevices(token);

        // Generar el archivo Excel
        const filePath = await generateExcelReport();

        // Enviar el archivo por correo (Reemplaza con el correo destinatario)
        await sendEmailWithAttachment('destinatario@email.com');

        console.log("✅ Proceso completado exitosamente.");
    } catch (error) {
        console.error('❌ Error en la ejecución:', error);
    }
};

main();
