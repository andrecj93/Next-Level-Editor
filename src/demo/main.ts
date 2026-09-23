import { createApp, defineAsyncComponent } from "vue";
import App from "./App.vue";
import "@cyhnkckali/vue3-color-picker/dist/style.css";
import "./styles/site.css";

// Suppress HMR errors in test environment
window.addEventListener("error", (event) => {
  if (
    event.message?.includes(
      "Cannot read properties of undefined (reading 'on')"
    )
  ) {
    event.preventDefault();
    console.warn("Suppressed HMR error:", event.message);
    return false;
  }
});

createApp(new URLSearchParams(location.search).get('lab') === 'documents' ? defineAsyncComponent(() => import('./DocumentLab.vue')) : App).mount("#app");
