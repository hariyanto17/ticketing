import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { TabNavigator } from "./TabNavigator";
import { MoviesScreen } from "../screens/MoviesScreen";
import { MovieDetailScreen } from "../screens/MovieDetailScreen";
import { ShowtimeScreen } from "../screens/ShowtimeScreen";
import { SeatSelectionScreen } from "../screens/SeatSelectionScreen";
import { BookingSummaryScreen } from "../screens/BookingSummaryScreen";
import { PaymentScreen } from "../screens/PaymentScreen";
import { BookingSuccessScreen } from "../screens/BookingSuccessScreen";
import { MyTicketsScreen } from "../screens/MyTicketsScreen";

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="Movies" component={MoviesScreen} />
        <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
        <Stack.Screen name="Showtime" component={ShowtimeScreen} />
        <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
        <Stack.Screen name="BookingSummary" component={BookingSummaryScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
        <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
