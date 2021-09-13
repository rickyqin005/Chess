const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const selectedPieceColor = 'rgba(179,224,255,0.8)';
const possibleMoveColor = 'rgba(255,255,150,0.7)';
const kingInCheckColor = 'rgba(255,26,26,0.6)';
const greySquareColor = 'rgb(150,150,150)';
var boardOrientation = 1;
var kingInCheck,totalMoves;
var selection,gameHistory;
var board = new Array(8);
ctx.lineWidth = 2;
ctx.strokeRect(39,1,514,514);
boardLabel();
newGame();
function leftClick(e) {
	var r,f;
	if(e.offsetX < 40 || e.offsetX >= 552 || e.offsetY < 2 || e.offsetY >= 514) return undefined;
	else {
		f = Math.floor((e.offsetX-40)/64)*boardOrientation+(boardOrientation-1)*-3.5;
		r = Math.floor((e.offsetY-2)/64)*boardOrientation+(boardOrientation-1)*-3.5;
	}
	if(selection.piece === undefined) {
		if(hasPiece(r,f)) board[r][f].select();
	} else if(typeof isPossibleMove(r,f) == 'object') executeMove(isPossibleMove(r,f));
	else selection.piece.deselect();
}
function executeMove(move) {
	var oldR = move[0].rank;
	var oldF = move[0].file;
	var oldType = move[0].type;
	var r = move[1],f = move[2];
	var capturedPiece;
	gameHistory.position.push(copyBoard());
	if(kingInCheck !== undefined) {
		setSquareColor(kingInCheck.rank,kingInCheck.file,0);
		kingInCheck = undefined;
	}
	var disambiguousMoves = [];
	for(var i = 0; i < 8; i++) {
		for(var j = 0; j < 8; j++) {
			if(hasPiece(i,j,move[0].color,oldType)) {
				var arr = calculatePossibleMoves(board[i][j],true);
				for(var k = 0; k < arr.length; k++) {
					if(arr[k][1] == r && arr[k][2] == f && !(i == oldR && j == oldF)) disambiguousMoves.push([i,j]);
				}
			}
		}
	}
	if(move.length == 5) {
		var c = selection.piece.color,input;
		switch(move[4]) {
			case 'k': case 'q':
				var f,r = rankToIndex(1,c);
				if(move[4] == 'k') f = 6;
				else f = 2;
				board[r][4].move(r,f);
				board[r][(f-2)*1.75].move(r,(f+4)/2);
				setSquareColor(r,4);
				setSquareColor(r,(f-2)*1.75);
				break;
			case 'r': case 'l':
				var file = selection.piece.file,s;
				if(move[4] == 'l') s = 1;
				else s = -1;
				var r = rankToIndex(5,c),f = file+s*c;
				board[r][file].move(r+c,f);
				capturedPiece = board[r][f];
				board[r][f] = undefined;
				setSquareColor(r,file);
				setSquareColor(r,f);
				break;
			case 'p':
				var validEntries = ['knight','bishop','rook','queen'];
				do {
					input = prompt('Please enter the piece you want to promote to','queen');
					if(input != null) input = input.toLowerCase();
				} while(!validEntries.includes(input) && input != null);
				if(input != null) {
					setSquareColor(selection.piece.rank,selection.piece.file);
					selection.piece.type = input;
					if(hasPiece(r,f)) capturedPiece = board[r][f];
					selection.piece.move(r,f);
				} else return undefined;
		}
	} else {
		if(hasPiece(r,f)) capturedPiece = board[r][f];
		setSquareColor(selection.piece.rank,selection.piece.file);
		selection.piece.move(r,f);
	}
	if(capturedPiece !== undefined) appendCaptured(capturedPiece);
	gameHistory.capturedPiece.push(capturedPiece);
	calculateNotation(oldType,oldR,oldF,move[1],move[2],move[3] == 'x',disambiguousMoves,move[4],input);
	move[0].numMoves++;
	move[0].lastMove = totalMoves;
	totalMoves++;
	if(document.getElementById('check1').checked) {
		var t = document.getElementById('rotate-board-delay').value*1000;
		setTimeout(() => {rotateBoard();},t);
	}
	var c = whiteOrBlack(totalMoves%2*2-1,true);
	document.getElementById('whose-turn').innerHTML = c+' to move';
	selection.piece.deselect();
	var king = getKing(totalMoves%2*2-1);
	gameHistory.check.push(isCheck(king.color));
	if(isCheck(king.color)) {
		setSquareColor(king.rank,king.file,3);
		kingInCheck = king;
	}
	if(isStalemate(king.color)) {
		if(isCheck(king.color)) gameOver(king.color,'checkmate');
		else gameOver(king.color,'stalemate');
	}
}
function Piece(t,c,r,f) {
	this.type = t,this.color = c;
	this.rank = r,this.file = f;
	this.numMoves = 0,this.lastMove = null;
	this.display = function () {
		var img = new Image();
		var h,w;
		img.src = 'image/'+this.type+this.color+'.png';
		img.addEventListener('load',e => {
			h = img.height/3,w = img.width/3;
			if(boardOrientation == 1) ctx.drawImage(img,this.file*64+40+32-w/2,this.rank*64+2+2,w,60);
			else ctx.drawImage(img,(7-this.file)*64+40+32-w/2,(7-this.rank)*64+2+2,w,60);
		});
	}
	this.select = function () {
		selection.piece = this;
		if(this.type == 'king' && isCheck(this.color)) setSquareColor(this.rank,this.file,0);
		setSquareColor(this.rank,this.file,1);
		if(totalMoves%2*2-1 == this.color) selection.moves = calculatePossibleMoves(this,true);
		else selection.moves = [];
		for(var i = 0; i < selection.moves.length; i++) {
			setSquareColor(selection.moves[i][1],selection.moves[i][2],2);
		}
	}
	this.deselect = function () {
		setSquareColor(this.rank,this.file,0);
		if(this.type == 'king' && isCheck(this.color)) setSquareColor(this.rank,this.file,3);
		for(var i = 0; i < selection.moves.length; i++) {
			if(selection.moves[i][1] == this.rank && selection.moves[i][2] == this.file) continue;
			setSquareColor(selection.moves[i][1],selection.moves[i][2],0);
		}
		selection.piece = undefined; 
		selection.moves = undefined;
	}
	this.drag = function () {
		selection.piece = this;
		if(this.type == 'king' && isCheck(this.color)) setSquareColor(this.rank,this.file,0);
		setSquareColor(this.rank,this.file,1);
		if(totalMoves%2*2-1 == this.color) selection.moves = calculatePossibleMoves(this,true);
		else selection.moves = [];
	}
	this.move = function (newR, newF) {
		board[newR][newF] = board[this.rank][this.file];
		board[this.rank][this.file] = undefined;
		this.rank = newR,this.file = newF;
	}
}
function calculatePossibleMoves(piece,bool) {
	var arr = [];
	var r = piece.rank,f = piece.file,c = piece.color;
	var diagonals = [[-1,1],[1,1],[1,-1],[-1,-1]];
	var straightlines = [[-1,0],[0,1],[1,0],[0,-1]];
	switch(piece.type) {
		case 'pawn':
			if(!hasPiece(r+1*c,f)) {
				if((r+1*c)*(2/7)-1 == c) arr.push([piece,r+1*c,f,'','p']);
				else arr.push([piece,r+1*c,f,'']);
				if(r == c*-5/2+7/2) {
					if(!hasPiece(r+2*c,f)) arr.push([piece,r+2*c,f,'']);
				}
			}
			if(hasPiece(r+1*c,f-1*c,c*-1)) {
				if((r+1*c)*(2/7)-1 == c) arr.push([piece,r+1*c,f-1*c,'x','p']);
				else arr.push([piece,r+1*c,f-1*c,'x']);
			}
			if(hasPiece(r+1*c,f+1*c,c*-1)) {
				if((r+1*c)*(2/7)-1 == c) arr.push([piece,r+1*c,f+1*c,'x','p']);
				else arr.push([piece,r+1*c,f+1*c,'x']);
			}
			if(r == c/2+3.5) {
				if(hasPiece(r,f-c,c*-1,'pawn')) {
					var x = board[r][f-c];
					if(x.numMoves == 1 && totalMoves-x.lastMove == 1) arr.push([piece,r+c,f-c,'x','r']);
				}
				if(hasPiece(r,f+c,c*-1,'pawn')) {
					var x = board[r][f+c];
					if(x.numMoves == 1 && totalMoves-x.lastMove == 1) arr.push([piece,r+c,f+c,'x','l']);
				}
			}
			break;
		case 'knight':
			for(var i = -2; i <= 2; i++) {
				for(var j = -2; j <= 2; j++) {
					if(Math.abs(i)+Math.abs(j) == 3 && !isOutOfBounds(r+i,f+j)) {
						if(hasPiece(r+i,f+j,c));
						else if(hasPiece(r+i,f+j,c*-1)) arr.push([piece,r+i,f+j,'x']);
						else arr.push([piece,r+i,f+j,'']);
					}
				}
			}
			break;
		case 'bishop':
			for(var i = 0; i < 4; i++) {
				arr = arr.concat(checkLine(piece,diagonals[i]));
			}
			break;
		case 'rook':
			for(var i = 0; i < 4; i++) {
				arr = arr.concat(checkLine(piece,straightlines[i]));
			}
			break;
		case 'queen':
			for(var i = 0; i < 4; i++) {
				arr = arr.concat(checkLine(piece,diagonals[i]));
				arr = arr.concat(checkLine(piece,straightlines[i]));
			}
			break;
		case 'king':
			for(var i = -1; i <= 1; i++) {
				for(var j = -1; j <= 1; j++) {
					if(Math.abs(i)+Math.abs(j) > 0 && !isOutOfBounds(r+i,f+j)) {
						if(hasPiece(r+i,f+j,c*-1)) arr.push([piece,r+i,f+j,'x']);
						else if(!hasPiece(r+i,f+j,c)) arr.push([piece,r+i,f+j,'']);
					}
				}
			}
			var r = c*-3.5+3.5;
			if(piece.numMoves == 0 && !hasPiece(r,5) && !hasPiece(r,6) && hasPiece(r,7,c,'rook')) {
				if(board[r][7].numMoves == 0) arr.push([piece,r,6,'','k']);
			}
			if(piece.numMoves == 0 && !hasPiece(r,3) && !hasPiece(r,2) && !hasPiece(r,1) && hasPiece(r,0,c,'rook')) {
				if(board[r][0].numMoves == 0) arr.push([piece,r,2,'','q']);
			}
	}
	if(bool) {
		var r = piece.rank,f = piece.file;
		for(var i = 0; i < arr.length; i++) {
			var newR = arr[i][1],newF = arr[i][2];
			var capturedPiece = undefined;
			if(arr[i].length == 5) {
				if(arr[i][4] == 'k' || arr[i][4] == 'q') {
					board[r][f].move(newR,(f+newF)/2);
					if(isCheck(c)) {
						removeArrayElement(arr,i);
						i--;
						board[newR][(f+newF)/2].move(r,f);
						continue;
					}
					board[newR][(f+newF)/2].move(r,f);
					if(isCheck(c)) {
						removeArrayElement(arr,i);
						i--;
						continue;
					}
				}
			}
			if(arr[i][3] == 'x') capturedPiece = board[newR][newF];
			piece.move(newR,newF);
			if(isCheck(c)) {
				removeArrayElement(arr,i);
				i--;
			}
			piece.move(r,f);
			if(capturedPiece !== undefined) board[newR][newF] = capturedPiece;
		}
	}
	return arr;
}
function isCheck(c) {
	var king = getKing(c);
	for(var i = 0; i < 8; i++) {
		for(var j = 0; j < 8; j++) {
			if(hasPiece(i,j,king.color*-1)) {
				var arr = calculatePossibleMoves(board[i][j]);
				for(var k = 0; k < arr.length; k++) {
					if(arr[k][1] == king.rank && arr[k][2] == king.file && arr[k][3] == 'x') return true;
				}
			}
		}
	}
	return false;
}
function hasPiece(r,f,c,t) {
	if(board[r][f] === undefined) return false;
	else {
		if(c === undefined) return true;
		else {
			if(board[r][f].color == c) {
				if(board[r][f].type == t || t == undefined) return true;
				else return false;
			}
			else return false;
		}
	}
}
function checkLine(piece,quadrant) {
	var nr = quadrant[0],nf = quadrant[1];
	var arr = [];
	var r = piece.rank,f = piece.file,c = piece.color;
	var pieceIsBlocked = false;
	while(!pieceIsBlocked) {
		if(!isOutOfBounds(r+nr,f+nf)) {
			if(hasPiece(r+nr,f+nf,c)) pieceIsBlocked = true;
			else if(hasPiece(r+nr,f+nf,c*-1)) {
				arr.push([piece,r+nr,f+nf,'x']);
				pieceIsBlocked = true;
			} else {
				arr.push([piece,r+nr,f+nf,'']);
				r+=nr;
				f+=nf;
			}
		} else pieceIsBlocked = true;
	}
	return arr;
}
function isStalemate(c) {
	var king = getKing(c);
	for(var i = 0; i < 8; i++) {
		for(var j = 0; j < 8; j++) {
			if(hasPiece(i,j,king.color)) {
				var arr = calculatePossibleMoves(board[i][j],true);
				if(arr.length > 0) return false;
			}
		}
	}
	return true;
}
function greyOrWhite(r,f) {
	if((8*r+f+(r%2))%2 == 1) ctx.fillStyle = greySquareColor;
	else ctx.fillStyle = '#FFFFFF';
}
function whiteOrBlack(c,isUpper) {
	var x;
	if(c == 1) x = 'black';
	else x = 'white';
	if(isUpper) return x.substring(0,1).toUpperCase()+x.substring(1);
	else return x;
}
function isOutOfBounds(r,f) {
	if (r >= 8 || r < 0 || f >= 8 || f < 0) return true;
	return false;
}
function rankToIndex(r,c) {
	if(c == 1) return r-1;
	else return 8-r;
}
function fileToIndex(f,c) {
	if(c == 1) return 8-f;
	else return f-1;
}
function isPossibleMove(r,f) {
	for(var i = 0; i < selection.moves.length; i++) {
		if(selection.moves[i][1] == r && selection.moves[i][2] == f) return selection.moves[i];
	}
	return false;
}
function removeArrayElement(arr,index) {
	for(var i = index; i < arr.length-1; i++) {
		arr[i] = arr[i+1];
	}
	arr.pop();
}
function getKing(c) {
	for(var i = 0; i < 8; i++) {
		for(var j = 0; j < 8; j++) {
			if(hasPiece(i,j,c,'king')) return board[i][j];
		}
	}
}
function setSquareColor(r,f,c) {
	if(c == 1) ctx.fillStyle = selectedPieceColor;
	else if(c == 2) ctx.fillStyle = possibleMoveColor;
	else if(c == 3) ctx.fillStyle = kingInCheckColor;
	else greyOrWhite(r,f);
	if(boardOrientation == 1) ctx.fillRect(64*f+40,64*r+2,64,64);
	else ctx.fillRect(64*(7-f)+40,64*(7-r)+2,64,64);
	if(c === undefined) return undefined;
	if(hasPiece(r,f)) board[r][f].display();
}
function displayCheck(king) {
	setSquareColor(king.rank,king.file,3);
	kingInCheck = king;
}
function refreshBoard() {
	for(var i = 0; i < 8; i++) {
		for(var j = 0; j < 8; j++) {
			setSquareColor(i,j,0);
		}
	}
}
function copyBoard() {
	var arr = new Array(8);
	for(var i = 0; i < 8; i++) {
		arr[i] = new Array(8);
		for(var j = 0; j < 8; j++) {
			if(hasPiece(i,j)) arr[i][j] = new Piece();
			var x;
			for (x in arr[i][j]) {
				arr[i][j][x] = board[i][j][x];
			}
		}
	}
	return arr;
}
function newGame() {
	selection = {piece:undefined,moves:undefined};
	kingInCheck = undefined,totalMoves = 0;
	gameHistory = {position:[],check:[],capturedPiece:[]};
	deleteChildren('notation');
	deleteChildren('captured-black');
	deleteChildren('captured-white');
	for(var i = 0; i < 8; i++) {
		board[i] = new Array(8);
	}
	for(var i = 0; i < 8; i++) {
		board[1][i] = new Piece('pawn',1,1,i);
		board[6][i] = new Piece('pawn',-1,6,i);
	}
	board[0][1] = new Piece('knight',1,0,1);
	board[0][6] = new Piece('knight',1,0,6);
	board[7][1] = new Piece('knight',-1,7,1);
	board[7][6] = new Piece('knight',-1,7,6);
	board[0][2] = new Piece('bishop',1,0,2);
	board[0][5] = new Piece('bishop',1,0,5);
	board[7][2] = new Piece('bishop',-1,7,2);
	board[7][5] = new Piece('bishop',-1,7,5);
	board[0][0] = new Piece('rook',1,0,0);
	board[0][7] = new Piece('rook',1,0,7);
	board[7][0] = new Piece('rook',-1,7,0);
	board[7][7] = new Piece('rook',-1,7,7);
	board[0][3] = new Piece('queen',1,0,3);
	board[7][3] = new Piece('queen',-1,7,3);
	board[0][4] = new Piece('king',1,0,4);
	board[7][4] = new Piece('king',-1,7,4);
	refreshBoard();
}
function deleteChildren(id) {
	var list = document.getElementById(id).children;
	while(list.length > 0) {
		list[0].remove();
	}
}
function boardLabel() {
	ctx.clearRect(10,17,23,515);
	ctx.clearRect(60,519,470,31);
	ctx.fillStyle = 'black';
	ctx.font = '28px Arial';
	for(var i = 1; i <= 8; i++) {
		if(boardOrientation == 1) {
			ctx.fillText(i,13,44+64*(8-i));
			ctx.fillText(String.fromCharCode(96+i),64*i,543);
		} else {
			ctx.fillText(9-i,13,44+64*(8-i));
			ctx.fillText(String.fromCharCode(96+9-i),64*i,543);
		}
	}
}
function rotateBoard() {
	boardOrientation *= -1;
	refreshBoard();
	if(kingInCheck !== undefined) setSquareColor(kingInCheck.rank,kingInCheck.file,3);
	boardLabel();
	selection.piece = undefined;
	selection.moves = undefined;
}
function undoMove() {
	if(totalMoves == 0) return undefined;
	board = gameHistory.position[gameHistory.position.length-1];
	if(document.getElementById('check1').checked) rotateBoard();
	else refreshBoard();
	if(gameHistory.capturedPiece[totalMoves-1] !== undefined) {
		var id = 'captured-'+whiteOrBlack(totalMoves%2*-2+1);
		document.getElementById(id).lastChild.remove();
	}
	if(gameHistory.check[totalMoves-2]) {
		var king = getKing(totalMoves%2*-2+1);
		setSquareColor(king.rank,king.file,3);
		kingInCheck = king;
	}
	var div = document.getElementById('notation');
	if(totalMoves%2 == 1) div.getElementsByTagName('li')[Math.floor(totalMoves/2)].remove();
	else div.getElementsByTagName('li')[totalMoves/2-1].getElementsByTagName('p')[1].remove();
	if(document.getElementById('div-result') !== null) document.getElementById('div-result').remove();
	var c = whiteOrBlack(totalMoves%2*-2+1,true);
	document.getElementById('whose-turn').innerHTML = c+' to move';
	totalMoves--;
	gameHistory.position.pop();
	gameHistory.capturedPiece.pop();
	gameHistory.check.pop();
}
function confirmNewGame() {
	var r = confirm('Are you sure you want to start a new game?');
	if(r) newGame();
}
function gameOver (c,reason) {
	var endNotation = document.createElement('div');
	endNotation.id = 'div-result';
	if(reason == 'checkmate') {
		endNotation.innerHTML = (c == 1)*1+'-'+(c == -1)*1;
		c = whiteOrBlack(c*-1,true);
		setTimeout(() => {alert('Checkmate\n'+c+' wins');},600);
	} else if(reason == 'stalemate') {
		c = whiteOrBlack(c,true);
		setTimeout(() => {alert('Stalemate\n'+c+' has no legal moves');},600);
		endNotation.innerHTML = '1/2-1/2';
	}
	document.getElementById('notation').appendChild(endNotation);
}
function calculateNotation(type,oldR,oldF,newR,newF,capture,disambiguousMoves,specialMove,promotion) {
	var n = '';
	if(specialMove == 'k') n += 'O-O';
	else if(specialMove == 'q') n += 'O-O-O';
	else {
		if(type == 'pawn') {
			if(capture) n += String.fromCharCode(97+oldF);
		} else n += typeToCapitalLetter(type);
		if(disambiguousMoves.length > 0 && type != 'pawn') {
			var includeRank = false,includeFile = false;
			for(var i = 0; i < disambiguousMoves.length; i++) {
				if(oldF == disambiguousMoves[i][1]) includeRank = true;
				if(oldR == disambiguousMoves[i][0]) includeFile = true;
			}
			if(includeFile || (!includeFile && !includeRank)) n += String.fromCharCode(97+oldF);
			if(includeRank) n += 8-oldR;
		}
		if(capture) n += 'x';
		n += String.fromCharCode(97+newF)+(8-newR);
		if(promotion !== undefined) n += '='+typeToCapitalLetter(promotion);
	}
	var c = board[newR][newF].color*-1;
	if(isCheck(c)) {
		if(isStalemate(c)) n += '#';
		else n += '+';
	}
	appendNotation(n);
}
function appendNotation(n) {
	var x = document.getElementById('notation');
	var elem = document.createElement('p');
	elem.innerHTML = n;
	if(totalMoves%2 == 0) {
		var li = document.createElement('li');
		li.appendChild(elem);
		x.appendChild(li);
	} else x.lastElementChild.appendChild(elem);
}
function typeToCapitalLetter(type) {
	var x;
	switch(type) {
		case 'knight': return 'N';
			break;
		case 'bishop': return 'B';
			break;
		case 'rook': return 'R';
			break;
		case 'queen': return 'Q';
			break;
		case 'king': return 'K';
	}
}
function appendCaptured(piece) {
	var img = document.createElement('img');
	var id = 'captured-';
	img.src = 'image/'+piece.type+piece.color+'.png';
	img.width /= 8,img.height /= 8;
	id += whiteOrBlack(piece.color*-1);
	var x = document.getElementById(id);
	x.appendChild(img);
}
