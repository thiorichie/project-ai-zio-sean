class MacananAI {
    constructor(boardSize = 5) {
        this.boardSize = boardSize;
        this.restrictedPositions = new Set([
            '1,0', '3,0',  // Row 0
            '0,1', '2,1', '4,1',  // Row 1
            '1,2', '3,2',  // Row 2
            '0,3', '2,3', '4,3',  // Row 3
            '1,4', '3,4'  // Row 4
        ]);
    }

    isValidMove(board, oldRow, oldCol, newRow, newCol) {
        // Check if target position is empty
        if (board[newRow][newCol] !== null) return false;
        
        // Calculate absolute differences
        const rowDiff = Math.abs(newRow - oldRow);
        const colDiff = Math.abs(newCol - oldCol);
        
        // Check if source position is restricted
        if (this.restrictedPositions.has(`${oldRow},${oldCol}`)) {
            // Only allow orthogonal moves from restricted positions
            return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
        }
        
        // Allow moves in any direction within 1 square
        return rowDiff <= 1 && colDiff <= 1;
    }

    hasValidMoves(board, macanPositions) {
        for (const pos of macanPositions) {
            if (this.getValidMoves(board, pos, "macan", macanPositions).length > 0) {
                return true;
            }
        }
        return false;
    }

    evaluatePlacement(board, macanPositions, isMacanAI) {
        let score = 0;
        if (isMacanAI) {
            for (const pos of macanPositions) {
                const [row, col] = pos;
                score += (2 - Math.abs(row - 2)) + (2 - Math.abs(col - 2));
                if (this.restrictedPositions.has(`${row},${col}`)) {
                    score -= 3;
                }
            }
        } else {
            const uwongPositions = [];
            board.forEach((row, i) => {
                row.forEach((cell, j) => {
                    if (cell === "uwong") {
                        uwongPositions.push([i, j]);
                    }
                });
            });

            for (const pos of uwongPositions) {
                for (const macanPos of macanPositions) {
                    if (Math.abs(pos[0] - macanPos[0]) + Math.abs(pos[1] - macanPos[1]) === 1) {
                        score += 2;
                    }
                }
            }
        }
        return score;
    }

    getValidMoves(board, pos, pieceType, macanPositions) {
        const [row, col] = pos;
        const moves = [];
        
        // Regular moves
        const isRestricted = this.restrictedPositions.has(`${row},${col}`);
        const directions = isRestricted ? 
            [[0, 1], [1, 0], [0, -1], [-1, 0]] :  // 4 directions
            [[0, 1], [1, 1], [1, 0], [1, -1],     // 8 directions
             [0, -1], [-1, -1], [-1, 0], [-1, 1]];

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < this.boardSize && 
                newCol >= 0 && newCol < this.boardSize && 
                board[newRow][newCol] === null) {
                moves.push([newRow, newCol]);
            }
        }

        // Add capture moves for Macan
        if (pieceType === "macan") {
            moves.push(...this.getCaptureMoves(board, pos));
        }

        return moves;
    }

    getCaptureMoves(board, pos) {
        const [row, col] = pos;
        const captures = [];

        // Horizontal captures
        for (const colOffset of [-3, 3]) {
            const newCol = col + colOffset;
            if (newCol >= 0 && newCol < this.boardSize && 
                this.canCapture(board, row, col, row, newCol)) {
                captures.push([row, newCol]);
            }
        }

        // Vertical captures
        for (const rowOffset of [-3, 3]) {
            const newRow = row + rowOffset;
            if (newRow >= 0 && newRow < this.boardSize && 
                this.canCapture(board, row, col, newRow, col)) {
                captures.push([newRow, col]);
            }
        }

        // Diagonal captures
        for (const rowOffset of [-3, 3]) {
            for (const colOffset of [-3, 3]) {
                const newRow = row + rowOffset;
                const newCol = col + colOffset;
                if (newRow >= 0 && newRow < this.boardSize && 
                    newCol >= 0 && newCol < this.boardSize && 
                    this.canCapture(board, row, col, newRow, newCol)) {
                    captures.push([newRow, newCol]);
                }
            }
        }

        return captures;
    }

    canCapture(board, oldRow, oldCol, newRow, newCol) {
        if (board[newRow][newCol] !== null) return false;

        // Horizontal captures
        if (oldRow === newRow) {
            const minCol = Math.min(oldCol, newCol);
            const maxCol = Math.max(oldCol, newCol);
            if (maxCol - minCol === 3) {
                let uwongCount = 0;
                for (let col = minCol + 1; col < maxCol; col++) {
                    if (board[oldRow][col] === "uwong") uwongCount++;
                    else if (board[oldRow][col] === "macan") return false;
                }
                return uwongCount === 2;
            }
        }

        // Vertical captures
        if (oldCol === newCol) {
            const minRow = Math.min(oldRow, newRow);
            const maxRow = Math.max(oldRow, newRow);
            if (maxRow - minRow === 3) {
                let uwongCount = 0;
                for (let row = minRow + 1; row < maxRow; row++) {
                    if (board[row][oldCol] === "uwong") uwongCount++;
                    else if (board[row][oldCol] === "macan") return false;
                }
                return uwongCount === 2;
            }
        }

        // Diagonal captures
        if (Math.abs(newRow - oldRow) === Math.abs(newCol - oldCol) && 
            Math.abs(newRow - oldRow) === 3) {
            const rowStep = newRow > oldRow ? 1 : -1;
            const colStep = newCol > oldCol ? 1 : -1;
            let uwongCount = 0;
            let checkRow = oldRow + rowStep;
            let checkCol = oldCol + colStep;

            for (let i = 0; i < 2; i++) {
                if (board[checkRow][checkCol] === "uwong") uwongCount++;
                else if (board[checkRow][checkCol] === "macan") return false;
                checkRow += rowStep;
                checkCol += colStep;
            }
            return uwongCount === 2;
        }

        return false;
    }

    getBestMove(board, macanPositions, isMacanAI) {
        const [_, bestMove] = this.minimax(board, macanPositions, 3, 
            -Infinity, Infinity, true, isMacanAI);
        return bestMove;
    }

    evaluateBoard(board, macanPositions) {
        let uwongCount = 0;
        board.forEach(row => {
            row.forEach(cell => {
                if (cell === "uwong") uwongCount++;
            });
        });

        // Check win conditions
        if (uwongCount < 3) return 1000;  // Macan wins
        if (!this.hasValidMoves(board, macanPositions)) return -1000;  // Uwong wins

        // Evaluate based on piece count and positions
        let score = (8 - uwongCount) * 10;

        // Add positional values
        for (const pos of macanPositions) {
            if (this.restrictedPositions.has(`${pos[0]},${pos[1]}`)) {
                score -= 5;  // Penalty for Macan in restricted position
            }
        }

        return score;
    }

    getPlacementMoves(board) {
        const moves = [];
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (board[i][j] === null) {
                    moves.push([i, j]);
                }
            }
        }
        return moves;
    }

    minimaxPlacement(board, macanPositions, depth, alpha, beta, isMaximizing, isMacanAI, macanCount, uwongCount) {
        if (depth === 0) {
            return [this.evaluatePlacement(board, macanPositions, isMacanAI), null];
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            let bestMove = null;
            const possibleMoves = this.getPlacementMoves(board);

            for (const move of possibleMoves) {
                const [row, col] = move;
                const newBoard = board.map(row => [...row]);
                const newMacanPositions = [...macanPositions];

                if (isMacanAI) {
                    newBoard[row][col] = "macan";
                    newMacanPositions.push(move);
                } else {
                    newBoard[row][col] = "uwong";
                }

                const [score] = this.minimaxPlacement(
                    newBoard, newMacanPositions, depth - 1,
                    alpha, beta, false, isMacanAI,
                    macanCount, uwongCount
                );

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }

                alpha = Math.max(alpha, bestScore);
                if (beta <= alpha) break;
            }

            return [bestScore, bestMove];
        } else {
            let bestScore = Infinity;
            let bestMove = null;
            const possibleMoves = this.getPlacementMoves(board);

            for (const move of possibleMoves) {
                const [row, col] = move;
                const newBoard = board.map(row => [...row]);
                const newMacanPositions = [...macanPositions];

                if (!isMacanAI) {
                    newBoard[row][col] = "macan";
                    newMacanPositions.push(move);
                } else {
                    newBoard[row][col] = "uwong";
                }

                const [score] = this.minimaxPlacement(
                    newBoard, newMacanPositions, depth - 1,
                    alpha, beta, true, isMacanAI,
                    macanCount, uwongCount
                );

                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }

                beta = Math.min(beta, bestScore);
                if (beta <= alpha) break;
            }

            return [bestScore, bestMove];
        }
    }

    minimax(board, macanPositions, depth, alpha, beta, isMaximizing, isMacanAI) {
        if (depth === 0) {
            return [this.evaluateBoard(board, macanPositions), null];
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            let bestMove = null;

            if (isMacanAI) {
                for (const pos of macanPositions) {
                    const moves = this.getValidMoves(board, pos, "macan", macanPositions);
                    for (const move of moves) {
                        const newBoard = board.map(row => [...row]);
                        const newMacanPositions = [...macanPositions];

                        newBoard[pos[0]][pos[1]] = null;
                        newBoard[move[0]][move[1]] = "macan";
                        newMacanPositions.splice(newMacanPositions.findIndex(p => p[0] === pos[0] && p[1] === pos[1]), 1);
                        newMacanPositions.push(move);

                        if (Math.abs(move[0] - pos[0]) === 3 || Math.abs(move[1] - pos[1]) === 3) {
                            if (this.canCapture(board, pos[0], pos[1], move[0], move[1])) {
                                this.applyCapture(newBoard, pos[0], pos[1], move[0], move[1]);
                            }
                        }

                        const [score] = this.minimax(newBoard, newMacanPositions, depth - 1, alpha, beta, false, isMacanAI);
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = [pos, move];
                        }

                        alpha = Math.max(alpha, bestScore);
                        if (beta <= alpha) break;
                    }
                }
            } else {
                const uwongPositions = [];
                board.forEach((row, i) => {
                    row.forEach((cell, j) => {
                        if (cell === "uwong") uwongPositions.push([i, j]);
                    });
                });

                for (const pos of uwongPositions) {
                    const moves = this.getValidMoves(board, pos, "uwong", macanPositions);
                    for (const move of moves) {
                        const newBoard = board.map(row => [...row]);
                        newBoard[pos[0]][pos[1]] = null;
                        newBoard[move[0]][move[1]] = "uwong";

                        const [score] = this.minimax(newBoard, macanPositions, depth - 1, alpha, beta, false, isMacanAI);
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = [pos, move];
                        }

                        alpha = Math.max(alpha, bestScore);
                        if (beta <= alpha) break;
                    }
                }
            }

            return [bestScore, bestMove];
        } else {
            let bestScore = Infinity;
            let bestMove = null;

            if (!isMacanAI) {
                for (const pos of macanPositions) {
                    const moves = this.getValidMoves(board, pos, "macan", macanPositions);
                    for (const move of moves) {
                        const newBoard = board.map(row => [...row]);
                        const newMacanPositions = [...macanPositions];

                        newBoard[pos[0]][pos[1]] = null;
                        newBoard[move[0]][move[1]] = "macan";
                        newMacanPositions.splice(newMacanPositions.findIndex(p => p[0] === pos[0] && p[1] === pos[1]), 1);
                        newMacanPositions.push(move);

                        if (Math.abs(move[0] - pos[0]) === 3 || Math.abs(move[1] - pos[1]) === 3) {
                            if (this.canCapture(board, pos[0], pos[1], move[0], move[1])) {
                                this.applyCapture(newBoard, pos[0], pos[1], move[0], move[1]);
                            }
                        }

                        const [score] = this.minimax(newBoard, newMacanPositions, depth - 1, alpha, beta, true, isMacanAI);
                        if (score < bestScore) {
                            bestScore = score;
                            bestMove = [pos, move];
                        }

                        beta = Math.min(beta, bestScore);
                        if (beta <= alpha) break;
                    }
                }
            } else {
                const uwongPositions = [];
                board.forEach((row, i) => {
                    row.forEach((cell, j) => {
                        if (cell === "uwong") uwongPositions.push([i, j]);
                    });
                });

                for (const pos of uwongPositions) {
                    const moves = this.getValidMoves(board, pos, "uwong", macanPositions);
                    for (const move of moves) {
                        const newBoard = board.map(row => [...row]);
                        newBoard[pos[0]][pos[1]] = null;
                        newBoard[move[0]][move[1]] = "uwong";

                        const [score] = this.minimax(newBoard, macanPositions, depth - 1, alpha, beta, true, isMacanAI);
                        if (score < bestScore) {
                            bestScore = score;
                            bestMove = [pos, move];
                        }

                        beta = Math.min(beta, bestScore);
                        if (beta <= alpha) break;
                    }
                }
            }

            return [bestScore, bestMove];
        }
    }

    applyCapture(board, oldRow, oldCol, newRow, newCol) {
        if (oldRow === newRow) {  // Horizontal capture
            const minCol = Math.min(oldCol, newCol);
            const maxCol = Math.max(oldCol, newCol);
            for (let col = minCol + 1; col < maxCol; col++) {
                board[oldRow][col] = null;
            }
        } else if (oldCol === newCol) {  // Vertical capture
            const minRow = Math.min(oldRow, newRow);
            const maxRow = Math.max(oldRow, newRow);
            for (let row = minRow + 1; row < maxRow; row++) {
                board[row][oldCol] = null;
            }
        } else {  // Diagonal capture
            const rowStep = newRow > oldRow ? 1 : -1;
            const colStep = newCol > oldCol ? 1 : -1;
            let row = oldRow + rowStep;
            let col = oldCol + colStep;
            for (let i = 0; i < 2; i++) {
                board[row][col] = null;
                row += rowStep;
                col += colStep;
            }
        }
    }

    getBestPlacement(board, macanPositions, isMacanAI, macanCount, uwongCount) {
        const [_, bestMove] = this.minimaxPlacement(
            board, macanPositions, 3, -Infinity, Infinity,
            true, isMacanAI, macanCount, uwongCount
        );
        return bestMove;
    }
}

