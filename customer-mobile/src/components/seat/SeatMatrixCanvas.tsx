import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import {
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  HandlerStateChangeEvent,
} from "react-native-gesture-handler";
import { ShowtimeSeat } from "../../types/schedule";
import { SeatItem } from "./SeatItem";

interface SeatMatrixCanvasProps {
  rowList: { rowName: string; cols: Record<number, ShowtimeSeat> }[];
  maxColumn: number;
  seatSize: number;
  zoomLevel: number;
  selectedSeats: ShowtimeSeat[];
  onSeatPress: (seat: ShowtimeSeat) => void;
  onPinchGestureEvent: (event: PinchGestureHandlerGestureEvent) => void;
  onPinchStateChange: (event: HandlerStateChangeEvent) => void;
  colors: any;
}

export const SeatMatrixCanvas: React.FC<SeatMatrixCanvasProps> = ({
  rowList,
  maxColumn,
  seatSize,
  zoomLevel,
  selectedSeats,
  onSeatPress,
  onPinchGestureEvent,
  onPinchStateChange,
  colors,
}) => {
  const rowLabelWidth = Math.max(16, Math.min(26, Math.round(seatSize * 0.85)));
  const rowLabelFontSize = Math.max(9, Math.min(13, Math.round(seatSize * 0.45)));
  const seatGapMargin = Math.max(1, Math.min(2.5, Math.round(seatSize * 0.08)));

  return (
    <PinchGestureHandler
      onGestureEvent={onPinchGestureEvent}
      onHandlerStateChange={onPinchStateChange}
    >
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.seatMatrixScroll,
            zoomLevel === 1.0 && styles.seatMatrixScrollFit,
          ]}
        >
          <View style={styles.seatGrid}>
            {rowList.map(({ rowName, cols }) => (
              <View key={rowName} style={styles.seatRow}>
                {/* Row Label Left */}
                <View style={[styles.rowLabelBox, { width: rowLabelWidth }]}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted, fontSize: rowLabelFontSize }]}>
                    {rowName}
                  </Text>
                </View>

                {/* Seat columns spanning 1 -> maxColumn */}
                <View style={styles.columnsContainer}>
                  {Array.from({ length: maxColumn }, (_, i) => i + 1).map((colNum) => {
                    const seat = cols[colNum];
                    if (!seat) {
                      return (
                        <View
                          key={`aisle-${rowName}-${colNum}`}
                          style={{ width: seatSize, height: seatSize, margin: seatGapMargin }}
                        />
                      );
                    }

                    const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);

                    return (
                      <SeatItem
                        key={seat.seatId}
                        showtimeSeat={seat}
                        isSelected={isSelected}
                        size={seatSize}
                        onPress={() => onSeatPress(seat)}
                      />
                    );
                  })}
                </View>

                {/* Row Label Right */}
                <View style={[styles.rowLabelBox, { width: rowLabelWidth }]}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted, fontSize: rowLabelFontSize }]}>
                    {rowName}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </PinchGestureHandler>
  );
};

const styles = StyleSheet.create({
  seatMatrixScroll: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  seatMatrixScrollFit: {
    minWidth: "100%",
    justifyContent: "center",
  },
  seatGrid: {
    gap: 3,
    alignItems: "center",
  },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabelBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontWeight: "700",
  },
  columnsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
