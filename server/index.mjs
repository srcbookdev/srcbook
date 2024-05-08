import vm from 'node:vm';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());

const sessions = {};

function findOrCreateSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      context: vm.createContext({}),
    };
  }
  return sessions[sessionId];
}

app.options('/exec', cors());

app.post('/exec', cors(), (req, res) => {
  const { code, sessionId } = req.body;

  if (typeof code !== 'string' || typeof sessionId !== 'string') {
    return res.status(400).json({ error: '`code` and `sessionId` are required.' });
  }

  const session = findOrCreateSession(sessionId);

  try {
    const result = vm.runInContext(code, session.context);
    return res.json({ error: false, result: JSON.stringify(result) });
  } catch (error) {
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

const port = process.env.PORT || 2150;
app.listen(port, () => console.log(`Server running on port ${port}`));
