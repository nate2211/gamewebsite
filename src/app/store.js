import { configureStore } from "@reduxjs/toolkit";
import worldReducer from "../features/world/worldSlice";

export const store = configureStore({
  reducer: {
    world: worldReducer,
  },
});
