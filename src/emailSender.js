const nodemailer = require('nodemailer');
const { generateExcelReport } = require('./generateExcelReport');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const sendEmailWithAttachment = async (complianceSummary, deviceDetailsList, deviceAppsList) => {
    try {
        console.log(`📡 Generando el reporte antes de enviar el email...`);

        const filePath = await generateExcelReport(complianceSummary, deviceDetailsList, deviceAppsList);
        if (!filePath) throw new Error('❌ No se pudo generar el reporte.');

        // Configuración del transporte SMTP
        let transporter = nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_SECURE === 'true',
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASSWORD
          }
        });

        // Verificación de conexión
        await transporter.verify();
        console.log("✅ Conexión SMTP válida.");

        const mailOptions = {
            from: config.EMAIL_SENDER,
            to: config.EMAIL_RECIPIENT,
            subject: '📊 Reporte de Dispositivos Gestionados',
            text: 'Adjunto encontrarás el reporte en formato Excel.',
            attachments: [{
                filename: path.basename(filePath),
                path: filePath
            }]
        };

        // Envío de correo
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email enviado con éxito a ${config.EMAIL_RECIPIENT}: ${info.response}`);

        // Limpieza del archivo generado
        await fs.promises.unlink(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);

    } catch (error) {
        console.error('❌ Error enviando el correo:', error.message || error);
    }
};

module.exports = { sendEmailWithAttachment };
