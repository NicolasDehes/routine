import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  COLS,
  ROWS,
  createBoard,
  dropPiece,
  findWinner,
  isBoardFull,
  type Board,
  type Player,
} from '@/lib/connect4';

const PLAYER_COLORS: Record<Player, string> = {
  1: '#e5484d', // rouge
  2: '#f5d90a', // jaune
};
const PLAYER_NAMES: Record<Player, string> = { 1: 'Rouge', 2: 'Jaune' };
const BOARD_COLOR = '#2563eb';

export default function Connect4Screen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [board, setBoard] = useState<Board>(createBoard);
  const [current, setCurrent] = useState<Player>(1);
  const [scores, setScores] = useState<Record<Player, number>>({ 1: 0, 2: 0 });

  const winner = useMemo(() => findWinner(board), [board]);
  const draw = !winner && isBoardFull(board);
  const gameOver = !!winner || draw;

  const boardWidth = Math.min(width - Spacing.four * 2, MaxContentWidth, 480);
  const cellSize = boardWidth / COLS;
  const discSize = cellSize * 0.8;

  const winningKeys = useMemo(
    () => new Set(winner?.cells.map(([r, c]) => `${r}-${c}`)),
    [winner],
  );

  const play = useCallback(
    (col: number) => {
      if (gameOver) return;
      const result = dropPiece(board, col, current);
      if (!result) return;
      setBoard(result.board);
      const won = findWinner(result.board);
      if (won) {
        setScores((s) => ({ ...s, [won.player]: s[won.player] + 1 }));
      } else {
        setCurrent(current === 1 ? 2 : 1);
      }
    },
    [board, current, gameOver],
  );

  const reset = useCallback(() => {
    setBoard(createBoard());
    // Le perdant commence la manche suivante ; en cas de nulle, on alterne.
    setCurrent((p) => (winner ? (winner.player === 1 ? 2 : 1) : p === 1 ? 2 : 1));
  }, [winner]);

  const status = winner
    ? `${PLAYER_NAMES[winner.player]} gagne !`
    : draw
      ? 'Match nul'
      : `Au tour de ${PLAYER_NAMES[current]}`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Puissance 4</ThemedText>

        <View style={styles.scoreRow}>
          {([1, 2] as Player[]).map((p) => (
            <View
              key={p}
              style={[
                styles.scoreBox,
                { backgroundColor: theme.backgroundElement },
                !gameOver && current === p && { borderColor: PLAYER_COLORS[p] },
              ]}>
              <View style={[styles.scoreDot, { backgroundColor: PLAYER_COLORS[p] }]} />
              <ThemedText type="smallBold">
                {PLAYER_NAMES[p]} : {scores[p]}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.statusRow}>
          {!gameOver && (
            <View style={[styles.scoreDot, { backgroundColor: PLAYER_COLORS[current] }]} />
          )}
          <ThemedText type="default" accessibilityLiveRegion="polite">
            {status}
          </ThemedText>
        </View>

        <View style={[styles.board, { width: boardWidth, backgroundColor: BOARD_COLOR }]}>
          {Array.from({ length: COLS }, (_, col) => (
            <Pressable
              key={col}
              onPress={() => play(col)}
              disabled={gameOver || board[0][col] !== 0}
              accessibilityRole="button"
              accessibilityLabel={`Colonne ${col + 1}`}
              style={({ pressed }) => [
                styles.column,
                { width: cellSize },
                pressed && styles.columnPressed,
              ]}>
              {Array.from({ length: ROWS }, (_, row) => {
                const value = board[row][col];
                const isWinning = winningKeys.has(`${row}-${col}`);
                return (
                  <View key={row} style={{ width: cellSize, height: cellSize }}>
                    <View
                      style={[
                        styles.disc,
                        {
                          width: discSize,
                          height: discSize,
                          borderRadius: discSize / 2,
                          margin: (cellSize - discSize) / 2,
                          backgroundColor: value ? PLAYER_COLORS[value] : theme.background,
                        },
                        isWinning && styles.winningDisc,
                      ]}
                    />
                  </View>
                );
              })}
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={reset}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.backgroundElement },
            pressed && { backgroundColor: theme.backgroundSelected },
          ]}>
          <ThemedText type="smallBold">{gameOver ? 'Rejouer' : 'Recommencer'}</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scoreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 24,
  },
  board: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  column: {
    flexDirection: 'column',
  },
  columnPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  disc: {
    borderWidth: 0,
  },
  winningDisc: {
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Spacing.four,
  },
});
