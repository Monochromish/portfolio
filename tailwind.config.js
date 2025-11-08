/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./components/**/*.{vue,js,ts}",
        "./layouts/**/*.{vue,js,ts}",
        "./pages/**/*.{vue,js,ts}",
        "./app/**/*.{vue,js,ts}",
        "./plugins/**/*.{js,ts}",
        "./error.vue",
        "./*.vue",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"IBM Plex Sans"']
            }
        },
    },
    plugins: [],
    darkMode: 'class', // i haven't implemented light mode yet
}
