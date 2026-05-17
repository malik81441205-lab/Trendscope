const fs = require('fs');
const dirs = ['frontend/js', 'frontend'];
let badFound = false;
for(const d of dirs) {
  if(!fs.existsSync(d)) continue;
  for(const f of fs.readdirSync(d)) {
    if(f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.css')) {
      const p = d + '/' + f;
      const c = fs.readFileSync(p, 'utf8');
      if(c.includes('ðŸ') || c.includes('Â·') || c.includes('â€¢') || c.includes('â€”')) {
        console.log(p, 'STILL HAS BAD ENCODING!');
        badFound = true;
      }
    }
  }
}
if(!badFound) console.log('All bad encoding gone!');
