const fs = require('fs');
const path = require('path');

const replacements = {
  'ðŸ‡ºðŸ‡¸': '🇺🇸',
  'ðŸ‡¬ðŸ‡§': '🇬🇧',
  'ðŸ‡®ðŸ‡³': '🇮🇳',
  'ðŸ‡¯ðŸ‡µ': '🇯🇵',
  'ðŸ‡§ðŸ‡·': '🇧🇷',
  'ðŸ‡©ðŸ‡ª': '🇩🇪',
  'ðŸ‡«ðŸ‡·': '🇫🇷',
  'ðŸ‡°ðŸ‡·': '🇰🇷',
  'ðŸŒ ': '🌍',
  'ðŸ‘¤': '👤',
  'ðŸš€': '🚀',
  'ðŸ“‰': '📉',
  'âž¡ï¸ ': '➡️',
  'âœ✨': '✨',
  'Â·': '•',
  'â€¢': '•',
  'â€”': '—',
  'Â©': '©',
  'â• ': '═',
  'Ã ': 'à',
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã­': 'í',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'â€˜': '‘',
  'â€™': '’',
  'â€œ': '“',
  'â€': '”'
};

function fixEncoding(dir) {
  if(!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for(const file of files) {
    const fullPath = path.join(dir, file);
    if(fs.statSync(fullPath).isDirectory()) {
      fixEncoding(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Add meta charset to HTML if missing
      if (file.endsWith('.html') && !content.includes('<meta charset="UTF-8">')) {
        content = content.replace(/<head>/i, '<head>\n    <meta charset="UTF-8">');
        changed = true;
      }

      // Replace mojibake
      for (const [bad, good] of Object.entries(replacements)) {
        if (content.includes(bad)) {
          content = content.split(bad).join(good);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed:', fullPath);
      }
    }
  }
}

fixEncoding('./frontend');
console.log('Done fixing encoding.');
