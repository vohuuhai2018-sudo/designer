const http = require('http');

http.get('http://localhost:5000/api/projects', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const projects = JSON.parse(data);
    console.log('Total:', projects.length);
    if (projects.length > 0) {
      console.log('First Project Selections:', JSON.stringify(projects[0].selections, null, 2));
    }
  });
}).on('error', (err) => console.error(err));