class MacananGame {
    constructor(canvas, mode) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mode = mode;
        this.boardSize = 5;
        this.cellSize = 80;
        this.ai = new MacananAI();

        // Set canvas size
        this.canvas.width = this.boardSize * this.cellSize;
        this.canvas.height = this.boardSize * this.cellSize;

        this.resetGame();
        this.canvas.addEventListener('click', this.handleClick.bind(this));
    }

    resetGame() {
        // Clear previous game state
        this.board = Array(this.boardSize).fill(null)
            .map(() => Array(this.boardSize).fill(null));
        this.turn = "macan";
        this.macanCount = 0;
        this.uwongCount = 0;
        this.macanPositions = [];
        this.selectedPiece = null;
        this.macanCanMove = false;
        this.updateStatus("Start game - Macan's turn");
        this.redrawBoard();
        
        // Clear canvas completely
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoard();
    }

    updateStatus(text) {
        document.getElementById('status-label').textContent = text;
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid and movement patterns
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                const x1 = j * this.cellSize;
                const y1 = i * this.cellSize;
                const x2 = x1 + this.cellSize;
                const y2 = y1 + this.cellSize;
                
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;

                // Draw movement lines
                this.ctx.beginPath();
                this.ctx.moveTo(cx, cy);
                this.ctx.lineTo(cx, y1);
                this.ctx.moveTo(cx, cy);
                this.ctx.lineTo(cx, y2);
                this.ctx.moveTo(cx, cy);
                this.ctx.lineTo(x1, cy);
                this.ctx.moveTo(cx, cy);
                this.ctx.lineTo(x2, cy);

                // Draw diagonal lines if not restricted
                if (!this.ai.restrictedPositions.has(`${i},${j}`)) {
                    this.ctx.moveTo(cx, cy);
                    this.ctx.lineTo(x1, y1);
                    this.ctx.moveTo(cx, cy);
                    this.ctx.lineTo(x2, y1);
                    this.ctx.moveTo(cx, cy);
                    this.ctx.lineTo(x1, y2);
                    this.ctx.moveTo(cx, cy);
                    this.ctx.lineTo(x2, y2);
                }

                this.ctx.stroke();
            }
        }
    }

    redrawBoard() {
        // Clear current board
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw base board
        this.drawBoard();
        
        // Draw all pieces
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.board[i][j]) {
                    this.drawPiece(i, j, this.board[i][j]);
                }
            }
        }
        
        // Highlight selected piece if any
        if (this.selectedPiece) {
            const [row, col] = this.selectedPiece;
            this.highlightPiece(row, col);
        }
    }

    drawPiece(row, col, pieceType) {
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize * 0.3;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = pieceType === "macan" ? "red" : "blue";
        this.ctx.fill();
        this.ctx.stroke();
    }

    highlightPiece(row, col) {
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize * 0.35;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = "yellow";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "black";
    }

    handleMovementPhase(row, col) {
        if (this.turn === "macan" && this.macanCanMove) {
            if (!this.selectedPiece && this.board[row][col] === "macan") {
                this.selectedPiece = [row, col];
            } else if (this.selectedPiece) {
                const [oldRow, oldCol] = this.selectedPiece;
                if (this.ai.isValidMove(this.board, oldRow, oldCol, row, col) ||
                    this.ai.canCapture(this.board, oldRow, oldCol, row, col)) {
                    this.handleMacanMovement(row, col);
                    return;
                } else if (this.board[row][col] === "macan") {
                    this.selectedPiece = [row, col];
                } else {
                    this.selectedPiece = null;
                }
            }
            this.redrawBoard();
        } else if (this.turn === "uwong" && this.uwongCount === 8) {
            if (!this.selectedPiece && this.board[row][col] === "uwong") {
                this.selectedPiece = [row, col];
                this.redrawBoard();
            } else if (this.selectedPiece) {
                const [oldRow, oldCol] = this.selectedPiece;
                if (this.ai.isValidMove(this.board, oldRow, oldCol, row, col)) {
                    this.movePiece(oldRow, oldCol, row, col);
                    this.turn = "macan";
                    this.updateStatus("Macan's turn");
                    if (this.mode === 2) {
                        setTimeout(() => this.makeAIMove(), 500);
                    }
                }
                this.selectedPiece = null;
                this.redrawBoard();
            }
        }
    }

    handlePlacementPhase(row, col) {
        if (this.board[row][col] !== null) return;

        if (this.turn === "macan" && this.macanCount < 2) {
            this.placePiece(row, col, "macan");
            this.macanPositions.push([row, col]);
            this.macanCount++;
            this.turn = "uwong";
            this.updateStatus("Uwong's turn to place");

            if (this.macanCount === 2) {
                this.macanCanMove = true;
            }
            
            if (this.mode === 1) {
                setTimeout(() => this.makeAIMove(), 500);
            }
        } else if (this.turn === "uwong" && this.uwongCount < 8) {
            this.placePiece(row, col, "uwong");
            this.uwongCount++;
            
            if (this.uwongCount === 8) {
                this.turn = "macan";
                this.updateStatus("Macan's turn to move");
            } else {
                this.turn = this.macanCount < 2 ? "macan" : "uwong";
                this.updateStatus(`${this.turn === "macan" ? "Macan" : "Uwong"}'s turn to place`);
            }

            if (this.mode === 2 && this.turn === "macan") {
                setTimeout(() => this.makeAIMove(), 500);
            }
        }

        this.redrawBoard();
    }

    handleMacanMovementPhase(row, col) {
        if (this.board[row][col] === "macan") {
            if (this.selectedPiece && 
                this.selectedPiece[0] === row && 
                this.selectedPiece[1] === col) {
                this.selectedPiece = null;
            } else {
                this.selectedPiece = [row, col];
            }
        } else if (this.selectedPiece) {
            const [oldRow, oldCol] = this.selectedPiece;
            if (this.ai.isValidMove(this.board, oldRow, oldCol, row, col) ||
                this.ai.canCapture(this.board, oldRow, oldCol, row, col)) {
                this.handleMacanMovement(row, col);
            }
        }
        this.redrawBoard();
    }

    handleClick(event) {
        if (!this.board) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const row = Math.floor((event.clientY - rect.top) / this.cellSize);
        const col = Math.floor((event.clientX - rect.left) / this.cellSize);
    
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) return;
    
        const isPlayerTurn = (this.mode === 1 && this.turn === "macan") || 
                            (this.mode === 2 && this.turn === "uwong") ||
                            (this.mode === 3);
                            
        if (!isPlayerTurn) return;
    
        // Only redraw once per click
        if (this.uwongCount < 8 && this.turn === "uwong") {
            this.handlePlacementPhase(row, col);
        } else if (this.macanCount < 2 && this.turn === "macan") {
            this.handlePlacementPhase(row, col);
        } else if (this.turn === "macan") {
            this.handleMacanMovementPhase(row, col);
        } else if (this.turn === "uwong" && this.uwongCount === 8) {
            this.handleMovementPhase(row, col);
        }
    
        // Single redraw at the end
        this.redrawBoard();
    
        if (this.checkGameEnd()) return;
        
        if ((this.mode === 1 && this.turn === "uwong") ||
            (this.mode === 2 && this.turn === "macan")) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    restartGame() {
        this.resetGame();
        if (this.mode === 2 || this.mode === 4) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    handlePlacementPhase(row, col) {
        if (this.board[row][col] !== null) return;
    
        if (this.turn === "macan" && this.macanCount < 2) {
            this.placePiece(row, col, "macan");
            this.macanPositions.push([row, col]);
            this.macanCount++;
            this.turn = "uwong";
            this.updateStatus("Uwong's turn to place");
            
            if (this.macanCount === 2) {
                this.macanCanMove = true;
            }
            
            if (this.mode === 1) {
                setTimeout(() => this.makeAIMove(), 500);
            }
        } else if (this.turn === "uwong" && this.uwongCount < 8) {
            this.placePiece(row, col, "uwong");
            this.uwongCount++;
            
            if (this.uwongCount === 8) {
                this.turn = "macan";
                this.updateStatus("Macan's turn to move");
            } else if (this.macanCount === 2) {
                this.turn = "macan";
                this.updateStatus("Macan's turn to move");
            } else {
                this.turn = "macan";
                this.updateStatus("Macan's turn to place");
            }
    
            if (this.mode === 2 && this.turn === "macan") {
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
    
        this.redrawBoard();
    }

    handleMacanMovement(row, col) {
        const [oldRow, oldCol] = this.selectedPiece;
        
        if (this.ai.canCapture(this.board, oldRow, oldCol, row, col)) {
            this.ai.applyCapture(this.board, oldRow, oldCol, row, col);
            this.movePiece(oldRow, oldCol, row, col);
        } else if (this.ai.isValidMove(this.board, oldRow, oldCol, row, col)) {
            this.movePiece(oldRow, oldCol, row, col);
        }
    
        this.selectedPiece = null;
        this.turn = "uwong";
        this.updateStatus("Uwong's turn");
        
        if (this.mode === 1) {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    makeAIMove() {
        if ((this.mode === 4) || (this.mode === 1 && this.turn === "uwong") || (this.mode === 2 && this.turn === "macan")) {
            if (this.turn === "macan") {
                if (this.macanCount < 2) {
                    const bestMove = this.ai.getBestPlacement(this.board, this.macanPositions, true, this.macanCount, this.uwongCount);
                    if (bestMove) {
                        this.placePiece(bestMove[0], bestMove[1], "macan");
                        this.macanPositions.push(bestMove);
                        this.macanCount++;
                        if (this.macanCount === 2) this.macanCanMove = true;
                        this.turn = "uwong";
                        this.updateStatus("Uwong's turn");
                    }
                } else {
                    const bestMove = this.ai.getBestMove(this.board, this.macanPositions, true);
                    if (bestMove) {
                        const [oldPos, newPos] = bestMove;
                        if (this.ai.canCapture(this.board, oldPos[0], oldPos[1], newPos[0], newPos[1])) {
                            this.ai.applyCapture(this.board, oldPos[0], oldPos[1], newPos[0], newPos[1]);
                        }
                        this.movePiece(oldPos[0], oldPos[1], newPos[0], newPos[1]);
                        this.turn = "uwong";
                        this.updateStatus("Uwong's turn");
                    }
                }
            } else if (this.turn === "uwong") {
                if (this.uwongCount < 8) {
                    const bestMove = this.ai.getBestPlacement(this.board, this.macanPositions, false, this.macanCount, this.uwongCount);
                    if (bestMove) {
                        this.placePiece(bestMove[0], bestMove[1], "uwong");
                        this.uwongCount++;
                        this.turn = "macan";
                        this.updateStatus("Macan's turn");
                    }
                } else {
                    const bestMove = this.ai.getBestMove(this.board, this.macanPositions, false);
                    if (bestMove) {
                        const [oldPos, newPos] = bestMove;
                        this.movePiece(oldPos[0], oldPos[1], newPos[0], newPos[1]);
                        this.turn = "macan";
                        this.updateStatus("Macan's turn");
                    }
                }
            }

            this.redrawBoard();
            if (!this.checkGameEnd() && this.mode === 4) {
                setTimeout(() => this.makeAIMove(), 500);
            }
        }
    }

    placePiece(row, col, pieceType) {
        this.board[row][col] = pieceType;
        this.drawPiece(row, col, pieceType);
    }

    movePiece(oldRow, oldCol, newRow, newCol) {
        const pieceType = this.board[oldRow][oldCol];
        this.board[oldRow][oldCol] = null;
        this.board[newRow][newCol] = pieceType;
        
        if (pieceType === "macan") {
            const index = this.macanPositions.findIndex(pos => pos[0] === oldRow && pos[1] === oldCol);
            if (index !== -1) {
                this.macanPositions.splice(index, 1);
                this.macanPositions.push([newRow, newCol]);
            }
        }
    }

    checkGameEnd() {
        if (this.macanCount === 2 && this.uwongCount === 8) {
            const uwongCount = this.countUwong();
            if (uwongCount <= 3) {
                alert("Game Over - Macan wins!");
                this.resetGame();
                return true;
            } else if (!this.ai.hasValidMoves(this.board, this.macanPositions)) {
                alert("Game Over - Uwong wins! Macan has no valid moves left!");
                this.resetGame();
                return true;
            }
        }
        return false;
    }

    countUwong() {
        let count = 0;
        for (const row of this.board) {
            for (const cell of row) {
                if (cell === "uwong") count++;
            }
        }
        return count;
    }
}

// Global game instance
let game = null;

function startGame(mode) {
    const menuFrame = document.getElementById('menu-frame');
    const gameFrame = document.getElementById('game-frame');
    
    menuFrame.style.display = 'none';
    gameFrame.style.display = 'block';
    
    const canvas = document.getElementById('game-canvas');
    game = new MacananGame(canvas, mode);

    // Make AI move first for Play as Uwong or AI vs AI
    if (mode === 2 || mode === 4) {
        setTimeout(() => game.makeAIMove(), 500);
    }
}

function returnToMenu() {
    const menuFrame = document.getElementById('menu-frame');
    const gameFrame = document.getElementById('game-frame');
    
    menuFrame.style.display = 'block';
    gameFrame.style.display = 'none';
    
    if (game) {
        game.resetGame();
        game = null;
    }
}