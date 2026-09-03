import type { Storage } from "redux-persist";

const createNoopStorage = (): Storage => ({
  getItem: () => Promise.resolve(null),
  setItem: (_key: string, value: any) => Promise.resolve(value),
  removeItem: () => Promise.resolve(),
});

let storage: Storage;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require("@react-native-async-storage/async-storage");
  storage = AsyncStorage.default || AsyncStorage;
} catch {
  storage = createNoopStorage();
}

export const persistConfig = {
  key: "planet-cinema-customer-mobile",
  storage,
  whitelist: [], // Ephemeral booking hold state must not be persisted across cold app restarts
};
