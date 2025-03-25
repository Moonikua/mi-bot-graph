const axios = require('axios');
const { generateExcelReport } = require('./generateExcelReport');
const fs = require('fs');
const config = require('../config');

const getCurrentTimestamp = () => {
    return new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }).replace(',', '');
};

const sendEmailWithAttachment = async (complianceSummary, deviceDetailsList, deviceAppsList, token) => {
    try {
        console.log(`📡 Generando el reporte antes de enviar el email...`);

        // 🔹 Generar el reporte
        const filePath = await generateExcelReport(complianceSummary, deviceDetailsList, deviceAppsList);
        if (!filePath) throw new Error('❌ No se pudo generar el reporte.');

        if (!token) {
            throw new Error("❌ No se pudo obtener el token de autenticación para enviar el correo.");
        }

        // 📧 Datos del correo electrónico
        const emailData = {
            message: {
                subject: "📊 Reporte de Dispositivos Gestionados",
                body: { contentType: "Text", content: "Adjunto encontrarás el reporte." },
                toRecipients: [{ emailAddress: { address: config.EMAIL_RECIPIENT } }],
                attachments: [
                    {
                        "@odata.type": "#microsoft.graph.fileAttachment",
                        name: `Reporte_Dispositivos_${getCurrentTimestamp()}.xlsx`,
                        contentBytes: fs.readFileSync(filePath).toString("base64")
                    }
                ]
            },
            saveToSentItems: true
        };

        // 🔹 Enviar el correo con Graph API usando la nueva cuenta
        const response = await axios.post(
            `https://graph.microsoft.com/v1.0/users/${config.SMTP_USER}/sendMail`,
            emailData,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        console.log(`📧 Email enviado con Graph API desde ${config.SMTP_USER}`);

        // 🗑️ Eliminar el archivo después del envío
        await fs.unlink(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);

    } catch (error) {
        console.error('❌ Error enviando el correo con Graph API:', error.response?.data || error.message);
    }
};

module.exports = { sendEmailWithAttachment };
