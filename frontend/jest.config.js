module.exports = {
  preset: "jest-expo",
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-navigation|expo|expo-modules-core|expo-image-picker)/)"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/App.tsx',
    '!src/index.ts',
    '!src/services/auth.ts',
    '!src/components/Nav/**',
    '!src/pages/Itinerary/**',
    '!src/pages/Home/Home.tsx',
    '!src/pages/Home/ItineraryDetail.tsx',
    '!src/context/**',
    '!src/lib/**',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/expo-env.d.ts',
    '!**/.expo/**'
  ],
};