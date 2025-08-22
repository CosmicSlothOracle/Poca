# Mandate Game - React TypeScript Implementation

A React TypeScript implementation of the Mandate political card game, converted from the original HTML5 Canvas version.

## Features

- **Full Game Logic**: Complete implementation of the original game mechanics
- **Deck Builder**: Interactive deck building with preset options
- **Canvas Rendering**: High-performance canvas-based game board
- **TypeScript**: Full type safety throughout the codebase
- **Responsive Design**: Adapts to different screen sizes
- **Asset Management**: Local asset structure with fallback placeholders

## Game Overview

Mandate is a political card game where players build decks of politicians and special cards to compete for influence points. The game features:

- **93 Politician Cards**: Real-world political figures with different roles and abilities
- **16 Special Cards**: Strategic cards including traps and special effects
- **Dual Lane System**: Establishment (innen) and Government (aussen) lanes
- **Complex Mechanics**: Leadership bonuses, diplomat effects, and more

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd mandate-game
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The game will open in your browser at `http://localhost:3000`.

### Assets Setup

The game requires image assets to display properly. See `public/assets/images/README.md` for details on:

- Required image files
- Atlas layouts
- Original asset URLs
- Placeholder system

Until you add the actual assets, the game will show placeholder graphics.

## Project Structure

```
src/
├── components/          # React components
│   ├── GameCanvas.tsx   # Main game canvas
│   └── DeckBuilder.tsx  # Deck building interface
├── data/               # Game data and configuration
│   └── gameData.ts     # Card definitions and presets
├── hooks/              # Custom React hooks
│   └── useGameState.ts # Game state management
├── types/              # TypeScript type definitions
│   └── game.ts         # Game-related interfaces
├── utils/              # Utility functions
│   └── gameUtils.ts    # Game logic helpers
└── App.tsx             # Main application component
```

## Game Mechanics

### Card Types

- **Politicians**: Played to lanes, provide influence points
- **Specials**: Strategic cards with various effects
- **Traps**: Hidden cards that trigger under specific conditions

### Lanes

- **Establishment (innen)**: For non-office holders (entrepreneurs, activists, etc.)
- **Government (aussen)**: For office holders (heads of state, ministers, diplomats)

### Key Abilities

- **Leadership**: +1 influence to highest card in lane
- **Diplomat**: +1 influence to another friendly card
- **Hardliner**: -2 influence to enemy card in same lane (active ability)

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Code Style

- TypeScript for type safety
- Functional components with hooks
- Inline styles for consistency
- Canvas-based rendering for performance

### Adding New Features

1. **New Cards**: Add to `src/data/gameData.ts`
2. **New Mechanics**: Implement in `src/utils/gameUtils.ts`
3. **New UI**: Create components in `src/components/`
4. **New Types**: Define in `src/types/game.ts`

## Asset Requirements

The game expects the following image files in `public/assets/images/`:

- `specials_1024.png` - Special cards atlas (4x4 grid)
- `politicians_1024.png` - Politician cards atlas (10x10 grid)
- `specials_256.png` - Performance version of specials
- `politicians_256.png` - Performance version of politicians
- `ui_background.png` - Game background

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Original game design and mechanics
- React and TypeScript communities
- Canvas API for high-performance rendering

## Support

For issues and questions:

1. Check the existing issues
2. Create a new issue with detailed information
3. Include browser and system information

---

**Note**: This is a React TypeScript conversion of the original HTML5 Canvas game. The original game logic and mechanics have been preserved while modernizing the codebase and adding type safety.
