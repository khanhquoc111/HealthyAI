import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../../constants/appTheme";

type TabIconName = keyof typeof MaterialCommunityIcons.glyphMap;

function TabIcon({ color, name }: { color: string; name: TabIconName }) {
  return <MaterialCommunityIcons color={color} name={name} size={24} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSub,
        tabBarLabelStyle: {
          fontSize: FONTS.sm,
          fontWeight: "600",
        },
        tabBarStyle: {
          minHeight: 66,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: COLORS.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color }) => <TabIcon color={color} name="home-heart" />,
        }}
      />
      <Tabs.Screen
        name="phan-tich-benh"
        options={{
          title: "Phân tích",
          tabBarLabel: "Phân tích",
          tabBarIcon: ({ color }) => <TabIcon color={color} name="chart-box" />,
        }}
      />
      <Tabs.Screen
        name="ho-so-suc-khoe"
        options={{
          title: "Hồ sơ",
          tabBarLabel: "Hồ sơ",
          tabBarIcon: ({ color }) => <TabIcon color={color} name="clipboard-pulse" />,
        }}
      />
      <Tabs.Screen
        name="tra-thuoc"
        options={{
          title: "Tra thuốc",
          tabBarLabel: "Tra thuốc",
          tabBarIcon: ({ color }) => <TabIcon color={color} name="pill" />,
        }}
      />
    </Tabs>
  );
}
