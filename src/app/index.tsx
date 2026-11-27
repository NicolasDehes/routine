import { useCallback, useEffect, useMemo, useState } from 'react';
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
  getBotMove,
  isBoardFull,
  type Board,
  type Difficulty,
  type Player,
} from '@/lib/connect4';

const PLAYER_COLORS: Record<Player, string> = {
  1: '#e5484d', // rouge
  2: '#f5d90a', // jaune
};
const BOT: Player = 2;
const BOT_DELAY_MS = 500;

type Mode = 'two' | 'bot';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

function getPlayerNames(mode: Mode): Record<Player, string> {
  return mode === 'bot' ? { 1: 'Vous', 2: 'Bot' } : { 1: 'Rouge', 2: 'Jaune' };
}
const BOARD_COLOR = '#2563eb';

export default function Connect4Screen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const [board, setBoard] = useState<Board>(createBoard);
  const [current, setCurrent] = useState<Player>(1);
  const [scores, setScores] = useState<Record<Player, number>>({ 1: 0, 2: 0 });
  const [mode, setMode] = useState<Mode>('two');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const names = getPlayerNames(mode);

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

  const botTurn = mode === 'bot' && current === BOT && !gameOver;

  // Le bot joue après un court délai, pour que le coup reste lisible.
  useEffect(() => {
    if (!botTurn) return;
    const timer = setTimeout(() => {
      const col = getBotMove(board, BOT, difficulty);
      if (col >= 0) play(col);
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [botTurn, board, difficulty, play]);

  const handleColumnPress = useCallback(
    (col: number) => {
      if (!botTurn) play(col);
    },
    [botTurn, play],
  );

  const startNewMatch = useCallback((nextMode: Mode, nextDifficulty: Difficulty) => {
    setMode(nextMode);
    setDifficulty(nextDifficulty);
    setBoard(createBoard());
    setScores({ 1: 0, 2: 0 });
    setCurrent(1);
  }, []);

  const reset = useCallback(() => {
    setBoard(createBoard());
    // Le perdant commence la manche suivante ; en cas de nulle, on alterne.
    setCurrent((p) => (winner ? (winner.player === 1 ? 2 : 1) : p === 1 ? 2 : 1));
  }, [winner]);

  const status = winner
    ? mode === 'bot'
      ? winner.player === 1
        ? 'Vous avez gagné !'
        : 'Le bot a gagné !'
      : `${names[winner.player]} gagne !`
    : draw
      ? 'Match nul'
      : botTurn
        ? 'Le bot réfléchit…'
        : mode === 'bot'
          ? 'À vous de jouer'
          : `Au tour de ${names[current]}`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Puissance 4</ThemedText>

        <View style={styles.chipRow}>
          <Chip
            label="2 joueurs"
            selected={mode === 'two'}
            onPress={() => startNewMatch('two', difficulty)}
          />
          <Chip
            label="1 joueur"
            selected={mode === 'bot'}
            onPress={() => startNewMatch('bot', difficulty)}
          />
        </View>

        {mode === 'bot' && (
          <View style={styles.chipRow}>
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
              <Chip
                key={d}
                label={DIFFICULTY_LABELS[d]}
                selected={difficulty === d}
                small
                onPress={() => startNewMatch('bot', d)}
              />
            ))}
          </View>
        )}

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
                {names[p]} : {scores[p]}
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
              onPress={() => handleColumnPress(col)}
              disabled={gameOver || botTurn || board[0][col] !== 0}
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

function Chip({
  label,
  selected,
  small,
  onPress,
}: {
  label: string;
  selected: boolean;
  small?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        small && styles.chipSmall,
        { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
        selected && { borderColor: theme.text },
      ]}>
      <ThemedText type={small ? 'small' : 'smallBold'}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSmall: {
    paddingVertical: Spacing.one,
  },
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
