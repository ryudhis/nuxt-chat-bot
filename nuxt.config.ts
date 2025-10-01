// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { UserScope } from "@logto/nuxt";

export default defineNuxtConfig({
  logto: {
    scopes: [UserScope.Email],
    pathnames: {
      signIn: "/login",
      signOut: "/logout",
      callback: "/auth/callback",
    },
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "shadcn-nuxt",
    "@logto/nuxt",
    "@vueuse/nuxt",
    'nuxt-lucide-icons',
    "@nuxtjs/google-fonts",
    "nuxt-lucide-icons",
  ],
  lucide: {
    namePrefix: 'Icon'
  },
  shadcn: {
    prefix: "",
    componentDir: "./components/ui",
  },
  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
    },
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    googleApiKey: process.env.GOOGLE_API_KEY,
    databaseUrl: process.env.DATABASE_URL,
    logto: {
      endpoint: process.env.NUXT_LOGTO_ENDPOINT,
      appId: process.env.NUXT_LOGTO_APP_ID,
      appSecret: process.env.NUXT_LOGTO_APP_SECRET,
      cookieEncryptionKey: process.env.NUXT_LOGTO_COOKIE_ENCRYPTION_KEY,
    },
  },
});