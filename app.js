const express=require ('express');
const socket=require("socket.io");
const http=require('http');
const {Chess}=require("chess.js"); //here we are importing chexx class from chess.js
const path = require('path'); 

let warning='';
const app = express();
const server=http.createServer(app); //http server is based on express server (app variable)

//all the functionalities of socket will be shifted into io variable
const io=socket(server); //socket io requires http server which should be based on express server.

//initiating chess object
const chess=new Chess();

let players={};
let currentPlayer='';
let currentRoomId = null; //will store the roomid for deletion

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname,"public")));

app.get('/',(req,res)=>{
    res.render('index',{title:'Chess Game',warning,currentRoomId});
})

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
        uniqueSocket.emit('playerRole',"w")
        console.log('white');
        console.log(players);
      }
      else if(!players[roomId].black){
        players[roomId].black=uniqueSocket.id;
        uniqueSocket.emit('playerRole',"b");
        console.log('black');
        console.log(players);
      }
      else{
        uniqueSocket.emit('Spectator');
        console.log('spectator');
        uniqueSocket.emit('boardState', chess.fen());
        console.log(players);
      }   
      uniqueSocket.on('disconnect', () => {
        if (currentRoomId && players[currentRoomId]) {
          if (uniqueSocket.id === players[currentRoomId].white) {
            delete players[currentRoomId];
            console.log(`White player removed from room ${currentRoomId}`);
            io.to(currentRoomId).emit('notification', 'The white player has left the room.');
          } else if (uniqueSocket.id === players[currentRoomId].black) {
            delete players[currentRoomId];
            currentRoomId=null;
            console.log(`Black player removed from room ${currentRoomId}`);
            io.to(currentRoomId).emit('notification', 'The black player has left the room.');
          }
        }
      });
 
     uniqueSocket.on('move',(move)=>{
       try{
        //making sure that the valid player moves the game
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