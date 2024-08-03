//since if we want to use socket, we need to connect it to backend as well as frontend.
const socket=io(); 
const chess = new Chess();

const boardEl=document.querySelector('.chessboard'); 
let draggedPiece=null;
let sourceSquare=null;
let playerRole=null;
const joinRoom = (roomId) => {
    socket.emit('joinRoom', roomId); // Emit joinRoom event with room ID
  };
  document.getElementById('join-room-button').addEventListener('click', () => {
      const roomId = document.getElementById('room-id-input').value; // Get room ID from input
      joinRoom(roomId); // Call joinRoom function
      document.querySelector('.form').remove(); //to remove the input form.
  });
const getPieceUnicode=(piece)=>{
 const unicodes={ 
   k:'♔',
   q:'♕',
   p:'♙',
   r:'♖',
   n:'♘',
   b:'♗',
   K:'♚',
   Q:'♛',
   P:'♟',
   R:'♜',
   N:'♞',
 };
 return unicodes[piece.type]||""
};

//for generating html of chess board on the base of current game state
const renderBoard=()=>{
    const board=chess.board();
  boardEl.innerHTML=''; //making sure that board element div shouldn't have anything in it's html 
  board.forEach((row,rowindex) => {
    row.forEach((square,squreindex)=>{
        const squareEl=document.createElement('div');
        squareEl.classList.add(
            'square',
        (rowindex+squreindex)%2==0? "light":"dark" //to create a checked pattern
        );

        squareEl.dataset.row=rowindex;
        squareEl.dataset.col=squreindex;

        if(square){
            const pieceEl=document.createElement('div');//creating all the pieces
            pieceEl.classList.add('piece',
                square.color==='w'? "white":"black" //deciding player wther white or black
            );
            pieceEl.innerText=getPieceUnicode(square);
            pieceEl.draggable= playerRole===square.color; //decides if pieceEl is dragable or not. On the basis of comparison of playerrole and color of square
            pieceEl.addEventListener('dragstart',(event)=>{
               if(pieceEl.draggable){
                draggedPiece=pieceEl;
                sourceSquare={row:rowindex,col:squreindex};
                event.dataTransfer.setData('text/plain',""); // it makes draggable run smoothly without any problems

               };
            });
            pieceEl.addEventListener('dragend',()=>{
                draggedPiece=null;
                sourceSquare=null;
            });
            squareEl.appendChild(pieceEl);
        }
        squareEl.addEventListener('dragover',(e)=>{
            e.preventDefault();
        })
        squareEl.addEventListener('drop',(e)=>{
             e.preventDefault();
             if(draggedPiece){
                const targetSource={
                    row:parseInt(squareEl.dataset.row),
                    col:parseInt(squareEl.dataset.col),
                };
                handleMOve(sourceSquare,targetSource);
             } 

        });
        boardEl.appendChild(squareEl);
    });
  });
  if(playerRole==='b'){
    boardEl.classList.add('flipped');
  }
  else{
    boardEl.classList.remove('flipped');
  }
};
socket.on('playerRole',(role)=>{
    playerRole=role;
    renderBoard();
 });
socket.on('Spectator',()=>{
    playerRole=null;
    renderBoard();
});
socket.on('boardState',(fen)=>{
    chess.load(fen);
    renderBoard();
})
socket.on('move',(move)=>{
   chess.move(move);
   renderBoard();
})
const handleMOve=(sourceSquare,targetSource)=>{
    const move={
        from:`${String.fromCharCode(97+sourceSquare.col)}${8-sourceSquare.row}`,
        to:`${String.fromCharCode(97+targetSource.col)}${8-targetSource.row}`,
        promotion:'q'
    };
    socket.emit('move',move);
};
