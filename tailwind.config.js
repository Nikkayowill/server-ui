/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./controllers/**/*.js",
    "./helpers.js",
    "./index.js",
    "./routes/**/*.js",
    "./services/**/*.js",
    "./middleware/**/*.js",
    "./public/**/*.html",
    "./public/**/*.js",
    "./*.html"
  ],
  safelist: [
    // Ensure all gradient and animation classes are included
    {
      pattern: /(bg|text|border)-(gray|blue|cyan|red|green|yellow|brand)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /animate-.*/,
    },
    {
      pattern: /backdrop-.*/,
    },
    {
      pattern: /-?translate-(x|y)-.*/,
    },
    {
      pattern: /from-(blue|gray|cyan)-.*/,
    },
    {
      pattern: /to-(blue|gray|cyan)-.*/,
    },
    {
      pattern: /shadow-.*/,
    },
    {
      pattern: /bg-gradient-to-(r|l|t|b|tr|tl|br|bl)/,
    },
    // Explicit badge classes
    '-translate-x-1/2',
    '-top-4',
    'left-1/2',
    'bg-gradient-to-r',
    'from-blue-300',
    'to-blue-400',
    'hero-heading',
    'text-brand',
    'bg-brand',
    'border-brand',
    'glow-brand'
  ]
}
