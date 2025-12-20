#!/usr/bin/env python3
import sys
import random

def draw_board(board):
    print("\n")
    print(" " + board[0] + " | " + board[1] + " | " + board[2])
    print("---+---+---")
    print(" " + board[3] + " | " + board[4] + " | " + board[5])
    print("---+---+---")
    print(" " + board[6] + " | " + board[7] + " | " + board[8])
    print("\n")

def check_win(board, player):
    win_conditions = [
        (0, 1, 2), (3, 4, 5), (6, 7, 8), # Rows
        (0, 3, 6), (1, 4, 7), (2, 5, 8), # Cols
        (0, 4, 8), (2, 4, 6)             # Diagonals
    ]
    return any(all(board[i] == player for i in condition) for condition in win_conditions)

def check_draw(board):
    return all(cell != " " for cell in board)

def get_empty_cells(board):
    return [i for i, cell in enumerate(board) if cell == " "]

def minimax(board, depth, is_maximizing, ai_player, human_player):
    if check_win(board, ai_player):
        return 10 - depth
    if check_win(board, human_player):
        return depth - 10
    if check_draw(board):
        return 0

    if is_maximizing:
        best_score = -float('inf')
        for move in get_empty_cells(board):
            board[move] = ai_player
            score = minimax(board, depth + 1, False, ai_player, human_player)
            board[move] = " "
            best_score = max(score, best_score)
        return best_score
    else:
        best_score = float('inf')
        for move in get_empty_cells(board):
            board[move] = human_player
            score = minimax(board, depth + 1, True, ai_player, human_player)
            board[move] = " "
            best_score = min(score, best_score)
        return best_score

def ai_move(board, ai_player, human_player):
    best_score = -float('inf')
    best_move = None
    # If first move and center is available, take it (simplifies search)
    if len(get_empty_cells(board)) == 9:
        return 4
    if len(get_empty_cells(board)) == 8 and board[4] == " ":
        return 4
        
    for move in get_empty_cells(board):
        board[move] = ai_player
        score = minimax(board, 0, False, ai_player, human_player)
        board[move] = " "
        if score > best_score:
            best_score = score
            best_move = move
    return best_move

def main():
    board = [" "] * 9
    human_player = "X"
    ai_player = "O"
    current_turn = "X"

    print("Welcome to Tic-Tac-Toe!")
    print("Positions are numbered 0-8:")
    print(" 0 | 1 | 2 ")
    print("---+---+---")
    print(" 3 | 4 | 5 ")
    print("---+---+---")
    print(" 6 | 7 | 8 ")
    
    while True:
        draw_board(board)
        
        if current_turn == human_player:
            try:
                move = int(input(f"Enter your move (0-8): "))
                if move < 0 or move > 8 or board[move] != " ":
                    print("Invalid move. Try again.")
                    continue
            except ValueError:
                print("Invalid input. Enter a number.")
                continue
            board[move] = human_player
        else:
            print("AI is thinking...")
            move = ai_move(board, ai_player, human_player)
            board[move] = ai_player

        if check_win(board, current_turn):
            draw_board(board)
            print(f"{current_turn} wins!")
            break
        
        if check_draw(board):
            draw_board(board)
            print("It's a draw!")
            break

        current_turn = ai_player if current_turn == human_player else human_player

if __name__ == "__main__":
    main()
