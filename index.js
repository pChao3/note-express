const express = require('express');
const app = express();
app.use(express.json());

let notes = [
  {
    id: '1',
    content: 'HTML is easy',
    important: true,
  },
  {
    id: '2',
    content: 'Browser can execute only JavaScript',
    important: false,
  },
  {
    id: '3',
    content: 'GET and POST are the most important methods of HTTP protocol',
    important: true,
  },
];
app.get('/', (req, res) => {
  res.send('<h1>hello world</h1>');
});

app.get('/api/notes', (req, res) => {
  res.json(notes);
});

app.get('/api/notes/:id', (req, res) => {
  const id = req.params.id;
  const item = notes.find(i => i.id === id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).end();
  }
});

const generateId = () => {
  const maxId = notes.length > 0 ? Math.max(...notes.map(n => Number(n.id))) : 0;
  return String(maxId + 1);
};
app.post('/api/notes', (req, res) => {
  const data = req.body;
  if (!data.content) {
    return res.status(400).json({ error: 'content is empty' });
  }
  const note = {
    id: generateId(),
    content: data.content,
    important: data.important || false,
  };
  notes.push(note);
  res.json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  const id = req.params.id;
  notes = notes.filter(i => i.id !== id);
  res.status(204).end();
});

app.listen(3000, () => {
  console.log('server run at http://localhost:3000');
});
