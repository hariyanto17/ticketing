import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Film, Clapperboard, Ticket } from "lucide-react-native";
import { MainTabParamList } from "../types/navigation";
import { HomeScreen } from "../screens/HomeScreen";
import { MoviesScreen } from "../screens/MoviesScreen";
import { MyTicketsScreen } from "../screens/MyTicketsScreen";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: t("common.appName"),
          tabBarIcon: ({ color, size }) => <Film size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MoviesTab"
        component={MoviesScreen}
        options={{
          tabBarLabel: t("home.nowShowing"),
          tabBarIcon: ({ color, size }) => <Clapperboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyTicketsTab"
        component={MyTicketsScreen}
        options={{
          tabBarLabel: t("myTickets.title"),
          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
