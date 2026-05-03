// Vercel serverless wrapper — re-exports Express app từ LandscapeApp/server.
// vercel.json rewrite /api/(.*) → /api làm cho function này nhận mọi request
// dưới /api/* với req.url giữ nguyên path gốc, Express tự match route.
module.exports = require('../LandscapeApp/server/index.js');
