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
  numOfRooms: 0,
}

//Setting up a socket with the namespace 'connection' for new sockets
io.on('connection', socket => {
  console.log('New client connected', socket.id);
  
  // Create new game room
  socket.on('createGame', data => {    
    ++gameState.numOfRooms;
    let roomId = 'room-' + gameState.numOfRooms;
    socket.join(roomId);
    gameState[roomId] = {
      board: generateBoard(),
      players: {
        [socket.id]: data.role,
      }
    };
    //console.log('gameState', gameState);
    socket.emit('creatingGame', {
      roomId,
      board: gameState[roomId].board,
    });    
  });

  //Connect new player to requested room
  socket.on('joinGame', data => {
    const { role, roomId } = data;
    if (_.isUndefined(gameState[roomId]) || _.isUndefined(gameState[roomId].board)) {
      socket.emit('joiningGame', {
        error: 'No game in progress with that Room ID!'
      });
    } else {
      socket.join(roomId);
      gameState[roomId].players[socket.id] = role;
      socket.emit('joiningGame', {
        roomId: roomId,
        board: gameState[roomId].board
      });
    }
  })

  //Handle tile clicked
  socket.on('clickTile', data => {
    const { roomId } = data;
    gameState[roomId].board = data.board;
    socket.to(roomId).emit('updateBoard', {
      board: gameState[roomId].board
    });
  });

  socket.on('getNewBoard', data => {
    const { roomId } = data;
    gameState[roomId].board = generateBoard();
    //console.log('getNewBoard', gameState[data.roomId].board);
    io.in(roomId).emit('updateBoard', {
      board: gameState[roomId].board,
      role: {}
    });
  });

  socket.on('leaveRoom', data => {
    const { roomId } = data;
    console.log('player', socket.id, 'left', roomId);
    socket.leave(roomId);
    delete gameState[roomId].players[socket.id];
    
    // if (Object.keys(gameState[roomId].players).length === 0) {
    //   delete gameState[roomId]
    // }
  });

  //A special namespace 'disconnect' for when a client disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    
    // // delete board if all players disconnect
    // if (Object.keys(gameState.players).length === 0) {
    //   delete gameState.board;
    // }
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
