const express=require ('express');
const socket=require("socket.io");
const http=require('http');
const {Chess}=require("chess.js"); //here we are importing chess class from chess.js
const path = require('path'); 
const axios=require ('axios');
const schedule=require('node-schedule')

const app = express();
const server=http.createServer(app); //http server is based on express server (app variable)

//all the functionalities of socket will be inherited into io variable
const io=socket(server); //socket io requires http server which should be based on express server.

//initiating chess object
const chess=new Chess();

let players={};
let currentPlayer='';
let currentRoomId = null; //will store the roomid for deletion

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname,"public")));

app.get('/',(req,res)=>{
    res.render('index');
})
const keepAliveJob = schedule.scheduleJob('*/5 * * * *', async () => {
  try {
      // Replace with your actual app URL
      await axios.get(`https://chess-f6ll.onrender.com/ping`);
  } catch (error) {
      console.log( error.message);
  }
});
app.get('/ping', (req, res) => {
  res.send(200); // Respond to the ping
});

io.on("connection",(uniqueSocket)=>{  //here unique socket is the unique info about the client who is visiting the server
      console.log('connected'); 
      
       uniqueSocket.on('joinRoom', (roomId) => { //  event to handle room joining
        if(roomId==='') return;
        currentRoomId = roomId;
        uniqueSocket.join(roomId); // Joins the client to the specified room
    
        if (!players[roomId]) {
          players[roomId] = { white: null, black: null };
          console.log(players);
        }
    
      if(!players[roomId].white){
        players[roomId].white=uniqueSocket.id;
        uniqueSocket.emit('playerRole',"w");
        io.to(players[currentRoomId].white).emit('notification', 'You are white.');
        console.log('white');
      }
      else if(!players[roomId].black){
        players[roomId].black=uniqueSocket.id;
        uniqueSocket.emit('playerRole',"b");
        io.to(players[currentRoomId].black).emit('notification', 'You are black');
        io.to(players[currentRoomId].white).emit('notification', 'Black has joined. Start the game');
        
        
        console.log('black');
        
      }
      else{
        uniqueSocket.emit('Spectator');
        console.log('spectator');
        uniqueSocket.emit('boardState', chess.fen());
        uniqueSocket.emit('notification', 'Spectating');
      }   
      uniqueSocket.on('disconnect', () => {
        if (currentRoomId && players[currentRoomId]) {
          if (uniqueSocket.id === players[currentRoomId].white) {
            io.to(currentRoomId).emit('notification', 'White player has left. Game ends');
            delete players[currentRoomId];
            console.log(`White player removed from room ${currentRoomId}`);
          } else if (uniqueSocket.id === players[currentRoomId].black) {
            io.to(currentRoomId).emit('notification', 'Black player has left. Game ends');
            delete players[currentRoomId];
            currentRoomId=null;
          }
        }
      });
 
     uniqueSocket.on('move',(move)=>{
       try{
        //making sure that the valid player moves the game using turn method of Chess class.
        if(chess.turn()==='w' && uniqueSocket.id !== players[roomId].white) return;
        if(chess.turn()==='b' && uniqueSocket.id !== players[roomId].black) return;
        if(chess.turn()==='w'&&players[roomId].black==null) return;
        
        //making sure move is valid. chess.move() checks the validity of the move.
        //if there will be invalid move, result will have an error. For valid move result would have a truthy value
       const result= chess.move(move);
       if(result){ 
        currentPlayer=chess.turn();
        io.to(roomId).emit('move',move); //sending the move to frontend (emit means sending to all clients)
        io.to(roomId).emit('boardstate',chess.fen())//fen has the current state of the chessboard in chess. So we are sending current state of chess to frontend
       }
       else{
        console.log('Invalid Move:',move);
        uniqueSocket.emit('Invalid Move:',move)
    
       }
       }
       catch(err){
        console.log(err);
        uniqueSocket.emit('invalid Move:',move)
       }
     })
      })
});


let port=8080;
server.listen(port,()=>{
    console.log('app is listining');  
})