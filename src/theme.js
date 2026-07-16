import { createTheme } from "@mui/material/styles";

const voxelFont = 'ui-monospace, "Cascadia Mono", "Lucida Console", Consolas, "Courier New", monospace';

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#79b84a", light: "#a8d66f", dark: "#426b27", contrastText: "#10150c" },
    secondary: { main: "#65a7df", light: "#9bcaf0", dark: "#315f88" },
    success: { main: "#67b852" },
    warning: { main: "#e5a44c" },
    background: { default: "#1d2224", paper: "#555c5f" },
    text: { primary: "#f5f7f3", secondary: "#cbd0c8" },
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: voxelFont,
    h1: { fontFamily: voxelFont, fontWeight: 900, letterSpacing: ".045em" },
    h2: { fontFamily: voxelFont, fontWeight: 900, letterSpacing: ".045em" },
    h3: { fontFamily: voxelFont, fontWeight: 900, letterSpacing: ".03em" },
    h4: { fontFamily: voxelFont, fontWeight: 900, letterSpacing: ".025em" },
    h5: { fontFamily: voxelFont, fontWeight: 900 },
    h6: { fontFamily: voxelFont, fontWeight: 900 },
    button: { textTransform: "uppercase", fontWeight: 1000, letterSpacing: ".035em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { imageRendering: "pixelated" } },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "3px solid #111",
          boxShadow: "inset 2px 2px 0 rgba(255,255,255,.16), inset -2px -2px 0 rgba(0,0,0,.55), 0 6px 0 rgba(0,0,0,.38)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: "2px solid #151515",
          boxShadow: "inset 2px 2px 0 rgba(255,255,255,.2), inset -2px -2px 0 rgba(0,0,0,.5)",
        },
        containedPrimary: {
          backgroundImage: "none", backgroundColor: "#6aa43f",
          "&:hover": { backgroundImage: "none", backgroundColor: "#7db94f" },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 0 }, bar: { borderRadius: 0 } },
    },
  },
});
