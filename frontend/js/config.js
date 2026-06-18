const API_BASE = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:'
)
    ? 'http://localhost:5000'
    : 'https://trendscope-production-7902.up.railway.app';