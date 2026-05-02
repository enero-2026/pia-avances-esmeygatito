import {
    MatchRecord,
    MatchRecordSummary,
    MatchStats,
    TCGService,
} from "@/services/tcgdexService";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Divider,
    Modal,
    Portal,
    Searchbar,
    SegmentedButtons,
    Snackbar,
    Surface,
    Text,
} from "react-native-paper";

const PAGE_SIZE = 10;
type WinnerFilter = "all" | "with_winner" | "without_winner";
type DateFilter = "all" | "today" | "last7";
type SortBy = "date_desc" | "date_asc" | "duration_desc" | "turns_desc";

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function formatDuration(totalSeconds: number | null): string {
  if (typeof totalSeconds !== "number" || totalSeconds < 0) {
    return "-";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export default function HistoryScreen() {
  const [matches, setMatches] = useState<MatchRecordSummary[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [winnerFilter, setWinnerFilter] = useState<WinnerFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [playerQuery, setPlayerQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date_desc");

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const hasMore = matches.length < totalMatches;

  const filteredMatches = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const last7 = new Date(now);
    last7.setDate(now.getDate() - 7);

    const filtered = matches.filter((match) => {
      if (winnerFilter === "with_winner" && !match.winner) {
        return false;
      }

      if (winnerFilter === "without_winner" && match.winner) {
        return false;
      }

      if (playerQuery.trim()) {
        const query = playerQuery.trim().toLowerCase();
        const byPlayers = match.players.some((player) =>
          player.toLowerCase().includes(query),
        );
        const byWinner = (match.winner ?? "").toLowerCase().includes(query);

        if (!byPlayers && !byWinner) {
          return false;
        }
      }

      if (dateFilter !== "all") {
        const created = new Date(match.createdAt);
        if (Number.isNaN(created.getTime())) {
          return false;
        }

        if (dateFilter === "today" && created < startOfToday) {
          return false;
        }

        if (dateFilter === "last7" && created < last7) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "date_asc") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      if (sortBy === "duration_desc") {
        return (b.durationSeconds ?? -1) - (a.durationSeconds ?? -1);
      }

      if (sortBy === "turns_desc") {
        return (b.turnCount ?? -1) - (a.turnCount ?? -1);
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [matches, winnerFilter, playerQuery, dateFilter, sortBy]);

  const topPlayersLabel = useMemo(() => {
    if (!stats || stats.winsByPlayer.length === 0) {
      return "Sin datos";
    }

    return stats.winsByPlayer
      .slice(0, 3)
      .map((row) => `${row.player} (${row.wins})`)
      .join(" · ");
  }, [stats]);

  const topCardsLabel = useMemo(() => {
    if (!stats || stats.topCardsUsed.length === 0) {
      return "Sin datos";
    }

    return stats.topCardsUsed
      .slice(0, 3)
      .map((row) => `${row.name} (${row.uses})`)
      .join(" · ");
  }, [stats]);

  function showSnackbar(message: string) {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }

  function toCsv(rows: MatchRecordSummary[]): string {
    const header = [
      "id",
      "createdAt",
      "winner",
      "resultReason",
      "durationSeconds",
      "turnCount",
      "actionCount",
      "players",
    ];
    const lines = rows.map((row) => {
      const values = [
        row.id,
        row.createdAt,
        row.winner ?? "",
        row.resultReason ?? "",
        row.durationSeconds ?? "",
        row.turnCount ?? "",
        row.actionCount,
        row.players.join("|") || "",
      ];

      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    return [header.join(","), ...lines].join("\n");
  }

  async function exportFilteredJson() {
    if (filteredMatches.length === 0) {
      showSnackbar("No hay partidas filtradas para exportar");
      return;
    }

    try {
      await Share.share({
        message: JSON.stringify(filteredMatches, null, 2),
        title: "historial_partidas.json",
      });
    } catch {
      showSnackbar("No se pudo exportar JSON");
    }
  }

  async function exportFilteredCsv() {
    if (filteredMatches.length === 0) {
      showSnackbar("No hay partidas filtradas para exportar");
      return;
    }

    try {
      await Share.share({
        message: toCsv(filteredMatches),
        title: "historial_partidas.csv",
      });
    } catch {
      showSnackbar("No se pudo exportar CSV");
    }
  }

  async function loadInitialData() {
    setIsLoadingInitial(true);
    try {
      const [history, fetchedStats] = await Promise.all([
        TCGService.getMatches(PAGE_SIZE, 0),
        TCGService.getMatchStats(),
      ]);

      setMatches(history.data);
      setTotalMatches(history.total);
      setStats(fetchedStats);
    } finally {
      setIsLoadingInitial(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function refreshData() {
    setIsRefreshing(true);
    try {
      await loadInitialData();
      showSnackbar("Historial actualizado");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadMore() {
    if (!hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await TCGService.getMatches(PAGE_SIZE, matches.length);
      setMatches((prev) => [...prev, ...response.data]);
      setTotalMatches(response.total);
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function openMatchDetail(matchId: string) {
    setIsDetailVisible(true);
    setIsLoadingDetail(true);
    try {
      const detail = await TCGService.getMatchById(matchId);
      if (!detail) {
        setSelectedMatch(null);
        showSnackbar("No se encontró el detalle de la partida");
        return;
      }

      setSelectedMatch(detail);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
      >
        <Text variant="headlineSmall" style={styles.title}>
          Historial y estadísticas
        </Text>

        <Surface mode="flat" style={styles.statsCard}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Dashboard
          </Text>

          {!stats ? (
            <Text variant="bodySmall">Sin datos de estadísticas.</Text>
          ) : (
            <>
              <View style={styles.statsRow}>
                <Chip compact>Total: {stats.totalMatches}</Chip>
                <Chip compact>Con ganador: {stats.withWinner}</Chip>
                <Chip compact>Sin ganador: {stats.withoutWinner}</Chip>
              </View>
              <View style={styles.statsRow}>
                <Chip compact>
                  Duración promedio:{" "}
                  {formatDuration(Math.floor(stats.avgDurationSeconds))}
                </Chip>
                <Chip compact>
                  Turnos promedio: {stats.avgTurnCount.toFixed(1)}
                </Chip>
              </View>
              <Text variant="bodySmall">Top jugadores: {topPlayersLabel}</Text>
              <Text variant="bodySmall">Top cartas: {topCardsLabel}</Text>
            </>
          )}

          <Button
            mode="outlined"
            onPress={() => void refreshData()}
            loading={isRefreshing}
          >
            Actualizar
          </Button>
        </Surface>

        <Surface mode="flat" style={styles.listCard}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Partidas ({filteredMatches.length}/{totalMatches})
          </Text>

          <Searchbar
            placeholder="Buscar por jugador o ganador"
            value={playerQuery}
            onChangeText={setPlayerQuery}
          />

          <Text variant="labelSmall">Filtro por ganador</Text>
          <SegmentedButtons
            value={winnerFilter}
            onValueChange={(value) => setWinnerFilter(value as WinnerFilter)}
            buttons={[
              { value: "all", label: "Todas" },
              { value: "with_winner", label: "Con ganador" },
              { value: "without_winner", label: "Sin ganador" },
            ]}
          />

          <Text variant="labelSmall">Filtro por fecha</Text>
          <SegmentedButtons
            value={dateFilter}
            onValueChange={(value) => setDateFilter(value as DateFilter)}
            buttons={[
              { value: "all", label: "Todo" },
              { value: "today", label: "Hoy" },
              { value: "last7", label: "7 días" },
            ]}
          />

          <Text variant="labelSmall">Orden</Text>
          <SegmentedButtons
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortBy)}
            buttons={[
              { value: "date_desc", label: "Fecha ↓" },
              { value: "date_asc", label: "Fecha ↑" },
              { value: "duration_desc", label: "Duración" },
              { value: "turns_desc", label: "Turnos" },
            ]}
          />

          <View style={styles.exportRow}>
            <Button mode="outlined" onPress={() => void exportFilteredJson()}>
              Exportar JSON
            </Button>
            <Button mode="outlined" onPress={() => void exportFilteredCsv()}>
              Exportar CSV
            </Button>
          </View>

          {isLoadingInitial ? (
            <ActivityIndicator />
          ) : filteredMatches.length === 0 ? (
            <Text variant="bodySmall">Aún no hay partidas guardadas.</Text>
          ) : (
            filteredMatches.map((match) => (
              <Card
                key={match.id}
                mode="outlined"
                style={styles.matchCard}
                onPress={() => void openMatchDetail(match.id)}
              >
                <Card.Content style={styles.matchCardContent}>
                  <Text variant="labelLarge">
                    Partida {match.id.slice(0, 8)}
                  </Text>
                  <Text variant="bodySmall">
                    Fecha: {formatDate(match.createdAt)}
                  </Text>
                  <Text variant="bodySmall">
                    Ganador: {match.winner ?? "Sin definir"}
                  </Text>
                  <Text variant="bodySmall">
                    Duración: {formatDuration(match.durationSeconds)}
                  </Text>
                  <Text variant="bodySmall">
                    Turnos: {match.turnCount ?? "-"}
                  </Text>
                  <Text variant="bodySmall">Acciones: {match.actionCount}</Text>
                </Card.Content>
              </Card>
            ))
          )}

          {hasMore ? (
            <Button
              mode="contained-tonal"
              onPress={() => void loadMore()}
              loading={isLoadingMore}
            >
              Cargar más
            </Button>
          ) : null}
        </Surface>
      </ScrollView>

      <Portal>
        <Modal
          visible={isDetailVisible}
          onDismiss={() => {
            setIsDetailVisible(false);
            setSelectedMatch(null);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          {isLoadingDetail ? (
            <ActivityIndicator />
          ) : !selectedMatch ? (
            <Text variant="bodySmall">No hay detalle para mostrar.</Text>
          ) : (
            <ScrollView
              style={styles.detailScroll}
              contentContainerStyle={styles.detailContent}
            >
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Detalle de partida
              </Text>
              <Text variant="bodySmall">Id: {selectedMatch.id}</Text>
              <Text variant="bodySmall">
                Creada: {formatDate(selectedMatch.createdAt)}
              </Text>
              <Text variant="bodySmall">
                Finalizada: {formatDate(selectedMatch.endedAt)}
              </Text>
              <Text variant="bodySmall">
                Ganador: {selectedMatch.winner ?? "Sin definir"}
              </Text>
              <Text variant="bodySmall">
                Razón: {selectedMatch.resultReason ?? "-"}
              </Text>
              <Text variant="bodySmall">
                Turnos: {selectedMatch.turnCount ?? "-"}
              </Text>
              <Text variant="bodySmall">
                Duración: {formatDuration(selectedMatch.durationSeconds)}
              </Text>

              <Divider style={styles.divider} />

              <Text variant="labelLarge">
                Action log ({selectedMatch.actionLog.length})
              </Text>
              {selectedMatch.actionLog.length === 0 ? (
                <Text variant="bodySmall">Sin acciones.</Text>
              ) : (
                selectedMatch.actionLog
                  .slice(-20)
                  .reverse()
                  .map((action) => (
                    <View key={action.id} style={styles.logItem}>
                      <Text variant="labelMedium">
                        {action.type} · {action.actor}
                      </Text>
                      <Text variant="bodySmall">
                        {formatDate(action.timestamp)}
                      </Text>
                    </View>
                  ))
              )}

              <Divider style={styles.divider} />

              <Text variant="labelLarge">Snapshot final</Text>
              <Text variant="bodySmall" selectable>
                {JSON.stringify(selectedMatch.boardSnapshot ?? {}, null, 2)}
              </Text>

              <Button
                mode="contained"
                onPress={() => {
                  setIsDetailVisible(false);
                  setSelectedMatch(null);
                }}
              >
                Cerrar
              </Button>
            </ScrollView>
          )}
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f2e7",
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 110,
    gap: 10,
  },
  title: {
    color: "#2b1f08",
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#2b1f08",
    fontWeight: "700",
    marginBottom: 6,
  },
  statsCard: {
    borderWidth: 1,
    borderColor: "#ecdca9",
    borderRadius: 12,
    backgroundColor: "#fffdf7",
    padding: 12,
    gap: 8,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listCard: {
    borderWidth: 1,
    borderColor: "#ecdca9",
    borderRadius: 12,
    backgroundColor: "#fffdf7",
    padding: 12,
    gap: 8,
  },
  exportRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  matchCard: {
    borderColor: "#ecdca9",
    backgroundColor: "#fffcf2",
  },
  matchCardContent: {
    gap: 2,
  },
  modalContainer: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ecdca9",
    backgroundColor: "#fffdf7",
    maxHeight: "86%",
    padding: 12,
  },
  detailScroll: {
    width: "100%",
  },
  detailContent: {
    gap: 8,
    paddingBottom: 8,
  },
  divider: {
    marginVertical: 6,
  },
  logItem: {
    borderWidth: 1,
    borderColor: "#ecdca9",
    backgroundColor: "#fffcf2",
    borderRadius: 8,
    padding: 8,
    gap: 2,
  },
});
