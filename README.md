// README.md
const readmeContent = `
# MCI-BOT

## Descripción
MCI-BOT es una herramienta automatizada que se conecta a Microsoft Graph API para obtener información sobre dispositivos gestionados, generar reportes en Excel y enviarlos automáticamente por correo electrónico.

## Instalación
### 1. Clonar el Repositorio

git clone https://github.com/Moonikua/mi-bot-graph.git
cd mi-bot-graph

### 2. Instalar Dependencias

npm install

### 3. Configurar Variables de Entorno
Crear un archivo `.env` en la raíz del proyecto con la siguiente estructura:

TENANT_ID=xxxx-xxxx-xxxx-xxxx
CLIENT_ID=xxxx-xxxx-xxxx-xxxx
CLIENT_SECRET=xxxxxxxxxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=bot.mcinverciones.chile@gmail.com
CRON_SCHEDULE="0 */4 * * *"
TIMEZONE="America/Santiago"

### 4. Ejecutar el Bot Manualmente

npm start

### 5. Configurar PM2 para Ejecución en Producción

pm2 start ecosystem.config.js
pm2 save
pm2 startup

## Uso
El bot consulta automáticamente dispositivos en Intune y genera un reporte en Excel con el estado de cumplimiento de cada dispositivo.

## Monitoreo
Para ver logs en tiempo real:

pm2 logs mci-bot

## Contacto y Soporte
Para soporte técnico, contactar a soporte@mcinversiones.com
`;
