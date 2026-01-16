const express = require('express');
const app = express();
app.use(express.static('public'));


app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/about', (req, res) => res.sendFile(__dirname + '/about.html'));
app.get('/contact', (req, res) => res.sendFile(__dirname + '/contact.html'));

app.use(express.urlencoded({ extended: false })); // lets us read form bodies
app.post('/contact', (req, res) => {
  console.log('Form received:', req.body);
res.redirect('/');
});

// route for privacy policy (next)

app.get('/terms', (req, res) => res.sendFile(__dirname + '/terms.html'));
app.listen(3000, () => console.log('Server on http://localhost:3000'));