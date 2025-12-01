require('dotenv').config();
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin using ENV
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.DATABASE_URL
});

const db = admin.database();
const decksRef = db.ref('decks');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/deck", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "deck.html"));
});
app.get('/api/decks', async (req, res) => {
  try {
    const snapshot = await decksRef.once('value');
    const data = snapshot.val();
    const formattedData = [];
    if (data) {
      Object.keys(data).forEach(key => {
        const deck = data[key];
        const contentCount = deck.contents ? Object.keys(deck.contents).length : 0;
        formattedData.push({
          id: key,
          title: deck.title,
          createdAt: deck.createdAt,
          contentCount
        });
      });
    }
    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/decks', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const newRef = decksRef.push();
    const newDeck = {
      title,
      createdAt: new Date().toISOString()
    };
    await newRef.set(newDeck);
    res.status(201).json({ id: newRef.key, ...newDeck });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/decks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const snapshot = await decksRef.child(id).once('value');
    if (!snapshot.exists()) return res.status(404).json({ error: 'Deck not found' });
    
    const deck = snapshot.val();
    const contents = [];
    if (deck.contents) {
      Object.keys(deck.contents).forEach(key => {
        contents.push({ id: key, ...deck.contents[key] });
      });
    }
    
    res.json({ id, title: deck.title, createdAt: deck.createdAt, contents });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/decks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await decksRef.child(id).remove();
    res.json({ message: 'Deck deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/decks/:id/contents', async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  
  if (!description) return res.status(400).json({ error: 'Description required' });

  try {
    const contentRef = decksRef.child(id).child('contents').push();
    const newContent = {
      description,
      createdAt: new Date().toISOString()
    };
    await contentRef.set(newContent);
    res.status(201).json({ id: contentRef.key, ...newContent });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/decks/:deckId/contents/:contentId', async (req, res) => {
  const { deckId, contentId } = req.params;
  const { description } = req.body;

  try {
    await decksRef.child(deckId).child('contents').child(contentId).update({ description });
    res.json({ message: 'Content updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/decks/:deckId/contents/:contentId', async (req, res) => {
  const { deckId, contentId } = req.params;
  try {
    await decksRef.child(deckId).child('contents').child(contentId).remove();
    res.json({ message: 'Content deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});