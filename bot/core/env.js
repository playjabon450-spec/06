require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const missing = [];
const tok = process.env.DISCORD_TOKEN;
if (!tok || tok.startsWith('PASTE_')) missing.push('DISCORD_TOKEN (ضع توكن البوت في ملف .env)');
if (!process.env.DATABASE_URL) missing.push('DATABASE_URL (رابط قاعدة بيانات Supabase)');
module.exports = { missing, pollConfig: +process.env.CONFIG_POLL_MS || 5000, pollJobs: +process.env.JOB_POLL_MS || 3000, port: +process.env.PORT || 3001 };
