import express from 'express';
import logger from 'morgan';

const app = express();

app.use(logger('dev')); 


const words = [];
app.get('/board', function (req, res) {
  res.json({
    board: ["hello"]
  })
})