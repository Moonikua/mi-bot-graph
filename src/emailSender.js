const nodemailer = require('nodemailer');
const fs = require('fs');
const config = require('../config');
const { generateExcelReport } = require('./generateExcelReport');
const path = require('path');

const sendEmailWithAttachment = async (complianceSummary, deviceDetailsList, deviceAppsList, token) => {
    try {
        console.log(`📡 Generando el reporte antes de enviar el email...`);

        const filePath = await generateExcelReport(complianceSummary, deviceDetailsList, deviceAppsList);
        if (!filePath) throw new Error('❌ No se pudo generar el reporte.');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASSWORD
            }
        });

        const mailOptions = {
            from: config.EMAIL_SENDER,
            to: config.EMAIL_RECIPIENT,
            subject: '📊 Reporte de Dispositivos Gestionados',
            text: 'Adjunto encontrarás el reporte en formato Excel.',
            attachments: [{ filename: path.basename(filePath), path: filePath }]
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email enviado con éxito a ${config.EMAIL_RECIPIENT}`);

        await fs.promises.unlink(filePath);

        console.log(`🗑️ Archivo eliminado: ${filePath}`);

    } catch (error) {
        console.error('❌ Error al enviar el correo:', error.message || error);
    }
};

module.exports = { sendEmailWithAttachment };
