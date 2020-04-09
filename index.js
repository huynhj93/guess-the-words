// import https from 'https';
// import path from 'path';
// import config from './config/env';
// import app from './config/express';
const http = require('http');
const fs = require('fs');
const express = require('express');
const logger = require('morgan');
const _ = require('lodash');
const cors = require('cors');
const bodyparser = require('body-parser');
const socketIo = require('socket.io');

const app = express();
const port = 8080;
const server = http.createServer(app);

const io = socketIo(server, {origins: '*:*'});

const gameState = {
  // rooms: 0,
  players: {}
}

//Setting up a socket with the namespace 'connection' for new sockets
io.on('connection', socket => {
  console.log('New client connected', socket.id);
  

  // Create new game room and notify the creator of game
  socket.on('createGame', data => {
    // socket.join('room-' + ++gameState.rooms);
    gameState.players[socket.id] = data.role;
    // socket.emit('newGame', {
    //   room: 'room-' + gameState.rooms
    // });
  });

  //Connect new player to requested room
  socket.on('joinGame', data => {
    // socket.join(data.room);
    gameState.players[socket.id] = data.role;
    // socket.emit('joiningGame', {
    //   board: gameState.board
    // })
  })

  //Handle tile clicked
  socket.on('clickTile', data => {
    gameState.board = data.board;
    console.log('server board', gameState.board);
    // socket.broadcast.to(data.room).emit('tileClicked', {
    //   board: data.board
    // });
    socket.broadcast.emit('tileClicked', {
      board: data.board
    });
  });

  // socket.on('gameEnded', data => {
  //   socket.leave(data.room);
  // });

  //A special namespace 'disconnect' for when a client disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    delete gameState.players[socket.id];
  });
});

/** ===== End of Socket IO ======== */

/** ===== Board helpers ======== */
const words = fs.readFileSync('codenames.txt').toString().split('\n');

function getWords () {
  // Shuffle array and take first 25 elements
  return _.shuffle(words).slice(0,25);
}

function generateBoard() {
  let board = [];
  let wordRow = [];
  let reds = _.fill(Array(9), 'red');
  let blues = _.fill(Array(8), 'blue');
  let neutrals = _.fill(Array(7), 'neutral');
  let black = ['black'];
  let colors = [ ...reds, ...blues, ...neutrals, ...black];
  //console.log('colors length', colors.length);
  let shuffledColors =  _.shuffle(colors);
  //console.log('shuffledColors:', shuffledColors);
  const selectedWords = getWords();
  //console.log('selectedWords', selectedWords);
  //console.log('selectedWords length', selectedWords.length);
  selectedWords.forEach((word, i) => {
    wordRow.push({ word, color: shuffledColors[i], toReveal: false });
    if ((i + 1) % 5 == 0) {
      board.push(wordRow)
      wordRow = [];
    }
  });
  return board;
}

/** ===== End of Board helpers ======== */


app.use(logger('dev')); 
app.use(cors());
app.use(bodyparser.json());

app.get('/board', function (req, res) {
  if (_.isUndefined(gameState.board)) {
    res.status(404).json({ 
      message: 'please create a new board first!' 
    });
  } else {
    //console.log('board', gameState.board);
    res.json({
      board: gameState.board
    })
  }
});


app.post('/board', function (req, res) {
  // Need to debounce or something
  gameState.board = generateBoard();
  console.log("server new board", gameState.board);
  return res.status(200).json({
    board: gameState.board
  });
});

app.delete('/board', function (req, res) {
  // Need to debounce or something
  delete gameState.board;
  return res.status(200).json({
    message: 'deleted'
  });
});

server.listen(port, () => console.log(`Socket running at port: ${port}`));
