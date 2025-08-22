import { useCallback } from 'react';
import { GameState, Card, Player } from '../types/game';
import { ActiveAbilitiesManager, EffectQueueManager } from '../utils/gameUtils';

export function useGameEffects(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void
) {

  const executeCardEffect = useCallback((
    card: Card,
    player: Player,
    state: GameState,
    log: (msg: string) => void
  ): GameState => {
    let newState = { ...state };

    if (card.kind === 'spec') {
      const specCard = card as any;

      // Karten-Nachzieh-Effekte
      if (specCard.name === 'Oprah Winfrey') {
        log(`Oprah Winfrey: Ziehe 1 Karte`);
        // Draw card logic would go here
      }
      // Additional card effects would be implemented here
    }

    return newState;
  }, []);

  const processEffectQueue = useCallback((state: GameState): GameState => {
    if (!state.effectQueue || state.effectQueue.items.length === 0) {
      return state;
    }

    const [newQueue, newState] = EffectQueueManager.processQueue(
      state.effectQueue,
      state,
      log
    );

    return {
      ...newState,
      effectQueue: newQueue
    };
  }, [log]);

  const getActiveAbilities = useCallback((player: Player) => {
    return ActiveAbilitiesManager.getAvailableAbilities(player, gameState);
  }, [gameState]);

  const useActiveAbility = useCallback((abilityId: string, targetCardUid?: number) => {
    setGameState(prev => {
      const player = prev.current;
      const abilities = ActiveAbilitiesManager.getAvailableAbilities(player, prev);
      const ability = abilities.find(a => a.id === abilityId);

      if (!ability || !ActiveAbilitiesManager.canUseAbility(ability, player, prev)) {
        return prev;
      }

      // Active ability execution logic would go here
      log(`Aktive Fähigkeit verwendet: ${ability.name}`);

      return prev;
    });
  }, [gameState, log]);

  const transferInfluence = useCallback((player: Player, fromCardUid: number, toCardUid: number, amount: number) => {
    setGameState(prev => {
      if (prev.current !== player) return prev;

      const flags = prev.effectFlags?.[player];
      if (!flags || flags.diplomatInfluenceTransferUsed || flags.influenceTransferBlocked) return prev;

      // Influence transfer logic would go here
      log(`Einfluss transferiert: ${amount} Punkte`);

      return prev;
    });
  }, [log]);

  return {
    executeCardEffect,
    processEffectQueue,
    getActiveAbilities,
    useActiveAbility,
    transferInfluence,
  };
}
